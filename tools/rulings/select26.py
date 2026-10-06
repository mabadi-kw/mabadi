#!/usr/bin/env python3
"""يختار من ناتج parse26 ما يصلح للنشر ويحوّله إلى صيغة build.py.
select26.py <parsed26.json> <out.json> <excluded.json>
- يُستبعد: الحكم التمهيدي، ما تعارض فيه رقم الطعن بين الرأس والمنطوق واسم الملف ولم يُحسم، المكرر (يُبقى أكمل نسخة).
- القرار (غرفة مشورة/فحص الطعون) يُذكر في الإسناد."""
import sys,json,collections
src,outp,exp=sys.argv[1:4]
R=json.load(open(src,encoding='utf-8'))
KL={'مشورة':'غرفة المشورة','فحص':'لجنة فحص الطعون'}
ex=[];groups=collections.defaultdict(list)
for r in R:
    why=None
    if not r['appeal']: why='رقم الطعن غير معروف'
    elif r['final'] is False: why='حكم تمهيدي (غير منهٍ للخصومة)'
    elif r['final'] is None: why='منطوق غير مقروء'
    elif r.get('suspect') and not any('اعتُمد' in f for f in r['flags']): why='تعارض رقم الطعن بين الرأس والمنطوق/اسم الملف — مسودة لم تُصحح'
    elif any('لا يطابق' in f for f in r['flags']) and not any('اعتُمد' in f for f in r['flags']): why='رقم الطعن في النص لا يطابق اسم الملف — يُحتمل نسخة من حكم آخر'
    elif not r['rules']: why='لا توجد فقرة «المقرر…»'
    if why: ex.append({'id':r['id'],'why':why,'appeal':r['appeal'],'kind':r['kind'],'rel':r['rel']}); continue
    k='+'.join(f'{n}/{y}' for n,y in r['appeal']['pairs'])
    groups[k].append(r)
out=[]
for k,g in groups.items():
    g.sort(key=lambda r:(len(r['flags']),-len(r['rules']),-(r.get('mtime') or 0)))
    keep=g[0]
    for d in g[1:]: ex.append({'id':d['id'],'why':'نسخة مكررة من الطعن نفسه','appeal':d['appeal'],'kind':d['kind'],'rel':d['rel']})
    r=dict(keep)
    r['file']=r['rel'].split('/')[-1]; r['appeal_src']='text'; r['circuit_dir']=r['circuit']
    r['circuit_label']=KL.get(r['kind'])
    out.append(r)
json.dump(out,open(outp,'w',encoding='utf-8'),ensure_ascii=False)
json.dump(ex,open(exp,'w',encoding='utf-8'),ensure_ascii=False,indent=0)
print('kept',len(out),'rules',sum(len(r['rules']) for r in out),'excluded',len(ex),collections.Counter(e['why'] for e in ex))
