# بناء وثائق التشريع من الجريدة الرسمية («الكويت اليوم»): العنوان والديباجة والمواد والأبواب والتوقيع والمذكرة الإيضاحية
import sys,os,re,json,pymupdf,collections
sys.path.insert(0,'gz');import decode as D
from dump import detat
ORD='(?:الأولى|أولى|اولى|الأول|ثانية|الثانية|ثالثة|الثالثة|رابعة|الرابعة|خامسة|الخامسة|سادسة|السادسة|سابعة|السابعة|ثامنة|الثامنة|تاسعة|التاسعة|عاشرة|العاشرة|(?:ال)?حادية عشرة?|(?:ال)?ثانية عشرة?|(?:ال)?ثالثة عشرة?|(?:ال)?رابعة عشرة?|(?:ال)?خامسة عشرة?|اثمنة|اتسعة|اثنية|اثلثة)'
ORDN={'أولى':1,'اولى':1,'الأولى':1,'الأول':1,'ثانية':2,'ثالثة':3,'رابعة':4,'خامسة':5,'سادسة':6,'سابعة':7,'ثامنة':8,'تاسعة':9,'عاشرة':10,'حادية عشرة':11,'ثانية عشرة':12,'ثالثة عشرة':13,'رابعة عشرة':14,'خامسة عشرة':15}
def ordn(w):
    w=re.sub(r'^ال','',w).replace('عشر ','عشرة ').strip()
    for k,v in ORDN.items():
        if re.sub(r'^ال','',k)==w:return v
    if w.startswith('حادية'):return 11
    return None
RNUM=re.compile(r'^(?:ال)?مادة\s*[\(\[]?\s*(\d+)\s*(مكرر(?:اً|ا|ًا)?(?:\s*\(?[أ-ي]\)?)?)?\s*[\)\]]?\s*[:：\-–]?\s*$')
RORD=re.compile(r'^\(?\s*(?:ال)?مادة\s+('+ORD+r')\s*\)?\s*[:\-–]?\s*$')
RHEAD=re.compile(r'^(الباب|الفصل|الفرع|القسم)\s+(ال\S+|\S+)(\s+\S+)?\s*[:\-–]?\s*(.*)$')
RDEC=re.compile(r'^مرسوم\s+بقانون\s+رقم\s*\(?\s*(\d+)\s*\)?\s*لسنة\s*(\d{4})')
def doc_lines(path,a=0,b=None):
    doc=pymupdf.open(path);L=[]
    for pn in range(a,b if b is not None else doc.page_count):
        pg=doc[pn];F,R,Lc=D.page_lines(doc,pg);MID[pn]=pg.rect.width/2
        cols=[x for x in F]+R+Lc
        ytop=min([x[1] for x in R+Lc],default=1e9)
        # عرض كل عمود في الصفحة لمعرفة نهايات الفقرات (السطر الأخير في الفقرة أقصر)
        wmax={c:max([x[3][2]-x[3][0] for x in grp],default=1) for c,grp in (('R',R),('L',Lc),('F',F))}
        # الحافة اليسرى للعمود (نهاية السطر في العربية): السطر الممتد إليها سطر مكتمل، والأقصر نهاية فقرة
        import statistics
        left={c:(statistics.median(sorted(x[3][0] for x in grp if x[3][2]-x[3][0]>=0.6*wmax[c])[:max(1,len(grp)//3)]) if grp else 0) for c,grp in (('R',R),('L',Lc),('F',F))}
        right={c:(statistics.median(sorted((x[3][2] for x in grp if x[3][2]-x[3][0]>=0.6*wmax[c]),reverse=True)[:max(1,len(grp)//3)]) if grp else 0) for c,grp in (('R',R),('L',Lc),('F',F))}
        order=[x for x in F if x[1]<ytop]+R+Lc+[x for x in F if x[1]>=ytop]
        for c,y,t,bb in order:
            t=detat(t)
            if not t or (c=='F' and 'الكويت اليوم' in t):continue
            L.append({'pn':pn,'c':c,'t':t,'bb':bb,'full':bb[0]<=left[c]+4 and (bb[2]-bb[0])>=0.6*wmax[c],'rs':not (bb[2]<right[c]-6 and bb[0]>left[c]+6 and abs((right[c]-bb[2])-(bb[0]-left[c]))<18),'short':(bb[0]-left[c])>0.25*wmax[c],'w':bb[2]-bb[0]})
    return L,doc
def find(L,rx,start=0):
    for i in range(start,len(L)):
        if re.search(rx,L[i]['t']):return i
    return None
def paras_of(lines):
    P=[];cur=None
    for l in lines:
        # رقم بند متبوع بنقطة يُقرأ مقلوبًا في السطر العربي: «.1تقديم» ← «1. تقديم»
        t=re.sub(r'^\.(\d{1,2})\s*',r'\1. ',l['t'])
        t=re.sub(r'\s\.(\d{4})\s*$',r' \1.',t)   # «لسنة .2006» في آخر السطر ← «لسنة 2006.»
        mark=re.match(r'^[\-−–•]\s*\S|^\(\d+\)|^\d+\s*[\-–)]\s*\S|^[أ-ي]\s*[\-–)]\s',t)
        lab=re.match(r'^\(?\s*(?:ال)?(?:مادة|بند|البند)\s*[\(\)]?\s*(?:\d+|'+ORD+r')[^.]{0,40}[:)]\s*$',t)
        if cur is None:newp=True
        else:
            prev=cur['t'];last=cur['last'];ends=re.search(r'[.:؛!؟]\s*["»)\]]?\s*$',prev);comma=re.search(r'[،,]\s*$',prev)
            unclosed=last.count('(')>last.count(')') and not (mark or lab)
            midsent=cur['open'] and not ends and not comma
            # نهاية الفقرة: سطر قصير (ربع عرض العمود) أو قصير منتهٍ بوقف؛ وبند مرقّم يبدأ فقرة إلا إن كان تتمة جملة في سطر مكتمل
            # سطر أخير قصير جدًا (كلمتان أو ثلاث) بلا علامة وقف: تتمة جملة لا نهاية فقرة
            # يُقبل فقط إن انتهى بقوس رقم «(64)» أو كانت أول كلمة تالية منتهية بفاصلة «والمنصرف،»
            fw=t.split()[0] if t.split() else ''
            tailcont=cur['short'] and not ends and not comma and len(last.split())<=3 and not mark and not re.match(r'^[\-−–•]|^\(\d+\)\s*$',cur['t']) and (re.search(r'\)\s*$',last) or fw.endswith('،') or re.search(r'(?:^|\s)(?:في|من|على|إلى|الى|عن|أو|و|بين|أن|التي|الذي|بقانون\s+رقم|رقم)\s*$',last))
            # سلسلة أرقام مواد ممتدة على سطرين: «(17)، (18)،» ثم «(19)…»، أو «(83، 86،» ثم «87)…»
            numrun=(re.search(r'\(\d+\)\s*[،,]\s*$',prev) and re.match(r'^\(\d+\)',t)) or (last.count('(')>last.count(')') and re.match(r'^\d+\s*\)',t))
            # وقف عند فاصل عمود/صفحة، أو نقطتان في آخر سطر: بداية فقرة
            brk=cur['bb'][-1]['pn']!=l['pn'] or (l.get('c') is not None and cur.get('c') is not None and l.get('c')!=cur.get('c'))
            colon=re.search(r':\s*$',prev) and not lab and not re.match(r'^\(?\s*(?:ال)?مادة',cur['t'])
            newp=bool(lab) or bool(cur.get('lab')) or (not numrun and not unclosed and ((not cur['open'] and (ends or (cur['short'] and not tailcont))) or (mark and not midsent) or (cur['open'] and ends and brk) or (cur['open'] and colon)))
            if re.match(r'^(?:ال)?(?:مادة|المادة)\s*\(?\s*\d+',prev) and re.search(r'[:)]\s*$',prev):newp=True
            # السطور الموسّطة (عناوين) كتلة مستقلة عن متن الفقرات
            cent=not l.get('rs',True)
            if cent!=cur.get('cent',False):newp=True
            elif cent and cur.get('cent'):newp=False
        if newp:
            if cur:P.append(cur)
            cur={'t':t,'last':t,'pg':[l['pn']],'bb':[dict(pn=l['pn'],bb=l['bb'])],'open':l['full'],'short':l.get('short',False),'cent':not l.get('rs',True),'lab':bool(lab),'c':l.get('c')}
        else:
            cur['t']+=' '+t;cur['last']=t;cur['short']=l.get('short',False);cur['open']=l['full'];cur['c']=l.get('c');cur['lab']=False;cur['bb'].append(dict(pn=l['pn'],bb=l['bb']))
            if l['pn'] not in cur['pg']:cur['pg'].append(l['pn'])
    if cur:P.append(cur)
    for p in P:p['t']=re.sub(r'^[\-−–]{2,}\s*','— ',re.sub(r'\s+',' ',p['t']).strip())
    return P
def pre_merge(P):
    """الديباجة قائمة بنود تبدأ بشرطة: السطر الذي لا يبدأ بشرطة تتمة للبند السابق"""
    ts=[p['t'] for p in P];dm=lambda t:re.match(r'^[\-−–—]\s*\S',t)
    if sum(1 for t in ts if dm(t))<max(3,len(ts)//2):return ts
    out=[]
    for t in ts:
        if out and not dm(t) and dm(out[-1]) and not re.match(r'^(أصدرنا|وبناء|وبعد)',t):out[-1]+=' '+t
        else:out.append(t)
    return out
MID={}
MID={}
def region(bbs):
    by=collections.defaultdict(list)
    for b in bbs:
        c=0 if b['bb'][0]>MID.get(b['pn'],300) else 1
        by[(b['pn'],c)].append(b['bb'])
    return [{'page':pn,'bbox':[min(x[0] for x in v),min(x[1] for x in v),max(x[2] for x in v),max(x[3] for x in v)]} for (pn,c),v in sorted(by.items(),key=lambda kv:(kv[0][0],kv[0][1]))]
def seg_end(L,i):
    """نهاية نص المرسوم: أول «المذكرة الإيضاحية» أو عنوان مرسوم/قرار آخر بعده"""
    for j in range(i+1,len(L)):
        t=L[j]['t']
        if re.match(r'^(ال)?مذكرة\s+(ال)?[إا]يضاحية',t):return j
        if RDEC.match(t) or re.match(r'^(مرسوم|قرار)\s+رقم\s*\(?\d+',t) or re.match(r'^(قرار|قرارات)\s+(مجلس|وزاري|وزير)',t):return j
    return len(L)
def parse(L,i0,i1,mode):
    """mode: numeric (مواد مرقمة) | ordinal (مواد بالترتيب: مرسوم معدِّل) | issue (مرسوم إصدار + قانون مرافق)"""
    seg=L[i0:i1];k=0;title=[]
    while k<len(seg) and not re.match(r'^[\-−–]\s*بعد\s+ال[اإ]طلاع',seg[k]['t']):title.append(seg[k]);k+=1
    pre=[];
    while k<len(seg) and not (RORD.match(seg[k]['t']) or RNUM.match(seg[k]['t']) or RHEAD.match(seg[k]['t'])):
        pre.append(seg[k]);k+=1
        if re.search(r'أصدرنا|أصدر(نا)?\s+(المرسوم|القانون)|نصه\s*:?$',pre[-1]['t']) and not pre[-1]['full']:break
    arts=[];heads=[];sig=[];cur=None;phase='issue' if mode=='issue' else 'law';lawtitle=None
    def close():
        if cur is not None:arts.append(cur)
    body=seg[k:]
    j=0
    while j<len(body):
        l=body[j];t=l['t']
        if re.match(r'^(أمير الكويت|نائب الأمير|رئيس مجلس الوزراء)\s*$',t) or re.match(r'^صدر\s+ب',t):
            close();cur=None
            if mode=='issue' and phase=='issue':
                k2=next((q for q in range(j+1,len(body)) if re.match(r'^(قانون|القانون|نظام)\s',body[q]['t']) and not body[q]['full']
                         and q+1<len(body) and (RHEAD.match(body[q+1]['t']) or RNUM.match(body[q+1]['t']))),None)
                if k2 is not None:
                    sig=body[j:k2];lawtitle=body[k2]['t'];phase='law';j=k2+1;continue
            sig=sig+body[j:] if sig else body[j:];break
        mo=RORD.match(t);mn=RNUM.match(t);mh=RHEAD.match(t)
        top=None
        if mode=='ordinal' and mo:top=('o',ordn(mo.group(1)),t)
        elif mode=='numeric' and (mn or mo):top=('n',int(mn.group(1)) if mn else ordn(mo.group(1)),t,mn.group(2) if mn else None)
        elif mode=='issue':
            if phase=='issue' and mo:top=('i',ordn(mo.group(1)),t)
            elif phase=='law' and mn:top=('n',int(mn.group(1)),t,mn.group(2))
        if top:
            close();cur={'label':re.sub(r'\s*[:\-–]\s*$','',t),'n':top[1],'issue':top[0]=='i','bis':(top[3] if len(top)>3 else None),'lines':[]}
            j+=1;continue
        # عنوان القانون المرافق في مرسوم الإصدار
        if mode=='issue' and phase=='issue' and not l['full'] and re.match(r'^(قانون|القانون)\s',t) and j+1<len(body) and (RHEAD.match(body[j+1]['t']) or RNUM.match(body[j+1]['t'])):
            close();cur=None;phase='law';lawtitle=t;j+=1;continue
        if mh and phase=='law' and (not l['full'] or (j+1<len(body) and (RNUM.match(body[j+1]['t']) or RORD.match(body[j+1]['t'])))):
            close();cur=None;ht=t
            if not mh.group(4):
                tl=[];q=j+1
                while q<len(body) and len(tl)<3 and not (RNUM.match(body[q]['t']) or RORD.match(body[q]['t']) or RHEAD.match(body[q]['t'])):tl.append(body[q]['t']);q+=1
                if tl and q<len(body) and (RNUM.match(body[q]['t']) or RORD.match(body[q]['t']) or RHEAD.match(body[q]['t'])):ht=t+' — '+' '.join(tl);j=q-1
            lv={'الباب':1,'الفصل':2,'الفرع':3,'القسم':1}[mh.group(1)]
            heads.append((lv,re.sub(r'\s*:\s*',' — ',ht,count=1) if ' — ' not in ht else ht,len(arts)));j+=1;continue
        if cur is None:
            # نص خارج المواد (مثل عنوان فصل بلا مادة) يُلحق بالديباجة إن كان قبل أول مادة
            if not arts:pre.append(l)
            j+=1;continue
        cur['lines'].append(l);j+=1
    close()
    for a in arts:
        P=paras_of(a['lines']);a['paras']=[p['t'] for p in P]
        a['pages']=sorted({l['pn'] for l in a['lines']});a['rg']=region([dict(pn=l['pn'],bb=l['bb']) for l in a['lines']])
        del a['lines']
    return {'title':[x['t'] for x in title],'preamble':pre_merge(paras_of(pre)),'articles':arts,'heads':heads,'signature':[x['t'] for x in sig],'lawtitle':lawtitle,
            'pages':sorted({x['pn'] for x in seg})}
def memo(L,i0,i1):
    P=[];
    for p in paras_of(L[i0:i1]):
        h=len(p['t'])<70 and not re.search(r'[.،:]$',p['t']) and not p['t'].startswith('-')
        P.append({'h':h,'t':p['t'],'pg':p['pg'][0]})
    return P
if __name__=='__main__':
    L,doc=doc_lines(sys.argv[1]);num,yr=sys.argv[2],sys.argv[3];mode=sys.argv[4]
    i=find(L,rf'^مرسوم\s+بقانون\s+رقم\s*\(?\s*{num}\s*\)?\s*لسنة\s*{yr}')
    e=seg_end(L,i);R=parse(L,i,e,mode)
    print('TITLE',R['title']);print('PRE',len(R['preamble']),R['preamble'][:2],'...',R['preamble'][-1:])
    for lv,t,ai in R['heads']:print('  H',lv,t,'@',ai)
    for a in R['articles']:print(' A',a['label'],a['n'],a['issue'],a['pages'],'|',' ¶ '.join(a['paras'])[:160])
    print('SIG',R['signature'][:8]);print('LAWTITLE',R['lawtitle'],'pages',R['pages'],'end line',e,L[e]['t'] if e<len(L) else None)
