#!/usr/bin/env python3
"""يمرّ على مجلدات أعداد المجلة (النص المصدَّر) ويقطّع ملفاتها.
في كل عدد: ملفات الأقسام المجمّعة «<العدد>-<السنة> T/M/G» (تجاري وإداري / مدني وأحوال وعمالي / جزائي) تضم العناوين والموجزات والقواعد
دون نص الحكم الكامل. وإن غاب الملف المجمّع لقسم، أُخذت أحكامه من الملفات المجزّأة (مثل 1-15، 41-67، 5-47) التي تضم الأحكام كاملة،
ويُنسب كل حكم إلى قسمه بنوع الطعن في إسناده. ملفات الفهارس (F…، FG…، FT…، فهرس…) لا تُقطَّع.
الاستعمال: python3 run.py <مجلد txt للمجلة> <ملف الإخراج.json>
"""
import os, re, sys, json, collections
sys.path.insert(0, os.path.dirname(__file__))
from parse import parse_file

ROOT, OUT = sys.argv[1], sys.argv[2]
RE_SEC = re.compile(r'^(\d)\s*-\s*(\d{4})\s*([GMTgmt])?\.txt$')
RE_IDX = re.compile(r'^(F|FG|FT|Fg|فهرس|الموضوعات)', re.I)
RE_ISSUE = re.compile(r'(\d)\s*-\s*(20\d\d)')
SECN = {'T': 'تجاري وإداري', 'M': 'مدني وأحوال شخصية وعمالي', 'G': 'جزائي'}
SEC_OF_CH = {'تجاري': 'T', 'إداري': 'T', 'هيئة عامة': 'T', 'جزائي': 'G', 'مدني': 'M', 'عمالي': 'M', 'أحوال شخصية': 'M', 'طلبات رجال القضاء': 'T'}
CHW = ['طلبات رجال القضاء', 'أحوال شخصية', 'هيئة عامة', 'تجاري', 'مدني', 'إداري', 'عمالي', 'جزائي']


def ch_of(cit, chraw):
    for w in CHW:
        if w in (cit or ''): return w
    return {'التجارية': 'تجاري', 'المدنية': 'مدني', 'الإدارية': 'إداري', 'العمالية': 'عمالي', 'الجزائية': 'جزائي', 'الأحوال الشخصية': 'أحوال شخصية'}.get(chraw or '', None)


# تجميع ملفات كل عدد (قد تكون في مجلدات فرعية)
issues = collections.defaultdict(list)   # (vol, issue, year) -> [paths]
for dp, _, fs in sorted(os.walk(ROOT)):
    ym = re.search(r'السنة (\d+)', dp)
    im = RE_ISSUE.search(dp)
    if not (ym and im): continue
    key = (int(ym.group(1)), int(im.group(1)), int(im.group(2)))
    for f in fs:
        if f.endswith('.txt'): issues[key].append(os.path.join(dp, f))

res = []
for (vol, iss, yr), paths in sorted(issues.items()):
    comb = {}
    split = []
    for p in sorted(paths):
        f = os.path.basename(p)
        m = RE_SEC.match(f)
        if m:
            comb[(m.group(3) or 'M').upper()] = p
        elif RE_IDX.match(f.strip()):
            continue
        elif re.match(r'^\d+\s*-\s*\d+\s*[gG]?\.txt$', f):
            split.append(p)
    # الملف «1-2004.txt» بلا حرف ليس قسم M بالضرورة: يُحدَّد قسمه من أحكامه
    secs = {}
    for sec, p in list(comb.items()):
        rul = parse_file(p)
        chs = collections.Counter(SEC_OF_CH.get(ch_of(r['cit'], r['ch']), 'M') for r in rul)
        real = chs.most_common(1)[0][0] if chs else sec
        if real != sec:
            print(f'  تنبيه: {os.path.basename(p)} أحكامه من قسم {real} لا {sec}', file=sys.stderr)
            if real in comb: continue   # قسم موجود أصلًا؛ هذا الملف جزء مكرر
            sec = real
        secs[sec] = {'file': os.path.relpath(p, ROOT), 'rulings': rul, 'kind': 'combined'}
    # الأقسام الناقصة من الملفات المجزّأة
    missing = [s for s in ('T', 'M', 'G') if s not in secs]
    if missing and split:
        pool = collections.defaultdict(list)
        for p in split:
            for r in parse_file(p):
                s = SEC_OF_CH.get(ch_of(r['cit'], r['ch']), 'G' if re.search(r'[gG]\.txt$', p) else 'M')
                r['file'] = os.path.relpath(p, ROOT)
                pool[s].append(r)
        for s in missing:
            if pool.get(s):
                rul = sorted(pool[s], key=lambda r: r['n'])
                # حذف المكرر (الحكم نفسه في ملفين)
                seen, uniq = set(), []
                for r in rul:
                    if (r['n'], r['cit']) in seen: continue
                    seen.add((r['n'], r['cit'])); uniq.append(r)
                secs[s] = {'file': f'[{len({r["file"] for r in uniq})} ملفات مجزّأة]', 'rulings': uniq, 'kind': 'split'}
    for sec in ('T', 'M', 'G'):
        if sec not in secs:
            print(f'س{vol} ع{iss}/{yr} {sec}: لا ملف', file=sys.stderr); continue
        d = secs[sec]; rul = d['rulings']
        for r in rul:
            r['chamber'] = ch_of(r['cit'], r['ch'])
            if 'file' not in r: r['file'] = d['file']
        res.append({'vol': vol, 'issue': iss, 'year': yr, 'sec': sec, 'sec_name': SECN[sec], 'file': d['file'], 'kind': d['kind'], 'rulings': rul})
        bad = [r for r in rul if r['issues']]
        print(f"س{vol} ع{iss}/{yr} {sec}: أحكام {len(rul)} مبادئ {sum(len(r['heads']) for r in rul)} ملاحظات {len(bad)} ({d['kind']}) ← {os.path.basename(d['file'])}", file=sys.stderr)
        for r in bad: print('    ', r['n'], r['cit'], r['issues'][:3], file=sys.stderr)
json.dump(res, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('مقاطع:', len(res), 'أحكام:', sum(len(x['rulings']) for x in res), 'مبادئ:', sum(len(r['heads']) for x in res for r in x['rulings']), file=sys.stderr)
