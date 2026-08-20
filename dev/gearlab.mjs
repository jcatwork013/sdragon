// Soi nhân vật với đồ cửa hàng theo từng bậc.  node dev/gearlab.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
for (const [f, fam] of [['baloo2.ttf','Baloo 2'],['bvp600.ttf','Be Vietnam Pro']])
  try { GlobalFonts.registerFromPath(path.join(dir,'..','fonts',f), fam); } catch {}
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1,1) : {} };
const R = new URL('../js/', import.meta.url).href;
const { Cricket } = await import(R + 'game/cricket.js');
const { BREEDS } = await import(R + 'data/characters.js');
const SETS = [
  ['Trần trụi', {}],
  ['Bậc 1 · rẻ',   { helm:'sh_helm1', scarf:'sh_scf1', armor:'sh_arm1', weapon:'sh_wep1' }],
  ['Bậc 2',        { helm:'sh_helm2', scarf:'sh_scf2', armor:'sh_arm2', weapon:'sh_wep2' }],
  ['Bậc 3',        { helm:'sh_helm3', scarf:'sh_scf3', armor:'sh_arm3', weapon:'sh_wep3' }],
  ['Bậc 4 · aura', { helm:'sh_helm4', scarf:'sh_scf4', armor:'sh_arm4', weapon:'sh_wep4' }],
  ['Đồ mùa',       { helm:'ev_lan',   scarf:'ev_sao',  armor:'sh_arm4', weapon:'sh_wep4' }],
];
const W = 300 * SETS.length, H = 380;
const c = createCanvas(W, H), x = c.getContext('2d');
const g = x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#2a2046'); g.addColorStop(1,'#120c22');
x.fillStyle = g; x.fillRect(0,0,W,H);
SETS.forEach(([label, gear], i) => {
  const d = new Cricket(BREEDS[0], 9800);
  d.gear = gear;
  for (let k=0;k<50;k++) d.update(1/60);
  d.blink = 0; d.bounce = 0;
  d.draw(x, 150 + i*300, 250, 150, 1);
  x.font='bold 17px "Be Vietnam Pro",sans-serif'; x.fillStyle='#ffe066'; x.textAlign='center';
  x.fillText(label, 150 + i*300, 340);
});
fs.writeFileSync(path.join(dir,'shots','gearlab.png'), c.toBuffer('image/png'));
console.log('→ dev/shots/gearlab.png');
