#!/usr/bin/env python3
"""إصلاحات بنيوية في نصوص طبعة وزارة العدل (data/laws)، لا تغيّر حرفًا من النص:
1) فصل مواد التصقت بالمادة السابقة لأن سطر عنوانها جاء في أول فقرة (مثل «مادة (٣)١ …» حيث «١» علامة حاشية)،
   أو جاء في الديباجة («مادة (١)١» في 11/1988).
2) قانون الجزاء: الطبعة تذكر «المواد من (٩٢ – ١٠٨) ألغيت» و«( المواد من ١١٤ إلى ١٢٥) ألغيت» مع حاشيتيهما؛
   تُضاف هذه المواد سجلاتٍ ملغاة (بلا نص) والحاشية منقولة حرفيًا من الطبعة.
السكربت قابل للتكرار: لا يكرر ما سبق إصلاحه. الاستعمال: python3 tools/fix/repair_moj.py
"""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LAWS = os.path.join(ROOT, 'data', 'laws')
AR = '٠١٢٣٤٥٦٧٨٩'
toA = lambda n: ''.join(AR[int(c)] for c in str(n))
fromA = lambda s: int(s.translate(str.maketrans(AR, '0123456789')))
LAB = re.compile(r'^\(?\s*(?:ال)?مادة\s*\(?\s*([٠-٩\d]+)\s*\)?\s*((?:مكرر(?:اً|ًا|ا|ً)?)\s*(?:\(\s*[٠-٩\d]+\s*\)|/\s*أ|[٠-٩](?=\s)|أ|ب|ج)?)?\s*\)?\s*([١*×]+)?\s*:?\s*(.*)$')


def load(lid):
    with open(os.path.join(LAWS, lid + '.json'), encoding='utf-8') as f:
        return json.load(f)


def save(lid, d):
    with open(os.path.join(LAWS, lid + '.json'), 'w', encoding='utf-8') as f:
        json.dump(d, f, ensure_ascii=False, separators=(',', ':'))


def new_art(base, label_txt, n, bis, paras, ids):
    if bis:
        k = 1
        while f"{base}-A{n:04d}-{k}" in ids:
            k += 1
        aid = f"{base}-A{n:04d}-{k}"
    else:
        aid = f"{base}-A{n:04d}"
    assert aid not in ids, aid
    return aid


def split_law(lid, targets):
    """targets: [(article_id or 'PREAMBLE', paragraph index)] — يُفصل من تلك الفقرة إلى آخر المادة مادةً جديدة."""
    d = load(lid)
    ids = {a['id'] for a in d['articles']}
    changed = 0
    for src, pi in targets:
        if src == 'PREAMBLE':
            pre = d['preamble']
            if pi >= len(pre):
                continue
            m = LAB.match(pre[pi])
            if not m:
                continue
            n = fromA(m.group(1))
            body = ([m.group(4)] if m.group(4).strip() else []) + pre[pi + 1:]
            d['preamble'] = pre[:pi]
            first = d['articles'][0]
            rec = dict(first, id=new_art(lid, '', n, None, body, ids), n=n, label=f'مادة {toA(n)}', bis=None, rep=None, paras=body,
                       notes=None, split_from='preamble')
            d['articles'].insert(0, rec)
            ids.add(rec['id'])
            changed += 1
            continue
        idx = next((i for i, a in enumerate(d['articles']) if a['id'] == src), None)
        if idx is None:
            continue
        a = d['articles'][idx]
        if pi >= len(a['paras']):
            continue
        m = LAB.match(a['paras'][pi])
        if not m:
            continue
        n = fromA(m.group(1))
        bis = (m.group(2) or '').strip() or None
        body = ([m.group(4)] if m.group(4).strip() else []) + a['paras'][pi + 1:]
        a['paras'] = a['paras'][:pi]
        label = ('مادة ' + toA(n) + (' ' + bis if bis else ''))
        if a.get('issue'):
            k = 1
            while f'{lid}-I{k}' in ids:
                k += 1
            nid = f'{lid}-I{k}'
            label = m.group(0)[:m.group(0).find(m.group(4))].strip() if m.group(4) else a['paras'][pi].strip()
            label = re.sub(r'\s*[١*×]\s*$', '', label.replace(')×', ')').replace(') ×', ')')).strip()
        else:
            nid = new_art(lid, '', n, bis, body, ids)
        rec = dict(a, id=nid, n=n, label=label, bis=bis, rep=None, paras=body, notes=None, split_from=a['id'])
        d['articles'].insert(idx + 1, rec)
        ids.add(rec['id'])
        changed += 1
    if changed:
        # المعرّفات الجديدة للمكررات بترتيب ورودها، دون مساس بالمعرّفات القائمة
        keep = {a['id'] for a in d['articles'] if not a.get('split_from')}
        for n in {a['n'] for a in d['articles'] if a.get('split_from') and a.get('bis') and not a.get('issue')}:
            k = 1
            for a in d['articles']:
                if a['n'] == n and a.get('bis') and a.get('split_from') and not a.get('issue'):
                    while f"{lid}-A{n:04d}-{k}" in keep:
                        k += 1
                    a['id'] = f"{lid}-A{n:04d}-{k}"
                    keep.add(a['id'])
        save(lid, d)
    return changed


def penal_ranges():
    lid = 'LAW-16-1960'
    d = load(lid)
    have = {a['n'] for a in d['articles'] if not a.get('issue')}
    pdf = d['page_meta']['pdf']
    ranges = [((92, 108), 38, 109, ['المواد من (٩٢ – ١٠٨) ألغيت', 'ملغاة بالقانون رقم ٣١ لسنة ١٩٧٠ وحل محلها المواد من ( ١ – ٣٤) من القانون رقم ٣١ لسنة ١٩٧٠ .']),
              ((114, 125), 40, 126, ['( المواد من ١١٤ إلى ١٢٥) ألغيت', 'ألغيت بموجب القانون رقم ٣١ لسنة ١٩٧٠'])]
    added = 0
    for (a0, a1), pdfp, nxt, notes in ranges:
        page = pdf.index(pdfp) + 1 if pdfp in pdf else None
        ref = next(a for a in d['articles'] if a['n'] == nxt and not a.get('issue'))
        at = d['articles'].index(ref)
        for n in range(a1, a0 - 1, -1):
            if n in have:
                continue
            d['articles'].insert(at, {'id': f'{lid}-A{n:04d}', 'n': n, 'label': f'مادة {toA(n)}', 'bis': None, 'issue': None, 'rep': True,
                                      'trail': ref['trail'], 'paras': [], 'notes': notes, 'pages': [page] if page else [], 'rg': [],
                                      'range_note': f'{toA(a0)}–{toA(a1)}'})
            added += 1
    if added:
        save(lid, d)
    return added


def evidence_notes():
    """حاشيتا الطبعة على المادتين ٣٩ و٤٠ من قانون الإثبات 39/1980 (ص ٣٤٨ من الطبعة) وحاشية النشر على العنوان (ص ٣٣٧):
    منقولة حرفيًا من طبقة النص في ملف الوزارة، وكان المحلل القديم قد أغفلها لأن علامتها «(*)» في سطر مستقل."""
    lid = 'LAW-39-1980'
    d = load(lid)
    N = {39: 'عدل نصاب قيمة التصرف الوارد بالمادة إلى خمسة آلاف وذلك بالقانون رقم ١ لسنة ١٩٩٧ المنشور بالكويت اليوم بالعدد ٣٠٢ السنة ٤٣ بعد ان كان خمسمائة دينار.',
         40: 'عدل نصاب القيمة الوارد في الفقرتين الأولى والبند ثالثاً بالقانون رقم ١ لسنة ١٩٩٧ المنشور بالكويت اليوم بالعدد ٣٠٢ السنة ٤٣الى خمسة آلاف دينار بعد أن كانت خمسمائة.'}
    ch = 0
    for a in d['articles']:
        if a['n'] in N and not a.get('issue') and not a.get('notes'):
            a['notes'] = [N[a['n']]]
            ch += 1
    pub = 'نشر بالجريدة الرسمية – الكويت اليوم – بالعدد ١٣٠٧ سنة ٢٦ في ١٩٨٠/٦/٢٥م'
    if pub not in (d.get('notes') or []):
        d['notes'] = (d.get('notes') or []) + [pub]
        ch += 1
    if ch:
        save(lid, d)
    return ch


def recount():
    """تحديث عدد المواد في index.json بعد الفصل والإضافة"""
    p = os.path.join(LAWS, 'index.json')
    I = json.load(open(p, encoding='utf-8'))
    ch = 0
    for x in I['laws']:
        d = load(x['id'])
        n = len([a for a in d['articles'] if not a.get('issue')])
        if x.get('articles') != n and x.get('src') != 'gazette':
            x['articles'] = n
            ch += 1
    if ch:
        json.dump(I, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return ch


if __name__ == '__main__':
    S = {
        'LAW-11-1988': [('PREAMBLE', 8), ('LAW-11-1988-A0007', 1), ('LAW-11-1988-A0002', 2)],
        'LAW-16-1960': [('LAW-16-1960-I1', 1)],
        'LAW-61-1976': [('LAW-61-1976-A0019-1', 4), ('LAW-61-1976-A0024-1', 3)],
        'LAW-5-1959': [('LAW-5-1959-A0012', 7), ('LAW-5-1959-A0012', 2), ('LAW-5-1959-A0011', 7), ('LAW-5-1959-A0011', 6), ('LAW-5-1959-A0011', 4), ('LAW-5-1959-A0011', 1)],
        'LAW-69-1980': [('LAW-69-1980-A0010-1', 1)],
        'REG-admin-145': [('REG-admin-145-A0011', 1)],
    }
    for lid, t in S.items():
        print(lid, 'مواد مفصولة:', split_law(lid, t))
    print('LAW-16-1960 مواد ملغاة أضيفت:', penal_ranges())
    print('LAW-39-1980 حواشٍ أضيفت:', evidence_notes())
    print('index.json: تحديث أعداد المواد:', recount())
