#!/usr/bin/env python3
"""محرك الخصوصية — مكتبة مبادئ التمييز.
يفحص نص قاعدة/مبدأ ويعيد ما فيه من بيانات شخصية محتملة. القاعدة: الاستبعاد لا الحجب.

scan(text, names=None) -> [Finding]
  Finding = {"kind": ..., "match": ..., "level": "block"|"review"}
  names: أسماء أطراف الحكم نفسه (اختياري) — تُطابق كلمتين فأكثر منها.

الطبقات:
  party     أسماء أطراف الحكم نفسه (إن مُرّرت)
  name      اسمان متتاليان من معجم الأسماء (اسم أول + اسم أول/عائلة/عبد…)، أو اسم عائلة بعد اسم أول
  role      صفة يليها اسم: الشاهد/ المرحوم/ المجني عليه/ المتهم/ السيد/ الطاعن/ …
  paren     أسماء بين أقواس: (فاطمة، حسين)
  ident     رقم مدني، هاتف، لوحة، حساب/آيبان، عنوان، بريد
  owner     «لصاحبها/لمالكها» يليه اسم (مؤسسة فردية)
  company   اسم شركة خاصة (مراجعة لا استبعاد)
المعجم العام في names_first.txt وnames_family.txt؛ ويمكن تمرير معجم محلي إضافي (من ديباجات الأحكام) عبر load_extra()
— والمعجم المحلي لا يُرفع إلى المستودع أبدًا لأنه أسماء حقيقية."""
import os, re
HERE = os.path.dirname(os.path.abspath(__file__))
def _words(fn):
    p = os.path.join(HERE, fn)
    if not os.path.exists(p): return set()
    return {w for l in open(p, encoding='utf-8') if not l.startswith('#') for w in l.split()}
def _lines(fn):
    p = os.path.join(HERE, fn)
    return [l.strip() for l in open(p, encoding='utf-8') if l.strip() and not l.startswith('#')] if os.path.exists(p) else []
TR = {ord(a): str(i) for i, a in enumerate('٠١٢٣٤٥٦٧٨٩')}
TR.update({ord(a): str(i) for i, a in enumerate('۰۱۲۳۴۵۶۷۸۹')})
def norm(s):
    s = s.translate(TR).replace('ـ', '')
    s = re.sub(r'[ً-ْ]', '', s)
    return s
FIRST = {norm(w) for w in _words('names_first.txt')}
FAMILY = {norm(w) for w in _words('names_family.txt')}
ALLOW = [norm(x) for x in _lines('allow_phrases.txt')]
# كلمات لا تُعد اسمًا حتى لو وردت في المعجم، إن جاء بعدها ما يدل على معنى قانوني
AMBIG = {'عادل', 'كريم', 'سعيد', 'جميل', 'نور', 'حياة', 'أمين', 'امين', 'فاضل', 'صالح', 'سالم', 'مبارك', 'منصور', 'رشيد', 'راشد',
         'حامد', 'حمد', 'كامل', 'عزيز', 'هادي', 'ناصر', 'شريف', 'عامر', 'غانم', 'ظاهر', 'مطلق', 'مانع', 'فلاح', 'فرج', 'وفاء', 'أمل', 'امل',
         'آمنة', 'امنة', 'هدى', 'منى', 'ندى', 'سلوى', 'ضحى', 'فجر', 'شروق', 'صفاء', 'سهام', 'رحاب', 'نوال', 'حنان', 'إيمان', 'ايمان',
         'عفاف', 'دعاء', 'بشاير', 'تهاني', 'ابتسام', 'سعاد', 'منال', 'مها', 'زهرة', 'شوق', 'ريم', 'هبة', 'جمال', 'كمال', 'نبيل', 'نجيب',
         'طلال', 'وسام', 'فواز', 'فارس', 'قاسم', 'خليفة', 'خليل', 'صقر', 'سيف', 'بدر', 'سلطان', 'نايف', 'رائد', 'سامي', 'هاني', 'عباس',
         'مهدي', 'يحيى', 'حسن', 'حسين', 'علي', 'عيسى', 'موسى', 'يوسف', 'سليمان', 'داود', 'محمود', 'مصطفى', 'إبراهيم', 'ابراهيم', 'أحمد', 'احمد', 'أسماء', 'اسماء', 'يزيد', 'وفاء', 'حصة', 'طلق', 'ظاهر', 'مانع', 'كامل'}
EXTRA = set()
def load_extra(words):
    """معجم محلي (من ديباجات الأحكام على جهاز المستخدم) — لا يُحفظ في المستودع."""
    EXTRA.update(norm(w) for w in words if len(w) >= 3)
AR = r'[ء-ي]'
STOPW = {'على','علي','في','من','عن','الى','إلى','ان','أن','بأن','وأن','قد','لم','لا','ما','الذي','التي','عليه','عليها','به','بها','له','لها','بعد','قبل','حيث','كان','وكان','بين','غير','كل'}
TOK = re.compile(AR + '+')
def _isfirst(w): return w in FIRST or w in EXTRA
def _isname(w): return w in FIRST or w in FAMILY or w in EXTRA or w.startswith('عبد') and len(w) > 4
ROLE = re.compile(
    r'(?:الشاهد(?:ة|ين|ان)?|شاهد(?:ة)?\s+الإثبات|المرحوم(?:ة)?|المتوفى|المتوفاة|المجني\s+علي(?:ه|ها|هم)|المتهم(?:ة|ين)?|المحكوم\s+علي(?:ه|ها)|'
    r'السيد(?:ة)?|الشيخ(?:ة)?|المدعو(?:ة)?|المحامي(?:ة)?|القاصر(?:ة)?|الطفل(?:ة)?|المحضون(?:ة)?|'
    r'(?:ال)?طاعن(?:ة)?|المطعون\s+ضد(?:ه|ها|هم)|المستأنف(?:ة)?(?:\s+ضد(?:ه|ها))?|المدعي(?:ة)?(?:\s+علي(?:ه|ها))?|الضابط|الملازم|النقيب|الرائد|المقدم|العقيد|الوكيل|الرقيب|العريف)'
    r'(?:\s+(?:الأول[ىي]?|الثاني(?:ة)?|الثالث(?:ة)?|الرابع(?:ة)?|أولاً?|ثانياً?))?\s*[/:]?\s*(' + AR + r'+(?:\s+' + AR + r'+){0,3})')
PAREN = re.compile(r'\(\s*(' + AR + r'{2,}(?:\s*[،,\-–]\s*' + AR + r'{2,}){1,5})\s*\)')
IDENT = [
    ('ident', re.compile(r'(?<!\d)[23]\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{5}(?!\d)'), 'رقم مدني'),
    ('ident', re.compile(r'KW\d{2}[A-Z]{4}\d{10,22}', re.I), 'آيبان'),
    ('ident', re.compile(r'(?:هاتف|تلفون|تليفون|جوال|نقال|الهاتف|رقم\s+الهاتف)(?:ه|ها|هم)?\s*(?:رقم)?\s*:?\s*\+?(?:965)?\s*[2569]\d{7}(?!\d)'), 'هاتف'),
    ('ident', re.compile(r'(?:لوحة|لوحات|اللوحة|رقم\s+المركبة)\s*(?:رقم|المعدنية)?\s*:?\s*\d{1,3}\s*[/\-]\s*\d{3,6}'), 'لوحة مركبة'),
    ('ident', re.compile(r'(?:رقم\s+(?:ال)?حساب|حساب\s+رقم)\s*:?\s*\d{6,}'), 'رقم حساب'),
    ('ident', re.compile(r'قطعة\s*\d+\s*[،,]?\s*(?:شارع|جادة)\s*\d+'), 'عنوان'),
    ('ident', re.compile(r'منزل\s+رقم\s*\d+'), 'عنوان'),
    ('ident', re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+'), 'بريد'),
]
OWNER = re.compile(r'(?:لصاحبها|لصاحبه|لمالكها|المملوكة\s+ل)\s*/?\s*(' + AR + r'+(?:\s+' + AR + r'+){1,3})')
COMPANY = re.compile(r'شركة\s+(?!ال(?:مساهمة|تضامن|توصية|محاصة|قابضة|واحدة|ذات|شخص|طاعنة|مطعون|مدعية|مدعى|مستأنفة)\b)(' + AR + r'+(?:\s+' + AR + r'+){0,4})\s+(?:ذ\.?\s?م\.?\s?م|ش\.?\s?م\.?\s?ك|للتجارة|للمقاولات|العقارية|القابضة)')
_ALLOWRX = [re.compile(r'(?<![\u0621-\u064A])' + re.escape(a).replace(r'\ ', r'\s+') + r'(?![\u0621-\u064A])') for a in ALLOW if ' ' in a]
def _allowed(s):
    return any(r.search(s) for r in _ALLOWRX)
def scan(text, names=None):
    t = norm(text); out = []
    def add(kind, m, level='block'):
        if not _allowed(m): out.append({'kind': kind, 'match': m.strip(), 'level': level})
    # 1) أسماء أطراف الحكم نفسه
    if names:
        tk = TOK.findall(t); pairs = {a + ' ' + b for a, b in zip(tk, tk[1:])}
        for n in names:
            nt = TOK.findall(norm(n))
            for a, b in zip(nt, nt[1:]):
                if len(a) >= 3 and len(b) >= 3 and a + ' ' + b in pairs: add('party', a + ' ' + b)
    # 2) اسمان متتاليان من المعجم
    toks = list(TOK.finditer(t))
    for i in range(len(toks) - 1):
        a, b = toks[i].group(), toks[i + 1].group()
        if t[toks[i].end():toks[i + 1].start()].strip(' '):   # فاصل غير المسافة (فاصلة، نقطة…) يقطع الاسم
            continue
        if _isfirst(a) and _isname(b):
            # الاسم المزدوج الغامض (عادل محمد) يُعد اسمًا؛ «عادل» وحده لا
            if a in AMBIG and b in AMBIG and not (i + 2 < len(toks) and _isname(toks[i + 2].group())):
                continue
            add('name', a + ' ' + b)
        elif a.startswith('عبد') and len(a) > 4 and (b in FAMILY or _isfirst(b)):
            add('name', a + ' ' + b)
    # 3) صفة يليها اسم
    for m in ROLE.finditer(t):
        nxt = TOK.findall(m.group(1))
        if not nxt: continue
        slash = '/' in m.group(0) or ':' in m.group(0)
        strong = (_isfirst(nxt[0]) and nxt[0] not in AMBIG) or nxt[0] in EXTRA
        double = len(nxt) > 1 and (_isfirst(nxt[0]) or nxt[0] in FAMILY) and _isname(nxt[1])
        if double or (strong and (slash or len(nxt) > 1 and nxt[1] not in STOPW)) or (slash and _isfirst(nxt[0])):
            add('role', m.group(0))
    # 4) أسماء بين أقواس
    for m in PAREN.finditer(t):
        parts = [p.strip() for p in re.split(r'[،,\-–]', m.group(1))]
        if sum(1 for p in parts if _isfirst(p) or p in EXTRA) >= 1 and all(len(TOK.findall(p)) <= 3 for p in parts):
            add('paren', m.group(0))
    # 5) بيانات معرِّفة
    for kind, rx, lab in IDENT:
        for m in rx.finditer(t): add(kind, lab + ': ' + m.group(0))
    # 6) مؤسسة فردية
    for m in OWNER.finditer(t):
        nxt = TOK.findall(m.group(1))
        if nxt and (_isfirst(nxt[0]) or nxt[0] in EXTRA): add('owner', m.group(0))
    # 7) شركة خاصة باسمها (مراجعة)
    for m in COMPANY.finditer(t): add('company', m.group(0), 'review')
    # إزالة التكرار
    seen = set(); res = []
    for f in out:
        k = (f['kind'], f['match'])
        if k not in seen: seen.add(k); res.append(f)
    return res
def verdict(findings):
    if any(f['level'] == 'block' for f in findings): return 'block'
    if findings: return 'review'
    return 'pass'
if __name__ == '__main__':
    import sys, json
    for line in sys.stdin:
        print(json.dumps(scan(line), ensure_ascii=False))
