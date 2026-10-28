#!/usr/bin/env python3
"""يدمج مجموعة QM78 في المكتبة: data/QM78.json وصور الصفحات (مستودع mabadi-pages عبر الرابط pages/) ونصوصها، وmeta.json وreports.json،
والربط بالأحكام نفسها في بقية المجموعات (rel).
الاستعمال: python3 integrate.py <مجلد المخرجات من build.py>
"""
import os, sys, json, shutil, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'journal', 'cls'))
from laws import law_label                     # noqa: E402
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = sys.argv[1]
CODE = 'QM78'
mp = os.path.join(ROOT, 'data', 'meta.json')
META = json.load(open(mp, encoding='utf-8'))
TL, LL = META['toplab'], META['lawlab']
FAMN = {}
for k, v in TL.items():
    FAMN[k.split(':')[0] if ':' in k else k[0]] = v[0]

items = json.load(open(os.path.join(OUT, CODE + '.json'), encoding='utf-8'))
pg = json.load(open(os.path.join(OUT, CODE + '-pages.json'), encoding='utf-8'))
for it in items:
    for t in it['tp']:
        if t[0] not in TL:
            f, kw = t[0].split(':', 1); TL[t[0]] = [FAMN.get(f, f), kw]
    for l in it['lw']:
        if l[0] not in LL: LL[l[0]] = law_label(l[0])

# الربط بالحكم نفسه (الرقم والسنة وتاريخ الجلسة) في بقية المجموعات
RK = collections.defaultdict(set); OLD = {}
for c in META['order']:
    if c == CODE: continue
    d = json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8')); OLD[c] = d
    for p in d:
        for x in p['c']:
            if x.get('k'): RK[x['k']].add((c, p['id']))
touched = collections.defaultdict(set); nlink = 0
byid = {c: {p['id']: p for p in d} for c, d in OLD.items()}
own = collections.defaultdict(set)
for it in items:
    k = it['c'][0].get('k')
    if k: own[k].add(it['id'])
for it in items:
    k = it['c'][0].get('k')
    if not k: it['rel'] = []; continue
    others = sorted(i for _, i in RK.get(k, ())) + sorted(i for i in own[k] if i != it['id'])
    it['rel'] = others
    if RK.get(k): nlink += 1
    for c, i in RK.get(k, ()):
        p = byid[c][i]
        if it['id'] not in p.get('rel', []):
            p['rel'] = sorted(set(p.get('rel', [])) | {it['id']}); touched[c].add(i)

s = json.dumps(items, ensure_ascii=False, separators=(',', ':'))
open(os.path.join(ROOT, 'data', CODE + '.json'), 'w', encoding='utf-8').write(s)
META['cols'][CODE] = {'name': 'القواعد 1978 ع2', 'title': 'القواعد القانونية التي قررتها محكمة التمييز في الفترة من 1/1/1978 إلى 31/3/1978 — العدد الثاني (وزارة العدل)',
                      'off': pg['off'], 'n': len(items), 'bytes': len(s.encode()), 'pw': pg['pw'], 'ph': pg['ph'], 'crop': pg['crop'], 'cell': pg['cell'], 'gp': 20, 'src': 'scan'}
if CODE not in META['order']:
    META['order'].insert(META['order'].index('QK5'), CODE)
for sub in ('pages', 'pagetext'):
    dst = os.path.join(ROOT, sub, CODE)
    if os.path.isdir(dst): shutil.rmtree(dst)
    shutil.copytree(os.path.join(OUT, sub, CODE), dst)
for c, ids in touched.items():
    t = json.dumps(OLD[c], ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data', c + '.json'), 'w', encoding='utf-8').write(t)
    META['cols'][c]['bytes'] = len(t.encode())
    print('rel محدّث في', c, len(ids), file=sys.stderr)
json.dump(META, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

report = [r for r in json.load(open(os.path.join(ROOT, 'data', 'reports.json'), encoding='utf-8')) if r['col'] != CODE]
rv = collections.Counter(r.split('؛')[0].split(':')[0] for x in items for r in x['rv'])
report.append({'col': CODE, 'title': META['cols'][CODE]['title'],
               'stats': [[len(items), 'مبدأ'], [len({x['c'][0].get('k') or x['id'] for x in items}), 'حكمًا'], [pg['pages'], 'صفحة'],
                         [nlink, 'مبدأ مرتبط بحكمه في مجموعة أخرى'], [sum(1 for x in items if x['rv']), 'يحتاج مراجعة']],
               'method': ['المصدر نسخة مصوّرة ضوئيًا من العدد الثاني الذي أصدرته وزارة العدل، مطبوع بالآلة الكاتبة: قسمان (المواد المدنية والتجارية والأحوال الشخصية، والمواد الجزائية)، وموضوعات مرتبة هجائيًا، تحت كل منها مبادئ مرقمة يلي كلًّا منها سطر الإسناد (رقم الطعن ونوعه وتاريخ الجلسة بالهجري والميلادي).',
                          'النص منقول حرفيًا بقراءتين مستقلتين لكل صفحة، ثم مقارنة آلية كلمةً كلمة، وكل اختلاف بينهما (نحو 150 موضعًا) حُسم بالنظر في صورة الصفحة مكبّرة. الإملاء كما طُبع (الهاء مكان التاء المربوطة، والياء دون نقط، وبلا همزات أحيانًا)، ويُحذف التطويل وحده، والأرقام بالأرقام الغربية.',
                          'الكتابة اليدوية في الهوامش والخطوط تحت الكلمات أُهملت. مفتاح الرقم ٩ في الآلة الكاتبة باهت يطبع شبيهًا بالرقم ٦، فقُرئ ٩ حيث يدل عليه التاريخ الهجري المقابل وتكرار الإسناد نفسه.',
                          'سطور «راجع …» الإحالية في المصدر لم تُعدّ مبادئ.',
                          'التصنيف: بعنوان الموضوع والعنوان الفرعي الذي ورد تحته المبدأ. القوانين من ذكرها في النص.'],
               'checks': [['قراءتان مستقلتان ومطابقة كل اختلاف على الصورة', True, 'لا يبقى إلا ما عُلِّم «قراءة غير مؤكدة» حيث الحبر باهت أو مطموس.'],
                          ['التاريخ الهجري مع الميلادي في كل إسناد', True, 'ما اختلفا فيه أكثر من يومين عُلِّم، وأُبقي التاريخ الميلادي المطبوع.'],
                          ['رقم الطعن وتاريخه مع المجموعات الأخرى في المكتبة', True, f'{nlink} مبدأً مرتبطًا بحكمه في مجموعة أخرى بالرقم وتاريخ الجلسة.'],
                          ['موضع كل مبدأ في صورة الصفحة', not rv.get('تعذّر تحديد موضع المبدأ في صورة الصفحة'), f"بلا موضع: {rv.get('تعذّر تحديد موضع المبدأ في صورة الصفحة', 0)}"]],
               'notes': ['أسطر إسناد قليلة مقطوعة أسفل الصفحة في النسخة المصوّرة؛ عُلِّمت، ولم تُستكمل إلا من إسناد الطعن نفسه في المجموعة.', 'نصوص المجموعة بلا أسماء الخصوم أصلًا.']})
json.dump(report, open(os.path.join(ROOT, 'data', 'reports.json'), 'w', encoding='utf-8'), ensure_ascii=False)
print(CODE, 'مبادئ', len(items), 'مرتبطة بمجموعات أخرى', nlink, file=sys.stderr)
