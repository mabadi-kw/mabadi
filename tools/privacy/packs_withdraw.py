#!/usr/bin/env python3
"""يصدر نسخة جديدة من حزم «مداولة» بعد سحب مبادئ لحماية الخصوصية (data/withdrawn.json).
  python3 tools/privacy/packs_withdraw.py <الإصدار الجديد>   مثل 1.7
- يحذف العناصر المسحوبة من items ومن قوائم rulings، ويعلنها في deleted_items (في الجزء الأول من الحزمة المجزأة، وفق العقد §8).
- يعيد تسمية الملفات بالإصدار الجديد، ويحدّث manifest.json بالبصمات، ويحذف ملفات الإصدار السابق.
- الحزم التي لا تحوي عنصرًا مسحوبًا تُرفع إلى الإصدار الجديد أيضًا دون تغيير محتواها (ليبقى الإصدار واحدًا)."""
import os, sys, json, glob, hashlib, re, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PK = os.path.join(ROOT, 'packs')
NEW = sys.argv[1]; today = datetime.date.today().isoformat()
W = set(json.load(open(os.path.join(ROOT, 'data', 'withdrawn.json'), encoding='utf-8'))['ids'])
man = json.load(open(os.path.join(PK, 'manifest.json'), encoding='utf-8')); OLD = man['schema_version']
groups = {}
for e in man['packs']: groups.setdefault(e['pack'], []).append(e)
newman = []; total = 0
for pack, es in groups.items():
    parts = [json.load(open(os.path.join(PK, e['file']), encoding='utf-8')) for e in es]
    gone = [x for p in parts for x in p['items'] if x['id'] in W]; total += len(gone)
    n_before = sum(len(p['items']) for p in parts)
    for p in parts:
        p['items'] = [x for x in p['items'] if x['id'] not in W]
        for r in p.get('rulings', []):
            if 'items' in r: r['items'] = [i for i in r['items'] if i not in W]
        p['rulings'] = [r for r in p.get('rulings', []) if r.get('items', [1])]
        p['schema_version'] = NEW; p['generated'] = today
        p['changelog'] = {'version': NEW, 'previous': OLD, 'date': today, 'items_before': n_before, 'items_after': n_before - len(gone),
                          'deleted': len(gone), 'notes': ['إصدار خصوصية: سُحبت مبادئ تضمنت بيانات أشخاص (أسماء أو عناوين أو أرقام مدنية) وردت في وقائع الدعاوى. لا تغيير آخر.']}
        if 'counts' in p: p['counts']['items'] = len(p['items'])
    d0 = parts[0].setdefault('deleted_items', [])
    for x in gone:
        d0.append({'id': x['id'], 'deleted_in': NEW, 'last_version': OLD, 'reason': 'سُحب لحماية الخصوصية: تضمن بيانًا شخصيًا (اسمًا أو عنوانًا أو رقمًا مدنيًا) في وقائع الدعوى. لا يُعرض نصه في طبقة القاضي.'})
    tot = sum(len(p['items']) for p in parts)
    for e, p in zip(es, parts):
        if 'part' in p and p['part']: p['part']['items_total'] = tot
        fn = re.sub(r'_v\d+(?:\.\d+)*', '_v' + NEW, e['file'])
        s = json.dumps(p, ensure_ascii=False, indent=0); b = s.encode('utf-8')
        open(os.path.join(PK, fn), 'wb').write(b)
        ne = dict(e); ne.update({'file': fn, 'schema_version': NEW, 'generated': today, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(), 'changelog': p['changelog']})
        if 'counts' in ne: ne['counts'] = dict(ne['counts'], items=len(p['items']))
        if 'part' in ne and ne['part']: ne['part'] = dict(ne['part'], items_total=tot)
        newman.append(ne)
        if fn != e['file'] and os.path.exists(os.path.join(PK, e['file'])): os.remove(os.path.join(PK, e['file']))
man['packs'] = newman; man['schema_version'] = NEW; man['updated'] = today
open(os.path.join(PK, 'manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, ensure_ascii=False, indent=1))
print(f'الحزم {NEW}: سُحب {total} عنصرًا (قد يتكرر العنصر الواحد في أكثر من حزمة)')
