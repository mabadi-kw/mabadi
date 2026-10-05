#!/usr/bin/env python3
"""يقرأ من ملف PDF المطبوع للمجلة بداية كل حكم: رقم صفحة الملف، وتاريخ الجلسة، ورقم الحكم، وأرقام الطعن وسنته.
طبقة النص في المطبوع تُفسد الحروف العربية لكنها تحفظ الأرقام، فلا يُؤخذ منها إلا الأرقام."""
import re, sys, json, pymupdf
def scan(pdf):
    d = pymupdf.open(pdf); out = []
    for pi, p in enumerate(d):
        W = p.get_text('words')
        rows = {}
        for w in W:
            k = round(w[1] / 3)
            rows.setdefault(k, []).append(w)
        keys = sorted(rows)
        for ki, k in enumerate(keys):
            ws = sorted(rows[k], key=lambda w: -w[0]); txt = [re.sub(r'[\u064b-\u0652]', '', w[4]) for w in ws]; txt = [t for t in txt if t]
            if txt and txt[0] == 'جلسة' and len(txt) >= 5 and re.fullmatch(r'\d{1,2}', txt[1]) and re.fullmatch(r'\d{4}', txt[-1]):
                dd, mm, yy = int(txt[1]), int(txt[3]) if re.fullmatch(r'\d{1,2}', txt[3]) else None, int(txt[-1])
                out.append({'page': pi + 1, 'y': ws[0][1], 'sess': f'{yy:04d}-{mm:02d}-{dd:02d}' if mm else None, 'n': None, 'nums': None, 'cit_words': None})
            elif out and out[-1]['page'] == pi + 1 and out[-1]['nums'] is None and txt[0] == '(' and len(txt) > 3 and any(re.fullmatch(r'(19|20)\d\d', t) for t in txt) and out[-1]['n'] is not None:
                digs = [t for t in txt if re.fullmatch(r'\d+', t)]
                yrs = [t for t in digs if re.fullmatch(r'(19|20)\d\d', t)]
                out[-1]['nums'] = [t for t in digs if t not in yrs]; out[-1]['yr'] = yrs[-1] if yrs else None; out[-1]['cit_words'] = txt
            elif out and out[-1]['page'] == pi + 1 and out[-1]['n'] is None and txt[:1] == ['('] and len(txt) == 3 and re.fullmatch(r'\d+', txt[1]):
                out[-1]['n'] = int(txt[1])
    return out
if __name__ == '__main__':
    R = scan(sys.argv[1]); json.dump(R, open(sys.argv[2], 'w'), ensure_ascii=False)
    print(len(R), 'بلا إسناد', sum(1 for r in R if not r['nums']), 'بلا رقم', sum(1 for r in R if r['n'] is None))
