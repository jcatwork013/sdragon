// Dựng game ở nhiều cỡ màn hình để soi bố cục.  node dev/devices.mjs
// Vẽ đúng như vòng lặp thật: canvas = KHUNG VẼ (CW×CH), scene dịch (OX,OY).
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
for (const [f, fam] of [['baloo2.ttf','Baloo 2'],['bvp600.ttf','Be Vietnam Pro'],['bungee.ttf','Bungee']]) {
  try { GlobalFonts.registerFromPath(path.join(dir, '..', 'fonts', f), fam); } catch {}
}
const DEVICES = [
  ['TitleWide',       2340, 1080, 'title'],
  ['TitleFoldCover',  2316,  904, 'title'],
  ['iPad',            2048, 1536, 'nest'],
  ['iPhone',          1334,  750, 'nest'],
  ['Galaxy20-9',      2340, 1080, 'play'],
  ['FoldCover',       2316,  904, 'play'],   // rộng quá trần → nền phủ hai bên
  ['FoldOpen',        2176, 1812, 'play'],   // gần vuông     → nền phủ trên–dưới
  ['FoldOpenPortrait',1812, 2176, 'play'],   // mở, cầm dọc
  ['UltraWide',       3840, 1080, 'play'],
];
const store = new Map();
globalThis.localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) };
Object.defineProperty(globalThis,'navigator',{value:{language:'vi-VN'},configurable:true});
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;

const out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });

for (const [name, dw, dh, scene] of DEVICES) {
  const real = createCanvas(4000, 2600), rctx = real.getContext('2d');
  const el = { width:4000, height:2600, style:{}, classList:{add(){},remove(){},contains:()=>false},
    getContext: () => rctx, addEventListener(){}, setPointerCapture(){},
    getBoundingClientRect: () => ({left:0,top:0,width:4000,height:2600}) };
  globalThis.document = { getElementById:id=>id==='game'?el:{classList:{add(){},remove(){}}},
    createElement:t=>t==='canvas'?createCanvas(1,1):{}, fonts:{ready:Promise.resolve()}, addEventListener(){} };
  globalThis.window = { addEventListener(){}, innerWidth:dw, innerHeight:dh, devicePixelRatio:1, AudioContext:undefined };
  const mod = await import(new URL('../js/main.js', import.meta.url).href + '?d=' + name);
  await new Promise(r => setTimeout(r, 120));
  const G = globalThis.window.CRICKO;
  G.save.breed='ember'; G.save.xp=3250; G.save.unlocked=20;
  G.hero.xp=3250;
  G.save.mats={vo:9,to:10,nhua:7,da:12,sung:9,canh:5}; G.save.crafted={helm1:1,wep1:1,arm2:1}; G.save.equip={helm:'helm1',armor:'arm2',weapon:'wep1'};
  if (scene === 'nest') { G.go('nest'); G.scene.tab='craft'; G.scene.build(G); }
  else if (scene === 'title') G.go('title');
  else G.startLevel(2, true);
  for (let i=0;i<70;i++){ G.scene.update(G,1/60); G.fx.update(1/60); }

  const c = createCanvas(G.CW, G.CH), x = c.getContext('2d');
  x.fillStyle='#0b0716'; x.fillRect(0,0,G.CW,G.CH);
  x.save(); x.translate(G.OX, G.OY);
  G.scene.draw(G, x);
  if (!['play', 'shoot', 'pair', 'duel'].includes(G.scene.name)) G.fx.draw(x);
  x.restore();
  // khung đỏ = mép DẢI GIAO DIỆN, để thấy rõ phần nền phủ thêm
  x.strokeStyle='rgba(255,60,60,.85)'; x.lineWidth=3;
  x.strokeRect(G.OX+1.5, G.OY+1.5, G.W-3, G.H-3);
  fs.writeFileSync(path.join(out, `dev_${name}.png`), c.toBuffer('image/png'));
  console.log(`✓ ${name.padEnd(17)} ${String(dw+'×'+dh).padEnd(10)} → dải ${G.W}×${G.H} · khung ${G.CW}×${G.CH} · lệch ${G.OX},${G.OY}`);
}
