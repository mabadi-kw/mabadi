# سجل التعديلات والإلغاءات: من الوثائق الجديدة إلى القوانين والمواد القائمة في المكتبة، ثم تحديث فهرس التشريعات
import json,re,sys
sys.path.insert(0,'gz');from configs import CFG
SITE=__import__('os').path.abspath(__import__('os').path.join(__import__('os').path.dirname(__file__),'..','..','..'))+'/data/laws/'
def A(lid,n):return f'{lid}-A{n:04d}'
# (القانون المعدِّل، رقم مادته، القانون الأصلي، المادة الأصلية، طريقة التعديل، الجزء المعني)
EV=[
 ('10/2025',1,'51/1984','26','استبدال',None),
 ('65/2025',1,'16/1960','44','استبدال','الفقرة الأولى'),('65/2025',1,'16/1960','154','استبدال',None),('65/2025',1,'16/1960','164','استبدال',None),
 ('65/2025',2,'16/1960','154 مكرراً','إضافة',None),('65/2025',2,'16/1960','164 مكرراً','إضافة',None),
 ('65/2025',3,'16/1960','283','إضافة',None),('65/2025',3,'16/1960','284','إضافة',None),('65/2025',3,'16/1960','285','إضافة',None),('65/2025',3,'16/1960','286','إضافة',None),
 ('70/2025',1,'16/1960','159','إلغاء',None),('70/2025',1,'16/1960','182','إلغاء',None),
 ('72/2025',1,'46/1989','1','تعديل','استبدال عبارة (ألفين دينار) بعبارة (ألف دينار)'),('72/2025',1,'46/1989','2','استبدال',None),('72/2025',1,'46/1989','9','استبدال',None),
 ('73/2025',1,'26/1961','3 مكرراً','إضافة','المادة الثالثة مكرراً'),('73/2025',2,'26/1961','5','استبدال',None),
 ('79/2026',1,'15/1959','14','استبدال','البند (4)'),('79/2026',1,'15/1959','19','استبدال',None),('79/2026',2,'15/1959','7','إضافة فقرة',None),
 ('92/2026',1,'32/1967','23','استبدال',None),('92/2026',1,'32/1967','32','استبدال','البندان 2 و3'),('92/2026',1,'32/1967','40','استبدال','البند 2'),
 ('92/2026',2,'32/1967','5','إضافة فقرة',None),('92/2026',2,'32/1967','82','إضافة بند','البند 5'),
 ('6/2025',1,'38/1980','128','استبدال',None),('6/2025',1,'38/1980','152','استبدال','الفقرة الأولى'),('6/2025',1,'38/1980','153','استبدال',None),
 ('6/2025',1,'38/1980','154','استبدال','الفقرات الأولى والرابعة والخامسة'),('6/2025',1,'38/1980','155','استبدال',None),
]
# إلغاء مؤجَّل: يسري بعد نفاذ القانون الملغي، فيبقى القانون الملغى «نافذًا» إلى ذلك الحين مع لافتة تنبّه إلى الإلغاء
REPEAL_PENDING={'3/2006':('102/2026','I4','بعد مرور ستة أشهر من تاريخ نشره في الجريدة الرسمية (العدد 1811 بتاريخ 4/10/2026) — المادة الخامسة من مواد الإصدار'),
 '61/2007':('102/2026','I4','بعد مرور ستة أشهر من تاريخ نشره في الجريدة الرسمية (العدد 1811 بتاريخ 4/10/2026) — المادة الخامسة من مواد الإصدار')}
# قوانين لم يبدأ العمل بها بعد: نص قاعدة النفاذ كما في مواد الإصدار (لا يُحسب تاريخ)
PENDING_START={'102/2026':'يُعمل به بعد مرور ستة أشهر من تاريخ نشره في الجريدة الرسمية (العدد 1811 بتاريخ 4/10/2026) — المادة الخامسة من مواد الإصدار'}
REPEAL={'74/1983':('159/2025',83),'48/1987':('159/2025',83),'23/1990':('80/2026','I10'),'16/2020':('11/2026',30)}
I=json.load(open(SITE+'index.json'));IX={x['key']:x for x in I['laws']}
def lid(k):n,y=k.split('/');return f'LAW-{n}-{y}'
new={}
for c in CFG:
    L=json.load(open(SITE+lid(f"{c['n']}/{c['y']}")+'.json'))
    ent=dict(cat='law',id=L['id'],key=L['key'],type=L['type'],number=L['number'],year=L['year'],short=L['short'],title=L['title'],issued=L['issued'],status='نافذ',
        articles=len([a for a in L['articles'] if not a.get('issue')]),group=c['group'],text_version=L['text_version'],ver=f"الجريدة الرسمية، العدد {L['source']['issue']} ({L['source']['date']})",
        memo=__import__('os').path.exists(SITE+L['id']+'-M.json'),src='gazette')
    if c.get('amends'):ent['amends']=c['amends']
    if c.get('repeals'):ent['repeals']=c['repeals']
    new[L['key']]=ent
AM={'laws':{},'arts':{},'added':{}}
dates={k:v['issued'] for k,v in new.items()}
for by,bn,base,art,how,part in EV:
    blid=lid(base);e=dict(by=by,by_id=lid(by),by_art=A(lid(by),bn),how=how,date=dates.get(by))
    if part:e['part']=part
    AM['laws'].setdefault(base,[])
    if not any(x['by']==by for x in AM['laws'][base]):AM['laws'][base].append(dict(by=by,by_id=lid(by),date=dates.get(by),what='تعديل',short=new[by]['short']))
    if how=='إضافة':AM['added'].setdefault(base,[]).append(dict(e,n=art))
    else:AM['arts'].setdefault(f'{blid}#{art}',[]).append(e)
for base,(by,art) in REPEAL.items():
    ba=f'{lid(by)}-{art}' if isinstance(art,str) else A(lid(by),art)
    AM['laws'].setdefault(base,[]).append(dict(by=by,by_id=lid(by),by_art=ba,date=dates.get(by),what='إلغاء',short=new[by]['short']))
    x=IX.get(base)
    if x:x['status']='ملغى';x['repealed_by']=by
for base,(by,art,eff) in REPEAL_PENDING.items():
    AM['laws'].setdefault(base,[]).append(dict(by=by,by_id=lid(by),by_art=f'{lid(by)}-{art}',date=dates.get(by),what='إلغاء',pending=True,effective=eff,short=new[by]['short']))
    x=IX.get(base)
    if x:x['repeal_pending']=by
# أحداث إضافية من غير الجريدة المعالَجة هنا (مثل مساهمة «عمّالي»): ملف amend_extra.json إن وُجد
import os
XF=os.path.join(os.path.dirname(os.path.abspath(__file__)),'amend_extra.json')
if os.path.exists(XF):
    X=json.load(open(XF))
    for e in sorted(X.get('events',[]),key=lambda e:e.get('date') or ''):
        base=e['base_key'];rec=dict(by=e['by_key'],by_id=e['by_id'],by_art=e['by_art'],how=e['how'],date=e.get('date'),src=e.get('src'))
        if e.get('part'):rec['part']=e['part']
        AM['laws'].setdefault(base,[])
        if not any(x['by']==e['by_key'] for x in AM['laws'][base]):AM['laws'][base].append(dict(by=e['by_key'],by_id=e['by_id'],date=e.get('date'),what='تعديل',short=e.get('short'),src=e.get('src')))
        if e['how']=='إضافة':AM['added'].setdefault(base,[]).append(dict(rec,n=e['art']))
        else:AM['arts'].setdefault(f"{e['base_id']}#{e['art']}",[]).append(rec)
    for r in X.get('repeals',[]):
        AM['laws'].setdefault(r['base_key'],[]).append(dict(by=r['by_key'],by_id=r['by_id'],by_art=r.get('by_art'),date=r.get('date'),what='إلغاء',short=r.get('short'),src=r.get('src')))
        x=IX.get(r['base_key'])
        if x:x['status']='ملغى';x['repealed_by']=r['by_key']
# القوانين الجديدة التي تعدّل قوانين غير موجودة في المكتبة تبقى مذكورة في «amends» فقط
json.dump(AM,open(SITE+'amend.json','w'),ensure_ascii=False,indent=0)
keep=[x for x in I['laws'] if x['key'] not in new]
I['laws']=keep+list(new.values())
for x in I['laws']:
    if any(not e.get('pending') for e in AM['laws'].get(x['key'],[])) and x.get('status')!='ملغى':x['status']='معدّل'
    if x['key'] in PENDING_START:x['effective']=PENDING_START[x['key']]
json.dump(I,open(SITE+'index.json','w'),ensure_ascii=False,indent=1)
print(len(I['laws']),'entries;',len(new),'new;',{k:len(v) for k,v in AM['laws'].items()})
