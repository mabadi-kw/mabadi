import sys,os,json,random,io,contextlib
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import privacy as P
random.seed(7)
src=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'test_privacy.py'),encoding='utf-8').read()
ns={'__file__':os.path.join(os.path.dirname(os.path.abspath(__file__)),'test_privacy.py')}; exec(src.split('ok = bad = 0')[0],ns)
out=[]
rnd=random.Random(7)
for t in ns['POS_T']:
    for _ in range(6):
        out.append([t.format(n=ns['nm'](),m=ns['nm'](),a=rnd.choice(ns['F']),b=rnd.choice(ns['F'])),'block'])
out+= [[s,'pass'] for s in ns['NEG']]
print(json.dumps(out,ensure_ascii=False))
