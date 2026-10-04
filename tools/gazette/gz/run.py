import sys,json,re;sys.path.insert(0,'gz')
from configs import CFG;import export as X
noimg='--noimg' in sys.argv;only=[a for a in sys.argv[1:] if not a.startswith('--')]
for c in CFG:
    if only and f"{c['n']}/{c['y']}" not in only:continue
    law,memo=X.export(c,noimg)
    print(law['id'],law['short'],'| مواد',len(law['articles']),'| صفحات',len(law['page_meta']['pdf']),'| أبواب',len(law['toc']),'| مذكرة',len(memo['paras']) if memo else None,'|',law['issued'],law['issued_hijri'],'|',law['text_version'][-60:])
