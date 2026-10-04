#!/usr/bin/env python3
"""تحليل أحكام التمييز (نص UTF-8 مستخرج من .doc) إلى JSON مهيكل.
parse.py <txt_dir> <map.json> <out.json> [year]
- بيانات الحكم (رقم الطعن، السنة، تاريخ الجلسة، الدائرة) تُقرأ من النص، ويُتحقق من الرقم بمطابقته لاسم الملف.
- أسماء الأشخاص والشركات (الأطراف) تُحجب؛ تبقى الجهات الحكومية والصفات.
- فقرات القاعدة تُنقل حرفيًا (بعد حجب الأسماء فقط)."""
import sys,re,json,os,glob,collections
TR={ord(a):str(i) for i,a in enumerate('٠١٢٣٤٥٦٧٨٩')}
CIRC={'الدائرة الإدارية':'إداري','الدائرة التجارية':'تجاري','الدائرة الجزائية':'جزائي','الدائرة العمالية':'عمالي','الدائرة المدنية':'مدني','دائرة الأحوال الشخصية':'أحوال شخصية'}
GOV=re.compile(r'بصفته|بصفتها|بصفتهم|وزارة|وزير|وكيل|مدير|رئيس|الهيئة|المؤسسة العامة|الإدارة العامة|ادارة|إدارة|بنك الكويت المركزي|النيابة|محافظ|بلدية|الدولة|الحكومة|المجلس|الجهاز|الديوان|الصندوق|الجامعة|الكلية|اللجنة|المحكمة|المصلحة|مجلس|الأمين العام|المدير العام')
TITLE=re.compile(r'^(?:السيد(?:ة)?|الشيخ(?:ة)?|الأستاذ(?:ة)?|الدكتور(?:ة)?|د\.|المدعو|المدعوة|المتهم|السادة|الأخ|الأخت)\s*/?\s*')
def nd(s): return s.translate(TR)
def nt(s): return s.replace('\u0640','')
def lines(t):
    t=t.replace('﻿','').replace('\r','')
    return [re.sub(r'[ \t ‏‎]+',' ',l).strip() for l in t.split('\n')]
def split_parties(blk):
    blk=re.sub(r'\s+',' ',blk).replace('|',' | ')
    parts=re.split(r'\||(?:^|\s)\d{1,2}\s*[-–._)]\s*|\s+و(?=\s*(?:شركة|مؤسسة|السيد|الشيخ))|[،,]\s*(?=(?:شركة|مؤسسة|السيد|الشيخ))',blk)
    out=[]
    for p in parts:
        p=p.strip(' .،-–:').strip()
        if len(p)>2: out.append(p)
    return out
GOVHEAD=re.compile(r'^(?:وزير|وكيل|مدير|رئيس|الهيئة|المؤسسة|الإدارة|إدارة|بنك الكويت المركزي|النيابة|محافظ|بلدية|الممثل القانوني|الدولة|الحكومة|المجلس|مجلس|الجهاز|الديوان|الصندوق|الجامعة|الكلية|اللجنة|المحكمة|المصلحة|الأمين العام|المدير العام|الوزير|المدعي العام|رئيس|مجلس الوزراء)')
def party_names(blk):
    names=set()
    for p in split_parties(blk):
        p=TITLE.sub('',p).strip(' .،/')
        p=re.sub(r'^الممثل القانوني ل','',p).strip()
        if GOVHEAD.match(p): continue
        p=re.sub(r'\s*(?:ويمثلها|ويمثله|لصاحبها|لصاحبه|المحامي|بصفته|بصفتها|بصفتهم|عن نفسه|عن نفسها|وبصفته|وبصفتها|وكيلا|وكيلاً|ومن|ويمثل|\(|ومؤسس|مدعي|مدعيه|مدعية|–|-\s).*$','',p)
        p=re.sub(r'^(?:ال)?(?:طاعن|مطعون)[^ ]*\s*','',p)
        q=TITLE.sub('',p).strip(' .،/')
        q=q.strip(' .:،؛')
        if re.search(r'المرفوع|ضد|آخرهما|ثانيهما|أولهما|:|صاحب العمل|^جمعية$|^اتحاد$|^كل من$',q): continue
        if len(q)>=4: names.add(q)
    return names
def name_variants(n):
    n=n.strip(' .:،؛'); v={n}
    tk=n.split()
    if len(tk)>=3:
        v.add(' '.join(tk[:2])); v.add(' '.join(tk[-2:]))
        if len(tk)>=4: v.add(' '.join(tk[:3]))
    return {x for x in v if len(x)>=5}
COMMON=set()
TITLED=re.compile(r'((?:المدعو|المدعوة|السيد|السيدة|الشيخ|الشيخة)\s*/\s*|(?:المدعو|المدعوة)\s+)((?:[\u0621-\u064a]+\s+){1,3}[\u0621-\u064a]+)')
def redact(text,vars_):
    n=0
    vars_={v for v in vars_ if not any(w in COMMON for w in v.split())}|{v for v in vars_ if len(v.split())>=4}
    text,c=TITLED.subn(lambda m:m.group(1)+'[…]',text); n+=c
    for x in sorted(vars_,key=len,reverse=True):
        pat=r'(?<![ء-ي])([وبلكفس]?)'+re.escape(x).replace(r'\ ',r'\s+')+r'(?![ء-ي])'
        text,c=re.subn(pat,lambda m:m.group(1)+'[…]',text); n+=c
    return text,n
APP=re.compile(r'(?:المقيد(?:ين|ة|ان)?|والمقيد(?:ين|ة|ان)?|الطعن(?:ين|ان)?)\s+(?:ب?ال?جدول\s+)?(?:برقم(?:ي|ين)?|بأرقام|رقم(?:ي|ين)?)\s*:?\s*-?\s*([^\n]{0,90})')
APP2=re.compile(r'(?:قرار|حكم)?\s*في\s+الطعن(?:ين)?\s+()(\d[^\n]{0,60})')
def pairs(raw):
    s=nd(raw); out=[]
    for m in re.finditer(r'((?:\d+\s*[-–/،,و]\s*)*\d+)\s*(?:لسنة\s*/?|/)\s*(\d{4})',s):
        ns=[int(n) for n in re.findall(r'\d+',m.group(1))]
        if len(ns)>1 and ns[-1]>=1900: ns=ns[:-1]   # «1677/1705/2013»
        for n in ns: out.append((n,int(m.group(2))))
    return out
def appeals(raw):
    """يعيد (قائمة أرقام, السنة, نوع) من سطر «المقيد بالجدول برقم ...»"""
    if not raw: return None
    s=nd(raw)
    m=re.search(r'(\d{4})\s*[/ ]*(?:جزائ|تجار|مدني|عمال|إدار|ادار|أحوال|احوال)|(?:لسنة|/)\s*(\d{4})',s)
    yr=None
    y=re.findall(r'(?:لسنة|/)\s*(\d{4})',s)
    if y: yr=int(y[-1])
    else:
        m=re.findall(r'\b(20\d\d|19\d\d)\b',s)
        yr=int(m[-1]) if m else None
    head=re.split(r'(?:لسنة|/\s*\d{4}|\s\d{4}\s)',s)[0]
    nums=[int(x) for x in re.findall(r'\d+',head) if int(x)<100000]
    # حالة «140، 160 / 2013»
    if not nums:
        nums=[int(x) for x in re.findall(r'\d+',s) if int(x)<100000 and int(x)!=yr]
    return nums,yr
def file_code(fname):
    b=os.path.basename(fname); m=re.match(r'^(\d{9,12})',b)
    if not m: return None
    c=m.group(1)
    # …<yy><nnnn>
    return int(c[-6:-4]),int(c[-4:])
def parse_one(t,circ_dir,fname):
    L=lines(t); T=nt(nd('\n'.join(L))); r={'file':fname}
    r['circuit_dir']=CIRC.get(circ_dir,circ_dir)
    head=T[:3500]
    m=re.search(r'(الدائرة[^\n]{0,40}|دائرة[^\n]{0,40}|الهيئة[^\n]{0,40}|غرفة[^\n]{0,30})',head[head.find('التمييز'):] if 'التمييز' in head else head)
    r['circuit_label']=m.group(1).strip() if m else None
    lab=r['circuit_label'] or ''
    c=None
    for kw,v in (('الجزائية','جزائي'),('التجارية','تجاري'),('العمالية','عمالي'),('الإدارية','إداري'),('الادارية','إداري'),('المدنية','مدني'),('الأحوال','أحوال شخصية'),('الاحوال','أحوال شخصية'),('الشخصية','أحوال شخصية')):
        if kw in lab: c=v;break
    r['circuit']=c or r['circuit_dir']
    r.setdefault('flags',[])
    d=re.search(r'الموافق?\s*:?\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})',head)
    r['date']=None
    if d:
        dd,mm,yy=map(int,d.groups())
        if 1<=mm<=12 and 1<=dd<=31 and 2010<=yy<=2016: r['date']=f'{yy:04d}-{mm:02d}-{dd:02d}'
    _hd=T[:T.find('المحكم',T.find('المرفوع')+1)+10] if T.find('المرفوع')>0 else T[:3500]
    am=APP.search(_hd) or APP.search(T[:3500]) or APP2.search(T[:2500])
    pr=pairs(am.group(am.lastindex or 1)) if am else []
    ap=([p[0] for p in pr],pr[-1][1]) if pr else (appeals(am.group(am.lastindex or 1)) if am else None)
    r['appeal_raw']=am.group(0).strip() if am else None
    fc=file_code(fname)
    r['appeal']=None;r['appeal_src']=None;flags=[]
    if ap and ap[0] and ap[1]:
        r['appeal']={'nums':ap[0],'year':ap[1],'pairs':pr or [(n,ap[1]) for n in ap[0]]}; r['appeal_src']='text'
        if fc and not any(n==fc[1] for n,y in r['appeal']['pairs']): flags.append('رقم الطعن في النص لا يطابق اسم الملف')
    elif fc:
        flags.append('رقم الطعن من اسم الملف (غير مذكور في النص)')
        yy=2000+fc[0]; r['appeal']={'nums':[fc[1]],'year':yy}; r['appeal_src']='filename'
    else: flags.append('رقم الطعن غير معروف')
    if not r['date']: flags.append('تاريخ الجلسة غير مقروء')
    # الأطراف
    i=T.find('المرفوع')
    if i<0: i=T.find('الطعن بالتمييز')
    j=T.find('المحكم',i) if i>=0 else -1
    blk=T[i:j] if i>=0 and j>i else ''
    mcut=re.search(r'والمقيد|الوقائع|\n\s*\"?\s*المحكم',blk)
    if mcut: blk=blk[:mcut.start()]
    blk=re.sub(r'و?المرفوع(?:ين)?\s*(?:أولهما|ثانيهما|آخرهما|ثالثهما|رابعهما)?\s*من\s*:?-?','|',blk)
    blk=re.sub(r'والمقيد[^\n]*','',blk)
    blk=re.sub(r'(?m)^[\s"“”]*ضد(?:\s+كل\s+من)?[\s"“”]*$','|',blk)
    names=party_names(blk)
    vars_=set()
    for n in names: vars_|=name_variants(n)
    # أسماء بين قوسين في جسم الحكم («( فيكتور جورج لويس )»)
    for pm in re.finditer(r'\(\s*([ء-ي]+(?:\s+[ء-ي]+){1,3})\s*\)',T):
        toks=pm.group(1).split()
        if all(w not in COMMON for w in toks): names.add(pm.group(1)); vars_|=name_variants(pm.group(1))
    r['n_names']=len(names)
    # الجسم: من «المحكمة» بعد الأطراف إلى «لذلك»
    k=T.find('المحكم',j) if j>0 else -1
    body=T[k:] if k>=0 else T
    body=re.sub(r'^المحكمـ*ة\s*\n','',body)
    cut=re.search(r'\n\s*لـ+ذلـ+ك\s*\n',body)
    main=body[:cut.start()] if cut else body
    disp=body[cut.end():] if cut else ''
    r['_main']=main;r['_disp']=disp;r['_vars']=vars_
    if not names: flags.append('لم تُستخرج أسماء الأطراف')
    r['flags']=r['flags']+flags
    if r['circuit']!=r['circuit_dir']: r['flags'].append('الدائرة في النص تخالف المجلد: '+r['circuit_dir'])
    return r
# فقرات القاعدة
START=re.compile(r'(?:^|[\s،,؛;:(\-–])((?:و?من\s+)?(?:ال)?مقرر(?![ةًاىهـ])(?=\s*(?:[،,\-–—]|في\s+قضاء|أن|ان|إن|طبقا|طبقاً|وفقا|وفقاً|قانونا|قانوناً|بنص|بمقتضى|بحكم|على\s+ما)))')
APPL=re.compile(r'\s(?:لما\s+كان\s+ذلك|ولما\s+كان\s+ذلك|لما\s+كان\s+الثابت|ولما\s+كان\s+الثابت|وكان\s+الثابت|وكان\s+الحكم|لما\s+كان\s+الحكم|ولما\s+كان\s+الحكم|وكان\s+البين|وكان\s+الواقع|وكان\s+المطعون|وكان\s+الطاعن|وكان\s+ذلك|وبما\s+أن|وإذ\s+|وحيث\s+إن\s+الحكم|وحيث\s+إنه\s+لما)')
def open_quote(x): return x.count('"')%2==1 or x.count('“')>x.count('”')
def rules(main):
    paras=[p.strip() for p in main.split('\n') if p.strip()]
    out=[];i=0
    while i<len(paras):
        p=paras[i]; m=START.search(p)
        if not m or len(p)<60: i+=1; continue
        sub=p[m.start(1):]; j=i
        # ضمّ الفقرات التالية إن انتهى النص بنقطتين أو بقي اقتباس مفتوح
        while (sub.rstrip().endswith(':') or open_quote(sub)) and j+1<len(paras) and j-i<4:
            j+=1; sub=sub+'\n'+paras[j]
        a=APPL.search(sub,40)
        if a: rule=sub[:a.start()].strip(); whole=False
        else: rule=sub.strip(); whole=True
        if len(rule)>=50: out.append((rule,whole,len(p)))
        i=j+1
    return out
def main():
    txtdir,mp,outp=sys.argv[1:4]
    mp=json.load(open(mp)); res=[]
    df=collections.Counter()
    for f in glob.glob(txtdir+'/*.txt'):
        df.update(set(re.findall(r'[\u0621-\u064a]{3,}',open(f,encoding='utf8').read().replace('\u0640',''))))
    COMMON.update(w for w,c in df.items() if c>=40)
    for f in sorted(glob.glob(txtdir+'/*.txt')):
        key=os.path.basename(f)[:-4]
        src=mp[key]; parts=src.split('/')
        circ_dir=parts[-2]; fname=parts[-1]
        t=open(f,encoding='utf8').read()
        r=parse_one(t,circ_dir,fname)
        vars_=r.pop('_vars'); main_=r.pop('_main'); disp=r.pop('_disp')
        rs=rules(main_); R=[];nred=0
        for rule,full,plen in rs:
            x,c=redact(rule,vars_); nred+=c
            R.append({'t':x,'whole':full,'plen':plen})
        r['rules']=R;r['n_redacted']=nred
        # نص الحكم المحجوب (للتحميل الكسول لاحقًا)
        mt,c1=redact(main_,vars_); ds,c2=redact(disp,vars_)
        r['full']=mt.strip();r['disp']=ds.strip()
        r['id']=key; r['len']=len(t)
        res.append(r)
    json.dump(res,open(outp,'w'),ensure_ascii=False)
    print(len(res),'rulings;',sum(len(r['rules']) for r in res),'rules')
if __name__=='__main__': main()
