#!/usr/bin/env python3
"""يحذف «نص القاعدة» (data/rx) لمبادئ بعينها حين يتضمن بيانًا شخصيًا، ويُبقي المبدأ نفسه (الموجز) إذا كان سليمًا.
  python3 tools/privacy/strip_rule.py <id> [<id> ...]
- يحذف النص من data/rx، ويزيل الحقل rx من عنصر المبدأ فلا يطلبه التطبيق.
- في حزم «مداولة» الحالية: يحذف rule_text ويعيد بناء search_text، ويحدّث البصمات في manifest.json.
- يسجل المعرّفات في data/withdrawn.json تحت rule_ids. لا يطبع النص."""
import os, sys, json, glob, re, hashlib, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
D = lambda *p: os.path.join(ROOT, 'data', *p); PK = os.path.join(ROOT, 'packs')
ids = set(sys.argv[1:])
if not ids: print(__doc__); sys.exit(1)
def compact(o): return json.dumps(o, ensure_ascii=False, separators=(',', ':'))
n_rx = 0
for fp in glob.glob(D('rx', '*.json')):
    d = json.load(open(fp, encoding='utf-8')); k = [i for i in d if i in ids]
    if k:
        for i in k: del d[i]
        n_rx += len(k); open(fp, 'w', encoding='utf-8').write(compact(d))
meta = json.load(open(D('meta.json'), encoding='utf-8'))
for c in meta['order']:
    a = json.load(open(D(c + '.json'), encoding='utf-8')); ch = False
    for x in a:
        if x['id'] in ids and 'rx' in x: del x['rx']; ch = True
    if ch:
        s = compact(a); open(D(c + '.json'), 'w', encoding='utf-8').write(s); meta['cols'][c]['bytes'] = len(s.encode())
open(D('meta.json'), 'w', encoding='utf-8').write(compact(meta))
def norm_search(s):
    s = re.sub(r'[ً-ْـ]', '', s); s = re.sub('[أإآ]', 'ا', s); s = s.replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return re.sub(r'\s+', ' ', s).strip()
n_pk = 0
if os.path.exists(os.path.join(PK, 'manifest.json')):
    man = json.load(open(os.path.join(PK, 'manifest.json'), encoding='utf-8'))
    for e in man['packs']:
        fp = os.path.join(PK, e['file']); p = json.load(open(fp, encoding='utf-8')); ch = False
        for it in p['items']:
            if it['id'] in ids and 'rule_text' in it:
                del it['rule_text']; n_pk += 1; ch = True
                it['search_text'] = norm_search(' '.join([it.get('title', ''), ' '.join(it['paragraphs']), ' '.join(c['raw'] for c in it.get('citations', []))]))
        if ch:
            notes = p.setdefault('changelog', {}).setdefault('notes', [])
            msg = 'حُذف rule_text من عناصر تضمّن نص قاعدتها بيانًا شخصيًا (عنوانًا أو اسمًا)، وبقي الموجز: ' + '، '.join(sorted(i for i in ids if any(x['id'] == i for x in p['items'])))
            notes[:] = [m for m in notes if not m.startswith('حُذف rule_text')] + [msg]
            b = json.dumps(p, ensure_ascii=False, indent=0).encode('utf-8'); open(fp, 'wb').write(b)
            e['bytes'] = len(b); e['sha256'] = hashlib.sha256(b).hexdigest(); e['changelog'] = p['changelog']
    open(os.path.join(PK, 'manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, ensure_ascii=False, indent=1))
w = json.load(open(D('withdrawn.json'), encoding='utf-8'))
w['rule_ids'] = sorted(set(w.get('rule_ids', [])) | ids); w['updated'] = datetime.date.today().isoformat()
open(D('withdrawn.json'), 'w', encoding='utf-8').write(json.dumps(w, ensure_ascii=False, indent=0))
files = []
for sub in ('data', 'pages', 'pagetext'):
    for dp, _, fs in os.walk(os.path.join(ROOT, sub)):
        for f in sorted(fs):
            if f == 'meta.json' and sub == 'pages': continue
            pth = os.path.relpath(os.path.join(dp, f), ROOT); files.append({'p': pth, 's': os.path.getsize(os.path.join(ROOT, pth))})
files.sort(key=lambda x: x['p'])
open(os.path.join(ROOT, 'files.json'), 'w', encoding='utf-8').write(compact({'bytes': sum(f['s'] for f in files), 'files': files}))
print(f'حُذف نص القاعدة: {n_rx} من data/rx، و{n_pk} من الحزم')
