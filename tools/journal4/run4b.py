#!/usr/bin/env python3
"""أجزاء المجلة بصيغة Word الحديثة (السنوات 41–43: 2013–2015، وما يماثلها): ملفات أقسام في كل جزء (أولاً/ثانياً/ثالثاً…).
يُقطَّع كل ملف بـ parse4.parse_file، ويُنسب كل حكم إلى قسمه بدائرته (الهيئة العامة/الإدارية ورجال القضاء/المدنية والتجارية/الجزائية).
الاستعمال: python3 run4b.py <مجلد txt: <السنة>/<الجزء>/*.txt> <الإخراج.json> [سنة …]"""
import os, re, sys, json, glob, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse4 import parse_file
ORD = ['P', 'A', 'M', 'G']
SECN = {'P': 'الهيئة العامة', 'A': 'المواد الإدارية', 'M': 'المواد التجارية والمدنية والعمالية والأحوال الشخصية', 'G': 'المواد الجزائية'}


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
TXT, OUT = sys.argv[1], sys.argv[2]
YEARS = [int(y) for y in sys.argv[3:]] or sorted(int(d) for d in os.listdir(TXT) if d.isdigit())
res = []
for yr in YEARS:
    vol = yr - 1972
    for part in (1, 2, 3):
        files = sorted(glob.glob(os.path.join(TXT, str(yr), str(part), '*.txt')))
        if not files: print(f'س{vol} ج{part}: لا ملفات', file=sys.stderr); continue
        bysec = collections.defaultdict(list)
        for f in files:
            rel = os.path.relpath(f, TXT)
            for r in parse_file(f):
                r['file'] = rel
                bysec[sec_of(r['ch'])].append(r)
        for s in ORD:
            rul = bysec.get(s)
            if not rul: continue
            rul.sort(key=lambda r: (r['n'] is None, r['n'] or 0))
            seen = set()
            for i, r in enumerate(rul, 1):
                if r['n'] is None or r['n'] in seen:
                    r['issues'].append('رقم الحكم غير متاح، رُقِّم بالترتيب'); r['n'] = 900 + i
                seen.add(r['n']); r['chamber'] = chw(r['ch'])
            res.append({'code': f'MQ{vol}', 'vol': vol, 'issue': part, 'year': yr, 'sec': s, 'ord': ORD.index(s), 'sec_name': SECN[s], 'file': rul[0]['file'], 'kind': 'part',
                        'sec_label': [f'الجزء {part} — {yr}', SECN[s]], 'ref': f'مجلة القضاء والقانون س{vol} ج{part} ({yr}) — {SECN[s]}', 'rulings': rul})
            print(f"س{vol} ج{part} {s}: أحكام {len(rul)} مبادئ {sum(len(r['heads']) for r in rul)} ملاحظات {sum(1 for r in rul if r['issues'])}", file=sys.stderr)
json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('أحكام:', sum(len(x['rulings']) for x in res), 'مبادئ:', sum(len(r['heads']) for x in res for r in x['rulings']), file=sys.stderr)
