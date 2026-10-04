# نص كل صفحة: السطور العريضة ثم العمود الأيمن ثم الأيسر (مع إزالة التطويل المستعمل للتسوية)
import sys,os,re,json,pymupdf
sys.path.insert(0,'gz');import decode as D
def detat(s):
    s=re.sub(r'(?<=ه)ـ+(?=\s|$|\W)','ـ',s)      # «هـ» اختصار الهجري
    s=re.sub(r'(?<=ه)ـ+(?=[\u0621-\u064A])','',s)
    s=re.sub(r'(?<!ه)ـ+','',s)
    return re.sub(r'\s+',' ',s).strip()
def pages(path,a=0,b=None):
    doc=pymupdf.open(path);out=[]
    for pn in range(a,b if b else doc.page_count):
        F,R,L=D.page_lines(doc,doc[pn])
        top=[x for x in F if x[1]<(min([x2[1] for x2 in R+L]) if R+L else 1e9)]
        bot=[x for x in F if x not in top]
        head=[detat(x[2]) for x in top[:1]]
        lines=[(x[0],detat(x[2]),x[3]) for x in top[1:]+R+L+bot]
        out.append({'pn':pn,'head':head[0] if head else '','lines':lines})
    return out
if __name__=='__main__':
    P=pages(sys.argv[1]);os.makedirs('gz/txt',exist_ok=True)
    with open('gz/txt/'+os.path.basename(sys.argv[1])[:-4]+'.txt','w') as f:
        for p in P:
            f.write(f"\n===== ص{p['pn']+1} | {p['head']}\n")
            for k,t,b in p['lines']:f.write(f"{k} {t}\n")
    print(sys.argv[1],len(P))
