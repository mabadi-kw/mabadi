#!/usr/bin/env python3
"""تهذيب مخرَج run.py قبل build.py (السنوات 35–40 وما يشبهها):
1) يحذف «قوالب» فارغة في آخر بعض الملفات (رأس حكم نموذجي بلا مبدأ: نص القاعدة أقل من 30 حرفًا وموجزه كلمة).
2) حكم بلا نصوص قواعد وعناوينه الأخيرة نصوص قواعد في حقيقتها (رقم يتكرر، بلا موجز، وتبدأ بعبارة قاعدة): تُنقل إلى النصوص كما هي.
لا يُغيَّر حرف من النص.
الاستعمال: python3 prep.py <in.json> <out.json>"""
import sys, json, re
RULE_START = re.compile(r'^(من المقرر|المقرر|النص في|إذ كان|لما كان|مؤدى|مفاد|إن |ان |المادة|النص)')
R = json.load(open(sys.argv[1], encoding='utf-8'))
drop = fix = 0
for s in R:
    keep = []
    for r in s['rulings']:
        tl = sum(len(' '.join(t['paras'])) for t in r['texts'])
        sl = sum(len(' '.join(h['sum'])) for h in r['heads'])
        if r['texts'] and tl < 30 and sl < 30:
            drop += 1; continue
        if not r['texts'] and len(r['heads']) > 1:
            j = next((j for j in range(1, len(r['heads'])) if not r['heads'][j]['sum'] and RULE_START.match(r['heads'][j]['title'])), None)
            if j is not None:
                r['texts'] = [{'k': h['k'], 'paras': [h['title']]} for h in r['heads'][j:]]
                r['heads'] = r['heads'][:j]
                r['issues'] = [x for x in r['issues'] if not x.startswith(('ترقيم العناوين', 'عدد العناوين', 'عنوان'))] + ['نصوص القواعد في المصدر بلا فصل عن العناوين (رقم القاعدة الأولى غائب أو مكرر)']
                fix += 1
        keep.append(r)
    s['rulings'] = keep
json.dump(R, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('قوالب محذوفة', drop, 'أحكام أُصلحت', fix, file=sys.stderr)
