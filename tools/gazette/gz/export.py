# تصدير وثائق الجريدة الرسمية إلى صيغة المكتبة (JSON + صور الصفحات + المذكرات) مع بيانات التعديل والإلغاء
import sys,os,re,json,pymupdf,collections
sys.path.insert(0,'gz');sys.path.insert(0,'.')
import build as B
from PIL import Image
SITE=__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','..','..'));CELL=(684,955);C='gz/clean/'
MON={'يناير':1,'فبراير':2,'مارس':3,'أبريل':4,'ابريل':4,'مايو':5,'يونيو':6,'يوليو':7,'أغسطس':8,'اغسطس':8,'سبتمبر':9,'أكتوبر':10,'اكتوبر':10,'نوفمبر':11,'ديسمبر':12}
def toc_from(heads,arts):
    items=[[lv,t,i] for lv,t,i in heads];out=[]
    for k,(lv,t,i) in enumerate(items):
        end=len(arts)
        for kk in range(k+1,len(items)):
            if items[kk][0]<=lv:end=items[kk][2];break
        ns=[a['n'] for a in arts[i:end] if a['n'] and not a['issue']]
        if not ns:continue
        out.append(dict(level=lv,title=t,frm=min(ns),to=max(ns),i0=i,i1=end))
    return out
MENT=re.compile(r'(?:المادة|المادتين|المادتان|المواد|مادة)\s*(?:من\s+)?(?:رقم\s*)?\(?\s*([0-9]+(?:\s*(?:مكرر[اًا]?)?)?(?:\s*(?:،|,|و|-|–|إلى|الى|حتى)\s*\(?[0-9]+\)?)*)')
def mentions(t):
    out=set()
    for m in MENT.finditer(t):
        tail=t[m.end():m.end()+60]
        if re.match(r'\s*\)?\s*(?:[/0-9\s،,و]*)?(?:من|في)\s+(?:ال)?(?:قانون|مرسوم|لائحة|دستور|اتفاقية|نظام)',tail):continue
        nums=[int(x) for x in re.findall(r'[0-9]+',m.group(1))]
        if re.search(r'(إلى|الى|حتى|-|–)',m.group(1)) and len(nums)==2 and 0<nums[1]-nums[0]<=40:nums=list(range(nums[0],nums[1]+1))
        out.update(n for n in nums if 0<n<1000)
    return sorted(out)
def gdate(s):
    m=re.search(r'(\d{1,2})\s+(\S+)\s+(\d{4})',s)
    if m and m.group(2) in MON:return f"{m.group(3)}-{MON[m.group(2)]:02d}-{int(m.group(1)):02d}"
def header_info(doc,pn):
    import dump
    t=dump.detat(' '.join(x[2] for x in B.D.page_lines(doc,doc[pn])[0][:1]))
    iss=re.search(r'(?:ملحق\s*(\d*)\s*)?(?:ال|لل)عدد\s*(\d+)',t);pg=re.search(r'السبعون\s+(أ\s*\d+|\d+)',t);d=re.search(r'(\d{4})/(\d{1,2})/(\d{1,2})|(\d{1,2})/(\d{4})/(\d{1,2})',t)
    date=None
    if d and d.group(1):date=f"{d.group(1)}-{int(d.group(2)):02d}-{int(d.group(3)):02d}"
    elif d:date=f"{d.group(5)}-{int(d.group(6)):02d}-{int(d.group(4)):02d}"
    sup=None
    if iss and re.search(r'ملحق',t):sup=(iss.group(1) or '1')
    return dict(issue=iss.group(2) if iss else None,sup=sup,page=pg.group(1).replace(' ','') if pg else None,date=date,raw=t)
def render(doc,pns,lid):
    out=f'{SITE}/pages/{lid}';os.makedirs(out,exist_ok=True)
    for f in os.listdir(out):os.remove(os.path.join(out,f))
    for k in range(0,len(pns),20):
        G=Image.new('L',(CELL[0]*2,CELL[1]*10),255)
        for j,(d,pn) in enumerate(pns[k:k+20]):
            pix=d[pn].get_pixmap(dpi=110,colorspace=pymupdf.csGRAY)
            im=Image.frombytes('L',(pix.width,pix.height),pix.samples).resize(CELL,Image.LANCZOS)
            G.paste(im,((j%2)*CELL[0],(j//2)*CELL[1]))
        G.save(f'{out}/g{k//20:03d}.webp','WEBP',quality=50,method=6)
TF={'مرسوم بقانون':'المرسوم بالقانون'}
MANUAL=[(r'وتحُلّ محَ\s+َل([\u064B-\u0652]*)',r'وتحُلّ مَحَل\1'),(r'مايو(\d{4})',r'مايو \1')]
def MANUAL_FIX(t):
    for k,v in MANUAL:t=re.sub(k,v,t)
    return t
def export(cfg,noimg=False):
    f=C+cfg['file']+'.pdf';L,doc=B.doc_lines(f)
    i=B.find(L,rf"^مرسوم\s+بقانون\s+رقم\s*\(?\s*{cfg['n']}\s*\)?\s*لسنة\s*{cfg['y']}");e=B.seg_end(L,i)
    R=B.parse(L,i,e,cfg['mode']);lid=f"LAW-{cfg['n']}-{cfg['y']}"
    pages=R['pages'];hd=header_info(doc,pages[0])
    pns=[(doc,p) for p in pages];printed=[header_info(doc,p)['page'] for p in pages]
    annex=[]
    for af in cfg.get('annex_files',[]):
        ad=pymupdf.open(C+af+'.pdf')
        for p in range(ad.page_count):pns.append((ad,p));printed.append(header_info(ad,p)['page']);annex.append(dict(pg=len(pns),t=cfg['annex_t']))
    idx={p:k+1 for k,p in enumerate(pages)}
    arts=[];seen=set();ic=0
    for a in R['articles']:
        if a['issue']:ic+=1;aid=f'{lid}-I{ic}'
        else:
            base=f"{lid}-A{(a['n'] or 0):04d}";aid=base;k=1
            while aid in seen:aid=f'{base}-{k}';k+=1
        seen.add(aid)
        arts.append(dict(id=aid,n=a['n'],label=re.sub(r'^\(\s*((?:ال)?مادة\s+[^()]*?)\s*\)$',r'\1',a['label'].strip()),bis=a['bis'] or None,issue=a['issue'] or None,rep=None,trail=None,paras=a['paras'],notes=None,
            pages=[idx[p] for p in a['pages']],rg=[dict(page=idx[r['page']],bbox=r['bbox']) for r in R['articles'][len(arts)]['rg']]))
    # مسار الأبواب لكل مادة
    toc=toc_from(R['heads'],R['articles'])
    for a_i,a in enumerate(arts):
        tr=[t['title'] for t in toc if t['i0']<=a_i<t['i1']]
        a['trail']=tr or None
    sig=R['signature'];sd=' '.join(sig)
    iss=gdate(re.sub(r'الموافق\s*:?','',sd[sd.find('الموافق'):])) if 'الموافق' in sd else None
    hij=re.search(r'صدر\s+ب\S+\s+\S+\s+في\s*:?\s*(.+?\d{4}\s*هـ?)',sd)
    title=' '.join(R['title']);subj=re.sub(r'^.*?لسنة\s*\d{4}\s*','',title).strip()
    pw,ph=doc[pages[0]].rect.width,doc[pages[0]].rect.height
    src=dict(kind='الجريدة الرسمية «الكويت اليوم»',issue=hd['issue'],supplement=hd['sup'],date=hd['date'],file=cfg['file']+'.pdf',pdf_pages=[pages[0]+1,pages[-1]+1],
        note='النص مستخرج من ملف الجريدة الرسمية بفك ترميز الخط مباشرة (لا قراءة ضوئية)، مع تصحيح أخطاء الترميز في الملف آليًا بمطابقة أشكال الحروف.')
    pub=f"نشر في جريدة الكويت اليوم {'ملحق '+hd['sup']+' ' if hd['sup'] else ''}العدد {hd['issue']} بتاريخ {hd['date']}." if hd['issue'] else None
    law=dict(cat='law',id=lid,key=f"{cfg['n']}/{cfg['y']}",type='مرسوم بقانون',number=cfg['n'],year=cfg['y'],short=cfg['short'],
        title=f"{TF['مرسوم بقانون']} رقم {cfg['n']} لسنة {cfg['y']} {subj}".strip(),issued=iss,issued_hijri=hij.group(1).strip() if hij else None,status='نافذ',
        text_version=f"النص كما نُشر في الجريدة الرسمية «الكويت اليوم»{' — ملحق '+hd['sup'] if hd['sup'] else ''} العدد {hd['issue']} ({hd['date']})، ولا يشمل ما صدر بعده من تعديلات",
        source=src,annex=annex or None,preamble=R['preamble'],title_lines=R['title'],toc=toc,articles=arts,signature=sig,notes=[pub] if pub else None,
        pages_col=lid,page_meta=dict(pw=round(pw,1),ph=round(ph,1),cell=list(CELL),gp=20,printed=printed,pdf=[p+1 for p in pages],issue=hd['issue']),
        lawtitle=R['lawtitle'])
    if cfg.get('note'):law['notes']=(law['notes'] or [])+[cfg['note']]
    for k in ('amends','repeals','group'):
        if cfg.get(k):law[k]=cfg[k]
    # اتجاه الأقواس: إن غلب في الوثيقة نمط «)14(» فالملف يعكس الأقواس، فتُصحَّح في الوثيقة كلها
    def allt(o):return ' '.join(p for a in o['articles'] for p in a['paras'])+' '.join(o['preamble'])+' '.join(o['title_lines'])
    rev=len(re.findall(r'\)\s*\d+\s*\(',allt(law)));fwd=len(re.findall(r'\(\s*\d+\s*\)',allt(law)))
    SW=str.maketrans('()',')(');law['paren_swapped']=rev>fwd*2 and rev>=2
    if law['paren_swapped']:
        for a in law['articles']:a['paras']=[p.translate(SW) for p in a['paras']];a['label']=a['label'].translate(SW)
        for k in ('preamble','title_lines','signature'):law[k]=[x.translate(SW) for x in law[k]]
        law['title']=law['title'].translate(SW)
    # تصحيحات يدوية لمواضع تشكيل انزاح في طبقة النص، كل منها مطابَق على صورة الصفحة (انظر verify_report.md)
    for a in law['articles']:a['paras']=[MANUAL_FIX(p) for p in a['paras']]
    law['preamble']=[MANUAL_FIX(p) for p in law['preamble']]
    json.dump(law,open(f'{SITE}/data/laws/{lid}.json','w'),ensure_ascii=False,separators=(',',':'))
    if not noimg:render(doc,pns,lid)
    memo=None
    if e<len(L) and re.match(r'^(ال)?مذكرة',L[e]['t']):
        e2=next((j for j in range(e+1,len(L)) if B.RDEC.match(L[j]['t']) or re.match(r'^(مرسوم|قرار)\s+رقم',L[j]['t'])),len(L))
        mp=sorted({l['pn'] for l in L[e:e2]});midx={p:k+1 for k,p in enumerate(mp)}
        paras=[]
        for p in B.paras_of(L[e:e2]):
            h=(p.get('cent') and len(p['t'])<220) or (len(p['t'])<90 and not re.search(r'[.،:؛]$',p['t']) and not p['t'].startswith(('-','−')) and len(paras)<3)
            paras.append(dict(h=1,t=p['t'],pg=midx[p['pg'][0]]) if h else dict(t=p['t'],pg=midx[p['pg'][0]]))
        ment={}
        for k,pp in enumerate(paras):
            if pp.get('h'):continue
            for n in mentions(pp['t']):ment.setdefault(str(n),[]).append(k)
        memo=dict(id=lid+'-M',law=lid,title='المذكرة الإيضاحية — '+cfg['short'],paras=paras,mentions=ment,pages_col=lid+'-M',
            page_meta=dict(pw=round(pw,1),ph=round(ph,1),cell=list(CELL),gp=20,printed=[header_info(doc,p)['page'] for p in mp],pdf=[p+1 for p in mp],issue=hd['issue']),
            note='المذكرة الإيضاحية كما نُشرت في الجريدة الرسمية. ربط الفقرات بالمواد آلي بحسب أرقام المواد المذكورة فيها.')
        mt=' '.join(p['t'] for p in paras)
        if law['paren_swapped'] or (len(re.findall(r'\)\s*\d+\s*\(',mt))>2*len(re.findall(r'\(\s*\d+\s*\)',mt)) and len(re.findall(r'\)\s*\d+\s*\(',mt))>=2):
            for p in paras:p['t']=p['t'].translate(SW)
        json.dump(memo,open(f'{SITE}/data/laws/{lid}-M.json','w'),ensure_ascii=False,separators=(',',':'))
        if not noimg:render(doc,[(doc,p) for p in mp],lid+'-M')
    return law,memo
