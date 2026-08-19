// Sinh ảnh splash cho Android/iOS từ chính hàm vẽ của game.
import { createCanvas } from '@napi-rs/canvas';
import fs from 'node:fs'; import path from 'node:path';
globalThis.document = { createElement: t => t === 'canvas' ? createCanvas(1, 1) : {} };
const R = new URL('../js/', import.meta.url).href;
const { Cricket } = await import(R + 'game/cricket.js');
const { BREEDS } = await import(R + 'data/characters.js');
const { buildGemSprites, drawGem } = await import(R + 'game/gems.js');
buildGemSprites();
const S = 2732, c = createCanvas(S, S), x = c.getContext('2d');
const g = x.createLinearGradient(0, 0, S, S);
g.addColorStop(0, '#3a2a6b'); g.addColorStop(.5, '#1b1233'); g.addColorStop(1, '#0b0716');
x.fillStyle = g; x.fillRect(0, 0, S, S);
const glow = x.createRadialGradient(S/2, S*.46, 0, S/2, S*.46, S*.42);
glow.addColorStop(0, 'rgba(160,120,255,.40)'); glow.addColorStop(1, 'rgba(160,120,255,0)');
x.fillStyle = glow; x.fillRect(0, 0, S, S);
[[.20,.26,.10,0],[.82,.22,.085,3],[.84,.76,.08,4],[.16,.78,.075,5]].forEach(([fx,fy,fs,gi])=>{
  x.save(); x.globalAlpha=.5; drawGem(x, gi, S*fx, S*fy, S*fs, { t:.6, seed:gi }); x.restore(); });
const d = new Cricket(BREEDS[0], 9800);
for (let i = 0; i < 30; i++) d.update(1/60);
d.blink = 0; d.bounce = 0;
d.draw(x, S*.53, S*.50, S*.20, 1);
fs.writeFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'assets', 'splash.png'), c.toBuffer('image/png'));
console.log('✓ assets/splash.png');
