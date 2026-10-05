#!/usr/bin/env python3
"""يقطّع أجزاء المجلة (2016، 2017) والمستحدث الإداري، ويستكمل ما غاب من ملف Word (رقم الحكم وأرقام الطعن) من ملف PDF المطبوع.
الاستعمال: python3 run4.py <مجلد txt> <مجلد مسح المطبوع P*.json> <الإخراج.json>"""
import os, re, sys, json, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse4 import parse_file, parse_mustahdath
TXT, PSCAN, OUT = sys.argv[1:4]
PARTS = [(44, 2016, 1), (44, 2016, 2), (44, 2016, 3), (45, 2017, 1), (45, 2017, 2), (45, 2017, 3)]
ORD = ['P', 'A', 'M', 'G']
SECN = {'P': 'الهيئة العامة', 'A': 'المواد الإدارية', 'M': 'المواد التجارية والمدنية والعمالية والأحوال الشخصية', 'G': 'المواد الجزائية'}
TYPEW = {'A': 'إداري', 'G': 'جزائي'}


def sec_of(ch):
    c = re.sub('ـ', '', ch or '')
    if 'الهيئة العامة' in c: return 'P'
    if 'إدار' in c or 'ادار' in c or 'رجال القضاء' in c: return 'A'
    if 'جزائ' in c: return 'G'
    return 'M'


def chw(ch):
    c = re.sub('ـ', '', ch or '')
    for k, v in [('رجال القضاء', 'طلبات رجال القضاء'), ('الأحوال', 'أحوال شخصية'), ('تجار', 'تجاري'), ('مدن', 'مدني'), ('إدار', 'إداري'), ('ادار', 'إداري'), ('عمال', 'عمالي'), ('جزائ', 'جزائي'), ('الهيئة العامة', 'هيئة عامة')]:
        if k in c: return v
    return None


res = []
log = collections.Counter()
for vol, yr, part in PARTS:
    R = parse_file(os.path.join(TXT, f'J{yr}-{part}.txt'))
    pf = os.path.join(PSCAN, f'P{yr}-{part}.json')
    P = json.load(open(pf)) if os.path.exists(pf) else None
    if P and len(P) == len(R) and all(a['sess'] == b['sess'] for a, b in zip(R, P)):
        for r, p in zip(R, P):
            r['print_page'] = p['page']
            if r['n'] is None and p['n'] is not None: r['n'] = p['n']; r['issues'] = [x for x in r['issues'] if x != 'لا رقم للحكم في ملف Word']; r['n_src'] = 'pdf'; log['رقم من المطبوع'] += 1
            if not r['cit'] and p['nums']:
                w = chw(r['ch']) or ''
                nums = p['nums']
                r['cit'] = f"({'الطعن رقم' if len(nums) == 1 else 'الطعون أرقام' if len(nums) > 2 else 'الطعنان رقما'} {'، '.join(nums)}/{p['yr']} {w})"
                r['cit_src'] = 'pdf'; r['issues'] = [x for x in r['issues'] if x != 'لا إسناد']; log['إسناد من المطبوع'] += 1
    elif P is not None:
        print(f'تنبيه: {yr}-{part} لم يتطابق مع المطبوع ({len(R)} / {len(P)})', file=sys.stderr)
    bysec = collections.defaultdict(list)
    for r in R:
        r['file'] = f'J{yr}-{part}.txt'; bysec[sec_of(r['ch'])].append(r)
    for s in ORD:
        rul = bysec.get(s)
        if not rul: continue
        seen = set()
        for i, r in enumerate(rul, 1):
            if r['n'] is None or r['n'] in seen: r['issues'].append('رقم الحكم غير متاح، رُقِّم بالترتيب'); r['n'] = i if i not in seen else 900 + i
            seen.add(r['n']); r['chamber'] = chw(r['ch'])
        res.append({'code': f'MQ{vol}', 'vol': vol, 'issue': part, 'year': yr, 'sec': s, 'ord': ORD.index(s), 'sec_name': SECN[s], 'file': f'J{yr}-{part}.txt', 'kind': 'part',
                    'sec_label': [f'الجزء {part} — {yr}', SECN[s]],
                    'ref': f'مجلة القضاء والقانون س{vol} ج{part} ({yr}) — {SECN[s]}', 'rulings': rul})
        print(f"س{vol} ج{part} {s}: أحكام {len(rul)} مبادئ {sum(len(r['heads']) for r in rul)} ملاحظات {sum(1 for r in rul if r['issues'])}", file=sys.stderr)
# المستحدث الإداري
M = parse_mustahdath(os.path.join(TXT, 'MSA.txt'))
for i, r in enumerate(M, 1):
    r['file'] = 'MSA.txt'; r['n'] = i; r['chamber'] = chw(r['ch']) or 'إداري'
    r['issues'] = [x for x in r['issues'] if x != 'لا رقم للحكم في ملف Word']
P1 = [r for r in M if r.get('part_sec') == 'الهيئة العامة']; P2 = [r for r in M if r.get('part_sec') != 'الهيئة العامة']
for s, rul, nm in (('P', P1, 'حكم الهيئة العامة'), ('A', P2, 'المستحدث في المواد الإدارية')):
    if rul:
        res.append({'code': 'MSA', 'vol': 'MSA', 'issue': 1, 'year': 2024, 'sec': s, 'ord': ORD.index(s), 'sec_name': nm, 'file': 'MSA.txt', 'kind': 'mustahdath',
                    'sec_label': ['المستحدث في المواد الإدارية (1/4/2016–31/12/2022)', nm],
                    'ref': f'المستحدث في المواد الإدارية (الفترة 1/4/2016–31/12/2022) — {nm}', 'rulings': rul})
print('المستحدث:', len(M), 'مبدأ؛ بلا إسناد', sum(1 for r in M if not r['cit']), file=sys.stderr)
json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(dict(log), 'أحكام:', sum(len(x['rulings']) for x in res), 'مبادئ:', sum(len(r['heads']) for x in res for r in x['rulings']), file=sys.stderr)
