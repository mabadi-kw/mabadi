# صفائح تحقق: قصاصة من صورة السطر في الجريدة وتحتها النص المستخرج، لمقارنة العين
import sys,random,pymupdf
sys.path.insert(0,'gz');import build as B
from PIL import Image,ImageDraw,ImageFont
FA=ImageFont.truetype('gz/naskh.ttf',26)
def sheet(specs,out,n=14,seed=1):
    random.seed(seed);rows=[]
    for f,num,yr,mode in specs:
        L,doc=B.doc_lines(f);i=B.find(L,rf'^مرسوم\s+بقانون\s+رقم\s*\(?\s*{num}\s*\)?\s*لسنة\s*{yr}');e=B.seg_end(L,i)
        pick=random.sample(range(i,e),min(n,e-i))
        for k in sorted(pick):
            l=L[k];pg=doc[l['pn']];x0,y0,x1,y1=l['bb']
            pix=pg.get_pixmap(dpi=150,clip=pymupdf.Rect(x0-3,y0-3,x1+3,y1+3))
            im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples).convert('L');rows.append((im,l['t'],f'{num}/{yr} ص{l["pn"]+1}'))
    W=max(max(r[0].width for r in rows)+20,900);H=sum(r[0].height+50 for r in rows)
    sh=Image.new('L',(W,H),255);d=ImageDraw.Draw(sh);y=0
    for im,t,tag in rows:
        sh.paste(im,(W-im.width-10,y));y+=im.height+2
        d.text((W-10,y),t,font=FA,fill=0,anchor='ra',direction='rtl');d.text((5,y+5),tag,fill=90);y+=46;d.line([(0,y-2),(W,y-2)],fill=200)
    sh.save(out)
if __name__=='__main__':
    C='gz/clean/'
    sheet([(C+'قانون المخدرات الجديد-1-20.pdf',159,2025,'numeric'),(C+'تعديل قانون تنظيم القضاء.pdf',80,2026,'issue')],'gz/v1.png',9,3)
    sheet([(C+'1808-11-42.pdf',87,2026,'issue'),(C+'قانون مكافحة التستر التجاري-2-5.pdf',78,2026,'numeric')],'gz/v2.png',9,4)
    sheet([(C+'المناقصات تعديل-2-5.pdf',94,2026,'o'),(C+'تعديل قانون الجيش-10-12.pdf',92,2026,'o'),(C+'قانون الجنسية تعديل.pdf',79,2026,'o'),(C+'Law65-2025.pdf',65,2025,'o')],'gz/v3.png',5,5)
    sheet([(C+'Law70-2025.pdf',70,2025,'o'),(C+'Law72-2025.pdf',72,2025,'o'),(C+'Law72-2025.pdf',73,2025,'o'),(C+'10-2025.pdf',10,2025,'o'),(C+'Law65-2025.pdf',66,2025,'o'),(C+'تعديل قانون الجيش-10-12.pdf',93,2026,'o')],'gz/v4.png',4,6)
