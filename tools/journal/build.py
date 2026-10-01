#!/usr/bin/env python3
"""يحوّل مخرَج run.py (أحكام المجلة مقطّعة) إلى عناصر المكتبة: مجموعة لكل سنة من المجلة (MQ31…)، وعنصر لكل مبدأ:
العنوان (الكلمات الكاشفة) والموجز ونص القاعدة حرفيًا، والإسناد (رقم الطعن ونوعه من سطر الإسناد، وتاريخ الجلسة من رأس الحكم)،
والتصنيف بالكلمة الكاشفة الأولى، والقوانين المذكورة في النص. لا يُغيَّر حرف من النص.
الاستعمال: python3 build.py journal.json <مجلد الإخراج>
يكتب: <out>/MQ<vol>.json (عناصر) و<out>/MQ<vol>-rulings.json (بطاقات الأحكام) و<out>/report.json
"""
import os, re, sys, json, collections
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'cls'))
from taxonomy import FAMILIES, TOPICS, MUS_KW, mus_kw_family, rule_topics
from laws import extract_ctx, law_label, SUSPECT
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
META = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
TL = META['toplab']

CH = [('طلبات رجال القضاء', 'طلبات رجال القضاء'), ('أحوال شخصية', 'أحوال شخصية'), ('أحوال', 'أحوال شخصية'), ('تجاري', 'تجاري'), ('تجارى', 'تجاري'),
      ('مدني', 'مدني'), ('مدنى', 'مدني'), ('إداري', 'إداري'), ('اداري', 'إداري'), ('عمالي', 'عمالي'), ('عمالى', 'عمالي'), ('جزائي', 'جزائي'), ('جزائى', 'جزائي'),
      ('هيئة عامة', 'هيئة عامة'), ('دستوري', 'دستوري'), ('تظلم', 'تظلمات')]
CHRE = '|'.join(re.escape(k) for k, _ in CH)
DIG = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')
# عائلة الموضوع بحسب الدائرة حين لا تدل الكلمة الكاشفة على عائلة بعينها
FAM_BY_CH = {'تجاري': 'S', 'إداري': 'A', 'عمالي': 'L', 'أحوال شخصية': 'F', 'مدني': 'V', 'جزائي': 'G', 'هيئة عامة': 'P', 'طلبات رجال القضاء': 'J'}
H_KW = {'إجراءات', 'تحقيق', 'دعوى جزائية', 'دعوى جنائية', 'دفوع', 'إثبات', 'حكم', 'تمييز', 'استئناف', 'محكمة الموضوع', 'نيابة عامة', 'قبض', 'تفتيش',
        'اختصاص', 'بطلان', 'دعوى مدنية', 'حبس احتياطي', 'إعلان', 'محاكمة', 'طعن', 'إجراءات جزائية', 'استجواب', 'اعتراف', 'شهادة', 'خبرة', 'قرائن', 'تعويض', 'نقض',
        'دفاع', 'محكمة الجنايات', 'نظر الدعوى', 'إحالة', 'تقادم', 'قوة الأمر المقضي', 'حجية', 'غرامة', 'عقوبة', 'ظروف مخففة', 'ارتباط', 'عود', 'وقف التنفيذ'}
G_PENAL_KW = {'عقوبة', 'ظروف مخففة', 'ارتباط', 'عود', 'وقف التنفيذ', 'غرامة'}


def norm_kw(k):
    k = re.sub(r'[ًٌٍَُِّْـ]', '', k).strip(' .:،"“”')
    return re.sub(r'\s+', ' ', k)


RE_Q = re.compile(r'["“”«»]([^"“”«»]*)["“”«»]')


def keywords(title):
    """الكلمات الكاشفة: الكلمة قبل علامة التنصيص في كل مقطع من سطر العنوان (ما بين علامتي التنصيص وصف فرعي لا يُقسَّم)"""
    out = []
    subs = {}
    t = title
    # استبدال ما بين التنصيص بعلامة حتى لا تقسمه النقاط
    parts = []
    def rep(m):
        parts.append(m.group(1).strip(' .:،')); return f' \x00{len(parts)-1}\x00 '
    t = RE_Q.sub(rep, t)
    for seg in re.split(r'\.\s+|\.$|؛', t):
        seg = seg.strip()
        if not seg: continue
        m = re.match(r'^([^\x00]*?)\s*(?:\x00(\d+)\x00.*)?$', seg)
        k = norm_kw(m.group(1)) if m else norm_kw(seg)
        sub = parts[int(m.group(2))] if m and m.group(2) else ''
        if k and len(k) <= 40 and k not in out:
            out.append(k); subs[k] = sub
    keywords.subs = subs
    return out


def ruling_key(cit, sess):
    t = re.sub(r'[()]', ' ', cit).translate(DIG)
    m = re.search(r'(?<![ء-ي])(' + CHRE + r')(?![ء-ي])', t)
    ch = dict(CH)[m.group(1)] if m else None
    head = t[:m.start()] if m else t
    groups = []
    for g in re.finditer(r'(\d+(?:\s*(?:[،,]|و)\s*\d+)*)\s*/\s*(\d{4})', head):
        nums = [int(x) for x in re.split(r'\s*(?:[،,]|و)\s*', g.group(1))]
        groups += [f'{n}/{g.group(2)}' for n in nums]
    k = '+'.join(groups) + ('@' + sess if sess else '') if groups else None
    return ch, k, groups


GENERIC = {'محكمة الموضوع', 'حكم', 'دفع', 'دفوع', 'دفاع', 'نظام عام', 'مثال', 'قانون', 'أحوال شخصية', 'جريمة', 'نقض', 'طعن', 'تمييز', 'إثبات', 'استئناف',
           'إجراءات', 'بطلان', 'اختصاص', 'دعوى', 'خصومة', 'إعلان', 'حجية', 'تقادم', 'تنفيذ', 'إعلان', 'عقوبة'}
PROC = {'محكمة الموضوع': 'P04', 'حكم': 'P05', 'نقض': 'P07', 'طعن': 'P07', 'تمييز': 'P07', 'إثبات': 'P04', 'استئناف': 'P06', 'بطلان': 'P03', 'دفوع': 'P03', 'دفع': 'P03',
        'اختصاص': 'P01', 'دعوى': 'P02', 'خصومة': 'P03', 'إعلان': 'P02', 'حجية': 'P05', 'تقادم': 'P12', 'تنفيذ': 'P09', 'دفاع': 'P03'}
H_HINT = re.compile(r'إجراء|تحقيق|محاكم|تفتيش|قبض|نيابة|اعتراف|استجواب|شهادة|شهود|خبرة|قرائن|دعوى|إعلان|حبس احتياطي|دفاع|دفع|محكمة|حكم|طعن|تمييز|استئناف|بطلان|اختصاص|إثبات|نظر|إحالة|تقادم|حجية|قوة الأمر')


def topics_for(title, summ, ch):
    kws = keywords(title)
    subst, proc = [], []
    fam_default = FAM_BY_CH.get(ch or '', None)
    for kw in kws:
        tid = None
        if kw in MUS_KW and not (ch == 'جزائي' and MUS_KW[kw][0] == 'P'):
            tid = MUS_KW[kw]
        elif kw in PROC:
            if ch == 'جزائي':
                tid = f'H:{kw}' if kw in ('محكمة الموضوع', 'إثبات', 'تفتيش', 'قبض', 'دفاع', 'دفوع', 'دفع', 'بطلان', 'إعلان', 'اختصاص', 'حجية') else None
            else:
                tid = PROC[kw]
        else:
            sub = keywords.subs.get(kw, '')
            if kw in ('أحوال شخصية', 'أحوال', 'عمل', 'عقوبات', 'جريمة', 'جرائم') and sub:
                kw = norm_kw(re.split(r'[:،]', sub)[0])[:40]
            f = mus_kw_family(kw)
            if ch == 'جزائي':
                f = 'H' if H_HINT.search(kw) else 'G'
            elif not f:
                f = fam_default
            if f and f not in ('P', 'L'):
                tid = f'{f}:{kw}'
        if not tid: continue
        generic = kw in GENERIC or kw == 'محكمة الموضوع'
        (proc if (tid[0] == 'P' or tid.startswith('H:') or generic) else subst).append(tid)
    out = []
    if ch == 'عمالي':
        for t in rule_topics(title + ' ' + ' '.join(summ)):
            if t.startswith('L') and t not in out: out.append(t)
    for t in subst + proc:
        if t not in out: out.append(t)
        if len(out) >= 2: break
    if not out:
        out = rule_topics(title + ' ' + ' '.join(summ))[:2]
    return out[:2]


def fam_label(tid):
    if ':' in tid:
        f, k = tid.split(':', 1)
        FL = {'V': 'المواد المدنية', 'G': 'الجزاء (قانون العقوبات)', 'H': 'الإجراءات والمحاكمات الجزائية', 'T': 'مصادر القانون التجاري والأعمال التجارية'}
        return [FAMILIES.get(f, FL.get(f, f)), k]
    return [FAMILIES[tid[0]], TOPICS[tid]]


def build(J, out):
    os.makedirs(out, exist_ok=True)
    byvol = collections.defaultdict(list)
    for sec in J: byvol[sec['vol']].append(sec)
    report = []
    newtop = collections.Counter()
    for vol, secs in sorted(byvol.items()):
        code = f'MQ{vol}'
        secs.sort(key=lambda s: (s['issue'], {'T': 0, 'M': 1, 'G': 2}[s['sec']]))
        items, rulings = [], []
        n = 0
        for s in secs:
            for r in s['rulings']:
                ch, k, groups = ruling_key(r['cit'] or '', r['sess'])
                if not ch and r['ch']:
                    ch = {'التجارية': 'تجاري', 'المدنية': 'مدني', 'الإدارية': 'إداري', 'العمالية': 'عمالي', 'الجزائية': 'جزائي', 'الأحوال الشخصية': 'أحوال شخصية'}.get(r['ch'])
                rid = f'{code}-R{s["issue"]}{s["sec"]}{r["n"]:03d}'
                rulings.append({'id': rid, 'vol': vol, 'issue': s['issue'], 'year': s['year'], 'sec': s['sec'], 'n': r['n'], 'cit': r['cit'], 'ch': ch, 'chamber_raw': r['ch'],
                                'sess': r['sess'], 'sess_raw': r.get('sess_raw'), 'panel': r['panel'], 'k': k, 'file': r.get('file', s['file']), 'line': r['line'], 'issues': r['issues'], 'full': r.get('full')})
                texts = {t['k']: t for t in r['texts']}
                seq_texts = r['texts']
                for hi, h in enumerate(r['heads']):
                    n += 1
                    rv = []
                    t = texts.get(h['k'])
                    if t is None or len(texts) != len(r['texts']) or [x['k'] for x in r['texts']] != list(range(1, len(r['texts']) + 1)):
                        # ترقيم مضطرب في المصدر: المطابقة بالترتيب
                        t = seq_texts[hi] if hi < len(seq_texts) else None
                        if t is not None and t['k'] != h['k']: rv.append(f'رقم نص القاعدة في المصدر ({t["k"]}) يخالف رقم العنوان ({h["k"]})؛ طوبقا بالترتيب')
                    if t is None: rv.append('لا نص قاعدة لهذا العنوان في المصدر')
                    if not h['sum']: rv.append('عنوان بلا موجز في المصدر')
                    if not r['cit']: rv.append('لا سطر إسناد في المصدر')
                    if not r['sess']: rv.append('لا تاريخ جلسة في رأس الحكم')
                    if r['issues'] and len(r['heads']) != len(r['texts']): rv.append(f'عدد العناوين ({len(r["heads"])}) يخالف عدد النصوص ({len(r["texts"])})')
                    rule = '\n'.join(t['paras']) if t else ''
                    body = h['title'] + ' ' + ' '.join(h['sum']) + ' ' + rule
                    tp = topics_for(h['title'], h['sum'], ch)
                    for x in tp:
                        if x not in TL and ':' in x: newtop[x] += 1
                    laws = collections.OrderedDict()
                    for ref in extract_ctx(body):
                        L = laws.setdefault(ref['law'], [])
                        for a in ref['articles']:
                            if a not in L: L.append(a)
                    sess_h = f'جلسة {int(r["sess"][8:10])}/{int(r["sess"][5:7])}/{r["sess"][:4]}' if r['sess'] else ''
                    raw = (r['cit'] or '(بلا إسناد)').rstrip(')') + (' ' + sess_h if sess_h else '') + ')'
                    ref_raw = f'مجلة القضاء والقانون س{vol} ع{s["issue"]} ({s["year"]}) — {s["sec_name"]} — الحكم ({r["n"]}) القاعدة {h["k"]}'
                    items.append({'col': code, 'n': n, 'np': n, 'id': f'{code}-{n:04d}', 'sec': [f'العدد {s["issue"]} — {s["year"]}', s['sec_name']],
                                  'p': [x for x in h['sum']] or [h['title']], 'ttl': h['title'], 'rule': rule,
                                  'c': [{'raw': raw, 'ch': ch, 'k': k}], 'cp': [len(h['sum']) or 1], 'sa': [], 'fn': [ref_raw], 'pg': [], 'rg': [], 'rv': rv, 'rel': [],
                                  'tp': [[x, 'k', 0 if x in TL else 1] for x in tp],
                                  'lw': [[l, a, 1 if l in SUSPECT else 0] for l, a in laws.items()],
                                  'src': {'rid': rid, 'k': h['k'], 'iss': s['issue'], 'sec': s['sec'], 'rn': r['n'], 'file': r.get('file', s['file'])}})
        json.dump(items, open(os.path.join(out, code + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(rulings, open(os.path.join(out, code + '-rulings.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        rvn = sum(1 for x in items if x['rv'])
        report.append({'col': code, 'vol': vol, 'year': secs[0]['year'], 'issues': sorted({s['issue'] for s in secs}), 'rulings': len(rulings), 'items': len(items), 'review': rvn,
                       'no_topic': sum(1 for x in items if not x['tp']), 'with_laws': sum(1 for x in items if x['lw'])})
        print(f'{code}: أحكام {len(rulings)} مبادئ {len(items)} تحتاج مراجعة {rvn} بلا موضوع {report[-1]["no_topic"]} بقوانين {report[-1]["with_laws"]}', file=sys.stderr)
    json.dump({'cols': report, 'new_topics': newtop.most_common()}, open(os.path.join(out, 'report.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('موضوعات جديدة:', len(newtop), newtop.most_common(25), file=sys.stderr)


if __name__ == '__main__':
    build(json.load(open(sys.argv[1], encoding='utf-8')), sys.argv[2])
