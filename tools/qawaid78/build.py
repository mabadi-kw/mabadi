#!/usr/bin/env python3
"""مجموعة «القواعد القانونية التي قررتها محكمة التمييز» (وزارة العدل) — العدد الثاني 1/1/1978–31/3/1978، من نسخة مصوّرة ضوئيًا بالآلة الكاتبة.

المدخلات (مجلد العمل):
  final/p-NN.txt  النص الحرفي لكل صفحة بعد قراءتين مستقلتين ومطابقة الاختلافات على الصورة (الصيغة في SPEC.md)
  tsv/p-NN.tsv    مواضع الأسطر بالقراءة الآلية (tesseract) لتحديد موضع المبدأ في الصورة
  src.pdf         المصدر
الاستعمال: python3 build.py <مجلد العمل> <مجلد المخرجات>
المخرجات: QM78.json (العناصر) وQM78-pages.json ومجلد pages/QM78 (شبكات WebP) وpagetext/QM78 وreport.json
"""
import os, re, sys, json, csv, glob, collections, subprocess, tempfile, difflib
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'journal'))
from build import topics_for                       # noqa: E402
sys.path.insert(0, os.path.join(HERE, '..', 'journal', 'cls'))
from laws import extract_ctx, SUSPECT               # noqa: E402

W, OUT = sys.argv[1], sys.argv[2]
CODE = 'QM78'
PDF_FIRST = 7          # الصفحة المطبوعة 3 = صفحة الملف 7
OFF = 2                # رقم الصفحة المطبوع = g + 2
DPI = 220
PW, PH = 594.24, 846.24
PART1 = 'المواد المدنيه والتجاريه والاحوال الشخصيه'
PART2 = 'المواد الجزائيه'
CH = {'تجارى': 'تجاري', 'تجاري': 'تجاري', 'ثجارى': 'تجاري', 'مدني': 'مدني', 'مدنى': 'مدني', 'احوال': 'أحوال شخصية', 'أحوال': 'أحوال شخصية',
      'جزائي': 'جزائي', 'جزائى': 'جزائي', 'جنائي': 'جزائي', 'جناثي': 'جزائي', 'جزاء': 'جزائي', 'عمالي': 'عمالي'}
# بدايات الشهور الهجرية سنة 1398 كما تدل عليها التواريخ المزدوجة في المجموعة نفسها (تقويم الكويت يومئذ)
HM = {'محرم': (1977, 12, 12), 'صفر': (1978, 1, 10), 'ربيع الاول': (1978, 2, 9), 'ربيع الثاني': (1978, 3, 10)}
MON = [(r'محرم', 'محرم'), (r'صفر', 'صفر'), (r'ربيع ?(?:ال)?[أا]و ?ل', 'ربيع الاول'), (r'ربيع ?(?:ال)?ثا?ني|ربيع ثان|ربيع ?(?:ال)?ثان', 'ربيع الثاني')]
os.makedirs(OUT, exist_ok=True)


def nz(t):
    t = re.sub(r'[ـً-ٰ]', '', t); t = re.sub('[أإآ]', 'ا', t).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return re.sub(r'[^ء-ي0-9]', '', t)


# 1) قراءة الصفحات إلى كتل مرتبة
pages = []
for f in sorted(glob.glob(os.path.join(W, 'final2' if os.path.isdir(os.path.join(W, 'final2')) else 'final', 'p-*.txt'))):
    t = open(f, encoding='utf-8').read()
    fn = int(re.search(r'p-(\d+)', f).group(1))
    m = re.match(r'@page (\d+)', t)
    printed = int(m.group(1))
    assert printed == fn - PDF_FIRST + 3, (f, printed)
    g = fn - PDF_FIRST + 1
    blocks = []
    for ln in t.split('\n')[1:]:
        ln = ln.strip()
        if not ln: continue
        blocks.append(ln)
    pages.append((g, printed, blocks))

# 2) تقطيع المبادئ
items = []
part, h2, h3 = PART1, None, None
cur = None            # المبدأ الجاري
pending = []          # مبادئ بلا إسناد بعد
lastcit = None        # آخر إسناد (للتكملة في الصفحة التالية)
skipped = []


def flush_principle(p):
    p['text'] = re.sub(r'\s+', ' ', p['text']).strip()
    items.append(p); pending.append(p)


def close_pending():
    for p in pending: p['nocit'] = True
    pending.clear()


for gi_, (g, printed, blocks) in enumerate(pages):
    nxt = pages[gi_ + 1][2] if gi_ + 1 < len(pages) else []
    for bi, b in enumerate(blocks):
        if b.startswith('#') and pending: close_pending()
        if b.startswith('## '):
            h = b[3:].strip()
            if 'المواد الجزائ' in h: part, h2, h3 = PART2, None, None; continue
            h2, h3 = h, None; continue
        if b.startswith('### '):
            h3 = b[4:].strip(); continue
        cont = b.startswith('+ ')
        if cont: b = b[2:].strip()
        if b.startswith('('):
            cit = {'raw': b, 'pages': [g]}
            # سطر إسناد هو آخر ما في الصفحة، بلا تاريخ ميلادي، ولا تكملة له في الصفحة التالية: مقطوع في المسح
            if bi == len(blocks) - 1 and not re.search(r'\d{1,2}\s*/\s*\d{1,2}\s*/\s*19\d\d', b) and not (nxt and nxt[0].startswith('+ ')) and '⟦مقطوع⟧' not in b:
                cit['raw'] = b.rstrip(' –-') + ' ⟦مقطوع⟧'
            for p in pending: p['cit'] = cit
            if len(pending) > 1:
                for p in pending: p['rv'].append(f'إسناد واحد في المصدر بعد {len(pending)} مبادئ متتالية؛ نُسب إليها جميعًا')
            pending.clear(); lastcit = cit; cur = None; continue
        if cont:
            # تكملة إسناد أو مبدأ من الصفحة السابقة
            if cur is None and lastcit is not None and not lastcit.get('done') and re.search(r'^[\d\s/ربيعصفرمحرمالأاولثانيهـ.–\-]*الموافق|^\d|^\)|^ربيع|^صفر|^محرم', b):
                lastcit['raw'] += ' ' + b; lastcit['pages'].append(g); continue
            if cur is not None:
                cur['text'] += ' ' + b; cur['pages'].append(g) if g not in cur['pages'] else None; continue
            if lastcit is not None:
                lastcit['raw'] += ' ' + b; lastcit['pages'].append(g); continue
        if re.match(r'^و?راجع\b', b) or 'بسم الله' in b:
            skipped.append((printed, b)); continue
        m = re.match(r'^\[(\d+)\]\s*', b)
        num = int(m.group(1)) if m else None
        text = b[m.end():] if m else b
        if lastcit is not None: lastcit['done'] = True
        cur = {'num': num, 'text': text, 'pages': [g], 'part': part, 'h2': h2, 'h3': h3, 'printed': printed, 'rv': []}
        flush_principle(cur)
        cur = items[-1]
    # نهاية الصفحة: يبقى المبدأ الجاري مفتوحًا للتكملة

# 3) الإسناد
HIJ = re.compile(r'(\d{1,2})\s*/?\s*(' + '|'.join(x for x, _ in MON) + r')\s*/?\s*(\d{4})')


def greg_from_hijri(d, mon, y):
    import datetime
    if y != 1398 or mon not in HM: return None
    b = datetime.date(*HM[mon])
    return b + datetime.timedelta(days=d - 1)


def parse_cit(raw):
    r = {'raw': raw}
    s = raw.replace('⟦', '').replace('⟧', '')
    m = re.search(r'رقم\s*–?\s*([\d\s،,/]+)', s) or re.search(r'بالتم\S*\s+([\d\s،,/]+)', s) or re.search(r'طعن\s+([\d\s،,/]+)', s)
    nums = []
    if m:
        seg = m.group(1)
        mm = re.match(r'\s*((?:\d+\s*[،,]\s*)*)(\d+)\s*/\s*(\d{2,4})', seg)
        if mm:
            yr = int(mm.group(3)); yr = yr + 1900 if yr < 100 else yr
            for n in re.findall(r'\d+', mm.group(1)) + [mm.group(2)]: nums.append(f'{int(n)}/{yr}')
    r['nums'] = nums
    ch = None
    for w, c in CH.items():
        if re.search(r'(?<![ء-ي])' + w + r'(?![ء-ي])', s): ch = c; break
    r['ch'] = ch
    hm = None
    for rx, name in MON:
        mm = re.search(r'(\d{1,2})\s*/?\s*(?:' + rx + r')\s*/?\s*(\d{4})', s)
        if mm: hm = (int(mm.group(1)), name, int(mm.group(2))); break
    r['hijri'] = hm
    gm = re.search(r'(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(19\d\d)', s)
    r['greg'] = (int(gm.group(1)), int(gm.group(2)), int(gm.group(3))) if gm else None
    return r


# تواريخ الطعون كاملة الإسناد في المجموعة نفسها (لاستكمال ما قُطع سطره)
FULLD = {}
for it in items:
    c = it.get('cit')
    if not c or '⟦مقطوع⟧' in c['raw']: continue
    P = parse_cit(re.sub(r'\s+', ' ', c['raw']))
    if P['nums'] and P['greg']:
        d, mo, y = P['greg']; FULLD.setdefault('+'.join(P['nums']), set()).add((f'{y:04d}-{mo:02d}-{d:02d}', it['printed']))
for it in items:
    c = None if it.get('nocit') else it.get('cit')
    if not c:
        it['c'] = [{'raw': '(بلا إسناد)'}]; it['rv'].append('لا يوجد سطر إسناد لهذا المبدأ في المصدر'); continue
    raw = re.sub(r'\s+', ' ', c['raw']).strip()
    P = parse_cit(raw)
    cut = '⟦مقطوع⟧' in raw
    shown = raw.replace(' ⟦مقطوع⟧', ' …').replace('⟦مقطوع⟧', '…')
    shown = re.sub(r'⟦\?([^⟧]*)⟧', r'\1', shown)
    x = {'raw': shown}
    if P['ch']: x['ch'] = P['ch']
    date = None
    if P['greg']:
        d, mo, y = P['greg']
        if 1 <= mo <= 12 and 1 <= d <= 31: date = f'{y:04d}-{mo:02d}-{d:02d}'
    gh = greg_from_hijri(*P['hijri']) if P['hijri'] else None
    nk = '+'.join(P['nums'])
    if cut:
        same = sorted(FULLD.get(nk, ()))
        if len({d for d, _ in same}) == 1:
            date = same[0][0]
            it['rv'].append(f'سطر الإسناد مقطوع أسفل الصفحة في النسخة المصوّرة؛ تاريخ الجلسة من إسناد الطعن نفسه في المجموعة (ص{same[0][1]})')
        else:
            it['rv'].append('سطر الإسناد مقطوع أسفل الصفحة في النسخة المصوّرة' + ('؛ تاريخ الجلسة غير معروف' if nk else '؛ رقم الطعن وتاريخه غير معروفين'))
    if P['greg'] and gh and date and abs((gh - __import__('datetime').date.fromisoformat(date)).days) > 2:
        it['rv'].append(f'إسناد: التاريخ الهجري ({P["hijri"][0]} {P["hijri"][1]} {P["hijri"][2]}هـ) لا يوافق التاريخ الميلادي المطبوع {P["greg"][0]}/{P["greg"][1]}/{P["greg"][2]}؛ أُبقي المطبوع')
    if not date and gh and not cut:
        it['rv'].append('إسناد: التاريخ الميلادي غير مذكور؛ تاريخ الجلسة محسوب من التاريخ الهجري')
        date = gh.isoformat()
    if nk and date: x['k'] = nk + '@' + date
    elif nk: x['kn'] = nk
    if not nk and not cut: it['rv'].append('إسناد: تعذر قراءة رقم الطعن وسنته')
    if not P['ch'] and not cut: it['rv'].append('إسناد: نوع الطعن غير مذكور')
    it['c'] = [x]
    it['citp'] = c['pages']

# الطعن نفسه (الرقم ونوع الطعن) بتاريخين مختلفين داخل المجموعة
GD = collections.defaultdict(set)
for it in items:
    x = it['c'][0]
    if x.get('k'): GD[(x['k'].split('@')[0], x.get('ch'))].add((x['k'].split('@')[1], it['printed']))
for it in items:
    x = it['c'][0]
    if not x.get('k'): continue
    ds = GD[(x['k'].split('@')[0], x.get('ch'))]
    if len({d for d, _ in ds}) > 1:
        oth = sorted({(d, pp) for d, pp in ds if d != x['k'].split('@')[1]})
        it['rv'].append('إسناد: ورد الطعن نفسه في المجموعة بتاريخ جلسة آخر: ' + '، '.join(f'{int(d[8:])}/{int(d[5:7])}/{d[:4]} (ص{pp})' for d, pp in oth[:3]))

# 4) قراءات غير مؤكدة
for it in items:
    dw = re.findall(r'⟦\?([^⟧]*)⟧', it['text'])
    if dw: it['rv'].append('قراءة غير مؤكدة في النسخة المصوّرة (حبر باهت أو طمس): ' + '، '.join(f'«{w}»' for w in dw))
    if '⟦؟؟⟧' in it['text']: it['rv'].append('كلمة غير مقروءة في النسخة المصوّرة')
    it['text'] = re.sub(r'⟦\?([^⟧]*)⟧', r'\1', it['text']).replace('⟦؟؟⟧', '…')

# 5) المواضع في الصور: محاذاة أسطر القراءة الآلية مع كتل الصفحة بالترتيب
def ocr_lines(fn):
    L = {}
    for r in csv.DictReader(open(os.path.join(W, 'tsv', f'p-{fn:02d}.tsv')), delimiter='\t', quoting=csv.QUOTE_NONE):
        if r['level'] == '5' and r['text'].strip():
            k = (r['block_num'], r['par_num'], r['line_num'])
            x, y, w, h = int(r['left']), int(r['top']), int(r['width']), int(r['height'])
            e = L.setdefault(k, [1e9, 1e9, 0, 0, []]); e[0] = min(e[0], x); e[1] = min(e[1], y); e[2] = max(e[2], x + w); e[3] = max(e[3], y + h); e[4].append(r['text'])
    out = [(v[0], v[1], v[2], v[3], nz(''.join(reversed(v[4])))) for v in L.values()]
    return sorted([o for o in out if len(o[4]) >= 3], key=lambda v: v[1])


def grams(s, n=3): return {s[i:i + n] for i in range(max(0, len(s) - n + 1))}


pt = 72.0 / DPI
regs = collections.defaultdict(dict)    # id -> g -> bbox
pagetext = {}
for g, printed, blocks in pages:
    fn = g + PDF_FIRST - 1
    OL = ocr_lines(fn)
    # كتل هذه الصفحة: المبادئ والإسنادات والعناوين بالترتيب
    seq = []
    for b in blocks:
        bb = b[2:] if b.startswith('+ ') else b
        bb = re.sub(r'^#+ |^\[\d+\]\s*', '', bb)
        seq.append((b, nz(bb)))
    # تعيين كل سطر آلي لكتلة (رتيب)
    j = 0; assign = []
    for ln in OL:
        gl = grams(ln[4])
        def sc(k):
            if k >= len(seq): return -1
            gs = grams(seq[k][1]); return len(gl & gs) / (len(gl) + 1)
        best = j
        for k in range(j, min(len(seq), j + 3)):
            if sc(k) > sc(best) + 0.15: best = k
        j = best; assign.append(j)
    pagetext[g] = []
    for (x0, y0, x1, y1, _), k in zip(OL, assign):
        pagetext[g]
    # نص الصفحة: كتلها الحرفية بموضع أول سطر لها
    firsty = {}
    for (x0, y0, x1, y1, _), k in zip(OL, assign): firsty.setdefault(k, y0)
    for k, (b, _) in enumerate(seq):
        pagetext[g].append([re.sub(r'⟦\?([^⟧]*)⟧', r'\1', b.lstrip('#+ ')).replace('⟦مقطوع⟧', '…').replace('⟦؟؟⟧', '…'), round(firsty.get(k, 0) * pt, 1), 12, 1 if b.startswith('#') else 0])
    # ربط الكتل بالمبادئ
    pi = [it for it in items if g in it['pages']]
    ci = [it for it in items if g in it.get('citp', [])]
    kb = []
    for k, (b, _) in enumerate(seq):
        if b.startswith('#'): continue
        bb = b[2:] if b.startswith('+ ') else b
        if bb.startswith('('): kb.append((k, 'c'))
        elif re.match(r'^و?راجع\b', bb) or 'بسم الله' in bb: continue
        else: kb.append((k, 'p'))
    pq = list(pi); cq = list(ci)
    owner = {}
    for k, kind in kb:
        if kind == 'p' and pq: owner[k] = pq.pop(0)
        elif kind == 'c' and cq:
            owner[k] = cq.pop(0)
            while cq and cq[0].get('cit') is owner[k].get('cit'): cq.pop(0)
    for (x0, y0, x1, y1, _), k in zip(OL, assign):
        it = owner.get(k)
        if it is None: continue
        targets = [it] if seq[k][0].lstrip('+ ').startswith('(') is False else [q for q in items if q.get('cit') is it.get('cit')]
        for q in targets:
            r = regs[id(q)].setdefault(g, [x0 * pt, y0 * pt, x1 * pt, y1 * pt])
            r[0] = min(r[0], x0 * pt); r[1] = min(r[1], y0 * pt); r[2] = max(r[2], x1 * pt); r[3] = max(r[3], y1 * pt)

# عناوين الموضوعات بإملاء حديث للتصنيف وحده (النص والأقسام تبقى كما طُبعت)
TN = {'أحوال شخصيه': 'أحوال شخصية', 'اثبات': 'إثبات', 'استئناف': 'استئناف', 'اعلان': 'إعلان', 'التزام': 'التزام', 'ايجار': 'إيجار', 'تأمين': 'تأمين',
      'تزوير': 'تزوير', 'تمييز': 'محكمة التمييز', 'رخص تجاريه': 'الرخص التجارية', 'رسوم': 'رسوم قضائية', 'عمل': 'عمل', 'قضاء مستعجل': 'قضاء مستعجل',
      'محل تجارى': 'محل تجاري', 'مسئوليه': 'مسئولية', 'ملكيه': 'ملكية', 'نظام عام': 'نظام عام', 'وضع يد': 'وضع يد',
      'اخفاء أشياء مسروقه': 'جريمة إخفاء أشياء متحصلة من جريمة سرقة', 'استعمال نفوذ': 'استعمال نفوذ', 'افلاس': 'إفلاس', 'رشوه': 'رشوة', 'سرقه': 'سرقة',
      'عقوبه': 'عقوبة', 'مواد مسكره': 'مواد مسكرة', 'مواقعه جنسيه': 'مواقعة', 'هتك عرض': 'هتك عرض', 'وصف التهمة': 'وصف التهمة',
      'حضانه': 'حضانة', 'شهاده': 'شهادة', 'اثبات بالكتابه': 'إثبات بالكتابة', 'الاحكام القابله للطعن': 'الأحكام القابلة للطعن',
      'الاحكام القابله للاستئناف': 'الأحكام القابلة للاستئناف', 'اعلان الاستئناف': 'إعلان الاستئناف', 'اعلان الطعن': 'إعلان الطعن',
      'سلطة المحكمه في دعاوى الايجار': 'سلطة المحكمة في دعاوى الإيجار', 'بيان الاسباب بالصحيفه': 'بيان الأسباب بالصحيفة', 'اسباب الطعن': 'أسباب الطعن',
      'اشتراك في السرقه': 'اشتراك في السرقة', 'الخصوم فى الدعوى': 'الخصوم في الدعوى', 'الطعن فى احكام دعاوى الايجار': 'الطعن في أحكام دعاوى الإيجار',
      'سلطة محكمة الاستئناف فى دعوى الايجار': 'سلطة محكمة الاستئناف في دعوى الإيجار'}
tn = lambda h: TN.get(h, h) if h else h

# 6) العناصر النهائية
out = []
TL_new = collections.Counter()
for n, it in enumerate(items, 1):
    sec = [it['part']] + [h for h in (it['h2'], it['h3']) if h]
    title = tn(it['h2']) + (f' "{tn(it["h3"])}"' if it['h3'] else '') if it['h2'] else ''
    ch = it['c'][0].get('ch')
    tp = topics_for(title, [it['text']], ch) if title else []
    laws = collections.OrderedDict()
    for ref in extract_ctx(it['text']):
        L = laws.setdefault(ref['law'], [])
        for a in ref['articles']:
            if a not in L: L.append(a)
    R = regs.get(id(it), {})
    pg = sorted(set(it['pages']) | set(R))
    if not R: it['rv'].append('تعذّر تحديد موضع المبدأ في صورة الصفحة')
    out.append({'col': CODE, 'n': n, 'np': it['num'] or 0, 'id': f'{CODE}-{n:04d}', 'sec': sec, 'p': [it['text']],
                'c': it['c'], 'cp': [1], 'sa': [], 'fn': [f'القواعد القانونية التي قررتها محكمة التمييز (وزارة العدل) — العدد الثاني 1/1/1978–31/3/1978 — ص{it["printed"]}'],
                'pg': pg, 'rg': [{'page': g, 'bbox': [round(v, 1) for v in R[g]]} for g in sorted(R)], 'rv': it['rv'], 'rel': [],
                'tp': [[x, 'k', 0] for x in tp], 'lw': [[l, a, 1 if l in SUSPECT else 0] for l, a in laws.items()],
                'src': {'printed': it['printed'], 'num': it['num']}})
json.dump(out, open(os.path.join(OUT, CODE + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
json.dump({'skipped': skipped}, open(os.path.join(OUT, 'skipped.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)

# 7) صور الصفحات (شبكات WebP، 20 صفحة في الملف) ونصوصها
GP, GC, CW = 20, 2, 684
crop = [0.07, 0.07, 0.95, 0.98]
pdir = os.path.join(OUT, 'pages', CODE); tdir = os.path.join(OUT, 'pagetext', CODE)
os.makedirs(pdir, exist_ok=True); os.makedirs(tdir, exist_ok=True)
tmp = tempfile.mkdtemp(); cell = None; grid = None; gi = None
def flush():
    if grid is not None: grid.save(f'{pdir}/g{gi:03d}.webp', 'WEBP', lossless=True, method=6)
for g, printed, _ in pages:
    fn = g + PDF_FIRST - 1
    fullw = int(round(CW / (crop[2] - crop[0])))
    subprocess.run(['pdftoppm', '-gray', '-scale-to-x', str(fullw), '-scale-to-y', '-1', '-f', str(fn), '-l', str(fn), '-png', '-singlefile', os.path.join(W, 'src.pdf'), f'{tmp}/p'], check=True, stderr=subprocess.DEVNULL)
    im = Image.open(f'{tmp}/p.png').convert('L'); Wd, Hd = im.size
    c = im.crop((int(crop[0] * Wd), int(crop[1] * Hd), int(crop[0] * Wd) + CW, int(crop[3] * Hd))).point(lambda v: 0 if v < 150 else 255)
    if cell is None: cell = c.size
    if c.size != cell:
        c.thumbnail(cell); bg = Image.new('L', cell, 255); bg.paste(c, (0, 0)); c = bg
    gg, k = (g - 1) // GP, (g - 1) % GP
    if gg != gi:
        flush(); gi = gg; grid = Image.new('L', (cell[0] * GC, cell[1] * 10), 255)
    grid.paste(c, ((k % GC) * cell[0], (k // GC) * cell[1]))
flush()
json.dump({str(g): v for g, v in pagetext.items()}, open(f'{tdir}/t000.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'pw': PW, 'ph': PH, 'crop': crop, 'cell': list(cell), 'pages': len(pages), 'off': OFF}, open(os.path.join(OUT, CODE + '-pages.json'), 'w'))
rv = collections.Counter(r.split('؛')[0].split(':')[0] for x in out for r in x['rv'])
print(f'{CODE}: مبادئ {len(out)} صفحات {len(pages)} يحتاج مراجعة {sum(1 for x in out if x["rv"])} بلا موضع {sum(1 for x in out if not x["rg"])}', file=sys.stderr)
for k, v in rv.most_common(): print(' ', v, k, file=sys.stderr)
print('أُسقط (إحالات وبسملة):', len(skipped), file=sys.stderr)
