(async function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function norm(s){return s.replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/\s+/g,' ').trim();}
function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,1800);}
// ---------- load
const META=await fetch('data/meta.json').then(r=>r.json());
const ORDER=META.order, COLS=META.cols, TL=META.toplab, LL=META.lawlab;
const LD=$('loading'); let done=0;
const arrs=await Promise.all(ORDER.map(c=>fetch('data/'+c+'.json').then(r=>r.json()).then(a=>{done++;if(LD)LD.textContent='جارٍ تحميل المكتبة… '+done+' من '+ORDER.length;return a;})));
const PR=arrs.flat(); const BYID={}; PR.forEach(p=>BYID[p.id]=p);
const RUL={};
PR.forEach(p=>{p.full=p.p.join('\n');p.ns=norm(p.full+' '+(p.rule||'')+' '+(p.ttl||'')+' '+p.c.map(c=>c.raw).join(' ')+' '+p.fn.join(' '));
  new Set(p.c.map(c=>c.k).filter(Boolean)).forEach(k=>(RUL[k]=RUL[k]||[]).push(p.id));});
$('sub').textContent=`${PR.length.toLocaleString('ar')} مبدأً من ${ORDER.length} مجموعة · بحث ونسخ وطباعة · يعمل دون اتصال بعد أول زيارة`;
// ---------- filters
const fcol=$('fcol'); ORDER.forEach(k=>fcol.insertAdjacentHTML('beforeend',`<option value="${k}">${esc(COLS[k].name)} (${COLS[k].n})</option>`));
const FORD='PLVCSRAFGHJT'; const famOf=t=>TL[t][0];
const tcount={},lcount={},acount={};
PR.forEach(p=>{new Set(p.tp.map(x=>x[0])).forEach(t=>tcount[t]=(tcount[t]||0)+1);
  p.lw.forEach(([l,as])=>{lcount[l]=(lcount[l]||0)+1;as.forEach(a=>{const k=l+'|'+a;acount[k]=(acount[k]||0)+1})})});
const TORD=Object.keys(tcount).sort((a,b)=>FORD.indexOf(a[0])-FORD.indexOf(b[0])||(a.includes(':')-b.includes(':'))||(a.includes(':')?tcount[b]-tcount[a]:a.localeCompare(b)));
const FAMS=[...new Set(TORD.map(famOf))];
const ftp=$('ftp');
FAMS.forEach(f=>{ftp.insertAdjacentHTML('beforeend',`<optgroup label="${esc(f)}">${TORD.filter(t=>famOf(t)===f).map(t=>`<option value="${esc(t)}">${esc(TL[t][1])} (${tcount[t]})</option>`).join('')}</optgroup>`)});
const LORD=Object.keys(lcount).sort((a,b)=>lcount[b]-lcount[a]);
const flw=$('flw'), fart=$('fart');
LORD.forEach(l=>flw.insertAdjacentHTML('beforeend',`<option value="${esc(l)}">${esc(LL[l])} (${lcount[l]})</option>`));
const toW=s=>s.replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s+/g,'');
const chs=[...new Set(PR.flatMap(p=>p.c.map(c=>c.ch)).filter(Boolean))];
const fch=$('fch'); chs.forEach(s=>fch.insertAdjacentHTML('beforeend',`<option>${esc(s)}</option>`));
function terms(q){const out=[];q.replace(/"([^"]+)"|«([^»]+)»|(\S+)/g,(m,a,b,c)=>{const t=norm((a||b||c).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)));if(t)out.push(t)});return out;}
const CLS={'ا':'[اأإآ]','ي':'[يىئ]','ه':'[هة]','و':'[وؤ]'};
function hlRegex(ts){if(!ts.length)return null;const parts=ts.map(t=>[...t].map(ch=>{if(ch===' ')return '\\s+';const b=CLS[ch]||ch.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&');return b+'[\\u064B-\\u0652\\u0640]*';}).join(''));return new RegExp('('+parts.join('|')+')','g');}
function hl(s,re){s=esc(s);return re?s.replace(re,'<mark>$1</mark>'):s;}
let shown=40,cur=[];
function run(){
  const ts=terms($('q').value),tp=ftp.value,lw=flw.value,art=toW(fart.value),col=fcol.value,c=fch.value,rv=$('frv').checked;
  cur=PR.filter(p=>ts.every(t=>p.ns.includes(t))&&(!col||p.col===col)&&(!tp||p.tp.some(x=>x[0]===tp))&&(!c||p.c.some(x=>x.ch===c))&&(!rv||p.rv.length)
    &&(!lw&&!art||p.lw.some(([l,as])=>(!lw||l===lw)&&(!art||as.some(a=>a===art||a.split('/')[0]===art)))));
  $('count').textContent=`${cur.length.toLocaleString('ar')} من ${PR.length.toLocaleString('ar')} مبدأ`;
  const re=hlRegex(ts), L=$('list');
  L.innerHTML=cur.length?cur.slice(0,shown).map(p=>card(p,re)).join(''):'<div class="empty">لا توجد نتائج. جرّب كلمة أقصر أو أزل أحد المرشحات.</div>';
  $('more').hidden=cur.length<=shown;
}
// ---------- card
function blocks(p){const out=[];let ci=0;const pos=p.cp&&p.cp.length===p.c.length?p.cp:p.c.map(()=>p.p.length);
  p.p.forEach((x,k)=>{out.push(['t',x]);while(ci<p.c.length&&pos[ci]===k+1){out.push(['c',p.c[ci]]);ci++;}});
  while(ci<p.c.length){out.push(['c',p.c[ci]]);ci++;}return out;}
const MT={b:'مصنَّف من أبواب الكتاب',k:'الكلمة المفتاحية للمكتب الفني',a:'تصنيف بالقراءة الآلية — يحتاج تأكيدًا بشريًا'};
const printed=p=>p.pg.map(g=>g+COLS[p.col].off);
function card(p,re,opt={}){
  const html=[];let open=false;
  blocks(p).forEach(([k,x])=>{if(k==='t'){if(open){html.push('</ul>');open=false;}html.push(`<p>${hl(x,re)}</p>`);}
    else{if(!open){html.push('<ul class="cits">');open=true;}
      const n=x.k&&RUL[x.k]?RUL[x.k].length:0;
      html.push(`<li>${hl(x.raw,re)}${x.k?`<button class="rk" data-go="#/r/${esc(x.k)}" title="كل ما ورد عن هذا الحكم في المكتبة">الحكم${n>1?' ('+n+')':''}</button>`:''}</li>`);}});
  if(open)html.push('</ul>');
  if(!p.c.length)html.push('<ul class="cits"><li>لا يوجد إسناد في المصدر</li></ul>');
  const rel=(p.rel||[]).map(id=>{const q=BYID[id];return q?`<button class="chip rel" data-go="#/p/${id}">${esc(COLS[q.col].name)} ${q.n}</button>`:''}).join('');
  const tps=p.tp.map(([t,m,lo])=>TL[t]?`<button class="chip tp${m==='a'?' auto':''}${lo?' low':''}" data-tp="${esc(t)}" title="${esc(TL[t][0])} — ${MT[m]||''}${lo?' (ثقة منخفضة)':''}">${esc(TL[t][1])}</button>`:'');
  const lws=p.lw.map(([l,as,su])=>`<button class="chip lw${su?' sus':''}" data-lw="${esc(l)}" title="${esc(LL[l]||l)}${su?' — رقم القانون كما ورد في المصدر، ويحتاج مراجعة':''}">${as.length?'م '+esc(as.slice(0,4).join('، '))+(as.length>4?'…':'')+' · ':''}${l==='دستور'?'الدستور':'ق '+esc(l)}</button>`);
  const chips=[`<span class="chip col">${esc(COLS[p.col].name)}</span>`,...(p.lab?[`<span class="chip">${esc(p.lab)}</span>`]:[]),...tps,...lws].join('');
  const pp=printed(p);
  return `<article class="pr" id="p${p.id}">
    <div class="num">${p.n}${p.np!==p.n?`<small title="الرقم كما طُبع في المصدر">طُبع ${p.np}</small>`:''}<div class="idchip">${p.id}</div></div>
    <div class="body">
      <div class="crumb">${p.sec.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
      ${p.ttl?`<div class="ttl">${hl(p.ttl,re)}</div>`:''}<div class="text">${html.join('')}</div>${p.rule?`<details class="rule"${opt.open||(re&&(re.lastIndex=0,re.test(p.rule)))?' open':''}><summary>القاعدة — نص الحكم</summary><div class="text">${hl(p.rule,re)}</div></details>`:''}
      ${p.fn.length?`<div class="fn">${p.fn.map(esc).join('<br>')}</div>`:''}
      ${p.sa.length?`<div class="sa">${p.sa.map(esc).join('<br>')}</div>`:''}
      <div class="meta">${p.rv.length?'<span class="chip flag">يحتاج مراجعة</span>':''}${chips}${rel?`<span class="relw">الحكم نفسه في: ${rel}</span>`:''}
        <span class="actions"><button class="btn" data-copy="${p.id}">نسخ</button><button class="btn" data-link="${p.id}" title="انسخ رابطًا ثابتًا لهذا المبدأ">رابط</button>${opt.page?'':`<button class="btn" data-go="#/p/${p.id}">فتح</button>`}<button class="btn" data-src="${p.id}">صفحة ${pp.join('–')}</button></span></div>
    </div>
    ${p.rv.length?`<div class="review">${p.rv.map(esc).join(' · ')}</div>`:''}
  </article>`;
}
// ---------- copy (عقد البيانات §10)
function copyText(p){
  const txt=blocks(p).filter(b=>b[0]==='t').map(b=>b[1]).join('\n');
  return (p.ttl?p.ttl+'\n':'')+txt+(p.rule?'\nالقاعدة:\n'+p.rule:'')+'\n'+(p.c.length?p.c.map(c=>c.raw).join('\n'):'(لا يوجد إسناد في المصدر)')+(p.fn.length?'\n'+p.fn.join('\n'):'')+
    `\n[المصدر: ${COLS[p.col].title} — ص ${printed(p).join('–')}]`;
}
function clip(txt,ok){(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(ok,()=>{const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(_){toast('تعذّر النسخ')}ta.remove()});}
const BASE=location.href.split('#')[0];
// ---------- source pages
const PT={};
async function pageLines(col,g){const b=Math.floor((g-1)/1000),k=col+'/'+b;
  if(!PT[k])PT[k]=fetch(`pagetext/${col}/t${String(b).padStart(3,'0')}.json`).then(r=>r.ok?r.json():{}).catch(()=>({}));
  return (await PT[k])[g]||[];}
function pagesHTML(p){
  const C=COLS[p.col],PW=C.pw||595.276,PH=C.ph||822.047,cr=C.crop||[0,0,1,1],cell=C.cell||[684,1000];
  const cw=cr[2]-cr[0],chh=cr[3]-cr[1];
  return p.pg.map(g=>{const reg=p.rg.find(r=>r.page===g);
    const box=reg?`<div class="hlbox" style="left:${((reg.bbox[0]-6)/PW-cr[0])/cw*100}%;top:${((reg.bbox[1]-4)/PH-cr[1])/chh*100}%;width:${(reg.bbox[2]-reg.bbox[0]+12)/PW/cw*100}%;height:${(reg.bbox[3]-reg.bbox[1]+8)/PH/chh*100}%"></div>`:'';
    const gp=C.gp||20,gc=gp/10,b=Math.floor((g-1)/gp),k=(g-1)%gp,cx=k%gc,ry=Math.floor(k/gc);
    const img=`<div class="pgimg" role="img" aria-label="صورة الصفحة ${g+C.off} من المصدر" style="aspect-ratio:${cell[0]}/${cell[1]};background-image:url(pages/${p.col}/g${String(b).padStart(3,'0')}.webp);background-size:${gc*100}% 1000%;background-position:${cx*100/(gc-1)}% ${ry*100/9}%">${box}</div>`;
    return `<figure class="pg">${img}<figcaption>الصفحة ${g+C.off} من الكتاب</figcaption></figure><details class="pgtxt" data-col="${p.col}" data-g="${g}" data-id="${p.id}"><summary>نص الصفحة المستخرج</summary><div class="ptx">…</div></details>`;}).join('');
}
function wirePages(root){root.querySelectorAll('details.pgtxt').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open||d.dataset.ok)return;d.dataset.ok=1;
  const p=BYID[d.dataset.id],g=+d.dataset.g,reg=p.rg.find(r=>r.page===g),ls=await pageLines(d.dataset.col,g);
  d.querySelector('.ptx').innerHTML=ls.map(([t,top,size,bb])=>{const hit=reg&&top>=reg.bbox[1]-1&&top<=reg.bbox[3];return `<div class="ln${hit?' hit':''}${bb||size>=18?' h':''}${size<=12?' small':''}">${esc(t)}</div>`}).join('')||'—';}));}
function openSrc(p){const C=COLS[p.col];
  $('sheett').textContent=`${C.name} · ${p.n} · الصفحة ${printed(p).join('–')}`;
  const sb=$('sheetb');sb.innerHTML=pagesHTML(p);wirePages(sb);$('sheetwrap').hidden=false;sb.scrollTop=0;
  const hb=sb.querySelector('.hlbox');if(hb)setTimeout(()=>{sb.scrollTop=Math.max(0,hb.offsetTop+hb.parentElement.offsetTop-sb.clientHeight/3)},30);}
const closeS=()=>$('sheetwrap').hidden=true;
$('sheetx').onclick=closeS;$('sheetbg').onclick=closeS;
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeS()});
// ---------- views
const VIEWS=['search','index','report','about','item'];
function show(v){VIEWS.forEach(x=>$('tab-'+x).hidden=x!==v);
  document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===v));}
function viewItem(id){
  const p=BYID[id], el=$('tab-item');
  if(!p){el.innerHTML=`<div class="view-h"><button class="back" data-back>رجوع</button><h2>غير موجود</h2></div><div class="empty">لا يوجد مبدأ بالمعرّف ${esc(id)}.</div>`;show('item');return;}
  document.title=`${COLS[p.col].name} ${p.n} — مبادئ التمييز`;
  const rel=(p.rel||[]).map(i=>BYID[i]).filter(Boolean);
  el.innerHTML=`<div class="view-h"><button class="back" data-back>رجوع</button><h2>${esc(COLS[p.col].title)} — ${p.n}</h2><button class="btn" data-print>طباعة</button></div>
    <div class="list">${card(p,null,{page:1,open:1})}</div>
    <div class="inline-src"><h3>صفحة المصدر (${printed(p).join('–')})</h3>${pagesHTML(p)}</div>
    ${rel.length?`<h3>الحكم نفسه في مجموعات أخرى (${rel.length})</h3><div class="list">${rel.map(q=>card(q,null)).join('')}</div>`:''}`;
  wirePages(el);show('item');window.scrollTo({top:0});
}
function viewRuling(key){
  const el=$('tab-item'), ids=RUL[key]||[];
  const cits=ids.length?BYID[ids[0]].c.find(c=>c.k===key):null;
  const [ap,ses]=key.split('@');
  const chs=[...new Set(ids.flatMap(i=>BYID[i].c.filter(c=>c.k===key).map(c=>c.ch)).filter(Boolean))];
  const srcs=[...new Set(ids.map(i=>COLS[BYID[i].col].name))];
  document.title=`الطعن ${ap} — مبادئ التمييز`;
  el.innerHTML=`<div class="view-h"><button class="back" data-back>رجوع</button><h2>بطاقة الحكم</h2><button class="btn" data-print>طباعة</button></div>
   <div class="rhead"><div class="kv"><span><b>الطعن</b>${esc(ap.replace(/\+/g,' ، '))}</span>${chs.length?`<span><b>الدائرة</b>${esc(chs.join('، '))}</span>`:''}<span><b>الجلسة</b>${esc(ses?ses.split('-').reverse().join('/'):'')}</span><span><b>المبادئ</b>${ids.length}</span></div>
   ${srcs.length?`<div class="kv"><span><b>ورد في</b>${esc(srcs.join('، '))}</span></div>`:''}
   ${cits?`<div class="hint">سطر الإسناد كما في المصدر: ${esc(cits.raw)}</div>`:''}</div>
   <div class="list">${ids.length?ids.map(i=>card(BYID[i],null)).join(''):`<div class="empty">لا يوجد في المكتبة حكم بهذا المفتاح: ${esc(key)}</div>`}</div>`;
  show('item');window.scrollTo({top:0});
}
let lastList='#/';
function route(){
  const h=decodeURIComponent((location.hash||'').replace(/^#\/?/,''));
  closeS();
  if(h.startsWith('p/')) return viewItem(h.slice(2));
  if(h.startsWith('r/')) return viewRuling(h.slice(2));
  document.title='مبادئ التمييز';
  if(['index','report','about'].includes(h)){lastList='#/'+h;if(h==='report')reports();return show(h);}
  lastList='#/';show('search');
}
let navs=-1;window.addEventListener('hashchange',()=>{navs++;route();});
function go(h){if(location.hash===h)route();else location.hash=h;}
// ---------- events
let tmr;$('q').addEventListener('input',()=>{clearTimeout(tmr);tmr=setTimeout(()=>{shown=40;run()},120)});
[fcol,fch,$('frv'),ftp,flw].forEach(e=>e.addEventListener('change',()=>{shown=40;run()}));
fart.addEventListener('input',()=>{clearTimeout(tmr);tmr=setTimeout(()=>{shown=40;run()},200)});
$('more').onclick=()=>{shown+=40;run()};
function resetF(){$('q').value='';fcol.value='';ftp.value='';flw.value='';fart.value='';fch.value='';$('frv').checked=false;}
function goFilter(o){resetF();if(o.tp)ftp.value=o.tp;if(o.lw)flw.value=o.lw;if(o.art)fart.value=o.art;shown=40;run();go('#/');window.scrollTo({top:0});}
document.addEventListener('click',e=>{
  const t=e.target;
  const cb=t.closest('[data-copy]');if(cb){clip(copyText(BYID[cb.dataset.copy]),()=>{cb.textContent='نُسخ';setTimeout(()=>cb.textContent='نسخ',1400)});return;}
  const lb=t.closest('[data-link]');if(lb){clip(BASE+'#/p/'+lb.dataset.link,()=>toast('نُسخ رابط المبدأ'));return;}
  const sb=t.closest('[data-src]');if(sb){openSrc(BYID[sb.dataset.src]);return;}
  const gb=t.closest('[data-go]');if(gb){go(gb.dataset.go);return;}
  if(t.closest('[data-back]')){if(navs>0)history.back();else go(lastList);return;}
  if(t.closest('[data-print]')){window.print();return;}
  const tb=t.closest('[data-tab]');if(tb){go(tb.dataset.tab==='search'?'#/':'#/'+tb.dataset.tab);return;}
  const tpb=t.closest('[data-tp]');if(tpb){goFilter({tp:tpb.dataset.tp});return;}
  const lwb=t.closest('[data-lw]');if(lwb){goFilter({lw:lwb.dataset.lw,art:lwb.dataset.art||''});return;}
});
// ---------- index
(function(){
  const el=$('tab-index');const nat=(a,b)=>(parseInt(a)||1e9)-(parseInt(b)||1e9)||a.localeCompare(b);
  const fam=FAMS.map(f=>{const ts=TORD.filter(t=>famOf(t)===f);const n=PR.filter(p=>p.tp.some(x=>TL[x[0]]&&famOf(x[0])===f)).length;
    return `<details${f==='قانون العمل'||f==='إجراءات التقاضي'?' open':''}><summary>${esc(f)}<span class="n">${n}</span></summary>${ts.map(t=>`<button class="row" data-tp="${esc(t)}">${esc(TL[t][1])}<span class="n">${tcount[t]}</span></button>`).join('')}</details>`}).join('');
  const laws=LORD.map((l,i)=>{const as=Object.keys(acount).filter(k=>k.startsWith(l+'|')).map(k=>k.slice(l.length+1)).sort(nat);
    return `<details${i<3?' open':''}><summary>${esc(LL[l]||l)}<span class="n">${lcount[l]}</span></summary><div class="arts"><button data-lw="${esc(l)}">كل المبادئ</button>${as.map(a=>`<button data-lw="${esc(l)}" data-art="${esc(a)}" title="${acount[l+'|'+a]} مبدأ">م ${esc(a)}</button>`).join('')}</div></details>`}).join('');
  const nb=PR.filter(p=>p.tp.some(x=>x[1]==='b'||x[1]==='k')).length,na=PR.filter(p=>p.tp.length&&p.tp.every(x=>x[1]==='a')).length,nl=PR.filter(p=>p.tp.some(x=>x[2])).length;
  el.innerHTML=`<div class="prose"><p>التصنيف الموحّد يجمع مبادئ كل المجموعات تحت موضوع واحد مهما اختلف تبويب الكتاب الذي وردت فيه، ويفهرسها بالقوانين والمواد التي تذكرها نصوصها. التصنيف وصف مساعد ولا يغيّر شيئًا من نص المبدأ.</p></div>
  <div class="legend"><span class="chip tp">من أبواب الكتاب أو الكلمة المفتاحية الرسمية (${nb})</span><span class="chip tp auto">بالقراءة الآلية (${na})</span><span class="chip tp auto low">ثقة منخفضة — يحتاج تأكيدًا (${nl})</span></div>
  <div class="idx"><div><h2>الموضوعات</h2><div class="box">${fam}</div></div><div><h2>القوانين والمواد</h2><div class="box">${laws}</div></div></div>`;
})();
// ---------- reports (lazy)
let repDone=false;
async function reports(){if(repDone)return;repDone=true;const el=$('tab-report');
  const R=await fetch('data/reports.json').then(r=>r.json()).catch(()=>[]);
  el.innerHTML=`<div class="prose"><p>لكل مجموعة تقرير يبيّن طريقة الاستخراج والفحوص التي اجتازتها، والمبادئ المعلَّمة للمراجعة البشرية وأسبابها.</p></div>`+R.filter(x=>COLS[x.col]).map(R=>{const ps=PR.filter(p=>p.col===R.col&&p.rv.length);const off=COLS[R.col].off;
  const rvRows=ps.map(p=>`<tr><td><button class="btn" data-go="#/p/${p.id}">${p.n}</button></td><td>${p.pg.map(g=>g+off).join('–')}</td><td>${p.rv.map(esc).join('<br>')}</td></tr>`).join('');
  return `<h2 class="rh">${esc(R.title)}</h2>
  <div class="stats">${R.stats.map(([v,l])=>`<div class="stat"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
  <h3>طريقة الاستخراج</h3><div class="prose"><ul>${R.method.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
  <h3>الفحوص</h3><div class="tbl"><table><thead><tr><th>الفحص</th><th>النتيجة</th><th>التفصيل</th></tr></thead><tbody>
  ${R.checks.map(([a,ok,c])=>`<tr><td>${esc(a)}</td><td class="${ok?'okc':'flc'}">${ok?'اجتاز':'ملاحظات'}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div>
  <h3>ما يحتاج مراجعة بشرية (${ps.length})</h3>
  <details><summary class="btn">عرض القائمة</summary><div class="tbl"><table><thead><tr><th>المبدأ</th><th>الصفحة</th><th>السبب</th></tr></thead><tbody>${rvRows}</tbody></table></div></details>
  ${R.notes&&R.notes.length?`<h3>ملاحظات</h3><div class="prose"><ul>${R.notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}`}).join('<hr class="sep">');}
document.querySelector('[data-tab="report"]').addEventListener('click',reports);
if((location.hash||'').includes('report'))reports();
// ---------- about + offline
$('srcs').innerHTML=ORDER.map(k=>`<li><span>${esc(COLS[k].title)}</span><span class="n">${COLS[k].n.toLocaleString('ar')}</span></li>`).join('');
const net=()=>{const on=navigator.onLine;$('net').classList.toggle('off',!on);$('net').lastChild.textContent=on?' متصل':' دون اتصال';};
window.addEventListener('online',net);window.addEventListener('offline',net);net();
if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').catch(()=>{});}
$('dl').onclick=async()=>{
  if(!('caches' in window)){$('dlst').textContent='هذا المتصفح لا يدعم التخزين دون اتصال.';return;}
  const btn=$('dl');btn.disabled=true;
  try{
    const F=await fetch('files.json',{cache:'no-store'}).then(r=>r.json());
    const cF=await caches.open('mabadi-files'),cD=await caches.open('mabadi-data');const tot=F.files.length;let n=0,bytes=0;
    const q=[...F.files];const work=async()=>{while(q.length){const f=q.shift();const c=f.p.startsWith('pages/')?cF:cD;
      try{if(!(await c.match(f.p))){const r=await fetch(f.p);if(r.ok)await c.put(f.p,r);}}catch(_){}
      n++;bytes+=f.s;$('dlbar').style.width=(n/tot*100)+'%';$('dlst').textContent=`${n} من ${tot} ملف · ${(bytes/1048576).toFixed(0)} ميغابايت`;}};
    await Promise.all([work(),work(),work(),work()]);
    $('dlst').textContent=`اكتمل: المكتبة كلها وصور صفحاتها محفوظة في هذا الجهاز (${(F.bytes/1048576).toFixed(0)} ميغابايت).`;
  }catch(e){$('dlst').textContent='تعذّر التنزيل الآن. تأكد من الاتصال وحاول مرة أخرى.';}
  btn.disabled=false;
};
// ---------- start
run();route();navs=0;
})().catch(e=>{const L=document.getElementById('list');if(L)L.innerHTML='<div class="empty">تعذّر تحميل بيانات المكتبة. أعد تحميل الصفحة.</div>';console.error(e);});
