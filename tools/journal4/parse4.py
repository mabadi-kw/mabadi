#!/usr/bin/env python3
"""مجلة القضاء والقانون (السنوات 44–45: 2016–2017) والمستحدث الإداري — ملف Word واحد لكل جزء.
بنية الحكم (نص LibreOffice المصدَّر):
  محكمة التمييز / الدائرة … (قد تمتد سطرين) / جلسة d/m/yyyy / برئاسة… وعضوية… (أسماء الهيئة)
  (n)                       رقم الحكم في الجزء — قد يغيب في ملف Word
  (الطعن رقم X/YYYY نوع)     الإسناد — قد يغيب
  k- عنوان   ثم  - موجز …    ثم  k- نص القاعدة …
  "المحكمة"                 ثم نص الحكم كاملًا (يُجهَّز ولا يُنشر)
يبدأ كل حكم عند سطر «محكمة التمييز» (لا عند رقمه، لأن الرقم قد يغيب). لا يُغيَّر حرف من النص.
"""
import re, sys, json, os
RE_SESS = re.compile(r'^جلسة\s+(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})\s*م?\s*$')
RE_NUM = re.compile(r'^\(\s*(\d+)\s*\)$')
RE_CIT_OPEN = re.compile(r'^\(\s*(?:ال)?طع(?:ن|نان|نين|ون)\b')
RE_K = re.compile(r'^(\d{1,2})\s*[-–ـ]\s*(.*)$')
RE_BUL = re.compile(r'^[-–]\s*(.*)$')
RE_FULL = re.compile(r'^["“”]?\s*ال[ـ\s]*م[ـ\s]*ح[ـ\s]*ك[ـ\s]*م[ـ\s]*ة\s*["“”]?\s*[:.]?$')
RE_FULL2 = re.compile(r'^(?:["“]?\s*ال[ـ\s]*و[ـ\s]*ق[ـ\s]*ا[ـ\s]*ئ[ـ\s]*ع\s*["”]?\s*:?|بعد الاطلاع على الأوراق.*)$')
RE_SECT = re.compile(r'^(أولاً|ثانياً|ثالثاً|رابعاً|\((أ|ب|ج|د)\)\s*:?.*الأحكام الصادرة|الأحكام الصادرة)')
DIG = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')


def clean(s):
    s = s.replace('﻿', '').replace('\xad', '').replace('‏', '').replace('‎', '').replace('\t', ' ').replace('\xa0', ' ')
    return re.sub(r'[ ]{2,}', ' ', s).strip()


def parse_file(path):
    lines = [clean(l) for l in open(path, encoding='utf-8-sig').read().split('\n')]
    out, cur, phase, sect = [], None, None, None
    i, N = 0, len(lines)
    while i < N:
        t = lines[i]
        if not t: i += 1; continue
        if RE_SECT.match(t) and (cur is None or phase == 'full'):
            sect = t; i += 1; continue
        if t == 'محكمة التمييز':
            cur = {'n': None, 'ch': None, 'sess': None, 'sess_raw': None, 'panel': [], 'cit': None, 'heads': [], 'texts': [], 'issues': [], 'line': i + 1, 'part_sec': sect, 'full': None}
            out.append(cur); phase = 'hdr'; i += 1; chl = []
            while i < N:
                u = lines[i]
                if not u: i += 1; continue
                m = RE_SESS.match(u.translate(DIG))
                if m and not cur['sess']:
                    cur['sess'] = f"{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"; cur['sess_raw'] = u; i += 1; continue
                if not cur['sess'] and not RE_K.match(u): chl.append(u); i += 1; continue
                break
            cur['ch'] = ' '.join(chl) or None
            continue
        if cur is None: i += 1; continue
        if phase == 'hdr':
            m = RE_NUM.match(t.translate(DIG))
            if m and cur['n'] is None: cur['n'] = int(m.group(1)); i += 1; continue
            if cur['cit'] is None and RE_CIT_OPEN.match(t):
                c = t
                while not c.rstrip().endswith(')') and i + 1 < N and lines[i + 1]:
                    i += 1; c += ' ' + lines[i]
                cur['cit'] = c; i += 1; continue
            if not RE_K.match(t):
                cur['panel'].append(t); i += 1; continue
            phase = 'head'
        if (RE_FULL.match(t) or RE_FULL2.match(t)) and phase in ('text', 'head') and cur['texts' if phase == 'text' else 'heads']:
            phase = 'full'; cur['full'] = []; i += 1; continue
        if phase == 'full':
            cur['full'].append(t); i += 1; continue
        m = RE_K.match(t)
        if m:
            k = int(m.group(1)); body = m.group(2).strip()
            if phase == 'head' and cur['heads'] and k <= cur['heads'][-1]['k'] and k == 1:
                phase = 'text'
            if phase == 'head':
                cur['heads'].append({'k': k, 'title': body, 'sum': []})
            elif (not cur['texts'] and k == 1) or (cur['texts'] and k == cur['texts'][-1]['k'] + 1 and k <= len(cur['heads'])):
                cur['texts'].append({'k': k, 'paras': [body] if body else []})
            else:
                # بند مرقّم داخل نص القاعدة (مثل فقرات نص قانوني منقول): تتمة لا قاعدة جديدة
                cur['texts'][-1]['paras'].append(t)
            i += 1; continue
        m = RE_BUL.match(t)
        if m and phase == 'head' and cur['heads']:
            cur['heads'][-1]['sum'].append(m.group(1).strip()); i += 1; continue
        if phase == 'text' and cur['texts']:
            cur['texts'][-1]['paras'].append(t)
        elif phase == 'head' and cur['heads']:
            if cur['heads'][-1]['sum']: cur['heads'][-1]['sum'][-1] += ' ' + t
            else: cur['heads'][-1]['title'] += ' ' + t
        else:
            cur['issues'].append(f'سطر غير مفهوم: {t[:80]}')
        i += 1
    out = [r for r in out if r['heads']]
    for r in out:
        hk = [h['k'] for h in r['heads']]; tk = [x['k'] for x in r['texts']]
        if not r['cit']: r['issues'].append('لا إسناد')
        if r['n'] is None: r['issues'].append('لا رقم للحكم في ملف Word')
        if not r['sess']: r['issues'].append('لا تاريخ جلسة')
        if hk != list(range(1, len(hk) + 1)): r['issues'].append(f'ترقيم العناوين {hk}')
        if tk != list(range(1, len(tk) + 1)): r['issues'].append(f'ترقيم النصوص {tk}')
        if len(hk) != len(tk): r['issues'].append(f'عدد العناوين {len(hk)} ≠ عدد النصوص {len(tk)}')
        for h in r['heads']:
            if not h['sum']: r['issues'].append(f'عنوان {h["k"]} بلا موجز')
    return out


if __name__ == '__main__':
    import collections
    for p in sys.argv[1:]:
        R = parse_file(p)
        c = collections.Counter(x.split(' ')[0] for r in R for x in r['issues'])
        print(p.split('/')[-1], 'أحكام', len(R), 'مبادئ', sum(len(r['heads']) for r in R), 'بلا إسناد', sum(1 for r in R if not r['cit']), 'ملاحظات', dict(c))


RE_MUJ = re.compile(r'^الموجـ*ز\s*\(\s*(\d+)\s*\)\s*:?$')
RE_QA = re.compile(r'^القاعـ*دة\s*\(\s*(\d+)\s*\)\s*:?$')
RE_CITE_END = re.compile(r'^\(\s*(?:ال)?طع(?:ن|نان|ون)\b.*جلسة.*\)\s*$')


def parse_mustahdath(path):
    """المستحدث: «أولاً» حكم الهيئة العامة بصيغة المجلة، ثم «ثانياً» موضوعات مرتبة هجائيًا؛ في كل موضوع:
    الموجز (k): أسطر «-» … القاعدة (k): فقرات … ثم سطر الإسناد «(الطعن رقم …/… نوع جلسة d/m/yyyy)» وقد يليه «وراجع: …» و«********»."""
    lines = [clean(l) for l in open(path, encoding='utf-8-sig').read().split('\n')]
    nz = [l for l in lines]
    # الجزء الأول: حكم الهيئة العامة — نُمرّره على المقطّع العام
    try:
        a = next(i for i, l in enumerate(nz) if l == 'أولاً')
        b = next(i for i, l in enumerate(nz) if l == 'ثانياً' and i > a)
        e = next(i for i, l in enumerate(nz) if l.startswith('أولاً: حكم الهيئة العامة'))
    except StopIteration:
        a = b = e = None
    out = []
    if a is not None:
        tmp = path + '.part1.txt'; open(tmp, 'w', encoding='utf-8').write('\n'.join(nz[a:b]))
        for r in parse_file(tmp): r['part_sec'] = 'الهيئة العامة'; out.append(r)
        os.remove(tmp)
    topic, cur, mode = None, None, None
    i = b + 1 if b is not None else 0
    end = e if e is not None else len(nz)
    pending = []
    while i < end:
        t = nz[i]; i += 1
        if not t: continue
        m = RE_MUJ.match(t)
        if m:
            cur = {'n': None, 'ch': 'الدائرة الإدارية', 'sess': None, 'sess_raw': None, 'panel': [], 'cit': None, 'heads': [{'k': 1, 'title': topic or '', 'sum': [], 'mk': int(m.group(1))}],
                   'texts': [], 'issues': [], 'line': i, 'part_sec': 'المستحدث في المواد الإدارية', 'topic': topic, 'full': None}
            out.append(cur); mode = 'sum'; continue
        m = RE_QA.match(t)
        if m and cur:
            cur['texts'].append({'k': 1, 'paras': []}); mode = 'rule'
            if int(m.group(1)) != cur['heads'][0]['mk']: cur['issues'].append(f'رقم القاعدة {m.group(1)} ≠ رقم الموجز {cur["heads"][0]["mk"]}')
            continue
        if cur and mode == 'rule' and (RE_CIT_OPEN.match(t) or re.match(r'^\(\s*(?:ال)?طلب\b', t)):
            c = t
            while not c.rstrip().endswith(')') and i < end and nz[i]:
                c += ' ' + nz[i]; i += 1
            cur['cit'] = c
            ms = re.search(r'جلسة\s*(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})', c.translate(DIG))
            if ms: cur['sess'] = f"{int(ms.group(3)):04d}-{int(ms.group(2)):02d}-{int(ms.group(1)):02d}"; cur['sess_raw'] = 'جلسة ' + '/'.join(ms.groups())
            mode = 'after'; continue
        if t.startswith('********'): mode = None; continue
        if t.startswith('وراجع'):
            if cur: cur.setdefault('see', []).append(t)
            continue
        if mode == 'sum' and cur:
            mb = RE_BUL.match(t)
            if mb: cur['heads'][0]['sum'].append(mb.group(1).strip())
            elif cur['heads'][0]['sum']: cur['heads'][0]['sum'][-1] += ' ' + t
            continue
        if mode == 'rule' and cur:
            cur['texts'][-1]['paras'].append(t); continue
        # سطر خارج المبدأ: عنوان موضوع (أو سطر قائمة الموضوعات تحت الحرف)
        if re.fullmatch(r'\]\s*.\s*\[', t) or t.count('.') >= 2: continue
        topic = t; mode = None
    for r in out:
        if r.get('topic') is None: continue
        if not r['cit']: r['issues'].append('لا إسناد')
        if not r['texts']: r['issues'].append('لا نص قاعدة')
        if not r['heads'][0]['sum']: r['issues'].append('موجز فارغ')
    return out
