# فكّ نص صفحات الجريدة: تصحيح الحروف بالجدول، ثم ترتيب الأعمدة والأسطر من اليمين إلى اليسار
import sys,json,re,pymupdf,collections,unicodedata
sys.path.insert(0,'gz');import table as TB
T=json.load(open('gz/table.json'))
FIX=json.load(open('gz/fix.json')) if __import__('os').path.exists('gz/fix.json') else {}
AR=re.compile('[؀-ۿ]')
# الحروف الأولى في الخط الكامل (أرقام وعلامات) — تُستعمل حين يحمل الملف ترميزًا عربيًا خاطئًا لها
LOW={3:' ',4:'!',5:'"',8:'%',10:"'",11:')',12:'(',13:'*',14:'+',15:',',16:'-',17:'.',18:'/',19:'0',20:'1',21:'2',22:'3',23:'4',24:'5',25:'6',26:'7',27:'8',28:'9',29:':',30:';',31:'<',32:'=',33:'>',34:'?',62:'[',64:']',94:'}',96:'{'}
def label(fn,g,t):
    if 'Traditional' in fn and g<150 and t and not t.isascii() and g in LOW:return LOW[g]
    # حرف مرسوم في الخط الكامل ترجمه الملف مسافةً (مثل علامة التنصيص): الخطوط المصغّرة لا تضع حرفًا فارغًا بعد الرقم 1
    if 'Traditional' in fn and 3<g<150 and t==' ' and g in LOW:return LOW[g]
    if 'Traditional' in fn and g>=150:
        k=f'{fn}|{g}'
        if k in FIX:return FIX[k]
        base=fn.split('#')[0]
        if f'{base}|{g}' in FIX:return FIX[f'{base}|{g}']
        if f'{base}|{g}' in T:return T[f'{base}|{g}']['t']
        return '�'
    return t
def page_units(doc,pg):
    fv=TB.fontver(doc,pg);U=[]
    for sp in pg.get_texttrace():
        if abs(sp['dir'][1])>0.01:continue
        fn=fv.get(sp['font'],sp['font'])
        # الاسم في texttrace بلا بادئة؛ نختار نسخة الخط بالرقم: الأرقام الكبيرة لخط CID الكامل
        full=[v for k,v in fv.items() if k.split('+')[-1]==sp['font']]
        for ch in sp['chars']:
            u=chr(ch[0]) if ch[0]>0 else ''
            if ch[1]==-1 and U and U[-1]['cont']:U[-1]['raw']+=u;continue
            f=sp['font']
            nv=lambda v:int(v.split('#')[1] or 0) if '#' in v else 0
            if len(full)>1:f=max(full,key=nv) if ch[1]>=150 else min(full,key=nv)
            elif full:f=full[0]
            U.append({'fn':f,'g':ch[1],'raw':u,'x':ch[2][0],'y':ch[2][1],'b':ch[3],'sz':sp['size'],'cont':True})
    for u in U:
        u['t']=label(u['fn'].split('#')[0] if 'Traditional' in u['fn'] else u['fn'],u['g'],u['raw'])
    return U
LTR=re.compile(r'^[0-9A-Za-z٠-٩%./,+]$')
def line_text(us):
    # مسافة مرسومة فوق حرف (أثر المحاذاة) ليست فاصلًا حقيقيًا
    ns=[u for u in us if u['t'].strip() and not u.get('mk')]
    def ovl(a,b):return min(a['b'][2],b['b'][2])-max(a['b'][0],b['b'][0])
    def drop(u,v):
        w=max(0.1,u['b'][2]-u['b'][0]);o=ovl(u,v)
        if abs(u['x']-v['x'])<0.6 and o>0.5*w:return True
        c=(u['b'][0]+u['b'][2])/2
        return o>=0.85*w and (v['b'][2]-v['b'][0])<6 and v['b'][0]+0.2<c<v['b'][2]-0.2
    us=[u for u in us if u['t'].strip() or not any(drop(u,v) for v in ns)]
    us=sorted(us,key=lambda u:(-(u['b'][0]+u['b'][2])/2,u.get('mk',0)));out=[];run=[]
    for u in us:
        t=u['t']
        if t and LTR.match(t[0]) and not AR.search(t):run.append(t);continue
        if run:out.append(''.join(reversed(run)).replace('','')) if False else out.extend(reversed(run));run=[]
        out.append(t)
    if run:out.extend(reversed(run))
    s=''.join(out)
    # الأقواس: في الترتيب المرئي تنعكس
    s=re.sub(r'\s+(?=[\u064b-\u0652])','',s)   # لا تبدأ كلمة بحركة
    # قوسان معكوسان حول رقم أو حرف واحد «)14(» (خط يرسم الشكل المرئي لا المنطقي) — لا يقع هذا النمط في نص سليم
    s=re.sub(r'\)(\s?[0-9٠-٩]+(?:\s*مكرر[اًا]*)?\s?|[أ-ي])\(',r'(\1)',s)
    return re.sub(r'\s+',' ',s).strip()
def page_lines(doc,pg,top=70):
    U=[u for u in page_units(doc,pg) if u['y']>top];W=pg.rect.width;mid=W/2
    # موضع الفاصل بين العمودين يختلف بين الصفحات الزوجية والفردية: أوسع منطقة فارغة قرب الوسط
    cov=[0]*int(W+2)
    for u in U:
        if not u['t'].strip():continue
        for x in range(int(u['b'][0]),int(u['b'][2])+1):
            if 0<=x<len(cov):cov[x]+=1
    lo,hi=int(W*0.35),int(W*0.65);best=(0,mid);run=0
    for x in range(lo,hi):
        if cov[x]<=2:
            run+=1
            if run>best[0]:best=(run,x-run/2)
        else:run=0
    if best[0]>=6:mid=best[1]
    # علامات التشكيل المنفصلة: تُلحق بخط أساس أقرب حرف تحتها أفقيًا
    base=[u for u in U if u['t'].strip() and not all(unicodedata.category(c)=='Mn' for c in u['t'])]
    for u in U:
        if u['t'] and all(unicodedata.category(c)=='Mn' for c in u['t']):
            cx=(u['b'][0]+u['b'][2])/2
            cand=[v for v in base if v['b'][0]-1<=cx<=v['b'][2]+1 and -8<v['y']-u['y']<22]
            if cand:
                y0=min(cand,key=lambda v:abs(v['y']-u['y']))['y']
                v=min([v for v in cand if abs(v['y']-y0)<1],key=lambda v:abs((v['b'][0]+v['b'][2])/2-cx))
                u['y']=v['y'];u['b']=list(v['b']);u['mk']=1
    rows=collections.defaultdict(list)
    for u in U:rows[round(u['y']/2.5)].append(u)
    # دمج الصفوف المتقاربة (فرق خط الأساس الصغير)
    keys=sorted(rows);merged=[];
    for k in keys:
        if merged and k-merged[-1][0]<=1:merged[-1][1].extend(rows[k])
        else:merged.append([k,list(rows[k])])
    full,R,L=[],[],[]
    for k,us in merged:
        xs=sorted(u['x'] for u in us)
        cross=any(a<mid-10<b and b-a<14 for a,b in zip(xs,xs[1:])) or (min(xs)<mid-30 and max(xs)>mid+30 and not any(b-a>14 for a,b in zip(xs,xs[1:]) if a<mid+25 and b>mid-25))
        y=us[0]['y']
        if cross:full.append((y,us))
        else:
            r=[u for u in us if u['x']>=mid];l=[u for u in us if u['x']<mid]
            if r:R.append((y,r))
            if l:L.append((y,l))
    def bb(us):
        xs=[v for u in us for v in (u['b'][0],u['b'][2])];ys=[v for u in us for v in (u['b'][1],u['b'][3])]
        return [round(min(xs),1),round(min(ys),1),round(max(xs),1),round(max(ys),1)]
    return [('F',y,line_text(u),bb(u)) for y,u in full],[('R',y,line_text(u),bb(u)) for y,u in R],[('L',y,line_text(u),bb(u)) for y,u in L]
if __name__=='__main__':
    doc=pymupdf.open(sys.argv[1]);pn=int(sys.argv[2]) if len(sys.argv)>2 else 0
    F,R,L=page_lines(doc,doc[pn])
    for c in (F,R,L):
        for x in c:print(x[0],round(x[1]),x[3],x[2])
