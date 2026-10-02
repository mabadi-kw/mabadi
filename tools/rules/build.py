#!/usr/bin/env python3
"""مجموعة القواعد القانونية (القسم الخامس 2002–2006) → عناصر المكتبة.
مجموعتان: QK5 (المواد المدنية والتجارية والإدارية والأحوال والعمالية — المجلدات المرتبة بالحروف) وQJ5 (القسم الجزائي).
لكل قاعدة: الموجز (ونقاطه) ونص القاعدة حرفيًا، والإسناد (كل سطر «الطعن…» كما ورد)، والموضوع (عنوان الملف والعنوان الفرعي)،
والقوانين المذكورة. الاستعمال: python3 build.py <مجلد docx> <مجلد الإخراج>
"""
import os, re, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE); sys.path.insert(0, os.path.join(HERE, '..', 'journal', 'cls'))
from parse import parse
from taxonomy import MUS_KW, mus_kw_family, rule_topics
from laws import extract_ctx, SUSPECT
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TL = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))['toplab']
DIG = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
CH = [('طلبات رجال القضاء', 'طلبات رجال القضاء'), ('رجال القضاء', 'طلبات رجال القضاء'), ('أحوال شخصية', 'أحوال شخصية'), ('أحوال', 'أحوال شخصية'),
      ('تجاري', 'تجاري'), ('تجارى', 'تجاري'), ('مدني', 'مدني'), ('مدنى', 'مدني'), ('إداري', 'إداري'), ('اداري', 'إداري'), ('عمالي', 'عمالي'), ('عمالى', 'عمالي'),
      ('جزائي', 'جزائي'), ('جزائى', 'جزائي'), ('هيئة عامة', 'هيئة عامة'), ('دستوري', 'دستوري'), ('تظلم', 'تظلمات')]
CHRE = '|'.join(re.escape(k) for k, _ in CH)
H_HINT = re.compile(r'إجراء|تحقيق|محاكم|تفتيش|قبض|نيابة|اعتراف|استجواب|شهادة|شهود|خبرة|قرائن|دعوى|إعلان|حبس احتياطي|دفاع|دفع|محكمة|حكم|طعن|تمييز|استئناف|بطلان|اختصاص|إثبات|نظر|إحالة|تقادم|حجية|قوة الأمر|استدلال|تحريات|إذن|ضبط')


def _nz(t):
    t = re.sub(r'[\u064b-\u065f\u0640]', '', t); t = re.sub('[أإآ]', 'ا', t)
    return t.replace('ى', 'ي').replace('ة', 'ه')
STOP = set('في من على ان أن الى إلى عن او أو ما لا ذلك هذا هذه التي الذي التى مع به بها له لها كان قد ولا وان وأن ثم فى انه أنه اذا إذا كل غير بين'.split())
def toks(t): return {w for w in re.findall(r'[\u0621-\u064a]{3,}', _nz(t)) if w not in STOP}


def norm_kw(k):
    return re.sub(r'\s+', ' ', re.sub(r'[ًٌٍَُِّْـ]', '', k)).strip(' .:،')


def parse_cit(raw):
    t = re.sub(r'[()]', ' ', raw).translate(DIG); t = re.sub(r'\s+', ' ', t)
    m = re.search(r'(?<![ء-ي])(' + CHRE + r')(?![ء-ي])', t)
    ch = dict(CH)[m.group(1)] if m else None
    head = t[:m.start()] if m else re.split(r'جلس', t)[0]
    groups = []
    for g in re.finditer(r'(\d+(?:\s*(?:[،,]|و)\s*\d+)*)\s*/\s*(\d{4})', head):
        groups += [f'{int(x)}/{g.group(2)}' for x in re.split(r'\s*(?:[،,]|و)\s*', g.group(1))]
    dm = re.search(r'جلس\S*\s*\.?\s*(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})', t)
    sess = None; iss = []
    if dm:
        try:
            import datetime
            sess = datetime.date(int(dm.group(3)), int(dm.group(2)), int(dm.group(1))).isoformat()
        except ValueError: iss.append(f'تاريخ جلسة غير صالح في الإسناد: {dm.group(0)}')
    else: iss.append('لا تاريخ جلسة في الإسناد')
    if not groups: iss.append('تعذّر قراءة رقم الطعن')
    if not ch: iss.append('نوع الطعن غير مذكور في الإسناد')
    k = ('+'.join(groups) + ('@' + sess if sess else '')) if groups else None
    return {'raw': raw, 'ch': ch, 'k': k}, iss


def topics(title, sec, crim, text):
    kw = norm_kw(title)
    out = []
    if crim:
        f = 'H' if H_HINT.search(kw) else 'G'
        out.append(f'{f}:{kw}')
    else:
        if kw in MUS_KW: out.append(MUS_KW[kw])
        else:
            f = mus_kw_family(kw)
            if f and f not in ('P', 'L'): out.append(f'{f}:{kw}')
        if kw in ('عمل', 'عمال') or not out:
            for t in rule_topics((sec[-1] if sec else '') + ' ' + text[:300]):
                if t not in out: out.append(t)
                if len(out) >= 2: break
        if not out: out.append(f'V:{kw}')
    return out[:2]


def build(DOCX, OUT):
    os.makedirs(OUT, exist_ok=True)
    cols = {'QK5': [], 'QJ5': []}
    rep = collections.Counter(); files = []
    for dp, _, fs in sorted(os.walk(DOCX)):
        for f in sorted(fs):
            if not f.endswith('.docx'): continue
            crim = 'الجزائي' in dp
            code = 'QJ5' if crim else 'QK5'
            rel = os.path.relpath(os.path.join(dp, f), DOCX)
            r = parse(os.path.join(dp, f))
            title = norm_kw(r['title']) or os.path.splitext(f)[0]
            # الربط: داخل كل عنوان بالترتيب إذا تساوى عدد الموجزات والنصوص (الأوثق، لأن الترقيم الآلي قد يضيع أو يضطرب في التحويل)،
            # وإلا بالرقم، ثم يُقاس تقارب الموجز من نص القاعدة ويُعلَّم الضعيف
            from collections import OrderedDict
            gs = OrderedDict(); gt = OrderedDict()
            for b in r['sums']: gs.setdefault(tuple(b['sec']), []).append(b)
            for b in r['txts']: gt.setdefault(tuple(b['sec']), []).append(b)
            pair = {}
            for k, tl in gt.items():
                sl = gs.get(k, [])
                if len(sl) == len(tl):
                    for a, b in zip(sl, tl): pair[id(b)] = (a, 'sec')
            sums = {}
            for b in r['sums']:
                if b['n'] is not None and b['n'] not in sums: sums[b['n']] = b
            taken = {id(a) for a, _ in pair.values()}
            for b in r['txts']:
                if id(b) in pair or b['n'] is None: continue
                a = sums.get(b['n'])
                if a is not None and id(a) not in taken: pair[id(b)] = (a, 'num'); taken.add(id(a))
            used = set(); nf = 0
            for b in r['txts']:
                rv = []
                s, how = pair.get(id(b), (None, None))
                if how == 'num' and (b.get('inferred') or b.get('bysec')):
                    rv.append('رُبطت القاعدة بموجزها برقم مستنتج (الترقيم الآلي في الملف لم يظهر بعد التحويل)')
                if s is None: rv.append('لا موجز مطابق لهذه القاعدة في الملف')
                else: used.add(id(s))
                if s is not None:
                    a_ = toks(' '.join(s['paras'])); b_ = toks(' '.join(b['paras']))
                    sim = len(a_ & b_) / max(1, len(a_))
                    if sim < 0.2: rv.append(f'صلة الموجز بنص القاعدة ضعيفة ({int(sim*100)}%)؛ تحقق من الربط')
                cits = []
                for c in b['cits']:
                    cc, iss = parse_cit(c); cits.append(cc); rv += iss
                bul = lambda x: re.sub(r'^\s*[-–•●▪]\s*', '', x)
                p = [bul(x) for x in s['paras']] if s else []
                rule = '\n'.join(b['paras'])
                body = ' '.join(p) + ' ' + rule
                laws = collections.OrderedDict()
                for ref in extract_ctx(body):
                    L = laws.setdefault(ref['law'], [])
                    for a in ref['articles']:
                        if a not in L: L.append(a)
                tp = topics(title, b['sec'], crim, body)
                it = {'col': code, 'n': 0, 'np': (s['n'] if s and s['n'] is not None else (b['n'] or 0)), 'id': '', 'sec': [title] + (b['sec'] or []),
                      'p': p or [rule.split('\n')[0]], 'rule': rule if p else '\n'.join(rule.split('\n')[1:]),
                      'c': cits, 'cp': [len(p) or 1] * len(cits), 'sa': b['see'], 'fn': [], 'pg': [], 'rg': [], 'rv': rv, 'rel': [],
                      'tp': [[x, 'k', 0 if x in TL else 1] for x in tp], 'lw': [[l, a, 1 if l in SUSPECT else 0] for l, a in laws.items()],
                      'src': {'file': rel, 'rn': (s['n'] if s else b['n']), 'sn': bool(s)}}
                if not p: it['rv'] = [x for x in it['rv'] if not x.startswith('لا موجز')] + ['لا موجز مطابق في الملف؛ عُرض نص القاعدة بدلًا منه']
                cols[code].append(it); nf += 1
            unused = [b['n'] for b in r['sums'] if id(b) not in used]
            rep['files'] += 1; rep['sums'] += len(r['sums']); rep['txts'] += len(r['txts']); rep['inferred'] += r['inferred']; rep['bysec'] += r['bysec']
            rep['unpaired_sums'] += len(unused)
            files.append({'file': rel, 'title': title, 'sums': len(r['sums']), 'txts': len(r['txts']), 'inferred': r['inferred'], 'unpaired_sums': unused[:50], 'issues': r['issues'][:10]})
    for code, items in cols.items():
        for i, it in enumerate(items, 1):
            it['n'] = i; it['id'] = f'{code}-{i:05d}'
        json.dump(items, open(os.path.join(OUT, code + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        print(code, 'قواعد', len(items), 'تحتاج مراجعة', sum(1 for x in items if x['rv']), file=sys.stderr)
    json.dump({'counts': rep, 'files': files}, open(os.path.join(OUT, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(dict(rep), file=sys.stderr)


if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2])
