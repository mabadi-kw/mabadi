#!/usr/bin/env python3
"""سحب مبادئ لحماية الخصوصية بأمر واحد.
  python3 tools/privacy/withdraw.py <id> [<id> ...]
- يحذف المبادئ من ملفات المجموعات، ويضيف معرّفاتها إلى data/withdrawn.json (فيخفيها التطبيق حتى من النسخ المخزنة في الأجهزة).
- ينظف الإحالات (rel)، وdups.json، وalias.json، ويعيد بناء المعرّفات الثابتة وfiles.json.
- لا يطبع نص المبدأ.
- مسح السجل العام (إن لزم) خطوة منفصلة: tools/privacy/purge_history.sh <ملف…>"""
import os, sys, json, subprocess, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
D = lambda *p: os.path.join(ROOT, 'data', *p)
def dump(obj, path): open(path, 'w', encoding='utf-8').write(json.dumps(obj, ensure_ascii=False, separators=(',', ':')))
ids = set(sys.argv[1:])
if not ids: print(__doc__); sys.exit(1)
meta = json.load(open(D('meta.json'), encoding='utf-8')); found = set()
for c in meta['order']:
    a = json.load(open(D(c + '.json'), encoding='utf-8')); n0 = len(a)
    found |= {x['id'] for x in a if x['id'] in ids}
    a = [x for x in a if x['id'] not in ids]
    ch = len(a) != n0
    for x in a:
        r = x.get('rel', []); r2 = [i for i in r if i not in ids]
        if r2 != r: x['rel'] = r2; ch = True
    if ch:
        s = json.dumps(a, ensure_ascii=False, separators=(',', ':')); open(D(c + '.json'), 'w', encoding='utf-8').write(s)
        meta['cols'][c]['n'] = len(a); meta['cols'][c]['bytes'] = len(s.encode())
dump(meta, D('meta.json'))
if os.path.exists(D('dups.json')):
    G = [[i for i in g if i not in ids] for g in json.load(open(D('dups.json'), encoding='utf-8'))]; dump([g for g in G if len(g) > 1], D('dups.json'))
if os.path.exists(D('alias.json')):
    A = json.load(open(D('alias.json'), encoding='utf-8')); dump({k: v for k, v in A.items() if k not in ids and v not in ids}, D('alias.json'))
w = json.load(open(D('withdrawn.json'), encoding='utf-8')) if os.path.exists(D('withdrawn.json')) else {'ids': []}
w['ids'] = sorted(set(w['ids']) | ids); w['updated'] = datetime.date.today().isoformat()
open(D('withdrawn.json'), 'w', encoding='utf-8').write(json.dumps(w, ensure_ascii=False, indent=0))
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'refs', 'build.py')], cwd=ROOT, stdout=subprocess.DEVNULL)
files = []
for sub in ('data', 'pages', 'pagetext'):
    for dp, _, fs in os.walk(os.path.join(ROOT, sub)):
        for f in sorted(fs):
            if f == 'meta.json' and sub == 'pages': continue
            p = os.path.relpath(os.path.join(dp, f), ROOT); files.append({'p': p, 's': os.path.getsize(os.path.join(ROOT, p))})
files.sort(key=lambda x: x['p'])
dump({'bytes': sum(f['s'] for f in files), 'files': files}, os.path.join(ROOT, 'files.json'))
missing = ids - found
print(f'سُحب {len(found)} مبدأ' + (f'؛ غير موجود: {len(missing)}' if missing else ''))
