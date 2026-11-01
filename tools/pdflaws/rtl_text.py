import pymupdf,unicodedata,sys,re
FA=str.maketrans({'ی':'ي','ھ':'ه','ک':'ك','ي':'ي'})
ALEFS='اأإآ'
GAP=1.0
DBG=False
LTR=re.compile(r'[0-9A-Za-z٠-٩]')
def page_lines(page, ytol=3.5, mirror=False):
    rd=page.get_text('rawdict')
    C=[]
    for b in rd['blocks']:
        for l in b.get('lines',[]):
            for s in l['spans']:
                sid=len(C)
                for c in s['chars']:
                    x0,y0,x1,y1=c['bbox']
                    ch=unicodedata.normalize('NFKC',c['c'])
                    if ch and all(unicodedata.category(k)=='Mn' for k in ch.replace(' ','')) and ch.strip() and C and C[-1][6]==id(s):
                        C[-1][0]+=ch.strip(); continue
                    C.append([c['c'],x0,x1,(y0+y1)/2,s['size'],s['font'],id(s)])
    C.sort(key=lambda c:c[3])
    rows=[]
    for c in C:
        if rows and abs(rows[-1][0]-c[3])<ytol: rows[-1][1].append(c)
        else: rows.append([c[3],[c]])
    out=[]
    for y,cs in rows:
        cs.sort(key=lambda c:-(c[1]+c[2])/2)
        # ligature: zero-width alef followed by lam -> lam, alef
        i=0
        while i<len(cs)-1:
            if cs[i][0][:1] in ALEFS and cs[i][2]-cs[i][1]<0.2 and cs[i+1][0][:1]=='ل':
                lam,alef=cs[i+1],cs[i]
                if len(lam[0])>1: alef[0]=alef[0]+lam[0][1:]; lam[0]='ل'
                cs[i],cs[i+1]=lam,alef; i+=2
            else: i+=1
        # build string, insert space for gaps
        s=[];left=None
        for c in cs:
            if c[0]==' ': continue
            if left is not None and s and DBG and 0.3<left-c[2]<2.5: s.append('{%.1f}'%(left-c[2]))
            if left is not None and left-c[2]>GAP and s: s.append(' ')
            s.append(c[0])
            w=c[2]-c[1]
            left=c[1] if left is None or w>0.2 else min(left,c[1])
            if w>0.2: left=c[1]
        t=unicodedata.normalize('NFKC',''.join(s)).translate(FA)
        # reverse LTR runs (digits with internal / . , : -)
        t=re.sub(r'[0-9A-Za-z][0-9A-Za-z/.:\-]*[0-9A-Za-z]|[0-9A-Za-z]',lambda m:m.group(0)[::-1],t)
        if mirror: t=t.translate(str.maketrans('()',')('))
        t=re.sub(r' {2,}',' ',t).strip()
        if t: out.append((round(y),round(min(c[1] for c in cs)),round(max(c[2] for c in cs)),t,round(max(c[4] for c in cs),1),'Bold' in ''.join(c[5] for c in cs)))
    return out
if __name__=='__main__':
    d=pymupdf.open(sys.argv[1])
    for pn in map(int,sys.argv[2].split(',')):
        print('=== page',pn)
        for l in page_lines(d[pn-1],mirror='111' in sys.argv[1]): print(l)
