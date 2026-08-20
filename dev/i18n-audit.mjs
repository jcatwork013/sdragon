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

// ── Soát rộng: mọi bảng dữ liệu có trường song ngữ `x` / `x_en` ────────────
// Bản soát cũ chỉ nhìn i18n.js và vài bảng, nên chuỗi nằm trong data/*.js
// (tên đòn, thoại, đặc tính đối thủ, nguyên liệu…) lọt lưới hết.
{
  const M = await Promise.all([
    import(R + 'data/duel.js'), import(R + 'data/gear.js'),
    import(R + 'data/beats.js'), import(R + 'data/story.js'),
    import(R + 'game/enemy.js'), import(R + 'data/levels.js'),
    import(R + 'data/characters.js'), import(R + 'game/gems.js'),
  ]);
  const NAMES = ['data/duel', 'data/gear', 'data/beats', 'data/story',
                 'game/enemy', 'data/levels', 'data/characters', 'game/gems'];
  let miss = 0, seen = new Set();
  const walk = (o, path, depth = 0) => {
    if (!o || depth > 4 || typeof o !== 'object') return;
    if (seen.has(o)) return; seen.add(o);
    if (Array.isArray(o)) { o.forEach((v, i) => walk(v, `${path}[${i}]`, depth + 1)); return; }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && !k.endsWith('_en') && VI.test(v)) {
        // Hai quy ước song ngữ cùng tồn tại trong repo:
        //   {name, name_en}  và  {vi, en}. Chỉ soát quy ước thứ nhất thì mọi
        //   câu thoại kiểu thứ hai đều bị báo nhầm là thiếu bản dịch.
        const partner = k === 'vi' ? 'en' : k + '_en';
        if (!(partner in o)) { console.log(`  ✗ thiếu ${partner}  ·  ${path}.${k} = "${v.slice(0, 46)}"`); miss++; }
      } else if (v && typeof v === 'object') walk(v, `${path}.${k}`, depth + 1);
    }
  };
  console.log('\n════ SONG NGỮ TRONG data/*.js ════');
  M.forEach((m, i) => { for (const k of Object.keys(m)) walk(m[k], `${NAMES[i]}.${k}`); });
  if (!miss) console.log('  ✓ mọi chuỗi tiếng Việt đều có bản _en');
  else { console.log(`\n❌ ${miss} chuỗi thiếu bản tiếng Anh`); bad += miss; }
  process.exitCode = bad ? 1 : 0;
}

// ── Soát tại chỗ: gọi tx() thật ở chế độ EN, xem có rơi về tiếng Việt không ──
// Soát cấu trúc dữ liệu là chưa đủ — bản dịch có thể đủ mà hàm đọc lại lấy sai
// trường. Đây mới là thứ người chơi thực sự nhìn thấy.
{
  i18n.setLang('en');
  const M = await Promise.all([
    import(R + 'data/duel.js'), import(R + 'data/beats.js'),
    import(R + 'data/gear.js'), import(R + 'data/characters.js'),
    import(R + 'data/levels.js'), import(R + 'data/story.js'),
  ]);
  let leak = 0, seen2 = new Set();
  const probe = (o, path, depth = 0) => {
    if (!o || depth > 4 || typeof o !== 'object' || seen2.has(o)) return;
    seen2.add(o);
    if (Array.isArray(o)) { o.forEach((v, i) => probe(v, `${path}[${i}]`, depth + 1)); return; }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string' && !k.endsWith('_en') && k !== 'en' && VI.test(v)) {
        const got = i18n.tx(o, k);
        if (VI.test(got)) { console.log(`  ✗ tx(_, '${k}') ở EN vẫn ra "${got.slice(0, 40)}"  ·  ${path}`); leak++; }
      } else if (v && typeof v === 'object') probe(v, `${path}.${k}`, depth + 1);
    }
  };
  console.log('\n════ tx() Ở CHẾ ĐỘ EN ════');
  for (const m of M) for (const k of Object.keys(m)) probe(m[k], k);
  console.log(leak ? `\n❌ ${leak} chỗ tx() rơi về tiếng Việt` : '  ✓ tx() không rơi về tiếng Việt ở đâu');
  i18n.setLang('vi');
  process.exitCode = (bad + leak) ? 1 : 0;
}
