#!/usr/bin/env python3
"""استخراج المستخلص على جهاز المستخدم (لا يخرج منه إلا المجاز).
local26.py <مجلد الأحكام> <مجلد عمل مؤقت> <مجلد المخرجات> [الدائرة]
1) تحويل Word إلى نص (LibreOffice) في مجلد العمل المؤقت.
2) parse26 ← select26 (القطع عند أول تطبيق، الاستبعادات، كاشف التسرّب).
3) محرك الخصوصية: أسماء أطراف كل حكم + معجم محلي من أسماء أطراف كل الأحكام (لا يُحفظ خارج الجهاز). أي علامة block تُخرج المبدأ كله.
4) هيئة المحكمة من ديباجة الحكم وحدها (الرئيس والأعضاء؛ لا أمين السر ولا النيابة).
المخرجات في مجلد المخرجات:
  approved.json  — المبادئ المجازة آليًا (بلا أسماء أطراف، ولا نص حكم)
  review.html    — عيّنة للمراجعة (2% وبحد أدنى 100، أو الكل إن قلّ) + كل ما عليه علامة مراجعة
  log.txt        — الأعداد وأسباب الاستبعاد، بلا نصوص ولا أسماء
ثم تُحذف النصوص المستخرجة من مجلد العمل."""
import sys, os, re, json, glob, subprocess, random, shutil, html, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'privacy')); import privacy as PV
src, work, outd = sys.argv[1:4]; CIRC = sys.argv[4] if len(sys.argv) > 4 else None
txt = os.path.join(work, 'txt'); os.makedirs(txt, exist_ok=True); os.makedirs(outd, exist_ok=True)
docs = sorted(f for f in os.listdir(src) if f.lower().endswith(('.doc', '.docx')))
ids = {}
for i, f in enumerate(docs): ids['D%05d' % i] = f
# 1) تحويل
todo = [f for f in docs if not os.path.exists(os.path.join(txt, os.path.splitext(f)[0] + '.txt'))]
for k in range(0, len(todo), 40):
    subprocess.run(['soffice', '--headless', '--convert-to', 'txt:Text (encoded):UTF8', '--outdir', txt] + [os.path.join(src, f) for f in todo[k:k + 40]],
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=1800)
tx2 = os.path.join(work, 'txt2'); os.makedirs(tx2, exist_ok=True)
mp = open(os.path.join(work, 'map.tsv'), 'w', encoding='utf-8'); nconv = 0
for k, f in ids.items():
    t = os.path.join(txt, os.path.splitext(f)[0] + '.txt')
    if os.path.exists(t):
        shutil.copy(t, os.path.join(tx2, k + '.txt')); nconv += 1
        mp.write(f'{k}\t{f}\t{int(os.path.getmtime(os.path.join(src, f)) * 1000)}\n')
mp.close()
# 2) التحليل والاختيار
env = dict(os.environ, NAMES_OUT=os.path.join(work, 'names.json'))
r1 = subprocess.run([sys.executable, os.path.join(HERE, 'parse26.py'), tx2, os.path.join(work, 'map.tsv'), os.path.join(work, 'parsed.json')], env=env, capture_output=True, text=True)
r2 = subprocess.run([sys.executable, os.path.join(HERE, 'select26.py'), os.path.join(work, 'parsed.json'), os.path.join(work, 'kept.json'), os.path.join(work, 'excluded.json')], capture_output=True, text=True)
kept = json.load(open(os.path.join(work, 'kept.json'), encoding='utf-8'))
exc = json.load(open(os.path.join(work, 'excluded.json'), encoding='utf-8'))
names = json.load(open(os.path.join(work, 'names.json'), encoding='utf-8'))
# 3) الخصوصية
PV.load_extra({w for ns in names.values() for n in ns for w in re.findall(r'[ء-ي]+', n) if len(w) >= 3 and w not in PV.STOPW})
# 4) هيئة المحكمة
TITLE = re.compile(r'(?:السيد(?:ة)?|السادة|الأستاذ|الاستاذ|المستشار(?:ين|ون)?|وكيل\s+المحكمة|رئيس\s+الدائرة|القاضي|القضاة|/|:|-)')
STOP = re.compile(r'وحضور|بحضور|أمين\s+السر|امين\s+السر|النيابة|المرفوع|في\s+الطعن|\n\s*\n')
def panel(t):
    h = re.sub(r'[ـ]', '', t[:3000]); m = re.search(r'برئاس[ةه]', h)
    if not m: return None
    seg = h[m.end():m.end() + 500]; s = STOP.search(seg); seg = seg[:s.start()] if s else seg
    pres, _, mem = seg.partition('وعضوية')
    clean = lambda x: re.sub(r'\s+', ' ', TITLE.sub(' ', x)).strip(' ،,.')
    p = clean(pres); ms = [clean(x) for x in re.split(r'،|,|\s+و\s+|\s+و(?=\s*(?:السيد|المستشار|الأستاذ))', mem)]
    ms = [x for x in ms if 2 <= len(x.split()) <= 6]
    if not p or not 2 <= len(p.split()) <= 6: return None
    return {'president': p, 'members': ms}
out = []; why = collections.Counter(); kinds = collections.Counter(); rev = []
for r in kept:
    if CIRC and r.get('circuit') != CIRC: why['دائرة أخرى'] += 1; continue
    pn = names.get(r['id'], [])
    rules = []
    for x in r['rules']:
        f = PV.scan(x['t'], pn)
        if PV.verdict(f) == 'block':
            why['استُبعد لبيان شخصي'] += 1
            for y in f:
                if y['level'] == 'block': kinds[y['kind']] += 1
            continue
        rules.append({'t': x['t'], **({'review': [y['kind'] for y in f]} if f else {})})
    if not rules: continue
    t = open(os.path.join(tx2, r['id'] + '.txt'), encoding='utf-8').read()
    out.append({'appeal': r['appeal']['pairs'], 'circuit': r.get('circuit'), 'cno': r.get('cno'), 'date': r['date'], 'kind': r['kind'],
                'panel': panel(t), 'rules': rules})
json.dump(out, open(os.path.join(outd, 'approved.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
# العيّنة
allr = [(i, j) for i, d in enumerate(out) for j, _ in enumerate(d['rules'])]
random.seed(2025); n = max(100, len(allr) * 2 // 100)
samp = set(random.sample(allr, min(n, len(allr)))) | {(i, j) for i, d in enumerate(out) for j, x in enumerate(d['rules']) if x.get('review')}
cards = []
for k, (i, j) in enumerate(sorted(samp), 1):
    d = out[i]; x = d['rules'][j]; ap = '، '.join(f'{a}/{b}' for a, b in d['appeal'])
    pnl = d['panel']; ptxt = (pnl['president'] + (' — ' + '، '.join(pnl['members']) if pnl['members'] else '')) if pnl else 'لم تُستخرج'
    cards.append(f'<article><header><b>{k}</b> الطعن {html.escape(ap)} {html.escape(d["circuit"] or "")} — جلسة {html.escape(d["date"] or "")}'
                 f'{" — " + html.escape(d["kind"]) if d["kind"] != "حكم" else ""}{" <mark>مراجعة: " + html.escape("، ".join(x["review"])) + "</mark>" if x.get("review") else ""}</header>'
                 f'<p>{html.escape(x["t"])}</p><footer>الهيئة: {html.escape(ptxt)}</footer>'
                 f'<label><input type="checkbox"> فيه اسم أو بيان شخصي</label> <label><input type="checkbox"> القطع غير صحيح</label></article>')
open(os.path.join(outd, 'review.html'), 'w', encoding='utf-8').write('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><title>مراجعة المستخلص</title><style>body{font-family:Tahoma,Arial;max-width:900px;margin:20px auto;padding:0 16px;line-height:1.9;background:#f4f1ea}article{background:#fff;border:1px solid #ddd;border-radius:10px;padding:12px 16px;margin:12px 0}header{color:#12325e;font-size:.9rem}footer{color:#666;font-size:.85rem}mark{background:#ffe58a}label{font-size:.85rem;margin-inline-end:12px}</style>'
    f'<h1>مراجعة المستخلص — عيّنة {len(samp)} من {len(allr)} مبدأ</h1><p>اقرأ كل مبدأ؛ علّم ما فيه اسم أو بيان شخصي، أو ما قُطع في غير موضعه. هذا الملف على جهازك وحده.</p>' + ''.join(cards) + '</html>')
ex = collections.Counter(e['why'] for e in exc)
log = [f'ملفات: {len(docs)} · حُوّل إلى نص: {nconv}', f'أحكام وقرارات صالحة بعد الاختيار: {len(kept)}', f'أحكام لها مبادئ مجازة: {len(out)} · مبادئ مجازة: {len(allr)}',
       f'هيئة المحكمة مستخرجة في: {sum(1 for d in out if d["panel"])} من {len(out)}', 'الاستبعاد على مستوى الحكم:'] + [f'  {k}: {v}' for k, v in ex.most_common()] + \
      ['الاستبعاد على مستوى المبدأ:'] + [f'  {k}: {v}' for k, v in why.most_common()] + ['أنواع العلامات المانعة:'] + [f'  {k}: {v}' for k, v in kinds.most_common()] + \
      ['', 'parse26: ' + r1.stdout.strip().replace('\n', ' | '), 'select26: ' + r2.stdout.strip().replace('\n', ' | ')] + ([('stderr: ' + r1.stderr[-500:])] if r1.returncode else [])
open(os.path.join(outd, 'log.txt'), 'w', encoding='utf-8').write('\n'.join(log) + '\n')
print('\n'.join(log))
# تنظيف النصوص المؤقتة (تبقى المخرجات فقط)
for d_ in (txt, tx2): shutil.rmtree(d_, ignore_errors=True)
for f_ in ('names.json', 'parsed.json', 'kept.json', 'excluded.json', 'map.tsv'):
    try: os.remove(os.path.join(work, f_))
    except FileNotFoundError: pass
