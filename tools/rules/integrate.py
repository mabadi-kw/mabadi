#!/usr/bin/env python3
"""(نسخة مجموعة القواعد) يدمج مجموعات المجلة (MQ<vol>) في بيانات المكتبة: data/MQ*.json وصور الصفحات ونصوصها، وmeta.json (المجموعات والموضوعات والقوانين)،
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
    RR = json.load(open(os.path.join(JOUT, 'report.json'), encoding='utf-8'))
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
    s = json.dumps(items, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data', code + '.json'), 'w', encoding='utf-8').write(s)
    NAMES = {'QK5': ('القواعد ق5', 'مجموعة القواعد القانونية — القسم الخامس (2002–2006)'), 'QJ5': ('القواعد ق5 جزائي', 'مجموعة القواعد القانونية — القسم الخامس (2002–2006): القسم الجزائي')}
    META['cols'][code] = {'name': NAMES[code][0], 'title': NAMES[code][1], 'off': 0, 'n': len(items), 'bytes': len(s.encode()),
                          'pw': pg['pw'], 'ph': pg['ph'], 'crop': pg['crop'], 'cell': pg['cell'], 'gp': 20, 'src': 'rules', 'docs': pg['docs'], 'last': pg['pages']}
    if code not in META['order']: META['order'].append(code)
    # الصفحات ونصوصها
    for sub in ('pages', 'pagetext'):
        dst = os.path.join(ROOT, sub, code)
        if os.path.isdir(dst): shutil.rmtree(dst)
        shutil.copytree(os.path.join(JSITE, sub, code), dst)
    mj = os.path.join(ROOT, 'pages', code, 'meta.json')
    if os.path.exists(mj): os.remove(mj)
    # التقرير
    rvc = collections.Counter(re.sub(r'\s*\(.*$', '', r) for it in items for r in it['rv'])
    nf = len({it['src']['file'] for it in items}); rvn = sum(1 for it in items if it['rv'])
    report.append({'col': code, 'title': META['cols'][code]['title'],
                   'stats': [[len(items), 'قاعدة (موجز + نص + إسناد)'], [nf, 'موضوعًا'], [sum(len(it['c']) for it in items), 'سطر إسناد'], [pg['pages'], 'صفحة'], [nlink, 'قاعدة مرتبطة بحكمها في مجموعة أخرى'], [rvn, 'يحتاج مراجعة']],
                   'method': ['المصدر ملفات Word للمجموعة (لا قراءة ضوئية): ملف لكل موضوع، فيه «موجز القواعد» بعناوين فرعية وموجزات مرقمة، ثم «القواعد القانونية» بالعناوين نفسها ونصوص مرقمة يلي كلًّا منها سطر الإسناد.',
                              'الموجز ونص القاعدة والإسناد والإحالات («وراجع») منقولة حرفيًا من الملف.',
                              'الربط بين الموجز ونصه: داخل كل عنوان بالترتيب إذا تساوى العدد (لأن الترقيم الآلي في Word قد يضيع في التحويل)، وإلا بالرقم؛ ثم يُقاس تقارب كلمات الموجز من نص القاعدة ويُعلَّم الضعيف. القاعدة بلا موجز مطابق تُعرض بنصها وتُعلَّم.',
                              'صورة الصفحة: ملف Word نفسه مُصيَّرًا بخطه، ورقم الصفحة هو المطبوع في تذييلها (رقم صفحة الكتاب)، وموضع نص القاعدة وإسنادها محدد فيها.',
                              'التصنيف: عنوان الملف (الموضوع) والعنوان الفرعي، والقوانين من ذكرها في النص.'],
                   'checks': [['مطابقة حرفية آلية مع نص ملف المصدر', True, 'تُفحص بـ tools/rules/check.py: كل موجز ونص وإسناد وإحالة موجود حرفيًا في الملف.'],
                              ['ربط الموجز بنصه', True, '؛ '.join(f'{v}: {k}' for k, v in rvc.most_common(6)) or 'لا ملاحظات']],
                   'notes': ['اسم معدّ المجموعة لا يُذكر.', 'أكثر الملاحظات في ملفات قليلة اضطرب فيها الترقيم في المصدر (إثبات، جريمة، محكمة الموضوع، مرض عقلي).', 'الأخطاء الطباعية في الملف تبقى كما هي.']})
    print(code, 'قواعد', len(items), 'مرتبطة بمجموعات أخرى', nlink, 'موضوعات', len(TL), file=sys.stderr)

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
