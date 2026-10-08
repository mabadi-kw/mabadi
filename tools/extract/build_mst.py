#!/usr/bin/env python3
"""يبني حزمة المستخلص (نصًا مكشوفًا) من approved.json الناتج على جهاز المستخدم.
build_mst.py <approved.json> <out_plain.json>
- المبدأ الواحد بنصه في أكثر من حكم يصبح عنصرًا واحدًا بإسنادات متعددة (الأحدث أولًا).
- same_as: معرّف المبدأ العام في المكتبة إذا احتوى نصَّ المستخلص بنسبة ≥ 60% من مقاطعه (6 كلمات)، وإلا novel=true.
- index: يُورث من same_as وحده (لا اجتهاد)؛ الجديد بلا index.
- المخرج نص مكشوف: لا يُرفع ولا يُحفظ في المستودع؛ يُشفَّر على جهاز المستخدم."""
import os, re, sys, json, glob, collections, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src, outp = sys.argv[1:3]
A = json.load(open(src, encoding='utf-8'))
def nz(s):
    s = re.sub(r'[ً-ْـ]', '', s); s = re.sub('[أإآ]', 'ا', s); s = s.replace('ى', 'ي').replace('ة', 'ه')
    return re.findall(r'[ء-ي0-9]+', s)
def sh(ws, k=6): return {' '.join(ws[i:i + k]) for i in range(max(0, len(ws) - k + 1))}
# المكتبة
meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
LIB = {}
for c in meta['order']:
    for x in json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8')):
        LIB[x['id']] = ' '.join(x['p']) + ' ' + (x.get('rule') or '')
for f in glob.glob(os.path.join(ROOT, 'data', 'rx', '*.json')):
    for i, t in json.load(open(f, encoding='utf-8')).items():
        if i in LIB: LIB[i] += ' ' + t
INV = collections.defaultdict(set)
for i, t in LIB.items():
    for s in sh(nz(t)): INV[s].add(i)
IX = json.load(open(os.path.join(ROOT, 'tools', 'index', 'index_full.json'), encoding='utf-8'))
nodes = {n['k']: n for n in IX['tree']}
def path(k):
    p = []
    while k: p.insert(0, nodes[k]['l']); k = nodes[k]['par']
    return p
# التجميع بالنص
G = collections.OrderedDict()
for d in A:
    for x in d['rules']:
        key = ' '.join(nz(x['t']))
        G.setdefault(key, {'t': x['t'], 'cits': []})['cits'].append(d)
KL = {'مشورة': 'قرار غرفة المشورة', 'فحص': 'قرار لجنة فحص الطعون'}
def cite(d):
    ap = d['appeal']; dd = datetime.date.fromisoformat(d['date'])
    nums = '، '.join(str(n) for n, y in ap); ys = sorted({y for n, y in ap})
    lead = 'الطعن رقم' if len(ap) == 1 else ('الطعنان رقما' if len(ap) == 2 else 'الطعون أرقام')
    yr = ys[0] if len(ys) == 1 else '، '.join(map(str, ys))
    raw = f"({lead} {nums} لسنة {yr} {d['circuit'] or ''}{' — ' + KL[d['kind']] if d['kind'] in KL else ''} جلسة {dd.day}/{dd.month}/{dd.year})".replace('  ', ' ')
    o = {'raw': raw, 'chamber': d['circuit'], 'appeals': [{'number': n, 'year': y} for n, y in ap], 'session': d['date'],
         'ruling_key': '+'.join(f'{n}/{y}' for n, y in ap) + '@' + d['date'], 'decision': d['kind']}
    if d.get('panel'): o['panel'] = d['panel']
    return o
items = []; nov = 0; seq = 0
for key, g in G.items():
    seq += 1; ws = key.split(); S = sh(ws)
    cand = collections.Counter()
    for s in S:
        for i in INV.get(s, ()): cand[i] += 1
    same = None
    if S and cand:
        i, c = cand.most_common(1)[0]
        if c / len(S) >= 0.6: same = i
    cits = sorted((cite(d) for d in g['cits']), key=lambda c: c['session'], reverse=True)
    yr = cits[0]['session'][2:4]
    it = {'id': f'MST{yr}-{seq:04d}', 'source': f'MST{yr}', 'kind': 'unofficial_extract', 'official': False, 'number': seq,
          'paragraphs': [g['t']], 'citations': cits, 'branches': sorted({c['chamber'] for c in cits if c['chamber']}),
          'novel': same is None, **({'same_as': same} if same else {})}
    if same and IX['a'].get(same):
        it['index'] = [{'key': k, 'path': path(k), 'part': nodes[k]['p'], 'basis': 'direct' if b == 'direct' else 'evidence', 'via': 'same_as'} for k, b, n in IX['a'][same]]
    nov += it['novel']; items.append(it)
pack = {'schema_version': '1.0', 'pack': 'extract', 'generated': datetime.date.today().isoformat(), 'kind': 'unofficial_extract', 'official': False,
        'title': 'مستخلص مبادئ التمييز — من أحكام غير منشورة', 'notice': 'غير رسمي — من إعداد المكتبة من أحكام غير منشورة؛ النص حرفيًا كما في الحكم، والمرجع هو الحكم نفسه.',
        'counts': {'items': len(items), 'novel': nov, 'same_as': len(items) - nov, 'citations': sum(len(i['citations']) for i in items)}, 'items': items}
json.dump(pack, open(outp, 'w', encoding='utf-8'), ensure_ascii=False)
print(json.dumps(pack['counts'], ensure_ascii=False), collections.Counter(b for i in items for b in i['branches']))
