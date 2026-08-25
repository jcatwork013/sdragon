// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Chiptune — bộ tổng hợp 8-bit kiểu NES, chạy hoàn toàn bằng Web Audio.    ║
// ║  4 kênh:  PULSE1 (giai điệu) · PULSE2 (arpeggio) · TRIANGLE (bass)        ║
// ║           · NOISE (trống).  Không dùng file âm thanh nào.                  ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const SEMITONE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ALIAS = { DB: 'C#', EB: 'D#', GB: 'F#', AB: 'G#', BB: 'A#' };

/** "A#4" | "Bb4" | "A4" → tần số Hz (A4 = 440). */
export function noteFreq(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) return 0;
  let base = m[1].toUpperCase() + (m[2] === 'b' ? 'b' : m[2]);
  if (base.length === 2 && base[1] === 'b') base = ALIAS[base.toUpperCase()] || base[0];
  const idx = SEMITONE.indexOf(base);
  if (idx < 0) return 0;
  const midi = idx + (parseInt(m[3], 10) + 1) * 12;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Phân tích chuỗi nốt: `"E5/2 A5/2 -/4 C5/4"`.
 * `-` = lặng. Đơn vị `dur` là nốt móc kép (1/16).
 * → [{ step, freq, dur }]
 */
function parseTrack(str) {
  const out = [];
  let step = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (!tok) continue;
    const [n, d] = tok.split('/');
    const dur = d ? parseInt(d, 10) : 1;
    if (n !== '-') out.push({ step, freq: noteFreq(n), dur });
    step += dur;
  }
  return { events: out, steps: step };
}

/** Trống: 1 ký tự = 1 nốt móc kép. `k` kick · `s` snare · `h` hat · `H` hat mạnh · `-` lặng */
function parseDrums(str) {
  const s = str.replace(/[|\s]/g, '');
  const out = [];
  for (let i = 0; i < s.length; i++) if (s[i] !== '-' && s[i] !== '.') out.push({ step: i, hit: s[i] });
  return { events: out, steps: s.length };
}

/** Sóng vuông theo Fourier — duty 0.125 / 0.25 / 0.5 cho ra 3 chất tiếng NES. */
function pulseWave(ctx, duty, harmonics = 28) {
  const real = new Float32Array(harmonics), imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
}

function noiseBuffer(ctx, seconds = 1.2) {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  // LFSR giả lập kênh noise của NES → nghe "sạn" đúng chất 8-bit
  let reg = 0x7fff;
  for (let i = 0; i < len; i++) {
    const bit = ((reg ^ (reg >> 1)) & 1);
    reg = (reg >> 1) | (bit << 14);
    d[i] = (reg & 1) ? 0.85 : -0.85;
  }
  return buf;
}

export class Chiptune {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.musicVol = 0.34;
    this.sfxVol = 0.5;
    this.muted = false;
    this.song = null;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    // Cửa sổ lên lịch. Vòng vẽ của game ăn hết main thread nên setInterval hay
    // trễ vài chục ms; cửa sổ 0.12s quá hẹp, trễ một nhịp là nốt rơi vào QUÁ KHỨ
    // và Web Audio phát dồn hết một lúc — đúng tiếng "rẹt rẹt" người chơi nghe.
    this.lookahead = 0.32;      // giây scheduler nhìn trước
    this.tickMs = 25;
    this.songBus = null;        // bus riêng của bài đang phát, để tắt là dứt hẳn
    this._pending = null;
    this._recovering = null;
    this._needsRecovery = false;
  }

  /** Phải gọi trong một user-gesture (click/tap) — chính sách autoplay của trình duyệt. */
  init() {
    if (this.ctx) {
      // iOS có thêm trạng thái `interrupted` khi khoá máy, nhận cuộc gọi hoặc
      // kéo Control Center. Mỗi gesture mới đều phải thử đánh thức lại, không
      // chỉ lần khởi tạo đầu tiên.
      if (this.ctx.state === 'closed') return this._recreate();
      if (this.ctx.state !== 'running' || this._needsRecovery) this.recover();
      return this.ready;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC({ latencyHint: 'interactive' });

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;

    // Nén nhẹ để combo dồn dập không bị vỡ tiếng
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 22;
    this.comp.ratio.value = 5; this.comp.attack.value = 0.004; this.comp.release.value = 0.16;

    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.muted ? 0 : this.musicVol;
    this.sfxBus   = this.ctx.createGain(); this.sfxBus.gain.value   = this.muted ? 0 : this.sfxVol;

    // Delay kiểu "echo hang động" — làm nhạc chip đỡ khô
    this.delay = this.ctx.createDelay(1.0); this.delay.delayTime.value = 0.24;
    this.fb = this.ctx.createGain(); this.fb.gain.value = 0.26;
    this.wet = this.ctx.createGain(); this.wet.gain.value = 0.20;
    this.delay.connect(this.fb); this.fb.connect(this.delay);
    this.delay.connect(this.wet); this.wet.connect(this.comp);

    this.musicBus.connect(this.comp); this.musicBus.connect(this.delay);
    this.sfxBus.connect(this.comp);
    this.comp.connect(this.master); this.master.connect(this.ctx.destination);

    this.waves = {
      p12: pulseWave(this.ctx, 0.125),
      p25: pulseWave(this.ctx, 0.25),
      p50: pulseWave(this.ctx, 0.5),
    };
    this.noise = noiseBuffer(this.ctx);
    this._installRecoveryHooks();

    this.ready = true;
    if (this._pending) { const s = this._pending; this._pending = null; this.play(s); }
    return true;
  }

  /** Kéo mốc lên lịch về hiện tại sau khi ngủ dậy — không bù nốt đã lỡ. */
  resync() { if (this.ctx) this.nextTime = this.ctx.currentTime + 0.06; }

  /**
   * iOS có thể trả AudioContext về `running` sau cuộc gọi nhưng đường âm thanh
   * vẫn chưa nối lại. Một chu kỳ suspend → resume ngắn buộc WKWebView gắn lại
   * AVAudioSession; sau đó dựng lại timer để không còn interval "sống giả".
   */
  recover({ cycle = false } = {}) {
    if (!this.ctx) return Promise.resolve(!!this.init());
    if (this.ctx.state === 'closed') return Promise.resolve(!!this._recreate());
    if (this._recovering) return this._recovering;
    const ctx = this.ctx;
    const mustCycle = cycle || this._needsRecovery;
    this._recovering = (async () => {
      try {
        if (mustCycle && ctx.state === 'running') await ctx.suspend?.();
        if (ctx.state !== 'running') await ctx.resume?.();
        if (ctx.state !== 'running') return false;
        this._needsRecovery = false;
        this.resync();
        if (this.song) {
          if (this.timer) clearInterval(this.timer);
          this.timer = setInterval(() => this._sched(), this.tickMs);
          this._sched();
        }
        return true;
      } catch {
        this._needsRecovery = true;
        return false;
      } finally {
        this._recovering = null;
      }
    })();
    return this._recovering;
  }

  _suspendForInterruption() {
    this._needsRecovery = true;
    this.ctx?.suspend?.().catch?.(() => {});
  }

  _installRecoveryHooks() {
    if (this._recoveryHooks || typeof window === 'undefined') return;
    this._recoveryHooks = true;
    this._visHook = () => document.hidden ? this._suspendForInterruption() : this.recover({ cycle: true });
    document.addEventListener?.('visibilitychange', this._visHook);
    // WKWebView không phải cuộc gọi nào cũng phát visibilitychange. Native iOS
    // gửi hai event cricko:* bên dưới; focus/pageshow là lưới an toàn cho web.
    window.addEventListener('focus', () => { if (!document.hidden) this.recover(); });
    window.addEventListener('pageshow', () => { if (!document.hidden) this.recover({ cycle: this._needsRecovery }); });
    document.addEventListener?.('resume', () => this.recover({ cycle: true }));
    window.addEventListener('cricko:suspend', () => this._suspendForInterruption());
    window.addEventListener('cricko:resume', () => this.recover({ cycle: true }));
  }

  /** Context bị iOS đóng hẳn: dựng lại graph, rồi phát tiếp đúng bài hiện tại. */
  _recreate() {
    const song = this.song || this._pending;
    if (this.timer) clearInterval(this.timer);
    try { this.songBus?.disconnect(); this.musicBus?.disconnect(); this.sfxBus?.disconnect(); } catch { /* context đã đóng */ }
    this.ctx = null; this.ready = false; this.timer = null; this.song = null;
    this.songBus = null; this._recovering = null; this._pending = song;
    return this.init();
  }

  setMusicVol(v) { this.musicVol = v; if (this.musicBus) this.musicBus.gain.value = this.muted ? 0 : v; }
  setSfxVol(v)   { this.sfxVol = v;   if (this.sfxBus)   this.sfxBus.gain.value   = this.muted ? 0 : v; }
  toggleMute() {
    this.muted = !this.muted;
    if (this.ready) { this.musicBus.gain.value = this.muted ? 0 : this.musicVol;
                      this.sfxBus.gain.value   = this.muted ? 0 : this.sfxVol; }
    return this.muted;
  }

  // ── giọng ──────────────────────────────────────────────────────────────────
  /** Một nốt melodic. `wave`: 'p12'|'p25'|'p50'|'tri'. */
  voice(bus, wave, freq, t, dur, vel = 1, opts = {}) {
    if (!this.ready || !freq) return;
    const ctx = this.ctx;
    t = Math.max(t, ctx.currentTime);            // nốt trễ thì phát ngay, đừng dồn cục
    const o = ctx.createOscillator();
    if (wave === 'tri') o.type = 'triangle';
    else o.setPeriodicWave(this.waves[wave] || this.waves.p50);

    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * opts.slide), t + dur);

    // vibrato — chi tiết nhỏ tạo cảm giác "có hồn"
    let lfo, lfoG;
    if (opts.vib) {
      lfo = ctx.createOscillator(); lfo.frequency.value = opts.vibRate || 5.6;
      lfoG = ctx.createGain(); lfoG.gain.setValueAtTime(0, t);
      lfoG.gain.linearRampToValueAtTime(freq * opts.vib, t + Math.min(dur * 0.6, 0.18));
      lfo.connect(lfoG); lfoG.connect(o.frequency); lfo.start(t); lfo.stop(t + dur + 0.05);
    }

    // ADSR. Nốt ngắn (móc kép ở 150 BPM chỉ ~0.1s) mà giữ nguyên attack/release
    // mặc định thì các mốc chồng lên nhau, đường bao gấp khúc ngược — nghe thành
    // tiếng "tách". Nên ép mọi mốc tăng dần và co attack/release theo độ dài nốt.
    const d = Math.max(dur, 0.03);
    const a   = Math.min(opts.atk ?? 0.006, d * 0.30);
    const rel = Math.min(opts.rel ?? 0.06,  d * 0.50);
    const sus = opts.sus ?? 0.72;
    const tA = t + a;
    const tD = Math.max(tA + 0.002, t + Math.min(a + 0.09, d * 0.70));
    const tS = Math.max(tD + 0.002, t + d - rel);
    const tE = Math.max(tS + 0.006, t + d + 0.01);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, tA);
    g.gain.linearRampToValueAtTime(vel * sus, tD);
    g.gain.setValueAtTime(vel * sus, tS);
    g.gain.exponentialRampToValueAtTime(0.0001, tE);

    o.connect(g); g.connect(bus);
    o.start(t); o.stop(tE + 0.05);
    // Dọn node sau khi tắt: chơi lâu mà để rác lại thì đồ thị phình ra, CPU tăng
    // dần rồi bắt đầu lụp bụp.
    o.onended = () => { o.disconnect(); g.disconnect(); lfoG?.disconnect(); lfo?.disconnect(); };
  }

  /** Kênh noise → trống. */
  drum(bus, hit, t, vel = 1) {
    if (!this.ready) return;
    const ctx = this.ctx;
    t = Math.max(t, ctx.currentTime);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    let dur = 0.06;

    if (hit === 'k') {
      // kick = xung triangle trượt tần số + chút noise
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(168, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      const og = ctx.createGain();
      og.gain.setValueAtTime(vel * 1.0, t);
      og.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(og); og.connect(bus); o.start(t); o.stop(t + 0.17);
      o.onended = () => { o.disconnect(); og.disconnect(); };
      f.type = 'lowpass'; f.frequency.value = 380; dur = 0.045; src.playbackRate.value = 0.6;
      g.gain.setValueAtTime(vel * 0.35, t);
    } else if (hit === 's') {
      f.type = 'highpass'; f.frequency.value = 1250; dur = 0.13; src.playbackRate.value = 1.0;
      g.gain.setValueAtTime(vel * 0.5, t);
    } else {                                   // h / H
      f.type = 'highpass'; f.frequency.value = 7200;
      dur = hit === 'H' ? 0.06 : 0.032;
      src.playbackRate.value = 1.6;
      g.gain.setValueAtTime(vel * (hit === 'H' ? 0.34 : 0.20), t);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t); src.stop(t + dur + 0.02);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
  }

  // ── sequencer ──────────────────────────────────────────────────────────────
  /** Đổi bài nhưng GIỮ NGUYÊN nếu đang phát đúng bài đó — tránh giật nhạc. */
  switchTo(song) { if (this.song !== song) this.play(song); }

  play(song, { restart = true } = {}) {
    if (!this.ready) { this._pending = song; return; }
    if (this.song === song && this.timer && !restart) return;
    this.stop();
    this.song = song;
    this.step = 0;
    // Bus riêng cho từng bài: đổi màn là tắt được dứt đuôi bài cũ.
    this.songBus = this.ctx.createGain();
    this.songBus.gain.value = 1;
    this.songBus.connect(this.musicBus);
    this.nextTime = this.ctx.currentTime + 0.12;
    this.timer = setInterval(() => this._sched(), this.tickMs);
    this._sched();
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.song = null;
    // Những nốt đã lên lịch trước vẫn nằm trong hàng đợi của Web Audio; không
    // hạ bus xuống thì đuôi bài cũ chồng lên bài mới đúng lúc chuyển màn.
    const old = this.songBus;
    this.songBus = null;
    if (old) {
      const t = this.ctx.currentTime;
      old.gain.setValueAtTime(old.gain.value, t);
      old.gain.linearRampToValueAtTime(0.0001, t + 0.08);
      setTimeout(() => old.disconnect(), 900);
    }
  }

  _sched() {
    const s = this.song;
    if (!s || !this.ready || this.ctx.state === 'suspended') return;
    const stepDur = 60 / s.bpm / 4;                 // giây / nốt móc kép
    const total = s.steps;
    const now = this.ctx.currentTime;
    const bus = this.songBus || this.musicBus;

    // Tụt lại phía sau (frame nặng, tab vừa ẩn, máy ngủ dậy) → NHẢY tới hiện tại
    // và bỏ luôn mấy nhịp đã lỡ. Bù cho đủ nốt mới là thứ tạo ra tiếng dồn cục.
    if (this.nextTime < now) {
      const missed = Math.ceil((now - this.nextTime) / stepDur);
      this.step += missed;
      this.nextTime += missed * stepDur;
    }

    const horizon = now + this.lookahead;
    let guard = 512;                                // chốt chặn, không để lặp vô hạn
    while (this.nextTime < horizon && guard-- > 0) {
      const st = this.step % total;
      for (const tr of s.tracks) {
        const ev = tr.map.get(st);
        if (!ev) continue;
        for (const e of ev) {
          if (tr.chan === 'drum') this.drum(bus, e.hit, this.nextTime, tr.vol);
          else this.voice(bus, tr.chan, e.freq, this.nextTime,
                          e.dur * stepDur * (tr.legato ?? 0.94), tr.vol, tr.opts || {});
        }
      }
      this.nextTime += stepDur;
      this.step++;
    }
  }

  // ── SFX (tổng hợp tại chỗ, không sample) ──────────────────────────────────
  sfx(name, p = 0) {
    if (!this.ready || this.muted) return;
    const t = this.ctx.currentTime, B = this.sfxBus, V = this.voice.bind(this), D = this.drum.bind(this);
    switch (name) {
      case 'select':  V(B, 'p25', 880, t, 0.06, 0.30, { rel: 0.03 }); break;
      case 'hover':   V(B, 'p12', 1320, t, 0.035, 0.14, { rel: 0.02 }); break;
      case 'button':  V(B, 'p50', 660, t, 0.05, 0.34); V(B, 'p50', 990, t + 0.05, 0.09, 0.30); break;
      case 'swap':    V(B, 'p25', 520, t, 0.09, 0.28, { slide: 1.5, rel: 0.04 }); break;
      case 'invalid': V(B, 'p12', 190, t, 0.10, 0.34, { slide: 0.62 });
                      V(B, 'p12', 150, t + 0.08, 0.12, 0.30, { slide: 0.6 }); break;
      case 'match': {                                    // cao dần theo bậc cascade
        const root = 523.25 * Math.pow(2, Math.min(p, 7) / 12);
        [0, 4, 7].forEach((iv, i) =>
          V(B, 'p50', root * Math.pow(2, iv / 12), t + i * 0.035, 0.13, 0.30 - i * 0.03, { rel: 0.05 }));
        D(B, 'h', t, 0.5);
        break;
      }
      case 'combo': {                                    // thang âm leo
        for (let i = 0; i < 5; i++)
          V(B, 'p25', 440 * Math.pow(2, (i * 2 + p) / 12), t + i * 0.045, 0.10, 0.26, { rel: 0.04 });
        break;
      }
      case 'special': {                                  // tạo gem đặc biệt — lấp lánh
        for (let i = 0; i < 6; i++)
          V(B, 'p12', 900 + i * 260, t + i * 0.028, 0.09, 0.22, { rel: 0.05 });
        break;
      }
      case 'blast': {                                    // nổ hàng/cột
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
        const src = this.ctx.createBufferSource(); src.buffer = this.noise; src.loop = true;
        f.type = 'bandpass'; f.Q.value = 2.5;
        f.frequency.setValueAtTime(320, t); f.frequency.exponentialRampToValueAtTime(4200, t + 0.3);
        g.gain.setValueAtTime(0.42, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
        src.connect(f); f.connect(g); g.connect(B); src.start(t); src.stop(t + 0.4);
        o.type = 'triangle'; o.frequency.setValueAtTime(140, t);
        o.frequency.exponentialRampToValueAtTime(48, t + 0.28);
        const og = this.ctx.createGain(); og.gain.setValueAtTime(0.5, t);
        og.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(og); og.connect(B); o.start(t); o.stop(t + 0.32);
        break;
      }
      case 'bomb': {                                     // trứng lăng kính
        for (let i = 0; i < 10; i++)
          V(B, 'p25', 1600 - i * 120, t + i * 0.03, 0.12, 0.24, { rel: 0.06 });
        D(B, 'k', t, 1.1); D(B, 's', t + 0.06, 0.8);
        break;
      }
      case 'coin':    V(B, 'p50', 988, t, 0.06, 0.26); V(B, 'p50', 1319, t + 0.06, 0.14, 0.26); break;
      case 'gulp':    V(B, 'tri', 300, t, 0.14, 0.4, { slide: 1.8, rel: 0.06 }); break;
      case 'crack':   D(B, 's', t, 0.8); V(B, 'p12', 240, t, 0.12, 0.3, { slide: 0.7 }); break;
      case 'chirp': {                                    // tiếng gáy — cọ cánh 3 nhịp
        // Dế gáy không phải rồng gầm: chuỗi xung ngắn quanh 4.3 kHz, rung biên
        // độ rất nhanh (LFO 58 Hz) nên nghe rào rào chứ không thành tiếng còi.
        for (let i = 0; i < 3; i++) {
          const t0 = t + i * 0.13;
          const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
          o.type = 'square';
          o.frequency.setValueAtTime(4300 + i * 140, t0);
          o.frequency.linearRampToValueAtTime(4020 + i * 140, t0 + 0.09);
          f.type = 'bandpass'; f.frequency.value = 4400; f.Q.value = 7;
          const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
          lfo.type = 'square'; lfo.frequency.value = 58; lg.gain.value = 0.2;
          lfo.connect(lg); lg.connect(g.gain);
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.26, t0 + 0.012);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
          o.connect(f); f.connect(g); g.connect(B);
          lfo.start(t0); lfo.stop(t0 + 0.12); o.start(t0); o.stop(t0 + 0.12);
        }
        break;
      }
      case 'giggle': {                                   // cười khúc khích: 4 nhịp nảy lên
        const base = 700 + Math.random() * 120;
        for (let i = 0; i < 4; i++)
          V(B, 'p25', base * (1 + i * 0.11), t + i * 0.075, 0.055, 0.22, { rel: 0.03, slide: 1.14 });
        break;
      }
      case 'levelup': {
        ['C5', 'E5', 'G5', 'C6', 'E6'].forEach((n, i) =>
          V(B, 'p50', noteFreq(n), t + i * 0.08, 0.24, 0.32, { rel: 0.1 }));
        D(B, 'k', t, 1); D(B, 's', t + 0.32, 0.9);
        break;
      }
      case 'win': {
        ['G4', 'C5', 'E5', 'G5', 'E5', 'G5'].forEach((n, i) =>
          V(B, 'p50', noteFreq(n), t + i * 0.1, 0.3, 0.34, { rel: 0.12, vib: 0.006 }));
        break;
      }
      case 'lose': {
        ['E5', 'D#5', 'D5', 'A4'].forEach((n, i) =>
          V(B, 'p25', noteFreq(n), t + i * 0.15, 0.34, 0.3, { rel: 0.14 }));
        break;
      }
      case 'tick':    V(B, 'p12', 1760, t, 0.03, 0.16, { rel: 0.02 }); break;
      case 'warn':    V(B, 'p12', 330, t, 0.1, 0.3, { slide: 0.8 }); break;
    }
  }
}

/** Biến định nghĩa bài hát dạng text thành bảng tra step → sự kiện. */
export function compileSong(def) {
  const tracks = def.tracks.map(tr => {
    const parsed = tr.chan === 'drum' ? parseDrums(tr.pattern) : parseTrack(tr.pattern);
    const map = new Map();
    for (const e of parsed.events) {
      if (!map.has(e.step)) map.set(e.step, []);
      map.get(e.step).push(e);
    }
    return { ...tr, map, steps: parsed.steps };
  });
  const steps = def.steps || Math.max(...tracks.map(t => t.steps));
  return { bpm: def.bpm, name: def.name, steps, tracks };
}
