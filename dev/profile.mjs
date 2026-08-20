// Đếm lệnh canvas mỗi khung hình để tìm chỗ tốn.  node dev/profile.mjs
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'node:path';
const dir = path.dirname(new URL(import.meta.url).pathname);
for (const [f, fam] of [['baloo2.ttf','Baloo 2'],['bvp600.ttf','Be Vietnam Pro'],['bungee.ttf','Bungee']])
  try { GlobalFonts.registerFromPath(path.join(dir,'..','fonts',f), fam); } catch {}
const W=1280,H=720, real=createCanvas(W,H), rctx=real.getContext('2d');
const el={width:W,height:H,style:{},classList:{add(){},remove(){},contains:()=>false},
  getContext:()=>rctx,addEventListener(){},setPointerCapture(){},
  getBoundingClientRect:()=>({left:0,top:0,width:W,height:H})};
const store=new Map();
globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
globalThis.document={getElementById:id=>id==='game'?el:{classList:{add(){},remove(){}}},
  createElement:t=>t==='canvas'?createCanvas(1,1):{},fonts:{ready:Promise.resolve()},addEventListener(){}};
globalThis.window={addEventListener(){},innerWidth:1400,innerHeight:800,devicePixelRatio:1,AudioContext:undefined};
Object.defineProperty(globalThis,'navigator',{value:{language:'vi-VN'},configurable:true});
globalThis.performance={now:()=>Number(process.hrtime.bigint()/1000n)/1000};
globalThis.requestAnimationFrame=()=>0;
await import(new URL('../js/main.js', import.meta.url).href);
await new Promise(r=>setTimeout(r,150));
const G=globalThis.window.SDRAKON;

const COUNT = {};
const WATCH = ['createLinearGradient','createRadialGradient','beginPath','fill','stroke',
               'save','restore','drawImage','fillText','strokeText','clip','arc','ellipse',
               'quadraticCurveTo','bezierCurveTo','lineTo','fillRect'];
const proxy = new Proxy(rctx, {
  get(t, k) {
    const v = t[k];
    if (typeof v === 'function' && WATCH.includes(k))
      return (...a) => { COUNT[k] = (COUNT[k]||0)+1; return v.apply(t, a); };
    return typeof v === 'function' ? v.bind(t) : v;
  },
  set(t, k, v) { t[k] = v; return true; },
});

function prof(label, setup) {
  setup();
  for (let i=0;i<20;i++){ G.scene.update(G,1/60); G.fx.update(1/60); G.scene.draw(G, rctx); }
  for (const k of Object.keys(COUNT)) delete COUNT[k];
  const N = 20;
  for (let i=0;i<N;i++){ G.scene.update(G,1/60); G.fx.update(1/60);
    rctx.setTransform(1,0,0,1,0,0); G.scene.draw(G, proxy); }
  const rows = Object.entries(COUNT).map(([k,v])=>[k, Math.round(v/N)])
    .filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const grad = (COUNT.createLinearGradient||0)+(COUNT.createRadialGradient||0);
  console.log(`\n── ${label} ──  (mỗi khung)`);
  console.log('   gradient/khung:', Math.round(grad/N));
  console.log('   ' + rows.slice(0,9).map(([k,v])=>`${k}=${v}`).join('  '));
}
prof('Bản đồ',   () => { G.save.breed='ember'; G.save.unlocked=9; G.go('map'); });
prof('Bắn Đá',   () => { G.save.unlocked=9; G.startLevel(3, true); });
prof('Màn chơi', () => G.startLevel(2, true));
prof('Màn mở đầu', () => G.go('title'));
