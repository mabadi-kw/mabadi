const S = require('../../sync-core.js'); let ok = 0, fail = 0; const ck = (n, c) => { if (c) { ok++; console.log('✓', n); } else { fail++; console.log('✗', n); } };
(async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16)), key = await S.derive('رمز-تجربة-123', salt);
  const txt = await S.encrypt({ app: 'mabadi-data', v: 1, saved: 1, favorites: { items: { a: { id: 'a', updated: 5 } }, del: {} } }, key, salt);
  const env = S.parseEnvelope(txt); ck('الغلاف بصيغة «عمّالي» حرفيًا', env && env.app === 'amali-sync' && env.v === 1 && env.kdf.name === 'PBKDF2' && env.kdf.hash === 'SHA-256' && env.kdf.iter === 310000 && env.cipher === 'AES-GCM-256' && S.unb64(env.iv).length === 12);
  const d = await S.decrypt(env, await S.derive('رمز-تجربة-123', S.unb64(env.kdf.salt))); ck('فكّ التشفير بالرمز نفسه', d.favorites.items.a.updated === 5);
  let bad = false; try { await S.decrypt(env, await S.derive('رمز-خطأ', S.unb64(env.kdf.salt))); } catch (e) { bad = true; } ck('رمز خاطئ لا يفتح', bad);
  const L = { items: { a: { id: 'a', updated: 1 }, b: { id: 'b', updated: 1 } }, del: {} }, R = { items: { a: { id: 'a', updated: 9, t: 'new' }, c: { id: 'c', updated: 2 } }, del: { b: 5 } };
  const m = S.mergeById(L, R); ck('الدمج: الأحدث يعلو، والجديد يُضاف، والمحذوف بعلامة أحدث يُحذف', L.items.a.t === 'new' && L.items.c && !L.items.b && m.upd === 1 && m.add === 1 && m.del === 1);
  const L2 = { items: { b: { id: 'b', updated: 10 } }, del: {} }; S.mergeById(L2, { items: {}, del: { b: 5 } }); ck('تعديل بعد الحذف يبقى (العنصر أحدث من علامة الحذف)', !!L2.items.b);
  const L3 = { items: { x: { id: 'x', updated: 3 } }, del: {} }; S.tombstone(L3, 'x'); const R3 = { items: { x: { id: 'x', updated: 3 } }, del: {} }; S.mergeById(L3, R3); ck('المحذوف محليًا لا يعود من جهاز آخر', !L3.items.x);
  console.log(ok, '✓ /', fail, '✗'); process.exit(fail ? 1 : 0);
})();
