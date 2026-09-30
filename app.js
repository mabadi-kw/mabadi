/* مبادئ التمييز — التطبيق */
(async function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>s.replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').replace(/\s+/g,' ').trim();
const west=s=>String(s).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const nf=n=>Number(n).toLocaleString('en-US');
function toast(t){const e=$('toast');e.textContent=t;e.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>e.hidden=true,2000);}
// ---------- local storage (per device)
const LS={get(k,d){try{const v=localStorage.getItem('mabadi:'+k);return v?JSON.parse(v):d}catch(_){return d}},set(k,v){try{localStorage.setItem('mabadi:'+k,JSON.stringify(v))}catch(_){toast('تعذّر الحفظ في هذا المتصفح')}}};
const DEF={font:'naskh',fs:1,lh:1.95,theme:'auto',name:'',photo:'',pin:'',lockMin:5};
let S=Object.assign({},DEF,LS.get('settings',{}));
let FAV=LS.get('favs',{}), FOLD=LS.get('folders',['عام']), NOTE=LS.get('notes',{}), HIST=LS.get('hist',[]), QH=LS.get('qhist',[]);
const saveS=()=>LS.set('settings',S);
// نموذج التقييم: يُملأ عند إنشاء نموذج Google الخاص بالمكتبة
const FB={url:'',f:{section:'',rating:'',note:'',contact:'',meta:''}};
// ---------- icons
const IC={
 gavel:'M14 3l7 7-3 3-7-7zM11 6l-7 7 3 3 7-7M3 21h10', briefcase:'M3 8h18v11H3zM8 8V5h8v3M3 13h18',
 scroll:'M6 3h11a3 3 0 0 1 0 6H6zM6 3a3 3 0 0 0 0 6v9a3 3 0 0 0 3 3h9V9', contract:'M6 3h8l4 4v14H6zM9 11h6M9 15h4',
 building:'M4 21V5l8-2v18M12 8l8 2v11M2 21h20M8 9h.01M8 13h.01M8 17h.01M16 13h.01M16 17h.01', house:'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5',
 landmark:'M3 21h18M4 10h16M12 3l9 5H3zM6 10v8M10 10v8M14 10v8M18 10v8', people:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5.5a2.5 2.5 0 0 1 0 5M17 15c2.5 0 4 2 4 5',
 shield:'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', lock:'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4', scale:'M12 3v18M6 21h12M5 7h14M7 7l-3 6a3 3 0 0 0 6 0zM17 7l-3 6a3 3 0 0 0 6 0z',
 book:'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM4 19V5', copy:'M9 9h11v11H9zM5 15H4V4h11v1', share:'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
 star:'M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9z', note:'M4 4h16v12H8l-4 4zM8 9h8M8 12h5', speak:'M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11',
 page:'M6 3h9l4 4v14H6zM14 3v5h5', open:'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6', mic:'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
 filter:'M3 5h18l-7 8v6l-4 2v-8z', search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', gear:'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
 print:'M6 9V3h12v6M6 18H4v-7h16v7h-2M8 14h8v7H8z', mail:'M3 5h18v14H3zM3 6l9 7 9-7', link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
 x:'M6 6l12 12M18 6L6 18', back:'M9 6l6 6-6 6', sun:'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
 download:'M12 3v12M7 10l5 5 5-5M4 21h16', report:'M4 20V10M10 20V4M16 20v-7M22 20H2', info:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01', clock:'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
 wa:'M3 21l1.6-4.7A8.5 8.5 0 1 1 8 19.6zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1.2-.5-2.3-1.6-2.8-2.8l1-1-1-2z'};
const svg=(n,c='i')=>`<svg class="${c}" viewBox="0 0 24 24"><path d="${IC[n]}"/></svg>`;
const FAMIC={P:'gavel',L:'briefcase',V:'scroll',C:'contract',S:'building',R:'house',A:'landmark',F:'people',G:'shield',H:'lock',J:'scale',T:'book'};
// ---------- fonts & appearance
const FONTS={
 naskh:{l:'نسخ',css:'"Noto Naskh Arabic"',u:''},
 amiri:{l:'أميري',css:'"Amiri"',u:'Amiri:wght@400;700'},
 scheh:{l:'شهرزاد',css:'"Scheherazade New"',u:'Scheherazade+New:wght@400;700'},
 cairo:{l:'القاهرة',css:'"Cairo"',u:''},
 plex:{l:'بلكس',css:'"IBM Plex Sans Arabic"',u:'IBM+Plex+Sans+Arabic:wght@400;600'},
 kufi:{l:'كوفي',css:'"Noto Kufi Arabic"',u:'Noto+Kufi+Arabic:wght@400;600'},
 tajawal:{l:'تجوال',css:'"Tajawal"',u:'Tajawal:wght@400;700'}};
function applyLook(){
  const f=FONTS[S.font]||FONTS.naskh, r=document.documentElement;
  if(f.u)$('xfont').href=`https://fonts.googleapis.com/css2?family=${f.u}&display=swap`;
  r.style.setProperty('--f-text',f.css+',"Noto Naskh Arabic",serif');
  r.style.setProperty('--fs',S.fs);r.style.setProperty('--lh',S.lh);
  if(S.theme==='auto')delete r.dataset.theme;else r.dataset.theme=S.theme;
  document.querySelector('meta[name=theme-color]').content='#0b2545';
  const ini=(S.name||'').trim().charAt(0)||'';
  $('meav').innerHTML=S.photo?`<img src="${S.photo}" alt="">`:(ini?esc(ini):svg('gear'));
  $('mename').textContent=S.name||'الإعدادات';
}
applyLook();

// ---------- خيط الذهب (نقش السدو) ونقش الورق
function sdUnit(){const dm=(cx,cy,r,ring)=>{const o=[];for(let x=cx-r;x<=cx+r;x++)for(let y=cy-r;y<=cy+r;y++){const d=Math.abs(x-cx)+Math.abs(y-cy);if(ring?d===r:d<=r)o.push([x,y]);}return o;};
  let c=[];for(let x=0;x<24;x++)c.push(x%4<2?[x,0]:[x,15]);c=c.concat(dm(12,8,5,1),dm(12,8,3,1),[[12,8]]);
  [3,21].forEach(cx=>c.push([cx,8],[cx-1,7],[cx-2,6],[cx-1,9],[cx-2,10],[cx+1,7],[cx+2,6],[cx+1,9],[cx+2,10]));return c.filter(p=>p[0]>=0&&p[0]<24);}
let wid=0;
function weave(host,cs){if(!host)return;const id='w'+(wid++),r=sdUnit().map(p=>`<rect x="${p[0]*cs+.6}" y="${p[1]*cs+.6}" width="${cs-1.2}" height="${cs-1.2}" fill="none" stroke="#C9A24B" stroke-width=".9"/>`).join('');
  host.insertAdjacentHTML('afterbegin',`<svg class="weave" aria-hidden="true"><defs><pattern id="p${id}" width="${24*cs}" height="${16*cs}" patternUnits="userSpaceOnUse">${r}</pattern>
   <linearGradient id="a${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity=".32"/></linearGradient>
   <linearGradient id="b${id}" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".7" stop-color="#fff" stop-opacity=".16"/><stop offset="1" stop-color="#fff" stop-opacity=".45"/></linearGradient>
   <linearGradient id="s${id}" x1="0" x2="1"><stop offset="0" stop-color="#FFE7A6" stop-opacity="0"/><stop offset=".5" stop-color="#FFE7A6" stop-opacity=".9"/><stop offset="1" stop-color="#FFE7A6" stop-opacity="0"/></linearGradient>
   <mask id="m${id}" maskContentUnits="objectBoundingBox"><rect class="rev l" x="0" y="0" width=".5" height="1" fill="url(#a${id})"/><rect class="rev r" x=".5" y="0" width=".5" height="1" fill="url(#b${id})"/></mask></defs>
   <g mask="url(#m${id})"><rect width="100%" height="100%" fill="url(#p${id})" opacity=".55"/></g><g mask="url(#m${id})"><rect class="shine" width="30%" height="100%" fill="url(#s${id})"/></g></svg>`);}
function paper(){const cs=9,r=sdUnit().map(p=>`<rect class="t" x="${p[0]*cs}" y="${p[1]*cs}" width="${cs}" height="${cs}"/>`).join('');
  document.body.insertAdjacentHTML('afterbegin',`<svg id="paper" aria-hidden="true"><defs><pattern id="pp" width="${24*cs}" height="${16*cs}" patternUnits="userSpaceOnUse">${r}</pattern></defs><g><rect width="100%" height="100%" fill="url(#pp)"/></g></svg>`);}
paper();weave(document.querySelector('.appbar'),8);
let wovenOnce=false;
function playWeave(){if(wovenOnce)return;wovenOnce=true;document.querySelectorAll('.appbar,.hero').forEach(h=>{h.classList.remove('play');void h.offsetWidth;h.classList.add('play');});}
// ---------- lock
async function sha(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mabadi:'+t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function lockScreen(){
  if(!S.pin||$('lock'))return;
  const d=document.createElement('div');d.className='lock';d.id='lock';
  const ini=(S.name||'').trim().charAt(0);
  d.innerHTML=`<div class="in"><i class="avatar">${S.photo?`<img src="${S.photo}" alt="">`:esc(ini||'م')}</i><b class="t">مبادئ التمييز</b><div>${S.name?'مرحبًا، '+esc(S.name):''}</div><div class="hint" style="color:#cfdcf1">أدخل الرمز السري</div><div class="dots" id="dots"></div>
  <div class="pad">${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k=>k===''?'<span></span>':`<button data-k="${k}">${k}</button>`).join('')}</div></div>`;
  document.body.appendChild(d);let v='';
  const draw=()=>{$('dots').innerHTML=Array.from({length:Math.max(4,v.length)},(_,i)=>`<i class="${i<v.length?'f':''}"></i>`).join('')};draw();
  const press=async k=>{if(k==='⌫')v=v.slice(0,-1);else if(v.length<8)v+=k;draw();
    if(v.length>=4&&await sha(v)===S.pin){d.remove();document.removeEventListener('keydown',kd);}
    else if(v.length>=8||(v.length>=4&&v.length===S.pinLen)){d.querySelector('.in').classList.add('shake');setTimeout(()=>{d.querySelector('.in').classList.remove('shake');v='';draw();},350);}};
  d.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)press(b.dataset.k)});
  const kd=e=>{if(/^\d$/.test(e.key))press(e.key);else if(e.key==='Backspace')press('⌫')};document.addEventListener('keydown',kd);
}
lockScreen();
let hiddenAt=0;document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(S.pin&&hiddenAt&&Date.now()-hiddenAt>S.lockMin*60000)lockScreen();});
// ---------- data
const META=await fetch('data/meta.json').then(r=>r.json());
const ORDER=META.order,COLS=META.cols,TL=META.toplab,LL=META.lawlab;
let done=0;
const arrs=await Promise.all(ORDER.map(c=>fetch('data/'+c+'.json').then(r=>r.json()).then(a=>{done++;const l=$('loading');if(l)l.textContent=`جارٍ تحميل المكتبة… ${done} من ${ORDER.length}`;const lb=$('loadbar');if(lb)lb.style.width=(done/ORDER.length*100)+'%';return a;})));
const PR=arrs.flat(),BYID={},RUL={},POS={};PR.forEach((p,i)=>{BYID[p.id]=p;POS[p.id]=i;});
PR.forEach(p=>{p.ns=norm(p.p.join(' ')+' '+(p.rule||'')+' '+(p.ttl||'')+' '+p.c.map(c=>c.raw).join(' ')+' '+p.fn.join(' '));p.sk=p.sec.join('›');
  new Set(p.c.map(c=>c.k).filter(Boolean)).forEach(k=>(RUL[k]=RUL[k]||[]).push(p.id));});
$('sub').textContent=`${nf(PR.length)} مبدأً · ${ORDER.length} مجموعة`;
const famOf=t=>TL[t]?TL[t][0]:'';
const tcount={},lcount={},acount={},famcount={};
PR.forEach(p=>{new Set(p.tp.map(x=>x[0])).forEach(t=>tcount[t]=(tcount[t]||0)+1);new Set(p.tp.map(x=>famOf(x[0])).filter(Boolean)).forEach(f=>famcount[f]=(famcount[f]||0)+1);
  p.lw.forEach(([l,as])=>{lcount[l]=(lcount[l]||0)+1;as.forEach(a=>{const k=l+'|'+a;acount[k]=(acount[k]||0)+1})})});
const FORD='PLVCSRAFGHJT';
const TORD=Object.keys(tcount).filter(t=>TL[t]).sort((a,b)=>FORD.indexOf(a[0])-FORD.indexOf(b[0])||tcount[b]-tcount[a]);
const FAMS=[...new Set(TORD.map(famOf))];const famLetter={};TORD.forEach(t=>famLetter[famOf(t)]=famLetter[famOf(t)]||t[0]);
const LORD=Object.keys(lcount).sort((a,b)=>lcount[b]-lcount[a]);
const CHS=[...new Set(PR.flatMap(p=>p.c.map(c=>c.ch)).filter(Boolean))];
const printed=p=>p.pg.map(g=>g+COLS[p.col].off);
// ---------- legislation
const LAWIX=[],LAWBYKEY={},LAWBYID={},ARTBYID={},ARTMAP={},LAWDATA={},MEMO={};
try{const LI=await fetch('data/laws/index.json').then(r=>r.json());LI.laws.forEach(x=>{LAWIX.push(x);LAWBYKEY[x.key]=x;LAWBYID[x.id]=x;});}catch(_){}
PR.forEach(p=>p.lw.forEach(([l,as])=>{if(!LAWBYKEY[l])return;new Set(as.map(a=>parseInt(west(a).split('/')[0]))).forEach(n=>{if(!n)return;const k=l+'#'+n;(ARTMAP[k]=ARTMAP[k]||[]).push(p.id);});}));
const pad4=n=>String(n).padStart(4,'0');
function normToc(L){if(!L.toc||!L.toc.length||L.toc[0].level!=null)return;const out=[];const idxOf=n=>L.articles.findIndex(a=>a.n===n);
  L.toc.forEach(b=>{out.push({kind:'part',level:0,title:b.head+' — '+b.title,frm:b.from,to:b.to,i0:idxOf(b.from),i1:idxOf(b.to)+1});(b.children||[]).forEach(c=>out.push({kind:'chapter',level:1,title:c.head+' — '+c.title,frm:c.from,to:c.to,i0:idxOf(c.from),i1:idxOf(c.to)+1}));});L.toc=out;}
const LOADING={};
function loadLaw(id){if(LAWDATA[id])return Promise.resolve(LAWDATA[id]);if(LOADING[id])return LOADING[id];
  return LOADING[id]=fetch('data/laws/'+id+'.json').then(r=>{if(!r.ok)throw 0;return r.json();}).then(L=>{normToc(L);L.byN={};
    L.articles.forEach((a,i)=>{a.law=L;a.i=i;a.ns=norm(a.label+' '+a.paras.join(' '));ARTBYID[a.id]=a;if(!a.issue&&a.n&&!a.bis&&!L.byN[a.n])L.byN[a.n]=a;});
    LAWDATA[id]=L;return L;});}
let lawsAll=null;
function loadAllLaws(){return lawsAll||(lawsAll=Promise.all(LAWIX.map(x=>loadLaw(x.id).catch(()=>null))).then(()=>{if(!$('v-search').hidden&&F.q)renderList();}));}
function loadMemo(lid){const mid=lid+'-M';if(MEMO[mid])return Promise.resolve(MEMO[mid]);return fetch('data/laws/'+mid+'.json').then(r=>{if(!r.ok)throw 0;return r.json();}).then(M=>MEMO[mid]=M);}
const lawOfArt=id=>id.replace(/-(A\d+(?:-\d+)?|I\d+)$/,'');
function artOf(l,a){const L=LAWBYKEY[l];if(!L||a==null)return null;const n=parseInt(west(String(a)).split('/')[0]);if(!n)return null;const D=LAWDATA[L.id];if(D)return D.byN[n]||null;return {id:`${L.id}-A${pad4(n)}`};}
function artHits(){const ts=terms(F.q);if(!ts.length||F.col||F.tp||F.ch||F.rv||F.sec)return [];const o=[];
  LAWIX.forEach(x=>{const L=LAWDATA[x.id];if(!L||(F.lw&&F.lw!==L.key))return;L.articles.forEach(a=>{if(ts.every(t=>a.ns.includes(t)))o.push([L,a]);});});return o;}
const artPR=a=>a.issue?[]:(ARTMAP[a.law.key+'#'+a.n]||[]).map(i=>BYID[i]).filter(Boolean);
const lawTitle=L=>L.number?`${L.type} رقم ${L.number} لسنة ${L.year}`:`${L.type}${L.year?' — '+L.year:''}`;
function artQuote(a){const L=a.law;return `${a.label} — ${L.title}:\n${a.paras.join('\n')}\n— ${L.text_version}.`;}
function pgCaption(M,g){const pr=M.printed&&M.printed[g-1];return pr?`الصفحة ${pr} من الطبعة`:`الصفحة ${g} من ملف المصدر`;}
function lawPageHTML(col,M,g,reg){const gp=M.gp||20,gc=gp/10,b=Math.floor((g-1)/gp),k=(g-1)%gp,cx=k%gc,ry=Math.floor(k/gc);
  const box=reg?`<div class="hlbox" style="left:${(reg.bbox[0]-6)/M.pw*100}%;top:${(reg.bbox[1]-4)/M.ph*100}%;width:${(reg.bbox[2]-reg.bbox[0]+12)/M.pw*100}%;height:${(reg.bbox[3]-reg.bbox[1]+8)/M.ph*100}%"></div>`:'';
  return `<figure class="pg"><div class="pgimg" role="img" aria-label="${pgCaption(M,g)}" style="aspect-ratio:${M.cell[0]}/${M.cell[1]};background-image:url(pages/${col}/g${String(b).padStart(3,'0')}.webp);background-size:${gc*100}% 1000%;background-position:${cx*100/(gc-1)}% ${ry*100/9}%">${box}</div><figcaption>${pgCaption(M,g)}</figcaption></figure>`;}
function lawPagesHTML(a){const L=a.law;return a.pages.map(g=>lawPageHTML(L.pages_col,L.page_meta,g,(a.rg||[]).find(r=>r.page===g))).join('');}
const LOADMSG='<div class="empty">جارٍ تحميل النص…</div>';
function viewLaws(){const el=$('v-laws');document.title='التشريعات — مبادئ التمييز';
  const L=[...LAWIX].sort((a,b)=>(lcount[b.key]||0)-(lcount[a.key]||0));
  el.innerHTML=`<div class="vh"><h2>التشريعات</h2><span class="muted">${nf(LAWIX.length)} وثيقة</span></div><p class="muted">نصوص القوانين مادةً مادة، وكل مادة موصولة بمبادئ التمييز التي تذكرها وبصورة صفحتها في المصدر. يُذكر مع كل قانون مصدر نصه وتاريخ النسخة.</p>
   <div class="ltabs" id="lwt"></div><input class="flt" id="lwf" type="search" placeholder="ابحث بالاسم أو الرقم…"><div class="quick" id="lwc"></div><div class="grid g3" id="lwg"></div>
   <div class="card note"><b>عن النسخ</b><p class="muted" style="margin:.3em 0 0">أغلب النصوص من «مجموعة التشريعات الكويتية» الصادرة عن وزارة العدل (الطبعة الأولى، فبراير 2011)، وتشمل التعديلات حتى تاريخها كما تذكرها حواشي الطبعة. ما صدر بعد ذلك لا يظهر في النص، فارجع إلى الجريدة الرسمية قبل الاعتماد عليه.</p></div>`;
  const tile=x=>`<button class="tile card lawtile" data-go="#/law/${x.id}"><span class="ic">${svg('scroll')}</span><b>${esc(x.short)}</b><small>${esc(lawTitle(x))} · ${x.articles?nf(x.articles)+' مادة':'بلا مواد مرقمة'}${lcount[x.key]?` · ${nf(lcount[x.key])} مبدأ`:''}${x.memo?' · مع المذكرة':''}</small><small class="ver">${esc(x.ver||x.text_version)}</small></button>`;
  let cat='law',g='';const G=()=>[...new Set(L.filter(x=>(x.cat||'law')===cat).map(x=>x.group).filter(Boolean))];
  const nL=L.filter(x=>(x.cat||'law')==='law').length,nR=L.length-nL;
  $('lwt').innerHTML=`<button class="tab" data-lc="law">القوانين والمراسيم بقوانين <b>${nf(nL)}</b></button><button class="tab" data-lc="reg">المراسيم واللوائح والقرارات <b>${nf(nR)}</b></button>`;
  const tabs=()=>$('lwt').querySelectorAll('[data-lc]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lc===cat));tabs();
  $('lwt').onclick=e=>{const b=e.target.closest('[data-lc]');if(!b)return;cat=b.dataset.lc;g='';tabs();chips();draw(norm(west($('lwf').value).trim()));};
  const draw=q=>$('lwg').innerHTML=L.filter(x=>(x.cat||'law')===cat&&(!g||x.group===g)&&(!q||norm(x.short+' '+x.title+' '+x.key).includes(q)||west(x.key).includes(q))).map(tile).join('')||'<div class="empty">لا نتائج.</div>';
  const chips=()=>$('lwc').innerHTML=[['','الكل'],...G().map(x=>[x,x])].map(([k,t])=>`<button class="chip${g===k?' on':''}" data-lg="${esc(k)}">${esc(t)}</button>`).join('');
  chips();draw('');$('lwf').oninput=()=>draw(norm(west($('lwf').value).trim()));
  $('lwc').onclick=e=>{const b=e.target.closest('[data-lg]');if(!b)return;g=b.dataset.lg;chips();draw(norm(west($('lwf').value).trim()));};}
function lawTree(L){const tree=[],st=[];(L.toc||[]).filter(t=>t.i0>=0).forEach(t0=>{const t={...t0,kids:[]};while(st.length&&st[st.length-1].level>=t.level)st.pop();(st.length?st[st.length-1].kids:tree).push(t);st.push(t);});return tree;}
function viewLaw(id){const el=$('v-item');el.innerHTML=LOADMSG;
  loadLaw(id).then(L=>{
  document.title=L.short+' — مبادئ التمييز';
  const row=a=>{const n=a.issue?0:(ARTMAP[L.key+'#'+a.n]||[]).length,t=a.paras.join(' ');return `<button class="arow" data-go="#/a/${a.id}"><b>${esc(a.label)}${a.rep||!a.paras.length?' <em class="muted">— لا نص في الطبعة</em>':''}${n?`<span class="n" title="مبادئ تذكر المادة">${n}</span>`:''}</b>${t?`<span>${esc(t.slice(0,160))}${t.length>160?'…':''}</span>`:''}</button>`;};
  const A=L.articles,tree=lawTree(L);
  const span=(i0,i1,kids)=>{let h='',i=i0;const ks=[...kids].sort((a,b)=>a.i0-b.i0);while(i<i1){const k=ks.find(x=>x.i0===i);if(k&&k.i1>i){h+=node(k);i=k.i1;}else{if(!A[i].issue)h+=row(A[i]);i++;}}return h;};
  const node=t=>`<details class="lsec"><summary>${esc(t.title)}<small>${t.frm===t.to?'المادة '+t.frm:'المواد '+t.frm+'–'+t.to}</small></summary>${t.kids.length?`<div>${span(t.i0,t.i1,t.kids)}</div>`:`<div class="rows">${span(t.i0,t.i1,[])}</div>`}</details>`;
  const first=tree.length?Math.min(...tree.map(t=>t.i0)):A.length;
  const body=span(0,first,[])+(tree.length?span(first,A.length,tree):'');
  const iss=A.filter(a=>a.issue),ix=LAWBYID[id]||{};
  el.innerHTML=`<div class="crumbs no-print"><button data-go="#/laws">التشريعات</button>›<span>${esc(L.short)}</span></div>
   <div class="vh"><h2>${esc(L.title)}</h2>${lcount[L.key]?`<button class="btn" data-go="#/index/law/${encodeURIComponent(L.key)}">مبادئه (${nf(lcount[L.key])})</button>`:''}</div>
   <div class="card rhead"><div class="kv"><span><b>النوع</b>${esc(L.type)}</span>${L.issued?`<span><b>صدر</b>${esc(L.issued.split('-').reverse().join('/'))}${L.issued_hijri?' ('+esc(L.issued_hijri)+')':''}</span>`:''}<span><b>المواد</b>${nf(A.filter(a=>!a.issue).length)}</span>${ix.memo?`<span><b>المذكرة</b><button class="linkbtn" data-go="#/m/${L.id}">افتحها</button></span>`:''}</div></div>
   <div class="verban">${svg('info')}<span><b>${esc(L.text_version)}.</b> المصدر: ${esc(L.source.kind)}${L.source.edition?'، '+esc(L.source.edition):''}. ${esc(L.source.note||'')}</span></div>
   ${L.notes&&L.notes.length?`<div class="card lnotes"><b>حواشي الطبعة</b>${L.notes.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}
   <input class="flt" id="lq" type="search" placeholder="ابحث في مواد هذا القانون أو اكتب رقم مادة…"><div id="lres"></div>
   <div id="ltoc">${L.preamble&&L.preamble.length?`<details class="lsec"><summary>${iss.length?'مرسوم الإصدار ومواده':'الديباجة'}</summary><div class="ltxt">${(L.title_lines||[]).map(x=>`<p class="tl">${esc(x)}</p>`).join('')}${L.preamble.map(x=>`<p>${esc(x)}</p>`).join('')}</div>${iss.length?`<div class="rows">${iss.map(row).join('')}</div>`:''}${L.signature&&L.signature.length?`<div class="ltxt sig">${L.signature.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}</details>`:''}
   ${body}
   ${L.annex&&L.annex.length?`<details class="lsec"><summary>الجداول والملاحق<small>نص مستخرج؛ للتنسيق انظر صورة الصفحة</small></summary><div class="ltxt annex">${L.annex.map(x=>`<p>${esc(x.t)} <button class="pgref" data-lpg="${x.pg}">${esc((L.page_meta.printed&&L.page_meta.printed[x.pg-1])||x.pg)}</button></p>`).join('')}</div></details>`:''}
   ${!iss.length&&L.signature&&L.signature.length?`<div class="card ltxt sig">${L.signature.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}</div>`;
  el.onclick=e=>{const b=e.target.closest('[data-lpg]');if(!b)return;const g=+b.dataset.lpg;side(pgCaption(L.page_meta,g),lawPageHTML(L.pages_col,L.page_meta,g,null));};
  $('lq').oninput=()=>{const v=west($('lq').value).trim();$('ltoc').hidden=!!v;if(!v){$('lres').innerHTML='';return;}
    let hits;if(/^\d+$/.test(v))hits=A.filter(a=>!a.issue&&String(a.n).startsWith(v));else{const ts=terms(v);hits=A.filter(a=>ts.every(t=>a.ns.includes(t)));}
    $('lres').innerHTML=hits.length?`<p class="muted">${hits.length} مادة</p><div class="rows">${hits.slice(0,80).map(row).join('')}</div>`:'<div class="empty">لا نتائج.</div>';};
  }).catch(()=>{el.innerHTML='<div class="empty">تعذّر تحميل القانون.</div>';});}
function viewArt(id){const el=$('v-item');el.innerHTML=LOADMSG;const lid=lawOfArt(id);
  loadLaw(lid).then(L=>{const a=ARTBYID[id];
  if(!a){el.innerHTML=`<div class="empty">هذه المادة غير موجودة في نص الطبعة المتاح. <button class="linkbtn" data-go="#/law/${lid}">افتح القانون</button></div>`;return;}
  const pv=L.articles.slice(0,a.i).reverse().find(x=>!!x.issue===!!a.issue),nx=L.articles.slice(a.i+1).find(x=>!!x.issue===!!a.issue),ps=artPR(a);document.title=`${a.label} — ${L.short}`;
  const trail=a.trail||[a.part,a.chapter,a.section].filter(Boolean);
  el.innerHTML=`<div class="crumbs no-print"><button data-go="#/laws">التشريعات</button>›<button data-go="#/law/${L.id}">${esc(L.short)}</button>${trail.length?'›<span>'+trail.map(esc).join(' › ')+'</span>':''}</div>
   <div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>${esc(a.label)}${a.issue?' (من مواد الإصدار)':''} — ${esc(L.short)}</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
   <article class="card artcard"><div class="ltxt">${a.paras.length?a.paras.map(x=>`<p>${esc(x)}</p>`).join(''):'<p class="muted">لا يوجد نص لهذه المادة في الطبعة، وقد تبيّن الحاشية سبب ذلك.</p>'}</div>
    ${a.notes&&a.notes.length?`<div class="lnotes"><b>حاشية الطبعة</b>${a.notes.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}
    <div class="verban small">${svg('info')}<span>${esc(L.text_version)}.</span></div>
    <div class="acts no-print"><button class="btn" id="acp">${svg('copy')}نسخ</button><button class="btn" id="ash">${svg('share')}مشاركة</button><button class="btn" id="alk">${svg('link')}الرابط</button></div></article>
   <div class="card inline-src"><h3 style="margin-top:0">صفحة المصدر</h3>${lawPagesHTML(a)}</div>
   <div class="pn no-print">${pv?`<button class="btn" data-go="#/a/${pv.id}">${svg('back')}<span>${esc(pv.label)}</span></button>`:'<span></span>'}${nx?`<button class="btn" data-go="#/a/${nx.id}"><span>${esc(nx.label)}</span><svg class="i" viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="${IC.back}"/></svg></button>`:''}</div>
   <div id="amemo"></div>
   ${a.issue?'':`<h2>مبادئ تذكر هذه المادة (${ps.length})</h2>${ps.length?`<div class="list">${ps.slice(0,40).map(p=>card(p,null)).join('')}</div>${ps.length>40?`<button class="btn" data-f2="1">عرض الكل (${ps.length})</button>`:''}`:'<p class="muted">لا توجد في المكتبة مبادئ تحيل إلى هذه المادة بعد.</p>'}`}`;
  const url=location.href.split('#')[0]+'#/a/'+a.id;
  $('acp').onclick=()=>clip(artQuote(a),()=>toast('نُسخ نص المادة'));
  $('alk').onclick=()=>clip(url,()=>toast('نُسخ الرابط'));
  $('ash').onclick=()=>shareAny(`${a.label} — ${L.title}`,artQuote(a),url,'مشاركة المادة','يُرسل نص المادة مع رابطها في المكتبة.');
  const f2=el.querySelector('[data-f2]');if(f2)f2.onclick=()=>{Object.assign(F,{q:'',col:'',tp:'',ch:'',lw:L.key,art:String(a.n),rv:false,sec:''});go('#/search');};
  if(LAWBYID[L.id]&&LAWBYID[L.id].memo&&!a.issue&&a.n)loadMemo(L.id).then(M=>{const ks=(M.mentions[a.n]||[]);if(!ks.length||!$('amemo'))return;
    $('amemo').innerHTML=`<details class="card mref"><summary><b>في ${esc(M.title.split(' — ')[0])}</b> <span class="muted">${ks.length} فقرة تذكر رقم هذه المادة</span></summary><p class="hint">${esc(M.note)}</p>${ks.slice(0,30).map(k=>`<button class="arow" data-go="#/m/${L.id}/${k}"><b>${esc(pgCaption(M.page_meta,M.paras[k].pg))}</b><span>${esc(M.paras[k].t.slice(0,260))}${M.paras[k].t.length>260?'…':''}</span></button>`).join('')}</details>`;}).catch(()=>{});
  }).catch(()=>{el.innerHTML='<div class="empty">تعذّر تحميل القانون.</div>';});}
function viewMemo(lid,k){const el=$('v-item');el.innerHTML=LOADMSG;k=k==null?null:+k;
  Promise.all([loadLaw(lid),loadMemo(lid)]).then(([L,M])=>{document.title=M.title+' — مبادئ التمييز';
   const W=150;let lo=k==null?0:Math.max(0,k-40),hi=Math.min(M.paras.length,(k==null?0:k)+W);
   const para=(p,i)=>p.h?`<h3 class="mh" id="mp${i}">${esc(p.t)}</h3>`:`<p id="mp${i}"${i===k?' class="hit"':''}>${esc(p.t)} <button class="pgref" data-mpg="${p.pg}" title="صورة الصفحة">${esc((M.page_meta.printed&&M.page_meta.printed[p.pg-1])||p.pg)}</button></p>`;
   const draw=()=>{$('mbody').innerHTML=(lo>0?`<button class="btn" id="mprev">عرض ما قبله</button>`:'')+`<div class="ltxt memo">${M.paras.slice(lo,hi).map((p,j)=>para(p,lo+j)).join('')}</div>`+(hi<M.paras.length?`<button class="btn" id="mnext">عرض المزيد</button>`:'');
     if($('mprev'))$('mprev').onclick=()=>{lo=Math.max(0,lo-W);draw();};if($('mnext'))$('mnext').onclick=()=>{hi=Math.min(M.paras.length,hi+W);draw();};};
   el.innerHTML=`<div class="crumbs no-print"><button data-go="#/laws">التشريعات</button>›<button data-go="#/law/${L.id}">${esc(L.short)}</button>›<span>المذكرة</span></div>
    <div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>${esc(M.title)}</h2></div>
    <div class="verban small">${svg('info')}<span>${esc(M.note)}</span></div><div id="mbody"></div>`;
   draw();el.onclick=e=>{const b=e.target.closest('[data-mpg]');if(!b)return;const g=+b.dataset.mpg;side(pgCaption(M.page_meta,g),lawPageHTML(M.pages_col,M.page_meta,g,null));};
   if(k!=null)setTimeout(()=>{const t=$('mp'+k);if(t)t.scrollIntoView({block:'center'});},60);
  }).catch(()=>{el.innerHTML='<div class="empty">تعذّر تحميل المذكرة.</div>';});}
// ---------- views scaffold
const main=$('main');
const SNAV=[['home','home','الرئيسية','مبدأ اليوم وما فتحته مؤخرًا'],['search','search','البحث',`في ${nf(PR.length)} مبدأً`],['index','book','الفهرس','الموضوعات والقوانين والكتب'],['saved','star','المحفوظات','مجلداتك وملاحظاتك'],['report','report','التقارير','طريقة الاستخراج والتحقق'],['laws','scroll','التشريعات','نصوص القوانين مادةً مادة'],['about','info','عن المكتبة','المصادر وقواعد النزاهة']];
IC.home='M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z';
main.innerHTML=`<div class="shell"><aside class="sidenav" aria-label="الأقسام">${SNAV.map(([k,i,t,d])=>`<button class="navcard" data-nav="${k}"><span class="ic">${svg(i)}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}
 <button class="navcard" data-a2="settings"><span class="ic">${svg('gear')}</span><span><b>الإعدادات</b><small>الخط والمظهر والقفل</small></span></button>
 ${FB.url?`<button class="navcard" data-a2="rate"><span class="ic">${svg('star')}</span><span><b>قيّم التطبيق</b><small>رأيك يصلنا مباشرة</small></span></button>`:''}</aside>
 <div class="views">${['home','search','index','saved','more','item','report','about','laws'].map(v=>`<section id="v-${v}" hidden></section>`).join('')}</div></div>`;
// ---------- search engine
const F={q:'',col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:''};
function terms(q){const o=[];west(q).replace(/"([^"]+)"|«([^»]+)»|(\S+)/g,(m,a,b,c)=>{const t=norm(a||b||c);if(t)o.push(t)});return o;}
const CLS={'ا':'[اأإآ]','ي':'[يىئ]','ه':'[هة]','و':'[وؤ]'};
function hlRe(ts){if(!ts.length)return null;return new RegExp('('+ts.map(t=>[...t].map(ch=>ch===' '?'\\s+':(CLS[ch]||ch.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&'))+'[\\u064B-\\u0652\\u0640]*').join('')).join('|')+')','g');}
const hl=(s,re)=>{s=esc(s);return re?s.replace(re,'<mark>$1</mark>'):s;};
let cur=[],shown=30;
function filterPR(){const ts=terms(F.q),art=west(F.art).replace(/\s+/g,'');
  return PR.filter(p=>ts.every(t=>p.ns.includes(t))&&(!F.col||p.col===F.col)&&(!F.tp||p.tp.some(x=>x[0]===F.tp))&&(!F.ch||p.c.some(x=>x.ch===F.ch))&&(!F.rv||p.rv.length)&&(!F.sec||p.sk===F.sec||p.sk.startsWith(F.sec+'›'))
   &&(!F.lw&&!art||p.lw.some(([l,as])=>(!F.lw||l===F.lw)&&(!art||as.some(a=>a===art||a.split('/')[0]===art)))));}
// ---------- card
function blocks(p){const o=[];let ci=0;const pos=p.cp&&p.cp.length===p.c.length?p.cp:p.c.map(()=>p.p.length);
  p.p.forEach((x,k)=>{o.push(['t',x]);while(ci<p.c.length&&pos[ci]===k+1)o.push(['c',p.c[ci++]]);});while(ci<p.c.length)o.push(['c',p.c[ci++]]);return o;}
const MT={b:'مصنَّف من أبواب الكتاب',k:'الكلمة المفتاحية للمكتب الفني',a:'تصنيف آلي — يحتاج تأكيدًا'};
function card(p,re,o={}){
  const h=[];let open=false;
  blocks(p).forEach(([k,x])=>{if(k==='t'){if(open){h.push('</ul>');open=false;}h.push(`<p>${hl(x,re)}</p>`);}else{if(!open){h.push('<ul class="cits">');open=true;}
    const n=x.k&&RUL[x.k]?RUL[x.k].length:0;h.push(`<li>${hl(x.raw,re)}${x.k?`<button class="rk" data-go="#/r/${esc(x.k)}" title="كل ما ورد عن هذا الحكم">الحكم${n>1?' · '+n:''}</button>`:''}</li>`);}});
  if(open)h.push('</ul>');if(!p.c.length)h.push('<ul class="cits"><li>لا يوجد إسناد في المصدر</li></ul>');
  const rel=(p.rel||[]).map(id=>BYID[id]?`<button class="chip" data-go="#/p/${id}">${esc(COLS[BYID[id].col].name)} ${BYID[id].n}</button>`:'').join('');
  const tps=p.tp.filter(x=>TL[x[0]]).map(([t,m,lo])=>`<button class="chip${m==='a'?' auto':''}${lo?' low':''}" data-f="tp" data-v="${esc(t)}" title="${esc(TL[t][0])} — ${MT[m]||''}">${esc(TL[t][1])}</button>`).join('');
  const lws=p.lw.map(([l,as,su])=>`<button class="chip lw${su?' sus':''}${LAWBYKEY[l]?' full':''}" ${LAWBYKEY[l]?(artOf(l,as[0])?`data-go="#/a/${artOf(l,as[0]).id}"`:`data-go="#/law/${LAWBYKEY[l].id}"`):`data-f="lw" data-v="${esc(l)}"`} title="${esc(LL[l]||l)}${LAWBYKEY[l]?' — افتح نص المادة':''}">${as.length?'م '+esc(as.slice(0,3).join('، '))+(as.length>3?'…':'')+' · ':''}${l==='دستور'?'الدستور':'ق '+esc(l)}</button>`).join('');
  const fav=!!FAV[p.id],note=NOTE[p.id];
  return `<article class="pr card" id="p${p.id}" data-id="${p.id}">
   <div class="num">${p.n}${p.np!==p.n?`<small>طُبع ${p.np}</small>`:''}<div class="idchip">${p.id}</div></div>
   <div class="body">
    <div class="crumb"><span>${esc(COLS[p.col].name)}</span>${p.sec.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    ${p.ttl?`<div class="ttl">${hl(p.ttl,re)}</div>`:''}<div class="text">${h.join('')}</div>
    ${p.rule?`<details class="rule"${o.open||(re&&(re.lastIndex=0,re.test(p.rule)))?' open':''}><summary>القاعدة — نص الحكم</summary><div class="text">${hl(p.rule,re)}</div></details>`:''}
    ${p.fn.length?`<div class="fn">${p.fn.map(esc).join('<br>')}</div>`:''}${p.sa.length?`<div class="sa">${p.sa.map(esc).join('<br>')}</div>`:''}
    <div class="meta">${p.rv.length?'<span class="chip flag">يحتاج مراجعة</span>':''}${tps}${lws}${rel?`<span class="relw">الحكم نفسه في: ${rel}</span>`:''}</div>
    <div class="acts no-print">
     <button class="btn" data-a="copy">${svg('copy')}نسخ</button>
     <button class="btn" data-a="share">${svg('share')}مشاركة</button>
     <button class="btn${fav?' on':''}" data-a="fav">${svg('star')}${fav?'محفوظ':'حفظ'}</button>
     <button class="btn" data-a="note">${svg('note')}ملاحظة</button>
     ${'speechSynthesis' in window?`<button class="btn" data-a="speak">${svg('speak')}استماع</button>`:''}
     <span class="sp"></span>
     <button class="btn" data-a="src">${svg('page')}ص ${printed(p).join('–')}</button>
     ${o.page?'':`<button class="btn" data-go="#/p/${p.id}">${svg('open')}فتح</button>`}
    </div>
   </div>
   ${p.rv.length?`<div class="review">${p.rv.map(esc).join(' · ')}</div>`:''}
   ${note?`<div class="note"><b>ملاحظتي</b>${esc(note)}</div>`:''}
  </article>`;}
const refreshCard=id=>document.querySelectorAll(`article.pr[data-id="${id}"]`).forEach(a=>{const o=a.querySelector('details.rule[open]');a.outerHTML=card(BYID[id],null,{page:a.closest('#v-item')&&a.parentElement.dataset.main==='1',open:!!o});});
// ---------- copy / share text (عقد البيانات §10)
const BASE=location.href.split('#')[0].replace(/index\.html$/,'');
function quoteText(p){const t=blocks(p).filter(b=>b[0]==='t').map(b=>b[1]).join('\n');
  return (p.ttl?p.ttl+'\n':'')+t+(p.rule?'\nالقاعدة:\n'+p.rule:'')+'\n'+(p.c.length?p.c.map(c=>c.raw).join('\n'):'(لا يوجد إسناد في المصدر)')+(p.fn.length?'\n'+p.fn.join('\n'):'')+`\n[المصدر: ${COLS[p.col].title} — ص ${printed(p).join('–')}]`;}
const plink=p=>BASE+'#/p/'+p.id;
function clip(t,ok){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(ok,()=>{const a=document.createElement('textarea');a.value=t;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(_){toast('تعذّر النسخ')}a.remove()});}
// ---------- dialogs
function dlg(title,html,cls=''){closeDlg();const L=$('layer');L.innerHTML=`<div class="scrim" data-close></div><div class="dlg ${cls}" role="dialog" aria-label="${esc(title)}"><h3>${title}<button class="btn icon x" data-close aria-label="إغلاق">${svg('x')}</button></h3>${html}</div>`;return L.querySelector('.dlg');}
function side(title,html){closeDlg();const L=$('layer');L.innerHTML=`<div class="scrim" data-close></div><aside class="side" role="dialog"><div class="side-h"><b>${esc(title)}</b><button class="btn" data-close>إغلاق</button></div><div class="side-b">${html}</div></aside>`;return L.querySelector('.side-b');}
function closeDlg(){$('layer').innerHTML='';}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDlg();if(e.key==='/'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();go('#/search');setTimeout(()=>$('sq')?.focus(),30);}});
function shareDlg(p){shareAny(`${COLS[p.col].name} ${p.n} — مبادئ التمييز`,quoteText(p),plink(p),'مشاركة المبدأ','يُرسل النص حرفيًا مع سطر الإسناد والمصدر ورابط المبدأ.');}
function shareAny(subj,body,url,title,hint){
  const text=body+'\n'+url;
  const d=dlg(title,`<div class="sharegrid">
   <a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener"><span class="ic" style="background:#25d366">${svg('wa')}</span>واتساب</a>
   <a href="mailto:?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(text)}"><span class="ic" style="background:#1a4b8c">${svg('mail')}</span>البريد</a>
   ${navigator.share?`<button data-s="native"><span class="ic" style="background:#0b1f3b">${svg('share')}</span>مشاركة…</button>`:''}
   <button data-s="link"><span class="ic" style="background:#b8923a">${svg('link')}</span>نسخ الرابط</button>
  </div><p class="hint" style="margin-top:12px">${hint}</p>`);
  d.addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;
    if(b.dataset.s==='native')navigator.share({title:subj,text:body,url}).catch(()=>{});
    if(b.dataset.s==='link')clip(url,()=>{toast('نُسخ الرابط');closeDlg();});});
}
function favDlg(p){
  const cur=FAV[p.id];
  const d=dlg(cur?'محفوظ في المحفوظات':'حفظ المبدأ',`<div class="set"><section><h4>المجلد</h4><div class="folders">${FOLD.map(f=>`<button data-fold="${esc(f)}" aria-pressed="${cur&&cur.f===f}">${esc(f)}</button>`).join('')}</div>
   <div class="rowi"><input type="text" id="nf" placeholder="مجلد جديد: مثل قضية 123/2026"><button class="btn" id="nfb">إضافة</button></div></section>
   ${cur?`<button class="btn" id="unfav">إزالة من المحفوظات</button>`:''}</div>`);
  const put=f=>{FAV[p.id]={f,t:Date.now()};LS.set('favs',FAV);refreshCard(p.id);closeDlg();toast('حُفظ في «'+f+'»');};
  d.addEventListener('click',e=>{const b=e.target.closest('[data-fold]');if(b)put(b.dataset.fold);});
  $('nfb').onclick=()=>{const v=$('nf').value.trim();if(!v)return;if(!FOLD.includes(v)){FOLD.push(v);LS.set('folders',FOLD);}put(v);};
  if(cur)$('unfav').onclick=()=>{delete FAV[p.id];LS.set('favs',FAV);refreshCard(p.id);closeDlg();toast('أُزيل من المحفوظات');};
}
function noteDlg(p){
  const d=dlg('ملاحظتي على المبدأ',`<div class="set"><textarea id="nt" rows="6" style="font:inherit;padding:10px;border:1px solid var(--rule);border-radius:12px;background:var(--bg);color:var(--ink);width:100%">${esc(NOTE[p.id]||'')}</textarea>
   <div class="rowi"><button class="btn primary" id="ns">حفظ</button>${NOTE[p.id]?'<button class="btn" id="nd">حذف الملاحظة</button>':''}<span class="hint">تُحفظ في هذا الجهاز فقط.</span></div></div>`);
  $('nt').focus();
  $('ns').onclick=()=>{const v=$('nt').value.trim();if(v)NOTE[p.id]=v;else delete NOTE[p.id];LS.set('notes',NOTE);refreshCard(p.id);closeDlg();toast('حُفظت الملاحظة');};
  if($('nd'))$('nd').onclick=()=>{delete NOTE[p.id];LS.set('notes',NOTE);refreshCard(p.id);closeDlg();};
}
let speakingId=null;
function speak(p,btn){
  const ss=window.speechSynthesis;
  if(speakingId===p.id){ss.cancel();speakingId=null;document.querySelectorAll('.speaking').forEach(x=>x.classList.remove('speaking'));return;}
  ss.cancel();const u=new SpeechSynthesisUtterance((p.ttl?p.ttl+'. ':'')+p.p.join(' ').replace(/[ً-ْ]/g,''));u.lang='ar-SA';u.rate=.95;
  const v=ss.getVoices().find(v=>/^ar/i.test(v.lang));if(v)u.voice=v;else toast('قد لا يتوفر صوت عربي في هذا الجهاز');
  const a=document.querySelector(`article.pr[data-id="${p.id}"]`);a?.classList.add('speaking');speakingId=p.id;
  u.onend=u.onerror=()=>{a?.classList.remove('speaking');speakingId=null;};ss.speak(u);
}
// ---------- source pages
const PT={};
async function pageLines(col,g){const b=Math.floor((g-1)/1000),k=col+'/'+b;if(!PT[k])PT[k]=fetch(`pagetext/${col}/t${String(b).padStart(3,'0')}.json`).then(r=>r.ok?r.json():{}).catch(()=>({}));return (await PT[k])[g]||[];}
function pagesHTML(p){const C=COLS[p.col],PW=C.pw||595.276,PH=C.ph||822.047,cr=C.crop||[0,0,1,1],cell=C.cell||[684,1000],cw=cr[2]-cr[0],chh=cr[3]-cr[1];
  return p.pg.map(g=>{const reg=p.rg.find(r=>r.page===g);
    const box=reg?`<div class="hlbox" style="left:${((reg.bbox[0]-6)/PW-cr[0])/cw*100}%;top:${((reg.bbox[1]-4)/PH-cr[1])/chh*100}%;width:${(reg.bbox[2]-reg.bbox[0]+12)/PW/cw*100}%;height:${(reg.bbox[3]-reg.bbox[1]+8)/PH/chh*100}%"></div>`:'';
    const gp=C.gp||20,gc=gp/10,b=Math.floor((g-1)/gp),k=(g-1)%gp,cx=k%gc,ry=Math.floor(k/gc);
    return `<figure class="pg"><div class="pgimg" role="img" aria-label="صورة الصفحة ${g+C.off}" style="aspect-ratio:${cell[0]}/${cell[1]};background-image:url(pages/${p.col}/g${String(b).padStart(3,'0')}.webp);background-size:${gc*100}% 1000%;background-position:${cx*100/(gc-1)}% ${ry*100/9}%">${box}</div><figcaption>الصفحة ${g+C.off} من الكتاب</figcaption></figure><details class="pgtxt" data-id="${p.id}" data-g="${g}"><summary>نص الصفحة المستخرج</summary><div class="ptx">…</div></details>`;}).join('');}
function wirePages(root){root.querySelectorAll('details.pgtxt').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open||d.dataset.ok)return;d.dataset.ok=1;
  const p=BYID[d.dataset.id],g=+d.dataset.g,reg=p.rg.find(r=>r.page===g),ls=await pageLines(p.col,g);
  d.querySelector('.ptx').innerHTML=ls.map(([t,top,size,bb])=>`<div class="ln${reg&&top>=reg.bbox[1]-1&&top<=reg.bbox[3]?' hit':''}${bb||size>=18?' h':''}${size<=12?' small':''}">${esc(t)}</div>`).join('')||'—';}));}
function openSrc(p){const b=side(`${COLS[p.col].name} · ${p.n} · ص ${printed(p).join('–')}`,pagesHTML(p));wirePages(b);const hb=b.querySelector('.hlbox');if(hb)setTimeout(()=>{b.scrollTop=Math.max(0,hb.offsetTop+hb.parentElement.offsetTop-b.clientHeight/3)},40);}
// ---------- HOME
function dailyPick(){const pool=PR.filter(p=>!p.rv.length&&p.c.length);const d=new Date();const k=d.getFullYear()*372+d.getMonth()*31+d.getDate();return pool[(k*2654435761>>>0)%pool.length];}
function mini(p){return `<button class="mini card" data-go="#/p/${p.id}"><span class="s">${esc(COLS[p.col].name)} · ${p.n}</span><span class="t">${esc(p.ttl||p.p[0])}</span></button>`;}
function viewHome(){
  const el=$('v-home'),dp=dailyPick(),hr=new Date().getHours();
  const greet=(hr<12?'صباح الخير':'مساء الخير')+(S.name?'، '+esc(S.name):'');
  const tops=['L06','L08','P12','P01'].filter(t=>TL[t]);
  const recent=HIST.map(i=>BYID[i]).filter(Boolean).slice(0,10);
  el.innerHTML=`<div class="hero"><h1>${greet}</h1><p>ابحث في ${nf(PR.length)} مبدأ من مبادئ محكمة التمييز، حرفيًا كما في مصادرها.</p>
   <form class="sbox" id="hsf">${svg('search')}<input id="hq" type="search" placeholder="كلمة، عبارة، رقم طعن أو مادة…" autocomplete="off" enterkeyhint="search">${micBtn('hq')}<button class="btn primary" type="submit">بحث</button></form>
   <div class="quick">${(QH.length?QH.slice(0,4).map(q=>`<button class="chip" data-q="${esc(q)}">${svg('clock')}${esc(q)}</button>`):[]).join('')}${tops.map(t=>`<button class="chip" data-f="tp" data-v="${t}">${esc(TL[t][1])}</button>`).join('')}</div></div>
   <div>
   <h2>مبدأ اليوم</h2><div class="card daily"><div class="lbl">${svg('star')} ${esc(COLS[dp.col].title)} — ${dp.n}</div><div class="text">${esc(dp.p.join(' '))}</div><ul class="cits">${dp.c.map(c=>`<li>${esc(c.raw)}</li>`).join('')}</ul><button class="btn" data-go="#/p/${dp.id}">${svg('open')}فتح المبدأ</button></div>
   ${recent.length?`<h2>فتحتها مؤخرًا</h2><div class="hrow">${recent.map(mini).join('')}</div>`:''}
   <h2>تصفح حسب الموضوع</h2><div class="grid g3">${FAMS.map(famTile).join('')}</div>
   <h2>الكتب والمجموعات</h2><div class="grid g3">${ORDER.map(bookTile).join('')}</div>
   <h2>المكتبة بالأرقام</h2><div class="stats"><div class="stat card"><b>${nf(PR.length)}</b><span>مبدأ</span></div><div class="stat card"><b>${nf(Object.keys(RUL).length)}</b><span>حكمًا مفهرسًا</span></div><div class="stat card"><b>${ORDER.length}</b><span>مجموعة</span></div><div class="stat card"><b>${LORD.length}</b><span>قانونًا مُحالًا إليه</span></div></div>
   </div>`;
  weave(el.querySelector('.hero'),8);
  $('hsf').onsubmit=e=>{e.preventDefault();doSearch($('hq').value);};
}
const maxFam=()=>Math.max(...Object.values(famcount));
function famTile(f){return `<button class="tile" data-go="#/index/fam/${encodeURIComponent(f)}"><span class="ic">${svg(FAMIC[famLetter[f]]||'scale')}</span><b>${esc(f)}</b><span class="n">${nf(famcount[f]||0)} مبدأ · ${TORD.filter(t=>famOf(t)===f).length} موضوعًا</span><span class="meter"><i style="width:${(famcount[f]||0)/maxFam()*100}%"></i></span></button>`;}
function bookTile(c){return `<button class="tile book" data-go="#/index/book/${c}"><span class="spine"></span><span><b>${esc(COLS[c].name)}</b><br><span class="n">${nf(COLS[c].n)} مبدأ</span></span></button>`;}
function doSearch(q){q=(q||'').trim();Object.assign(F,{q,col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:''});if(q){QH=[q,...QH.filter(x=>x!==q)].slice(0,8);LS.set('qhist',QH);}go('#/search');}
// ---------- voice search
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function micBtn(target){return SR?`<button class="btn icon" type="button" data-mic="${target}" title="بحث بالصوت" aria-label="بحث بالصوت">${svg('mic')}</button>`:'';}
function listen(target,btn){const r=new SR();r.lang='ar-KW';r.interimResults=false;btn.classList.add('on');toast('تحدّث الآن…');
  r.onresult=e=>{const t=e.results[0][0].transcript;const i=$(target);i.value=t;if(target==='hq')doSearch(t);else{F.q=t;runSearch();}};
  r.onend=()=>btn.classList.remove('on');r.onerror=()=>{btn.classList.remove('on');toast('تعذّر التعرّف على الصوت');};r.start();}
// ---------- SEARCH
function buildSearch(){
  const el=$('v-search');
  el.innerHTML=`<div class="searchbar"><form class="sbox" id="ssf">${svg('search')}<input id="sq" type="search" placeholder="ابحث في نص المبدأ أو الإسناد: مكافأة نهاية الخدمة، 423/2003، «الفصل التعسفي»" autocomplete="off" enterkeyhint="search">${micBtn('sq')}<button class="btn" type="button" id="ftog">${svg('filter')}تصفية</button></form>
   <div class="card filters" id="fbox" hidden>
    <label>المجموعة<select id="fcol"><option value="">الكل</option>${ORDER.map(k=>`<option value="${k}">${esc(COLS[k].name)} (${nf(COLS[k].n)})</option>`).join('')}</select></label>
    <label>الموضوع<select id="ftp"><option value="">الكل</option>${FAMS.map(f=>`<optgroup label="${esc(f)}">${TORD.filter(t=>famOf(t)===f).map(t=>`<option value="${esc(t)}">${esc(TL[t][1])} (${tcount[t]})</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label>الدائرة<select id="fch"><option value="">الكل</option>${CHS.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
    <label>القانون<select id="flw"><option value="">الكل</option>${LORD.map(l=>`<option value="${esc(l)}">${esc(LL[l]||l)} (${lcount[l]})</option>`).join('')}</select></label>
    <label>المادة<input id="fart" inputmode="numeric" placeholder="مثل 51" autocomplete="off"></label>
    <label class="ck"><input id="frv" type="checkbox"> يحتاج مراجعة فقط</label>
   </div>
   <div class="bar2"><div class="active-f" id="actf"></div><span class="count" id="count"></span></div>
   <div class="hint">البحث يتجاهل التشكيل والهمزات والتاء المربوطة. ضع العبارة بين علامتي تنصيص للبحث عنها متصلة. اضغط «/» للبحث من أي مكان.</div></div>
   <div class="list" id="list"></div><div class="more"><button class="btn" id="more" hidden>عرض المزيد</button></div>`;
  let t;$('sq').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{F.q=$('sq').value;runSearch()},150)});
  $('ssf').onsubmit=e=>{e.preventDefault();const q=$('sq').value.trim();if(q){QH=[q,...QH.filter(x=>x!==q)].slice(0,8);LS.set('qhist',QH);}$('sq').blur();};
  $('ftog').onclick=()=>$('fbox').hidden=!$('fbox').hidden;
  [['fcol','col'],['ftp','tp'],['fch','ch'],['flw','lw']].forEach(([i,k])=>$(i).onchange=()=>{F[k]=$(i).value;runSearch()});
  $('fart').oninput=()=>{clearTimeout(t);t=setTimeout(()=>{F.art=$('fart').value;runSearch()},200)};
  $('frv').onchange=()=>{F.rv=$('frv').checked;runSearch()};
  $('more').onclick=()=>{shown+=30;renderList()};
}
function syncInputs(){$('sq').value=F.q;$('fcol').value=F.col;$('ftp').value=F.tp;$('fch').value=F.ch;$('flw').value=F.lw;$('fart').value=F.art;$('frv').checked=F.rv;}
function runSearch(){shown=30;cur=filterPR();renderList();
  const L={col:v=>COLS[v]?.name,tp:v=>TL[v]?.[1],ch:v=>v,lw:v=>LL[v]||v,art:v=>'المادة '+v,rv:()=>'يحتاج مراجعة',sec:v=>v.split('›').slice(-1)[0]};
  $('actf').innerHTML=Object.keys(L).filter(k=>F[k]).map(k=>`<button class="chip" data-clr="${k}">${esc(L[k](F[k]))}</button>`).join('');
  $('count').textContent=`${nf(cur.length)} من ${nf(PR.length)}`;}
function renderList(){const re=hlRe(terms(F.q));const ah=artHits();$('list').innerHTML=(ah.length?`<div class="arthits card"><h3>${svg('scroll')} في نصوص التشريعات (${ah.length>5?'أول 5 من '+ah.length:ah.length})</h3>${ah.slice(0,5).map(([L,a])=>`<button class="arow" data-go="#/a/${a.id}"><b>${esc(a.label)} · ${esc(L.short)}</b><span>${hl(a.paras.join(' ').slice(0,220),re)}${a.paras.join(' ').length>220?'…':''}</span></button>`).join('')}</div>`:'')+(cur.length?cur.slice(0,shown).map(p=>card(p,re)).join(''):'<div class="empty">لا توجد نتائج. جرّب كلمة أقصر أو أزل أحد المرشحات.</div>');$('more').hidden=cur.length<=shown;}
function setFilter(k,v){Object.assign(F,{q:'',col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:''});F[k]=v;go('#/search');}
// ---------- INDEX
let idxTab='topics';
function viewIndex(sub,arg){
  const el=$('v-index');
  if(sub==='fam')return famPage(el,arg);
  if(sub==='law')return lawPage(el,arg);
  if(sub==='book')return bookPage(el,arg);
  if(['topics','laws','books'].includes(sub))idxTab=sub;
  el.innerHTML=`<div class="vh"><h2>الفهرس</h2><div class="seg" role="group">${[['topics','الموضوعات'],['laws','القوانين'],['books','الكتب']].map(([k,l])=>`<button data-go="#/index/${k}" aria-pressed="${idxTab===k}">${l}</button>`).join('')}</div></div><div id="ixb"></div>`;
  const b=$('ixb');
  if(idxTab==='topics'){b.innerHTML=`<p class="muted">التصنيف الموحّد يجمع مبادئ كل المجموعات تحت موضوع واحد مهما اختلف تبويب كتابها. التصنيف وصف مساعد لا يغيّر شيئًا من النص.</p><input class="flt" id="tflt" placeholder="ابحث عن موضوع…"><div id="tres"></div><div class="grid g3" id="fams">${FAMS.map(famTile).join('')}</div>`;
    $('tflt').oninput=()=>{const q=norm($('tflt').value);$('fams').hidden=!!q;$('tres').innerHTML=q?`<div class="rows">${TORD.filter(t=>norm(TL[t][1]).includes(q)).slice(0,80).map(t=>topicRow(t)).join('')||'<div class="empty">لا يوجد موضوع بهذا الاسم.</div>'}</div>`:'';};}
  if(idxTab==='laws'){const mx=lcount[LORD[0]];b.innerHTML=`<p class="muted">القوانين التي تحيل إليها نصوص المبادئ، مرتبة بعدد المبادئ. افتح القانون لترى مواده.</p><input class="flt" id="lflt" placeholder="ابحث باسم القانون أو رقمه…"><div class="rows" id="lrows"></div>`;
    const draw=q=>$('lrows').innerHTML=LORD.filter(l=>!q||norm(LL[l]||l).includes(q)||l.includes(q)).map(l=>`<button class="row" data-go="#/index/law/${encodeURIComponent(l)}"><span>${esc(LL[l]||l)}</span><span class="n">${nf(lcount[l])}</span><span class="bar"><i style="width:${lcount[l]/mx*100}%"></i></span></button>`).join('');
    draw('');$('lflt').oninput=()=>draw(norm(west($('lflt').value)));}
  if(idxTab==='books'){b.innerHTML=`<p class="muted">تصفح كل كتاب بأبوابه وعناوينه كما وردت فيه.</p><div class="grid g3">${ORDER.map(bookTile).join('')}</div>`;}
}
function topicRow(t,mx){return `<button class="row" data-f="tp" data-v="${esc(t)}"><span>${esc(TL[t][1])}${mx?'':` <small class="muted">— ${esc(TL[t][0])}</small>`}</span><span class="n">${nf(tcount[t])}</span>${mx?`<span class="bar"><i style="width:${tcount[t]/mx*100}%"></i></span>`:''}</button>`;}
function famPage(el,f){const ts=TORD.filter(t=>famOf(t)===f),mx=Math.max(...ts.map(t=>tcount[t]));
  el.innerHTML=`<div class="crumbs"><button data-go="#/index/topics">الفهرس</button>›<span>${esc(f)}</span></div><div class="vh"><span class="tile" style="padding:0;border:0;box-shadow:none;background:none"><span class="ic">${svg(FAMIC[famLetter[f]]||'scale')}</span></span><h2>${esc(f)}</h2><span class="muted">${nf(famcount[f]||0)} مبدأ</span></div>
   <input class="flt" id="fflt" placeholder="ابحث في موضوعات «${esc(f)}»…"><div class="rows" id="frows"></div>`;
  const draw=q=>$('frows').innerHTML=ts.filter(t=>!q||norm(TL[t][1]).includes(q)).map(t=>topicRow(t,mx)).join('')||'<div class="empty">لا نتائج.</div>';draw('');$('fflt').oninput=()=>draw(norm($('fflt').value));}
function lawPage(el,l){const as=Object.keys(acount).filter(k=>k.startsWith(l+'|')).map(k=>k.slice(l.length+1)).sort((a,b)=>(parseInt(a)||1e9)-(parseInt(b)||1e9)||a.localeCompare(b));
  const cs=as.map(a=>acount[l+'|'+a]).sort((a,b)=>a-b),q=i=>cs[Math.floor(cs.length*i)]||1;
  el.innerHTML=`<div class="crumbs"><button data-go="#/index/laws">القوانين</button>›<span>${esc(l)}</span></div><div class="vh"><h2>${esc(LL[l]||l)}</h2><button class="btn primary" data-f="lw" data-v="${esc(l)}">كل المبادئ (${nf(lcount[l])})</button></div>
   ${LAWBYKEY[l]?`<button class="lawbanner card" data-go="#/law/${LAWBYKEY[l].id}">${svg('scroll')}<span><b>النص الكامل لهذا القانون متاح</b><small>${nf(LAWBYKEY[l].articles)} مادة، وكل مادة مع مبادئها</small></span></button>`:''}
   ${as.length?`<p class="muted">المواد التي تذكرها المبادئ. كلما اشتد اللون كثرت المبادئ.</p><input class="flt" id="aflt" inputmode="numeric" placeholder="رقم المادة…" style="max-width:200px"><div class="arts" id="arts"></div>`:'<p class="muted">لم تُذكر مواد محددة من هذا القانون.</p>'}`;
  if(!as.length)return;
  const draw=v=>$('arts').innerHTML=as.filter(a=>!v||a.startsWith(v)).map(a=>{const n=acount[l+'|'+a];return `<button data-art="${esc(a)}" class="${n>=q(.9)?'h3':n>=q(.7)?'h2':n>=q(.4)?'h1':''}"><b>${esc(a)}</b><small>${n}</small></button>`}).join('');
  draw('');$('aflt').oninput=()=>draw(west($('aflt').value).trim());
  $('arts').onclick=e=>{const b=e.target.closest('[data-art]');if(!b)return;const A=artOf(l,b.dataset.art);if(A){go('#/a/'+A.id);return;}Object.assign(F,{q:'',col:'',tp:'',ch:'',lw:l,art:b.dataset.art,rv:false,sec:''});go('#/search');};}
function bookPage(el,c){const C=COLS[c];if(!C){el.innerHTML='<div class="empty">غير موجود.</div>';return;}
  const root={k:{},n:0};PR.forEach(p=>{if(p.col!==c)return;let node=root;node.n++;p.sec.forEach(s=>{node.k[s]=node.k[s]||{k:{},n:0};node=node.k[s];node.n++;});});
  const tree=(node,path,d)=>Object.entries(node.k).map(([s,ch])=>{const pth=path?path+'›'+s:s;const kids=Object.keys(ch.k).length;
    return kids?`<details${d===0&&Object.keys(node.k).length<6?' open':''}><summary>${esc(s)}<span class="n">${nf(ch.n)}</span></summary><button class="leaf" data-sec="${esc(pth)}">كل مبادئ هذا الباب<span class="n">${nf(ch.n)}</span></button>${tree(ch,pth,d+1)}</details>`:`<button class="leaf" data-sec="${esc(pth)}">${esc(s)}<span class="n">${nf(ch.n)}</span></button>`}).join('');
  el.innerHTML=`<div class="crumbs"><button data-go="#/index/books">الكتب</button>›<span>${esc(C.name)}</span></div><div class="vh"><h2>${esc(C.title)}</h2><button class="btn primary" data-f="col" data-v="${c}">كل المبادئ (${nf(C.n)})</button></div><div class="card tree" style="padding:10px 12px">${tree(root,'',0)}</div>`;
  el.querySelector('.tree').onclick=e=>{const b=e.target.closest('[data-sec]');if(!b)return;Object.assign(F,{q:'',col:c,tp:'',ch:'',lw:'',art:'',rv:false,sec:b.dataset.sec});go('#/search');};}
// ---------- ITEM & RULING
function pnav(p){const i=POS[p.id],a=PR[i-1],b=PR[i+1];const ok=q=>q&&q.col===p.col;
  return `<div class="pn no-print">${ok(a)?`<button class="btn" data-go="#/p/${a.id}">${svg('back')}<span>السابق: ${a.n}</span></button>`:'<span></span>'}${ok(b)?`<button class="btn" data-go="#/p/${b.id}"><span>التالي: ${b.n}</span><svg class="i" viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="${IC.back}"/></svg></button>`:''}</div>`;}
function viewItem(id){const el=$('v-item'),p=BYID[id];
  if(!p){el.innerHTML=`<div class="empty">لا يوجد مبدأ بالمعرّف ${esc(id)}.</div>`;return;}
  HIST=[id,...HIST.filter(x=>x!==id)].slice(0,30);LS.set('hist',HIST);
  document.title=`${COLS[p.col].name} ${p.n} — مبادئ التمييز`;
  const rel=(p.rel||[]).map(i=>BYID[i]).filter(Boolean);
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>${esc(COLS[p.col].title)} — ${p.n}</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
   <div class="list" data-main="1">${card(p,null,{page:1,open:1})}</div>
   <div class="card inline-src"><h3 style="margin-top:0">صفحة المصدر (${printed(p).join('–')})</h3>${pagesHTML(p)}</div>
   ${pnav(p)}
   ${rel.length?`<h2>الحكم نفسه في مجموعات أخرى (${rel.length})</h2><div class="list">${rel.map(q=>card(q,null)).join('')}</div>`:''}`;
  wirePages(el);}
function viewRuling(key){const el=$('v-item'),ids=RUL[key]||[],[ap,ses]=key.split('@');
  const chs=[...new Set(ids.flatMap(i=>BYID[i].c.filter(c=>c.k===key).map(c=>c.ch)).filter(Boolean))],srcs=[...new Set(ids.map(i=>COLS[BYID[i].col].name))];
  const cit=ids.length?BYID[ids[0]].c.find(c=>c.k===key):null;document.title=`الطعن ${ap} — مبادئ التمييز`;
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>بطاقة الحكم</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
   <div class="card rhead"><div class="kv"><span><b>الطعن</b>${esc(ap.replace(/\+/g,' ، '))}</span>${chs.length?`<span><b>الدائرة</b>${esc(chs.join('، '))}</span>`:''}<span><b>الجلسة</b>${esc(ses?ses.split('-').reverse().join('/'):'')}</span><span><b>المبادئ</b>${ids.length}</span></div>
   ${srcs.length?`<div class="kv"><span><b>ورد في</b>${esc(srcs.join('، '))}</span></div>`:''}${cit?`<div class="hint">سطر الإسناد كما في المصدر: ${esc(cit.raw)}</div>`:''}</div>
   <div class="list">${ids.length?ids.map(i=>card(BYID[i],null)).join(''):`<div class="empty">لا يوجد في المكتبة حكم بهذا المفتاح.</div>`}</div>`;}
// ---------- SAVED
let savedTab='favs',savedFold='';
function viewSaved(){const el=$('v-saved');
  const favs=Object.entries(FAV).filter(([id])=>BYID[id]).sort((a,b)=>b[1].t-a[1].t);
  const usedF=[...new Set(favs.map(x=>x[1].f))];
  let body='';
  if(savedTab==='favs'){const list=favs.filter(x=>!savedFold||x[1].f===savedFold).map(x=>BYID[x[0]]);
    body=favs.length?`<div class="folders"><button data-sf="" aria-pressed="${!savedFold}">الكل (${favs.length})</button>${usedF.map(f=>`<button data-sf="${esc(f)}" aria-pressed="${savedFold===f}">${esc(f)} (${favs.filter(x=>x[1].f===f).length})</button>`).join('')}</div>
      <div class="rowi" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-a2="printsaved">${svg('print')}طباعة «مذكرة مبادئ»</button><button class="btn" data-a2="copysaved">${svg('copy')}نسخ الكل</button></div>
      <div class="list">${list.map(p=>card(p,null)).join('')}</div>`:`<div class="empty">لا توجد محفوظات بعد. اضغط «حفظ» على أي مبدأ لتجده هنا، ويمكنك تنظيمه في مجلدات مثل «قضية 123/2026».</div>`;}
  if(savedTab==='notes'){const ns=Object.keys(NOTE).filter(i=>BYID[i]);body=ns.length?`<div class="list">${ns.map(i=>card(BYID[i],null)).join('')}</div>`:'<div class="empty">لا توجد ملاحظات بعد. اضغط «ملاحظة» على أي مبدأ.</div>';}
  if(savedTab==='hist'){const hs=HIST.filter(i=>BYID[i]);body=hs.length?`<div class="grid g2">${hs.map(i=>mini(BYID[i])).join('')}</div><p><button class="btn" data-a2="clrhist">مسح السجل</button></p>`:'<div class="empty">لا يوجد سجل بعد.</div>';}
  el.innerHTML=`<div class="vh"><h2>المحفوظات</h2><div class="seg">${[['favs','المحفوظة'],['notes','ملاحظاتي'],['hist','السجل']].map(([k,l])=>`<button data-st="${k}" aria-pressed="${savedTab===k}">${l}</button>`).join('')}</div></div><p class="hint">كل ما هنا محفوظ في هذا الجهاز فقط. خذ نسخة احتياطية من «الإعدادات».</p>${body}`;}
function printSaved(){const favs=Object.entries(FAV).filter(([id,v])=>BYID[id]&&(!savedFold||v.f===savedFold)).map(x=>BYID[x[0]]);
  const w=window.open('','_blank');if(!w){toast('اسمح بالنوافذ المنبثقة للطباعة');return;}
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مذكرة مبادئ</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&family=Reem+Kufi:wght@700&display=swap"><style>body{font-family:"Noto Naskh Arabic",serif;margin:32px;line-height:1.9;color:#111}h1{font-family:"Reem Kufi";color:#0b2545;margin:0}.s{color:#555;font-size:13px;border-bottom:2px solid #b8912f;padding-bottom:8px;margin-bottom:18px}.p{break-inside:avoid;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #ccc}.h{font-size:12px;color:#0b2545;font-weight:600}.c{font-size:13px;color:#444}.n{background:#f7efd9;padding:6px 10px;font-size:13px}</style></head><body>
   <h1>مذكرة مبادئ${savedFold?' — '+esc(savedFold):''}</h1><div class="s">${favs.length} مبدأً · من «مبادئ التمييز» · ${new Date().toLocaleDateString('ar-KW')}</div>
   ${favs.map((p,i)=>`<div class="p"><div class="h">${i+1}. ${esc(COLS[p.col].title)} — ${p.n} — ص ${printed(p).join('–')}</div>${p.ttl?`<b>${esc(p.ttl)}</b>`:''}<div>${p.p.map(esc).join('<br>')}</div>${p.rule?`<div><b>القاعدة:</b> ${esc(p.rule)}</div>`:''}<div class="c">${p.c.map(c=>esc(c.raw)).join('<br>')}</div>${NOTE[p.id]?`<div class="n">ملاحظتي: ${esc(NOTE[p.id])}</div>`:''}</div>`).join('')}
   <script>setTimeout(()=>print(),600)<\/script></body></html>`);w.document.close();}
// ---------- MORE / REPORTS / ABOUT
function viewMore(){$('v-more').innerHTML=`<h2>المزيد</h2><div class="grid g3">
  <button class="tile" data-a2="settings"><span class="ic">${svg('gear')}</span><b>الإعدادات</b><span class="n">الخط والحجم والمظهر، واسمك وصورتك، والقفل</span></button>
  <button class="tile" data-go="#/index/topics"><span class="ic">${svg('book')}</span><b>الفهرس</b><span class="n">الموضوعات والقوانين والكتب</span></button>
  <button class="tile" data-go="#/laws"><span class="ic">${svg('scroll')}</span><b>التشريعات</b><span class="n">نصوص القوانين مادةً مادة، وكل مادة مع مبادئها</span></button>
  <button class="tile" data-go="#/report"><span class="ic">${svg('report')}</span><b>تقارير الاستخراج</b><span class="n">طريقة العمل والفحوص وما يحتاج مراجعة</span></button>
  <button class="tile" data-go="#/about"><span class="ic">${svg('info')}</span><b>عن المكتبة</b><span class="n">المصادر وقواعد النزاهة والروابط</span></button>
  <button class="tile" data-a2="offline"><span class="ic">${svg('download')}</span><b>العمل دون اتصال</b><span class="n">نزّل المكتبة كاملة مع صور الصفحات</span></button>
  ${FB.url?`<button class="tile" data-a2="rate"><span class="ic">${svg('star')}</span><b>قيّم التطبيق</b><span class="n">تقييمك وملاحظاتك تصل إلى صاحب المكتبة وحده</span></button>`:''}
  <button class="tile" data-a2="install"><span class="ic">${svg('open')}</span><b>ثبّت التطبيق</b><span class="n">أضفه إلى الشاشة الرئيسية أو سطح المكتب</span></button>
 </div>`;}
let repDone=false;
async function viewReport(){const el=$('v-report');if(repDone)return;repDone=true;el.innerHTML='<div class="empty">جارٍ التحميل…</div>';
  const R=await fetch('data/reports.json').then(r=>r.json()).catch(()=>[]);
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>تقارير الاستخراج</h2></div><p class="muted">لكل مجموعة تقرير بطريقة الاستخراج والفحوص التي اجتازتها، والمبادئ المعلَّمة للمراجعة البشرية.</p>`+R.filter(x=>COLS[x.col]).map(R=>{const ps=PR.filter(p=>p.col===R.col&&p.rv.length);
   return `<details class="card" style="padding:12px 16px;margin-bottom:10px"><summary style="cursor:pointer;font-weight:600">${esc(R.title)}</summary>
    <div class="stats" style="margin-top:12px">${R.stats.map(([v,l])=>`<div class="stat card"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <h3>طريقة الاستخراج</h3><div class="prose"><ul>${R.method.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <h3>الفحوص</h3><div class="tbl"><table><thead><tr><th>الفحص</th><th>النتيجة</th><th>التفصيل</th></tr></thead><tbody>${R.checks.map(([a,ok,c])=>`<tr><td>${esc(a)}</td><td class="${ok?'okc':'flc'}">${ok?'اجتاز':'ملاحظات'}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div>
    <h3>يحتاج مراجعة (${ps.length})</h3><div class="tbl"><table><tbody>${ps.map(p=>`<tr><td><button class="btn" data-go="#/p/${p.id}">${p.n}</button></td><td>${p.pg.map(g=>g+COLS[p.col].off).join('–')}</td><td>${p.rv.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
    ${R.notes&&R.notes.length?`<h3>ملاحظات</h3><div class="prose"><ul>${R.notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</details>`}).join('');}
function viewAbout(){$('v-about').innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>عن المكتبة</h2></div><div class="prose">
  <p>«مبادئ التمييز» مبادرة شخصية مجانية غير تجارية، تجمع مبادئ محكمة التمييز الكويتية من مجموعاتها الرسمية وإصدارات مكتبها الفني في مكان واحد، ليسهل البحث فيها ونسخها وطباعتها، ولو دون اتصال.</p>
  <h3>قواعد النزاهة</h3><ul>
   <li>نص كل مبدأ منقول <b>حرفيًا</b> كما ورد في مصدره. لا يُعاد صياغته ولا يُختصر ولا يُصحَّح إملائيًا.</li>
   <li>لا يُخترع مبدأ ولا يُخمَّن حرف. ما شُكّ في قراءته يُعلَّم «يحتاج مراجعة» مع سببه.</li>
   <li>رقم الطعن وتاريخ الجلسة يُفحصان آليًا ويُقارنان بين المصادر، وكل تعارض يُعلَّم ولا يُحسم بالتخمين.</li>
   <li>كل مبدأ مربوط بصورة صفحته في المصدر. عند أي شك، <b>المرجع هو النص المطبوع في المصدر</b>.</li>
   <li>التصنيف بالموضوع والقانون وصف مساعد، وليس جزءًا من النص.</li></ul>
  <p>هذه المكتبة ليست جهة رسمية ولا تصدر عن محكمة التمييز أو وزارة العدل.</p>
  <h3>المصادر</h3></div><div class="grid g2">${ORDER.map(k=>`<div class="card" style="padding:10px 14px;display:flex;gap:10px;align-items:baseline"><span>${esc(COLS[k].title)}</span><span class="muted" style="margin-inline-start:auto">${nf(COLS[k].n)}</span></div>`).join('')}</div>
  <div class="prose"><h3>روابط ثابتة</h3><ul><li>لكل مبدأ رابط ثابت بمعرّفه: <code>#/p/V09L-0001</code></li><li>ولكل حكم رابط يجمع ما ورد عنه: <code>#/r/69/1977@1979-03-12</code></li></ul>
</div>`;}
// ---------- SETTINGS
function settingsDlg(){
  const d=dlg(`${svg('gear')} الإعدادات`,`<div class="set">
   <section><h4>ملفي</h4><div class="rowi"><label class="avatar bigav" style="cursor:pointer" title="تغيير الصورة" id="avl">${S.photo?`<img src="${S.photo}" alt="">`:esc((S.name||'').charAt(0)||'+')}<input type="file" accept="image/*" id="avf" hidden></label>
    <input type="text" id="sname" placeholder="اسمك (يظهر في الترحيب فقط)" value="${esc(S.name)}"></div>
    <div class="rowi">${S.photo?'<button class="btn" id="avx">إزالة الصورة</button>':''}<span class="hint">الاسم والصورة يُحفظان في هذا الجهاز فقط ولا يُرسلان إلى أي مكان.</span></div></section>
   <section><h4>قفل التطبيق</h4><div class="rowi">${S.pin?`<span>القفل مفعّل.</span><button class="btn" id="pinoff">إلغاء القفل</button><button class="btn" id="pinchg">تغيير الرمز</button>`:`<input type="password" id="pin1" inputmode="numeric" maxlength="8" placeholder="رمز من 4 إلى 8 أرقام"><input type="password" id="pin2" inputmode="numeric" maxlength="8" placeholder="أعد كتابته"><button class="btn primary" id="pinon">تفعيل</button>`}</div>
    <div class="rowi"><span>يُقفل بعد الخروج بـ</span><select id="lockmin" style="flex:0 1 140px">${[1,5,15,60].map(m=>`<option value="${m}"${S.lockMin==m?' selected':''}>${m} دقيقة</option>`).join('')}</select></div>
    <span class="hint">القفل يمنع فتح التطبيق على هذا الجهاز دون الرمز، ويحمي محفوظاتك وملاحظاتك من العرض. نصوص المكتبة نفسها عامة.</span></section>
   <section><h4>خط النصوص</h4><div class="fontopts">${Object.entries(FONTS).map(([k,f])=>`<button data-font="${k}" aria-pressed="${S.font===k}" style="font-family:${f.css.replace(/"/g,"'")},serif"><span>قضت المحكمة</span><small>${f.l}</small></button>`).join('')}</div>
    <div class="rowi"><span>الحجم</span><input type="range" id="fs" min=".85" max="1.6" step=".05" value="${S.fs}"><b id="fsv">${Math.round(S.fs*100)}٪</b></div>
    <div class="rowi"><span>تباعد الأسطر</span><input type="range" id="lh" min="1.6" max="2.4" step=".05" value="${S.lh}"></div>
    <div class="preview">عقد العمل. الخصيصتان الأساسيتان له التبعية والأجر.</div><span class="hint">عنوان «مبادئ التمييز» ثابت ولا يتغير بتغيير الخط.</span></section>
   <section><h4>المظهر</h4><div class="seg">${[['auto','تلقائي'],['light','فاتح'],['dark','داكن']].map(([k,l])=>`<button data-theme="${k}" aria-pressed="${S.theme===k}">${l}</button>`).join('')}</div></section>
   ${FB.url?`<section><h4>رأيك</h4><div class="rowi"><button class="btn primary" data-a2="rate">${svg('star')}قيّم التطبيق</button><span class="hint">دقيقة واحدة، ودون أي بيانات شخصية.</span></div></section>`:''}
   <section><h4>بياناتي</h4><div class="rowi"><button class="btn" id="bk">${svg('download')}نسخة احتياطية</button><label class="btn" style="cursor:pointer">استعادة<input type="file" accept="application/json" id="rs" hidden></label></div>
    <span class="hint">المحفوظات والمجلدات والملاحظات والإعدادات في ملف واحد، تنقله إلى جهاز آخر.</span></section></div>`);
  const upd=()=>{saveS();applyLook();};
  $('sname').oninput=()=>{S.name=$('sname').value.trim();upd();};
  $('avf').onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),z=192,m=Math.min(img.width,img.height);c.width=c.height=z;c.getContext('2d').drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,z,z);S.photo=c.toDataURL('image/jpeg',.82);upd();settingsDlg();};img.src=URL.createObjectURL(f);};
  if($('avx'))$('avx').onclick=()=>{S.photo='';upd();settingsDlg();};
  if($('pinon'))$('pinon').onclick=async()=>{const a=$('pin1').value,b=$('pin2').value;if(!/^\d{4,8}$/.test(a))return toast('الرمز من 4 إلى 8 أرقام');if(a!==b)return toast('الرمزان غير متطابقين');S.pin=await sha(a);S.pinLen=a.length;upd();toast('فُعّل القفل');settingsDlg();};
  if($('pinoff'))$('pinoff').onclick=()=>{S.pin='';delete S.pinLen;upd();toast('أُلغي القفل');settingsDlg();};
  if($('pinchg'))$('pinchg').onclick=()=>{S.pin='';delete S.pinLen;upd();settingsDlg();};
  $('lockmin').onchange=()=>{S.lockMin=+$('lockmin').value;upd();};
  d.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{S.font=b.dataset.font;upd();d.querySelectorAll('[data-font]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  $('fs').oninput=()=>{S.fs=+$('fs').value;$('fsv').textContent=Math.round(S.fs*100)+'٪';upd();};
  $('lh').oninput=()=>{S.lh=+$('lh').value;upd();};
  d.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{S.theme=b.dataset.theme;upd();d.querySelectorAll('[data-theme]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  $('bk').onclick=()=>{const blob=new Blob([JSON.stringify({app:'mabadi',v:1,date:new Date().toISOString(),settings:S,favs:FAV,folders:FOLD,notes:NOTE,hist:HIST},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`mabadi-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();};
  $('rs').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(j.app!=='mabadi')throw 0;S=Object.assign({},DEF,j.settings||{});FAV=j.favs||{};FOLD=j.folders||['عام'];NOTE=j.notes||{};HIST=j.hist||[];
    saveS();LS.set('favs',FAV);LS.set('folders',FOLD);LS.set('notes',NOTE);LS.set('hist',HIST);applyLook();toast('استُعيدت بياناتك');closeDlg();route();}catch(_){toast('الملف غير صالح');}};
}
// ---------- offline
function offlineDlg(){dlg(`${svg('download')} العمل دون اتصال`,`<div class="set"><p style="margin:0">بعد أول زيارة تُحفظ نصوص المكتبة في الجهاز. صور الصفحات تُحفظ عند فتحها، ويمكنك تنزيلها كلها الآن (نحو 190 ميغابايت).</p>
  <button class="btn primary" id="dl">تنزيل المكتبة كاملة</button><div class="bar-p"><i id="dlbar"></i></div><div class="hint" id="dlst"></div></div>`);
  $('dl').onclick=async()=>{if(!('caches' in window)){$('dlst').textContent='هذا المتصفح لا يدعم التخزين دون اتصال.';return;}$('dl').disabled=true;
   try{const Fs=await fetch('files.json',{cache:'no-store'}).then(r=>r.json());const cF=await caches.open('mabadi-files'),cD=await caches.open('mabadi-data');const tot=Fs.files.length;let n=0,by=0;const q=[...Fs.files];
    const work=async()=>{while(q.length){const f=q.shift(),c=f.p.startsWith('pages/')?cF:cD;try{if(!(await c.match(f.p))){const r=await fetch(f.p);if(r.ok)await c.put(f.p,r);}}catch(_){}n++;by+=f.s;if($('dlbar')){$('dlbar').style.width=(n/tot*100)+'%';$('dlst').textContent=`${n} من ${tot} ملف · ${(by/1048576).toFixed(0)} ميغابايت`;}}};
    await Promise.all([work(),work(),work(),work()]);if($('dlst'))$('dlst').textContent='اكتمل: المكتبة كلها محفوظة في هذا الجهاز.';}catch(_){if($('dlst'))$('dlst').textContent='تعذّر التنزيل الآن. حاول مرة أخرى.';}
   if($('dl'))$('dl').disabled=false;};}
let deferredInstall=null;window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;});
function installDlg(){if(deferredInstall){deferredInstall.prompt();deferredInstall=null;return;}
  dlg('ثبّت التطبيق',`<div class="prose"><ul><li><b>آيفون وآيباد (Safari):</b> زر المشاركة ← «إضافة إلى الشاشة الرئيسية».</li><li><b>أندرويد (Chrome):</b> القائمة ⋮ ← «تثبيت التطبيق».</li><li><b>الحاسوب (Chrome أو Edge):</b> أيقونة التثبيت في شريط العنوان.</li></ul></div>`);}
// ---------- التقييم والملاحظات (نموذج Google خاص بصاحب المكتبة)
function curSection(){const h=(location.hash||'').replace(/^#\/?/,'');if(h.startsWith('p/')||h.startsWith('r/'))return 'صفحة المبدأ';if(h.startsWith('search'))return 'البحث';if(h.startsWith('index'))return 'الفهرس';if(h.startsWith('saved'))return 'المحفوظات';if(h.startsWith('report'))return 'التقارير';return 'عام';}
const FBSEC=['عام','البحث','الفهرس','صفحة المبدأ','المحفوظات','الإعدادات والمظهر','التقارير'];
function fbSend(rec){const body=new URLSearchParams();body.set(FB.f.section,rec.section);body.set(FB.f.rating,String(rec.rating));body.set(FB.f.note,rec.note||'');body.set(FB.f.contact,rec.contact||'');body.set(FB.f.meta,rec.meta);
  return fetch(FB.url,{method:'POST',mode:'no-cors',body});}
function fbFlush(){const q=LS.get('fbq',[]);if(!q.length||!navigator.onLine||!FB.url)return;const rest=[];
  Promise.all(q.map(r=>fbSend(r).catch(()=>rest.push(r)))).then(()=>LS.set('fbq',rest));}
addEventListener('online',fbFlush);
function rateDlg(){
  const st={section:curSection(),rating:0};
  const d=dlg(`${svg('star')} قيّم التطبيق`,`<div class="set rate">
   <section><h4>عن أي قسم؟</h4><div class="folders">${FBSEC.map(x=>`<button type="button" data-sec="${x}" aria-pressed="${x===st.section}">${x}</button>`).join('')}</div></section>
   <section><h4>تقييمك</h4><div class="stars" role="radiogroup" aria-label="التقييم من 1 إلى 5">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="false" data-r="${n}" aria-label="${n} من 5">${svg('star')}</button>`).join('')}</div><span class="hint" id="rlab">اختر من نجمة إلى خمس</span></section>
   <section><h4>ملاحظتك (اختياري)</h4><textarea id="fbn" rows="4" maxlength="2000" placeholder="ما الذي أعجبك؟ وما الذي تقترح تحسينه؟"></textarea>
    <input type="text" id="fbc" maxlength="120" placeholder="وسيلة تواصل إن أردت ردًا (اختياري)"></section>
   <div class="privacy">${svg('lock')}<span><b>خصوصيتك محفوظة.</b> لا نجمع اسمك ولا بريدك ولا موقعك ولا أي معرّف لجهازك. يصل التقييم والملاحظة فقط إلى صاحب المكتبة، ولا يُنشر ولا يُشارك مع أحد. وسيلة التواصل اختيارية، ولا تُستعمل إلا للرد عليك.</span></div>
   <button class="btn primary" id="fbs" disabled>إرسال</button></div>`);
  const labs=['','ضعيف','مقبول','جيد','جيد جدًا','ممتاز'];
  d.addEventListener('click',e=>{const sb=e.target.closest('[data-sec]');if(sb){st.section=sb.dataset.sec;d.querySelectorAll('[data-sec]').forEach(x=>x.setAttribute('aria-pressed',x===sb));}
    const rb=e.target.closest('[data-r]');if(rb){st.rating=+rb.dataset.r;d.querySelectorAll('[data-r]').forEach(x=>{const on=+x.dataset.r<=st.rating;x.classList.toggle('on',on);x.setAttribute('aria-checked',+x.dataset.r===st.rating);});$('rlab').textContent=labs[st.rating];$('fbs').disabled=false;}});
  $('fbs').onclick=async()=>{const rec={section:st.section,rating:st.rating,note:$('fbn').value.trim(),contact:$('fbc').value.trim(),
      meta:`${innerWidth<761?'جوال':innerWidth<1000?'لوحي':'حاسوب'} · ${document.documentElement.dataset.theme||'تلقائي'} · ${new Date().toISOString().slice(0,10)}`};
    $('fbs').disabled=true;
    if(!navigator.onLine){const q=LS.get('fbq',[]);q.push(rec);LS.set('fbq',q);closeDlg();toast('حُفظ تقييمك، وسيُرسل عند عودة الاتصال');return;}
    try{await fbSend(rec);closeDlg();toast('وصل تقييمك، شكرًا لك');}catch(_){const q=LS.get('fbq',[]);q.push(rec);LS.set('fbq',q);closeDlg();toast('حُفظ تقييمك، وسيُرسل لاحقًا');}};
}
// ---------- router
const NAVMAP={laws:'#/laws',home:'#/',search:'#/search',index:'#/index/topics',saved:'#/saved',more:'#/more',report:'#/report',about:'#/about'};
function show(v,nav){['home','search','index','saved','more','item','report','about','laws'].forEach(x=>$('v-'+x).hidden=x!==v);
  document.querySelectorAll('[data-nav]').forEach(b=>b.setAttribute('aria-current',b.dataset.nav===nav));}
function route(){const h=decodeURIComponent((location.hash||'').replace(/^#\/?/,''));closeDlg();if(speakingId){speechSynthesis.cancel();speakingId=null;}
  document.title='مبادئ التمييز';
  if(h.startsWith('p/')){viewItem(h.slice(2));show('item','');}
  else if(h.startsWith('r/')){viewRuling(h.slice(2));show('item','');}
  else if(h==='search'){syncInputs();runSearch();show('search','search');}
  else if(h.startsWith('index')){const [,sub,...rest]=h.split('/');viewIndex(sub||idxTab,rest.join('/'));show('index','index');}
  else if(h==='saved'){viewSaved();show('saved','saved');}
  else if(h==='more'){viewMore();show('more','more');}
  else if(h==='report'){viewReport();show('report',innerWidth>=1000?'report':'more');}
  else if(h==='about'){viewAbout();show('about',innerWidth>=1000?'about':'more');}
  else if(h==='laws'){viewLaws();show('laws',innerWidth>=1000?'laws':'more');}
  else if(h.startsWith('law/')){viewLaw(h.slice(4));show('item',innerWidth>=1000?'laws':'more');}
  else if(h.startsWith('a/')){viewArt(h.slice(2));show('item',innerWidth>=1000?'laws':'more');}
  else if(h.startsWith('m/')){const [lid,k]=h.slice(2).split('/');viewMemo(lid,k);show('item',innerWidth>=1000?'laws':'more');}
  else{viewHome();show('home','home');}
  window.scrollTo({top:0});}
let navs=0;window.addEventListener('hashchange',()=>{navs++;route();});
function go(h){if(location.hash===h||(h==='#/'&&!location.hash))route();else location.hash=h;}
// ---------- global clicks
document.addEventListener('click',e=>{const t=e.target;
  const nb=t.closest('[data-nav]');if(nb){go(NAVMAP[nb.dataset.nav]);return;}
  if(t.closest('#me')){settingsDlg();return;}
  if(t.closest('[data-close]')){closeDlg();return;}
  const act=t.closest('[data-a]');if(act){const p=BYID[act.closest('[data-id]').dataset.id],a=act.dataset.a;
    if(a==='copy')clip(quoteText(p),()=>toast('نُسخ النص مع الإسناد والمصدر'));if(a==='share')shareDlg(p);if(a==='fav')favDlg(p);if(a==='note')noteDlg(p);if(a==='speak')speak(p,act);if(a==='src')openSrc(p);return;}
  const a2=t.closest('[data-a2]');if(a2){const k=a2.dataset.a2;if(k==='settings')settingsDlg();if(k==='rate')rateDlg();if(k==='offline')offlineDlg();if(k==='install')installDlg();if(k==='printsaved')printSaved();
    if(k==='copysaved'){const ps=Object.entries(FAV).filter(([id,v])=>BYID[id]&&(!savedFold||v.f===savedFold)).map(x=>quoteText(BYID[x[0]]));clip(ps.join('\n\n———\n\n'),()=>toast(`نُسخ ${ps.length} مبدأ`));}
    if(k==='clrhist'){HIST=[];LS.set('hist',HIST);viewSaved();}return;}
  const st=t.closest('[data-st]');if(st){savedTab=st.dataset.st;viewSaved();return;}
  const sf=t.closest('[data-sf]');if(sf){savedFold=sf.dataset.sf;viewSaved();return;}
  const mic=t.closest('[data-mic]');if(mic){listen(mic.dataset.mic,mic);return;}
  const gb=t.closest('[data-go]');if(gb){go(gb.dataset.go);return;}
  if(t.closest('[data-back]')){if(navs>0)history.back();else go('#/');return;}
  if(t.closest('[data-print]')){window.print();return;}
  const fb=t.closest('[data-f]');if(fb){setFilter(fb.dataset.f,fb.dataset.v);return;}
  const qb=t.closest('[data-q]');if(qb){doSearch(qb.dataset.q);return;}
  const cl=t.closest('[data-clr]');if(cl){F[cl.dataset.clr]=cl.dataset.clr==='rv'?false:'';syncInputs();runSearch();return;}
});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
buildSearch();route();fbFlush();setTimeout(loadAllLaws,1500);if(!location.hash||location.hash==='#/')playWeave();else wovenOnce=true;
document.body.insertAdjacentHTML('beforeend',`<button class="totop" id="totop" hidden aria-label="العودة إلى الأعلى">${svg('back').replace('<svg','<svg style="transform:rotate(-90deg)"')}</button>`);
$('totop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
addEventListener('scroll',()=>{$('totop').hidden=scrollY<900;},{passive:true});
})().catch(e=>{const m=document.getElementById('main');if(m)m.innerHTML='<div class="empty">تعذّر تحميل المكتبة. أعد تحميل الصفحة.</div>';console.error(e);});
