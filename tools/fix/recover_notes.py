#!/usr/bin/env python3
"""استرجاع حواشي طبعة وزارة العدل التي أغفلها المحلل القديم (علامة «(*)» في سطر مستقل قبل عنوان المادة أو داخل نصها).
يقرأ النص المفكوك لصفحات الطبعة (leg/txt/<vol>.json) وقوائم الإعداد، ويضيف الحاشية حرفيًا إلى المادة التي تحمل علامتها
— فقط إن كانت المادة بلا حواشٍ، وكانت الحاشية غير موجودة أصلًا في القانون. يكتب تقريرًا بما أضاف.
الاستعمال: python3 tools/fix/recover_notes.py <مجلد leg>
"""
import json, os, re, sys, importlib.util
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
LAWS = os.path.join(ROOT, 'data', 'laws')
LEG = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/leg'
AR = '٠١٢٣٤٥٦٧٨٩'
w2 = lambda s: s.translate(str.maketrans(AR, '0123456789'))
LABEL = re.compile(r'^\(?\s*\**\s*\(?\s*(?:ال)?ماد[ةه]\s*\(?\s*([٠-٩0-9]+)\s*\)?\s*(مكرر[^\s*()]*\s*(?:\(?\s*[٠-٩أ-ي]\s*\)?)?)?\s*\)?\s*(\(?\*+\)?)?\s*$')
MARK = re.compile(r'^\s*\(?\s*(\*+)\s*\)?\s*$')
FOOT = re.compile(r'^\s*[٠-٩0-9]?\s*\(?\s*(\*+)\s*\)?\s*(.*)$')


def cfgs():
    out = []
    spec = importlib.util.spec_from_file_location('c1', os.path.join(LEG, 'cfgs.py'))
    m = importlib.util.module_from_spec(spec)
    sys.path.insert(0, LEG)
    try:
        spec.loader.exec_module(m)
        out += list(getattr(m, 'CFG', []))
    except Exception as e:
        print('cfgs.py:', e)
    p = os.path.join(LEG, 'cfgs2.json')
    if os.path.exists(p):
        out += json.load(open(p))
    return out


def main():
    TX = {}
    report = []
    for c in cfgs():
        f = os.path.join(LAWS, c['id'] + '.json')
        if not os.path.exists(f) or 'vol' not in c:
            continue
        v = c['vol']
        if v not in TX:
            TX[v] = {p['p']: p for p in json.load(open(os.path.join(LEG, 'txt', v + '.json')))}
        pages = list(c['pages'])
        d = json.load(open(f))
        have = set(n for a in d['articles'] for n in (a.get('notes') or []))
        cur = None   # (n, bis) للمادة الجارية
        assigned = {}
        for pg in pages:
            P = TX[v].get(pg)
            if not P:
                continue
            ls = sorted(P['lines'], key=lambda l: (round(l['y']), -l.get('x1', 0)))
            body = [l for l in ls if l['sz'] >= 13 and not re.match(r'^\s*-?\s*[٠-٩0-9]+\s*-?\s*$', l['t'])]
            last = max([l['y'] for l in body if l['sz'] >= 13.5] or [0])
            # الحواشي أسفل الصفحة
            foots, fc, foot_seq = {}, None, []
            for l in ls:
                if l['sz'] <= 11 and l['y'] > last + 3:
                    m = FOOT.match(l['t'])
                    if m and m.group(1):
                        fc = len(foot_seq)
                        foot_seq.append([m.group(2)] if m.group(2) else [])
                    elif fc is not None:
                        foot_seq[fc].append(l['t'])
            foots = {k: ' '.join(x).strip() for k, x in foots.items() if ' '.join(x).strip()}
            foot_list = [' '.join(x).strip() for x in foot_seq if ' '.join(x).strip()]
            # تُقبل الحاشية فقط إن ذكرت رقم المادة صراحة («م/٨»، «المادة (٩)»، «المادتان ٥٠ و٥١»): الإسناد بالنص لا بموضع العلامة
            for t in foot_list:
                if 'نشر' in t[:6] or t in have or 'راجع هامش' in t:
                    continue
                if not re.match(r'^\s*(?:و\s*\(\*+\)\s*)?(استبدل|عدل|أضيف|اضيف|ألغي|الغي|معدل|مضاف|ملغا)', t):
                    continue
                nums = set()
                head = t[:60]
                for m in re.finditer(r'(?:م\s*/\s*|المادة\s*\(?\s*|المادتين\s*\(?\s*|المادتان\s*\(?\s*)([٠-٩0-9]+)(?:\s*\)?\s*(?:و|،|,)\s*\(?\s*([٠-٩0-9]+))?', head):
                    if re.match(r'\s*\)?\s*من\s+(?:القانون|المرسوم|مواد)', head[m.end():m.end() + 20]):
                        continue
                    nums.add(int(w2(m.group(1))))
                    if m.group(2):
                        nums.add(int(w2(m.group(2))))
                for n in nums:
                    assigned.setdefault((n, ''), [])
                    if t not in assigned[(n, '')]:
                        assigned[(n, '')].append(t)
        n_add = 0
        for (n, bis), notes in assigned.items():
            cands = [a for a in d['articles'] if a['n'] == n and not a.get('issue') and (bool(a.get('bis')) == bool(bis))]
            if len(cands) != 1 or cands[0].get('notes'):
                continue
            cands[0]['notes'] = notes
            cands[0]['notes_recovered'] = True
            n_add += 1
            report.append(f"{c['id']}\t{cands[0]['label']}\t{' | '.join(notes)[:160]}")
        if n_add:
            with open(f, 'w', encoding='utf-8') as fh:
                json.dump(d, fh, ensure_ascii=False, separators=(',', ':'))
    rp = os.path.join(ROOT, 'tools', 'fix', 'recovered_notes.tsv')
    with open(rp, 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(report) + '\n')
    print('حواشٍ مسترجعة:', len(report), '— التقرير:', os.path.relpath(rp, ROOT))


if __name__ == '__main__':
    main()
