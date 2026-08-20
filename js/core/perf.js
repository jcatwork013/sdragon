// ── Đo hiệu năng & tự hạ chất lượng ────────────────────────────────────────
// Mục tiêu: máy yếu vẫn mượt, máy khoẻ vẫn đẹp. Không hỏi người chơi câu nào.
export const Q = { LOW: 0, MED: 1, HIGH: 2 };

class Perf {
  constructor() {
    this.samples = new Float32Array(36);
    this.i = 0; this.n = 0;
    this.ms = 16.7;
    this.quality = Q.HIGH;
    this.lockUntil = 0;          // tránh nhảy chất lượng liên tục
    this.t = 0;
    this.fps = 60;
  }
  /** Gọi mỗi khung hình với dt (giây). */
  tick(dt) {
    this.t += dt;
    const ms = dt * 1000;
    this.samples[this.i] = ms;
    this.i = (this.i + 1) % this.samples.length;
    if (this.n < this.samples.length) this.n++;

    let sum = 0;
    for (let k = 0; k < this.n; k++) sum += this.samples[k];
    this.ms = sum / this.n;
    this.fps = 1000 / this.ms;

    if (this.n < this.samples.length || this.t < this.lockUntil) return;
    // 22ms ≈ 45fps: bắt đầu hạ.  14ms ≈ 71fps: dư sức, nâng lên.
    // 19ms ≈ 53fps: bắt đầu hạ — chờ tới 45fps là người chơi đã thấy giật rồi.
    // Nâng lại phải chắc tay (12ms ≈ 83fps) và chờ lâu hơn, kẻo nhảy qua lại.
    if (this.ms > 19 && this.quality > Q.LOW) { this.quality--; this.lockUntil = this.t + 4; }
    else if (this.ms < 12 && this.quality < Q.HIGH) { this.quality++; this.lockUntil = this.t + 8; }
  }
  /** Hệ số nhân số lượng hạt theo mức chất lượng. */
  get particleScale() { return this.quality === Q.HIGH ? 1 : this.quality === Q.MED ? .6 : .3; }
  get wantShadows()   { return this.quality === Q.HIGH; }
  get wantShimmer()   { return this.quality >= Q.MED; }
  get label()         { return ['THẤP', 'VỪA', 'CAO'][this.quality]; }
}

export const perf = new Perf();
