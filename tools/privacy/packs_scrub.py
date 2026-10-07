#!/usr/bin/env python3
"""ينظف حزم «مداولة» الحالية من الإحالات إلى المعرّفات المسحوبة (related / same_principle / tawatur وكل قائمة معرّفات داخل العنصر)
ثم يحدّث البصمات والأحجام في manifest.json. يُشغَّل بعد packs_withdraw.py. لا يمس deleted_items."""
import os, json, hashlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PK = os.path.join(ROOT, 'packs')
W = set(json.load(open(os.path.join(ROOT, 'data', 'withdrawn.json'), encoding='utf-8'))['ids'])
def scrub(o):
    n = 0
    if isinstance(o, dict):
        for k, v in list(o.items()):
            if isinstance(v, list) and any(isinstance(i, str) and i in W for i in v):
                o[k] = [i for i in v if not (isinstance(i, str) and i in W)]; n += len(v) - len(o[k])
            else: n += scrub(v)
    elif isinstance(o, list):
        for v in o: n += scrub(v)
    return n
man = json.load(open(os.path.join(PK, 'manifest.json'), encoding='utf-8')); tot = 0
for e in man['packs']:
    fp = os.path.join(PK, e['file']); p = json.load(open(fp, encoding='utf-8'))
    n = sum(scrub(p[k]) for k in p if k != 'deleted_items'); tot += n
    if n:
        b = json.dumps(p, ensure_ascii=False, indent=0).encode('utf-8'); open(fp, 'wb').write(b)
        e['bytes'] = len(b); e['sha256'] = hashlib.sha256(b).hexdigest()
open(os.path.join(PK, 'manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, ensure_ascii=False, indent=1))
print('أزيلت إحالات إلى مسحوب:', tot)
