#!/usr/bin/env python3
"""حارس الخصوصية قبل النشر.
يفحص كل ما سيُنشر بمحرك الخصوصية، ويمنع النشر (رمز خروج 1) إن وجد ما يشبه بيانًا شخصيًا لم يُجَز.
  python3 tools/privacy/guard.py            فحص المكتبة
  python3 tools/privacy/guard.py --selftest يتحقق أن الحارس يرفض اسمًا مدسوسًا
الإجازة: tools/privacy/allow.json = {"<المعرّف>": "<بصمة النص sha1>"}؛ إذا تغيّر النص بطلت الإجازة وعاد الفحص.
لا يُطبع النص المشتبه كاملًا؛ يُطبع المعرّف ونوع العلامة وموضعها مختصرًا."""
import os, sys, json, hashlib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); import privacy as P
def text_of(x): return ' '.join(x.get('p', [])) + ' ' + (x.get('rule') or '') + ' ' + (x.get('ttl') or '') + ' ' + ' '.join(c.get('raw', '') for c in x.get('c', []))
def sha(t): return hashlib.sha1(t.encode('utf-8')).hexdigest()
def run(root=ROOT, quiet=False):
    allow = json.load(open(os.path.join(HERE, 'allow.json'), encoding='utf-8')) if os.path.exists(os.path.join(HERE, 'allow.json')) else {}
    meta = json.load(open(os.path.join(root, 'data', 'meta.json'), encoding='utf-8'))
    bad = []; n = 0
    for c in meta['order']:
        for x in json.load(open(os.path.join(root, 'data', c + '.json'), encoding='utf-8')):
            n += 1; t = text_of(x)
            f = [y for y in P.scan(t) if y['level'] == 'block']
            if f and allow.get(x['id']) != sha(t): bad.append((x['id'], f))
    # نصوص الواجهة الأخرى
    for fn in ('changes.json', 'data/reports.json'):
        p = os.path.join(root, fn)
        if os.path.exists(p):
            f = [y for y in P.scan(open(p, encoding='utf-8').read()) if y['level'] == 'block']
            if f and allow.get(fn) != sha(open(p, encoding='utf-8').read()): bad.append((fn, f))
    if not quiet:
        print(f'حارس الخصوصية: فُحص {n} مبدأ؛ ما يمنع النشر: {len(bad)}')
        for i, f in bad[:200]: print('  ✘', i, '·', '؛ '.join(f"{y['kind']}" for y in f[:3]))
    return bad
if __name__ == '__main__':
    if '--selftest' in sys.argv:
        import tempfile, shutil
        d = tempfile.mkdtemp(); os.makedirs(os.path.join(d, 'data'))
        json.dump({'order': ['T'], 'cols': {'T': {}}}, open(os.path.join(d, 'data', 'meta.json'), 'w'))
        json.dump([{'id': 'T-1', 'p': ['من المقرر أن الحكم يجب أن يشتمل على أسبابه'], 'c': []},
                   {'id': 'T-2', 'p': ['وكان الحكم قد عول على أقوال الشاهد/ فهد سالم العنزي'], 'c': []}], open(os.path.join(d, 'data', 'T.json'), 'w'), ensure_ascii=False)
        b = run(d, quiet=True); shutil.rmtree(d)
        ok = [i for i, _ in b] == ['T-2']
        print('اختبار الحارس:', 'ناجح — رفض الاسم المدسوس وأجاز السليم' if ok else 'فاشل', b); sys.exit(0 if ok else 1)
    sys.exit(1 if run() else 0)
