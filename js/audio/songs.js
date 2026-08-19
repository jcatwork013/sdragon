// ╔══════════════════════════════════════════════════════════════════════════╗
// ║  Nhạc gốc cho SDrakon — soạn tay, không sample, không cover.              ║
// ║  Ký hiệu:  "NỐT/ĐỘ_DÀI"  với độ dài tính bằng nốt móc kép (1/16).        ║
// ║  Trống:    1 ký tự = 1 móc kép — k kick · s snare · h hat · H hat mạnh    ║
// ╚══════════════════════════════════════════════════════════════════════════╝
import { compileSong } from './chiptune.js';

const rep  = (s, n) => Array(n).fill(s).join(' ');
/** Arpeggio 4 nốt móc kép, lặp 4 lần = trọn 1 ô nhịp. */
const arp  = (...n) => rep(n.map(x => `${x}/1`).join(' '), 4);
/** 8 nốt móc đơn = trọn 1 ô nhịp. */
const bass = (...n) => n.map(x => `${x}/2`).join(' ');
const bar  = (a) => a.join(' ');

// ── 1. NHẠC MÀN CHƠI — "Lửa Trong Đá" · La thứ · 132 BPM · 16 ô nhịp ────────
const CHORDS = ['Am','F','C','G','Am','F','Dm','E','Am','F','C','G','Am','Dm','E','Am'];
const ARP = {
  Am: ['A4','C5','E5','A5'], F: ['F4','A4','C5','F5'], C: ['G4','C5','E5','G5'],
  G:  ['G4','B4','D5','G5'], Dm:['D4','F4','A4','D5'], E: ['E4','G#4','B4','E5'],
};
const BASS = {
  Am: ['A2','A2','E3','A2','A2','A2','E3','G2'],
  F:  ['F2','F2','C3','F2','F2','F2','C3','E2'],
  C:  ['C3','C3','G3','C3','C3','C3','G3','B2'],
  G:  ['G2','G2','D3','G2','G2','B2','D3','G2'],
  Dm: ['D3','D3','A3','D3','D3','D3','A3','C3'],
  E:  ['E2','E2','B2','E2','E2','E2','B2','E2'],
};

const BATTLE_LEAD = bar([
  'E5/2 A5/2 G5/2 E5/2 D5/2 E5/2 C5/4',           //  1 Am
  'F5/2 A5/2 G5/2 F5/2 E5/4 C5/4',                //  2 F
  'E5/2 G5/2 C6/4 B5/2 G5/2 E5/4',                //  3 C
  'D5/2 G5/2 B5/2 D6/2 B5/4 G5/4',                //  4 G
  'A5/2 C6/2 B5/2 A5/2 G5/2 A5/2 E5/4',           //  5 Am
  'F5/2 A5/2 C6/4 A5/2 F5/2 E5/4',                //  6 F
  'D5/2 F5/2 A5/2 D6/2 C6/4 A5/4',                //  7 Dm
  'B5/2 E6/2 D6/2 B5/2 G#5/4 E5/4',               //  8 E
  'A5/1 B5/1 C6/2 E6/2 D6/2 C6/2 B5/2 A5/4',      //  9 Am — quãng tám cao
  'C6/1 A5/1 F5/2 A5/2 C6/2 F6/2 C6/2 A5/4',      // 10 F
  'G5/2 C6/2 E6/2 G6/2 E6/4 C6/4',                // 11 C
  'D6/2 B5/2 G5/2 B5/2 D6/4 -/4',                 // 12 G
  'E6/4 C6/2 A5/2 -/2 E5/2 A5/4',                 // 13 Am
  'F6/4 D6/2 A5/2 -/2 F5/2 D5/4',                 // 14 Dm
  'G#5/2 B5/2 D6/2 E6/2 D6/2 B5/2 G#5/4',         // 15 E
  'A5/4 E5/4 A4/8',                               // 16 Am
]);

const BATTLE_DRUMS = CHORDS.map((_, i) =>
  i === 7  ? 'k-h-s-h-k-h-sksk' :
  i === 15 ? 'k-h-s-h-kkshsHsH' :
             'k-h-s-h-k-h-s-h-').join('');

export const SONG_BATTLE = compileSong({
  name: 'Lửa Trong Đá', bpm: 132, steps: 256,
  tracks: [
    { chan: 'p50', vol: 0.30, legato: 0.92, pattern: BATTLE_LEAD, opts: { vib: 0.004, rel: 0.05 } },
    { chan: 'p25', vol: 0.13, legato: 0.70, pattern: CHORDS.map(c => arp(...ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.34, legato: 0.86, pattern: CHORDS.map(c => bass(...BASS[c])).join(' ') },
    { chan: 'drum', vol: 0.55, pattern: BATTLE_DRUMS },
  ],
});

// ── 2. NHẠC MÀN MỞ ĐẦU — "Lời Nguyện Cổ" · Rê thứ · 88 BPM · 8 ô nhịp ───────
export const SONG_TITLE = compileSong({
  name: 'Lời Nguyện Cổ', bpm: 88, steps: 128,
  tracks: [
    { chan: 'p50', vol: 0.30, legato: 0.96, opts: { vib: 0.007, vibRate: 5.0, rel: 0.14, atk: 0.02 },
      pattern: bar([
        'D5/4 F5/4 A5/6 G5/2',
        'Bb4/4 D5/4 F5/8',
        'C5/4 F5/4 A5/6 G5/2',
        'E5/4 G5/4 C6/8',
        'A5/4 D6/4 C6/4 A5/4',
        'Bb5/4 G5/4 D5/8',
        'A5/4 C#6/4 E6/8',
        'D6/8 A5/4 D5/4',
      ]) },
    { chan: 'p25', vol: 0.14, legato: 0.94, opts: { atk: 0.03, rel: 0.16 },
      pattern: bar([
        'A4/4 D5/4 F5/6 E5/2',
        'F4/4 Bb4/4 D5/8',
        'A4/4 C5/4 F5/6 E5/2',
        'C5/4 E5/4 G5/8',
        'F5/4 A5/4 A5/4 F5/4',
        'G5/4 D5/4 Bb4/8',
        'E5/4 A5/4 C#6/8',
        'A5/8 F5/4 A4/4',
      ]) },
    { chan: 'tri', vol: 0.32, legato: 0.98,
      pattern: bar([
        'D3/8 A2/8', 'Bb2/8 F2/8', 'F2/8 C3/8', 'C3/8 G2/8',
        'D3/8 A2/8', 'G2/8 D3/8', 'A2/8 E3/8', 'D3/16',
      ]) },
    { chan: 'drum', vol: 0.42,
      pattern: rep('k-------s-------', 6) + 'k---k---s---s---' + 'k-------s-h-s-H-' },
  ],
});

// ── 3. NHẠC TỔ RỒNG & BẢN ĐỒ — "Tổ Ấm" · Đô trưởng · 104 BPM · 8 ô nhịp ────
const NEST_ARP = [
  ['C4','E4','G4','C5','G4','E4','C4','E4'],
  ['A3','C4','E4','A4','E4','C4','A3','C4'],
  ['F3','A3','C4','F4','C4','A3','F3','A3'],
  ['G3','B3','D4','G4','D4','B3','G3','B3'],
  ['C4','E4','G4','C5','G4','E4','C4','E4'],
  ['E3','G3','B3','E4','B3','G3','E3','G3'],
  ['F3','A3','C4','F4','C4','A3','F3','A3'],
  ['G3','B3','D4','G4','D4','B3','G3','D4'],
];
export const SONG_NEST = compileSong({
  name: 'Tổ Ấm', bpm: 104, steps: 128,
  tracks: [
    { chan: 'p12', vol: 0.22, legato: 0.92, opts: { vib: 0.005, rel: 0.12, atk: 0.02 },
      pattern: bar([
        'G4/4 C5/4 E5/4 G5/4',
        'E5/4 A4/4 C5/6 -/2',
        'F4/4 A4/4 C5/4 A4/4',
        'G4/4 B4/4 D5/8',
        'C5/4 E5/4 G5/6 E5/2',
        'E5/4 G5/4 B5/8',
        'A5/4 F5/4 C5/4 F5/4',
        'D5/4 G5/4 B4/8',
      ]) },
    { chan: 'p25', vol: 0.11, legato: 0.72, pattern: NEST_ARP.map(a => bass(...a)).join(' ') },
    { chan: 'tri', vol: 0.28, legato: 0.96,
      pattern: bar(['C3/8 C3/8','A2/8 A2/8','F2/8 F2/8','G2/8 G2/8',
                    'C3/8 C3/8','E2/8 E2/8','F2/8 F2/8','G2/8 G2/8']) },
    { chan: 'drum', vol: 0.30, pattern: rep('----h-------h---', 8) },
  ],
});


// ── 4. NHẠC MÀN CHƠI VUI — "Rong Chơi" · Đô trưởng · 140 BPM · 8 ô nhịp ────
// Sáng, nảy, vòng hoà thanh C–G–Am–F: nhịp nhanh hơn bản cũ 8 BPM và chuyển
// hẳn sang giọng trưởng nên nghe hào hứng chứ không nặng nề.
const RC_CH = ['C', 'G', 'Am', 'F', 'C', 'G', 'Am', 'F'];
const RC_ARP = {
  C:  ['C5', 'E5', 'G5', 'E5'], G: ['B4', 'D5', 'G5', 'D5'],
  Am: ['A4', 'C5', 'E5', 'C5'], F: ['F4', 'A4', 'C5', 'A4'],
};
const RC_BASS = {
  C:  ['C3', 'C3', 'G3', 'C3', 'E3', 'C3', 'G3', 'B2'],
  G:  ['G2', 'G2', 'D3', 'G2', 'B2', 'G2', 'D3', 'F#2'],
  Am: ['A2', 'A2', 'E3', 'A2', 'C3', 'A2', 'E3', 'G2'],
  F:  ['F2', 'F2', 'C3', 'F2', 'A2', 'F2', 'C3', 'E2'],
};
export const SONG_ROMP = compileSong({
  name: 'Rong Chơi', bpm: 140, steps: 128,
  tracks: [
    { chan: 'p50', vol: 0.30, legato: 0.90, opts: { vib: 0.004, rel: 0.05 },
      pattern: bar([
        'E5/2 G5/2 C6/2 G5/2 E5/2 G5/2 A5/4',
        'D5/2 G5/2 B5/2 D6/2 B5/4 G5/4',
        'A5/2 C6/2 E6/2 C6/2 A5/2 G5/2 E5/4',
        'F5/2 A5/2 C6/4 A5/2 F5/2 G5/4',
        'G5/1 A5/1 G5/2 E5/2 C6/2 B5/2 G5/2 E5/4',
        'B5/2 D6/2 G6/4 D6/2 B5/2 G5/4',
        'A5/2 E6/2 D6/2 C6/2 B5/4 A5/4',
        'F5/2 G5/2 A5/2 B5/2 C6/4 D6/4',
      ]) },
    { chan: 'p25', vol: 0.13, legato: 0.66, pattern: RC_CH.map(c => arp(...RC_ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.33, legato: 0.82, pattern: RC_CH.map(c => bass(...RC_BASS[c])).join(' ') },
    { chan: 'drum', vol: 0.55,
      pattern: rep('k--hs--hk-khs--h', 7) + 'k--hs-hkk-khsHsH' },
  ],
});


// ── 5. BUỒN — "Bờ Cỏ Khô" · La thứ · 68 BPM · thưa thớt, gần như không trống ─
export const SONG_SAD = compileSong({
  name: 'Bờ Cỏ Khô', bpm: 68, steps: 128,
  tracks: [
    { chan: 'p12', vol: 0.26, legato: 0.97, opts: { vib: 0.006, vibRate: 4.2, atk: 0.05, rel: 0.22 },
      pattern: bar([
        'A4/6 C5/4 B4/6', 'G4/4 A4/4 E4/8', 'F4/6 A4/4 G4/6', 'E4/8 -/8',
        'A4/4 E5/4 D5/4 C5/4', 'D5/6 F5/4 E5/6', 'B4/4 E5/4 G#4/8', 'A4/16',
      ]) },
    { chan: 'p25', vol: 0.09, legato: 0.96, opts: { atk: 0.06, rel: 0.24 },
      pattern: bar([
        'E4/6 A4/4 G4/6', 'D4/4 E4/4 B3/8', 'C4/6 F4/4 E4/6', 'B3/8 -/8',
        'C5/4 A4/4 F4/4 E4/4', 'A4/6 D5/4 C5/6', 'E4/4 B4/4 E4/8', 'E4/16',
      ]) },
    { chan: 'tri', vol: 0.24, legato: 0.99,
      pattern: bar(['A2/16', 'G2/16', 'F2/16', 'E2/16', 'A2/16', 'D3/16', 'E2/16', 'A2/16']) },
    { chan: 'drum', vol: 0.22, pattern: rep('----------------', 7) + '--------k---s---' },
  ],
});

// ── 6. CAO TRÀO — "Đầm Bọ Ngựa" · Rê thứ · 152 BPM · dồn dập ───────────────
const CX_CH  = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Gm', 'A', 'A'];
const CX_ARP = {
  Dm: ['D4', 'F4', 'A4', 'D5'], Bb: ['Bb3', 'D4', 'F4', 'Bb4'],
  C:  ['C4', 'E4', 'G4', 'C5'], Gm: ['G3', 'Bb3', 'D4', 'G4'], A: ['A3', 'C#4', 'E4', 'A4'],
};
const CX_BASS = {
  Dm: ['D2', 'D2', 'A2', 'D2', 'F2', 'D2', 'A2', 'C3'],
  Bb: ['Bb2', 'Bb2', 'F3', 'Bb2', 'D3', 'Bb2', 'F3', 'A2'],
  C:  ['C3', 'C3', 'G3', 'C3', 'E3', 'C3', 'G3', 'B2'],
  Gm: ['G2', 'G2', 'D3', 'G2', 'Bb2', 'G2', 'D3', 'F2'],
  A:  ['A2', 'A2', 'E3', 'A2', 'C#3', 'A2', 'E3', 'G2'],
};
export const SONG_CLIMAX = compileSong({
  name: 'Đầm Bọ Ngựa', bpm: 152, steps: 128,
  tracks: [
    { chan: 'p50', vol: 0.31, legato: 0.88, opts: { vib: 0.005, rel: 0.04 },
      pattern: bar([
        'D5/2 D5/2 F5/2 D5/2 A5/2 F5/2 D5/4',
        'D5/1 E5/1 F5/2 A5/2 G5/2 F5/2 E5/2 D5/4',
        'Bb4/2 D5/2 F5/2 Bb5/2 A5/4 F5/4',
        'C5/2 E5/2 G5/2 C6/2 Bb5/4 G5/4',
        'D5/2 A5/2 D6/2 A5/2 F5/2 A5/2 D5/4',
        'G5/2 Bb5/2 D6/4 Bb5/2 G5/2 F5/4',
        'A5/2 C#6/2 E6/2 C#6/2 A5/4 E5/4',
        'A5/2 Bb5/2 A5/2 G5/2 F5/2 E5/2 A5/4',
      ]) },
    { chan: 'p25', vol: 0.14, legato: 0.62, pattern: CX_CH.map(c => arp(...CX_ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.36, legato: 0.80, pattern: CX_CH.map(c => bass(...CX_BASS[c])).join(' ') },
    { chan: 'drum', vol: 0.60, pattern: rep('k-khs-h-k-khs-hk', 7) + 'k-khs-hkkkhsHsHs' },
  ],
});

// ── 7. GẤP RÚT — "Lửa Đồng" · La thứ · 168 BPM · vòng 4 ô nhịp cho nghẹt thở ─
const CH_CH  = ['Am', 'Am', 'F', 'E'];
const CH_ARP = { Am: ['A4', 'C5', 'E5', 'A5'], F: ['F4', 'A4', 'C5', 'F5'], E: ['E4', 'G#4', 'B4', 'E5'] };
const CH_BASS = {
  Am: ['A2', 'A2', 'A2', 'E3', 'A2', 'A2', 'C3', 'E3'],
  F:  ['F2', 'F2', 'F2', 'C3', 'F2', 'F2', 'A2', 'C3'],
  E:  ['E2', 'E2', 'E2', 'B2', 'E2', 'E2', 'G#2', 'B2'],
};
export const SONG_CHASE = compileSong({
  name: 'Lửa Đồng', bpm: 168, steps: 64,
  tracks: [
    { chan: 'p50', vol: 0.30, legato: 0.86, opts: { rel: 0.03 },
      pattern: bar([
        'A5/1 B5/1 C6/1 B5/1 A5/1 G5/1 A5/2 E5/2 A5/2 C6/2 B5/2',
        'A5/1 G5/1 F5/1 E5/1 D5/2 E5/2 F5/2 E5/2 D5/2 C5/2',
        'F5/1 G5/1 A5/1 C6/1 A5/2 F5/2 G5/2 A5/2 C6/4',
        'E5/2 G#5/2 B5/2 E6/2 D6/2 B5/2 G#5/4',
      ]) },
    { chan: 'p25', vol: 0.15, legato: 0.58, pattern: CH_CH.map(c => arp(...CH_ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.37, legato: 0.72, pattern: CH_CH.map(c => bass(...CH_BASS[c])).join(' ') },
    { chan: 'drum', vol: 0.62, pattern: rep('kkhksshkkkhksshk', 4) },
  ],
});


// ── 8. "Nhảy Cỏ" · Sol trưởng · 148 BPM — nảy, tinh nghịch ─────────────────
const NC_CH = ['G', 'Em', 'C', 'D', 'G', 'Em', 'Am', 'D'];
const NC_ARP = {
  G: ['G4','B4','D5','B4'], Em: ['E4','G4','B4','G4'],
  C: ['C5','E5','G5','E5'], D: ['D5','F#5','A5','F#5'], Am: ['A4','C5','E5','C5'],
};
const NC_BASS = {
  G:  ['G2','G2','D3','G2','B2','G2','D3','F#2'],
  Em: ['E2','E2','B2','E2','G2','E2','B2','D3'],
  C:  ['C3','C3','G3','C3','E3','C3','G3','B2'],
  D:  ['D3','D3','A3','D3','F#3','D3','A3','C3'],
  Am: ['A2','A2','E3','A2','C3','A2','E3','G2'],
};
export const SONG_HOP = compileSong({
  name: 'Nhảy Cỏ', bpm: 148, steps: 128,
  tracks: [
    { chan: 'p50', vol: 0.29, legato: 0.84, opts: { rel: 0.04 },
      pattern: bar([
        'G5/2 B5/2 D6/2 B5/2 G5/2 A5/2 B5/4',
        'E5/2 G5/2 B5/2 G5/2 E5/4 D5/4',
        'C5/2 E5/2 G5/2 C6/2 B5/4 G5/4',
        'D5/2 F#5/2 A5/2 D6/2 A5/4 F#5/4',
        'G5/1 A5/1 B5/2 D6/2 B5/2 G5/2 A5/2 B5/4',
        'E5/2 B5/2 G5/2 E5/2 D5/4 B4/4',
        'A5/2 C6/2 E6/2 C6/2 A5/4 E5/4',
        'D5/2 A5/2 F#5/2 D5/2 G5/4 B5/4',
      ]) },
    { chan: 'p25', vol: 0.13, legato: 0.62, pattern: NC_CH.map(c => arp(...NC_ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.33, legato: 0.78, pattern: NC_CH.map(c => bass(...NC_BASS[c])).join(' ') },
    { chan: 'drum', vol: 0.56, pattern: rep('k-h-s-hkk-h-s-hh', 7) + 'k-h-s-hkk-hksHsHs' .slice(0,16) },
  ],
});

// ── 9. "Chợ Sương" · Fa trưởng · 126 BPM — tung tăng, hơi ngộ nghĩnh ───────
const CS_CH = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C'];
const CS_ARP = {
  F: ['F4','A4','C5','A4'], Dm: ['D4','F4','A4','F4'], Bb: ['Bb3','D4','F4','D4'],
  C: ['C4','E4','G4','E4'], Am: ['A3','C4','E4','C4'],
};
const CS_BASS = {
  F:  ['F2','F2','C3','F2','A2','F2','C3','E2'],
  Dm: ['D3','D3','A3','D3','F3','D3','A3','C3'],
  Bb: ['Bb2','Bb2','F3','Bb2','D3','Bb2','F3','A2'],
  C:  ['C3','C3','G3','C3','E3','C3','G3','B2'],
  Am: ['A2','A2','E3','A2','C3','A2','E3','G2'],
};
export const SONG_MARKET = compileSong({
  name: 'Chợ Sương', bpm: 126, steps: 128,
  tracks: [
    { chan: 'p12', vol: 0.27, legato: 0.88, opts: { vib: 0.004, rel: 0.06 },
      pattern: bar([
        'F5/2 A5/2 C6/2 A5/2 G5/2 F5/2 A5/4',
        'D5/2 F5/2 A5/2 F5/2 E5/4 D5/4',
        'Bb4/2 D5/2 F5/2 Bb5/2 A5/4 F5/4',
        'C5/2 E5/2 G5/2 C6/2 G5/4 E5/4',
        'F5/1 G5/1 A5/2 C6/2 A5/2 F5/2 G5/2 A5/4',
        'A5/2 C6/2 E6/2 C6/2 B5/4 A5/4',
        'Bb5/2 A5/2 G5/2 F5/2 D5/4 F5/4',
        'C6/2 G5/2 E5/2 C5/2 F5/4 A5/4',
      ]) },
    { chan: 'p25', vol: 0.12, legato: 0.66, pattern: CS_CH.map(c => arp(...CS_ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.31, legato: 0.82, pattern: CS_CH.map(c => bass(...CS_BASS[c])).join(' ') },
    { chan: 'drum', vol: 0.48, pattern: rep('k--hs-h-k-h-s-h-', 8) },
  ],
});


// ── 10. "Lên Đường" · Rê trưởng · 116 BPM — hành khúc phiêu lưu cho bản đồ ─
const LD_CH  = ['D', 'G', 'A', 'D', 'Bm', 'G', 'A', 'D'];
const LD_ARP = {
  D:  ['D4', 'F#4', 'A4', 'F#4'], G: ['G4', 'B4', 'D5', 'B4'],
  A:  ['A4', 'C#5', 'E5', 'C#5'], Bm: ['B3', 'D4', 'F#4', 'D4'],
};
const LD_BASS = {
  D:  ['D3', 'D3', 'A3', 'D3', 'F#3', 'D3', 'A3', 'C#3'],
  G:  ['G2', 'G2', 'D3', 'G2', 'B2', 'G2', 'D3', 'F#2'],
  A:  ['A2', 'A2', 'E3', 'A2', 'C#3', 'A2', 'E3', 'G2'],
  Bm: ['B2', 'B2', 'F#3', 'B2', 'D3', 'B2', 'F#3', 'A2'],
};
export const SONG_TRAIL = compileSong({
  name: 'Lên Đường', bpm: 116, steps: 128,
  tracks: [
    // giai điệu chấm giật kiểu hành khúc: nốt dài rồi hai nốt ngắn
    { chan: 'p50', vol: 0.29, legato: 0.90, opts: { vib: 0.004, rel: 0.06 },
      pattern: bar([
        'D5/3 E5/1 F#5/4 A5/3 G5/1 F#5/4',
        'G5/3 A5/1 B5/4 G5/3 F#5/1 E5/4',
        'A5/3 B5/1 C#6/4 A5/4 E5/4',
        'D5/3 F#5/1 A5/4 D6/6 A5/2',
        'B5/3 A5/1 F#5/4 D5/3 F#5/1 B5/4',
        'G5/3 B5/1 D6/4 B5/3 A5/1 G5/4',
        'A5/3 C#6/1 E6/4 C#6/4 A5/4',
        'D6/4 A5/4 F#5/4 D5/4',
      ]) },
    { chan: 'p25', vol: 0.12, legato: 0.68, pattern: LD_CH.map(c => arp(...LD_ARP[c])).join(' ') },
    { chan: 'tri', vol: 0.32, legato: 0.84, pattern: LD_CH.map(c => bass(...LD_BASS[c])).join(' ') },
    // trống hành quân: kick chắc nhịp, snare đảo phách
    { chan: 'drum', vol: 0.50, pattern: rep('k-h-s-h-k-hks-h-', 7) + 'k-h-s-h-k-khsHsH' },
  ],
});

export const SONGS = {
  title:  SONG_TITLE,     // mở đầu — trang nghiêm
  battle: SONG_ROMP,      // chơi thường — vui, nảy
  nest:   SONG_NEST,      // tổ dế — ấm áp
  trail:  SONG_TRAIL,     // bản đồ — hành khúc phiêu lưu
  epic:   SONG_BATTLE,    // màn nặng — hùng tráng
  sad:    SONG_SAD,       // mất mát — chậm, thưa
  climax: SONG_CLIMAX,    // cao trào — dồn dập
  chase:  SONG_CHASE,     // gấp rút — nghẹt thở
  hop:    SONG_HOP,       // chơi thường — nảy, tinh nghịch
  market: SONG_MARKET,    // chơi thường — tung tăng, ngộ nghĩnh
};

/**
 * Nhạc nền cho MÀN CHƠI: mỗi màn một bài khác nhau, xoay vòng theo số màn để
 * hai màn liền nhau không bao giờ trùng nhạc.
 */
const LEVEL_TRACKS = ['battle', 'hop', 'market', 'epic'];
export const trackForLevel = (levelIndex, mode) =>
  mode === 'shoot' ? LEVEL_TRACKS[(levelIndex * 2 + 1) % LEVEL_TRACKS.length]
                   : LEVEL_TRACKS[levelIndex % LEVEL_TRACKS.length];
