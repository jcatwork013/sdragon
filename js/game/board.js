// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Engine match-3 — thuần logic + trạng thái hoạt ảnh, không phụ thuộc UI. ║
// ║  Đây là file cần port 1-1 sang C# nếu sau này dựng bản Unity.            ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { GEMS, SP, TOKEN, drawGem } from './gems.js';
import { clamp, lerp, ease, rand, randInt, TAU, makeCanvas } from '../core/util.js';

const G_ACCEL = 5200;      // px/s² — trọng lực khi gem rơi
const T_SWAP  = 0.16;
const T_POP   = 0.30;
const T_SHUF  = 0.55;
const HINT_AFTER = 4.5;    // giây đứng yên thì gợi ý

let UID = 0;

class Cell {
  constructor(type, cx, cy, size) {
    this.id = ++UID;
    this.type = type;
    this.sp = SP.NONE;
    this.token = TOKEN.NONE;
    this.web = 0;          // >0 = bị tơ nhện khoá, không đổi chỗ được
    this.cx = cx; this.cy = cy;                 // toạ độ lưới
    this.px = cx * size; this.py = cy * size;   // toạ độ vẽ (góc trên-trái ô)
    this.tx = this.px;  this.ty = this.py;
    this.vy = 0;
    this.scale = 1; this.alpha = 1; this.rot = 0;
    this.squash = 0;
    this.pop = -1;                              // >=0 nghĩa là đang nổ
    this.seed = Math.random() * 6;
    this.spawn = 0;                             // hoạt ảnh xuất hiện
  }
}

export class Board {
  /** @param {object} o { cols, rows, size, colours } */
  constructor(o = {}) {
    this.cols = o.cols ?? 8;
    this.rows = o.rows ?? 8;
    this.size = o.size ?? 64;
    this.colours = clamp(o.colours ?? 6, 3, GEMS.length);
    this.fortune = 0;               // chỉ số May mắn của rồng → tỉ lệ ra gem đặc biệt
    this.might = 0;                 // chỉ số Sức mạnh  → bán kính nổ
    this.tokenRate = 0.030;         // tỉ lệ mỗi viên mới mang vật phẩm
    this.on = {};                   // { match, special, blast, land, settle, noMoves, shuffled }
    this.reset();
  }

  // ── tiện ích lưới ─────────────────────────────────────────────────────────
  idx(c, r) { return r * this.cols + c; }
  get(c, r) { return (c < 0 || r < 0 || c >= this.cols || r >= this.rows) ? null : this.grid[this.idx(c, r)]; }
  set(c, r, cell) { this.grid[this.idx(c, r)] = cell; if (cell) { cell.cx = c; cell.cy = r; } }
  get w() { return this.cols * this.size; }
  get h() { return this.rows * this.size; }

  reset() {
    this.grid = new Array(this.cols * this.rows).fill(null);
    this.phase = 'idle';
    this.timer = 0;
    this.cascade = 0;
    this.sel = null;
    this.swapA = null; this.swapB = null;
    this.idleT = 0;
    this.hint = null;
    this.locked = false;
    this.pending = [];              // ô chờ nổ ở nhịp tiếp theo
    this.t = 0;
    this.fill();
  }

  /** Đổ đầy bàn: không có bộ trùng sẵn, và chắc chắn có ít nhất 1 nước đi. */
  fill() {
    let guard = 0;
    do {
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) {
          let t, tries = 0;
          do { t = randInt(this.colours); tries++; }
          while (tries < 30 && this._wouldMatchAt(c, r, t));
          const cell = new Cell(t, c, r, this.size);
          this.set(c, r, cell);
        }
    } while (!this.findMove() && ++guard < 40);
  }

  /** Đặt gem loại `t` vào (c,r) có tạo bộ 3 ngay không? (dùng khi đổ bàn) */
  _wouldMatchAt(c, r, t) {
    const a = this.get(c - 1, r), b = this.get(c - 2, r);
    if (a && b && a.type === t && b.type === t) return true;
    const d = this.get(c, r - 1), e = this.get(c, r - 2);
    if (d && e && d.type === t && e.type === t) return true;
    return false;
  }

  // ── tìm bộ trùng ──────────────────────────────────────────────────────────
  /** Trả về mảng "run": dãy ≥3 gem cùng loại theo hàng hoặc cột. */
  findRuns() {
    const runs = [];
    const scan = (dir) => {
      const outer = dir === 'h' ? this.rows : this.cols;
      const inner = dir === 'h' ? this.cols : this.rows;
      for (let o = 0; o < outer; o++) {
        let start = 0;
        for (let i = 1; i <= inner; i++) {
          const prev = dir === 'h' ? this.get(i - 1, o) : this.get(o, i - 1);
          const cur  = i < inner ? (dir === 'h' ? this.get(i, o) : this.get(o, i)) : null;
          if (!cur || !prev || cur.type !== prev.type || cur.pop >= 0 || prev.pop >= 0) {
            const len = i - start;
            if (len >= 3 && prev && prev.pop < 0) {
              const cells = [];
              for (let k = start; k < i; k++) cells.push(dir === 'h' ? this.idx(k, o) : this.idx(o, k));
              runs.push({ dir, cells, type: prev.type });
            }
            start = i;
          }
        }
      }
    };
    scan('h'); scan('v');
    return runs.concat(this.findSquares());
  }

  /**
   * Bốn viên cùng loại xếp thành hình VUÔNG 2×2 cũng tính là một bộ trùng.
   *
   * Trả về cùng dạng với run thẳng (`dir: 'sq'`) nên groupRuns() gộp được với
   * run cắt qua nó, và MỌI chỗ đang hỏi "có bộ trùng nào không?" — kiểm tra
   * nước đi hợp lệ, dò hết nước, xáo bài lúc mở màn — đều tự hiểu luôn, không
   * phải sửa thêm chỗ nào.
   */
  findSquares() {
    const out = [];
    for (let r = 0; r < this.rows - 1; r++) {
      for (let c = 0; c < this.cols - 1; c++) {
        const a = this.get(c, r), b = this.get(c + 1, r);
        const d = this.get(c, r + 1), e = this.get(c + 1, r + 1);
        if (!a || !b || !d || !e) continue;
        if (a.pop >= 0 || b.pop >= 0 || d.pop >= 0 || e.pop >= 0) continue;
        if (a.type !== b.type || a.type !== d.type || a.type !== e.type) continue;
        out.push({ dir: 'sq', type: a.type,
                   cells: [this.idx(c, r), this.idx(c + 1, r), this.idx(c, r + 1), this.idx(c + 1, r + 1)] });
      }
    }
    return out;
  }

  /** Gộp các run giao nhau thành "nhóm" → quyết định gem đặc biệt (L/T, 4, 5). */
  groupRuns(runs) {
    const groups = [];
    const used = new Set();
    for (let i = 0; i < runs.length; i++) {
      if (used.has(i)) continue;
      const g = { runs: [runs[i]], cells: new Set(runs[i].cells), type: runs[i].type };
      used.add(i);
      let grew = true;
      while (grew) {
        grew = false;
        for (let j = 0; j < runs.length; j++) {
          if (used.has(j) || runs[j].type !== g.type) continue;
          if (runs[j].cells.some(c => g.cells.has(c))) {
            used.add(j); g.runs.push(runs[j]);
            runs[j].cells.forEach(c => g.cells.add(c));
            grew = true;
          }
        }
      }
      groups.push(g);
    }
    return groups;
  }

  /** Loại gem đặc biệt mà một nhóm sinh ra. */
  specialFor(g) {
    // Chỉ tính theo RUN THẲNG. Hình vuông có 4 ô, nếu gộp chung vào phép đo
    // chiều dài thì một hình vuông trơ trọi cũng ra "4 viên" và đẻ ra đá đặc
    // biệt — đá đặc biệt sẽ tràn lan, hỏng cân bằng đã tinh chỉnh sẵn.
    const lines = g.runs.filter(r => r.dir !== 'sq');
    if (!lines.length) return SP.NONE;                 // vuông trơ → nổ thôi
    const hasH = lines.some(r => r.dir === 'h'), hasV = lines.some(r => r.dir === 'v');
    const maxLen = Math.max(...lines.map(r => r.cells.length));
    if (hasH && hasV) return SP.CROSS;                 // hình L / T
    if (maxLen >= 5)  return SP.BOMB;                  // 5 thẳng hàng
    if (maxLen === 4) return lines[0].dir === 'h' ? SP.LINE_H : SP.LINE_V;
    return SP.NONE;
  }

  // ── kích nổ gem đặc biệt (đệ quy, có chống lặp) ───────────────────────────
  /**
   * Kích nổ gem đặc biệt.
   *
   * LUẬT VÙNG NỔ (cố ý giữ CHẶT để nước đi còn đọc được):
   *   · Thương Lửa ngang → ĐÚNG MỘT HÀNG.  Dọc → ĐÚNG MỘT CỘT.
   *   · Thập Long        → một hàng + một cột.
   *   · Trứng Lăng Kính  → mọi viên cùng màu.
   * Chỉ số "Sức mạnh" KHÔNG nới vùng nổ (nới ra là bàn cờ tan nát, người chơi
   * mất khả năng tính trước) — nó cộng vào SÁT THƯƠNG lên thiên địch thay thế.
   *
   * `depth` chặn phản ứng dây chuyền: một viên đặc biệt chỉ kích tối đa 2 viên
   * kế tiếp, tránh cảnh một nước đi quét sạch cả bàn.
   */
  detonate(index, out, seen = new Set(), colourHint = -1, depth = 0) {
    if (seen.has(index)) return;
    seen.add(index);
    const cell = this.grid[index];
    if (!cell) return;
    out.add(index);
    const sp = cell.sp;
    if (!sp) return;
    const MAX_CHAIN = 2;

    const add = (c, r) => {
      const i = this.idx(c, r);
      if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return;
      if (!this.grid[i]) return;
      out.add(i);
      if (this.grid[i].sp && depth < MAX_CHAIN) this.detonate(i, out, seen, colourHint, depth + 1);
    };
    if (sp === SP.LINE_H || sp === SP.CROSS) for (let c = 0; c < this.cols; c++) add(c, cell.cy);
    if (sp === SP.LINE_V || sp === SP.CROSS) for (let r = 0; r < this.rows; r++) add(cell.cx, r);
    if (sp === SP.BOMB) {
      const target = colourHint >= 0 ? colourHint : cell.type;
      for (let i = 0; i < this.grid.length; i++)
        if (this.grid[i] && this.grid[i].type === target) {
          out.add(i);
          if (this.grid[i].sp && depth < MAX_CHAIN) this.detonate(i, out, seen, colourHint, depth + 1);
        }
    }
    this.on.blast?.(sp, cell.cx, cell.cy);
  }

  // ── nước đi ───────────────────────────────────────────────────────────────
  /** Có nước đi hợp lệ nào không? Trả về {a,b} hoặc null. */
  findMove() {
    const swap = (i, j) => { const t = this.grid[i]; this.grid[i] = this.grid[j]; this.grid[j] = t; };
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++) {
        const i = this.idx(c, r);
        if (!this.grid[i]) continue;
        if (this.grid[i].sp === SP.BOMB) return { a: [c, r], b: [c + 1 < this.cols ? c + 1 : c - 1, r] };
        for (const [dc, dr] of [[1, 0], [0, 1]]) {
          const c2 = c + dc, r2 = r + dr;
          if (c2 >= this.cols || r2 >= this.rows) continue;
          const j = this.idx(c2, r2);
          if (!this.grid[j]) continue;
          swap(i, j);
          const ok = this.findRuns().length > 0 || this.grid[i].sp === SP.BOMB || this.grid[j].sp === SP.BOMB;
          swap(i, j);
          if (ok) return { a: [c, r], b: [c2, r2] };
        }
      }
    return null;
  }

  /** Người chơi thử đổi chỗ 2 ô kề nhau. */
  trySwap(c1, r1, c2, r2) {
    if (this.phase !== 'idle' || this.locked) return false;
    if (Math.abs(c1 - c2) + Math.abs(r1 - r2) !== 1) return false;
    const A = this.get(c1, r1), B = this.get(c2, r2);
    if (!A || !B) return false;
    if (A.web > 0 || B.web > 0) { this.on.blocked?.(A.web > 0 ? A : B); return false; }

    this.swapA = A; this.swapB = B;
    this.set(c1, r1, B); this.set(c2, r2, A);

    // gem đặc biệt kết hợp → luôn hợp lệ
    const combo = (A.sp === SP.BOMB || B.sp === SP.BOMB) ||
                  (A.sp && B.sp);
    const valid = combo || this.findRuns().length > 0;

    this.set(c1, r1, A); this.set(c2, r2, B);        // trả về, để hoạt ảnh làm phần đổi thật
    this.phase = 'swap';
    this.timer = 0;
    this.swapValid = valid;
    this.swapCombo = combo;
    this.sel = null; this.hint = null; this.idleT = 0;
    return true;
  }

  _commitSwap() {
    const A = this.swapA, B = this.swapB;
    const [c1, r1, c2, r2] = [A.cx, A.cy, B.cx, B.cy];
    this.set(c1, r1, B); this.set(c2, r2, A);
    A.tx = A.cx * this.size; A.ty = A.cy * this.size;
    B.tx = B.cx * this.size; B.ty = B.cy * this.size;
    A.px = A.tx; A.py = A.ty; B.px = B.tx; B.py = B.ty;
  }

  /** Xử lý combo của 2 gem đặc biệt được hoán đổi trực tiếp. */
  _specialCombo() {
    const A = this.swapA, B = this.swapB;
    const out = new Set(), seen = new Set();
    if (A.sp === SP.BOMB && B.sp === SP.BOMB) {
      for (let i = 0; i < this.grid.length; i++) if (this.grid[i]) out.add(i);
    } else if (A.sp === SP.BOMB || B.sp === SP.BOMB) {
      const bomb = A.sp === SP.BOMB ? A : B, other = A.sp === SP.BOMB ? B : A;
      if (other.sp) {                                   // bom + kẻ sọc: biến cả màu thành kẻ sọc
        for (let i = 0; i < this.grid.length; i++) {
          const g = this.grid[i];
          if (g && g.type === other.type) { g.sp = other.sp; this.detonate(i, out, seen, -1, 2); }
        }
      }
      this.detonate(this.idx(bomb.cx, bomb.cy), out, seen, other.type);
      out.add(this.idx(other.cx, other.cy));
    } else {                                            // kẻ sọc + kẻ sọc → chữ thập
      A.sp = SP.CROSS;
      this.detonate(this.idx(A.cx, A.cy), out, seen);
      this.detonate(this.idx(B.cx, B.cy), out, seen);
    }
    this._beginPop([...out], null);
  }

  // ── vòng giải quyết: nổ → rơi → lặp ───────────────────────────────────────
  resolve(originIdx = null) {
    const runs = this.findRuns();
    if (!runs.length) return false;
    const groups = this.groupRuns(runs);
    const out = new Set();
    const specials = [];

    for (const g of groups) {
      const sp = this.specialFor(g);
      let host = null;
      if (sp) {
        // ưu tiên đặt gem đặc biệt ngay ô người chơi vừa chạm
        host = (originIdx != null && g.cells.has(originIdx)) ? originIdx : null;
        if (host == null && g.runs.length > 1) {         // giao điểm của L/T
          const hs = g.runs.filter(r => r.dir === 'h'), vs = g.runs.filter(r => r.dir === 'v');
          for (const hr of hs) for (const vr of vs) {
            const x = hr.cells.find(i => vr.cells.includes(i));
            if (x != null) host = x;
          }
        }
        if (host == null) { const arr = [...g.cells]; host = arr[(arr.length / 2) | 0]; }
        specials.push({ index: host, sp, type: g.type });
      }
      for (const i of g.cells) out.add(i);
    }

    // gem đặc biệt nằm trong bộ trùng thì phát nổ theo
    const seen = new Set();
    for (const i of [...out]) if (this.grid[i]?.sp) this.detonate(i, out, seen);

    // gỡ tơ: mỗi ô vỡ làm rách tơ ở 4 ô kề
    for (const i of out) {
      const cc = this.grid[i]; if (!cc) continue;
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nb = this.get(cc.cx + dc, cc.cy + dr);
        if (nb && nb.web > 0) { nb.web--; this.on.unweb?.(nb); }
      }
    }
    this._beginPop([...out], specials);
    return true;
  }

  _beginPop(indices, specials) {
    this.cascade++;
    const hostSet = new Set((specials || []).map(s => s.index));
    let n = 0;
    for (const i of indices) {
      const cell = this.grid[i];
      if (!cell || hostSet.has(i)) continue;
      cell.pop = 0;
      n++;
    }
    this._newSpecials = specials || [];
    for (const s of this._newSpecials) {
      const cell = this.grid[s.index];
      if (cell) { cell.sp = s.sp; cell.type = s.type; cell.spawn = 0.001; }
    }
    // gom vật phẩm nhặt được trong đợt nổ này
    const tokens = [];
    for (const i of indices) {
      const c = this.grid[i];
      if (c && c.token && c.pop >= 0) tokens.push({ token: c.token, cx: c.cx, cy: c.cy, px: c.px, py: c.py });
    }
    this.phase = 'pop';
    this.timer = 0;
    this.on.match?.({ count: n, cascade: this.cascade, cells: indices.filter(i => this.grid[i]),
                      specials: this._newSpecials, tokens });
    if (this._newSpecials.length) this.on.special?.(this._newSpecials);
  }

  /** Xoá ô đã nổ, dồn trọng lực, sinh gem mới trên đỉnh. */
  _applyGravity() {
    for (let i = 0; i < this.grid.length; i++)
      if (this.grid[i] && this.grid[i].pop >= 0) this.grid[i] = null;

    for (let c = 0; c < this.cols; c++) {
      let write = this.rows - 1;
      for (let r = this.rows - 1; r >= 0; r--) {
        const cell = this.get(c, r);
        if (!cell) continue;
        if (write !== r) { this.set(c, write, cell); this.grid[this.idx(c, r)] = null; }
        write--;
      }
      // đổ đầy phần trống bằng gem mới, xếp chồng phía trên bàn
      let above = 1;
      for (let r = write; r >= 0; r--) {
        const t = randInt(this.colours);
        const cell = new Cell(t, c, r, this.size);
        cell.py = -above * this.size - this.size * 0.4;
        // "May mắn" cao → thỉnh thoảng rơi ra gem kẻ sọc
        if (this.fortune > 0 && Math.random() < 0.006 * this.fortune)
          cell.sp = Math.random() < 0.5 ? SP.LINE_H : SP.LINE_V;
        // vật phẩm bất ngờ — tỉ lệ do màn quy định, May mắn cộng thêm
        if (Math.random() < this.tokenRate + this.fortune * 0.002) {
          const roll = Math.random();
          cell.token = roll < .52 ? TOKEN.CLOCK : roll < .82 ? TOKEN.COIN : TOKEN.STAR;
        }
        this.set(c, r, cell);
        above++;
      }
    }
    // đặt đích rơi
    for (const cell of this.grid) {
      if (!cell) continue;
      cell.tx = cell.cx * this.size; cell.ty = cell.cy * this.size;
      cell.px = cell.tx;
      if (cell.py > cell.ty) cell.py = cell.ty;
      cell.vy = 0;
    }
    this.phase = 'fall';
    this.timer = 0;
  }

  // ── cập nhật mỗi khung hình ───────────────────────────────────────────────
  update(dt) {
    this.t += dt;
    const S = this.size;

    switch (this.phase) {
      case 'idle': {
        this.idleT += dt;
        if (!this.locked && this.idleT > HINT_AFTER && !this.hint) this.hint = this.findMove();
        break;
      }
      case 'swap':
      case 'revert': {
        this.timer += dt;
        const k = clamp(this.timer / T_SWAP, 0, 1);
        const e = ease.inOut(k);
        const A = this.swapA, B = this.swapB;
        const back = this.phase === 'revert';
        const ax = A.cx * S, ay = A.cy * S, bx = B.cx * S, by = B.cy * S;
        const f = back ? (k < .5 ? e * 2 : (1 - e) * 2) : e;
        A.px = lerp(ax, bx, f); A.py = lerp(ay, by, f);
        B.px = lerp(bx, ax, f); B.py = lerp(by, ay, f);
        A.scale = B.scale = 1 + 0.14 * Math.sin(k * Math.PI);
        if (k >= 1) {
          A.scale = B.scale = 1;
          if (back) { A.px = ax; A.py = ay; B.px = bx; B.py = by; this.phase = 'idle'; this.idleT = 0; }
          else {
            this._commitSwap();
            this.cascade = 0;
            if (this.swapCombo) this._specialCombo();
            else if (!this.resolve(this.idx(this.swapA.cx, this.swapA.cy)) &&
                     !this.resolve(this.idx(this.swapB.cx, this.swapB.cy))) {
              this.phase = 'idle';
            }
          }
        }
        break;
      }
      case 'pop': {
        this.timer += dt;
        const k = clamp(this.timer / T_POP, 0, 1);
        for (const cell of this.grid) {
          if (!cell) continue;
          if (cell.pop >= 0) {
            cell.pop = k;
            cell.scale = k < .3 ? 1 + k / .3 * 0.42 : lerp(1.42, 0, ease.inCubic((k - .3) / .7));
            cell.alpha = k < .55 ? 1 : 1 - (k - .55) / .45;
            cell.rot = k * 1.6;
          }
        }
        if (k >= 1) this._applyGravity();
        break;
      }
      case 'fall': {
        let moving = false;
        for (const cell of this.grid) {
          if (!cell) continue;
          if (cell.py < cell.ty - 0.5) {
            cell.vy += G_ACCEL * dt;
            cell.py += cell.vy * dt;
            if (cell.py >= cell.ty) {
              cell.py = cell.ty;
              cell.squash = clamp(cell.vy / 2600, 0, 1) * 0.42;
              cell.vy = 0;
              this.on.land?.(cell);
            } else moving = true;
          }
          if (cell.spawn > 0) { cell.spawn = Math.min(1, cell.spawn + dt * 4); if (cell.spawn < 1) moving = true; }
        }
        if (!moving) {
          for (const cell of this.grid) if (cell) { cell.pop = -1; cell.rot = 0; cell.alpha = 1; cell.spawn = 0; }
          if (!this.resolve()) {
            const mv = this.findMove();
            if (!mv) { this.phase = 'shuffle'; this.timer = 0; this.on.noMoves?.(); }
            else { this.phase = 'idle'; this.idleT = 0; this.on.settle?.(this.cascade); this.cascade = 0; }
          }
        }
        break;
      }
      case 'shuffle': {
        this.timer += dt;
        const k = clamp(this.timer / T_SHUF, 0, 1);
        for (const cell of this.grid) {
          if (!cell) continue;
          cell.scale = k < .5 ? 1 - k * 1.7 : (k - .5) * 1.7;
          cell.rot = k * TAU;
        }
        if (k > .5 && !this._didShuffle) {
          this._didShuffle = true;
          let guard = 0;
          do {
            for (const cell of this.grid) if (cell) cell.type = randInt(this.colours);
          } while ((this.findRuns().length || !this.findMove()) && ++guard < 60);
          this.on.shuffled?.();
        }
        if (k >= 1) {
          this._didShuffle = false;
          for (const cell of this.grid) if (cell) { cell.scale = 1; cell.rot = 0; }
          this.phase = 'idle'; this.idleT = 0;
        }
        break;
      }
    }

    // giãn nở sau khi tiếp đất
    for (const cell of this.grid) {
      if (!cell) continue;
      if (cell.squash > 0) cell.squash = Math.max(0, cell.squash - dt * 3.4);
    }
  }

  // ── nhập liệu ─────────────────────────────────────────────────────────────
  /** Giăng tơ lên `n` ô ngẫu nhiên còn trống tơ. */
  webRandom(n) {
    const free = [];
    for (let i = 0; i < this.grid.length; i++) if (this.grid[i] && !this.grid[i].web) free.push(i);
    const hit = [];
    for (let k = 0; k < n && free.length; k++) {
      const j = randInt(free.length);
      const cell = this.grid[free[j]];
      cell.web = 1; hit.push(cell);
      free.splice(j, 1);
    }
    return hit;
  }

  /** Đổi toạ độ pixel (đã trừ gốc bàn cờ) → ô lưới, hoặc null. */
  cellAt(lx, ly) {
    const c = Math.floor(lx / this.size), r = Math.floor(ly / this.size);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) return null;
    return [c, r];
  }

  // ── vẽ ────────────────────────────────────────────────────────────────────
  draw(ctx, ox, oy) {
    const S = this.size;
    ctx.save();
    ctx.translate(ox, oy);

    // ô nền dạng bàn cờ — nướng 1 lần thay vì 64 lệnh fillRect mỗi khung hình
    if (!this._gridImg) {
      this._gridImg = makeCanvas(this.cols * S, this.rows * S);
      const g = this._gridImg.getContext('2d');
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++) {
          g.fillStyle = (c + r) % 2 ? 'rgba(255,255,255,.045)' : 'rgba(0,0,0,.16)';
          g.fillRect(c * S, r * S, S, S);
        }
    }
    ctx.drawImage(this._gridImg, 0, 0);

    // ô gợi ý
    if (this.hint) {
      const pulse = .35 + .35 * Math.sin(this.t * 5);
      for (const [c, r] of [this.hint.a, this.hint.b]) {
        ctx.strokeStyle = `rgba(255,235,140,${pulse})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(c * S + 3, r * S + 3, S - 6, S - 6);
      }
    }

    // ô đang chọn
    if (this.sel) {
      const [c, r] = this.sel;
      const p = .55 + .45 * Math.sin(this.t * 9);
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${p})`;
      ctx.lineWidth = 4; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14;
      ctx.strokeRect(c * S + 3, r * S + 3, S - 6, S - 6);
      ctx.restore();
    }

    // gem — vẽ ô đang nổ sau cùng để nổi lên trên
    const late = [];
    for (const cell of this.grid) {
      if (!cell) continue;
      (cell.pop >= 0 || cell.spawn > 0 ? late : late).push(cell);   // giữ thứ tự lưới
    }
    for (const cell of this.grid) {
      if (!cell || cell.pop >= 0) continue;
      this._drawCell(ctx, cell, S);
    }
    for (const cell of this.grid) {
      if (!cell || cell.pop < 0) continue;
      this._drawCell(ctx, cell, S);
    }
    // tơ nhện phủ lên trên gem
    for (const cell of this.grid) {
      if (!cell || cell.web <= 0) continue;
      const cxp = cell.px + S / 2, cyp = cell.py + S / 2, r = S * .46;
      ctx.save();
      ctx.translate(cxp, cyp);
      ctx.strokeStyle = 'rgba(235,240,255,.85)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * TAU + .3;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke();
      }
      for (let ring = 1; ring <= 3; ring++) {
        ctx.beginPath();
        for (let k = 0; k <= 6; k++) {
          const a = k / 6 * TAU + .3, rr = r * ring / 3.4;
          k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  _drawCell(ctx, cell, S) {
    const sq = cell.squash;
    const sx = 1 + sq, sy = 1 - sq;
    const born = cell.spawn > 0 ? ease.outBack(cell.spawn) : 1;
    ctx.save();
    ctx.translate(cell.px + S / 2, cell.py + S / 2 + sq * S * 0.5);
    ctx.scale(sx, sy);
    drawGem(ctx, cell.type, 0, 0, S * 0.92, {
      special: cell.sp, token: cell.token, t: this.t, seed: cell.seed,
      scale: cell.scale * born, alpha: cell.alpha, rot: cell.rot,
      glow: cell.sp ? .55 + .25 * Math.sin(this.t * 5 + cell.seed) : 0,
    });
    ctx.restore();
  }
}
