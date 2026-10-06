#!/usr/bin/env python3
"""تحليل أحكام وقرارات التمييز الحديثة (نسخ عمل Word 2025–2026) إلى JSON.
parse26.py <txt_dir> <map.tsv> <out.json>
map.tsv: <id>\t<المسار النسبي للملف الأصلي>\t<mtimeMs اختياري>
- الأنواع: حكم (نهائي/تمهيدي) · قرار غرفة مشورة · قرار لجنة فحص الطعون.
- رقم الطعن وسنته والدائرة من سطر «في الطعن رقم … لسنة … عمالي/3» أو «والمقيد بالجدول رقم»،
  ويُطابق بالرقم المرمّز في اسم الملف (<3 أرقام الدائرة><سنتان><الرقم>).
- تاريخ الجلسة من «الموافق d/m/yyyy».
- القاعدة: فقرة «المقرر…» حرفيًا (بعد حجب أسماء الأطراف فقط)، حتى بدء التطبيق على الواقعة.
- لا يُحفظ اسم أي قاضٍ أو أمين سر أو مجلد عمل."""
import sys,re,json,os,glob,collections
sys.path.insert(0,os.path.dirname(__file__))
import parse as P
CMAP={'تجاري':'تجاري','مدني':'مدني','عمالي':'عمالي','جزائي':'جزائي','إداري':'إداري','اداري':'إداري','أحوال':'أحوال شخصية','احوال':'أحوال شخصية'}
PFX={'400':'جزائي','401':'جزائي','402':'تجاري','403':'عمالي','405':'مدني','407':'إداري','404':'أحوال شخصية','406':'أحوال شخصية'}
ORD={'الأولى':1,'الاولى':1,'الثانية':2,'الثالثة':3,'الرابعة':4,'الخامسة':5,'السادسة':6,'السابعة':7,'الثامنة':8,'التاسعة':9,'العاشرة':10}
def norm(s): return P.nt(P.nd(s)).replace('٫','.').replace('۲','2').replace('۳','3').replace('۱','1').replace('۰','0').replace('۴','4').replace('۵','5').replace('۶','6').replace('۷','7').replace('۸','8').replace('۹','9')
MON={'يناير':1,'فبراير':2,'مارس':3,'أبريل':4,'ابريل':4,'إبريل':4,'مايو':5,'يونيو':6,'يونيه':6,'يوليو':7,'يوليه':7,'أغسطس':8,'اغسطس':8,'سبتمبر':9,'أكتوبر':10,'اكتوبر':10,'نوفمبر':11,'ديسمبر':12}
def _n2(s):
    s=re.sub(r'لسن[هة]\b','لسنة',s)
    s=re.sub(r'\(\s*(\d+)\s*\)',r'\1',s)
    s=re.sub(r'الموافق\s*:?\s*(\d{1,2})\s*(?:من\s+)?(%s)\s*(?:سنة\s*)?(\d{4})'%'|'.join(MON),lambda m:'الموافق %s/%d/%s'%(m.group(1),MON[m.group(2)],m.group(3)),s)
    return s
def file_code(name):
    m=re.search(r'(\d{9,12})(?=\D*\.doc)',name)
    if not m: return None
    c=m.group(1)
    if len(c)>=10: yy,num=c[-7:-4],c[-4:]
    else: yy,num=c[3:6],c[6:]
    return {'pfx':c[:3],'yy':int(yy)%100,'num':int(num),'raw':c}
STOPN={'و','في','من','عن','على','الى','إلى','أن','ان','هو','هي','بصفته','وهي','وهو','الذي','التي','عليه','له','لها','قد','كان','وكان','ومن','حال','بتاريخ'}
HDR=re.compile(r'\n[\s"“”*]*المحكمة[\s"“”*:]*\n')
APPRE=re.compile(r'(?:الطعو?ن(?:ين)?\s+بالتمييز\s+|الطعو?ن(?:ين)?\s+|بالجدول\s+|المقيد[ةه]?(?:ين|ان)?\s+)(?:رقم(?:ي)?|برقم(?:ي)?|[اأ]رقام|بأرقام)\s*:?\s*((?:\d+\s*(?:،|,|و|-|/)?\s*)+?)\s*(?:لسنة|/)\s*(\d{4})\s*(?:م\s*)?([ء-ي]+)?\s*/?\s*(\d{1,2})?')
def parse(t,relpath):
    L=P.lines(t); T=norm('\n'.join(L)); H=_n2(T); r={'flags':[]}
    head=H[:H.find('المرفوع')] if 'المرفوع' in H[:4000] else H[:2500]
    if 'لجنة فحص الطعون' in head: kind='فحص'
    elif re.search(r'غرف[ةه]\s+(?:ال)?مشورة',head) and ('قرار' in head or 'صدر الحكم' not in head): kind='مشورة'
    elif 'صدر الحكم' in head or 'صـ' in head or 'الحكم' in head: kind='حكم'
    else: kind='؟'
    r['kind']=kind
    d=re.search(r'الموافق\s*:?\s*(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})',head)
    r['date']=None
    if d:
        dd,mm,yy=map(int,d.groups())
        if 1<=mm<=12 and 1<=dd<=31 and 2023<=yy<=2026: r['date']=f'{yy:04d}-{mm:02d}-{dd:02d}'
    if not r['date']: r['flags'].append('تاريخ الجلسة غير مقروء')
    # الدائرة
    lab=re.search(r'الدائرة\s+(التجارية|المدنية|العمالية|الجزائية|الإدارية|الادارية|الأحوال الشخصية|أحوال شخصية)\s*(?:\(?\s*([ء-ي]+|\d+)\s*\)?)?',head)
    circ=None;cno=None
    if lab:
        circ={'التجارية':'تجاري','المدنية':'مدني','العمالية':'عمالي','الجزائية':'جزائي','الإدارية':'إداري','الادارية':'إداري'}.get(lab.group(1),'أحوال شخصية')
        g=lab.group(2); cno=ORD.get(g) or (int(g) if g and g.isdigit() else None)
    # الطعن
    zone=H[:H.find('المحكم',H.find('المرفوع')+1)+20] if 'المرفوع' in H else H[:4000]
    zm=re.search(r'\n[\s"“*]*الوقائع|اتهمت النيابة|\nحيث إن الوقائع|\nوحيث إن الوقائع',zone)
    if zm: zone=zone[:zm.start()]
    ms=list(APPRE.finditer(zone))
    ap=None
    if ms:
        m=next((x for x in ms if 'بالجدول' in x.group(0)),None) or next((x for x in ms if 'المقيد' in x.group(0) and 'المقيدة' not in x.group(0)),None) or ms[0]
        yr=int(m.group(2)); w=(m.group(3) or '')
        ap_pairs=[]
        for seg in re.split(r'[،,]|\sو',m.group(1)):
            q=re.match(r'\s*(\d+)\s*(?:/\s*(\d{4}))?',seg)
            if q and int(q.group(1))>0: ap_pairs.append((int(q.group(1)),int(q.group(2)) if q.group(2) else yr))
        nums=[n for n,y in ap_pairs]
        c2=next((v for k,v in CMAP.items() if w.startswith(k)),None)
        if c2 and circ and c2!=circ: r['bench']=circ
        if c2: circ=c2
        if m.group(4) and not cno: cno=int(m.group(4))
        ap={'nums':nums,'year':yr,'pairs':ap_pairs}
        r['appeal_raw']=m.group(0).strip()
    fc=file_code(relpath)
    if fc and fc['pfx'] in PFX and not circ: circ=PFX[fc['pfx']]
    if ap:
        if fc and not any(n==fc['num'] and y%100==fc['yy'] for n,y in ap.get('pairs',[(x,ap['year']) for x in ap['nums']])):
            r['flags'].append('رقم الطعن في النص لا يطابق اسم الملف (%s)'%fc['raw'])
        if fc and fc['pfx'] in PFX and circ and PFX[fc['pfx']]!=circ and 'bench' not in r:
            r['flags'].append('رمز الدائرة في اسم الملف (%s) يخالف النص'%PFX[fc['pfx']])
    elif fc and fc['num']:
        ap={'nums':[fc['num']],'year':2000+fc['yy'],'pairs':[(fc['num'],2000+fc['yy'])]}; r['flags'].append('رقم الطعن من اسم الملف فقط')
    else: r['flags'].append('رقم الطعن غير معروف')
    r['appeal']=ap; r['circuit']=circ; r['cno']=cno
    if ap:
        r['occ']=min(len(re.findall(r'(?<!\d)%d\s*(?:لسنة|/)\s*%d'%(n,y),H)) for n,y in ap['pairs'])
        if fc: r['fc']=fc
    if not circ: r['flags'].append('الدائرة غير معروفة')
    # الأطراف → متغيرات الحجب
    i=T.find('المرفوع')
    hm=HDR.search(T,i) if i>=0 else None
    bm=re.search(r'\n[^\n]{0,15}بعد\s+الاطلاع',T[i:]) if i>=0 else None
    if bm and (not hm or i+bm.start()<hm.start()):
        class _M:
            def __init__(s,a): s.a=a
            def start(s): return s.a
            def end(s): return s.a
        hm=_M(i+bm.start())
    j=hm.start() if hm else -1
    blk=T[i:j] if i>=0 and j>i else ''
    em=re.search(r'\n[^\n]*المقيد[^\n]*\n|\n[\s"“*]*الوقـ*ائع[\s"”*:]*\n',blk)
    if em: blk=blk[:em.end()]
    blk=re.sub(r'و?المرفوع(?:ين)?\s*(?:أولهما|ثانيهما|آخرهما)?\s*من\s*:?-?','|',blk)
    blk=re.sub(r'والمقيد[^\n]*','',blk)
    blk=re.sub(r'(?m)^[\s"“”]*ضـ*د(?:\s+كل\s+من)?[\s"“”:]*$','|',blk)
    blk=re.sub(r'(?m)^\s*\d+\s*[-–.)]\s*','|',blk)
    blk=re.sub(r'(?m)^\s*(?:أولا|ثانيا|ثالثا|رابعا|خامسا|سادسا)ً?\s*[:/-]?\s*','|',blk)
    blk=re.sub(r'ورثة\s+(?:المرحوم|المرحومة|الشيخ|الشيخة)?\s*/?\s*([ء-ي ]+?)\s+وهم\s*:?','|\\1|',blk)
    blk=blk.replace('\n','|')
    names=P.party_names(blk); vars_=set()
    for n in names: vars_|=P.name_variants(n)
    if not names: r['flags'].append('لم تُستخرج أسماء الأطراف')
    # أسماء المتهمين والمذكورين في الوقائع
    for pm in re.finditer(r'(?:\(\s*\d+\s*\)\s*(?=[ء-ي]+\s+[ء-ي]+\s+[ء-ي]+\s*[،,("]))\s*([ء-ي]+(?:\s+[ء-ي]+){2,4})',T[:j if j>0 else 6000] + T[j:j+6000] if j>0 else T[:8000]):
        nm=re.sub(r'\s+(?:الطاعن|المطعون|بصفت|في|عن|و$).*$','',pm.group(1)).strip()
        if len(nm.split())>=3 and not P.GOVHEAD.match(nm) and not any(w in P.COMMON or w in STOPN for w in nm.split()): names.add(nm); vars_|=P.name_variants(nm)
    body=T[hm.end():] if hm else T
    cuts=list(re.finditer(r'ف?لهذه\s*الأسباب\s*[:.]?|\n\s*\.?\s*لذلك\s*[:.]?\s*(?=\n)',body))
    if not cuts: cuts=list(re.finditer(r'(?=\n\s*(?:حكمت|قررت)\s+المحكمة)',body))
    cut=cuts[-1] if cuts else None
    main=body[:cut.start()] if cut else body; disp=body[cut.end():] if cut else ''
    dl=disp[:600]
    if re.search(r'حكمت\s+المحكمة',dl[:200]): kind='حكم'; r['kind']=kind
    if kind=='حكم':
        if not dl.strip(): r['final']=None; r['flags'].append('منطوق الحكم غير مقروء')
        elif re.search(r'حجز|للمرافعة|بندب|تأجيل|باستجواب|بإعادة الطعن',dl) and not re.search(r'بتمييز|برفض',dl): r['final']=False
        else:
            r['final']=True
            if re.search(r'بإحالة|بندب|وقبل الفصل',dl): r['partial']=True
    else:
        r['final']=bool(re.search(r'عدم قبول|بعدم قبول|برفض|رفض الطعن|عدم جواز|بانقضاء|بسقوط|بترك|باعتبار',dl)) and not re.search(r'للمرافعة|بإحالة الطعن|تحديد جلسة|لنظره',dl)
        if not r['final']: r['flags'].append('قرار ليس بعدم القبول — راجع المنطوق')
    # تحقق ثلاثي: رأس الحكم · المنطوق · اسم الملف
    dm=APPRE.search(_n2(disp[:800]))
    if dm and ap:
        dn=[int(x) for x in re.findall(r'\d+',dm.group(1))]
        if not set(dn)&set(ap['nums']):
            hdr_ok=fc and fc['num'] in ap['nums']; dsp_ok=fc and fc['num'] in dn
            r['flags'].append('رقم الطعن في المنطوق (%s) يخالف الرأس (%s)'%('،'.join(map(str,dn)),'،'.join(map(str,ap['nums']))))
            if dsp_ok and not hdr_ok:
                ap={'nums':dn,'year':int(dm.group(2)),'pairs':[(n,int(dm.group(2))) for n in dn]}; r['appeal']=ap
                r['flags'].append('اعتُمد رقم المنطوق لمطابقته اسم الملف')
            r['suspect']=True
    vars_={v for v in vars_ if 'الكويت' not in v and 'الخطوط' not in v}
    rs=P.rules(main); R=[];nred=0
    def _deceased(x):
        n=0
        def f(m):
            nonlocal n
            toks=m.group(2).split(); keep=[]
            for t in toks:
                if t in ('[…]',) or t.startswith('بال') or t in STOPN or len(keep)>=4 or (t.startswith('ال') and t in P.COMMON): break
                keep.append(t)
            if len(keep)<2: return m.group(0)
            n+=1
            return m.group(1)+'[…]'+m.group(2)[len(' '.join(keep)):]
        x=re.sub(r'((?:لل|ل)?(?:ال)?(?:مرحوم[ةه]?)\s*/?\s*)((?:[ء-ي]+|\[…\])(?:\s+(?:[ء-ي]+|\[…\])){0,5})',f,x)
        x=re.sub(r'\[…\](?:\s*\[…\])+','[…]',x)
        return x,n
    for rule,whole,plen in rs:
        x,c=P.redact(rule,vars_); x,c2=_deceased(x); c+=c2; nred+=c
        R.append({'t':x,'whole':whole,**({'redacted':c} if c else {})})
    PB=set()
    for n in names:
        tk=[w for w in re.findall(r'[ء-ي]+',n)]
        for a_,b_ in zip(tk,tk[1:]):
            if len(a_)>=3 and len(b_)>=3 and a_ not in STOPN and b_ not in STOPN and not P.GOVHEAD.match(a_): PB.add(a_+' '+b_)
    for x in R:
        tk=re.findall(r'[ء-ي]+',x['t']); h=[a_+' '+b_ for a_,b_ in zip(tk,tk[1:]) if a_+' '+b_ in PB]
        if h: x['leak']=h[:3]
    r['rules']=R; r['n_redacted']=nred; r['n_names']=len(names); r['_pn']=sorted(names)
    r['_disp']=P.redact(dl.split('\n')[0],vars_)[0][:300]
    return r
def main():
    txtdir,mp,outp=sys.argv[1:4]
    M={}
    for ln in open(mp,encoding='utf8'):
        p=ln.rstrip('\n').split('\t'); M[p[0]]={'rel':p[1],'mtime':int(p[2]) if len(p)>2 and p[2] else None}
    fs=sorted(glob.glob(txtdir+'/*.txt'))
    df=collections.Counter()
    for f in fs: df.update(set(re.findall(r'[ء-ي]{3,}',P.nt(open(f,encoding='utf8').read()))))
    P.COMMON.update(w for w,c in df.items() if c>=30)
    out=[]
    for f in fs:
        key=os.path.basename(f)[:-4]
        r=parse(open(f,encoding='utf8').read(),M[key]['rel'])
        r['id']=key; r['rel']=M[key]['rel']; r['mtime']=M[key]['mtime']
        out.append(r)
    # كاشف تسرّب الأسماء: ثنائيات من أسماء الأطراف في كل المجموعة، فيها كلمة نادرة
    BG=set()
    for r in out:
        for n in r.pop('_pn',[]):
            tk=re.findall(r'[ء-ي]+',n)
            for a,b in zip(tk,tk[1:]):
                if a not in P.COMMON and b not in P.COMMON and len(a)>=3 and len(b)>=3: BG.add(a+' '+b)
    RF=collections.Counter()
    for r in out:
        for x in r['rules']: RF.update(set(re.findall(r'[ء-ي]+',x['t'])))
    for r in out:
        for x in r['rules']:
            if x.get('leak'):
                h=[g for g in x['leak'] if all(RF[w]<8 for w in g.split())]
                if h: x['leak']=h
                else: x.pop('leak')
    ROLE=re.compile(r'(?:المرحوم[ةه]?|السيد[ةه]?|الشيخ[ةه]?|المدعو[ةه]?|المحامي[ةه]?|المحكوم عليه[ا]?|المتهم[ةه]?|المطعون ضد(?:ه|ها|هم)|الطاعن[ةه]?)\s*(?:الأول[ىي]?|الثاني[ةه]?|الثالث[ةه]?)?\s*/\s*[ء-ي]|المرحوم[ةه]?\s+(?!ال)[ء-ي]{3,}')
    nleak=0
    for r in out:
        for x in r['rules']:
            tk=re.findall(r'[ء-ي]+',x['t'])
            hit=[a+' '+b for a,b in zip(tk,tk[1:]) if a+' '+b in BG]
            if hit or ROLE.search(x['t']) or '[…]' in x['t'] or x.get('leak'): x['leak']=x.get('leak') or hit[:3] or ['role/redaction']; nleak+=1
    print('rules flagged for possible names:',nleak)
    json.dump(out,open(outp,'w'),ensure_ascii=False,indent=0)
    c=collections.Counter((r['kind'],r['final']) for r in out)
    print(len(out),'docs',dict(c),'rules',sum(len(r['rules']) for r in out))
if __name__=='__main__': main()
