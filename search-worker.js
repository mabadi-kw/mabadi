// مبادئ التمييز — عامل البحث: يحمل نصوص المبادئ مطبَّعة خارج الواجهة، ويجيب عن مطابقة عبارة البحث،
// فلا تتجمد الشاشة ولا تُثقل ذاكرة الواجهة. التطبيع والمطابقة هنا مطابقان لما في app.js حرفًا بحرف.
const norm=s=>s.replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/\s+/g,' ').trim();
const nsOf=p=>norm(p.p.join(' ')+' '+(p.rule||'')+' '+(p.ttl||'')+' '+p.c.map(c=>c.raw).join(' ')+' '+p.fn.join(' '));
const SYNRE={},AR='\\u0621-\\u064A';
function synHit(ns,t){const r=SYNRE[t]||(SYNRE[t]=new RegExp(`(?:^|[^${AR}])(?:[وفبلك]?(?:ال|لل)?)${t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}(?=$|[^${AR}]|ه(?:ا|م|ما)?(?:$|[^${AR}])|ات|ين|ون)`));return r.test(ns);}
const IDS=[],NS=[];let total=0,loaded=0,done=false;
let CORE_N=0,coreDone=false;
async function load(cols,coreN){total=cols.length;CORE_N=coreN||cols.length;
  for(const c of cols){try{const a=await fetch('data/'+c+'.json').then(r=>r.json());for(const p of a){IDS.push(p.id);NS.push(nsOf(p));}}catch(_){}
    loaded++;postMessage({type:'loaded',loaded,total,n:IDS.length});
    if(loaded===CORE_N&&!coreDone){coreDone=true;postMessage({type:'core'});}
    if(coreDone&&PEND){const q=PEND;PEND=null;answer(q);}
    await new Promise(r=>setTimeout(r,0));}
  done=true;coreDone=true;postMessage({type:'done',n:IDS.length});if(PEND){const q=PEND;PEND=null;answer(q);}}
let PEND=null;
function answer(m){const qa=m.qa,out=[];
  for(let i=0;i<NS.length;i++){const ns=NS[i];if(qa.every(al=>ns.includes(al.lit)||al.alts.some(t=>synHit(ns,t))))out.push(IDS[i]);}
  postMessage({type:'r',q:m.q,seq:m.seq,ids:out,partial:!done});}
onmessage=e=>{const m=e.data;
  if(m.type==='load')load(m.cols,m.core);
  else if(m.type==='q'){if(done)answer(m);else PEND=m;}};
