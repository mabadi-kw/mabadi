#!/usr/bin/env python3
"""المستحدث (المكتب الفني) — كتب الإصدارات 13 وما بعدها، ملف Word واحد لكل كتاب (نص LibreOffice المصدَّر).
البنية: تقديم، ثم (اختياريًا) حكم الهيئة العامة بصيغة المجلة، ثم حروف «[ أ ]» تحت كل منها قائمة موضوعات (تُتخطّى)،
ثم موضوعات؛ في كل موضوع: «الموجز (k):» أسطر «-» … «القاعدة (k):» فقرات … ثم سطر الإسناد «(الطعن …/… نوع جلسة d/m/yyyy)»،
وقد يليه «(والطعن …)» و«وراجع: …» و«*****». وقد تتوالى عدة موجزات ثم قواعدها، فتُطابق بالرقم.
ينتهي المتن عند «فهرس هجائي». لا يُغيَّر حرف من النص.
"""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'journal4'))
from parse4 import parse_file, clean, DIG

TAT = re.compile('ـ')
RE_MUJ = re.compile(r'^المو?جز\s*:?\s*\(\s*(\d+)\s*\)\s*:?\s*$')
RE_QA = re.compile(r'^القاعدة?\s*:?\s*\(\s*(\d+)\s*\)\s*:?\s*$')
RE_LET = re.compile(r'^[\[(]\s*\S{1,2}\s*[\])]$')
RE_CIT = re.compile(r'^(?:و\s*)?\(\s*(?:و\s*)?(?:ال|ل)?(?:طع(?:ن|نان|نين|ون)|طلب)')
RE_DATE = re.compile(r'جلسة\s*(\d{1,2})\s*/\s*(\d{1,2})\s*/\s*(\d{4})')
RE_BUL = re.compile(r'^\s*[-–•]\s*(.*)$')


def k(t):
    return TAT.sub('', t).strip()


def is_topic(t):
    return len(t) <= 45 and not t.endswith(('.', ':', '،')) and not RE_BUL.match(t) and not re.search(r'\d', t) and not t.startswith('(')


def parse(path, part_name, ch_default):
    raw = [clean(l) for l in open(path, encoding='utf-8-sig').read().split('\n')]
    lines = [l.lstrip('•').strip() if l.startswith('•') and 'وراجع' in l else l for l in raw]
    N = len(lines)
    M0 = next(i for i, l in enumerate(lines) if RE_MUJ.match(k(l)))
    L0 = max(i for i in range(M0) if RE_LET.match(lines[i]))
    END = next((i for i, l in enumerate(lines) if i > L0 and k(l).startswith('فهرس هجائي')), N)
    out = []
    # حكم الهيئة العامة قبل أول حرف
    ha = next((i for i in range(L0) if k(lines[i]) == 'محكمة التمييز' and any(k(lines[j]).startswith(('جلسة', 'الهيئة العامة')) for j in range(i + 1, min(L0, i + 6)))), None)
    if ha is not None:
        tmp = path + '.ha.txt'; open(tmp, 'w', encoding='utf-8').write('\n'.join(lines[ha:L0]))
        for r in parse_file(tmp): r['part_sec'] = 'الهيئة العامة'; r['ch'] = r['ch'] or 'الهيئة العامة'; out.append(r)
        os.remove(tmp)
    topic, cur, mode, block = None, None, None, []
    i = L0
    issues_free = []

    def nxt(j):
        while j < END and not lines[j]: j += 1
        return lines[j] if j < END else ''

    while i < END:
        t = lines[i]; i += 1
        if not t: continue
        kt = k(t)
        if RE_LET.match(t):
            mode = 'list'; continue
        m = RE_MUJ.match(kt)
        if m and not RE_BUL.match(nxt(i)) and any(e['heads'][0]['mk'] == int(m.group(1)) and not e['texts'] for e in block):
            cur = next(e for e in block if e['heads'][0]['mk'] == int(m.group(1)) and not e['texts'])
            cur['issues'].append('عنوان القاعدة في المصدر مكتوب «الموجز»')
            cur['texts'].append({'k': 1, 'paras': []}); mode = 'rule'; continue
        if m:
            cur = {'n': None, 'ch': ch_default, 'sess': None, 'sess_raw': None, 'panel': [], 'cit': None, 'heads': [{'k': 1, 'title': topic or '', 'sum': [], 'mk': int(m.group(1))}],
                   'texts': [], 'issues': [], 'line': i, 'part_sec': part_name, 'topic': topic, 'full': None}
            out.append(cur); block.append(cur); mode = 'sum'; continue
        m = RE_QA.match(kt)
        if m and RE_BUL.match(nxt(i)):
            q = int(m.group(1)); j = i; later = False
            while j < END:
                u = k(lines[j]); j += 1
                if not u or RE_BUL.match(u): continue
                later = bool(RE_QA.match(u)) and int(RE_QA.match(u).group(1)) == q; break
            if later:
                cur = {'n': None, 'ch': ch_default, 'sess': None, 'sess_raw': None, 'panel': [], 'cit': None, 'heads': [{'k': 1, 'title': topic or '', 'sum': [], 'mk': q}],
                       'texts': [], 'issues': ['عنوان الموجز في المصدر مكتوب «القاعدة»'], 'line': i, 'part_sec': part_name, 'topic': topic, 'full': None}
                out.append(cur); block.append(cur); mode = 'sum'; continue
        if m:
            q = int(m.group(1))
            cand = [e for e in block if not e['texts'] and e['heads'][0]['mk'] == q] or [e for e in block if not e['texts']]
            if not cand:
                issues_free.append(f'قاعدة ({q}) بلا موجز، سطر {i}'); mode = None; cur = None; continue
            cur = cand[0]
            if cur['heads'][0]['mk'] != q: cur['issues'].append(f'رقم القاعدة {q} ≠ رقم الموجز {cur["heads"][0]["mk"]}')
            cur['texts'].append({'k': 1, 'paras': []}); mode = 'rule'; continue
        if RE_CIT.match(t) and RE_DATE.search(t.translate(DIG) + ' ' + nxt(i).translate(DIG)) and cur is not None and mode in ('rule', 'after'):
            c = t
            while not c.rstrip().endswith(')') and i < END and lines[i] and not RE_MUJ.match(k(lines[i])):
                c += ' ' + lines[i]; i += 1
            if mode == 'after' or cur['cit']:
                cur.setdefault('cit_more', []).append(c)
            else:
                cur['cit'] = c
                ms = RE_DATE.search(c.translate(DIG))
                if ms: cur['sess'] = f"{int(ms.group(3)):04d}-{int(ms.group(2)):02d}-{int(ms.group(1)):02d}"; cur['sess_raw'] = 'جلسة ' + '/'.join(ms.groups())
            mode = 'after'; continue
        if re.match(r'^\*{3,}', t):
            mode = None; block = [e for e in block if not e['cit']] if False else block; continue
        if re.sub(r'^[-–•]\s*', '', kt).startswith(('وراجع', 'راجع', 'وارجع')):
            if cur is not None: cur.setdefault('see', []).append(t)
            continue
        if mode == 'list':
            if t.count('.') >= 2 or (is_topic(t) and RE_MUJ.match(k(nxt(i))) is None): continue
        # عنوان موضوع: سطر قصير يليه «الموجز (k)» أو أسطر موجز بلا عنوان
        if is_topic(t) and (RE_MUJ.match(k(nxt(i))) or (mode != 'sum' and RE_BUL.match(nxt(i)) and not RE_BUL.match(t))):
            if cur is not None and mode == 'rule' and not cur['cit']: cur['issues'].append('لا إسناد قبل الموضوع التالي')
            topic = t; mode = None; block = []; continue
        if mode is None and RE_BUL.match(t) and topic and not block:
            cur = {'n': None, 'ch': ch_default, 'sess': None, 'sess_raw': None, 'panel': [], 'cit': None, 'heads': [{'k': 1, 'title': topic, 'sum': [], 'mk': 1}],
                   'texts': [], 'issues': ['لا عنوان «الموجز» في المصدر'], 'line': i, 'part_sec': part_name, 'topic': topic, 'full': None}
            out.append(cur); block.append(cur); mode = 'sum'
        if mode == 'sum' and cur is not None:
            mb = RE_BUL.match(t)
            if mb: cur['heads'][0]['sum'].append(mb.group(1).strip())
            elif cur['heads'][0]['sum']: cur['heads'][0]['sum'][-1] += ' ' + t
            else: cur['heads'][0]['sum'].append(t)
            continue
        if mode == 'rule' and cur is not None:
            cur['texts'][-1]['paras'].append(t); continue
        if mode in (None, 'after') and is_topic(t):
            topic = t; mode = None; block = []; continue
        issues_free.append(f'سطر غير مفهوم ({i}): {t[:70]}')
    for r in out:
        if r.get('part_sec') == 'الهيئة العامة':
            # سطر الإسناد في آخر نص القاعدة (لا قوسين في رأس الحكم): يُنقل إلى الإسناد كما هو
            if not r['cit'] and r['texts'] and r['texts'][-1]['paras'] and RE_CIT.match(r['texts'][-1]['paras'][-1]) and RE_DATE.search(r['texts'][-1]['paras'][-1].translate(DIG)):
                r['cit'] = r['texts'][-1]['paras'].pop()
                for tx in r['texts']:
                    if tx['paras'] and tx['paras'][-1] == r['cit']: tx['paras'].pop()
                r['issues'] = [x for x in r['issues'] if x != 'لا إسناد']
            if r['n'] is None:
                r['n'] = 1; r['issues'] = [x for x in r['issues'] if x != 'لا رقم للحكم في ملف Word']
            continue
        if not r['cit']: r['issues'].append('لا إسناد')
        if not r['texts'] or not any(r['texts'][0]['paras']): r['issues'].append('لا نص قاعدة')
        if not r['heads'][0]['sum']: r['issues'].append('موجز فارغ')
        if r.get('cit_more'): r['cit'] = r['cit'] + ' ' + ' '.join(r['cit_more']) if r['cit'] else ' '.join(r['cit_more'])
    return out, issues_free


if __name__ == '__main__':
    import collections
    for p in sys.argv[1:]:
        R, free = parse(p, 'x', 'x')
        c = collections.Counter(x.split(' ≠')[0][:30] for r in R for x in r['issues'])
        ds = sorted(r['sess'] for r in R if r['sess'])
        print(os.path.basename(p), 'مبادئ', len(R), 'هيئة عامة', sum(1 for r in R if r.get('part_sec') == 'الهيئة العامة'), dict(c), 'غير مفهوم', len(free), ds[:1], ds[-1:])
        for f in free[:15]: print('   ', f)
