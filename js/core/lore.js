// ── Thay tên nhân vật vào lời kể ────────────────────────────────────────────
//
// Mọi câu trong story.js / beats.js viết bằng THẺ VAI: {hero} {singer}
// {bruiser} {outsider} (và {praise} {praiseShort} cho lời khen lúc mới nở).
// Module này giữ dàn vai đang dùng và đổi thẻ thành tên thật theo ngôn ngữ.
//
// Vì sao không nhét thẳng tên vào dữ liệu: người chơi đổi giống là mọi câu kể
// phải đổi theo, kể cả câu đã viết từ hồi I. Một chỗ thay tên thì không bao giờ
// còn cảnh trứng tím mà lời kể gọi Rơm.
import { CHARS, EXTRAS, HERO_VOICE, castFor } from '../data/cast.js';
import { getLang } from './i18n.js';

let heroId = 'ember';
let CAST = castFor(heroId);

/** Đặt giống người chơi đang nuôi. Gọi khi nạp save và khi ấp trứng xong. */
export function setHero(id) {
  heroId = CHARS[id] ? id : 'ember';
  CAST = castFor(heroId);
}
export const heroBreed = () => heroId;
/** Dàn vai hiện tại — { hero, singer, bruiser, outsider } → id giống. */
export const cast = () => CAST;

const nameOf = (breedId) => {
  const c = CHARS[breedId] || CHARS.ember;
  return getLang() === 'en' ? c.name_en : c.name;
};
/** Tên nhân vật đang đóng vai này. */
export const roleName = (role) => nameOf(CAST[role] || CAST.hero);

/** Đổi mọi thẻ vai trong một câu thành tên thật. Câu không có thẻ trả về nguyên. */
export function fill(s) {
  if (typeof s !== 'string' || s.indexOf('{') < 0) return s;
  const en = getLang() === 'en';
  const voice = HERO_VOICE[heroId] || HERO_VOICE.ember;
  return s.replace(/\{(\w+)\}/g, (whole, key) => {
    if (CAST[key]) return nameOf(CAST[key]);
    if (EXTRAS[key]) return en ? EXTRAS[key].name_en : EXTRAS[key].name;   // Bà Cỏ, Cỏ May…
    if (key === 'praise') return en ? voice.praise_en : voice.praise;
    if (key === 'praiseShort') return en ? voice.short_en : voice.short;
    if (key === 'heroTrait') return en ? voice.trait_en : voice.trait;
    return whole;                                // thẻ lạ thì để nguyên, dễ thấy mà sửa
  });
}

/** Người đang nói trong khung thoại → { name, name_en, col, ink }. */
export function speaker(who) {
  if (EXTRAS[who]) return EXTRAS[who];
  const breed = CAST[who] || (CHARS[who] ? who : CAST.hero);
  return CHARS[breed] || CHARS.ember;
}
