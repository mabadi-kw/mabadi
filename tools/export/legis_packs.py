#!/usr/bin/env python3
"""حزم التشريعات لتطبيق «عمّالي» (mabadi-legis-pack 1.0).

يقرأ data/laws/ (index.json ونصوص التشريعات وamend.json) ويكتب:
  packs/legis/mabadi-legis_<slug>_v1.0.json   — حزمة لكل مجموعة
  packs/legis/mabadi-legis-index_v1.0.json    — الملف التعريفي

قواعد النزاهة:
- لا يُكتب نص لم يرد حرفيًا في مصدر: لا دمج آلي لفقرة أو بند أو عبارة في نص مادة.
  النص النافذ يُعطى فقط حين يكون منشورًا كاملًا (النص الأصلي، أو نص الطبعة، أو نص استبدال كامل في الجريدة).
  وما سواه: text_in_force = null مع نص التعديل كما نُشر، وعلامة «يحتاج دمجًا».
- كل تشريع يحمل verified_against_gazette، وهي true فقط لما استُخرج من ملف الجريدة الرسمية نفسه.
الاستعمال: python3 tools/export/legis_packs.py
"""
import json, os, re, hashlib, datetime, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LAWS = os.path.join(ROOT, 'data', 'laws')
OUT = os.path.join(ROOT, 'packs', 'legis')
VER = '1.0'
TODAY = datetime.date.today().isoformat()

SLUG = {'الجزائي': 'criminal', 'الجهاز الإداري للدولة': 'state-administration', 'القضاء والوظيفة والعمل والتأمينات': 'labour-civil-service-insurance',
        'جهات وفئات خاصة': 'special-bodies', 'الدستور والجنسية والانتخاب': 'constitution-nationality-elections', 'المرافعات والقضاء': 'procedure-judiciary',
        'الأحوال الشخصية': 'personal-status', 'التجارة البحرية': 'maritime', 'المدني والعقاري': 'civil-real-estate', 'التجاري': 'commercial'}

# ملاحظات معروفة من جولات المطابقة مع صور الجريدة (verify_report): تُعلَّم المادة «تحتاج مراجعة»
KNOWN = {
    'LAW-87-2026-A0050': 'بندان من القائمة ملتصقان في فقرة واحدة («اعتماد مشروع الميزانية…» و«اقتراحات الأعضاء…»)؛ النص كامل والتقسيم يحتاج مراجعة.',
    'LAW-87-2026-A0088': 'تنوين في غير موضعه في «طفلا.ً» (موضع التشكيل منزاح في طبقة النص).',
    'LAW-78-2026-A0001': 'ضمة في غير موضعها في «يحُظر» (موضع التشكيل منزاح في طبقة النص).',
    'LAW-78-2026-A0011': 'ضمة في غير موضعها في «يحُظر» (موضع التشكيل منزاح في طبقة النص).',
    'LAW-94-2026-A0001': 'المبلغ ظاهر «-1,000,000/» والمطبوع «1,000,000/-» (ترتيب الرموز).',
    'LAW-38-1980-A0128': 'نص الاستبدال (المرسوم بقانون 6/2025) فيه سطران مطبوعان في الجريدة على غير ترتيبهما، ونُقلا كما طُبعا؛ يُرجع إلى صورة الصفحة قبل الاعتماد.',
    'LAW-6-2025-A0001': 'في المادة (128) المستبدلة سطران مطبوعان في الجريدة على غير ترتيبهما، ونُقلا كما طُبعا؛ يُرجع إلى صورة الصفحة.',
}
DOC_KNOWN = {
    'LAW-73-2025': 'الملف المتاح ينتهي عند المادة الثانية؛ المادة الختامية والتوقيع غير متاحين في المصدر.',
    'LAW-159-2025': 'الجداول المرفقة (المواد المخدرة والمؤثرات العقلية والسلائف) منشورة صورًا في الجريدة، ولم تُحوَّل إلى نص.',
}

AR = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
ORD = {'الأولى': 1, 'الثانية': 2, 'الثالثة': 3, 'الرابعة': 4, 'الخامسة': 5, 'السادسة': 6, 'السابعة': 7, 'الثامنة': 8, 'التاسعة': 9, 'العاشرة': 10}
RLABEL = re.compile(r'^\(?\s*(?:ال)?مادة\b')


def J(p):
    with open(p, encoding='utf-8') as f:
        return json.load(f)


def label_num(t):
    t = t.translate(AR)
    m = re.search(r'(\d+)', t)
    if m:
        return int(m.group(1))
    for w, n in ORD.items():
        if w in t:
            return n
    return None


def segment(paras, target):
    """نص المادة target داخل مادة معدِّلة: الفقرات بعد سطر «مادة (n)…» حتى سطر «مادة» التالي.
    إن لم توجد أسطر عناوين فالنص كل ما بعد الفقرة الأولى (جملة التعديل)."""
    labs = [i for i, p in enumerate(paras) if i > 0 and RLABEL.match(p) and len(p) < 60]
    if not labs:
        return paras[1:] or None, None
    for k, i in enumerate(labs):
        n = label_num(paras[i])
        tn = label_num(str(target))
        if n == tn and (('مكرر' in str(target)) == ('مكرر' in paras[i])):
            end = labs[k + 1] if k + 1 < len(labs) else len(paras)
            return paras[i + 1:end] or None, paras[i]
    return None, None


NOTE_REF = re.compile(r'(معدل[ةه]?|عدلت|مستبدل[ةه]?|استبدلت|أضيفت|اضيفت|مضاف[ةه]|ملغا[ةه]|ملغى|ألغيت|الغيت)[^.]{0,80}?'
                      r'(?:بالقانون|بالمرسوم\s+بالقانون|بالمرسوم\s+بقانون|بالمرسوم\s+الأميري|بالمرسوم)\s+رقم\s+(\d+)\s+(?:لسنة|لسنه|سنة)\s+(\d{4})')


def note_refs(notes):
    out = []
    for n in notes or []:
        for m in NOTE_REF.finditer(n.translate(AR)):
            w = m.group(1)
            act = 'إلغاء' if w.startswith(('ملغ', 'ألغ', 'الغ')) else 'إضافة' if w.startswith(('أضيف', 'اضيف', 'مضاف')) else 'تعديل'
            r = {'action': act, 'key': f'{m.group(2)}/{m.group(3)}'}
            if r not in out:
                out.append(r)
    return out


def main():
    idx = J(os.path.join(LAWS, 'index.json'))['laws']
    AM = J(os.path.join(LAWS, 'amend.json'))
    BYKEY = {x['key']: x for x in idx}
    DOCS = {x['id']: J(os.path.join(LAWS, x['id'] + '.json')) for x in idx}
    # تاريخ كل وثيقة من الجريدة (تاريخ الإصدار، وإلا تاريخ العدد)
    def gdate(lid):
        d = DOCS.get(lid)
        if not d:
            return None
        s = d.get('source') or {}
        return d.get('issued') or s.get('date')

    def art_of(lid, aid):
        for a in DOCS[lid]['articles']:
            if a['id'] == aid:
                return a
        return None

    packs = collections.defaultdict(list)
    index_rows = []
    for x in idx:
        d = DOCS[x['id']]
        src = d.get('source') or {}
        is_gz = x.get('src') == 'gazette'
        kind = 'gazette' if is_gz else ('moj_edition' if 'وزارة العدل' in (src.get('kind') or '') else 'pdf_file')
        source = {'kind': kind, 'label': src.get('kind'),
                  'gazette': {'name': 'الكويت اليوم', 'issue': src.get('issue'), 'supplement': src.get('supplement'), 'date': src.get('date')} if is_gz else None,
                  'edition': src.get('edition'), 'volume': src.get('volume'), 'file': src.get('file'), 'pdf_pages': src.get('pdf_pages'),
                  'extraction': src.get('note')}
        text_as_of = src.get('date') if is_gz else ('2011-02' if kind == 'moj_edition' else None)
        lev = AM['laws'].get(x['key'], [])
        rep = next((e for e in lev if e['what'] == 'إلغاء'), None)
        amended_by = [{'key': e['by'], 'id': e['by_id'], 'date': e.get('date') or gdate(e['by_id'])} for e in lev if e['what'] != 'إلغاء']
        applied_until = max([a['date'] for a in amended_by if a['date']], default=None)
        arts = []
        counts = collections.Counter()
        for order, a in enumerate(d['articles'], 1):
            body = a.get('paras') or []
            joined = ' '.join(body)
            repealed = bool(a.get('rep')) or bool(re.match(r'^[\(\s«]*ملغ[اى]ة[\)\s»]*$', joined))
            ev = [] if (a.get('issue') or a.get('bis')) else AM['arts'].get(f"{x['id']}#{a['n']}", [])
            if is_gz:
                basis = 'نص الجريدة الرسمية'
            elif kind == 'moj_edition':
                basis = 'نص طبعة وزارة العدل 2011 (شاملًا ما ورد فيها من تعديلات حتى تاريخها)'
            else:
                basis = 'نص الملف المصدر'
            rec = {'id': a['id'], 'order': order, 'number': a.get('n'), 'suffix': a.get('bis'), 'label': a.get('label'),
                   'part': 'مواد الإصدار' if a.get('issue') else None, 'chapter_path': a.get('trail') or [],
                   'status': 'ملغاة' if repealed else 'نافذة', 'text_in_force': None if repealed else body,
                   'text_in_force_basis': None if repealed else basis, 'original_text': None, 'amendments': [],
                   'repealed': repealed, 'repealed_by': None,
                   'edition_notes': a.get('notes') or None, 'edition_note_refs': note_refs(a.get('notes')) or None,
                   'source_pages': a.get('pages') or [], 'needs_review': False, 'review_reasons': []}
            if repealed and a.get('notes'):
                rec['repealed_by'] = next(({'key': r['key'], 'basis': 'حاشية الطبعة'} for r in note_refs(a['notes']) if r['action'] == 'إلغاء'), None)
            for e in ev:
                bya = art_of(e['by_id'], e['by_art'])
                seg, lab = segment(bya['paras'], a['n']) if bya else (None, None)
                am = {'by_key': e['by'], 'by_id': e['by_id'], 'by_article': e['by_art'], 'date': e.get('date') or gdate(e['by_id']),
                      'how': e['how'], 'scope': e.get('part'), 'enacting_clause': (bya['paras'] or [None])[0] if bya else None,
                      'published_label': lab, 'published_text': seg}
                rec['amendments'].append(am)
                if e['how'] == 'إلغاء':
                    rec.update(status='ملغاة', repealed=True, text_in_force=None, text_in_force_basis=None, original_text=body or None,
                               repealed_by={'key': e['by'], 'id': e['by_id'], 'article': e['by_art'], 'date': am['date'], 'basis': 'الجريدة الرسمية'})
                elif e['how'] == 'استبدال' and not e.get('part') and seg and not (lab and 'فقرة' in lab):
                    rec.update(status='معدّلة', original_text=body or None, text_in_force=seg,
                               text_in_force_basis=f"نص الاستبدال الكامل المنشور في الجريدة الرسمية ({e['by']})")
                else:
                    rec.update(status='معدّلة', original_text=body or None, text_in_force=None, text_in_force_basis=None, needs_review=True)
                    rec['review_reasons'].append(f"تعديل جزئي ({e['how']}{' — ' + e['part'] if e.get('part') else ''}) بالمرسوم بقانون {e['by']}: "
                                                 'النص النافذ يحتاج دمجًا يدويًا للنص الأصلي مع نص التعديل المنشور، ولم يُدمج آليًا.')
            if rep:   # إلغاء التشريع كله
                rec.update(status='ملغاة', repealed=True, original_text=rec['original_text'] or rec['text_in_force'], text_in_force=None, text_in_force_basis=None)
                rec['repealed_by'] = {'key': rep['by'], 'id': rep['by_id'], 'article': rep.get('by_art'), 'date': rep.get('date'), 'basis': 'الجريدة الرسمية', 'scope': 'إلغاء التشريع كله'}
            if a['id'] in KNOWN:
                rec['needs_review'] = True
                rec['review_reasons'].append(KNOWN[a['id']])
            counts[rec['status']] += 1
            counts['needs_review'] += rec['needs_review']
            arts.append(rec)
        # مواد أضيفت بتشريع لاحق
        for e in AM['added'].get(x['key'], []):
            bya = art_of(e['by_id'], e['by_art'])
            seg, lab = segment(bya['paras'], e['n']) if bya else (None, None)
            n = label_num(e['n'])
            rec = {'id': f"{x['id']}-A{n:04d}" + ('-bis-' + e['by'].replace('/', '-') if 'مكرر' in e['n'] else ''), 'order': None, 'number': n,
                   'suffix': 'مكرراً' if 'مكرر' in e['n'] else None, 'label': lab or f"مادة ({e['n']})", 'part': None,
                   'chapter_path': [], 'status': 'مضافة', 'text_in_force': seg, 'text_in_force_basis': f"نص الإضافة المنشور في الجريدة الرسمية ({e['by']})" if seg else None,
                   'original_text': None, 'amendments': [{'by_key': e['by'], 'by_id': e['by_id'], 'by_article': e['by_art'], 'date': e.get('date') or gdate(e['by_id']),
                                                         'how': 'إضافة', 'scope': None, 'enacting_clause': (bya['paras'] or [None])[0] if bya else None,
                                                         'published_label': lab, 'published_text': seg}],
                   'repealed': False, 'repealed_by': None, 'edition_notes': None, 'edition_note_refs': None, 'source_pages': [],
                   'needs_review': not seg, 'review_reasons': [] if seg else ['تعذّر تحديد نص المادة المضافة داخل المادة المعدِّلة.']}
            prev = sorted([r for r in arts if r['number'] is not None and r['number'] <= n and not r['part']], key=lambda r: (r['number'], r['order'] or 10**9))
            rec['insert_after'] = prev[-1]['id'] if prev else None
            if prev:
                rec['chapter_path'] = prev[-1]['chapter_path'] if 'مكرر' in e['n'] else []
            assert rec['id'] not in {r['id'] for r in arts}, rec['id']
            arts.append(rec)
            counts['مضافة'] += 1
        verified = is_gz
        L = {'id': x['id'], 'key': x['key'], 'category': x['cat'], 'type': x['type'], 'number': x.get('number'), 'year': x.get('year'),
             'title': d.get('title') or x['title'], 'short_title': x.get('short'), 'group': x.get('group'),
             'status': 'ملغى' if rep else ('معدّل' if amended_by else 'نافذ'),
             'repealed_by': {'key': rep['by'], 'id': rep['by_id'], 'article': rep.get('by_art'), 'date': rep.get('date')} if rep else None,
             'issued': {'gregorian': x.get('issued'), 'hijri': d.get('issued_hijri')},
             'source': source, 'text_as_of': text_as_of, 'text_version_note': d.get('text_version'),
             'amendments_applied_until': applied_until, 'amended_by': amended_by,
             'amends': d.get('amends') or x.get('amends') or [], 'repeals': d.get('repeals') or x.get('repeals') or [],
             'verified_against_gazette': verified,
             'verification_note': 'استُخرج النص من ملف الجريدة الرسمية نفسه وطوبق مع صور صفحاته.' if verified else
             ('لم يُراجع على الجريدة الرسمية: النص من طبعة وزارة العدل «مجموعة التشريعات الكويتية» (فبراير 2011)، وقد تكون صدرت بعدها تعديلات لم تُضف.'
              if kind == 'moj_edition' else 'لم يُراجع على الجريدة الرسمية: النص من ملف PDF مصدَّر من Word، وهو النص الأصلي كما صدر.'),
             'known_issues': [DOC_KNOWN[x['id']]] if x['id'] in DOC_KNOWN else [],
             'preamble': d.get('preamble') or [], 'signature': d.get('signature') or [],
             'structure': [{'level': t.get('level'), 'title': t.get('title'), 'from_article': t.get('frm'), 'to_article': t.get('to')} for t in d.get('toc') or []],
             'has_explanatory_memo': os.path.exists(os.path.join(LAWS, x['id'] + '-M.json')),
             'counts': {'articles': len(arts), 'in_force': counts['نافذة'], 'amended': counts['معدّلة'], 'added': counts['مضافة'],
                        'repealed': counts['ملغاة'], 'needs_review': counts['needs_review'] + sum(1 for r in arts if r['status'] == 'مضافة' and r['needs_review'])},
             'articles': arts}
        if isinstance(L['preamble'], str):
            L['preamble'] = [L['preamble']]
        packs[x.get('group') or 'أخرى'].append(L)
    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.endswith('.json'):
            os.remove(os.path.join(OUT, f))
    files = []
    for g, Ls in sorted(packs.items(), key=lambda kv: SLUG.get(kv[0], kv[0])):
        Ls.sort(key=lambda L: (L['category'], -(L['year'] or 0), L['number'] or 0))
        P = {'format': 'mabadi-legis-pack', 'schema_version': VER, 'pack': g, 'pack_slug': SLUG.get(g, 'other'), 'generated': TODAY,
             'producer': 'مكتبة مبادئ التمييز',
             'conventions': {
                 'id': 'معرّف التشريع والمادة ثابت ما دام المصدر نفسه (LAW-رقم-سنة للقوانين، REG-… للمراسيم واللوائح والقرارات).',
                 'text_in_force': 'النص النافذ فقرات حرفية من مصدر منشور؛ null حين لا يتوفر نص كامل منشور (تعديل جزئي يحتاج دمجًا، أو مادة ملغاة).',
                 'original_text': 'نص المادة قبل التعديل اللاحق للطبعة، حين عُدّلت أو أُلغيت بتشريع منشور في الجريدة.',
                 'edition_notes': 'حواشي طبعة وزارة العدل كما وردت (ومنها نص المادة قبل تعديلات سابقة للطبعة أحيانًا).',
                 'edition_note_refs': 'التشريعات المذكورة في الحاشية، مستخرجة آليًا من نصها للتيسير؛ المرجع نص الحاشية نفسه.',
                 'status': 'نافذة | معدّلة | مضافة | ملغاة',
                 'verified_against_gazette': 'true فقط لما استُخرج من ملف الجريدة الرسمية نفسه وطوبق مع صوره.',
                 'needs_review': 'المادة تحتاج مراجعة بشرية، والسبب في review_reasons.'},
             'counts': {'legislations': len(Ls), 'articles': sum(L['counts']['articles'] for L in Ls),
                        'needs_review': sum(L['counts']['needs_review'] for L in Ls),
                        'not_verified_against_gazette': sum(1 for L in Ls if not L['verified_against_gazette'])},
             'legislations': Ls}
        name = f"mabadi-legis_{P['pack_slug']}_v{VER}.json"
        raw = json.dumps(P, ensure_ascii=False, separators=(',', ':')).encode()
        with open(os.path.join(OUT, name), 'wb') as f:
            f.write(raw)
        files.append({'file': name, 'pack': g, 'legislations': len(Ls), 'articles': P['counts']['articles'], 'bytes': len(raw),
                      'sha256': hashlib.sha256(raw).hexdigest()})
        for L in Ls:
            one = json.dumps(L, ensure_ascii=False, separators=(',', ':')).encode()
            index_rows.append({'id': L['id'], 'key': L['key'], 'category': L['category'], 'type': L['type'], 'number': L['number'], 'year': L['year'],
                               'title': L['title'], 'short_title': L['short_title'], 'group': L['group'], 'pack_file': name, 'status': L['status'],
                               'articles': L['counts']['articles'], 'articles_in_force': L['counts']['in_force'] + L['counts']['amended'] + L['counts']['added'],
                               'articles_needs_review': L['counts']['needs_review'],
                               'text_chars': sum(len(p) for a in L['articles'] for p in (a['text_in_force'] or [])), 'bytes': len(one),
                               'source_kind': L['source']['kind'], 'text_as_of': L['text_as_of'], 'verified_against_gazette': L['verified_against_gazette']})
    I = {'format': 'mabadi-legis-index', 'schema_version': VER, 'generated': TODAY, 'producer': 'مكتبة مبادئ التمييز',
         'counts': {'legislations': len(index_rows), 'laws': sum(r['category'] == 'law' for r in index_rows), 'regulations': sum(r['category'] == 'reg' for r in index_rows),
                    'articles': sum(r['articles'] for r in index_rows), 'needs_review': sum(r['articles_needs_review'] for r in index_rows),
                    'verified_against_gazette': sum(r['verified_against_gazette'] for r in index_rows)},
         'packs': files, 'legislations': sorted(index_rows, key=lambda r: (r['category'], r['group'] or '', -(r['year'] or 0)))}
    with open(os.path.join(OUT, f'mabadi-legis-index_v{VER}.json'), 'w', encoding='utf-8') as f:
        json.dump(I, f, ensure_ascii=False, indent=1)
    print(json.dumps(I['counts'], ensure_ascii=False))
    for p in files:
        print(p['file'], p['legislations'], p['articles'], round(p['bytes'] / 1e6, 2), 'MB')


if __name__ == '__main__':
    main()
