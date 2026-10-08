#!/usr/bin/env python3
"""الفهرس الموحّد — مبني على تبويب «مجموعة القواعد القانونية، القسم الخامس» (المكتب الفني).
قاعدة التصنيف: لا اجتهاد.
  direct   : تبويب المكتب الفني نفسه — موضع القاعدة في القسم الخامس (self)، أو المبدأ نفسه نصًا (same_text)،
             أو العنوان الكاشف في المجلة/المستحدث المكتوب بكلمات الموضوع نفسها (title/heading).
  evidence : عنوان باب في كتاب آخر يُربط بباب في الفهرس إذا كانت القواعد المشتركة بينهما مبوّبة تحت الباب نفسه
             بنسبة ≥ 80% وعددها ≥ 3؛ ويُذكر العدد (n).
  ما لا دليل له لا يدخل الفهرس.
المخرج: data/index.json = {tree:[{k,l,p,par,o}], a:{id:[[k,basis,n],...]}, stats}"""
import os, re, json, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); D = lambda *p: os.path.join(ROOT, 'data', *p)
TH_SHARE, TH_N, TH_COV, TH_ABS = 0.8, 3, 0.10, 20   # النسبة، أدنى عدد، نسبة المعروف من حجم الباب، أو عدد مطلق يكفي وحده
def clean(s):
    s = re.sub(r'[ـً-ْ]', '', s or ''); s = re.sub(r'\s+', ' ', s)
    return s.strip(' .:-–،"\'«»()')
def nk(s): return re.sub('[أإآ]', 'ا', clean(s)).replace('ة', 'ه').replace('ى', 'ي')
meta = json.load(open(D('meta.json'), encoding='utf-8'))
COL = {c: json.load(open(D(c + '.json'), encoding='utf-8')) for c in meta['order']}
BY = {x['id']: x for a in COL.values() for x in a}
# ---------- الشجرة
nodes = {}; forms = collections.defaultdict(collections.Counter); order = {}
def add_path(part, sec):
    keys = []
    for i in range(len(sec)):
        lab = clean(sec[i])
        if not lab: break
        k = part + '/' + '/'.join(nk(s) for s in sec[:i + 1])
        forms[k][lab] += 1
        if k not in nodes:
            nodes[k] = {'k': k, 'p': part, 'par': keys[-1] if keys else None, 'd': i}
            order[k] = len(order)
        keys.append(k)
    return keys[-1] if keys else None
SELF = {}
for col, part in (('QK5', 'civil'), ('QJ5', 'criminal')):
    for x in COL[col]:
        k = add_path(part, x['sec'])
        if k: SELF[x['id']] = k
for k, n in nodes.items(): n['l'] = forms[k].most_common(1)[0][0]
TOP = {p: {nk(n['l']): k for k, n in nodes.items() if n['d'] == 0 and n['p'] == p} for p in ('civil', 'criminal')}
CHILD = collections.defaultdict(dict)
for k, n in nodes.items():
    if n['par']: CHILD[n['par']][nk(n['l'])] = k
# ---------- التصنيف
A = collections.defaultdict(dict)   # id -> {key: (basis, n, via)}
def put(i, k, basis, n=0, via=''):
    if k and k not in A[i]: A[i][k] = (basis, n, via)
for i, k in SELF.items(): put(i, k, 'direct', 0, 'self')
dups = json.load(open(D('dups.json'), encoding='utf-8')) if os.path.exists(D('dups.json')) else []
for g in dups:
    ks = [SELF[i] for i in g if i in SELF]
    for i in g:
        if i not in SELF and i in BY:
            for k in ks: put(i, k, 'direct', 0, 'same_text')
def part_of(x):
    chs = {c.get('ch') for c in x.get('c', [])}
    return 'criminal' if 'جزائي' in chs or any('جزائ' in s for s in x.get('sec', [])) else 'civil'
def kw_key(kw, part, sub=None):
    t = TOP[part].get(nk(kw)) or TOP['criminal' if part == 'civil' else 'civil'].get(nk(kw))
    if not t: return None
    if sub:
        for cand in (sub, sub.split(':')[0]):
            c = CHILD[t].get(nk(cand))
            if c: return c
    return t
SEG = re.compile(r'([^".]+?)\s*(?:"([^"]+)")?\s*(?:\.|$)')
for col in meta['order']:
    if col in ('QK5', 'QJ5'): continue
    for x in COL[col]:
        if x['id'] in SELF: continue
        p = part_of(x)
        if x.get('ttl'):
            for m in SEG.finditer(x['ttl']):
                kw = (m.group(1) or '').strip()
                if kw: put(x['id'], kw_key(kw, p, m.group(2)), 'direct', 0, 'title')
        elif col == 'S' and x.get('sec'):
            put(x['id'], kw_key(x['sec'][0], p), 'direct', 0, 'heading')
# ---------- عنوان الكتاب بكلمة الموضوع نفسها (direct/book_heading)
# فهارس الكتب المرجعية من المكتب الفني أيضًا: إذا طابق عنوانُ الباب في الكتاب اسمَ باب واحد بعينه في الفهرس
# (بعد توحيد الهمزات و«ال» التعريف) فهو تبويبه بالكلمة نفسها. الاسم الذي يتكرر في أكثر من موضع لا يُستعمل.
def nn(s): return re.sub(r'^ال', '', nk(s)) if len(nk(s)) > 4 else nk(s)
LABIX = {'civil': collections.defaultdict(set), 'criminal': collections.defaultdict(set)}
for k, n in nodes.items():
    if n['d'] == 0: LABIX[n['p']][nn(n['l'])].add(k)   # كلمات الموضوع الرئيسية وحدها؛ الأبواب الفرعية لا تُطابق بالاسم
GENERIC = {nn(w) for w in ('بوجه عام', 'قواعد عامة', 'أحكام عامة', 'عام', 'مسائل متنوعة', 'متنوعات', 'تعريفات', 'إجراءات')}
TL = meta.get('toplab', {})
def by_name(label, part):
    if not label or nn(label) in GENERIC: return None
    for p2 in (part, 'criminal' if part == 'civil' else 'civil'):
        ks = LABIX[p2].get(nn(label))
        if ks and len(ks) == 1: return next(iter(ks))
    return None
for col in meta['order']:
    if col in ('QK5', 'QJ5') or col.startswith('MQ') or col in ('MSA', 'S'): continue
    for x in COL[col]:
        if any(v[0] == 'direct' for v in A.get(x['id'], {}).values()): continue
        p = part_of(x)
        labs = [TL[t[0]][-1] for t in x.get('tp', []) if t[1] == 'b' and t[0] in TL]
        sec = [clean(re.sub(r'^[\d\-–)(.أبجده]+\s*[-)\.]\s*', '', t)) for t in x.get('sec', [])]
        labs += [t for t in sec if t]
        for lab in labs:
            put(x['id'], by_name(lab, p), 'direct', 0, 'book_heading')
# تقييم دقة المطابقة بالاسم على العناصر المعروف تبويبها (لا يُستعمل في التصنيف)
if os.environ.get('EVAL'):
    tot = ok_top = ok_full = 0; bad = collections.Counter()
    for col in meta['order']:
        if col in ('QK5', 'QJ5') or col.startswith('MQ') or col in ('MSA', 'S'): continue
        for x in COL[col]:
            known = {k for k, v in A.get(x['id'], {}).items() if v[0] == 'direct' and v[2] in ('same_text', 'title', 'self')}
            if not known: continue
            p = part_of(x)
            labs = [TL[t[0]][-1] for t in x.get('tp', []) if t[1] == 'b' and t[0] in TL]
            labs += [t for t in (clean(re.sub(r'^[\d\-–)(.أبجده]+\s*[-)\.]\s*', '', t)) for t in x.get('sec', [])) if t]
            for lab in labs:
                k = by_name(lab, p)
                if not k: continue
                tot += 1
                tops = {'/'.join(q.split('/')[:2]) for q in known}
                anc = set(); q = k
                while q: anc.add(q); q = nodes[q]['par']
                if '/'.join(k.split('/')[:2]) in tops: ok_top += 1
                else: bad[(lab, nodes[k]['l'])] += 1
                if anc & known or any(k in (lambda z: [z])(kk) for kk in known): ok_full += 1
    print('EVAL name-match on known items:', tot, 'top-agree', round(ok_top / max(tot, 1), 3), 'path-agree', round(ok_full / max(tot, 1), 3))
    print(bad.most_common(25))
# ---------- الدليل: عناوين الكتب الأخرى
def hkey(x):
    s = [clean(t) for t in x.get('sec', []) if clean(t)]
    return (x['col'],) + tuple(s[:2]) if s else None
H = collections.defaultdict(list)
for col in meta['order']:
    if col in ('QK5', 'QJ5', 'S') or col.startswith('MQ') or col == 'MSA': continue
    for x in COL[col]:
        h = hkey(x)
        if h: H[h].append(x['id'])
        for t in x.get('tp', []):
            if t[1] == 'b': H[('topic', t[0])].append(x['id'])   # الموضوع المأخوذ من فهرس الكتاب نفسه
MAP = {}
for h, ids in H.items():
    known = [i for i in ids if A.get(i) and any(v[0] == 'direct' for v in A[i].values())]
    if len(known) < TH_N or (len(known) < TH_ABS and len(known) < TH_COV * len(ids)): continue
    full = collections.Counter(); top = collections.Counter()
    for i in known:
        ks = {k for k, v in A[i].items() if v[0] == 'direct'}
        for k in ks: full[k] += 1
        for k in {k.split('/')[0] + '/' + k.split('/')[1] for k in ks}: top[k] += 1
    n = len(known); best = None
    k1, c1 = full.most_common(1)[0]
    if c1 / n >= TH_SHARE: best = (k1, c1)
    else:
        k2, c2 = top.most_common(1)[0]
        if c2 / n >= TH_SHARE: best = (k2, c2)
    if best:
        MAP[h] = {'k': best[0], 'n': n, 'agree': best[1]}
        for i in ids:
            if not any(v[0] == 'direct' for v in A.get(i, {}).values()): put(i, best[0], 'evidence', n, 'topic' if h[0] == 'topic' else 'heading')
# ---------- المخرج
# العدد = المبادئ المميزة (النص المكرر في أكثر من كتاب يُعد مرة واحدة، كما يعرضه التطبيق)
W = set(json.load(open(D('withdrawn.json'), encoding='utf-8')).get('ids', [])) if os.path.exists(D('withdrawn.json')) else set()
REP = {i: g[0] for g in dups for i in g}
seen = collections.defaultdict(set)
for i, ks in A.items():
    if i in W: continue
    for k in ks:
        while k: seen[k].add(REP.get(i, i)); k = nodes[k]['par'] if k in nodes else None
cnt = {k: len(v) for k, v in seen.items()}
tree = sorted(nodes.values(), key=lambda n: (n['p'], n['d'], order[n['k']]))
out = {'v': 1, 'source': 'مجموعة القواعد القانونية — القسم الخامس (المكتب الفني)',
       'tree': [{'k': n['k'], 'l': n['l'], 'p': n['p'], 'par': n['par'], 'n': cnt.get(n['k'], 0)} for n in tree],
       'a': {i: [[k, v[0], v[1]] for k, v in ks.items()] for i, ks in A.items() if ks}}
total = len(BY); qk = sum(1 for i in BY if i in SELF)
via = collections.Counter(); basis = collections.Counter()
for i, ks in out['a'].items():
    if i in SELF: continue
    vs = {A[i][k][2] for k in A[i]}; bs = {A[i][k][0] for k in A[i]}
    basis['direct' if 'direct' in bs else 'evidence'] += 1
    for v in vs: via[v] += 1
other = total - qk
out['stats'] = {'items': total, 'qk5_qj5': qk, 'other': other, 'other_indexed_direct': basis['direct'],
                'other_indexed_evidence': basis['evidence'], 'other_unindexed': other - basis['direct'] - basis['evidence'],
                'via': dict(via), 'heading_maps': len(MAP), 'headings_total': len(H), 'nodes': len(nodes)}
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'index_full.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# نسخة التطبيق المضغوطة: data/ix.json = {t:[[label,part(0/1),parent_idx,count]], a:{id:[node_idx,...]}, e:[ids by evidence]}
KI = {n['k']: i for i, n in enumerate(out['tree'])}
ix = {'v': 1, 't': [[n['l'], 0 if n['p'] == 'civil' else 1, KI.get(n['par'], -1), n['n']] for n in out['tree']],
      'a': {i: [KI[k] for k, b, nn_ in ks] for i, ks in out['a'].items()},
      'e': sorted(i for i, ks in out['a'].items() if all(b == 'evidence' for k, b, nn_ in ks))}
json.dump(ix, open(D('ix.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({' / '.join(h): v for h, v in MAP.items()}, open(os.path.join(os.path.dirname(__file__), 'heading_map.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps(out['stats'], ensure_ascii=False, indent=1))
