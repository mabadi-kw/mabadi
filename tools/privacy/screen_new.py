#!/usr/bin/env python3
"""فرز علامات الحارس في مجموعات جديدة وتطبيق القاعدة (الاستبعاد لا الحجب):
- أسماء هيئة المحكمة (القضاة) في سياقها، وعبارات معروف أنها ليست أسماء: تُجاز (allow.json ببصمة النص).
- غير ذلك (أسماء أفراد أو محامين أو متهمين أو مجني عليهم، أرقام مدنية أو حسابات، عناوين):
    · في نص القاعدة وحده → يُحذف نص القاعدة ويبقى الموجز (مع حاشية).
    · في الموجز أو العنوان → يُسحب المبدأ كله (tools/privacy/withdraw.py).
    · في صفحة مصوّرة → تُبيَّض الصفحة ويُحذف نصها، وتُسجَّل في data/withdrawn.json.
لا يطبع النصوص؛ يطبع المعرّفات وقرارها فقط.
الاستعمال: python3 tools/privacy/screen_new.py [--apply] MQ35 [MQ36 …]"""
import os, sys, json, re, hashlib, subprocess
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE); import privacy as P
D = lambda *p: os.path.join(ROOT, *p)
sha = lambda t: hashlib.sha1(t.encode('utf-8')).hexdigest()
APPLY = '--apply' in sys.argv; CODES = [a for a in sys.argv[1:] if not a.startswith('--')]
FP = ['علي الصالح', 'دانه علي', 'عمر طلق', 'أبو محمد علي', 'علي الصباح', 'عبد الله بن عمر']
JUD = re.compile(r'(المستشار|المستشارين|القاضي|القاضين|القضاة|برئاسة|وعضوية|الهيئة التي|الدائرة|رئيس الجلسة|رئيساً|رئيسا|نائب رئيس المحكمة|وكيل المحكمة)')
GJUD = re.compile(r'(المستشار|المستشارين|القاضي|القضاة|رئيس المحكمة|برئاسة|وعضوية|أمين السر|وكيل النيابة|بحضور|جلسة \d{1,2}/\d{1,2}/\d{4}|وكيل المحكمة|رئيس الجلسة|و ?د\.)')
LAWYER = re.compile(r'(المحامي|محام|الأستاذ|الاستاذ|المدعو|المتهم|المجني|المرحوم|الطاعن|المطعون|ورثة|الملازم|الضابط|المحاسب|الموظف|المختصة)')


def benign(t, h):
    m = h['match'].split(': ')[-1]
    if any(f in t[max(0, t.find(m) - 15):t.find(m) + len(m) + 15] for f in FP): return True
    if h['kind'] == 'role' and re.search(r'\sشهد\s', ' ' + m + ' '): return True
    if h['kind'] != 'name': return False
    for i in [k.start() for k in re.finditer(re.escape(m), t)] or [t.find(m)]:
        pre = t[max(0, i - 160):i]
        near = t[max(0, i - 35):i]
        if not (JUD.search(pre) and not LAWYER.search(near)): return False
    return True


def text_of(x): return ' '.join(x.get('p', [])) + ' ' + (x.get('rule') or '') + ' ' + (x.get('ttl') or '') + ' ' + ' '.join(c.get('raw', '') for c in x.get('c', []))


allow = json.load(open(D('tools', 'privacy', 'allow.json'), encoding='utf-8'))
M = json.load(open(D('data', 'meta.json'), encoding='utf-8'))
W = json.load(open(D('data', 'withdrawn.json'), encoding='utf-8'))
withdraw_ids, strip_ids, blank = [], [], {}
for c in CODES:
    items = json.load(open(D('data', c + '.json'), encoding='utf-8')); ch = False
    for x in items:
        t = text_of(x); hs = [h for h in P.scan(t) if h['level'] == 'block']
        if not hs or allow.get(x['id']) == sha(t): continue
        bad = [h for h in hs if not benign(t, h)]
        if not bad:
            allow[x['id']] = sha(t); print(x['id'], 'أُجيز (قضاة/ليس اسمًا)'); continue
        head = ' '.join(x.get('p', [])) + ' ' + (x.get('ttl') or '')
        in_head = any(h['match'].split(': ')[-1] in head for h in bad)
        if in_head: withdraw_ids.append(x['id']); print(x['id'], 'يُسحب (البيان في الموجز/العنوان)')
        else:
            strip_ids.append(x['id']); print(x['id'], 'يُحذف نص القاعدة')
            if APPLY:
                x['rule'] = ''; x['fn'] = x.get('fn', []) + ['نص القاعدة غير منشور لورود بيان شخصي فيه؛ الموجز منقول كما هو.']; ch = True
    if APPLY and ch:
        s = json.dumps(items, ensure_ascii=False, separators=(',', ':')); open(D('data', c + '.json'), 'w', encoding='utf-8').write(s); M['cols'][c]['bytes'] = len(s.encode())
    # الصفحات
    import glob
    for fp in sorted(glob.glob(D('pagetext', c, 't*.json'))):
        T = json.load(open(fp, encoding='utf-8')); cht = False
        for g, lines in list(T.items()):
            if not lines: continue
            t = P.norm(' '.join(l[0] for l in lines)); key = f'page:{c}:{g}'
            hs = []
            for h in P.scan(t):   # مثل الحارس: أسماء هيئة المحكمة في سياقها القريب مستثناة
                if h['level'] != 'block': continue
                i = t.find(h['match'].split(': ')[-1])
                if h['kind'] in ('name', 'role') and GJUD.search(t[max(0, i - 60):i]): continue
                hs.append(h)
            if not hs or allow.get(key) == sha(t): continue
            bad = [h for h in hs if not benign(t, h)]
            if not bad: allow[key] = sha(t); continue
            blank.setdefault(c, []).append(int(g))
            if APPLY: T[g] = []; cht = True
        if APPLY and cht: json.dump(T, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    if APPLY and blank.get(c):
        C = M['cols'][c]; gp = C.get('gp', 20); gc = gp // 10; cell = C['cell']
        for g in blank[c]:
            gi, k = (g - 1) // gp, (g - 1) % gp; fp = D('pages', c, f'g{gi:03d}.webp')
            if not os.path.exists(fp): continue
            im = Image.open(fp).convert('L'); x0, y0 = (k % gc) * cell[0], (k // gc) * cell[1]
            im.paste(255, (x0, y0, x0 + cell[0], y0 + cell[1])); im.save(fp, 'WEBP', lossless=True, method=6)
        W.setdefault('pages', {}).setdefault(c, [])
        W['pages'][c] = sorted(set(W['pages'][c]) | set(blank[c]))
    print(c, 'صفحات تُبيَّض:', len(blank.get(c, [])), file=sys.stderr)
print('يُسحب', len(withdraw_ids), '— يُحذف نص قاعدته', len(strip_ids), file=sys.stderr)
if APPLY:
    W['rule_ids'] = sorted(set(W.get('rule_ids', [])) | set(strip_ids))
    open(D('data', 'withdrawn.json'), 'w', encoding='utf-8').write(json.dumps(W, ensure_ascii=False, indent=0))
    json.dump(M, open(D('data', 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    json.dump(allow, open(D('tools', 'privacy', 'allow.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if withdraw_ids: subprocess.run([sys.executable, D('tools', 'privacy', 'withdraw.py')] + withdraw_ids, check=True)
