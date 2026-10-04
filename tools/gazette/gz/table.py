# جدول الحروف: لكل (خط، رقم حرف) الترميز الأغلب عبر كل ملفات الجريدة، مع نسبة الاتفاق — يُستعمل لتصحيح الترميز الخاطئ في بعض الملفات
import sys,collections,json,pymupdf,glob,os
U='/mnt/user-data/uploads/مكتبة التشريعات/'
import freetype,hashlib
NORM=lambda fn:fn.split('+')[-1]
_FV={};_PG={}
def fontver(doc,pg):
    """اسم الخط الكامل (مع البادئة) ← (الاسم الموحّد#عدد الحروف) لتمييز إصدارات الخط"""
    key=(id(doc),pg.number)
    if key in _PG:return _PG[key]
    m={}
    for x in pg.get_fonts():
        xref,name=x[0],x[3]
        if 'Traditional' not in name:m[name]=NORM(name);continue
        ck=(id(doc),xref)
        if ck not in _FV:
            nm,ext,typ,buf=doc.extract_font(xref);n=0
            if buf:
                path='/tmp/_f.ttf';open(path,'wb').write(buf)
                try:n=freetype.Face(path).num_glyphs
                except Exception:n=0
                os.makedirs('gz/fonts',exist_ok=True);fp=f'gz/fonts/{NORM(name)}#{n}#{hashlib.md5(buf).hexdigest()[:8]}.ttf'
                if n and not os.path.exists(fp):open(fp,'wb').write(buf)
            _FV[ck]=f'{NORM(name)}#{n}'
        m[name]=_FV[ck]
    _PG[key]=m;return m
def fkey(fn):
    fn=fn.split('+')[-1];return fn
def units(pg,doc=None):
    """يعيد وحدات (خط، رقم، نص، مستطيل، أصل) بترتيب المحتوى؛ الحرف -1 تتمة لحرف متعدد الأحرف"""
    out=[];fv=fontver(doc,pg) if doc else {}
    for sp in pg.get_texttrace():
        fn=fv.get(sp['font'],fkey(sp['font']))
        for ch in sp['chars']:
            u=chr(ch[0]) if ch[0]>0 else ''
            if ch[1]==-1 and out and out[-1][0]==fn:out[-1][2]+=u;continue
            out.append([fn,ch[1],u,ch[3],ch[2],sp['size'],sp.get('seqno',0)])
    return out
if __name__=='__main__':
    files=sys.argv[1:]
    C=collections.defaultdict(collections.Counter);FF=collections.defaultdict(collections.Counter)
    for f in files:
        doc=pymupdf.open(f);b=os.path.basename(f)
        for pg in doc:
            fontver(doc,pg)
            for fn,g,t,*_ in units(pg):
                if 'Traditional' not in fn or g<150:continue
                C[(fn,g)][t]+=1;FF[(fn,g,t)][b]+=1
    T={}
    for (fn,g),c in C.items():
        (t,n),tot=c.most_common(1)[0],sum(c.values())
        # الأغلبية بعدد الملفات لا بعدد المرات (ملف واحد كبير خاطئ لا يغلب)
        byfile=collections.Counter({u:len(FF[(fn,g,u)]) for u in c})
        tf,nf=byfile.most_common(1)[0]
        T[f'{fn}|{g}']={'t':tf,'files':nf,'nfiles':sum(byfile.values()),'n':tot,'alt':{u:[c[u],byfile[u]] for u in c if u!=tf}}
    json.dump(T,open('gz/table.json','w'),ensure_ascii=False,indent=0)
    weak=[(k,v) for k,v in T.items() if v['alt'] and v['files']/v['nfiles']<0.75]
    print(len(T),'glyphs; weak:',len(weak))
