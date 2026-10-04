#!/usr/bin/env python3
"""قراءة فقرات ملف docx مع أرقام القوائم الآلية كما يعرضها Word (الترقيم من الفقرة أو من نمطها).
تُعاد الفقرات بترتيبها: (النص، اسم النمط، الرقم الآلي أو None). النص نفسه لا يُمس.
"""
import zipfile, re
from xml.etree import ElementTree as ET
W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'


def _val(e, tag):
    x = e.find(W + tag) if e is not None else None
    return x.get(W + 'val') if x is not None else None


def paragraphs(path):
    z = zipfile.ZipFile(path)
    # الأنماط: اسم، أساس، ترقيم
    styles = {}
    try:
        S = ET.fromstring(z.read('word/styles.xml'))
        for s in S.findall(W + 'style'):
            sid = s.get(W + 'styleId')
            name = _val(s, 'name') or sid
            based = _val(s, 'basedOn')
            ppr = s.find(W + 'pPr')
            np = ppr.find(W + 'numPr') if ppr is not None else None
            num = (_val(np, 'numId'), _val(np, 'ilvl') or '0') if np is not None else None
            styles[sid] = {'name': name, 'based': based, 'num': num}
    except KeyError:
        pass
    # الترقيم
    absn, nums = {}, {}
    try:
        N = ET.fromstring(z.read('word/numbering.xml'))
        for a in N.findall(W + 'abstractNum'):
            aid = a.get(W + 'abstractNumId'); lv = {}
            for l in a.findall(W + 'lvl'):
                lv[l.get(W + 'ilvl')] = {'start': int(_val(l, 'start') or 1), 'fmt': _val(l, 'numFmt'), 'text': _val(l, 'lvlText')}
            absn[aid] = lv
        for n in N.findall(W + 'num'):
            nid = n.get(W + 'numId'); aid = _val(n, 'abstractNumId'); ov = {}
            for o in n.findall(W + 'lvlOverride'):
                so = o.find(W + 'startOverride')
                if so is not None: ov[o.get(W + 'ilvl')] = int(so.get(W + 'val'))
            nums[nid] = {'abs': aid, 'ov': ov}
    except KeyError:
        pass

    def style_num(sid, depth=0):
        st = styles.get(sid)
        if not st or depth > 10: return None
        if st['num']: return st['num']
        return style_num(st['based'], depth + 1) if st['based'] else None

    D = ET.fromstring(z.read('word/document.xml'))
    body = D.find(W + 'body')
    counters = {}       # abstractNumId -> {ilvl: n}
    started = set()     # numId التي طُبّق عليها startOverride
    out = []
    for p in body.iter(W + 'p'):
        ppr = p.find(W + 'pPr')
        sid = _val(ppr, 'pStyle') if ppr is not None else None
        np = ppr.find(W + 'numPr') if ppr is not None else None
        if np is not None and _val(np, 'numId') is not None:
            num = (_val(np, 'numId'), _val(np, 'ilvl') or (style_num(sid) or ('', '0'))[1])
        else:
            num = style_num(sid)
        txt = ''.join(t.text or '' for t in p.iter(W + 't'))
        # علامات الجدولة وفواصل الأسطر داخل الفقرة
        n = None
        if num and num[0] not in (None, '0') and num[0] in nums and txt.strip():
            nid, il = num; info = nums[nid]; aid = info['abs']; lv = absn.get(aid, {}).get(il, {'start': 1, 'fmt': 'decimal'})
            c = counters.setdefault(aid, {})
            if il in info['ov'] and nid not in started:
                started.add(nid); c[il] = info['ov'][il] - 1
            if il not in c: c[il] = lv['start'] - 1
            c[il] += 1
            for k in list(c):
                if int(k) > int(il): del c[k]
            n = None if lv.get('fmt') in ('bullet', 'none') else c[il]
        out.append((txt, styles.get(sid, {}).get('name', sid or ''), n))
    return out


if __name__ == '__main__':
    import sys
    for t, s, n in paragraphs(sys.argv[1])[:int(sys.argv[2]) if len(sys.argv) > 2 else 60]:
        print(n, '|', s, '|', t[:90])
