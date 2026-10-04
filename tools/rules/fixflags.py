#!/usr/bin/env python3
"""مرور ثانٍ على القواعد المعلَّمة في مجموعتي القواعد (QK5، QJ5) دون تخمين.
القاعدة نفسها (نصها وإسنادها) تتكرر في المجموعة تحت أكثر من موضوع، وتنشرها المجلة كذلك؛ فإذا وُجدت القاعدة بنصها
وبطعنها نفسه في موضع آخر رُبط موجزها فيه سليمًا، يُعتمد ذلك الموجز (منقولًا حرفيًا من ذلك الموضع، ويُذكر مصدره).
- «لا موجز مطابق»: يُستكمل الموجز من موضع آخر إن وُجد، وإلا تبقى القاعدة بنصها وحده (ويُرفع التعليم: النص سليم).
- «صلة ضعيفة» و«رقم مستنتج»: إن طابق الموجز موجز الموضع الآخر أُكِّد الربط؛ وإن خالفه استُبدل؛ وإن لم يوجد موضع آخر
  أُكِّد إن ورد الموجز نفسه لذلك الطعن في المجموعات الأخرى ولم يكن للطعن في المكتبة إلا قاعدة واحدة؛ وإلا يُزال الموجز
  وتبقى القاعدة بنصها، فلا يُعرض موجز في غير موضعه.
- «لا تاريخ جلسة»: التاريخ موجود في الإسناد بلا كلمة «جلسة»؛ يُقرأ منه (والإسناد يبقى كما هو).
الاستعمال: python3 fixflags.py  (يكتب data/QK5.json وQJ5.json وأجزاء data/rx، ويطبع تقريرًا)
"""
import os, re, json, glob, collections
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = json.load(open(os.path.join(ROOT, 'data', 'meta.json'), encoding='utf-8'))
CODES = ('QK5', 'QJ5')
D = {c: json.load(open(os.path.join(ROOT, 'data', c + '.json'), encoding='utf-8')) for c in M['order']}
RX = {}
for c in CODES:
    for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'rx', c + '-*.json'))):
        RX[os.path.basename(f)[:-5]] = json.load(open(f, encoding='utf-8'))
RULE = {i: t for d in RX.values() for i, t in d.items()}


def nz(s):
    s = re.sub(r'[ً-ْـ]', '', s); s = re.sub('[أإآ]', 'ا', s).replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'[^\w]', '', s)


def plist(x): return x['p'] if isinstance(x['p'], list) else [x['p']]


def full(x):
    """نص القاعدة كاملًا كما في الملف."""
    if x['col'] in CODES:
        r = RULE.get(x['id'], '')
        return r if x['src']['sn'] else '\n'.join(plist(x) + ([r] if r else []))
    return x.get('rule') or ''


def grams(s): return set(s[j:j + 5] for j in range(max(1, len(s) - 4)))


def jac(a, b):
    A, B = grams(a), grams(b); return len(A & B) / max(1, len(A | B))


def ks(x): return set(c['k'].split('@')[0] for c in x['c'] if c.get('k'))


BENIGN = 'لا موجز مطابق في الملف؛ عُرض نص القاعدة بدلًا منه'
WEAK = ('صلة الموجز بنص القاعدة ضعيفة', 'رُبطت القاعدة بموجزها برقم مستنتج')
byk = collections.defaultdict(list)
for c in M['order']:
    for x in D[c]:
        for k in ks(x): byk[k].append(x)
FULL = {}
def F(x):
    if x['id'] not in FULL: FULL[x['id']] = nz(full(x))
    return FULL[x['id']]

st = collections.Counter(); log = []
for c in CODES:
    for x in D[c]:
        rv = x.get('rv') or []
        if not rv: continue
        new = []
        for w in rv:
            if w == 'لا تاريخ جلسة في الإسناد':
                for cc in x['c']:
                    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{4})\)?\s*$', cc['raw'])
                    if m and '@' not in cc['k']:
                        cc['k'] += '@%s-%02d-%02d' % (m.group(3), int(m.group(2)), int(m.group(1)))
                        st['تاريخ الجلسة قُرئ من الإسناد'] += 1; break
                else: new.append(w)
                continue
            if w != BENIGN and not w.startswith(WEAK): new.append(w); continue
            # مواضع أخرى للقاعدة نفسها بالطعن نفسه، رُبط موجزها سليمًا
            me = F(x)
            cands = [y for k in ks(x) for y in byk[k] if y is not x and y['col'] in CODES + ('MQ31', 'MQ32', 'MQ33', 'MQ34')
                     and not any(v == BENIGN or v.startswith(WEAK) for v in (y.get('rv') or []))
                     and (y['col'] not in CODES or y['src']['sn'])]
            cands = [y for y in cands if F(y) == me or (len(me) > 40 and jac(F(y), me) >= 0.9)]
            cands.sort(key=lambda y: (y['col'] not in CODES, y['id']))
            hasP = x['src']['sn']
            if cands:
                y = cands[0]
                if hasP and nz(' '.join(plist(x))) == nz(' '.join(plist(y))):
                    st['أُكِّد الربط من موضع آخر'] += 1; log.append((x['id'], 'أُكِّد', y['id'])); continue
                body = full(x)
                x['p'] = list(plist(y)); x['src']['sn'] = True
                rk = next(k for k, d in RX.items() if x['id'] in d)
                RX[rk][x['id']] = body; RULE[x['id']] = body
                if y['col'] in CODES and y['src'].get('pfrom'):  # موجز y نفسه منقول من موضع ثالث
                    x['src']['pf'] = y['src'].get('pf'); x['src']['pfrom'] = y['src']['pfrom']
                else:
                    x['src']['pf'] = y['src']['file'] if y['col'] in CODES else None
                    x['src']['pfrom'] = y['id']
                x['src'] = {k: v for k, v in x['src'].items() if v is not None}
                x['fn'] = [f for f in x.get('fn', []) if not f.startswith('الموجز منقول')] + ['الموجز منقول حرفيًا من موضع آخر للقاعدة نفسها: ' + (
                    'ملف «%s» من المجموعة' % os.path.splitext(os.path.basename(x['src']['pf']))[0] if x['src'].get('pf') else (y.get('fn') or [y['id']])[0])]
                k2 = 'استُكمل الموجز من موضع آخر' if not hasP else 'استُبدل الموجز بموجز الموضع الآخر'
                st[k2] += 1; log.append((x['id'], k2, y['id'])); FULL.pop(x['id'], None); continue
            if not hasP:
                st['بلا موجز في المصدر؛ النص وحده (رُفع التعليم)'] += 1; continue
            # تأكيد من المجموعات الأخرى: الموجز نفسه لهذا الطعن، وللطعن قاعدة واحدة في المكتبة
            mp = nz(' '.join(plist(x)))
            same = [y for k in ks(x) for y in byk[k] if y is not x and nz(' '.join(plist(y))) == mp]
            rules = set(F(y) for k in ks(x) for y in byk[k] if y['col'] in CODES and F(y))
            if same and len(rules) == 1:
                st['أُكِّد الربط من المجموعات الأخرى'] += 1; log.append((x['id'], 'أُكِّد', same[0]['id'])); continue
            # إزالة الموجز غير المؤكد
            body = full(x)
            x['src']['sn'] = False
            parts = body.split('\n'); x['p'] = [parts[0]]
            rk = next(k for k, d in RX.items() if x['id'] in d)
            RX[rk][x['id']] = '\n'.join(parts[1:]); RULE[x['id']] = RX[rk][x['id']]
            x['fn'] = [f for f in x.get('fn', []) if not f.startswith('الموجز منقول')]
            st['أُزيل موجز غير مؤكد؛ النص وحده'] += 1; log.append((x['id'], 'أُزيل', None)); FULL.pop(x['id'], None)
        x['rv'] = new
        if new: st['باقٍ للمراجعة'] += 1
for c in CODES:
    s = json.dumps(D[c], ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data', c + '.json'), 'w', encoding='utf-8').write(s)
    M['cols'][c]['bytes'] = len(s.encode())
for k, d in RX.items():
    json.dump(d, open(os.path.join(ROOT, 'data', 'rx', k + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump(M, open(os.path.join(ROOT, 'data', 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
for k, v in st.most_common(): print(v, k)
json.dump(log, open(os.path.join(ROOT, 'tools', 'rules', 'fixflags.log.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
