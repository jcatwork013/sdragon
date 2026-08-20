import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import fs from 'node:fs';
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1,1) : {} };
const R = new URL('../js/', import.meta.url).href;
const { buildGemSprites, drawGem, GEMS, SP, TOKEN } = await import(R + 'game/gems.js');
const W = await import(R + 'ui/widgets.js');
buildGemSprites();
const c = createCanvas(1000, 470), x = c.getContext('2d');
const bg = x.createLinearGradient(0,0,0,470); bg.addColorStop(0,'#17102c'); bg.addColorStop(1,'#0b0716');
x.fillStyle = bg; x.fillRect(0,0,1000,470);
for (let i=0;i<10;i++) for(let j=0;j<4;j++){ x.fillStyle=(i+j)%2?'rgba(255,255,255,.045)':'rgba(0,0,0,.16)'; x.fillRect(40+i*92,30+j*92,92,92); }
const t = 1.15;
[SP.LINE_H, SP.LINE_V, SP.CROSS, SP.BOMB].forEach((sp,i)=>
  drawGem(x, i, 86+i*92, 76, 84, { t, seed:i, special: sp, glow: .6 }));
GEMS.forEach((g,i)=> drawGem(x, i, 86+i*92, 168, 84, { t, seed: i+2 }));
[TOKEN.CLOCK, TOKEN.COIN, TOKEN.STAR].forEach((tk,i)=>
  drawGem(x, i+1, 86+i*92, 260, 84, { t, seed:i, token: tk }));
[SP.BOMB, SP.CROSS].forEach((sp,i)=> drawGem(x, 4+i, 86+(i+3)*92, 260, 84, { t, seed:i, special: sp, glow:.7 }));
// icon kỹ năng
const btn = (cx,cy,fn)=>{ x.save(); x.beginPath(); x.arc(cx,cy,34,0,Math.PI*2);
  const g=x.createLinearGradient(0,cy-34,0,cy+34); g.addColorStop(0,'#e8f6ff'); g.addColorStop(1,'#6fbdf0');
  x.fillStyle=g; x.fill(); x.strokeStyle='#2f7fc4'; x.lineWidth=3.4; x.stroke();
  x.strokeStyle='rgba(255,214,110,.85)'; x.lineWidth=2; x.beginPath(); x.arc(cx,cy,31,0,Math.PI*2); x.stroke();
  x.save(); x.beginPath(); x.arc(cx,cy,34,0,Math.PI*2); x.clip();
  x.fillStyle='rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(cx-7,cy-18,18,7,0,0,Math.PI*2); x.fill(); x.restore();
  x.translate(cx,cy); fn(x,66); x.restore(); };
btn(120, 400, W.icon.flame); btn(230, 400, W.icon.hammer); btn(340, 400, W.icon.restart);
btn(450, 400, W.icon.clock); btn(560, 400, W.icon.star);   btn(670, 400, W.icon.crown);
btn(780, 400, W.icon.heart); btn(890, 400, W.icon.pouch);
fs.writeFileSync(new URL('shots/gems.png', import.meta.url).pathname, c.toBuffer('image/png'));
console.log('→ dev/shots/gems.png');
