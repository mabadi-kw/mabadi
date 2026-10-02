#!/usr/bin/env python3
"""فحص الحرفية لمجموعة القواعد: كل فقرة موجز ونص قاعدة وإسناد وإحالة موجودة حرفيًا في نص ملف المصدر (فقرات docx بعد توحيد المسافات).
الاستعمال: python3 check.py <مجلد docx> QK5 [QJ5]
"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from docxnum import paragraphs
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
D = sys.argv[1]
W = lambda s: re.sub(r'\s+', ' ', s.replace('\xad', '').replace('‏', '').replace('‎', '').replace('\t', ' ').replace('\xa0', ' ')).strip()
cache = {}
def src(f):
    if f not in cache: cache[f] = '\n'.join(W(t) for t, s, n in paragraphs(os.path.join(D, f)))
    return cache[f]
tot = bad = 0
for code in sys.argv[2:]:
    items = json.load(open(os.path.join(ROOT, 'data', code + '.json'), encoding='utf-8'))
    import glob
    RX = {}
    for f in glob.glob(os.path.join(ROOT, 'data', 'rx', code + '-*.json')): RX.update(json.load(open(f, encoding='utf-8')))
    for it in items:
        if 'rule' not in it: it['rule'] = RX.get(it['id'], '')
    nb = 0
    for it in items:
        t = src(it['src']['file'])
        tp = src(it['src']['pf']) if it['src'].get('pf') else t  # موجز منقول من موضع آخر للقاعدة نفسها (fixflags.py)
        for j, sg in enumerate(it['p'] + [x for x in it['rule'].split('\n') if x] + [c['raw'] for c in it['c']] + it['sa']):
            tot += 1
            if j < len(it['p']) and it['src'].get('pfrom') and not it['src'].get('pf'): tot -= 1; continue  # موجز من المجلة: تحققه في tools/journal/check.py
            if W(sg) not in (tp if j < len(it['p']) else t):
                bad += 1; nb += 1
                if nb <= 5: print(code, it['id'], 'غير موجود حرفيًا:', sg[:80], file=sys.stderr)
    print(code, 'غير مطابق', nb, file=sys.stderr)
print('المجموع:', tot, 'غير مطابق:', bad, file=sys.stderr)
