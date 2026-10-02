#!/usr/bin/env python3
"""صور صفحات مجموعة القواعد ومواضع القواعد فيها.
المرحلة 1 (متوازية): python3 pages.py render <مجلد docx> <مجلد العمل> <w> <W>
   لكل ملف: PDF بخطه، وأسطر الصفحات، ورقم الصفحة المطبوع (التذييل «- 408 -»)، وصورة كل صفحة PNG مقصوصة.
المرحلة 2: python3 pages.py combine <مجلد docx> <مجلد العمل> <rout> <site> QK5 QJ5
   ترقيم الصفحات في كل مجموعة، وشبكات WebP (20 صفحة في الملف)، ونص الصفحات، وموضع نص كل قاعدة وإسنادها.
"""
import os, re, sys, json, subprocess, collections
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'journal'))
_src = open(os.path.join(HERE, '..', 'journal', 'pages.py'), encoding='utf-8').read().split('\ndef main():')[0]
_src = _src.replace('SRC, JOUT, SITE = sys.argv[1], sys.argv[2], sys.argv[3]', 'SRC = JOUT = SITE = ""').replace("CODES = sys.argv[4:]", "CODES = []").replace("PDFDIR = os.path.join(JOUT, 'pdf'); os.makedirs(PDFDIR, exist_ok=True)", "PDFDIR = ''")
_ns = {}; exec(compile(_src, 'jpages', 'exec'), _ns)
pdf_lines, nz = _ns['pdf_lines'], _ns['nz']
GP, GC, CW = 20, 2, 684
CROP = [0.06, 0.04, 0.94, 0.96]


def files_of(D):
    out = []
    for dp, _, fs in sorted(os.walk(D)):
        for f in sorted(fs):
            if f.endswith('.docx'): out.append(os.path.relpath(os.path.join(dp, f), D))
    return out


def render(D, WORK, w, W):
    fl = files_of(D)
    for i, rel in enumerate(fl):
        if i % W != w: continue
        key = re.sub(r'[^\w؀-ۿ]+', '_', rel)[:120]
        od = os.path.join(WORK, key); os.makedirs(od, exist_ok=True)
        if os.path.exists(os.path.join(od, 'lines.json')): continue
        pdf = os.path.join(od, 'f.pdf')
        if not os.path.exists(pdf):
            subprocess.run(['soffice', f'-env:UserInstallation=file:///tmp/lop{w}', '--headless', '--convert-to', 'pdf', '--outdir', od, os.path.join(D, rel)], capture_output=True, timeout=900)
            base = os.path.splitext(os.path.basename(rel))[0] + '.pdf'
            if os.path.exists(os.path.join(od, base)): os.rename(os.path.join(od, base), pdf)
        if not os.path.exists(pdf): print('فشل', rel, flush=True); continue
        pages = pdf_lines(pdf)
        labels = []
        for p in pages:
            lab = None
            for l in sorted(p['lines'], key=lambda l: -l['y0'])[:3]:
                m = re.fullmatch(r'[-–\s]*(\d{1,4})[-–\s]*', l['t'])
                if m and l['y0'] > p['ph'] * 0.85: lab = int(m.group(1)); break
            labels.append(lab)
        fullw = int(round(CW / (CROP[2] - CROP[0])))
        for pi in range(1, len(pages) + 1):
            png = os.path.join(od, f'p{pi:04d}.png')
            if os.path.exists(png): continue
            subprocess.run(['pdftoppm', '-gray', '-scale-to-x', str(fullw), '-scale-to-y', '-1', '-f', str(pi), '-l', str(pi), '-png', '-singlefile', pdf, png[:-4] + '_r'], check=True, stderr=subprocess.DEVNULL)
            im = Image.open(png[:-4] + '_r.png'); Wd, H = im.size
            c = im.crop((int(CROP[0] * Wd), int(CROP[1] * H), int(CROP[0] * Wd) + CW, int(CROP[3] * H))).point(lambda v: 0 if v < 150 else 255)
            c.save(png); os.remove(png[:-4] + '_r.png')
        json.dump({'rel': rel, 'pw': pages[0]['pw'] if pages else 595.3, 'ph': pages[0]['ph'] if pages else 841.9, 'labels': labels,
                   'lines': [[[l['t'], round(l['x0'], 1), round(l['y0'], 1), round(l['x1'], 1), round(l['y1'], 1), round(l['sz']), l['b']] for l in p['lines']] for p in pages]},
                  open(os.path.join(od, 'lines.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        print(w, i, rel, len(pages), flush=True)


def combine(D, WORK, ROUT, SITE, codes):
    keys = {rel: re.sub(r'[^\w؀-ۿ]+', '_', rel)[:120] for rel in files_of(D)}
    for code in codes:
        items = json.load(open(os.path.join(ROUT, code + '.json'), encoding='utf-8'))
        files = []
        for it in items:
            if it['src']['file'] not in files: files.append(it['src']['file'])
        pdir = os.path.join(SITE, 'pages', code); tdir = os.path.join(SITE, 'pagetext', code)
        os.makedirs(pdir, exist_ok=True); os.makedirs(tdir, exist_ok=True)
        g = 0; docs = []; text = {}; pngs = []; unloc = 0
        for rel in files:
            od = os.path.join(WORK, keys[rel]); L = json.load(open(os.path.join(od, 'lines.json'), encoding='utf-8'))
            first = g + 1
            FL = []
            for pi, ls in enumerate(L['lines'], 1):
                g += 1; pngs.append(os.path.join(od, f'p{pi:04d}.png'))
                text[g] = [[l[0], l[2], l[5], l[6]] for l in ls]
                for l in ls: FL.append((g, l, nz(l[0])))
            docs.append({'file': rel, 'first': first, 'last': g, 'pn': L['labels'], 'label': os.path.splitext(os.path.basename(rel))[0]})
            # موضع كل قاعدة: أول سطر من نصها ثم سطر إسنادها، بالترتيب داخل الملف (بعد قسم الموجزات)
            its = [it for it in items if it['src']['file'] == rel]
            pos = 0
            hs = next((j for j, e in enumerate(FL) if e[1][0].strip().startswith('القواعد القانونية')), None)
            if hs is not None: pos = hs
            for it in its:
                rule = it['rule'] if it['src']['sn'] else (it['p'][0] + '\n' + it['rule'])
                key = nz(rule)[:22]
                if len(key) < 8: unloc += 1; continue
                j = next((j for j in range(pos, len(FL)) if key[:16] in FL[j][2] or (j + 1 < len(FL) and key[:16] in FL[j][2] + FL[j + 1][2])), None)
                if j is None:
                    j = next((j for j in range(0, len(FL)) if key[:16] in FL[j][2]), None)
                    if j is None: unloc += 1; it['rv'].append('تعذّر تحديد موضع القاعدة في صورة الصفحة'); continue
                ck = nz(it['c'][0]['raw'])[:14] if it['c'] else None
                e = next((k for k in range(j, min(len(FL), j + 120)) if ck and ck in FL[k][2]), None)
                if e is None: e = j
                pos = e + 1
                regs = collections.OrderedDict()
                for k in range(j, e + 1):
                    gg, l, _ = FL[k]
                    r = regs.setdefault(gg, [l[1], l[2], l[3], l[4]])
                    r[0] = min(r[0], l[1]); r[1] = min(r[1], l[2]); r[2] = max(r[2], l[3]); r[3] = max(r[3], l[4])
                it['pg'] = list(regs); it['rg'] = [{'page': gg, 'bbox': [round(v, 1) for v in r]} for gg, r in regs.items()]
        # الشبكات
        cell = None; grid = None; gi = None
        def flush():
            if grid is not None: grid.save(f'{pdir}/g{gi:03d}.webp', 'WEBP', lossless=True, method=4)
        for k, png in enumerate(pngs, 1):
            c = Image.open(png).convert('L')
            if cell is None: cell = c.size
            if c.size != cell:
                c.thumbnail(cell); bg = Image.new('L', cell, 255); bg.paste(c, (0, 0)); c = bg
            gg, kk = (k - 1) // GP, (k - 1) % GP
            if gg != gi:
                flush(); gi = gg; grid = Image.new('L', (cell[0] * GC, cell[1] * 10), 255)
            grid.paste(c, ((kk % GC) * cell[0], (kk // GC) * cell[1]))
        flush()
        byb = collections.defaultdict(dict)
        for gg, ls in text.items(): byb[(gg - 1) // 1000][str(gg)] = ls
        for b, d in byb.items():
            json.dump(d, open(f'{tdir}/t{b:03d}.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        json.dump(items, open(os.path.join(ROUT, code + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        L0 = json.load(open(os.path.join(WORK, keys[files[0]], 'lines.json'), encoding='utf-8'))
        json.dump({'pw': L0['pw'], 'ph': L0['ph'], 'crop': CROP, 'cell': list(cell), 'pages': g, 'docs': docs}, open(os.path.join(ROUT, code + '-pages.json'), 'w'))
        print(code, 'صفحات', g, 'قواعد', len(items), 'بلا موضع', unloc, file=sys.stderr)


if __name__ == '__main__':
    if sys.argv[1] == 'render': render(sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5]))
    else: combine(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6:])
