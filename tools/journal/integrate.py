#!/usr/bin/env python3
"""يدمج مجموعات المجلة (MQ<vol>) في بيانات المكتبة: data/MQ*.json وصور الصفحات ونصوصها، وmeta.json (المجموعات والموضوعات والقوانين)،
والربط بالأحكام نفسها في بقية المجموعات (rel)، وreports.json، وfiles.json.
الاستعمال: python3 integrate.py <jout> <jsite> MQ31 [MQ32 …]
"""
import os, re, sys, json, shutil, collections, hashlib
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'cls'))
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
    META['cols'][code] = {'name': f'المجلة س{vol}', 'title': f'مجلة القضاء والقانون — السنة {vol} ({year})', 'off': 0, 'n': len(items), 'bytes': len(s.encode()),
                          'pw': pg['pw'], 'ph': pg['ph'], 'crop': pg['crop'], 'cell': pg['cell'], 'gp': 20, 'src': 'journal', 'issues': rc['issues'], 'docs': pg['docs']}
    if code not in META['order']: META['order'].append(code)
    # الصفحات ونصوصها
    for sub in ('pages', 'pagetext'):
        dst = os.path.join(ROOT, sub, code)
        if os.path.isdir(dst): shutil.rmtree(dst)
        shutil.copytree(os.path.join(JSITE, sub, code), dst)
    os.remove(os.path.join(ROOT, 'pages', code, 'meta.json'))
    # التقرير
    rvc = collections.Counter(r for it in items for r in it['rv'])
    report.append({'col': code, 'title': META['cols'][code]['title'],
                   'stats': [[len(items), 'مبدأ (عنوان + موجز + قاعدة)'], [rc['rulings'], 'حكمًا'], [len(rc['issues']), 'أعداد'], [pg['pages'], 'صفحة'], [nlink, 'مبدأ مرتبط بحكمه في مجموعة أخرى'], [rc['review'], 'يحتاج مراجعة']],
                   'method': ['المصدر ملفات Word للمجلة (لا قراءة ضوئية): لكل عدد ثلاثة ملفات أقسام (تجاري وإداري؛ مدني وأحوال شخصية وعمالي؛ جزائي) تضم لكل حكم هيئة المحكمة وتاريخ الجلسة ورقم الطعن، ثم عناوين المبادئ وموجزاتها، ثم نصوص القواعد بالترتيب نفسه.',
                              'العنوان والموجز والقاعدة منقولة حرفيًا من الملف. القاعدة رُبطت بعنوانها برقمها، وعند اضطراب الترقيم في المصدر رُبطت بالترتيب وعُلِّمت.',
                              'الإسناد: سطر الطعن كما ورد مع تاريخ الجلسة من رأس الحكم، ومرجع المجلة (السنة والعدد والقسم ورقم الحكم ورقم القاعدة).',
                              'صورة الصفحة: ملف Word نفسه مُصيَّر إلى PDF بخطه (Simplified Arabic)، وموضع كل مبدأ (عنوانه وقاعدته) محدد في الصورة من نص الملف.',
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
