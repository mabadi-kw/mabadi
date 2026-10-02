#!/usr/bin/env python3
"""الحزم 1.6 لـ«مداولة»: حزم 1.5 + المجلة (MQ31–34) ومجموعة القواعد ق5 (QK5، QJ5)، وحذف المكرر، والمبدأ المتواتر.
- المصدر: حزم 1.5 في packs/، وبيانات الموقع data/ (للمجموعات الجديدة)، وdata/alias.json (المحذوف) وdata/dups.json (المجموعات).
- المحذوف لتكراره: يخرج من items ويُسرد في deleted_items مع replaced_by (العقد §7)، وموضوعاته تُضاف إلى الباقي.
- لكل عنصر: same_principle (المبدأ نفسه من الحكم نفسه في موضع آخر) وtawatur (المبدأ نفسه بنصه في أحكام أخرى، الأحدث أولًا).
- keywords: الكلمات المفتاحية الرسمية (عنوان المجلة الكاشف، وموضوع المجموعة وعنوانه الفرعي).
- كل حزمة فوق 12 م.ب تُجزّأ (العقد §8)، ومع كل حزمة changelog؛ وmanifest.json فيه الأحجام والبصمات.
الاستعمال: python3 tools/packs/mk16.py   (المخرج: packs/*_v1.6*.json وpacks/manifest.json وpacks/CHANGELOG_v1.6.md)
"""
import os, re, json, glob, math, hashlib, datetime, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PK = os.path.join(ROOT, 'packs')
V, PREV = '1.6', '1.5'
TODAY = datetime.date.today().isoformat()
LIMIT = 12_000_000
M = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
ALIAS = json.load(open(os.path.join(ROOT, 'data', 'alias.json'), encoding='utf-8'))
DUPS = json.load(open(os.path.join(ROOT, 'data', 'dups.json'), encoding='utf-8'))
NEWCOLS = ['MQ31', 'MQ32', 'MQ33', 'MQ34', 'QK5', 'QJ5']
SLUG = {'عمالي': 'labour', 'تجاري': 'commercial', 'مدني': 'civil', 'إداري': 'administrative', 'أحوال شخصية': 'personal-status',
        'طلبات رجال القضاء': 'judiciary', 'جزائي': 'criminal'}


def norm_search(s):
    s = re.sub(r'[ً-ْـ]', '', s); s = re.sub('[أإآ]', 'ا', s); s = s.replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return re.sub(r'\s+', ' ', s).strip()


# ---------- 1.5
old_packs = {}
for f in sorted(glob.glob(os.path.join(PK, f'mabadi-pack_*_v{PREV}*.json'))):
    P = json.load(open(f, encoding='utf-8'))
    b = P['pack']
    if b not in old_packs: old_packs[b] = {k: v for k, v in P.items() if k not in ('items', 'rulings', 'part', 'counts')}; old_packs[b]['items'] = []
    old_packs[b]['items'] += P['items']
    if P.get('deleted_items'): old_packs[b]['deleted_items'] = P['deleted_items']
OLD = {i['id']: i for P in old_packs.values() for i in P['items']}

# ---------- العناصر الجديدة من بيانات الموقع
RX = {}
for f in glob.glob(os.path.join(ROOT, 'data', 'rx', '*.json')): RX.update(json.load(open(f, encoding='utf-8')))
TL, LL = M['toplab'], M['lawlab']
METH = {'b': 'book', 'k': 'keyword', 'a': 'ai'}
BR = lambda ch: ch if ch in SLUG else None


def appeals_of(k):
    ap = k.split('@')[0]; by = collections.OrderedDict()
    for x in ap.split('+'):
        if '/' not in x: continue
        n, y = x.split('/')[:2]
        try: by.setdefault(int(y), []).append(int(n))
        except ValueError: pass
    return [{'numbers': v, 'year': y} for y, v in by.items()]


def printed(col, g):
    for d in M['cols'][col].get('docs', []):
        if d['first'] <= g <= d['last']:
            pn = d.get('pn'); v = pn[g - d['first']] if pn else None
            return v if v else g - d['first'] + 1
    return g + M['cols'][col].get('off', 0)


def doc_label(col, g):
    for d in M['cols'][col].get('docs', []):
        if d['first'] <= g <= d['last']: return d.get('label')
    return None


def convert(x):
    col = x['col']
    cits = []
    for c in x['c']:
        o = {'raw': c['raw']}
        if c.get('ch'): o['chamber'] = c['ch']; o['chamber_raw'] = c['ch']
        k = c.get('k')
        if k:
            o['appeals'] = appeals_of(k)
            if '@' in k: o['session'] = k.split('@')[1]; o['ruling_key'] = k
        cits.append(o)
    rule = x.get('rule') if 'rule' in x else RX.get(x['id'])
    has_mujaz = not (col in ('QK5', 'QJ5') and not x['src'].get('sn'))
    paras = x['p'] if isinstance(x['p'], list) else [x['p']]
    it = {'id': x['id'], 'source': col, 'kind': 'mujaz_and_rule' if has_mujaz else 'rule_without_mujaz',
          'number': x['n'], 'number_printed': x.get('np'), 'section': x['sec']}
    if x.get('ttl'): it['title'] = x['ttl']
    if has_mujaz:
        it['paragraphs'] = paras
        if rule: it['rule_text'] = rule
    else:  # لا موجز في المصدر: نص القاعدة وحده في paragraphs
        it['paragraphs'] = paras + ([p for p in (rule or '').split('\n') if p])
    it['citations'] = cits
    if x.get('cp'): it['citation_positions'] = x['cp']
    if x.get('sa'): it['see_also'] = x['sa']
    if x.get('fn'): it['footnotes'] = x['fn']
    if x['src'].get('pfrom'): it['mujaz_from'] = x['src']['pfrom']
    it['branches'] = sorted({c['chamber'] for c in cits if BR(c.get('chamber'))})
    it['pages'] = x['pg']
    it['printed_pages'] = [printed(col, g) for g in x['pg']]
    lab = doc_label(col, x['pg'][0]) if x['pg'] else None
    if lab: it['page_doc'] = lab
    it['review'] = {'required': bool(x['rv']), 'reasons': x['rv']}
    it['related'] = list(x.get('rel') or [])
    it['topics'] = [dict({'id': t, 'path': TL[t], 'method': METH.get(m, m)}, **({'confidence': 'low'} if lo else {})) for t, m, lo in x['tp'] if t in TL]
    it['laws'] = [dict({'law': l, 'label': LL.get(l, l), 'articles': a}, **({'suspect': True} if su else {})) for l, a, su in x['lw']]
    kw = x.get('ttl') or ('. '.join(s for s in x['sec'] if s) if col in ('QK5', 'QJ5') else '')
    if kw: it['keywords'] = kw
    it['search_text'] = norm_search(' '.join([it.get('title', ''), ' '.join(it['paragraphs']), it.get('rule_text', ''), ' '.join(c['raw'] for c in cits)]))
    return it


NEW = {}
for col in NEWCOLS:
    for x in json.load(open(os.path.join(ROOT, 'data', col + '.json'), encoding='utf-8')): NEW[x['id']] = convert(x)

# ---------- المحذوف لتكراره
GONE = {i: t for i, t in ALIAS.items() if i in OLD}
REASON = 'مكرر: المبدأ نفسه من الحكم نفسه (رقم الطعن وجلسته) بالموجز نفسه، ويحمل الموضع الباقي كل إسناداته؛ يبقى في مجلة القضاء والقانون أو مجموعة القواعد إن ورد فيهما، وإلا في أسبق الكتب (قرار 2/10/2026)'
ALL = {}
for i, it in OLD.items():
    if i not in GONE: ALL[i] = json.loads(json.dumps(it, ensure_ascii=False))
ALL.update(NEW)
# الموضع الباقي قد يكون عنصرًا في الموقع لم يدخل حزم 1.5 (بلا دائرة): يُحوَّل من بيانات الموقع
SITE = {}
for t in set(GONE.values()):
    if t not in ALL:
        if not SITE:
            for col in M['order']:
                if col in NEWCOLS: continue
                for x in json.load(open(os.path.join(ROOT, 'data', col + '.json'), encoding='utf-8')): SITE[x['id']] = x
        if t in SITE: ALL[t] = convert(SITE[t]); ALL[t]['kind'] = 'principle'
for i, t in GONE.items():  # موضوعات المحذوف إلى الباقي
    tgt = ALL.get(t)
    if not tgt: continue
    have = {x['id'] for x in tgt.get('topics', [])}
    for x in OLD[i].get('topics', []):
        if x['id'] not in have: tgt.setdefault('topics', []).append(x); have.add(x['id'])
# الإحالات
for it in ALL.values():
    r = []
    for j in it.get('related', []):
        j = ALIAS.get(j, j)
        if j != it['id'] and j in ALL and j not in r: r.append(j)
    it['related'] = sorted(r)

# ---------- المبدأ نفسه والمتواتر (data/dups.json)
RK = lambda i: {c.get('ruling_key') for c in ALL[i]['citations'] if c.get('ruling_key')}
for g in DUPS:
    g = [i for i in g if i in ALL]
    for i in g:
        same = [j for j in g if j != i and RK(i) & RK(j)]
        tw = [j for j in g if j != i and not (RK(i) & RK(j))]
        if same: ALL[i]['same_principle'] = same
        if tw: ALL[i]['tawatur'] = tw  # الأحدث أولًا كما في dups.json

# ---------- توزيع الحزم
member = collections.defaultdict(set)
for b, P in old_packs.items():
    for x in P['items']:
        if x['id'] in ALL: member[b].add(x['id'])
for i, it in NEW.items():
    for b in it['branches']:
        if b in old_packs: member[b].add(i)
# عناصر إضافية في حزمة العمالي (العقد 1.4): المحذوف منها يُستبدل بالباقي
extra = []
for e in old_packs['عمالي'].get('extra_items', []):
    j = ALIAS.get(e['id'], e['id'])
    if j in ALL:
        member['عمالي'].add(j); extra.append({'id': j, 'reason': e['reason'].replace('«عمّالي»', '«مداولة»')})

SOURCES = {}
for P in old_packs.values(): SOURCES.update(P['sources'])
for col in NEWCOLS:
    c = M['cols'][col]
    SOURCES[col] = {'title': c['title'], 'publisher': 'وزارة العدل — المكتب الفني لمحكمة التمييز', 'kind': 'مجلة رسمية' if col.startswith('MQ') else 'مجموعة رسمية',
                    'page_offset': 0, 'note': 'printed_pages: رقم الصفحة داخل ملف العدد، وpage_doc: العدد والقسم' if col.startswith('MQ') else
                    'printed_pages: رقم صفحة الكتاب المطبوع (من تذييل ملف Word)، وpage_doc: ملف الموضوع؛ لا صورة صفحة (المصدر ملف Word نصه منقول كما هو)'}


def laws_index(sel):
    c = collections.Counter(); lab = {}
    for i in sel:
        for l in i.get('laws', []): c[l['law']] += 1; lab[l['law']] = l['label']
    return [{'law': k, 'label': lab[k], 'items': n} for k, n in c.most_common()]


def rulings_of(sel):
    R = collections.defaultdict(lambda: {'items': set(), 'appeals': None, 'session': None, 'chambers': set()})
    for it in sel:
        for c in it['citations']:
            k = c.get('ruling_key')
            if not k: continue
            r = R[k]; r['items'].add(it['id']); r['appeals'] = c.get('appeals'); r['session'] = c.get('session')
            if c.get('chamber') in SLUG: r['chambers'].add(c['chamber'])
    return [{'key': k, 'appeals': v['appeals'], 'session': v['session'], 'chambers': sorted(v['chambers']), 'items': sorted(v['items'])} for k, v in sorted(R.items())]


for f in glob.glob(os.path.join(PK, f'mabadi-pack_*_v{V}*.json')): os.remove(f)
man = []; log = []
for b, P0 in old_packs.items():
    # الموضع الباقي لكل محذوف من هذه الحزمة يدخلها، وإن كان من دائرة أخرى (يُسرد في extra_items)
    prev0 = {x['id'] for x in P0['items']}
    xr = []
    for i in sorted(prev0):
        t = GONE.get(i)
        if t and t in ALL and t not in member[b]: member[b].add(t); xr.append(t)
    ids = member[b]
    # الترتيب: ترتيب 1.5 ثم الجديد بترتيب المجموعات
    order = [x['id'] for x in P0['items'] if x['id'] in ids] + [i for i in NEW if i in ids]
    order += [i for i in sorted(ids) if i not in set(order)]  # المواضع الباقية من دوائر أخرى والعناصر الإضافية
    sel = [ALL[i] for i in order]
    prev_ids = {x['id'] for x in P0['items']}
    added = [i for i in order if i not in prev_ids]
    dele = [{'id': i, 'deleted_in': V, 'last_version': PREV, 'reason': REASON, 'replaced_by': GONE[i]} for i in sorted(prev_ids) if i in GONE]
    upd = sum(1 for i in order if i in prev_ids and json.dumps(ALL[i], sort_keys=True, ensure_ascii=False) != json.dumps(OLD[i], sort_keys=True, ensure_ascii=False))
    dele_all = (P0.get('deleted_items') or []) + dele  # يبقى المحذوف في 1.5 (المؤلفات الخاصة) مسرودًا
    cl = {'version': V, 'previous': PREV, 'date': TODAY, 'items_before': len(prev_ids), 'items_after': len(sel), 'added': len(added),
          'deleted': len(dele), 'updated': upd,
          'added_by_source': dict(collections.Counter(i.split('-')[0] for i in added)),
          'notes': ['أُضيفت «مجلة القضاء والقانون» (2003–2006) و«مجموعة القواعد القانونية — القسم الخامس» (2002–2006)، ومع كل مبدأ نص القاعدة (rule_text).',
                    'حُذف المكرر: deleted_items مع replaced_by؛ انقلوا طبقة القاضي (الملاحظات والروابط) إلى المعرّف الباقي.',
                    'حقول جديدة: same_principle، tawatur (الأحدث أولًا)، keywords، page_doc، mujaz_from.']}
    rs = rulings_of(sel)
    head = {'format': 'mabadi-pack', 'schema_version': V, 'pack': b, 'generated': TODAY, 'producer': 'مكتبة مبادئ التمييز',
            'sources': {k: v for k, v in SOURCES.items() if any(i['source'] == k for i in sel)}, 'taxonomy': P0['taxonomy'],
            'laws_index': laws_index(sel), 'changelog': cl}
    ex_b = (extra if b == 'عمالي' else []) + [{'id': t, 'reason': 'الموضع الباقي لمبدأ محذوف لتكراره من هذه الحزمة (replaced_by)، وهو من دائرة أخرى'} for t in xr if t not in {e['id'] for e in extra}]
    if ex_b: head['extra_items'] = ex_b
    whole = dict(head, counts={'items': len(sel), 'rulings': len(rs), 'needs_review': sum(1 for i in sel if i['review']['required'])}, deleted_items=dele_all, items=sel, rulings=rs)
    s = json.dumps(whole, ensure_ascii=False, separators=(',', ':')).encode()
    parts = 1 if len(s) <= LIMIT else math.ceil(len(s) / LIMIT)
    # التجزئة بالحجم لا بالعدد (عناصر المجموعات الجديدة أكبر لأن معها نص القاعدة)
    sz = [len(json.dumps(i, ensure_ascii=False, separators=(',', ':')).encode()) for i in sel]
    tot = sum(sz); cuts = [0]; acc = 0
    for k, z in enumerate(sz):
        acc += z
        if len(cuts) < parts and acc >= tot * len(cuts) / parts: cuts.append(k + 1)
    cuts = (cuts + [len(sel)])[:parts + 1]
    if cuts[-1] != len(sel): cuts.append(len(sel))
    parts = len(cuts) - 1
    for n in range(parts):
        sub = sel[cuts[n]:cuts[n + 1]]; sid = {i['id'] for i in sub}
        Q = dict(head)
        rsub = [r for r in rs if set(r['items']) & sid]
        Q['counts'] = {'items': len(sub), 'rulings': len(rsub), 'needs_review': sum(1 for i in sub if i['review']['required'])}
        if parts > 1: Q['part'] = {'n': n + 1, 'of': parts, 'items_total': len(sel)}
        if n == 0 and dele_all: Q['deleted_items'] = dele_all
        Q['items'] = sub; Q['rulings'] = rsub
        name = f'mabadi-pack_{SLUG[b]}_v{V}' + (f'_part{n + 1}of{parts}' if parts > 1 else '') + '.json'
        data = json.dumps(Q, ensure_ascii=False, separators=(',', ':')).encode()
        open(os.path.join(PK, name), 'wb').write(data)
        e = {'file': name, 'pack': b, 'schema_version': V, 'generated': TODAY, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'counts': Q['counts']}
        if parts > 1: e['part'] = Q['part']
        if n == 0: e['changelog'] = cl
        man.append(e)
    log.append((b, cl, parts, len(s)))
    print(b, 'items', len(sel), '+', len(added), '-', len(dele), 'updated', upd, 'parts', parts, round(len(s) / 1e6, 1), 'MB')

# المثال
ex = json.load(open(os.path.join(PK, 'mabadi-pack_example.json'), encoding='utf-8'))
ex_ids = [ALIAS.get(i['id'], i['id']) for i in ex['items'] if not i['id'].startswith(('DOM', 'MDK'))] + ['MQ31-0004', 'QK5-00006']
ex_ids = [i for i in dict.fromkeys(ex_ids) if i in ALL]
exs = [ALL[i] for i in ex_ids]
E = {'format': 'mabadi-pack', 'schema_version': V, 'pack': 'مثال', 'generated': TODAY, 'producer': 'مكتبة مبادئ التمييز',
     'sources': {k: v for k, v in SOURCES.items() if any(i['source'] == k for i in exs)}, 'taxonomy': ex['taxonomy'],
     'counts': {'items': len(exs)}, 'laws_index': laws_index(exs), 'items': exs, 'rulings': rulings_of(exs)}
json.dump(E, open(os.path.join(PK, 'mabadi-pack_example.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

mf = json.load(open(os.path.join(PK, 'manifest.json'), encoding='utf-8'))
mf['schema_version'] = V; mf['updated'] = TODAY; mf['packs'] = man
json.dump(mf, open(os.path.join(PK, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# سجل التغييرات المقروء
L = [f'# الحزم {V} — {TODAY}', '', '| الحزمة | قبل | بعد | مضاف | محذوف | معدّل | الملفات | الحجم |', '|---|---|---|---|---|---|---|---|']
for b, cl, parts, size in log:
    L.append(f"| {b} | {cl['items_before']:,} | {cl['items_after']:,} | {cl['added']:,} | {cl['deleted']:,} | {cl['updated']:,} | {parts} | {size / 1e6:.1f} م.ب |")
L += ['', '## ما الجديد'] + ['- ' + n for n in log[0][1]['notes']]
L += ['- المعدّل: عناصر بقيت وتغيّرت إحالاتها (related) أو أُضيفت إليها موضوعات من المحذوف أو حقلا same_principle وtawatur.',
      '- الحزمة فوق 12 م.ب تُجزّأ (العقد §8)؛ deleted_items في الجزء الأول.']
open(os.path.join(PK, f'CHANGELOG_v{V}.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
print('manifest', len(man), 'files', sum(e['bytes'] for e in man) // 1_000_000, 'MB')
