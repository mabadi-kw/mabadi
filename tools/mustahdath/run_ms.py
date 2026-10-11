#!/usr/bin/env python3
"""يقطّع كتب المستحدث (الإصدارات 13 وما بعدها) إلى أقسام بصيغة run4.py لتمر على build4/pages4/integrate4.
الاستعمال: python3 run_ms.py <مجلد txt> <الإخراج.json>
الملفات المتوقعة في مجلد txt: MS14.txt (المدني 13–14)، MSJ14.txt (الجزائي 13–14)، MS16.txt (المدني 13–16 مع حكم الهيئة العامة)."""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from parse_ms import parse, RE_CIT, RE_DATE, DIG

BOOKS = {
    'MS14': ('المستحدث 13–14', 'المستحدث في المواد التجارية والإدارية والمدنية والعمالية والأحوال الشخصية — الإصداران 13 و14 (1/4/2016–31/3/2018)', 2019, ''),
    'MSJ14': ('المستحدث الجزائي 13–14', 'المستحدث في المواد الجزائية — الإصداران 13 و14 (1/4/2016–31/3/2018)', 2020, 'الدائرة الجزائية'),
    'MS16': ('المستحدث 13–16', 'المستحدث في المواد التجارية والمدنية والعمالية والأحوال الشخصية — الإصدارات 13–16 (1/4/2016–31/12/2020)، وحكم الهيئة العامة 27/12/2021', 2025, ''),
}
ORD = ['P', 'A', 'M', 'G']
CHW = [('رجال القضاء', 'طلبات رجال القضاء'), ('الأحوال', 'أحوال شخصية'), ('تجار', 'تجاري'), ('مدن', 'مدني'), ('إدار', 'إداري'), ('ادار', 'إداري'), ('عمال', 'عمالي'), ('جزائ', 'جزائي'), ('الهيئة العامة', 'هيئة عامة')]


def chw(ch):
    c = re.sub('ـ', '', ch or '')
    for k, v in CHW:
        if k in c: return v
    return None


def main(TXT, OUT):
    res = []
    for code, (nm, title, yr, chd) in BOOKS.items():
        p = os.path.join(TXT, code + '.txt')
        if not os.path.exists(p): continue
        R, free = parse(p, title, chd)
        for i, r in enumerate(R, 1):
            r['file'] = code + '.txt'; r['n'] = i; r['chamber'] = chw(r['ch'])
            # إسناد الحكم في آخر موجز حكم الهيئة العامة يُنزع من الموجز (هو سطر الإسناد لا جزء من الموجز)
            for h in r['heads']:
                if h['sum']:
                    m = re.search(r'\s*\((?:ال)?طعن[^()]*جلسة[^()]*\)\s*$', h['sum'][-1])
                    if m and r.get('part_sec') == 'الهيئة العامة': h['sum'][-1] = h['sum'][-1][:m.start()].rstrip()
            # ملاحظات الترقيم في المصدر لا تحتاج مراجعة: كل موجز تليه قاعدته (فُحصت كلها)
            r['src_notes'] = [x for x in r['issues'] if x.startswith(('رقم القاعدة', 'عنوان القاعدة', 'عنوان الموجز', 'لا عنوان'))]
            r['issues'] = [x for x in r['issues'] if x not in r['src_notes']]
        P = [r for r in R if r.get('part_sec') == 'الهيئة العامة']; Q = [r for r in R if r.get('part_sec') != 'الهيئة العامة']
        for s, rul, sn in (('P', P, 'حكم الهيئة العامة'), ('G' if code == 'MSJ14' else 'M', Q, nm)):
            if rul:
                res.append({'code': code, 'vol': code, 'issue': 1, 'year': yr, 'sec': s, 'ord': ORD.index(s), 'sec_name': sn, 'file': code + '.txt', 'kind': 'mustahdath',
                            'sec_label': [title, sn], 'ref': f'{title} — {sn}', 'rulings': rul})
        print(code, 'مبادئ', len(R), 'بملاحظة', sum(1 for r in R if r['issues']), 'أسطر غير مفهومة', len(free), file=sys.stderr)
        for f in free: print('   ', f, file=sys.stderr)
    json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main(*sys.argv[1:3])
