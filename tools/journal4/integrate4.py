#!/usr/bin/env python3
"""يدمج مجموعات المجلة (MQ<vol>) في بيانات المكتبة: data/MQ*.json وصور الصفحات ونصوصها، وmeta.json (المجموعات والموضوعات والقوانين)،
والربط بالأحكام نفسها في بقية المجموعات (rel)، وreports.json، وfiles.json.
الاستعمال: python3 integrate.py <jout> <jsite> MQ31 [MQ32 …]
"""
import os, re, sys, json, shutil, collections, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'journal', 'cls'))
from laws import law_label
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
JOUT, JSITE = sys.argv[1], sys.argv[2]
CODES = sys.argv[3:]
mp = os.path.join(ROOT, 'data', 'meta.json')
META = json.load(open(mp, encoding='utf-8'))
TL, LL = META['toplab'], META['lawlab']
FAMN = {'P': 'إجراءات التقاضي', 'L': 'قانون العمل', 'C': 'الالتزامات والعقود والمسئولية', 'S': 'التجارة والشركات والأسواق المالية والبنوك', 'R': 'الملكية والعقار',
        'A': 'القانون الإداري والوظيفة العامة', 'F': 'الأحوال الشخصية', 'J': 'شؤون القضاة وتنظيم القضاء', 'T': 'مصادر القانون التجاري والأعمال التجارية',
        'V': 'المواد المدنية', 'G': 'الجزاء (قانون العقوبات)', 'H': 'الإجراءات والمحاكمات الجزائية'}
# أسماء عائلات الموضوعات كما في المكتبة (من الموضوعات القائمة)
for k, v in TL.items():
    f = k.split(':')[0] if ':' in k else k[0]
    FAMN[f] = v[0]

# 1) مفاتيح الأحكام في المجموعات القائمة
RK = collections.defaultdict(set)
OLD = {}
for c in META['order']:
    d = json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8'))
    OLD[c] = d
    for p in d:
        for x in p['c']:
            if x.get('k'): RK[x['k']].add(p['id'])

report = json.load(open(os.path.join(ROOT, 'data', 'reports.json'), encoding='utf-8'))
report = [r for r in report if r['col'] not in CODES]
touched = collections.defaultdict(set)   # col -> ids whose rel changed
for code in CODES:
    items = json.load(open(os.path.join(JOUT, code + '.json'), encoding='utf-8'))
    pg = json.load(open(os.path.join(JOUT, code + '-pages.json'), encoding='utf-8'))
    rep = json.load(open(os.path.join(JOUT, 'report.json'), encoding='utf-8'))
    rc = next(r for r in rep['cols'] if r['col'] == code)
    # الموضوعات والقوانين الجديدة
    for it in items:
        for t in it['tp']:
            if t[0] not in TL:
                f, kw = t[0].split(':', 1)
                TL[t[0]] = [FAMN.get(f, f), kw]
        for l in it['lw']:
            if l[0] not in LL: LL[l[0]] = law_label(l[0])
    # الربط بالأحكام نفسها
    for it in items:
        k = it['c'][0].get('k')
        if k: RK[k].add(it['id'])
    nlink = 0
    for it in items:
        k = it['c'][0].get('k')
        others = sorted(i for i in RK.get(k, ()) if i != it['id']) if k else []
        it['rel'] = others
        if any(not i.startswith(code) for i in others): nlink += 1
        for i in others:
            oc = i.split('-')[0]
            if oc in OLD:
                for p in OLD[oc]:
                    if p['id'] == i and it['id'] not in p.get('rel', []):
                        p['rel'] = sorted(set(p.get('rel', [])) | {it['id']}); touched[oc].add(i)
    # ملف البيانات
    for it in items: it.pop('src', None) if False else None   # يبقى src للتتبع (صغير)
    s = json.dumps(items, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data', code + '.json'), 'w', encoding='utf-8').write(s)
    vol = rc['vol']; year = rc['year']
    if code == 'MSA':
        nm, tt = 'المستحدث الإداري', 'المستحدث في المواد الإدارية — أهم وأحدث المبادئ من 1/4/2016 حتى 31/12/2022'
    else:
        nm, tt = f'المجلة س{vol}', f'مجلة القضاء والقانون — السنة {vol} ({year})'
    META['cols'][code] = {'name': nm, 'title': tt, 'off': 0, 'n': len(items), 'bytes': len(s.encode()),
                          'pw': pg['pw'], 'ph': pg['ph'], 'crop': pg['crop'], 'cell': pg['cell'], 'gp': 20, 'src': 'journal', 'issues': rc['issues'], 'docs': pg['docs']}
    if code not in META['order']:
        after = 'S' if code == 'MSA' else max([c for c in META['order'] if c.startswith('MQ')] or ['S'])
        META['order'].insert(META['order'].index(after) + 1, code)
    # الصفحات ونصوصها
    for sub in ('pages', 'pagetext'):
        dst = os.path.join(ROOT, sub, code)
        if os.path.isdir(dst): shutil.rmtree(dst)
        shutil.copytree(os.path.join(JSITE, sub, code), dst)
    os.remove(os.path.join(ROOT, 'pages', code, 'meta.json'))
    # التقرير
    rvc = collections.Counter(r for it in items for r in it['rv'])
    report.append({'col': code, 'title': META['cols'][code]['title'],
                   'stats': [[len(items), 'مبدأ (عنوان + موجز + قاعدة)'], [rc['rulings'], 'حكمًا'], [len(rc['issues']), 'أجزاء' if code != 'MSA' else 'إصدار'], [pg['pages'], 'صفحة'], [nlink, 'مبدأ مرتبط بحكمه في مجموعة أخرى'], [rc['review'], 'يحتاج مراجعة']],
                   'method': (['المصدر ملف Word للمستحدث في المواد الإدارية (الإصدارات 13–18، 2024): موضوعات مرتبة هجائيًا، ولكل مبدأ «الموجز» ثم «القاعدة» ثم سطر الإسناد (الطعن وتاريخ الجلسة)، وفي أوله حكم الهيئة العامة بصيغة المجلة.',
                               'الموجز والقاعدة منقولان حرفيًا من الملف، وعنوان المبدأ هو اسم الموضوع الذي ورد تحته.'] if code == 'MSA' else
                              ['المصدر ملفات Word لأجزاء السنة الثلاثة (لا قراءة ضوئية)، في كل جزء: أحكام الهيئة العامة، ثم المواد الإدارية، ثم التجارية والمدنية والعمالية والأحوال الشخصية، ثم الجزائية. لكل حكم هيئة المحكمة وتاريخ الجلسة ورقم الحكم وسطر الإسناد، ثم عناوين المبادئ وموجزاتها، ثم نصوص القواعد بالترتيب نفسه، ثم نص الحكم كاملًا.',
                               'العنوان والموجز والقاعدة منقولة حرفيًا من الملف. نص الحكم الكامل مُجهَّز ولم يُنشر.',
                               'حيث غاب رقم الحكم وسطر الإسناد من ملف Word (34 حكمًا في الجزأين الثاني والثالث من 2016)، أُخذت الأرقام من ملف PDF المطبوع بعد مطابقة الأحكام بتاريخ الجلسة وترتيبها (تطابقت كلها)، وعُلِّمت.',
                               'بنود مرقّمة داخل نص القاعدة (مثل فقرات نص قانوني منقول) تبقى جزءًا من القاعدة ولا تُعدّ قواعد مستقلة.']) +
                              ['صورة الصفحة: ملف Word نفسه مُصيَّر إلى PDF (بخط بديل لـ Simplified Arabic)، وموضع كل مبدأ محدد في الصورة من نص الملف. ترقيم صفحاتها لا يطابق المطبوع.',
                               'التصنيف: بالكلمات الكاشفة في عنوان المبدأ، وتُعرض الموضوعات الجديدة بعلامة «تصنيف آلي». القوانين من ذكرها في النص.'],
                   'checks': [['مطابقة حرفية آلية مع نص ملف المجلة', True, 'تُفحص بـ tools/journal/check.py بعد الدمج: كل عنوان وموجز وقاعدة موجود حرفيًا في نص الملف.'],
                              ['ترقيم الأحكام في كل قسم', True, 'متسلسل داخل كل عدد، وكل حكم له سطر إسناد وتاريخ جلسة إلا ما عُلِّم.'],
                              ['عدد العناوين = عدد القواعد في كل حكم', not any('يخالف عدد' in r for r in rvc), '؛ '.join(f'{v}: {k}' for k, v in rvc.items()) or 'لا اختلاف'],
                              ['موضع كل مبدأ في صورة الصفحة', not rvc.get('تعذّر تحديد موضع المبدأ في صورة الصفحة'), f"بلا موضع: {rvc.get('تعذّر تحديد موضع المبدأ في صورة الصفحة', 0)}"]],
                   'notes': ['نصوص المجلة بلا أسماء الخصوم أصلًا (الطاعن/المطعون ضده).', 'الأخطاء الطباعية في الملف تبقى كما هي.']})
    print(code, 'مبادئ', len(items), 'مرتبطة بمجموعات أخرى', nlink, 'موضوعات', len(TL), file=sys.stderr)

# كتابة المجموعات القائمة التي تغيّر فيها rel
for oc, ids in touched.items():
    s = json.dumps(OLD[oc], ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data', oc + '.json'), 'w', encoding='utf-8').write(s)
    META['cols'][oc]['bytes'] = len(s.encode())
    print('rel محدّث في', oc, len(ids), file=sys.stderr)
json.dump(META, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(report, open(os.path.join(ROOT, 'data', 'reports.json'), 'w', encoding='utf-8'), ensure_ascii=False)
# files.json
files = []
for sub in ('data', 'pages', 'pagetext'):
    for dp, _, fs in os.walk(os.path.join(ROOT, sub)):
        for f in sorted(fs):
            if f == 'meta.json' and sub == 'pages': continue
            p = os.path.relpath(os.path.join(dp, f), ROOT)
            files.append({'p': p, 's': os.path.getsize(os.path.join(dp, f))})
files.sort(key=lambda x: x['p'])
json.dump({'bytes': sum(f['s'] for f in files), 'files': files}, open(os.path.join(ROOT, 'files.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('files.json:', len(files), file=sys.stderr)
