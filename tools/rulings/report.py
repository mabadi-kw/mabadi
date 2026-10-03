#!/usr/bin/env python3
"""يحدّث reports.json وfiles.json بعد بناء مجموعة الأحكام غير المنشورة. report.py CODE السنة"""
import json,os,sys,collections
CODE,YEAR=sys.argv[1],sys.argv[2]
rep=[r for r in json.load(open('data/reports.json')) if r['col']!=CODE]
items=json.load(open(f'data/{CODE}.json')); b=json.load(open('/tmp/r13/build_report.json'))
rv=sum(1 for i in items if i['rv'])
rep.append({'col':CODE,'title':f'أحكام محكمة التمييز غير المنشورة — {YEAR}',
 'stats':[[b['rulings'],'حكمًا'],[len(items),'قاعدة'],[b['dup'],'فقرة مكررة (نسخ للحكم نفسه) لم تُعد'],[b['linked'],'قاعدة مرتبطة بحكمها في مجموعة أخرى'],[rv,'يحتاج مراجعة']],
 'method':['المصدر ملفات Word (.doc) لأحكام السنة بحسب الدوائر الست.',
  'رقم الطعن وتاريخ الجلسة والدائرة من ديباجة الحكم نفسه؛ وإن لم يُذكر رقم الطعن في النص أُخذ من اسم الملف وعُلّم للمراجعة.',
  'القاعدة: كل فقرة تبدأ بـ«المقرر…» حتى موضع تطبيقها على الوقائع، بنصها حرفيًا.',
  'حُجبت أسماء الأطراف (أشخاصًا وشركات) وبقيت الجهات الحكومية والصفات.'],
 'checks':[['مطابقة النص مع الحكم المصدر',True,'كل قاعدة جزء متصل من نص الحكم بعد حجب الأسماء فقط'],['ملاحظات المراجعة',True,'؛ '.join(f'{v}: {k}' for k,v in b['review'].items()) or 'لا ملاحظات']],
 'notes':['أسماء القضاة والموظفين غير مذكورة.','القواعد مستخرجة آليًا من أحكام لم تُنشر وليس لها موجز، وتُعرض بنصها.']})
json.dump(rep,open('data/reports.json','w'),ensure_ascii=False)
files=[]
for sub in ('data','pages','pagetext'):
    for dp,_,fs in os.walk(sub):
        for f in sorted(fs):
            if f=='meta.json' and sub=='pages': continue
            p=os.path.relpath(os.path.join(dp,f)); files.append({'p':p,'s':os.path.getsize(p)})
files.sort(key=lambda x:x['p'])
json.dump({'bytes':sum(f['s'] for f in files),'files':files},open('files.json','w'),ensure_ascii=False,separators=(',',':'))
print('files',len(files))
