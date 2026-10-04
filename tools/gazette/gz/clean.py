# إزالة العلامة المائية (نص مائل بخط MicrosoftSansSerif أضافته أداة ضغط الملفات) من كل صفحة، وحفظ نسخة نظيفة
import sys,os,pymupdf
def clean(src,dst):
    d=pymupdf.open(src);n=0
    for p in d:
        refs={f[4] for f in p.get_fonts(full=True) if 'MicrosoftSansSerif' in f[3]}
        if not refs:continue
        for x in p.get_contents():
            s=d.xref_stream(x)
            if any(('/'+r+' ').encode() in s for r in refs) and b'BT' in s:
                # نحذف فقط كتل النص التي تستعمل خط العلامة المائية
                import re
                s2=re.sub(rb'BT\s*/('+b'|'.join(r.encode() for r in refs)+rb')\s[^T]*?Tf.*?ET',b'',s,flags=re.S)
                if s2!=s:d.update_stream(x,s2);n+=1
    d.save(dst,garbage=3,deflate=True);return n
if __name__=='__main__':
    os.makedirs('gz/clean',exist_ok=True)
    for f in sys.argv[1:]:
        print(os.path.basename(f),clean(f,'gz/clean/'+os.path.basename(f)))
