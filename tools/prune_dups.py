#!/usr/bin/env python3
"""حذف المكرر من الكتب السابقة (قرار القاضي، 2/10/2026): المبدأ الوارد بنصه في «مجموعة القواعد القانونية — القسم الخامس»
أو «مجلة القضاء والقانون» يبقى هناك فقط، ويُحذف موضعه من كتب «الأربعين عامًا» وغيرها؛ وما تكرر بين الكتب السابقة وحدها يبقى منه أسبق المواضع في ترتيب المكتبة.
أما تكرار القاعدة في مجموعة القواعد نفسها تحت عدة موضوعات، وورودها في المجلة والقواعد معًا، فيبقى (ويُعرض مرة واحدة).
- يُستعمل data/dups.json (tools/dedup.py): كل مجموعة فيها موضع من المجلة أو القواعد → تُحذف مواضعها الأخرى.
- المعرّف المحذوف لا يُعاد استعماله، ويُحوَّل إلى الموضع الباقي (data/alias.json) فتبقى الروابط والمحفوظات والملاحظات.
- موضوعات الموضع المحذوف تُضاف إلى الموضع الباقي (حتى لا ينقص تصفح الموضوعات)، وتُحدَّث إحالات «rel».
الاستعمال: python3 tools/dedup.py && python3 tools/prune_dups.py && python3 tools/dedup.py
"""
import os, json, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
M = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
ORDER = M['order']
KEEP = lambda c: c.startswith('MQ') or c in ('QK5', 'QJ5')
D = {c: json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8')) for c in ORDER}
BY = {x['id']: x for c in ORDER for x in D[c]}
ap = os.path.join(ROOT, 'data', 'alias.json')
ALIAS = json.load(open(ap, encoding='utf-8')) if os.path.exists(ap) else {}
G = json.load(open(os.path.join(ROOT, 'data', 'dups.json'), encoding='utf-8'))
cnt = collections.Counter()
RK = lambda i: {c['k'] for c in BY[i]['c'] if c.get('k') and '@' in c['k']}
import re
def _nz(x):
    s = ' '.join(x['p'] if isinstance(x['p'], list) else [x['p']])
    s = re.sub(r'[\u064B-\u0652\u0640]', '', s); s = re.sub('[أإآ]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^\w]', '', s)
def SIM(a, b):
    A, B = _nz(BY[a]), _nz(BY[b])
    if A == B: return True
    if len(A) < 12 or len(B) < 12: return False
    ga = set(A[j:j + 5] for j in range(len(A) - 4)); gb = set(B[j:j + 5] for j in range(len(B) - 4))
    return len(ga & gb) / max(1, len(ga | gb)) >= 0.8
ALLK = lambda i: {c['k'] for c in BY[i]['c'] if c.get('k')}
POS = {x['id']: n for n, x in enumerate(x for c in ORDER for x in D[c])}
for g in G:
    # الباقي: المجلة والقواعد أولًا، ثم أسبق المواضع في ترتيب المكتبة
    order = sorted(g, key=lambda i: (0 if KEEP(BY[i]['col']) else 1, POS[i]))
    kept = [i for i in order if KEEP(BY[i]['col'])]
    for i in order:
        if KEEP(BY[i]['col']): continue
        # يُحذف فقط ما له موضع باقٍ من الحكم نفسه، بالموجز نفسه، وفيه كل إسنادات المحذوف
        # (المجموعة قد تضم «المبدأ المتواتر» من أحكام أخرى، وقد يحمل الموضع إسنادًا إضافيًا لحكم آخر فلا يُحذف)
        k0 = next((k for k in kept if RK(i) & RK(k) and ALLK(i) <= ALLK(k) and SIM(i, k)), None)
        if not k0: kept.append(i); continue
        ALIAS[i] = k0; cnt[BY[i]['col']] += 1
        tgt = BY[k0]
        have = {t[0] for t in tgt['tp']}
        for t in BY[i]['tp']:
            if t[0] not in have: tgt['tp'].append(t); have.add(t[0])
# سلاسل التحويل القديمة تُختصر إلى الموضع الباقي
for a in list(ALIAS):
    seen = set()
    while ALIAS[a] in ALIAS and ALIAS[a] not in seen: seen.add(ALIAS[a]); ALIAS[a] = ALIAS[ALIAS[a]]
gone = set(ALIAS)
for c in ORDER:
    D[c] = [x for x in D[c] if x['id'] not in gone]
    for x in D[c]:
        if x.get('rel'):
            r = []
            for i in x['rel']:
                i = ALIAS.get(i, i)
                if i != x['id'] and i not in r and i in BY and i not in gone: r.append(i)
            x['rel'] = r
for c in ORDER:
    s = json.dumps(D[c], ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data', c + '.json'), 'w', encoding='utf-8').write(s)
    M['cols'][c]['bytes'] = len(s.encode())
    if 'n' in M['cols'][c]: M['cols'][c]['n'] = len(D[c])
    if cnt[c]: M['cols'][c]['pruned'] = M['cols'][c].get('pruned', 0) + cnt[c]
json.dump(M, open(os.path.join(ROOT, 'data', 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(ALIAS, open(ap, 'w', encoding='utf-8'), separators=(',', ':'))
print('حُذف', sum(cnt.values()), dict(cnt), '— الباقي', sum(len(D[c]) for c in ORDER))
