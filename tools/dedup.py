#!/usr/bin/env python3
"""المبدأ الواحد منشورًا في أكثر من موضع: يجمع المواضع التي تحمل الطعن نفسه (رقمه وجلسته) والموجز نفسه
(تطابق بعد توحيد الرسم، أو تشابه 5-حروف ≥ 0.8)، ليدمجها التطبيق في نتيجة واحدة. البيانات نفسها لا تُمسّ.
ويُضم إليها «المبدأ المتواتر»: الموجز نفسه بنصه في أحكام مختلفة.
ترتيب كل مجموعة: أحدث جلسة أولًا، ثم الموضع الذي معه نص القاعدة (المجلة ثم مجموعة القواعد)، ثم ترتيب الكتب في المكتبة.
المخرج: data/dups.json = [[معرّف، …], …] (المجموعات التي فيها أكثر من موضع فقط).
الاستعمال: python3 tools/dedup.py
"""
import os, re, json, glob, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
M = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
ORDER = M['order']
D = {c: json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8')) for c in ORDER}


def nz(s):
    s = re.sub(r'[ً-ْـ]', '', s); s = re.sub('[أإآ]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^\w]', '', s)


PP, G, COL = {}, {}, {}
for c in ORDER:
    for x in D[c]:
        PP[x['id']] = nz(' '.join(x['p'] if isinstance(x['p'], list) else [x['p']])); COL[x['id']] = c


def gr(i):
    if i not in G: s = PP[i]; G[i] = set(s[j:j + 5] for j in range(max(1, len(s) - 4)))
    return G[i]


pos0 = {}
for c in ORDER:
    for x in D[c]: pos0[x['id']] = len(pos0)
hasrule0 = lambda i: 0 if COL[i].startswith('MQ') else 1 if COL[i] in ('QK5', 'QJ5') else 2
def similar(a, b):
    if PP[a] == PP[b]: return True
    if len(PP[a]) < 12 or len(PP[b]) < 12: return False
    A, B = gr(a), gr(b); return len(A & B) / max(1, len(A | B)) >= 0.8
# تجميع جشع داخل كل حكم: كل موضع يُقارن ببذرة المجموعة (لا تسلسل يجمع مبدأين مختلفين)
byk = collections.defaultdict(list)
for c in ORDER:
    for x in D[c]:
        k = next((cc['k'] for cc in x['c'] if cc.get('k') and '@' in cc['k']), None)
        if k: byk[k].append(x['id'])
cl = {}
for k, L in byk.items():
    seeds = []
    for i in sorted(L, key=lambda i: (hasrule0(i), pos0[i])):
        g = next((g for g in seeds if similar(g[0], i)), None)
        if g: g.append(i)
        else: seeds.append([i])
    for g in seeds: cl[g[0]] = g
pos = {i: n for n, i in enumerate(i for c in ORDER for i in (x['id'] for x in D[c]))}
hasrule = lambda i: 0 if COL[i].startswith('MQ') else 1 if COL[i] in ('QK5', 'QJ5') else 2
# المبدأ المتواتر: الموجز نفسه بنصه (بعد توحيد الرسم، 40 حرفًا فأكثر) في أحكام مختلفة → مجموعة عرض واحدة يتصدرها أحدث حكم
DATE = {}
for c in ORDER:
    for x in D[c]:
        DATE[x['id']] = max([cc['k'].split('@')[1] for cc in x['c'] if cc.get('k') and '@' in cc['k']] or [''])
root = {}
for r, m in cl.items():
    for i in m: root[i] = r
par = {}
def f(a):
    while par.setdefault(a, a) != a: par[a] = par[par[a]]; a = par[a]
    return a
bytext = collections.defaultdict(list)
for i in COL:
    if len(PP[i]) >= 40: bytext[PP[i]].append(i)
tw = 0
for t, L in bytext.items():
    rs = list(dict.fromkeys(root.get(i, i) for i in L))
    if len(rs) > 1:
        tw += 1
        for r in rs[1:]: par[f(r)] = f(rs[0])
merged = collections.defaultdict(list)
for i in COL:
    r = root.get(i, i); merged[f(r)].append(i)
cl = merged
print('مبادئ متواترة (نص واحد في أحكام مختلفة):', tw)
groups = [sorted(m, key=lambda i: (-int(DATE[i].replace('-', '') or 0), hasrule(i), pos[i])) for m in cl.values() if len(m) > 1]
groups.sort(key=lambda m: pos[m[0]])
json.dump(groups, open(os.path.join(ROOT, 'data', 'dups.json'), 'w', encoding='utf-8'), separators=(',', ':'))
n = sum(len(m) for m in groups)
print('مجموعات', len(groups), 'عناصر فيها', n, 'يُطوى', n - len(groups), 'مبادئ مميزة', len(COL) - (n - len(groups)),
      'الحجم', os.path.getsize(os.path.join(ROOT, 'data', 'dups.json')) // 1024, 'ك.ب')
