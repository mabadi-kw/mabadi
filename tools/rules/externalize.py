#!/usr/bin/env python3
"""يخفف مجموعتي القواعد عند فتح التطبيق: نص القاعدة الطويل ينتقل إلى ملفات أجزاء (data/rx/<المجموعة>-<k>.json، 400 قاعدة في الجزء)
يُحمَّل الجزء عند فتح القاعدة أو عرضها. وتُحذف صور الصفحات ونصوصها (المصدر ملف Word نصه منقول كما هو، فالصورة إعادة رسم له لا تضيف تحققًا)،
ويبقى رقم الصفحة المطبوع في الكتاب (من تذييل الملف). الاستعمال: python3 externalize.py QK5 QJ5
"""
import os, sys, json, shutil
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CH = 400
mp = os.path.join(ROOT, 'data', 'meta.json'); META = json.load(open(mp, encoding='utf-8'))
os.makedirs(os.path.join(ROOT, 'data', 'rx'), exist_ok=True)
for code in sys.argv[1:]:
    f = os.path.join(ROOT, 'data', code + '.json'); items = json.load(open(f, encoding='utf-8'))
    chunks = {}
    for i, it in enumerate(items):
        k = i // CH
        if 'rule' in it:
            chunks.setdefault(k, {})[it['id']] = it.pop('rule')
            it['rx'] = k
        it['rg'] = []
    for k, d in chunks.items():
        json.dump(d, open(os.path.join(ROOT, 'data', 'rx', f'{code}-{k:02d}.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    s = json.dumps(items, ensure_ascii=False, separators=(',', ':')); open(f, 'w', encoding='utf-8').write(s)
    META['cols'][code]['bytes'] = len(s.encode()); META['cols'][code]['noimg'] = True
    for sub in ('pages', 'pagetext'):
        d = os.path.join(ROOT, sub, code)
        if os.path.isdir(d): shutil.rmtree(d)
    print(code, 'أجزاء', len(chunks), 'حجم الملف', len(s.encode()) // 1024, 'ك.ب')
json.dump(META, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
# files.json
files = []
for sub in ('data', 'pages', 'pagetext'):
    for dp, _, fs in os.walk(os.path.join(ROOT, sub)):
        for fn in sorted(fs):
            if fn == 'meta.json' and sub == 'pages': continue
            p = os.path.relpath(os.path.join(dp, fn), ROOT); files.append({'p': p, 's': os.path.getsize(os.path.join(dp, fn))})
files.sort(key=lambda x: x['p'])
json.dump({'bytes': sum(x['s'] for x in files), 'files': files}, open(os.path.join(ROOT, 'files.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('files.json', len(files))
