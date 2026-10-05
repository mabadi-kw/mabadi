#!/usr/bin/env python3
"""صور صفحات المجلة ونصوصها، وموضع كل مبدأ فيها.
لكل مقطع (ملف قسم في عدد): يُحوَّل ملف Word إلى PDF بخط Simplified Arabic نفسه، ثم تُقرأ أسطر الصفحات بمواضعها (pdftotext -bbox-layout)،
ويُحدَّد لكل مبدأ سطر عنوانه وسطر قاعدته، فتكون صفحاته هي ما بين السطرين، ومنطقته في كل صفحة اتحاد أسطره.
ثم تُجمَّع الصفحات شبكات WebP (20 صفحة في الملف) كما في بقية المجموعات، ويُكتب نص الصفحات.
الاستعمال: python3 pages.py <مجلد مصدر المجلة (.DOC)> <مجلد العناصر jout> <مجلد المكتبة> MQ31 [MQ32 …]
"""
import os, re, sys, json, html, subprocess, tempfile, collections
from PIL import Image, ImageOps
SRC, JOUT, SITE = sys.argv[1], sys.argv[2], sys.argv[3]
CODES = sys.argv[4:]
PDFDIR = os.path.join(JOUT, 'pdf'); os.makedirs(PDFDIR, exist_ok=True)
GP, GC, CW = 20, 2, 684


def nz(t):
    t = re.sub(r'[ؐ-ًؚ-ٰٟۖ-ۭ‏‎\xadـ]', '', t)
    t = re.sub('[أإآ]', 'ا', t).replace('ى', 'ي').replace('ة', 'ه').replace('ؤ', 'و').replace('ئ', 'ي')
    return re.sub(r'[^\u0621-\u064a0-9]', '', t)   # الحروف والأرقام فقط


def to_pdf(doc):
    out = os.path.join(PDFDIR, os.path.splitext(os.path.basename(doc))[0] + '.pdf')
    if not os.path.exists(out):
        subprocess.run(['soffice', '-env:UserInstallation=file:///tmp/lo_pages', '--headless', '--convert-to', 'pdf', '--outdir', PDFDIR, doc], capture_output=True, timeout=600)
    return out


def pdf_lines(pdf):
    """أسطر كل صفحة بنصها المنطقي ومواضعها بالنقاط. الحروف تُجمَّع سطورًا بالارتفاع، ويُقطع السطر عند فراغ أفقي واسع (فاصل العمودين)،
    وتُقرأ الحروف من اليمين (الحرف المركّب «لا» وحدة واحدة)، والمسافة تُستنتج من الفراغ بين الحروف، والأرقام واللاتينية تُعاد إلى اتجاهها.
    الصفحة ذات العمودين تُقرأ عمودها الأيمن أولًا ثم الأيسر."""
    import pdfplumber
    pages = []
    with pdfplumber.open(pdf) as d:
        for p in d.pages:
            pw, ph = float(p.width), float(p.height)
            chars = [c for c in p.chars if c['text'].strip()]
            chars.sort(key=lambda c: (round(c['top']), -c['x0']))
            rows = []
            for c in chars:
                if rows and abs(rows[-1][0] - c['top']) < 3: rows[-1][1].append(c)
                else: rows.append([c['top'], [c]])
            segs = []
            for top, cs in rows:
                cs.sort(key=lambda c: -c['x0'])
                cur = []
                for c in cs:
                    if cur and (cur[-1]['x0'] - c['x1']) > 12:   # فاصل عمودين
                        segs.append(cur); cur = []
                    cur.append(c)
                if cur: segs.append(cur)
            ls = []
            for cs in segs:
                out = []; prev = None
                for c in cs:
                    if prev and c['text'] == prev['text'] and abs(c['x0'] - prev['x0']) < 0.5 and abs(c['x1'] - prev['x1']) < 0.5: continue
                    if prev and prev['x0'] - c['x1'] > 0.22 * c['size']: out.append(' ')
                    out.append(c['text']); prev = c
                t = ''.join(out)
                t = re.sub(r'[0-9A-Za-z/.,:%]+(?: [0-9A-Za-z/.,:%]+)*', lambda m: m.group(0)[::-1], t)
                t = re.sub(r'\(cid:\d+\)|\(\d+:dic\)', '', t)
                t = re.sub(r'(?<=[\u0600-\u06ff])[A-Za-z!?#*+=_|~^$@&]+(?=[\u0600-\u06ff ])|(?<=[\u0600-\u06ff ])[A-Za-z!?#*+=_|~^$@&]+(?=[\u0600-\u06ff])', '', t)
                t = re.sub(r'\s+', ' ', t).strip()
                if not t: continue
                x0 = min(c['x0'] for c in cs); x1 = max(c['x1'] for c in cs); y0 = min(c['top'] for c in cs); y1 = max(c['bottom'] for c in cs)
                ls.append({'t': t, 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'sz': max(c['size'] for c in cs), 'b': 1 if any('Bold' in c['fontname'] for c in cs) else 0})
            mid = pw / 2
            left = sum(1 for l in ls if l['x1'] < mid + 10); right = sum(1 for l in ls if l['x0'] > mid - 10)
            if ls and left > 0.25 * len(ls) and right > 0.25 * len(ls):
                col = lambda l: 1 if (l['x0'] + l['x1']) / 2 < mid and (l['x1'] - l['x0']) < 0.55 * pw else 0
                ls.sort(key=lambda l: (col(l), round(l['y0']), -l['x1']))
            else:
                ls.sort(key=lambda l: (round(l['y0']), -l['x1']))
            pages.append({'pw': pw, 'ph': ph, 'lines': ls})
    return pages


def flat(pages):
    out = []
    for pi, p in enumerate(pages, 1):
        ls = p['lines']; li = 0
        while li < len(ls):
            l = ls[li]
            if re.fullmatch(r'\s*\d{1,2}\s*[-–]\s*', l['t']) and li + 1 < len(ls):   # رقم المبدأ وحده في سطر: يُضم إلى السطر التالي
                n = ls[li + 1]; l = dict(l, t=l['t'].strip() + ' ' + n['t'], x0=min(l['x0'], n['x0']), x1=max(l['x1'], n['x1']), y1=max(l['y1'], n['y1'])); li += 1
            out.append((pi, li, l, nz(l['t']))); li += 1
    return out


def find_from(FL, start, pred, limit=4000):
    for j in range(start, min(len(FL), start + limit)):
        if pred(FL[j]): return j
    return None


def locate(items, rulings, FL):
    """لكل مبدأ: فهرس سطر العنوان وفهرس آخر سطر في نص قاعدته"""
    pos = 0
    res = {}
    byr = collections.defaultdict(list)
    for it in items: byr[it['src']['rid']].append(it)
    for r in rulings:
        its = byr.get(r['id'], [])
        if not its: continue
        n = r['n']
        j = find_from(FL, pos, lambda e: e[2]['t'].strip().strip('() ') == str(n))
        if j is None:
            j = find_from(FL, pos, lambda e: nz(r['cit'] or '§§') and nz(r['cit'])[:20] in e[3]) if r['cit'] else None
        if j is None:
            for it in its: res[it['id']] = None
            continue
        pos = j + 1
        heads = []
        for it in its:
            k = it['src']['k']; key = nz(it['ttl'])[:18]
            h = find_from(FL, pos, lambda e: re.match(rf'^\s*{k}\s*[-–ـ]', e[2]['t']) and key[:10] in e[3][:40], 400)
            heads.append(h)
            if h is not None: pos = h + 1
        tails = []
        for i, it in enumerate(its):
            k = it['src']['k']; key = nz(it['rule'])[:18]
            t = find_from(FL, pos, lambda e: re.match(rf'^\s*{k}\s*[-–ـ]', e[2]['t']) and key[:10] in e[3][:40], 400) if it['rule'] else None
            tails.append(t)
            if t is not None: pos = t + 1
        # نهاية نص كل قاعدة: السطر الذي يسبق قاعدة تليها، أو يسبق رأس الحكم التالي
        for i, it in enumerate(its):
            h, t = heads[i], tails[i]
            if h is None:
                res[it['id']] = None; continue
            if t is None: end = (heads[i + 1] - 1) if i + 1 < len(heads) and heads[i + 1] else h
            else:
                nxt = tails[i + 1] if i + 1 < len(tails) and tails[i + 1] else None
                if nxt is None:
                    nxt = find_from(FL, t + 1, lambda e: e[2]['t'].strip().startswith('محكمة التمييز') or e[2]['t'].strip().strip('() ').isdigit() or re.fullmatch(r'المحكمـ*ة\s*[:.]?', e[2]['t'].strip()) is not None, 400)
                end = (nxt - 1) if nxt else t
            res[it['id']] = (h, (heads[i + 1] - 1) if i + 1 < len(heads) and heads[i + 1] else h, t, end)
    return res


def locate_msa(items, FL):
    """المستحدث: لا أرقام أحكام ولا «k-»؛ يُحدَّد الموجز بأول سطر من موجزه، والقاعدة بأول سطر منها حتى سطر الإسناد"""
    res, pos = {}, 0
    for it in items:
        k1 = nz(it['p'][0])[:14] if it['p'] else None
        k2 = nz(it['rule'].split('\n')[0])[:14] if it['rule'] else None
        cit = nz(it['c'][0]['raw'])[:10]
        h = find_from(FL, pos, lambda e: k1 and k1 in e[3], 600) if k1 else None
        if h is None: res[it['id']] = None; continue
        t = find_from(FL, h + 1, lambda e: k2 and k2 in e[3], 400) if k2 else None
        end = find_from(FL, (t or h) + 1, lambda e: cit and cit in e[3], 800)
        if end is None: end = t or h
        res[it['id']] = (h, (t - 1) if t else h, t, end)
        pos = end + 1
    return res


def main():
    for code in CODES:
        items = json.load(open(os.path.join(JOUT, code + '.json'), encoding='utf-8'))
        rulings = json.load(open(os.path.join(JOUT, code + '-rulings.json'), encoding='utf-8'))
        files = []
        for it in items:
            if it['src']['file'] not in files: files.append(it['src']['file'])
        pdir = os.path.join(SITE, 'pages', code); tdir = os.path.join(SITE, 'pagetext', code)
        os.makedirs(pdir, exist_ok=True); os.makedirs(tdir, exist_ok=True)
        gpage = 0; docs = []; alltext = {}; allpages = []   # (pdf, page index)
        unlocated = 0
        for f in files:
            doc = os.path.join(SRC, re.sub(r'\.txt$', '', f))
            cand = [doc + ext for ext in ('.DOC', '.doc', '.docx', '.DOCX')]
            doc = next((c for c in cand if os.path.exists(c)), None)
            if not doc: print('لا ملف Word:', f, file=sys.stderr); continue
            pdf = to_pdf(doc)
            pages = pdf_lines(pdf)
            FL = flat(pages)
            its = [it for it in items if it['src']['file'] == f]
            ruls = [r for r in rulings if r['file'] == f]
            loc = locate_msa(its, FL) if code == 'MSA' else locate(its, ruls, FL)
            first = gpage + 1
            for pi, p in enumerate(pages, 1):
                gpage += 1
                allpages.append((pdf, pi))
                alltext[gpage] = [[l['t'], round(l['y0'], 1), round(l['sz']), l['b']] for l in p['lines']]
            docs.append({'file': f, 'first': first, 'last': gpage, 'pw': pages[0]['pw'] if pages else 595.3, 'ph': pages[0]['ph'] if pages else 841.9})
            for it in its:
                L = loc.get(it['id'])
                it['rv'] = [r for r in it['rv'] if r != 'تعذّر تحديد موضع المبدأ في صورة الصفحة']
                if not L:
                    unlocated += 1; it['rv'].append('تعذّر تحديد موضع المبدأ في صورة الصفحة'); continue
                h0, h1, t0, t1 = L
                spans = [(h0, h1)] + ([(t0, t1)] if t0 is not None else [])
                regs = {}
                for a, b in spans:
                    for j in range(a, b + 1):
                        pi, li, l, _ = FL[j]
                        g = first - 1 + pi
                        r = regs.setdefault(g, [l['x0'], l['y0'], l['x1'], l['y1']])
                        r[0] = min(r[0], l['x0']); r[1] = min(r[1], l['y0']); r[2] = max(r[2], l['x1']); r[3] = max(r[3], l['y1'])
                it['pg'] = sorted(regs)
                it['rg'] = [{'page': g, 'bbox': [round(v, 1) for v in regs[g]]} for g in sorted(regs)]
        # صور الصفحات
        tmp = tempfile.mkdtemp()
        cell = None; grid = None; gi = None
        crop = [0.06, 0.04, 0.94, 0.96]
        def flush():
            if grid is not None: grid.save(f'{pdir}/g{gi:03d}.webp', 'WEBP', lossless=True, method=6)
        for g, (pdf, pi) in enumerate(allpages, 1):
            fullw = int(round(CW / (crop[2] - crop[0])))
            subprocess.run(['pdftoppm', '-gray', '-scale-to-x', str(fullw), '-scale-to-y', '-1', '-f', str(pi), '-l', str(pi), '-png', '-singlefile', pdf, f'{tmp}/p'], check=True, stderr=subprocess.DEVNULL)
            im = Image.open(f'{tmp}/p.png'); W, H = im.size
            c = im.crop((int(crop[0] * W), int(crop[1] * H), int(crop[0] * W) + CW, int(crop[3] * H))).point(lambda v: 0 if v < 150 else 255)
            if cell is None: cell = c.size
            if c.size != cell:
                c.thumbnail(cell); bg = Image.new('L', cell, 255); bg.paste(c, (0, 0)); c = bg
            gg, k = (g - 1) // GP, (g - 1) % GP
            if gg != gi:
                flush(); gi = gg; grid = Image.new('L', (cell[0] * GC, cell[1] * 10), 255)
            grid.paste(c, ((k % GC) * cell[0], (k // GC) * cell[1]))
        flush()
        json.dump({'col': code, 'crop': crop, 'cell': list(cell), 'first': 1, 'last': gpage, 'gp': GP, 'gc': GC, 'docs': docs}, open(f'{pdir}/meta.json', 'w'))
        # نص الصفحات (ألف صفحة في الملف)
        byb = collections.defaultdict(dict)
        for g, ls in alltext.items(): byb[(g - 1) // 1000][str(g)] = ls
        for b, d in byb.items():
            json.dump(d, open(f'{tdir}/t{b:03d}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(items, open(os.path.join(JOUT, code + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump({'pw': docs[0]['pw'], 'ph': docs[0]['ph'], 'crop': crop, 'cell': list(cell), 'pages': gpage, 'docs': docs}, open(os.path.join(JOUT, code + '-pages.json'), 'w'))
        print(f'{code}: صفحات {gpage} مبادئ {len(items)} بلا موضع {unlocated}', file=sys.stderr)


main()
