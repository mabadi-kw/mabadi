#!/usr/bin/env python3
"""مجلة القضاء والقانون — تقطيع ملفات الأقسام (تجاري/إداري، مدني/أحوال/عمالي، جزائي) إلى أحكام ومبادئ بالنص الحرفي.
بنية الملف (تصدير LibreOffice النصي لملف Word):
  محكمة التمييز / الدائرة … / جلسة d/m/yyyy / هيئة المحكمة
  (n)                      رقم الحكم في العدد
  (الطعن رقم X/YYYY دائرة)  الإسناد كما ورد
  k- كلمات مفتاحية         عنوان المبدأ k
  - موجز                    موجز (سطر أو أكثر)
  …
  k- نص القاعدة            نص المبدأ k (قد يمتد على أكثر من فقرة)
لا يُغيَّر حرف من النص؛ تُزال فقط المسافات الزائدة في الأطراف وعلامات الجدولة.
الاستعمال: python3 parse.py <ملف.txt> … → JSON على stdout (أو -o مجلد)
"""
import re, sys, json, os

RE_SESS = re.compile(r'^جلسة\s+(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})\s*م?\s*$')
RE_COURT = re.compile(r'^محكمة التمييز\s*$')
RE_CH = re.compile(r'^(?:ال)?دائرة\s+(.+?)\s*$')
RE_NUM = re.compile(r'^\(\s*(\d+)\s*\)\s*$')
RE_CIT = re.compile(r'^\(\s*(?:ال)?طع(?:ن|نان|نين|ون)\b.*\)\s*$')
RE_CIT_OPEN = re.compile(r'^\(\s*(?:ال)?طع(?:ن|نان|نين|ون)\b')
RE_K = re.compile(r'^(\d{1,2})\s*[-–ـ]\s*(.*)$')
RE_BUL = re.compile(r'^[-–]\s*(.*)$')
RE_FULL = re.compile(r'^(?:المحكمـ*ة|المحكمة\s*[:.]?)\s*$')
RE_PANEL = re.compile(r'^(نائب\s+رئيـ*س|رئيـ*س|برئاسـ*ة|وعضوية|و\s*[أ-ي])')
DIG = str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789')


def clean(s):
    s = s.replace('﻿', '').replace('\xad', '').replace('\u200f', '').replace('\u200e', '').replace('\t', ' ').replace('\xa0', ' ')
    return re.sub(r'[ ]{2,}', ' ', s).strip()


def parse_file(path):
    lines = [clean(l) for l in open(path, encoding='utf-8-sig').read().split('\n')]
    out, cur, hdr = [], None, {'ch': None, 'sess': None, 'panel': []}
    phase = None   # 'head' | 'text'
    issues = []
    i = 0
    n_lines = len(lines)

    def flush():
        if cur:
            out.append(cur)

    while i < n_lines:
        t = lines[i]
        if not t:
            i += 1; continue
        if RE_COURT.match(t):
            # رأس جديد: دائرة وجلسة وهيئة
            hdr = {'ch': None, 'sess': None, 'panel': []}
            i += 1
            while i < n_lines:
                u = lines[i]
                if not u: i += 1; continue
                m = RE_CH.match(u)
                if m and hdr['ch'] is None: hdr['ch'] = m.group(1); i += 1; continue
                m = RE_SESS.match(u.translate(DIG))
                if m: hdr['sess'] = f"{int(m.group(3)):04d}-{int(m.group(2)):02d}-{int(m.group(1)):02d}"; hdr['sess_raw'] = u; i += 1; continue
                if RE_PANEL.match(u) or (u.startswith('و') and ' ' in u and len(u) < 60 and not RE_K.match(u) and not RE_NUM.match(u)):
                    hdr['panel'].append(u); i += 1; continue
                break
            continue
        m = RE_NUM.match(t)
        if m:
            flush()
            cur = {'n': int(m.group(1)), 'ch': hdr['ch'], 'sess': hdr['sess'], 'sess_raw': hdr.get('sess_raw'), 'panel': list(hdr['panel']),
                   'cit': None, 'heads': [], 'texts': [], 'issues': [], 'line': i + 1}
            phase = None
            i += 1
            continue
        if cur is None:
            # أسطر قبل أول حكم (عناوين القسم)
            i += 1; continue
        if cur['cit'] is None and RE_CIT_OPEN.match(t):
            c = t
            while not c.rstrip().endswith(')') and i + 1 < n_lines and lines[i + 1]:
                i += 1; c += ' ' + lines[i]
            cur['cit'] = c
            phase = 'head'
            i += 1
            continue
        if RE_FULL.match(t):
            phase = 'full'; cur['full'] = []; i += 1; continue
        if phase == 'full':
            cur['full'].append(t); i += 1; continue
        m = RE_K.match(t)
        if m:
            k = int(m.group(1)); body = m.group(2).strip()
            if phase == 'head' and cur['heads'] and k == 1 and cur['heads'][-1]['k'] >= 1 and (k <= cur['heads'][-1]['k']):
                phase = 'text'
            if phase in (None, 'head'):
                phase = 'head'
                cur['heads'].append({'k': k, 'title': body, 'sum': []})
            else:
                cur['texts'].append({'k': k, 'paras': [body] if body else []})
            i += 1
            continue
        m = RE_BUL.match(t)
        if m and phase == 'head' and cur['heads']:
            cur['heads'][-1]['sum'].append(m.group(1).strip()); i += 1; continue
        # سطر بلا علامة: تتمة
        if phase == 'text' and cur['texts']:
            cur['texts'][-1]['paras'].append(t)
        elif phase == 'head' and cur['heads']:
            if cur['heads'][-1]['sum']: cur['heads'][-1]['sum'][-1] += ' ' + t
            else: cur['heads'][-1]['title'] += ' ' + t
        else:
            cur['issues'].append(f'سطر غير مفهوم قبل الإسناد: {t[:80]}')
        i += 1
    flush()
    # فحوص
    for r in out:
        hk = [h['k'] for h in r['heads']]; tk = [x['k'] for x in r['texts']]
        if not r['cit']: r['issues'].append('لا إسناد')
        if not r['sess']: r['issues'].append('لا تاريخ جلسة')
        if hk != list(range(1, len(hk) + 1)): r['issues'].append(f'ترقيم العناوين {hk}')
        if tk != list(range(1, len(tk) + 1)): r['issues'].append(f'ترقيم النصوص {tk}')
        if len(hk) != len(tk): r['issues'].append(f'عدد العناوين {len(hk)} ≠ عدد النصوص {len(tk)}')
        for h in r['heads']:
            if not h['sum']: r['issues'].append(f'عنوان {h["k"]} بلا موجز')
    return out


if __name__ == '__main__':
    args = sys.argv[1:]
    res = {}
    for p in args:
        res[p] = parse_file(p)
    tot = sum(len(v) for v in res.values()); bad = sum(1 for v in res.values() for r in v if r['issues'])
    for p, v in res.items():
        print(os.path.basename(p), 'أحكام:', len(v), 'مبادئ:', sum(len(r['heads']) for r in v), 'ملاحظات:', sum(1 for r in v if r['issues']), file=sys.stderr)
        for r in v:
            if r['issues']: print('   ', r['n'], r['cit'], r['issues'], file=sys.stderr)
    json.dump(res, sys.stdout, ensure_ascii=False, indent=1)
