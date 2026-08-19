// Soát ngôn ngữ: bật EN rồi tìm mọi chuỗi còn dấu tiếng Việt (và ngược lại).
import fs from 'node:fs/promises';
const R = new URL('../js/', import.meta.url).href;
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
Object.defineProperty(globalThis, 'navigator', { value: { language: 'en-US' }, configurable: true });

const i18n = await import(R + 'core/i18n.js');
const { BREEDS, STAGES, TRAININGS } = await import(R + 'data/characters.js');
const { EPISODES } = await import(R + 'data/levels.js');
const { GEMS } = await import(R + 'game/gems.js');

const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
const src = await fs.readFile(new URL('core/i18n.js', R), 'utf8');
const uniq = [...new Set([...src.matchAll(/^\s{4}([a-zA-Z][\w]*)\s*:/gm)].map(m => m[1]))];

let bad = 0;
const check = (lang, label, pairs) => {
  for (const [k, v] of pairs) {
    if (typeof v !== 'string' || !v) continue;
    if (lang === 'en' && VI.test(v)) { console.log(`  ✗ [EN] ${label}.${k} = "${v}"`); bad++; }
    if (lang === 'vi' && !VI.test(v) && /^[A-Za-z][A-Za-z ,.!'-]{5,}$/.test(v)
        && !['EXP', 'Proto-Cricket Realm', 'U Minh', 'Tinh ranh'].includes(v)) {
      console.log(`  ⚠ [VI] ${label}.${k} = "${v}"  (chưa dịch?)`); bad++;
    }
  }
};

for (const lang of ['en', 'vi']) {
  i18n.setLang(lang);
  console.log(`════ ${lang.toUpperCase()} ════`);
  check(lang, 't', uniq.map(k => [k, i18n.t(k)]));
  BREEDS.forEach(b => check(lang, `breed.${b.id}`, ['name', 'epithet', 'trait', 'traitDesc'].map(f => [f, i18n.tx(b, f)])));
  STAGES.forEach(s => check(lang, `stage${s.id}`, [['name', i18n.tx(s, 'name')]]));
  TRAININGS.forEach(tr => check(lang, `train.${tr.id}`, ['name', 'desc'].map(f => [f, i18n.tx(tr, f)])));
  EPISODES.forEach(e => check(lang, `ep.${e.id}`, ['name', 'story'].map(f => [f, i18n.tx(e, f)])));
  check(lang, 'gem', GEMS.map(g => [g.id, i18n.tx(g, 'vi')]));
}
console.log(bad ? `\n❌ ${bad} chuỗi sai ngôn ngữ` : '\n✅ Không có chuỗi nào lẫn ngôn ngữ');
