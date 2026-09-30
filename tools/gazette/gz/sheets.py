# صفائح مراجعة: رسم كل حرف (بخطه المضمّن) مع رقمه والترميز المقترح، للتحقق بالعين
import json,pymupdf,glob,os,freetype,collections
from PIL import Image,ImageDraw,ImageFont
U='/mnt/user-data/uploads/مكتبة التشريعات/'
NORM=lambda fn:fn.split('+')[-1].replace('Traditional Arabic,Bold','TraditionalArabic-Bold').replace('Traditional Arabic','TraditionalArabic')
T=json.load(open('gz/table.json'))
# خطوط مضمّنة: لكل خط، قائمة ملفات الخط (المجموعات الجزئية) — نأخذ أول مجموعة تحوي الحرف
faces=collections.defaultdict(list)
for p in sorted(glob.glob('gz/fonts/*.ttf')):
    base=os.path.basename(p).split('#')[0];faces[base].append(freetype.Face(p))
def render(fn,g,sz=48):
    for fc in faces.get(fn,[]):
        if g>=fc.num_glyphs or fc.num_glyphs<500:continue
        try:
            fc.set_pixel_sizes(0,sz);fc.load_glyph(g,freetype.FT_LOAD_RENDER)
            bm=fc.glyph.bitmap
            if bm.width==0:continue
            im=Image.frombytes('L',(bm.width,bm.rows),bytes(bm.buffer));return im
        except Exception:continue
    return None
lab=ImageFont.truetype('../guide/fonts/noto-naskh-arabic-arabic-400-normal.woff2',20) if False else None
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',13)
AR=['gz/naskh.ttf']
FA=ImageFont.truetype(AR[0],22) if AR else F
items=sorted(T.items(),key=lambda kv:(kv[0].split('|')[0],int(kv[0].split('|')[1])))
items=[kv for kv in items if int(kv[0].split('|')[1])>=150]
cols,cw,ch=12,110,110;per=cols*9
for s in range(0,len(items),per):
    chunk=items[s:s+per];rows=(len(chunk)+cols-1)//cols
    sh=Image.new('L',(cols*cw,rows*ch),255);d=ImageDraw.Draw(sh)
    for i,(k,v) in enumerate(chunk):
        fn,g=k.split('|');x,y=(cols-1-i%cols)*cw,(i//cols)*ch
        im=render(fn,int(g))
        if im:
            im=Image.eval(im,lambda p:255-p);sh.paste(im,(x+(cw-im.width)//2,y+8))
        wk=v['alt'] and v['files']/v['nfiles']<0.75
        d.text((x+4,y+ch-38),f"{'b' if ',' in fn else 'B' if 'Bold' in fn else 'R'}{g}{' !' if wk else ''}",font=F,fill=0)
        try:d.text((x+cw-8,y+ch-30),v['t'].replace(' ','␣'),font=FA,fill=0,anchor='ra',direction='rtl')
        except Exception:d.text((x+cw-40,y+ch-30),v['t'],font=FA,fill=0)
        d.rectangle([x,y,x+cw-1,y+ch-1],outline=200)
    sh.save(f'gz/sheet{s//per:02d}.png')
print(len(items),'glyphs',{k:len(v) for k,v in faces.items()})
