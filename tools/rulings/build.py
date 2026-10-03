#!/usr/bin/env python3
"""يبني مجموعة «أحكام غير منشورة» من ناتج parse.py ويدمجها في بيانات المكتبة.
build.py <parsed.json> <CODE> <سنة> [--dry]
كل عنصر = فقرة قاعدة واحدة من حكم واحد (نصها حرفيًا بعد حجب أسماء الأطراف فقط)، واسناده «(الطعن … جلسة …)»."""
import os,re,sys,json,collections
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.abspath(os.path.join(HERE,'..','..'))
sys.path.insert(0,os.path.join(HERE,'..','journal','cls'))
from taxonomy import rule_topics
from laws import extract_ctx,SUSPECT
from laws import law_label
src,CODE,YEAR=sys.argv[1],sys.argv[2],sys.argv[3]
mp=os.path.join(ROOT,'data','meta.json'); META=json.load(open(mp,encoding='utf-8')); TL,LL=META['toplab'],META['lawlab']
R=json.load(open(src,encoding='utf-8'))
FALL={'جزائي':'G','إداري':'A','أحوال شخصية':'F','تجاري':'S','عمالي':'V','مدني':'V'}
FAMN={'V':'المواد المدنية','G':'الجزاء (قانون العقوبات)','A':'القانون الإداري والوظيفة العامة','F':'الأحوال الشخصية','S':'التجارة والشركات والأسواق المالية والبنوك'}
for k,v in TL.items(): FAMN.setdefault(k.split(':')[0] if ':' in k else k[0],v[0])
CHLAB={'عمالي':'عمالي','تجاري':'تجاري','مدني':'مدني','إداري':'إداري','جزائي':'جزائي','أحوال شخصية':'أحوال شخصية'}
def key(r):
    a=r['appeal']
    if not a: return None,None
    prs=a.get('pairs') or [(n,a['year']) for n in a['nums']]
    k='+'.join(f'{n}/{y}' for n,y in prs)
    if r['date']: k+='@'+r['date']
    nums='، '.join(str(n) for n,_ in prs)
    y=prs[-1][1]
    d=''
    if r['date']:
        yy,mm,dd=r['date'].split('-'); d=f' جلسة {int(dd)}/{int(mm)}/{yy}'
    lab='الطعنان' if len(prs)>1 else 'الطعن'
    return (k if r['date'] else None),f'({lab} {nums}/{y} {r["circuit"]}{d})'
RK=collections.defaultdict(set); OLD={}
for c in META['order']:
    if c==CODE: continue
    d=json.load(open(os.path.join(ROOT,'data',c+'.json'),encoding='utf-8')); OLD[c]=d
    for p in d:
        for x in p['c']:
            if x.get('k'): RK[x['k']].add(p['id'])
ws=lambda s:re.sub(r'\s+',' ',s).strip()
items=[];seen={};dupfile=0;duprule=0
R.sort(key=lambda r:(r['circuit'],r['date'] or '9',r['appeal']['nums'][0] if r['appeal'] else 0))
for r in R:
    k,raw=key(r)
    if raw is None: continue
    for x in r['rules']:
        t=x['t'].strip()
        h=(k or r['file'],ws(t)[:240])
        if h in seen:
            duprule+=1; seen[h]['src']['dupf']=seen[h]['src'].get('dupf',0)+1; continue
        rv=[]
        if r['appeal_src']=='filename': rv.append('رقم الطعن مأخوذ من اسم الملف لأنه غير مذكور في نص الحكم')
        if any('لا يطابق' in f for f in r['flags']): rv.append('رقم الطعن في النص لا يطابق اسم الملف')
        if not r['date']: rv.append('تاريخ الجلسة غير مقروء')
        if x['whole'] and len(t)>1500: rv.append('قاعدة طويلة لم يتحدد فيها موضع تطبيقها على الوقائع؛ تُراجع حدودها')
        if len(t)<120: rv.append('قاعدة قصيرة؛ تُراجع')
        if '[…]' in t: rv.append('حُجب فيها اسم؛ يُتحقق أنه اسم شخص أو شركة لا لفظ آخر')
        if t.rstrip().endswith(':'): rv.append('تنتهي بنقطتين؛ قد يكون الاقتباس ناقصًا')
        if r['n_redacted']==0 and r['n_names']==0 and r['circuit']!='إداري': rv.append('لم تُستخرج أسماء الأطراف لحجبها؛ تُراجع')
        tp=rule_topics(t[:600]) or [FALL.get(r['circuit'],'V')+':غير مصنف']
        laws=collections.OrderedDict()
        for ref in extract_ctx(t):
            L=laws.setdefault(ref['law'],[])
            for a in ref['articles']:
                if a not in L: L.append(a)
        it={'col':CODE,'n':0,'np':0,'id':'','sec':[ 'الدائرة '+{'أحوال شخصية':'الأحوال الشخصية'}.get(r['circuit'],r['circuit']) if False else r['circuit']],
            'p':[t],'c':[{'raw':raw,'ch':r['circuit'],'k':k}],'cp':[1],'sa':[],'fn':[],'pg':[],'rg':[],'rv':rv,'rel':[],
            'tp':[[x_,'k',0 if x_ in TL else 1] for x_ in tp],'lw':[[l,a,1 if l in SUSPECT else 0] for l,a in laws.items()],
            'src':{'unpub':1,'file':r['file'],'dir':r['circuit_dir'],'rid':r['id'],'cl':r['circuit_label']}}
        seen[h]=it; items.append(it)
for i,it in enumerate(items,1): it['n']=i; it['id']=f'{CODE}-{i:05d}'
# الموضوعات والقوانين الجديدة
for it in items:
    for t in it['tp']:
        if t[0] not in TL:
            f,kw=t[0].split(':',1); TL[t[0]]=[FAMN.get(f,f),kw]
    for l in it['lw']:
        if l[0] not in LL: LL[l[0]]=law_label(l[0])
# الربط بالأحكام نفسها
for it in items:
    k=it['c'][0].get('k')
    if k: RK[k].add(it['id'])
nlink=0;touched=collections.defaultdict(set)
for it in items:
    k=it['c'][0].get('k'); oth=sorted(i for i in RK.get(k,()) if i!=it['id']) if k else []
    it['rel']=oth
    if any(not i.startswith(CODE) for i in oth): nlink+=1
    for i in oth:
        oc=i.split('-')[0]
        if oc in OLD:
            for p in OLD[oc]:
                if p['id']==i and it['id'] not in p.get('rel',[]): p['rel']=sorted(set(p.get('rel',[]))|{it['id']}); touched[oc].add(i)
if '--dry' in sys.argv:
    print(len(items),'rules; dup rules',duprule,'; linked',nlink,'; review',sum(1 for i in items if i['rv'])); sys.exit()
s=json.dumps(items,ensure_ascii=False,separators=(',',':'))
open(os.path.join(ROOT,'data',CODE+'.json'),'w',encoding='utf-8').write(s)
META['cols'][CODE]={'name':f'غير منشورة {YEAR}','title':f'أحكام محكمة التمييز غير المنشورة — {YEAR}','off':0,'n':len(items),'bytes':len(s.encode()),'noimg':True,'unpub':True,'src':'unpub','gp':20,'docs':[],'last':0}
if CODE not in META['order']: META['order'].append(CODE)
for oc,ids in touched.items():
    s2=json.dumps(OLD[oc],ensure_ascii=False,separators=(',',':')); open(os.path.join(ROOT,'data',oc+'.json'),'w',encoding='utf-8').write(s2); META['cols'][oc]['bytes']=len(s2.encode())
json.dump(META,open(mp,'w',encoding='utf-8'),ensure_ascii=False,separators=(',',':'))
print(CODE,len(items),'قاعدة؛ مكررة محذوفة',duprule,'؛ مرتبطة بمجموعات أخرى',nlink,'؛ تحتاج مراجعة',sum(1 for i in items if i['rv']),'؛ rel محدّث',{k:len(v) for k,v in touched.items()})
json.dump({'rulings':len(R),'rules':len(items),'dup':duprule,'linked':nlink,'review':collections.Counter(re.sub(r'\s*\(.*$','',x) for i in items for x in i['rv'])},open('/tmp/r13/build_report.json','w'),ensure_ascii=False,default=dict)
