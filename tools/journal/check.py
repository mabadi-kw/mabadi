#!/usr/bin/env python3
"""فحص الحرفية: كل عنوان وموجز وقاعدة في مجموعات المجلة موجود حرفيًا في نص ملف المصدر (بعد توحيد المسافات فقط).
الاستعمال: python3 check.py <مجلد txt للمجلة> MQ31 [MQ32 …]
"""
import os, re, sys, json
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
TXT = sys.argv[1]
W = lambda s: re.sub(r'\s+', ' ', s.replace('\xad', '').replace('‏', '').replace('‎', '').replace('\t', ' ').replace('\xa0', ' ')).strip()
cache = {}
def src(f):
    if f not in cache: cache[f] = W(open(os.path.join(TXT, f), encoding='utf-8-sig').read())
    return cache[f]
tot = bad = 0
for code in sys.argv[2:]:
    items = json.load(open(os.path.join(ROOT, 'data', code + '.json'), encoding='utf-8'))
    nb = 0
    for it in items:
        t = src(it['src']['file'])
        segs = [it['ttl']] + it['p'] + [x for x in it['rule'].split('\n') if x]
        for sg in segs:
            tot += 1
            if W(sg) not in t:
                bad += 1; nb += 1
                if nb <= 5: print(code, it['id'], 'غير موجود حرفيًا:', sg[:80], file=sys.stderr)
    print(code, 'مقاطع مفحوصة', sum(1 + len(i['p']) + len([x for x in i['rule'].split('\n') if x]) for i in items), 'غير مطابق', nb, file=sys.stderr)
print('المجموع:', tot, 'غير مطابق:', bad, file=sys.stderr)
