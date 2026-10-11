#!/usr/bin/env python3
"""يُبقي من صور صفحات المجموعة (ونصوصها المستخرجة) ما فيه مبدأ منشور فقط، ويُخلي الباقي:
صفحات نص الحكم الكامل لا تُنشر (قرار صاحب المكتبة: نص الحكم الكامل لا يُنشر)، وتوفّر المساحة.
- خلايا الصفحات غير المنشورة تُبيَّض في شبكات WebP، والشبكة التي لا يبقى فيها شيء تُحذف.
- نصوص تلك الصفحات تُحذف من pagetext.
- meta.cols[c].kp = نطاقات الصفحات المنشورة [[من، إلى]، …]؛ والتطبيق يعرض لغيرها بطاقة «لا تُنشر».
الاستعمال: python3 tools/journal/trim_pages.py MQ35 [MQ36 …]"""
import os, sys, json, glob
from PIL import Image
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = lambda *p: os.path.join(ROOT, *p)
M = json.load(open(D('data', 'meta.json'), encoding='utf-8'))
for c in sys.argv[1:]:
    C = M['cols'][c]; gp = C.get('gp', 20); gc = gp // 10; cell = C['cell']
    last = C.get('last') or C['docs'][-1]['last']
    keep = set()
    for x in json.load(open(D('data', c + '.json'), encoding='utf-8')): keep |= set(x.get('pg', []))
    rngs = []
    for g in sorted(keep):
        if rngs and g == rngs[-1][1] + 1: rngs[-1][1] = g
        else: rngs.append([g, g])
    C['kp'] = rngs
    before = after = 0
    for gi in range((last - 1) // gp + 1):
        fp = D('pages', c, f'g{gi:03d}.webp')
        if not os.path.exists(fp): continue
        before += os.path.getsize(fp)
        pages = [gi * gp + k + 1 for k in range(gp)]
        if not any(g in keep for g in pages):
            os.remove(fp); continue
        im = Image.open(fp).convert('L')
        for k, g in enumerate(pages):
            if g in keep: continue
            x0, y0 = (k % gc) * cell[0], (k // gc) * cell[1]
            im.paste(255, (x0, y0, x0 + cell[0], y0 + cell[1]))
        im.save(fp, 'WEBP', lossless=True, method=6); after += os.path.getsize(fp)
    tb = ta = 0
    for fp in glob.glob(D('pagetext', c, 't*.json')):
        tb += os.path.getsize(fp)
        t = json.load(open(fp, encoding='utf-8'))
        t = {g: v for g, v in t.items() if int(g) in keep}
        json.dump(t, open(fp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':')); ta += os.path.getsize(fp)
    print(f'{c}: صفحات {last} منشورة {len(keep)} — الصور {before/1e6:.1f}→{after/1e6:.1f} م.ب، النصوص {tb/1e6:.1f}→{ta/1e6:.1f}', file=sys.stderr)
json.dump(M, open(D('data', 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
