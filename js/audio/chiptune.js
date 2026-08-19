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
    this.lookahead = 0.12;      // giây scheduler nhìn trước
    this.tickMs = 22;
    this._pending = null;
  }

  /** Phải gọi trong một user-gesture (click/tap) — chính sách autoplay của trình duyệt. */
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return this.ready; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC({ latencyHint: 'interactive' });

    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;

    // Nén nhẹ để combo dồn dập không bị vỡ tiếng
    this.comp = this.ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 22;
    this.comp.ratio.value = 5; this.comp.attack.value = 0.004; this.comp.release.value = 0.16;

    this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = this.musicVol;
    this.sfxBus   = this.ctx.createGain(); this.sfxBus.gain.value   = this.sfxVol;

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
    this.ready = true;
    if (this._pending) { const s = this._pending; this._pending = null; this.play(s); }
    return true;
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

    const g = ctx.createGain();
    const a = opts.atk ?? 0.006, rel = opts.rel ?? 0.06;
    const sus = opts.sus ?? 0.72;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + a);
    g.gain.linearRampToValueAtTime(vel * sus, t + Math.min(a + 0.09, dur * 0.7));
    g.gain.setValueAtTime(vel * sus, t + Math.max(dur - rel, a + 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.01);

    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.06);
  }

  /** Kênh noise → trống. */
  drum(bus, hit, t, vel = 1) {
    if (!this.ready) return;
    const ctx = this.ctx;
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
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this._sched(), this.tickMs);
    this._sched();
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    this.song = null;
  }

  _sched() {
    const s = this.song;
    if (!s || !this.ready) return;
    const stepDur = 60 / s.bpm / 4;                 // giây / nốt móc kép
    const total = s.steps;
    while (this.nextTime < this.ctx.currentTime + this.lookahead) {
      const st = this.step % total;
      for (const tr of s.tracks) {
        const ev = tr.map.get(st);
        if (!ev) continue;
        for (const e of ev) {
          if (tr.chan === 'drum') this.drum(this.musicBus, e.hit, this.nextTime, tr.vol);
          else this.voice(this.musicBus, tr.chan, e.freq, this.nextTime,
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
      case 'roar': {                                     // rồng gầm
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(64, t + 0.55);
        f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t);
        f.frequency.exponentialRampToValueAtTime(420, t + 0.6);
        const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain();
        lfo.frequency.value = 24; lg.gain.value = 26; lfo.connect(lg); lg.connect(o.frequency);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5, t + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
        o.connect(f); f.connect(g); g.connect(B);
        lfo.start(t); lfo.stop(t + 0.7); o.start(t); o.stop(t + 0.7);
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
