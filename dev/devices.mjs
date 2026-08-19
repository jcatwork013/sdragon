// Dựng game ở nhiều cỡ màn hình để soi bố cục.  node dev/devices.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
for (const [f, fam] of [['baloo2.ttf','Baloo 2'],['bvp600.ttf','Be Vietnam Pro'],['bungee.ttf','Bungee']]) {
  try { GlobalFonts.registerFromPath(path.join(dir, '..', 'fonts', f), fam); } catch {}
}
const DEVICES = [
  ['iPad',      2048, 1536],
  ['iPhone',    1334,  750],
  ['Galaxy20-9',2340, 1080],
];
const store = new Map();
globalThis.localStorage = { getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)), removeItem:k=>store.delete(k) };
Object.defineProperty(globalThis,'navigator',{value:{language:'vi-VN'},configurable:true});
globalThis.performance = { now: () => Date.now() };
globalThis.requestAnimationFrame = () => 0;

const out = path.join(dir, 'shots');
fs.mkdirSync(out, { recursive: true });

for (const [name, dw, dh] of DEVICES) {
  const real = createCanvas(1700, 720), rctx = real.getContext('2d');
  const el = { width:1700, height:720, style:{}, classList:{add(){},remove(){},contains:()=>false},
    getContext: () => rctx, addEventListener(){}, setPointerCapture(){},
    getBoundingClientRect: () => ({left:0,top:0,width:1700,height:720}) };
  globalThis.document = { getElementById:id=>id==='game'?el:{classList:{add(){},remove(){}}},
    createElement:t=>t==='canvas'?createCanvas(1,1):{}, fonts:{ready:Promise.resolve()}, addEventListener(){} };
  globalThis.window = { addEventListener(){}, innerWidth:dw, innerHeight:dh, devicePixelRatio:1, AudioContext:undefined };
  const mod = await import(new URL('../js/main.js', import.meta.url).href + '?d=' + name);
  await new Promise(r => setTimeout(r, 120));
  const G = globalThis.window.SDRAKON;
  G.save.breed='ember'; G.save.xp=3250; G.save.unlocked=20;
  G.hero.xp=3250;
  G.save.mats={vo:9,to:10,nhua:7,da:12,sung:9,canh:5}; G.save.crafted={helm1:1,wep1:1,arm2:1}; G.save.equip={helm:'helm1',armor:'arm2',weapon:'wep1'};
  G.go('nest'); G.scene.tab='craft'; G.scene.build(G);
  for (let i=0;i<70;i++){ G.scene.update(G,1/60); G.fx.update(1/60); }
  const c = createCanvas(G.W, G.H), x = c.getContext('2d');
  // vẽ lại vào canvas đúng cỡ
  const el2 = { getContext: () => x };
  x.fillStyle='#0b0716'; x.fillRect(0,0,G.W,G.H);
  G.scene.draw(G, x);
  fs.writeFileSync(path.join(out, `dev_${name}.png`), c.toBuffer('image/png'));
  console.log(`✓ ${name.padEnd(11)} ${dw}×${dh} → khung ${G.W}×${G.H} → dev/shots/dev_${name}.png`);
}
