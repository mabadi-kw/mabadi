#!/usr/bin/env python3
"""حزم «مداولة» 1.8: إضافة الفهرس الموحّد دون حذف شيء.
- كل عنصر: index=[{key,path,part,basis,evidence_n}] (قد يغيب = غير مبوّب)، وprocedural (مبدأ إجرائي عام في المرافعات المدنية).
- packs/index_v1.8.json: الشجرة (key ثابت، path، part، order أبجدي، count، procedural).
- packs/topics_to_index_v1.8.json: كل موضوع قديم ← أبواب الفهرس المقابلة بنسبها (أو null إن لم يوجد مقابل).
- topics باقٍ كما هو في 1.8 (مهجور، يُحذف في 1.9).
procedural بقياس لا باجتهاد: الباب إجرائي إذا كانت ≥60% من مبادئه (5 فأكثر) مصنفة في «إجراءات التقاضي» (P) في التصنيف القديم،
وإلا ورث حكم أبيه؛ والعنصر إجرائي إذا وقع في باب إجرائي، أو — إن لم يُبوَّب — إذا كان له موضوع قديم يبدأ بـ P."""
import os, re, json, glob, hashlib, datetime, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); PK = os.path.join(ROOT, 'packs')
OLD, NEW = '1.7', '1.8'; today = datetime.date.today().isoformat()
I = json.load(open(os.path.join(ROOT, 'tools', 'index', 'index_full.json'), encoding='utf-8'))
meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
BY = {x['id']: x for c in meta['order'] for x in json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8'))}
nodes = {n['k']: n for n in I['tree']}
def path(k):
    p = []
    while k: p.insert(0, nodes[k]['l']); k = nodes[k]['par']
    return p
# procedural per node
tot = collections.Counter(); pc = collections.Counter()
for i, ks in I['a'].items():
    x = BY.get(i)
    if not x or not x.get('tp'): continue
    isP = any(t[0].startswith('P:') for t in x['tp'])
    anc = set()
    for k, _, _ in ks:
        while k: anc.add(k); k = nodes[k]['par']
    for k in anc: tot[k] += 1; pc[k] += isP
PROC = {}
for n in I['tree']:   # الآباء قبل الأبناء (مرتبة بالعمق)
    k = n['k']
    if n['p'] != 'civil': PROC[k] = False; continue
    if tot[k] >= 5: PROC[k] = pc[k] / tot[k] >= 0.6
    else: PROC[k] = PROC.get(n['par'], False) if n['par'] else False
def item_index(i):
    return [{'key': k, 'path': path(k), 'part': nodes[k]['p'], 'basis': b, **({'evidence_n': nn} if b == 'evidence' else {})} for k, b, nn in I['a'].get(i, [])]
def item_proc(i):
    ks = I['a'].get(i)
    if ks: return any(PROC.get(k) for k, _, _ in ks)
    x = BY.get(i); return bool(x and any(t[0].startswith('P:') for t in x.get('tp', [])))
# tree file
tops_sorted = {}
tree = []
for n in I['tree']:
    tree.append({'key': n['k'], 'label': n['l'], 'path': path(n['k']), 'part': n['p'], 'parent': n['par'], 'count': n['n'], 'procedural': PROC[n['k']]})
for part in ('civil', 'criminal'):
    sib = collections.defaultdict(list)
    for t in tree:
        if t['part'] == part: sib[t['parent']].append(t)
    for lst in sib.values():
        for o, t in enumerate(sorted(lst, key=lambda t: t['label'])): t['order'] = o
idx = {'schema_version': NEW, 'generated': today, 'source': I['source'],
       'rules': {'direct': 'تبويب المكتب الفني نفسه: موضع القاعدة في القسم الخامس، أو النص نفسه، أو العنوان الكاشف، أو عنوان الباب في الكتاب المرجعي بكلمة الموضوع نفسها',
                 'evidence': 'عنوان باب في كتاب آخر رُبط بباب في الفهرس لأن ≥80% من قواعده المشتركة مع القسم الخامس (3 فأكثر) مبوّبة تحته؛ evidence_n عددها',
                 'procedural': 'الباب إجرائي إذا كانت ≥60% من مبادئه (5 فأكثر) في «إجراءات التقاضي» (P) في التصنيف القديم، وإلا ورث أباه'},
       'nodes': tree}
# topics -> index
tmap = collections.defaultdict(collections.Counter); tn = collections.Counter()
for i, x in BY.items():
    for t in x.get('tp', []):
        tn[t[0]] += 1
        for k in {k for k, _, _ in I['a'].get(i, [])}: tmap[t[0]][k] += 1
t2i = {}
for t, n in tn.items():
    c = tmap.get(t)
    if not c: t2i[t] = None; continue
    t2i[t] = [{'key': k, 'path': path(k), 'share': round(v / n, 3)} for k, v in c.most_common(5) if v / n >= 0.1] or None
t2 = {'schema_version': NEW, 'generated': today, 'note': 'لكل موضوع قديم أبواب الفهرس التي تقع فيها ≥10% من مبادئه (حتى 5)، بنسبها. null = لا مقابل.', 'topics': t2i}
# packs
man = json.load(open(os.path.join(PK, 'manifest.json'), encoding='utf-8')); assert man['schema_version'] == OLD
newman = []; stats = collections.Counter()
for e in man['packs']:
    fp = os.path.join(PK, e['file']); p = json.load(open(fp, encoding='utf-8'))
    for it in p['items']:
        ix = item_index(it['id'])
        if ix: it['index'] = ix; stats['indexed'] += 1
        else: it.pop('index', None); stats['unindexed'] += 1
        it['procedural'] = item_proc(it['id']); stats['procedural'] += it['procedural']
    p['schema_version'] = NEW; p['generated'] = today
    p['changelog'] = {'version': NEW, 'previous': OLD, 'date': today, 'notes': ['إضافة الفهرس الموحّد (index) وعلامة المبدأ الإجرائي (procedural). لا حذف ولا تعديل نص. topics باقٍ (مهجور، يُحذف في 1.9).']}
    fn = re.sub(r'_v\d+(?:\.\d+)*', '_v' + NEW, e['file'])
    b = json.dumps(p, ensure_ascii=False, indent=0).encode('utf-8'); open(os.path.join(PK, fn), 'wb').write(b)
    ne = dict(e); ne.update({'file': fn, 'schema_version': NEW, 'generated': today, 'bytes': len(b), 'sha256': hashlib.sha256(b).hexdigest(), 'changelog': p['changelog']})
    newman.append(ne)
    if fn != e['file']: os.remove(fp)
for name, obj in (('index_v1.8.json', idx), ('topics_to_index_v1.8.json', t2)):
    b = json.dumps(obj, ensure_ascii=False, indent=0).encode('utf-8'); open(os.path.join(PK, name), 'wb').write(b)
man['packs'] = newman; man['schema_version'] = NEW; man['updated'] = today
man['extras'] = [{'file': n, 'bytes': os.path.getsize(os.path.join(PK, n)), 'sha256': hashlib.sha256(open(os.path.join(PK, n), 'rb').read()).hexdigest()} for n in ('index_v1.8.json', 'topics_to_index_v1.8.json')]
open(os.path.join(PK, 'manifest.json'), 'w', encoding='utf-8').write(json.dumps(man, ensure_ascii=False, indent=1))
print(dict(stats), 'procedural nodes', sum(PROC.values()), 'topics mapped', sum(1 for v in t2i.values() if v), '/', len(t2i))
