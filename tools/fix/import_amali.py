#!/usr/bin/env python3
"""استيراد مساهمة «عمّالي» في التشريعات (amali-legis-contrib, mabadi-legis-pack 1.0) إلى data/laws.

القواعد:
- يُستورد ما ليس في المكتبة فقط. قانون العمل 6/2010 موجود بنصه الأصلي، فلا يُستبدل؛ تُسجَّل عليه تعديلات القوانين المعدِّلة المستوردة.
- كل وثيقة مستوردة تحمل مصدرها: «مساهمة «عمّالي» — منقولة بصريًا ولم تُطابَق مع صفحات الجريدة»، ولا صورة صفحة لها في المكتبة.
- النصوص تُنقل حرفيًا كما في الملف. لا دمج ولا تصحيح.
- تُكتب أحداث التعديل والإلغاء في tools/gazette/gz/amend_extra.json، ثم يُشغَّل amend.py لدمجها.
الاستعمال: python3 tools/fix/import_amali.py <amali-legis-contrib_v1.0.json>
"""
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LAWS = os.path.join(ROOT, 'data', 'laws')
EXTRA = os.path.join(ROOT, 'tools', 'gazette', 'gz', 'amend_extra.json')
AR = '٠١٢٣٤٥٦٧٨٩'
toA = lambda n: ''.join(AR[int(c)] for c in str(n))
MON = {'يناير': 1, 'فبراير': 2, 'مارس': 3, 'أبريل': 4, 'ابريل': 4, 'مايو': 5, 'يونيو': 6, 'يوليو': 7, 'أغسطس': 8, 'اغسطس': 8, 'سبتمبر': 9, 'أكتوبر': 10, 'اكتوبر': 10, 'نوفمبر': 11, 'ديسمبر': 12}
SRC = 'مساهمة «عمّالي»'


def gdate(label):
    m = re.search(r'الموافق\s+(\d{1,2})\s+(\S+)\s+(\d{4})', label or '')
    if m and m.group(2) in MON:
        return f'{m.group(3)}-{MON[m.group(2)]:02d}-{int(m.group(1)):02d}'
    m = re.search(r'(?:صدر في:?|مؤرخ)\s*(\d{4})/(\d{1,2})/(\d{1,2})', label or '') or re.search(r'–\s*(\d{4})/(\d{1,2})/(\d{1,2})\s*$', label or '')
    if m:
        return f'{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}'
    m = re.search(r'صدر في:?\s*(\d{1,2})\s+(\S+)\s+(\d{4})', label or '')
    if m and m.group(2) in MON:
        return f'{m.group(3)}-{MON[m.group(2)]:02d}-{int(m.group(1)):02d}'
    return None


def gazette_issue(label):
    m = re.search(r'العدد\s+(\d+)', label or '')
    return m.group(1) if m else None


def short_of(t):
    s = re.sub(r'^(?:ال)?(?:قانون|القرار|قرار)\s+(?:الوزاري|الإداري)?\s*رقم\s+\d+\s+لسنة\s+\d{4}\s*', '', t).strip()
    s = re.sub(r'^(في شأن|بشأن|ب)\s*', '', s)
    return s[:90] or t[:90]


def main(path):
    C = json.load(open(path, encoding='utf-8'))
    I = json.load(open(os.path.join(LAWS, 'index.json'), encoding='utf-8'))
    I['laws'] = [x for x in I['laws'] if x.get('src') != 'amali']   # إعادة الاستيراد تستبدل ما سبق
    have = {x['id'] for x in I['laws']}
    imported = {}
    for x in C['legislations']:
        if x['id'] in have:
            continue
        lid = x['id']
        is_reg = x['category'] == 'reg'
        key = lid if is_reg else x['key']
        src = x.get('source') or {}
        issued = gdate(src.get('label'))
        arts = []
        seen = set()
        sig = []
        for a in x['articles']:
            n = a.get('number')
            aid = f"{lid}-A{(n or 0):04d}"
            k = 1
            while aid in seen:
                aid = f"{lid}-A{(n or 0):04d}-{k}"
                k += 1
            seen.add(aid)
            trail = [t for t in (a.get('chapter_path') or []) if t and t.strip() not in x['title'] and x['title'].find(t.strip()) < 0]
            body = a.get('text_in_force') or a.get('original_text') or []
            if isinstance(body, str):
                body = [body]
            # «ملخص» المذكرة ليس نصًا حرفيًا فلا يُستورد؛ وأسطر التوقيع في آخر الوثيقة تنتقل إلى التوقيع
            body = [p for p in body if not p.startswith('المذكرة الإيضاحية (ملخصها')]
            cut = next((i for i, p in enumerate(body) if i > 0 and (p.strip() in ('أمير الكويت', 'نائب الأمير') or re.match(r'^(المدير العام|مدير عام) ', p))), None)
            if cut is not None:
                sig += body[cut:]
                body = body[:cut]
            arts.append({'id': aid, 'n': n, 'label': a.get('label') or f'مادة {toA(n)}', 'bis': a.get('suffix'), 'issue': None,
                         'rep': True if a.get('repealed') or a.get('status') == 'ملغاة' else None, 'trail': trail or None,
                         'paras': body, 'notes': None, 'pages': [], 'rg': [],
                         'review': [r for r in (a.get('review_reasons') or []) if 'لم يُدمج التعديل' not in r] or None if a.get('needs_review') else None})
        note = (x.get('verification_note') or '') + ' لا صورة صفحة لهذه الوثيقة في المكتبة.'
        doc = {'cat': 'reg' if is_reg else 'law', 'id': lid, 'key': key, 'type': x['type'], 'number': x.get('number'), 'year': x.get('year'),
               'short': short_of(x['title']), 'title': x['title'], 'issued': issued, 'issued_hijri': None,
               'status': 'ملغى' if x.get('status') == 'ملغى' else 'نافذ',
               'text_version': f'النص كما نقله «عمّالي» بصريًا ({src.get("label", "")[:160]})، ولم يُطابَق مع صفحات الجريدة الرسمية.',
               'source': {'kind': SRC, 'label': src.get('label'), 'issue': gazette_issue(src.get('label')), 'date': None, 'note': note},
               'annex': None, 'preamble': x.get('preamble') or [], 'title_lines': [x['title']], 'toc': [], 'articles': arts,
               'signature': sig, 'notes': x.get('known_issues') or [], 'pages_col': None, 'page_meta': None, 'group': x.get('group'),
               'contrib': 'amali', 'verified_against_gazette': False}
        with open(os.path.join(LAWS, lid + '.json'), 'w', encoding='utf-8') as f:
            json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
        ent = {'cat': doc['cat'], 'id': lid, 'key': key, 'type': x['type'], 'number': x.get('number'), 'year': x.get('year'), 'short': doc['short'],
               'title': x['title'], 'issued': issued, 'status': doc['status'], 'articles': len(arts), 'group': x.get('group'),
               'text_version': doc['text_version'], 'ver': f"{SRC} — لم تُطابَق مع الجريدة", 'memo': False, 'src': 'amali'}
        I['laws'].append(ent)
        imported[lid] = (doc, key, issued)
    with open(os.path.join(LAWS, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(I, f, ensure_ascii=False, indent=1)

    # أحداث التعديل والإلغاء
    BY = {x['id']: x for x in C['legislations']}
    IDX = {x['id']: x for x in I['laws']}
    events, repeals = [], []
    LAB = re.compile(r'^\(?\s*(?:ال)?مادة\s*\(?\s*([٠-٩\d]+|السادسة|السابعة)')
    ORD = {'السادسة': 6, 'السابعة': 7}

    def find_art(by_id, n):
        doc = json.load(open(os.path.join(LAWS, by_id + '.json'), encoding='utf-8'))
        for a in doc['articles']:
            for p in a['paras'][1:]:
                m = LAB.match(p)
                if m and len(p) < 60:
                    v = ORD.get(m.group(1)) or int(m.group(1).translate(str.maketrans(AR, '0123456789')))
                    if v == n:
                        return a['id']
        for a in doc['articles']:   # جملة التعديل تذكر رقم المادة: «تضاف إلى المادة (146)…»، «تعدل المادة رقم (6)…»، «المادة السابعة»
            head = ' '.join(a['paras'][:2])
            if re.search(r'(?:المادة|المادتين|المواد)\s*(?:رقم\s*)?\(\s*' + str(n) + r'\s*\)', head) or (n in (6, 7) and {6: 'السادسة', 7: 'السابعة'}[n] in head):
                return a['id']
        return doc['articles'][0]['id']

    plan = [  # (المعدِّل، القانون الأصلي، المادة، طريقة التعديل، النطاق) — من حقل amends في المساهمة
        ('LAW-90-2013', 'LAW-6-2010', 9, 'استبدال', None), ('LAW-90-2013', 'LAW-6-2010', 10, 'استبدال', None),
        ('LAW-108-2013', 'LAW-6-2010', 10, 'استبدال', None),
        ('LAW-32-2016', 'LAW-6-2010', 57, 'استبدال', None), ('LAW-32-2016', 'LAW-6-2010', 138, 'استبدال', None),
        ('LAW-32-2016', 'LAW-6-2010', 140, 'استبدال', None), ('LAW-32-2016', 'LAW-6-2010', 142, 'استبدال', None),
        ('LAW-32-2016', 'LAW-6-2010', 146, 'إضافة فقرة', 'فقرة أخيرة'),
        ('LAW-85-2017', 'LAW-6-2010', 51, 'استبدال', 'الفقرة الأخيرة'), ('LAW-85-2017', 'LAW-6-2010', 70, 'استبدال', None),
        ('LAW-17-2018', 'LAW-6-2010', 51, 'استبدال', 'الفقرة الأخيرة'),
        ('REG-PAM-378-2016', 'REG-PAM-842-2015', 6, 'استبدال', None),
        ('REG-PAM-680-2026', 'REG-PAM-842-2015', 7, 'إضافة فقرة', 'فقرة أخيرة'),
    ]
    for by_id, base_id, n, how, part in plan:
        if by_id not in IDX or base_id not in IDX:
            continue
        b = IDX[by_id]
        events.append({'by_key': b['key'], 'by_id': by_id, 'by_art': find_art(by_id, n), 'base_key': IDX[base_id]['key'], 'base_id': base_id,
                       'art': n, 'how': how, 'part': part, 'date': b.get('issued'), 'short': b['short'], 'src': 'amali'})
    if 'REG-MIN-2194-2016' in IDX and 'REG-MIN-22-2022' in IDX:
        b = IDX['REG-MIN-22-2022']
        doc = json.load(open(os.path.join(LAWS, 'REG-MIN-22-2022.json'), encoding='utf-8'))
        art3 = next((a['id'] for a in doc['articles'] if a['n'] == 3), None)
        repeals.append({'base_key': IDX['REG-MIN-2194-2016']['key'], 'by_key': b['key'], 'by_id': 'REG-MIN-22-2022', 'by_art': art3,
                        'date': b.get('issued'), 'short': b['short'], 'src': 'amali'})
    json.dump({'events': events, 'repeals': repeals}, open(EXTRA, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('وثائق مستوردة:', len(imported), '— أحداث تعديل:', len(events), '— إلغاء:', len(repeals))


if __name__ == '__main__':
    main(sys.argv[1])
