#!/usr/bin/env python3
"""تشريعات من ملفات PDF غير صادرة عن الجريدة الرسمية (ملفات موقع وزارة العدل): 111/2015 (الأحداث) و63/2015 (جرائم تقنية المعلومات).
النص من طبقة النص في الملف نفسه (لا قراءة ضوئية)، بترتيب الحروف هندسيًا من اليمين إلى اليسار (rtl_text.py)؛
ويُعلَّم كل تشريع verified_against_gazette = false.
الاستعمال: python3 tools/pdflaws/build.py <مجلد ملفات PDF>
"""
import os, sys, re, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import pymupdf, rtl_text
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
LAWS = os.path.join(ROOT, 'data', 'laws')
SRC = sys.argv[1]
ORDW = {'أولى': 1, 'ثانية': 2, 'ثالثة': 3, 'رابعة': 4}


def doc_lines(path, pages, mirror, drop, stop):
    d = pymupdf.open(path)
    out = []
    for pn in pages:
        for (y, x0, x1, t, size, bold) in rtl_text.page_lines(d[pn - 1], mirror=mirror):
            if (pn, y) in drop: continue
            if stop(pn, y, t): return out
            out.append(dict(p=pn, y=y, x0=x0, x1=x1, t=t, size=size, bold=bold))
    return out


def tv(n, y):
    return f'LAW-{n}-{y}'


# ———— 111/2015 ————
def law111():
    f = 'قانون رقم 111 لسنة 2015 بإصدار قانون الأحداث.pdf'
    # أسطر مكررة مقطوعة عند حدود الصفحات في الملف (بقايا السطر الأخير من الصفحة السابقة أو بداية التالية)
    DROP = {(2, 70), (3, 67), (4, 774), (5, 772), (6, 770), (8, 69), (9, 67), (10, 774)}
    L = doc_lines(os.path.join(SRC, f), range(1, 11), True, DROP, lambda p, y, t: 'المذكرة الإيضاحية' in t)
    for l in L:
        l['bul'] = l['t'].startswith('•')
        l['t'] = l['t'].lstrip('•').strip()
    L = [l for l in L if l['t']]
    # سطر التحق به عنوان «مادة (29)» في الملف
    for i, l in enumerate(L):
        m = re.match(r'^(.*\S)\s+(مادة \(\s*29\s*\))$', l['t'])
        if m:
            L[i:i + 1] = [dict(l, t=m.group(1), bul=False), dict(l, t=m.group(2), bul=True)]
            break
    # تقسيم الأسطر إلى فقرات: كل سطر ببداية نقطية فقرة جديدة
    P = []
    for l in L:
        if l['bul'] or not P or l['x1'] > 490: P.append(dict(t=l['t'], p=[l['p']], L=[l]))
        else:
            P[-1]['t'] += ' ' + l['t']; P[-1]['L'].append(l)
            if l['p'] not in P[-1]['p']: P[-1]['p'].append(l['p'])
    T = [p['t'] for p in P]
    i_pre = next(i for i, t in enumerate(T) if t.startswith('بعد الاطلاع'))
    i_agree = next(i for i, t in enumerate(T) if t.startswith('وافق مجلس الأمة'))
    title_lines = T[:i_pre]
    preamble = T[i_pre:i_agree + 1]
    i_sig = next(i for i, t in enumerate(T) if t.startswith('نائب أمير الكويت'))
    i_body = next(i for i, t in enumerate(T) if t == 'قانون الأحداث' and i > i_sig)
    signature = T[i_sig:i_body]
    arts = []
    lid = tv(111, 2015)
    cur = None
    for k in range(i_agree + 1, i_sig):
        t = T[k]
        m = re.match(r'^مادة (أولى|ثانية|ثالثة|رابعة)$', t)
        if m:
            n = ORDW[m.group(1)]
            cur = dict(id=f'{lid}-I{n}', n=n, label=t, bis=None, issue=True, rep=None, trail=None, paras=[], notes=None, pages=list(P[k]['p']), _L=list(P[k]['L']))
            arts.append(cur); continue
        cur['paras'].append(t); cur['_L'] += P[k]['L']
    toc, trail, chap = [], None, None
    k = i_body + 1
    while k < len(T):
        t = T[k]
        if re.match(r'^الباب ', t):
            trail = f'{t} — {T[k + 1]}'
            toc.append(dict(level=2, title=trail, frm=None, to=None))
            k += 2; continue
        m = re.match(r'^مادة \(\s*(\d+)\s*\)$', t)
        if m:
            n = int(m.group(1))
            cur = dict(id=f'{lid}-A{n:04d}', n=n, label=f'مادة ({n})', bis=None, issue=None, rep=None, trail=[trail] if trail else None, paras=[], notes=None, pages=list(P[k]['p']), _L=list(P[k]['L']))
            arts.append(cur)
            if toc and toc[-1]['frm'] is None: toc[-1]['frm'] = n
            if toc: toc[-1]['to'] = n
            k += 1; continue
        cur['paras'].append(t); cur['_L'] += P[k]['L']
        for pg in P[k]['p']:
            if pg not in cur['pages']: cur['pages'].append(pg)
        k += 1
    body = [a for a in arts if not a['issue']]
    assert [a['n'] for a in body] == list(range(1, 70)), [a['n'] for a in body]
    assert all(a['paras'] for a in arts)
    return dict(
        cat='law', id=lid, key='111/2015', type='قانون', number=111, year=2015, short='الأحداث',
        title='القانون رقم 111 لسنة 2015 بإصدار قانون الأحداث', issued='2015-12-31', issued_hijri='20 ربيع الأول 1437 هـ', status='نافذ',
        text_version='النص الأصلي كما ورد في الملف (دون ما قد يكون صدر بعده من تعديلات)',
        source=dict(kind='ملف PDF — موقع وزارة العدل', file=f, pdf_pages=[1, 10],
                    note='ملف بالاسم نفسه المنشور في موقع وزارة العدل (MojDocs)، مطبوع من صفحة ويب، 13 صفحة (الصفحات 11–13 والجزء الأخير من 10 للمذكرة الإيضاحية). '
                         'النص من طبقة النص في الملف (لا قراءة ضوئية)، مرتّب هندسيًا من اليمين إلى اليسار؛ وحُذفت أسطر مكررة مقطوعة عند حدود الصفحات. '
                         'في ذيل الملف: «رقم الاصدار: 1272 — تاريخ النشر: 2016/01/26» (منقول كما ورد، ولم يُطابَق مع الجريدة).'),
        effective='يعمل به بعد سنة من تاريخ صدوره — المادة الرابعة من مواد الإصدار',
        annex=None, preamble=preamble, title_lines=title_lines, toc=toc, articles=arts, signature=signature,
        notes=None, repeals=['3/1983'], group='الجزائي')


# ———— 63/2015 ————
def law63():
    f = 'قانون رقم 63 لسنة 2015 بإصدار قانون مكافحة جرائم تقنية المعلومات.pdf'
    L = doc_lines(os.path.join(SRC, f), range(1, 9), False, set(), lambda p, y, t: t.startswith('المذكرة الايضاحية'))
    lid = tv(63, 2015)
    T = [l['t'] for l in L]
    i_pre = next(i for i, t in enumerate(T) if t.startswith('بعد الاطلاع'))
    i_agree = next(i for i, t in enumerate(T) if t.startswith('وافق مجلس الأمة'))
    title_lines = T[:i_pre]

    def paras(lines):
        out = []
        for i, l in enumerate(lines):
            new = (not out) or re.match(r'^\d+ ?[-–]', l['t']) or lines[i - 1]['x0'] > 125
            if new: out.append(dict(t=l['t'], p=[l['p']]))
            else:
                out[-1]['t'] += ' ' + l['t']
                if l['p'] not in out[-1]['p']: out[-1]['p'].append(l['p'])
        return out
    # الديباجة: كل سطر يبدأ بـ«وعلى» أو «بعد» أو «وافق» بداية فقرة
    pre = []
    for l in L[i_pre:i_agree + 1]:
        if not pre or re.match(r'^(وعلى|بعد|وافق)', l['t']): pre.append(l['t'])
        else: pre[-1] += ' ' + l['t']
    i_sig = next(i for i, t in enumerate(T) if t == 'أمير الكويت')
    signature = T[i_sig:]
    arts, toc, trail = [], [], None
    k = i_agree + 1
    buf, cur = [], None

    def flush():
        if cur is not None:
            ps = paras(buf)
            cur['paras'] = [p['t'] for p in ps]
            cur['pages'] = sorted({pg for p in ps for pg in p['p']} | set(cur['pages']))
            cur['_L'] += buf
    while k < i_sig:
        l = L[k]; t = l['t']
        if l['size'] >= 17 and t.startswith('الفصل '):
            flush(); buf = []; cur = None
            trail = f'{t} — {T[k + 1]}'
            toc.append(dict(level=2, title=trail, frm=None, to=None)); k += 2; continue
        m = re.match(r'^المادة \((\d+)\)$', t)
        if m:
            flush(); buf = []
            n = int(m.group(1))
            cur = dict(id=f'{lid}-A{n:04d}', n=n, label=t, bis=None, issue=None, rep=None, trail=[trail] if trail else None, paras=[], notes=None, pages=[l['p']], _L=[l])
            arts.append(cur)
            if toc and toc[-1]['frm'] is None: toc[-1]['frm'] = n
            if toc: toc[-1]['to'] = n
            k += 1; continue
        buf.append(l); k += 1
    flush()
    assert [a['n'] for a in arts] == list(range(1, 22)), [a['n'] for a in arts]
    return dict(
        cat='law', id=lid, key='63/2015', type='قانون', number=63, year=2015, short='مكافحة جرائم تقنية المعلومات',
        title='القانون رقم 63 لسنة 2015 في شأن مكافحة جرائم تقنية المعلومات', issued='2015-07-07', issued_hijri='20 رمضان 1436 هـ', status='نافذ',
        text_version='النص الأصلي كما ورد في الملف (دون ما قد يكون صدر بعده من تعديلات)',
        source=dict(kind='ملف PDF — موقع وزارة العدل', file=f, pdf_pages=[1, 8],
                    note='ملف بالاسم نفسه المنشور في موقع وزارة العدل (MojDocs)، مصدَّر من Word، 9 صفحات (المذكرة الإيضاحية من آخر الصفحة 8). '
                         'النص من طبقة النص في الملف (لا قراءة ضوئية)، مرتّب هندسيًا من اليمين إلى اليسار مع إصلاح ترتيب حرفي «لا» المركّبين في طبقة النص. '
                         'تقسيم الفقرات داخل المادة استُنتج من طول الأسطر.'),
        effective='يعمل به بعد ستة أشهر من تاريخ نشره في الجريدة الرسمية — المادة (21)',
        annex=None, preamble=pre, title_lines=title_lines, toc=toc, articles=arts, signature=signature, notes=None, group='الجزائي')


def check(L):
    """مسافة داخل كلمة أو حرف منفرد: علامة مراجعة"""
    ok1 = {'و', 'أ', 'ب', 'ج', 'د', 'هـ', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن', 'ه', 'ـ'}
    for a in L['articles']:
        for p in a['paras']:
            odd = [w for w in re.findall(r'(?<!\S)[ء-ي]{1}(?!\S)', p) if w not in ok1]
            if odd:
                a.setdefault('review', []).append('حرف منفرد في النص قد يدل على مسافة زائدة داخل كلمة في الملف المصدر: ' + ' '.join(sorted(set(odd))))
                break


CELLW = 684


def pages_and_rg(L, pdf, pages):
    """صور الصفحات (شبكات webp كما في بقية تشريعات المكتبة) ومواضع المواد فيها"""
    from PIL import Image
    d = pymupdf.open(pdf)
    pw, ph = d[0].rect.width, d[0].rect.height
    cell = (CELLW, round(CELLW * ph / pw))
    out = os.path.join(ROOT, 'pages', L['id']); os.makedirs(out, exist_ok=True)
    for f in os.listdir(out): os.remove(os.path.join(out, f))
    for k in range(0, len(pages), 20):
        G = Image.new('L', (cell[0] * 2, cell[1] * 10), 255)
        for j, pn in enumerate(pages[k:k + 20]):
            pix = d[pn - 1].get_pixmap(dpi=110, colorspace=pymupdf.csGRAY)
            im = Image.frombytes('L', (pix.width, pix.height), pix.samples).resize(cell, Image.LANCZOS)
            G.paste(im, ((j % 2) * cell[0], (j // 2) * cell[1]))
        G.save(f'{out}/g{k // 20:03d}.webp', 'WEBP', quality=50, method=6)
    L['pages_col'] = L['id']
    L['page_meta'] = dict(pw=round(pw, 1), ph=round(ph, 1), cell=list(cell), gp=20, pdf=list(pages))
    for a in L['articles']:
        rg = {}
        for l in a.pop('_L'):
            h = l['size'] * 0.75
            b = rg.setdefault(l['p'], [l['x0'], l['y'] - h, l['x1'], l['y'] + h])
            b[0] = min(b[0], l['x0']); b[1] = min(b[1], l['y'] - h); b[2] = max(b[2], l['x1']); b[3] = max(b[3], l['y'] + h)
        a['rg'] = [dict(page=p, bbox=[round(v, 1) for v in b]) for p, b in sorted(rg.items())]
        a['pages'] = sorted(rg)


def toc_idx(L):
    for t in L['toc']:
        ix = [i for i, a in enumerate(L['articles']) if not a.get('issue') and t['frm'] <= a['n'] <= t['to']]
        t['i0'], t['i1'] = ix[0], ix[-1] + 1


for L, pdf, pg in ((law111(), 'قانون رقم 111 لسنة 2015 بإصدار قانون الأحداث.pdf', range(1, 11)),
                   (law63(), 'قانون رقم 63 لسنة 2015 بإصدار قانون مكافحة جرائم تقنية المعلومات.pdf', range(1, 9))):
    pages_and_rg(L, os.path.join(SRC, pdf), list(pg))
    toc_idx(L)
    check(L)
    json.dump(L, open(os.path.join(LAWS, L['id'] + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(L['id'], len(L['articles']), 'مادة', sum(1 for a in L['articles'] if a.get('review')), 'تحتاج مراجعة', file=sys.stderr)
