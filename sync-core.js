/*
 * sync-core.js — نواة المزامنة المشفّرة المستخرجة من «عمّالي» (V50–V115)، مستقلة عن أي تطبيق.
 * ملف واحد مشفّر في مجلد سحابي يختاره المستخدم (OneDrive / iCloud / Google Drive) — بلا خادم، بلا حساب، بلا اتصال.
 *
 * الغلاف (مطابق حرفيًا لـ«عمّالي» ليمكن دمج التطبيقين لاحقًا في ملف واحد):
 *   { app:'amali-sync', v:1, kdf:{ name:'PBKDF2', hash:'SHA-256', iter:310000, salt:<b64> }, cipher:'AES-GCM-256', iv:<b64 12 بايت>, ct:<b64> }
 * المحتوى بعد فكّ التشفير يحدده التطبيق، مثلًا: { app:'mabadi-data', v:1, saved:<ms>, ... }
 *
 * الاستعمال:
 *   const S = AmaliSync.create({
 *     inner: 'mabadi-data',                 // اسم المحتوى الداخلي
 *     fileName: 'mabadi-data.amali',        // اسم الملف في المجلد
 *     idbName: 'mabadi_sync',               // قاعدة IndexedDB لحفظ المفتاح والمجلد
 *     metaKey: 'mb_sync',                   // مفتاح localStorage لأوقات الجلب/الحفظ/الاستبدال
 *     getPayload: () => ({ favorites, folders, notes, del }),   // ما يُحفظ (بلا app/v/saved — تُضاف آليًا)
 *     merge: d => ({ add, upd, del }),      // دمج محتوى وارد في بيانات الجهاز (استعمل AmaliSync.mergeById)
 *     replace: d => {},                     // استبدال بيانات الجهاز كلها بالوارد (بتأكيد المستخدم)
 *     notify: (msg, kind) => {},            // عرض رسالة للمستخدم
 *     askPass: async (why) => '...',        // يطلب رمز المزامنة من المستخدم عند الحاجة (يعيد نصًا أو null)
 *     pickFileFallback: () => Promise<File|null>  // <input type=file> حين لا يتوفر File System Access (iOS)
 *   });
 *   await S.setPass('رمز من 6 أحرف فأكثر');  // أول مرة على كل جهاز
 *   await S.linkFolder();   // الحاسوب: ربط المجلد مرة واحدة
 *   await S.syncNow();      // جلب ودمج ثم حفظ
 *   await S.pull(); await S.push();          // الآيفون: «جلب من ملف» قبل العمل و«حفظ في ملف» بعده
 *   S.markChanged();        // استدعِها بعد كل تعديل محلي ليُعرف أن هناك ما لم يُحفظ (isDirty)
 */
(function (root) {
  'use strict';
  var ENVELOPE = 'amali-sync', ITER = 310000;

  // ---------- أدوات
  function b64(u8) { var s = ''; for (var i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function unb64(s) { return Uint8Array.from(atob(s), function (c) { return c.charCodeAt(0); }); }
  var isIOS = typeof navigator !== 'undefined' && (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  var isMob = typeof navigator !== 'undefined' && /Android|iP(hone|ad|od)/.test(navigator.userAgent) || isIOS;
  function canFS() { return typeof window !== 'undefined' && !!(window.showSaveFilePicker && window.showOpenFilePicker) && !isIOS; }
  function canDir() { return canFS() && !!window.showDirectoryPicker; }

  // ---------- التشفير (Web Crypto) — المفتاح غير قابل للاستخراج، يُحفظ كائنًا في IndexedDB
  async function derive(pass, salt, iter) {
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: salt, iterations: iter || ITER }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encrypt(obj, key, salt, iter) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    var ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
    return JSON.stringify({ app: ENVELOPE, v: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iter: iter || ITER, salt: b64(salt) }, cipher: 'AES-GCM-256', iv: b64(iv), ct: b64(ct) });
  }
  async function decrypt(env, key) {
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(env.iv) }, key, unb64(env.ct));
    return JSON.parse(new TextDecoder().decode(pt));
  }
  function parseEnvelope(txt) { try { var j = JSON.parse(txt); return j && j.app === ENVELOPE && j.kdf && j.ct && j.iv ? j : null; } catch (e) { return null; } }

  // ---------- دمج عام «الأحدث يعلو» مع علامات الحذف (tombstones)
  // local/remote: { items: { id: {..., updated:ms} }, del: { id: ms } } — يعدّل local في مكانه ويعيد الإحصاء
  function mergeById(local, remote) {
    local.items = local.items || {}; local.del = local.del || {};
    var ri = (remote && remote.items) || {}, rd = (remote && remote.del) || {}, add = 0, upd = 0, del = 0;
    Object.keys(rd).forEach(function (id) { if (!local.del[id] || rd[id] > local.del[id]) local.del[id] = rd[id]; });
    Object.keys(ri).forEach(function (id) { var c = ri[id]; if (!c) return; var cur = local.items[id];
      if (local.del[id] && local.del[id] >= (c.updated || 0)) return;   // وارد محذوف بعلامة أحدث: لا يُضاف
      if (!cur) { local.items[id] = c; add++; } else if ((c.updated || 0) > (cur.updated || 0)) { local.items[id] = c; upd++; } });
    Object.keys(local.items).forEach(function (id) { if (local.del[id] && local.del[id] >= (local.items[id].updated || 0)) { delete local.items[id]; del++; } });
    return { add: add, upd: upd, del: del };
  }
  // الحذف المحلي: لا تحذف العنصر فقط، بل سجّل وقت حذفه حتى لا يعود من جهاز آخر
  function tombstone(store, id) { store.del = store.del || {}; store.del[id] = Date.now(); if (store.items) delete store.items[id]; }

  function create(o) {
    var S = { key: null, salt: null, iter: ITER, handle: null, dir: null, pass: null, merged: false, dirMerged: [] };
    var note = o.notify || function () {}, NAME = o.fileName, INNER = o.inner;
    var metaKey = o.metaKey || (INNER + '_sync'), chgKey = metaKey + '_chg';

    // IndexedDB صغيرة لحفظ المفتاح والملح ومقبض المجلد بين الجلسات
    function idb() { return new Promise(function (res, rej) { var r = indexedDB.open(o.idbName || (INNER + '_sync'), 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; }); }
    async function kvGet(k) { try { var db = await idb(); return await new Promise(function (res) { var q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { res(q.result); }; q.onerror = function () { res(undefined); }; }); } catch (e) { return undefined; } }
    async function kvSet(k, v) { try { var db = await idb(); await new Promise(function (res) { var t = db.transaction('kv', 'readwrite'); if (v === undefined) t.objectStore('kv').delete(k); else t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; }); } catch (e) {} }
    function meta() { try { return JSON.parse(localStorage.getItem(metaKey) || '{}') || {}; } catch (e) { return {}; } }
    function mark(k) { var m = meta(); m[k] = Date.now(); try { localStorage.setItem(metaKey, JSON.stringify(m)); } catch (e) {} }

    async function restore() { S.key = await kvGet('key') || null; S.salt = await kvGet('salt') || null; S.dir = await kvGet('dir') || null; S.handle = await kvGet('handle') || null; return !!S.key; }
    async function setPass(pass) {
      if (!pass || pass.length < 6) throw new Error('رمز المزامنة 6 أحرف فأكثر');
      var salt = crypto.getRandomValues(new Uint8Array(16)); S.key = await derive(pass, salt, ITER); S.salt = salt; S.pass = pass;
      await kvSet('key', S.key); await kvSet('salt', salt); return true;
    }
    async function perm(h) { if (h && !h.queryPermission) return true; try { if ((await h.queryPermission({ mode: 'readwrite' })) === 'granted') return true; return (await h.requestPermission({ mode: 'readwrite' })) === 'granted'; } catch (e) { return false; } }

    // يفتح نصّ ملف: بمفتاح الجهاز إن طابق الملح، وإلا بالرمز (يُطلب من المستخدم عند الحاجة)
    async function open(txt, allowAsk) {
      var env = parseEnvelope(txt); if (!env) return { err: 'fmt' };
      var key = null, salt = unb64(env.kdf.salt);
      if (S.key && S.salt && b64(S.salt) === env.kdf.salt) key = S.key;
      else if (S.pass) { try { key = await derive(S.pass, salt, env.kdf.iter); } catch (e) {} }
      var d = null; if (key) { try { d = await decrypt(env, key); } catch (e) {} }
      if (!d && allowAsk && o.askPass) { var p = await o.askPass(key ? 'الرمز لا يفتح هذا الملف — اكتب رمزه' : 'اكتب رمز المزامنة لفتح الملف'); if (p) { try { key = await derive(p, salt, env.kdf.iter); d = await decrypt(env, key); S.pass = p; } catch (e) { d = null; } } }
      if (!d) return { err: 'key' };
      if (d.app && d.app !== INNER) return { err: 'app', d: d };
      if (key !== S.key) { S.key = key; S.salt = salt; S.iter = env.kdf.iter || ITER; await kvSet('key', key); await kvSet('salt', salt); }   // يتبنّى الجهاز مفتاح الملف
      return { d: d, iv: env.iv };
    }
    function ivOf(t) { var e = parseEnvelope(t); return e ? e.iv : ''; }

    // حارس الاستبدال: بعد «استبدال بيانات هذا الجهاز» لا تُدمج نسخ أقدم منه (كانت تعيد المحذوف)
    function tooOld(d) { var rp = meta().rep || 0; return rp && (d.saved || 0) < rp; }

    async function applyText(txt, handle) {
      var r = await open(txt, true);
      if (r.err === 'fmt') { note('الملف ليس ملف مزامنة', 'bad'); return false; }
      if (r.err === 'app') { note('هذا ملف مزامنة لتطبيق آخر', 'bad'); return false; }
      if (r.err) { note('تعذّر فتح الملف بهذا الرمز', 'bad'); return false; }
      if (handle) { S.handle = handle; await kvSet('handle', handle); }
      if (S.mode === 'replace') { S.mode = ''; o.replace(r.d); mark('pulled'); mark('rep'); S.merged = true; note('استُبدلت بيانات هذا الجهاز بالملف', 'ok'); return true; }
      if (tooOld(r.d)) { note('هذا الملف أقدم من آخر استبدال على هذا الجهاز — لم يُدمج. اختر الأحدث.', 'warn'); return false; }
      var m = o.merge(r.d); mark('pulled'); S.merged = true; var tot = (m.add || 0) + (m.upd || 0) + (m.del || 0);
      note(tot ? 'دُمج: ' + (m.add || 0) + ' جديدة، ' + (m.upd || 0) + ' محدَّثة' + (m.del ? '، ' + m.del + ' محذوفة' : '') : 'لا جديد في الملف', 'ok');
      return true;
    }

    // المجلد: قد تحوي خدمة التخزين نسخًا متعارضة («mabadi-data (1).amali») — تُدمج كلها من الأقدم للأحدث ثم تُحذف المكررة بعد الحفظ
    async function dirFiles(dir) { var L = []; for await (var ent of dir.entries()) { var name = ent[0], h = ent[1]; if (h.kind === 'file' && /\.amali$/i.test(name)) { try { L.push({ name: name, h: h, f: await h.getFile() }); } catch (e) {} } } return L; }
    async function pullDir(dir) {
      var L = await dirFiles(dir); if (!L.length) { note('لا ملف مزامنة في المجلد بعد — «حفظ» ينشئه', 'info'); return true; }
      var ok = [], old = [], bad = 0, add = 0, upd = 0, del = 0;
      for (var i = 0; i < L.length; i++) { var t = await L[i].f.text(), r = await open(t, ok.length === 0 && i === L.length - 1 && !bad); if (r.d && !r.err) (tooOld(r.d) ? old : ok).push({ x: L[i], d: r.d, iv: ivOf(t) }); else bad++; }
      if (!ok.length && !old.length) { note('لا ملف صالح في المجلد (تحقّق من الرمز)', 'bad'); return false; }
      ok.sort(function (a, b) { return (a.d.saved || 0) - (b.d.saved || 0); });
      ok.forEach(function (x) { var m = o.merge(x.d); add += m.add || 0; upd += m.upd || 0; del += m.del || 0; });
      S.dirMerged = ok.concat(old).map(function (x) { return { name: x.x.name, iv: x.iv }; });
      mark('pulled'); S.merged = true;
      note((ok.length > 1 ? 'دُمجت ' + ok.length + ' نسخ — ' : '') + (add + upd + del ? add + ' جديدة، ' + upd + ' محدَّثة' + (del ? '، ' + del + ' محذوفة' : '') : 'لا جديد') + (old.length ? ' · تُجوهلت ' + old.length + ' نسخة أقدم من الاستبدال' : '') + (bad ? ' · تُرك ' + bad + ' ملف لم يُفتح' : ''), 'ok');
      return true;
    }
    async function cleanDir(dir) {   // يحذف فقط النسخ التي دُمجت فعلًا (بمطابقة iv)، ولا يمسّ الملف الرئيسي
      var n = 0; for (var i = 0; i < S.dirMerged.length; i++) { var m = S.dirMerged[i]; if (m.name === NAME) continue;
        try { var h = await dir.getFileHandle(m.name), t = await (await h.getFile()).text(); if (m.iv && ivOf(t) === m.iv) { await dir.removeEntry(m.name); n++; } } catch (e) {} }
      S.dirMerged = []; return n;
    }
    async function dirOk() { var d = S.dir || await kvGet('dir'); if (!d) return null; if (!(await perm(d))) return null; S.dir = d; return d; }

    async function linkFolder() {
      if (!canDir()) { note('ربط المجلد غير متاح في هذا المتصفح — استعمل «جلب من ملف» و«حفظ في ملف»', 'info'); return false; }
      try { var d = await window.showDirectoryPicker({ id: INNER + '-sync', mode: 'readwrite' }); if (!(await perm(d))) { note('لم يُمنح الإذن بالمجلد', 'bad'); return false; } S.dir = d; await kvSet('dir', d); note('رُبط المجلد «' + d.name + '»', 'ok'); return true; } catch (e) { return false; }
    }

    async function pull() {
      if (canDir()) { var d = await dirOk(); if (d) { try { return await pullDir(d); } catch (e) { note('تعذّرت قراءة المجلد', 'bad'); return false; } } }
      if (canFS()) { var h = S.handle || await kvGet('handle');
        try { if (!h) h = (await window.showOpenFilePicker({ types: [{ description: 'بيانات مشفّرة', accept: { 'application/octet-stream': ['.amali'] } }] }))[0];
          if (await perm(h)) return await applyText(await (await h.getFile()).text(), h); } catch (e) { if (e && e.name === 'AbortError') return false; } }
      var f = o.pickFileFallback ? await o.pickFileFallback() : null;     // iOS: <input type=file accept=".amali">
      if (Array.isArray(f)) { var okAny = false; for (var fi = 0; fi < f.length; fi++) { if (await applyText(await f[fi].text())) okAny = true; } if (okAny && f.length > 1) note('دُمجت ' + f.length + ' ملفات — احفظ الآن ملفًا واحدًا', 'ok'); return okAny; }   // «مبادئ التمييز»: عدة ملفات معًا (نسخ iOS المرقّمة)
      return f ? await applyText(await f.text()) : false;
    }
    async function pickReplace() { S.mode = 'replace'; var ok = false; try { ok = await pull(); } finally { S.mode = ''; } return ok; }

    async function push() {
      if (!S.key) { note('اعتمد رمز المزامنة أولًا', 'warn'); return false; }
      var p = o.getPayload(); var body = Object.assign({ app: INNER, v: 1 }, p, { saved: Date.now() });
      var txt = await encrypt(body, S.key, S.salt, S.iter);
      if (canDir()) { var d = await dirOk(); if (d) { try { var h = await d.getFileHandle(NAME, { create: true }), w = await h.createWritable(); await w.write(txt); await w.close(); var n = await cleanDir(d); mark('pushed'); S.merged = false; note('حُفظ «' + NAME + '» في المجلد' + (n ? ' وحُذفت ' + n + ' نسخة مكررة بعد دمجها' : ''), 'ok'); return true; } catch (e) { note('تعذّر الحفظ في المجلد', 'bad'); return false; } } }
      if (canFS()) { try { var hh = S.handle || await kvGet('handle'); if (!hh || !(await perm(hh))) hh = await window.showSaveFilePicker({ suggestedName: NAME, types: [{ description: 'بيانات مشفّرة', accept: { 'application/octet-stream': ['.amali'] } }] });
          var ww = await hh.createWritable(); await ww.write(txt); await ww.close(); S.handle = hh; await kvSet('handle', hh); mark('pushed'); S.merged = false; note('حُفظت النسخة المشفّرة في «' + hh.name + '»', 'ok'); return true; } catch (e) { if (e && e.name === 'AbortError') return false; } }
      var file = new File([txt], NAME, { type: 'application/octet-stream' });
      if (isMob && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); mark('pushed'); S.merged = false; note(isIOS ? 'اختر «حفظ في الملفات» ثم مجلد المزامنة في خدمة التخزين، واستبدل القديم' : 'اختر خدمة التخزين واحفظ في مجلد المزامنة', 'info'); return true; } catch (e) { if (e && e.name === 'AbortError') return false; } }
      var u = URL.createObjectURL(file), a = document.createElement('a'); a.href = u; a.download = NAME; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
      mark('pushed'); S.merged = false; note('نُزّل الملف — انقله إلى مجلد المزامنة واستبدل القديم', 'info'); return true;
    }
    async function syncNow() { var ok = await pull(); if (ok) return await push(); return false; }

    function markChanged() { try { localStorage.setItem(chgKey, String(Date.now())); } catch (e) {} }
    function isDirty() { var c = 0; try { c = +localStorage.getItem(chgKey) || 0; } catch (e) {} return !!S.key && c > (meta().pushed || 0); }
    function lastBackup() { var m = meta(); return Math.max(m.pushed || 0, m.exported || 0); }

    return { state: S, restore: restore, setPass: setPass, linkFolder: linkFolder, pull: pull, push: push, syncNow: syncNow, pickReplace: pickReplace,
      markChanged: markChanged, isDirty: isDirty, lastBackup: lastBackup, meta: meta, canLinkFolder: canDir, open: open };
  }

  var API = { create: create, mergeById: mergeById, tombstone: tombstone, encrypt: encrypt, decrypt: decrypt, derive: derive, parseEnvelope: parseEnvelope, b64: b64, unb64: unb64, ENVELOPE: ENVELOPE, ITER: ITER };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AmaliSync = API;
})(typeof window !== 'undefined' ? window : globalThis);
