// Soi mọi bài nhạc: từng bè phải dài ĐÚNG bằng số bước của bài.
// Lệch một nốt là cả bè trôi khỏi nhịp — tai nghe ra "sai sai" mà mắt không thấy.
// Chạy: node dev/song-check.mjs
const { SONGS } = await import('../js/audio/songs.js');
let bad = 0;
for (const [key, song] of Object.entries(SONGS)) {
  const rows = song.tracks.map(tr => {
    const ok = tr.steps === song.steps;
    if (!ok) bad++;
    return `${ok ? '✓' : '✗'} ${String(tr.chan).padEnd(5)} ${String(tr.steps).padStart(4)}/${song.steps}`
         + (tr.steps % 16 ? '  (không tròn ô nhịp)' : '');
  });
  console.log(`\n${key.padEnd(7)} "${song.name}" · ${song.bpm} BPM · ${song.steps} bước (${song.steps / 16} ô nhịp)`);
  rows.forEach(r => console.log('   ' + r));
}
console.log(bad ? `\n❌ ${bad} bè lệch độ dài` : '\n✅ Mọi bè đều khớp số ô nhịp.');
process.exit(bad ? 1 : 0);
