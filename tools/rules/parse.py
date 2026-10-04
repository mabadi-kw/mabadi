#!/usr/bin/env python3
"""مجموعة القواعد القانونية — تقطيع ملف موضوع (docx) إلى قواعد: الموجز (ونقاطه) + نص القاعدة + إسنادها، بالنص الحرفي.
بنية الملف: عنوان الموضوع، فهرس، «موجز القواعد:» بعناوين فرعية وموجزات مرقمة، ثم «القواعد القانونية:» بالعناوين نفسها ونصوص مرقمة
يلي كلًّا منها سطر الإسناد «(الطعن … جلسة …)»، و«وراجع: …» إحالات.
الترقيم: من نص الفقرة («12- …») أو من الترقيم الآلي في Word. حيث ضاع الترقيم الآلي في التحويل (فقرات بنمط بلا ترقيم)،
يُستنتج الرقم بالتسلسل بين رقمين ثابتين إذا طابق عدد الفقرات الفجوة تمامًا، ويُعلَّم ذلك؛ وإلا تبقى القاعدة بلا رقم وتُعلَّم.
"""
import re, sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from docxnum import paragraphs

RE_NUM = re.compile(r'^\s*(\d{1,4})\s*[-–]\s*')
RE_CIT = re.compile(r'^\s*\(\s*و?\s*(?:ال|ا)?طع(?:ن|نان|نين|ون)')
RE_CIT2 = re.compile(r'^\s*\(\s*(?:ال)?قرار\b|^\s*\(\s*(?:ال)?طلب\b|^\s*\(\s*\d+\s*(?:[،,]\s*\d+)*\s*/\s*\d{4}')
RE_SEE = re.compile(r'^\s*و?\s*راجع\b|^\s*-\s*راجع\b')
RE_SUMH = re.compile(r'^\s*موجز\s+القواعد\s*:?\s*$')
RE_TXTH = re.compile(r'^\s*القواعد\s+القانونية\s*:?\s*$')
RE_BUL = re.compile(r'^\s*[-–•●▪]\s*')
W = lambda s: re.sub(r'\s+', ' ', s.replace('\xad', '').replace('‏', '').replace('‎', '').replace('\t', ' ').replace('\xa0', ' ')).strip()


def is_cit(t, st):
    return bool(RE_CIT.match(t) or RE_CIT2.match(t) or (st.startswith('طعن') or 'طعن' in st.split(' + ')[0]) and t.startswith('('))


def is_head(t, st):
    return len(t) < 120 and t.endswith(':') and not RE_NUM.match(t) and ('عنوان' in st or len(t) < 70)


def parse(path):
    P = [(W(t), s or '', n) for t, s, n in paragraphs(path)]
    title = next((t for t, s, n in P if t), '')
    phase = 'toc'; sec = []; blocks = []; cur = None; issues = []
    for t, st, n in P:
        if not t: continue
        if RE_SUMH.match(t): phase = 'sum'; sec = []; cur = None; continue
        if RE_TXTH.match(t): phase = 'txt'; sec = []; cur = None; continue
        if phase == 'toc': continue
        if RE_SEE.match(t) or 'راجع' in st and not RE_NUM.match(t) and n is None:
            if cur: cur['see'].append(t)
            continue
        if is_cit(t, st):
            if cur is None: issues.append(f'إسناد بلا قاعدة: {t[:60]}'); continue
            cur['cits'].append(t); cur['kind'] = 'txt'; phase = 'txt' if phase == 'sum' and len(cur['paras']) and cur['kind'] == 'txt' else phase
            continue
        if is_head(t, st):
            h = t.rstrip(':').strip(' -–')
            # العنوان الفرعي (يبدأ بشرطة) تحت العنوان الرئيسي
            if t.lstrip().startswith(('-', '–')) and sec: sec = sec[:1] + [h]
            else: sec = [h]
            cur = None
            continue
        m = RE_NUM.match(t)
        num = n if n is not None else (int(m.group(1)) if m else None)
        body = t[m.end():] if (m and n is None) else t
        if num is not None:
            cur = {'n': num, 'auto': n is not None, 'sec': list(sec), 'paras': [body], 'cits': [], 'see': [], 'kind': None, 'ph': phase}
            blocks.append(cur); continue
        # فقرة بلا رقم
        if cur is not None and not cur['cits']:
            cur['paras'].append(t); continue          # تتمة (نقطة موجز «-» أو فقرة ثانية من نص القاعدة)
        if cur is not None and cur['cits'] and phase in ('txt', 'sum') and not RE_BUL.match(t):
            # بعد إسناد: قاعدة جديدة ضاع رقمها الآلي
            cur = {'n': None, 'auto': False, 'sec': list(sec), 'paras': [t], 'cits': [], 'see': [], 'kind': None, 'ph': phase}
            blocks.append(cur); continue
        if cur is None and phase == 'txt' and not RE_BUL.match(t):
            cur = {'n': None, 'auto': False, 'sec': list(sec), 'paras': [t], 'cits': [], 'see': [], 'kind': None, 'ph': phase}
            blocks.append(cur); continue
        if cur is not None: cur['paras'].append(t)
        else: issues.append(f'فقرة خارج أي قاعدة: {t[:60]}')
    sums = [b for b in blocks if not b['cits']]
    txts = [b for b in blocks if b['cits']]
    # استنتاج الأرقام الضائعة بين رقمين ثابتين
    inferred = 0
    i = 0
    while i < len(txts):
        if txts[i]['n'] is None:
            j = i
            while j < len(txts) and txts[j]['n'] is None: j += 1
            prev = txts[i - 1]['n'] if i > 0 else 0
            nxt = txts[j]['n'] if j < len(txts) else (max([b['n'] for b in sums if b['n']] or [0]) + 1)
            gap = (nxt - prev - 1) if (prev is not None and nxt is not None) else -1
            if gap == j - i:
                for k in range(i, j): txts[k]['n'] = prev + 1 + (k - i); txts[k]['inferred'] = True; inferred += 1
            i = j
        else: i += 1
    # ما بقي بلا رقم: يُربط بموجزه بالترتيب داخل العنوان نفسه إن تساوى العدد
    have = {b['n'] for b in txts if b['n'] is not None}
    from collections import defaultdict, OrderedDict
    ls = defaultdict(list); lt = defaultdict(list)
    for b in sums:
        if b['n'] is not None and b['n'] not in have: ls[tuple(b['sec'])].append(b)
    for b in txts:
        if b['n'] is None: lt[tuple(b['sec'])].append(b)
    bysec = 0
    for k, tl in lt.items():
        sl = ls.get(k, [])
        if len(sl) == len(tl):
            for a, b in zip(sl, tl): b['n'] = a['n']; b['bysec'] = True; bysec += 1
    # وإن بقي: ربط بالترتيب على مستوى الملف كله إذا تساوى عدد الموجزات الباقية وعدد النصوص الباقية
    have = {b['n'] for b in txts if b['n'] is not None}
    rs = [b for b in sums if b['n'] is not None and b['n'] not in have]
    rt = [b for b in txts if b['n'] is None]
    if rt and len(rs) == len(rt):
        for a, b in zip(rs, rt): b['n'] = a['n']; b['bysec'] = True; bysec += 1
    return {'title': title, 'sums': sums, 'txts': txts, 'issues': issues, 'inferred': inferred, 'bysec': bysec}


if __name__ == '__main__':
    r = parse(sys.argv[1])
    print(r['title'], 'موجزات', len(r['sums']), 'نصوص', len(r['txts']), 'بلا رقم', sum(1 for b in r['txts'] if b['n'] is None), 'مستنتج', r['inferred'], 'بالعنوان', r['bysec'], 'ملاحظات', len(r['issues']))
    sn = [b['n'] for b in r['sums'] if b['n'] is not None]; tn = [b['n'] for b in r['txts'] if b['n'] is not None]
    print('موجزات بلا نص:', len(set(sn) - set(tn)), sorted(set(sn) - set(tn))[:12], 'نصوص بلا موجز:', len(set(tn) - set(sn)), sorted(set(tn) - set(sn))[:12])
    for x in r['issues'][:5]: print('  ', x)
