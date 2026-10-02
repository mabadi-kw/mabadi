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
const DEF={font:'naskh',fs:1,lh:1.95,theme:'auto',name:'',photo:'',pin:'',lockMin:5,rate:1,voice:''};
let S=Object.assign({},DEF,LS.get('settings',{}));
let FAV=LS.get('favs',{}), FOLD=LS.get('folders',['عام']), NOTE=LS.get('notes',{}), HIST=LS.get('hist',[]), QH=LS.get('qhist',[]);
// أوقات التعديل وعلامات الحذف — للمزامنة بين الأجهزة (الأحدث يعلو، والمحذوف لا يعود). السجل والإعدادات لا تُزامَن.
let DEL=LS.get('del',{favs:{},folders:{},notes:{}}), NOTET=LS.get('notest',{}), FOLDT=LS.get('foldt',{});
(()=>{const now=Date.now();let ch=0;for(const id in FAV)if(!FAV[id].updated){FAV[id].updated=FAV[id].t||now;ch=1;}
  for(const id in NOTE)if(!NOTET[id]){NOTET[id]=now;ch=1;}FOLD.forEach(n=>{if(!FOLDT[n]){FOLDT[n]=now;ch=1;}});
  if(ch){LS.set('favs',FAV);LS.set('notest',NOTET);LS.set('foldt',FOLDT);}})();
// يحفظ بيانات المستخدم ويعلّم أن هناك تغييرًا لم يُزامَن
function saveUser(){LS.set('favs',FAV);LS.set('folders',FOLD);LS.set('notes',NOTE);LS.set('del',DEL);LS.set('notest',NOTET);LS.set('foldt',FOLDT);try{if(SYNC)SYNC.markChanged();}catch(_){}}
const saveS=()=>LS.set('settings',S);
// نموذج التقييم: يُملأ عند إنشاء نموذج Google الخاص بالمكتبة
// ---------- icons
const IC={dots:'M5 12h.01M12 12h.01M19 12h.01', check:'M5 12l5 5L20 7', grip:'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
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
  if($('hback')&&!$('hback').firstChild)$('hback').innerHTML=svg('back');
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
// بصمة الوجه / البصمة: مفتاح مرور (WebAuthn) على هذا الجهاز وحده. لا خادم: نجاح التحقق من المستخدم (UV) يفتح القفل،
// والرمز السري يبقى بديلًا دائمًا. لا يُرسل شيء خارج الجهاز.
const b64u=a=>btoa(String.fromCharCode(...new Uint8Array(a))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const ub64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const rnd=n=>crypto.getRandomValues(new Uint8Array(n));
const BIO_IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const bioName=()=>BIO_IOS?'بصمة الوجه':'البصمة';
async function bioAvail(){try{return !!(window.PublicKeyCredential&&await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());}catch(_){return false;}}
async function bioEnroll(){const c=await navigator.credentials.create({publicKey:{rp:{name:'مبادئ التمييز',id:location.hostname},
  user:{id:rnd(16),name:'قفل مبادئ التمييز',displayName:'قفل مبادئ التمييز'},challenge:rnd(32),
  pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
  authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'discouraged'},timeout:60000,attestation:'none'}});
  return b64u(c.rawId);}
async function bioCheck(){const a=await navigator.credentials.get({publicKey:{challenge:rnd(32),rpId:location.hostname,timeout:60000,userVerification:'required',
  allowCredentials:[{type:'public-key',id:ub64(S.bio),transports:['internal','hybrid']}]}});
  const ad=new Uint8Array(a.response.authenticatorData);return b64u(a.rawId)===S.bio&&!!(ad[32]&4);}   // 4 = تحقق المستخدم بالوجه أو البصمة
const FACEIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1.5M15 9v1.5M12 9v4.2h-1M9.2 15.6c1.6 1.3 4 1.3 5.6 0"/></svg>';
function lockScreen(){
  if(!S.pin||$('lock'))return;
  const d=document.createElement('div');d.className='lock';d.id='lock';
  const ini=(S.name||'').trim().charAt(0),now=new Date();
  const day=new Intl.DateTimeFormat('ar-KW-u-nu-latn',{weekday:'long',day:'numeric',month:'long'}).format(now);
  const bio=!!S.bio;
  d.innerHTML=`<div class="lband top" aria-hidden="true"></div><div class="in">
   <div class="lav"><i class="avatar">${S.photo?`<img src="${S.photo}" alt="">`:esc(ini||'م')}</i></div>
   <b class="t">مبادئ التمييز</b>
   ${S.name?`<div class="lhi">مرحبًا، ${esc(S.name)}</div>`:''}<div class="lday">${esc(day)}</div>
   <div class="lmsg" id="lmsg">${bio?`افتح ب${bioName()} أو أدخل الرمز`:'أدخل الرمز السري'}</div><div class="dots" id="dots"></div>
   <div class="pad">${[1,2,3,4,5,6,7,8,9,'bio',0,'⌫'].map(k=>k==='bio'?(bio?`<button class="kb" data-bio aria-label="فتح ب${bioName()}">${FACEIC}</button>`:'<span></span>'):k==='⌫'?`<button class="kb" data-k="⌫" aria-label="حذف"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg></button>`:`<button data-k="${k}">${k}</button>`).join('')}</div>
  </div><div class="lband bot" aria-hidden="true"></div>`;
  document.body.appendChild(d);weave(d,10);let v='';
  const msg=t=>{const m=$('lmsg');if(m)m.textContent=t;};
  const unlock=()=>{d.classList.add('open');document.removeEventListener('keydown',kd);setTimeout(()=>d.remove(),420);};
  const draw=()=>{$('dots').innerHTML=Array.from({length:Math.max(4,v.length)},(_,i)=>`<i class="${i<v.length?'f':''}"></i>`).join('')};draw();
  const press=async k=>{if(k==='⌫')v=v.slice(0,-1);else if(v.length<8)v+=k;draw();
    if(v.length>=4&&await sha(v)===S.pin)unlock();
    else if(v.length>=8||(v.length>=4&&v.length===S.pinLen)){d.querySelector('.in').classList.add('shake');msg('الرمز غير صحيح');setTimeout(()=>{d.querySelector('.in').classList.remove('shake');v='';draw();},350);}};
  let busy=false;const tryBio=async()=>{if(busy||!S.bio)return;busy=true;
    try{if(await bioCheck())unlock();else msg('تعذّر التحقق، أدخل الرمز');}catch(e){msg(e&&e.name==='NotAllowedError'?`أُلغي — اضغط ${bioName()} للمحاولة أو أدخل الرمز`:'أدخل الرمز السري');}busy=false;};
  d.addEventListener('click',e=>{const b=e.target.closest('[data-k]');if(b)return press(b.dataset.k);if(e.target.closest('[data-bio]'))tryBio();});
  const kd=e=>{if(/^\d$/.test(e.key))press(e.key);else if(e.key==='Backspace')press('⌫')};document.addEventListener('keydown',kd);
  if(bio&&!document.hidden)setTimeout(tryBio,350);   // محاولة تلقائية عند الظهور؛ إن رفضها المتصفح يبقى الزر
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
// المبدأ نفسه منشورًا في أكثر من موضع (tools/dedup.py): يُعرض مرة واحدة في النتائج، ومعه «ورد أيضًا في»
const DG={};let DUPALL=LS.get('dupall','')==='1';
fetch('data/dups.json').then(r=>r.ok?r.json():[]).catch(()=>[]).then(G=>{G.forEach(g=>g.forEach(i=>{if(BYID[i])DG[i]=g;}));
  const l=$('list');if(G.length&&l&&!l.hidden&&location.hash.startsWith('#/search'))runSearch();});
function collapse(list){if(DUPALL)return list;const have=new Set(list.map(p=>p.id)),seen=new Set(),out=[];
  for(const p of list){const g=DG[p.id];if(!g){out.push(p);continue;}if(seen.has(g[0]))continue;seen.add(g[0]);out.push(BYID[g.find(i=>have.has(i))]);}return out;}
const alsoOf=p=>(DG[p.id]||[]).filter(i=>i!==p.id&&BYID[i]);
$('sub').textContent=`${nf(PR.length)} مبدأً · ${ORDER.length} مجموعة`;
const famOf=t=>TL[t]?TL[t][0]:'';
const tcount={},lcount={},acount={},famcount={};
PR.forEach(p=>{new Set(p.tp.map(x=>x[0])).forEach(t=>tcount[t]=(tcount[t]||0)+1);new Set(p.tp.map(x=>famOf(x[0])).filter(Boolean)).forEach(f=>famcount[f]=(famcount[f]||0)+1);
  p.lw.forEach(([l,as])=>{lcount[l]=(lcount[l]||0)+1;as.forEach(a=>{const k=l+'|'+a;acount[k]=(acount[k]||0)+1})})});
const FORD='PLVCSRAFGHJT';
const TORD=Object.keys(tcount).filter(t=>TL[t]).sort((a,b)=>FORD.indexOf(a[0])-FORD.indexOf(b[0])||tcount[b]-tcount[a]);
const FAMS=[...new Set(TORD.map(famOf))];const famLetter={};TORD.forEach(t=>famLetter[famOf(t)]=famLetter[famOf(t)]||t[0]);
const LORD=Object.keys(lcount).sort((a,b)=>lcount[b]-lcount[a]);
const CHS=[...new Set(PR.flatMap(p=>p.c.map(c=>c.ch)).filter(Boolean))];const chcount={};PR.forEach(p=>new Set(p.c.map(c=>c.ch).filter(Boolean)).forEach(c=>chcount[c]=(chcount[c]||0)+1));
const CHIC={'تجاري':'building','مدني':'contract','جزائي':'gavel','عمالي':'briefcase','أحوال شخصية':'people','إداري':'landmark','طلبات رجال القضاء':'scale','تظلمات':'report'};
// رقم الصفحة المعروض: في الكتب رقم الصفحة المطبوع (الإزاحة off)؛ وفي مجموعات الملفات (المجلة) رقم الصفحة داخل ملف العدد
const pageDoc=(col,g)=>(COLS[col].docs||[]).find(d=>g>=d.first&&g<=d.last);
const pageNo=(col,g)=>{const d=pageDoc(col,g);if(!d)return g+COLS[col].off;const pn=d.pn&&d.pn[g-d.first];return pn||g-d.first+1;};
const pageCap=(col,g)=>{const d=pageDoc(col,g);if(!d)return `الصفحة ${g+COLS[col].off} من الكتاب`;const pn=d.pn&&d.pn[g-d.first];
  return pn?`الصفحة ${pn} من الكتاب — موضوع «${d.label||''}»`:`الصفحة ${g-d.first+1} من ملف ${d.label||''}`;};
// نص القاعدة في المجموعات الكبيرة يُحمَّل عند الطلب (data/rx/<المجموعة>-<k>.json)
const RX={};
function ensureRule(p){if(!p||p.rx===undefined||p.rule!==undefined)return Promise.resolve(p&&p.rule);const k=p.col+'-'+String(p.rx).padStart(2,'0');
  if(!RX[k])RX[k]=fetch(`data/rx/${k}.json`).then(r=>r.ok?r.json():{}).catch(()=>({})).then(d=>{for(const id in d)if(BYID[id])BYID[id].rule=d[id];return d;});
  return RX[k].then(()=>p.rule);}
function prefetchRules(ps){const seen=new Set();ps.forEach(p=>{if(p&&p.rx!==undefined&&p.rule===undefined){const k=p.col+p.rx;if(!seen.has(k)){seen.add(k);ensureRule(p).then(()=>fillRx());}}});}
function fillRx(){document.querySelectorAll('details.rule[data-rx]').forEach(d=>{const p=BYID[d.dataset.rx];if(p&&p.rule!==undefined){const t=d.querySelector('.text');if(t&&t.dataset.ok!=='1'){t.textContent=p.rule;t.dataset.ok='1';}}});}
document.addEventListener('toggle',e=>{const d=e.target;if(d.matches&&d.matches('details.rule[data-rx]')&&d.open){const p=BYID[d.dataset.rx];ensureRule(p).then(()=>fillRx());}},true);
const printed=p=>p.pg.length?[...new Set([pageNo(p.col,p.pg[0]),pageNo(p.col,p.pg[p.pg.length-1])])]:[];
// ---------- legislation
const LAWIX=[],LAWBYKEY={},LAWBYID={},ARTBYID={},ARTMAP={},LAWDATA={},MEMO={};
try{const LI=await fetch('data/laws/index.json').then(r=>r.json());LI.laws.forEach(x=>{LAWIX.push(x);LAWBYKEY[x.key]=x;LAWBYID[x.id]=x;});}catch(_){}
// سجل التعديلات والإلغاءات اللاحقة (من الجريدة الرسمية) على القوانين والمواد الموجودة في المكتبة
let AMEND={laws:{},arts:{},added:{}};try{AMEND=await fetch('data/laws/amend.json').then(r=>r.ok?r.json():AMEND);}catch(_){}
const AMBY={};Object.entries(AMEND.arts||{}).forEach(([k,v])=>v.forEach(e=>{const [lid,n]=k.split('#');(AMBY[e.by_art]=AMBY[e.by_art]||[]).push({...e,lid,n});}));
Object.entries(AMEND.added||{}).forEach(([key,v])=>v.forEach(e=>{const x=LAWBYKEY[key];(AMBY[e.by_art]=AMBY[e.by_art]||[]).push({...e,lid:x&&x.id,n:e.n,key});}));
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
  const ph=norm(F.q.replace(/[«»"]/g,'').trim());
  LAWIX.forEach(x=>{const L=LAWDATA[x.id];if(!L||(F.lw&&F.lw!==L.key))return;L.articles.forEach(a=>{if(ts.every(t=>a.ns.includes(t)))o.push([L,a,(ph&&a.ns.includes(ph)?1e6:0)+(lcount[L.key]||0)]);});});
  return o.sort((a,b)=>b[2]-a[2]);}   // الصلة: العبارة متصلة أولًا، ثم القانون الأكثر إحالةً في المبادئ
const artPR=a=>a.issue?[]:(ARTMAP[a.law.key+'#'+a.n]||[]).map(i=>BYID[i]).filter(Boolean);
const lawTitle=L=>L.number?`${L.type} رقم ${L.number} لسنة ${L.year}`:`${L.type}${L.year?' — '+L.year:''}`;
function artQuote(a){const L=a.law;return `${a.label} — ${L.title}:\n${a.paras.join('\n')}\n— ${L.text_version}.`;}
function pgCaption(M,g){const pr=M.printed&&M.printed[g-1];return pr?(M.issue?`الصفحة ${pr} من العدد ${M.issue} من «الكويت اليوم»`:`الصفحة ${pr} من الطبعة`):`الصفحة ${g} من ملف المصدر`;}
const fdate=d=>d?d.split('-').reverse().join('/'):'';
const lawLink=k=>{const x=LAWBYKEY[k];const [n,y]=k.split('/');return x?`<button class="linkbtn" data-go="#/law/${x.id}">${esc(x.short)} (${esc(n)}/${esc(y)})</button>`:`القانون رقم ${esc(n)} لسنة ${esc(y)} <small class="muted">(ليس في المكتبة بعد)</small>`;};
// لافتات القانون: ملغى / معدّل بعد الطبعة / مواد مضافة / ما يعدّله أو يلغيه هذا المرسوم
function amendBanner(L){const ix=LAWBYKEY[L.key]||{},ev=(AMEND.laws||{})[L.key]||[];let h='';
  const rp=ev.find(e=>e.what==='إلغاء');
  if(rp)h+=`<div class="aban rep">${svg('info')}<span><b>ملغى.</b> ألغاه ${lawLink(rp.by)}${rp.date?' الصادر في '+fdate(rp.date):''} (<button class="linkbtn" data-go="#/a/${rp.by_art}">مادة الإلغاء</button>). يبقى النص هنا للرجوع إليه في الوقائع السابقة على الإلغاء، وفي المبادئ الصادرة في ظله.</span></div>`;
  const am=ev.filter(e=>e.what==='تعديل');
  if(am.length)h+=`<div class="aban mod">${svg('info')}<span><b>صدرت بعد هذه النسخة تعديلات:</b> ${am.map(e=>lawLink(e.by)+(e.date?' — '+fdate(e.date):'')).join('، ')}. المواد المعدّلة معلَّمة في القائمة، وفي كل منها نص التعديل. النص المعروض نص النسخة الأصلية.</span></div>`;
  const ad=(AMEND.added||{})[L.key]||[];
  if(ad.length)h+=`<div class="aban mod">${svg('info')}<span><b>مواد أضيفت لاحقًا:</b> ${ad.map(e=>`<button class="linkbtn" data-go="#/a/${e.by_art}">المادة ${esc(e.n)}</button> (${esc(e.by)})`).join('، ')}.</span></div>`;
  if(ix.repeals&&ix.repeals.length)h+=`<div class="aban new">${svg('info')}<span><b>يلغي:</b> ${ix.repeals.map(lawLink).join('، ')}.</span></div>`;
  if(ix.amends&&ix.amends.length)h+=`<div class="aban new">${svg('info')}<span><b>يعدّل:</b> ${ix.amends.map(lawLink).join('، ')}.</span></div>`;
  return h;}
const artEv=(L,a)=>a.issue||a.bis?[]:((AMEND.arts||{})[L.id+'#'+a.n]||[]);
function lawPageHTML(col,M,g,reg){const gp=M.gp||20,gc=gp/10,b=Math.floor((g-1)/gp),k=(g-1)%gp,cx=k%gc,ry=Math.floor(k/gc);
  const box=reg?`<div class="hlbox" style="left:${(reg.bbox[0]-6)/M.pw*100}%;top:${(reg.bbox[1]-4)/M.ph*100}%;width:${(reg.bbox[2]-reg.bbox[0]+12)/M.pw*100}%;height:${(reg.bbox[3]-reg.bbox[1]+8)/M.ph*100}%"></div>`:'';
  const src=`pages/${col}/g${String(b).padStart(3,'0')}.webp`;return `<figure class="pg"><div class="pgimg" role="img" data-src="${src}" data-gc="${gc}" data-cx="${cx}" data-ry="${ry}" aria-label="${pgCaption(M,g)}" style="aspect-ratio:${M.cell[0]}/${M.cell[1]};background-image:url(pages/${col}/g${String(b).padStart(3,'0')}.webp);background-size:${gc*100}% 1000%;background-position:${cx*100/(gc-1)}% ${ry*100/9}%">${box}</div><figcaption>${pgCaption(M,g)}</figcaption></figure>`;}
function lawPagesHTML(a){const L=a.law;return a.pages.map(g=>lawPageHTML(L.pages_col,L.page_meta,g,(a.rg||[]).find(r=>r.page===g))).join('');}
const LOADMSG='<div class="empty">جارٍ تحميل النص…</div>';
function viewLaws(){const el=$('v-laws');document.title='التشريعات — مبادئ التمييز';
  const L=[...LAWIX].sort((a,b)=>(lcount[b.key]||0)-(lcount[a.key]||0)||((b.src==='gazette')-(a.src==='gazette'))||(b.year||0)-(a.year||0));
  el.innerHTML=`<div class="vh"><h2>التشريعات</h2><span class="muted">${nf(LAWIX.length)} وثيقة</span></div><p class="muted">نصوص القوانين مادةً مادة، وكل مادة موصولة بمبادئ التمييز التي تذكرها وبصورة صفحتها في المصدر. يُذكر مع كل قانون مصدر نصه وتاريخ النسخة.</p>
   <div class="ltabs" id="lwt"></div><input class="flt" id="lwf" type="search" placeholder="ابحث بالاسم أو الرقم…"><div class="quick" id="lwc"></div><div class="grid g3" id="lwg"></div>
   <div class="card note"><b>عن النسخ</b><p class="muted" style="margin:.3em 0 0">أغلب النصوص من «مجموعة التشريعات الكويتية» الصادرة عن وزارة العدل (الطبعة الأولى، فبراير 2011)، وتشمل التعديلات حتى تاريخها كما تذكرها حواشي الطبعة. وما صدر بعدها مما أُضيف من الجريدة الرسمية («صدر حديثًا») يظهر وثيقةً مستقلة، ويُعلَّم على القانون الأصلي ومواده («معدّل» أو «ملغى») مع نص التعديل، دون دمجه في النص الأصلي. التعديلات التي لم تُضف بعد لا تظهر، فارجع إلى الجريدة الرسمية قبل الاعتماد.</p></div>`;
  const tile=lawTile;
  let cat='law',g='';const G=()=>[...new Set(L.filter(x=>(x.cat||'law')===cat).map(x=>x.group).filter(Boolean))];
  const nL=L.filter(x=>(x.cat||'law')==='law').length,nR=L.length-nL;
  $('lwt').innerHTML=`<button class="tab" data-lc="law">القوانين والمراسيم بقوانين <b>${nf(nL)}</b></button><button class="tab" data-lc="reg">المراسيم واللوائح والقرارات <b>${nf(nR)}</b></button>`;
  const tabs=()=>$('lwt').querySelectorAll('[data-lc]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.lc===cat));tabs();
  $('lwt').onclick=e=>{const b=e.target.closest('[data-lc]');if(!b)return;cat=b.dataset.lc;g='';tabs();chips();draw(norm(west($('lwf').value).trim()));};
  const draw=q=>$('lwg').innerHTML=L.filter(x=>(x.cat||'law')===cat&&(!g||(g==='__new'?x.src==='gazette':x.group===g))&&(!q||norm(x.short+' '+x.title+' '+x.key).includes(q)||west(x.key).includes(q))).map(tile).join('')||'<div class="empty">لا نتائج.</div>';
  const chips=()=>$('lwc').innerHTML=[['','الكل'],...(L.some(x=>x.src==='gazette'&&(x.cat||'law')===cat)?[['__new','صدر حديثًا (2025–2026)']]:[]),...G().map(x=>[x,x])].map(([k,t])=>`<button class="chip${g===k?' on':''}" data-lg="${esc(k)}">${esc(t)}</button>`).join('');
  chips();draw('');$('lwf').oninput=()=>draw(norm(west($('lwf').value).trim()));
  $('lwc').onclick=e=>{const b=e.target.closest('[data-lg]');if(!b)return;g=b.dataset.lg;chips();draw(norm(west($('lwf').value).trim()));};}
function lawTile(x){return `<button class="tile card lawtile" data-go="#/law/${x.id}"><span class="ic">${svg('scroll')}</span><b>${esc(x.short)}${x.status==='ملغى'?' <span class="abadge rep">ملغى</span>':x.status==='معدّل'?' <span class="abadge">معدّل</span>':''}${x.src==='gazette'?' <span class="abadge new">جديد</span>':''}</b><small>${esc(lawTitle(x))} · ${x.articles?nf(x.articles)+' مادة':'بلا مواد مرقمة'}${lcount[x.key]?` · ${nf(lcount[x.key])} مبدأ`:''}${x.memo?' · مع المذكرة':''}</small><small class="ver">${esc(x.ver||x.text_version)}</small></button>`;}
function lawTree(L){const tree=[],st=[];(L.toc||[]).filter(t=>t.i0>=0).forEach(t0=>{const t={...t0,kids:[]};while(st.length&&st[st.length-1].level>=t.level)st.pop();(st.length?st[st.length-1].kids:tree).push(t);st.push(t);});return tree;}
function viewLaw(id){const el=$('v-item');el.innerHTML=LOADMSG;
  loadLaw(id).then(L=>{
  document.title=L.short+' — مبادئ التمييز';
  const row=a=>{const n=a.issue?0:(ARTMAP[L.key+'#'+a.n]||[]).length,t=a.paras.join(' '),ev=artEv(L,a);return `<button class="arow" data-go="#/a/${a.id}"><b>${esc(a.label)}${ev.length?`<span class="abadge ${ev.some(e=>e.how==='إلغاء')?'rep':''}">${ev.some(e=>e.how==='إلغاء')?'ملغاة':'معدّلة'}</span>`:''}${a.rep||!a.paras.length?' <em class="muted">— لا نص في الطبعة</em>':''}${n?`<span class="n" title="مبادئ تذكر المادة">${n}</span>`:''}</b>${t?`<span>${esc(t.slice(0,160))}${t.length>160?'…':''}</span>`:''}</button>`;};
  const A=L.articles,tree=lawTree(L);
  const span=(i0,i1,kids)=>{let h='',i=i0;const ks=[...kids].sort((a,b)=>a.i0-b.i0);while(i<i1){const k=ks.find(x=>x.i0===i);if(k&&k.i1>i){h+=node(k);i=k.i1;}else{if(!A[i].issue)h+=row(A[i]);i++;}}return h;};
  const node=t=>`<details class="lsec"><summary>${esc(t.title)}<small>${t.frm===t.to?'المادة '+t.frm:'المواد '+t.frm+'–'+t.to}</small></summary>${t.kids.length?`<div>${span(t.i0,t.i1,t.kids)}</div>`:`<div class="rows">${span(t.i0,t.i1,[])}</div>`}</details>`;
  const first=tree.length?Math.min(...tree.map(t=>t.i0)):A.length;
  const body=span(0,first,[])+(tree.length?span(first,A.length,tree):'');
  const iss=A.filter(a=>a.issue),ix=LAWBYID[id]||{};
  el.innerHTML=`<div class="crumbs no-print"><button data-go="#/laws">التشريعات</button>›<span>${esc(L.short)}</span></div>
   <div class="vh"><h2>${esc(L.title)}</h2><button class="btn" data-print>${svg('print')}طباعة</button>${lcount[L.key]?`<button class="btn" data-go="#/index/law/${encodeURIComponent(L.key)}">مبادئه (${nf(lcount[L.key])})</button>`:''}</div>
   <div class="card rhead"><div class="kv"><span><b>النوع</b>${esc(L.type)}</span>${L.issued?`<span><b>صدر</b>${esc(L.issued.split('-').reverse().join('/'))}${L.issued_hijri?' ('+esc(L.issued_hijri)+')':''}</span>`:''}<span><b>المواد</b>${nf(A.filter(a=>!a.issue).length)}</span>${ix.memo?`<span><b>المذكرة</b><button class="linkbtn" data-go="#/m/${L.id}">افتحها</button></span>`:''}</div></div>
   ${amendBanner(L)}<div class="verban">${svg('info')}<span><b>${esc(L.text_version)}.</b> المصدر: ${esc(L.source.kind)}${L.source.edition?'، '+esc(L.source.edition):''}. ${esc(L.source.note||'')}</span></div>
   ${L.notes&&L.notes.length?`<div class="card lnotes"><b>${L.contrib?'ملاحظات على المصدر':L.source&&/الجريدة/.test(L.source.kind)?'ملاحظات النشر':'حواشي الطبعة'}</b>${L.notes.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}
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
// نص المادة المعنية داخل مادة معدِّلة: الفقرات بعد سطر «مادة (n)…» حتى سطر «مادة» التالي (مثل أداة الحزم)
const RLAB=/^\(?\s*(?:ال)?مادة(?:\s|\(|$)/,ORDN={'الأولى':1,'الثانية':2,'الثالثة':3,'الرابعة':4,'الخامسة':5,'السادسة':6,'السابعة':7,'الثامنة':8,'التاسعة':9,'العاشرة':10};
const labN=t=>{const m=west(t).match(/\d+/);if(m)return +m[0];for(const w in ORDN)if(t.includes(w))return ORDN[w];return null;};
function amSeg(paras,n,bis){let P=paras.slice();if(P.length&&/^\(?\s*(?:ال)?مادة\s+\S+\s*\)?\s*:?\s*$/.test(P[0])&&P[0].length<30)P=P.slice(1);
  const labs=P.map((p,i)=>i>0&&RLAB.test(p)&&p.length<60?i:-1).filter(i=>i>=0);
  if(!labs.length)return {clause:P[0]||'',lab:null,seg:P.slice(1)};
  for(let k=0;k<labs.length;k++){const i=labs[k],L=P[i];if(labN(L)===n&&(/مكرر/.test(L)===!!bis))return {clause:P[0],lab:L,seg:P.slice(i+1,labs[k+1]||P.length)};}
  return null;}
// مقارنة كلمة بكلمة (أطول تتابع مشترك): المحذوف مشطوب والمضاف مظلل
function diffHTML(a,b){const A=a.split(/(\s+)/).filter(x=>x!==''),B=b.split(/(\s+)/).filter(x=>x!=='');const n=A.length,m=B.length;
  if(n*m>4e6)return '<p class="muted">النصان أطول من أن يُقارنا هنا.</p>';
  const D=Array.from({length:n+1},()=>new Uint16Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)D[i][j]=A[i]===B[j]?D[i+1][j+1]+1:Math.max(D[i+1][j],D[i][j+1]);
  let i=0,j=0,o='';const nl=x=>esc(x).replace(/\n/g,'<br>');
  while(i<n&&j<m){if(A[i]===B[j]){o+=nl(A[i]);i++;j++;}else if(D[i+1][j]>=D[i][j+1]){o+=/^\s+$/.test(A[i])?nl(A[i]):`<del>${nl(A[i])}</del>`;i++;}else{o+=/^\s+$/.test(B[j])?nl(B[j]):`<ins>${nl(B[j])}</ins>`;j++;}}
  while(i<n){o+=/^\s+$/.test(A[i])?nl(A[i]):`<del>${nl(A[i])}</del>`;i++;}while(j<m){o+=/^\s+$/.test(B[j])?nl(B[j]):`<ins>${nl(B[j])}</ins>`;j++;}
  return `<p class="dlg-l"><span class="dk del">محذوف</span><span class="dk ins">مضاف</span></p><div class="dtext">${o}</div>`;}
// ---------- الانتقال السريع (Ctrl/⌘+K): مادة أو طعن أو قانون أو مجموعة أو قسم، بلوحة مفاتيح أو لمس
function palette(){const d=dlg(`${svg('search')} انتقال سريع`,`<input id="pq" class="pq" type="search" placeholder="م 41 من 6/2010 · الطعن 730/2012 · اسم قانون" autocomplete="off" enterkeyhint="go"><div id="pres" class="pres"></div><p class="hint pk">↑↓ للتنقل · Enter للفتح · Esc للإغلاق</p>`,'palette');
  const inp=$('pq');let sel=0,items=[];const NAV=[['الرئيسية','#/'],['البحث','#/search'],['التشريعات','#/laws'],['الفهرس','#/index/topics'],['المحفوظات','#/saved'],['المزيد','#/more']];
  const render=()=>{const q=inp.value.trim(),nq=norm(q);items=[];
    if(q){items=smartJump(q);LAWIX.filter(x=>norm(x.short+' '+x.title).includes(nq)).slice(0,6).forEach(x=>{const g='#/law/'+x.id;if(!items.some(j=>j.go===g))items.push({ic:'scroll',t:x.short,s:lawTitle(x),go:g});});
      ORDER.filter(k=>norm(COLS[k].name+' '+COLS[k].title).includes(nq)).slice(0,3).forEach(k=>items.push({ic:'book',t:COLS[k].name,s:COLS[k].title,go:'#/index/book/'+k}));
      NAV.filter(([t])=>norm(t).includes(nq)).forEach(([t,g])=>items.push({ic:'open',t,s:'قسم',go:g}));
      items.push({ic:'search',t:`ابحث عن «${q}» في المبادئ`,s:'بحث في نصوص المبادئ وإسنادها',q});}
    else HIST.slice(0,6).map(i=>BYID[i]).filter(Boolean).forEach(p=>items.push({ic:'clock',t:`${COLS[p.col].name} — المبدأ ${p.n}`,s:(p.p[0]||'').slice(0,80),go:'#/p/'+p.id}));
    sel=Math.max(0,Math.min(sel,items.length-1));
    $('pres').innerHTML=items.length?items.map((j,i)=>`<button class="arow${i===sel?' sel':''}" data-pi="${i}">${svg(j.ic)}<span><b>${esc(j.t)}</b><small>${esc(j.s)}</small></span></button>`).join(''):'<p class="muted" style="padding:8px">اكتب رقم مادة أو طعن أو اسم قانون.</p>';
    const se=$('pres').querySelector('.sel');if(se)se.scrollIntoView({block:'nearest'});};
  const open=i=>{const j=items[i];if(!j)return;closeDlg();if(j.q!=null)doSearch(j.q);else go(j.go);};
  inp.oninput=()=>{sel=0;render();};
  inp.onkeydown=e=>{if(e.key==='ArrowDown'){sel=Math.min(sel+1,items.length-1);render();e.preventDefault();}else if(e.key==='ArrowUp'){sel=Math.max(sel-1,0);render();e.preventDefault();}else if(e.key==='Enter'){e.preventDefault();open(sel);}};
  $('pres').onclick=e=>{const b=e.target.closest('[data-pi]');if(b)open(+b.dataset.pi);};render();setTimeout(()=>inp.focus(),40);}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&(e.key==='k'||e.key==='K'||e.key==='ك')){e.preventDefault();palette();}});
function viewArt(id){const el=$('v-item');el.innerHTML=LOADMSG;const lid=lawOfArt(id);
  loadLaw(lid).then(L=>{let a=ARTBYID[id];if(!a){const m=id.match(/-A0*(\d+)$/);if(m&&L.byN)a=L.byN[+m[1]];}
  if(!a){el.innerHTML=`<div class="empty">هذه المادة غير موجودة في نص الطبعة المتاح. <button class="linkbtn" data-go="#/law/${lid}">افتح القانون</button></div>`;return;}
  const pv=L.articles.slice(0,a.i).reverse().find(x=>!!x.issue===!!a.issue),nx=L.articles.slice(a.i+1).find(x=>!!x.issue===!!a.issue),ps=artPR(a);document.title=`${a.label} — ${L.short}`;
  const trail=a.trail||[a.part,a.chapter,a.section].filter(Boolean);
  el.innerHTML=`<div class="crumbs no-print"><button data-go="#/laws">التشريعات</button>›<button data-go="#/law/${L.id}">${esc(L.short)}</button>${trail.length?'›<span>'+trail.map(esc).join(' › ')+'</span>':''}</div>
   <div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>${esc(a.label)}${a.issue?' (من مواد الإصدار)':''} — ${esc(L.short)}</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
   ${!a.issue&&ps.length?`<div class="ajump no-print"><button class="lnk" data-jump="aprs">${svg('scale')}مبادئ تذكر هذه المادة (${ps.length}) ↓</button></div>`:''}
   <article class="card artcard"><div class="ltxt${a.paras.length>4?' folded':''}">${a.paras.length?a.paras.map(x=>`<p>${esc(x)}</p>`).join(''):'<p class="muted">لا يوجد نص لهذه المادة في الطبعة، وقد تبيّن الحاشية سبب ذلك.</p>'}</div>${a.paras.length>4?`<button class="btn sm unfold no-print" data-unfoldtxt>${svg('dots')}بقية نص المادة (${a.paras.length-2} فقرات)</button>`:''}
    ${a.notes&&a.notes.length?`<div class="lnotes"><b>حاشية الطبعة</b>${a.notes.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:''}
    <div class="verban small">${svg('info')}<span>${esc(L.text_version)}.</span></div>
    <div class="acts no-print"><button class="btn" id="acp">${svg('copy')}نسخ</button><button class="btn" id="ash">${svg('share')}مشاركة</button><button class="btn" id="alk">${svg('link')}الرابط</button>${'speechSynthesis' in window&&a.paras.length?`<button class="btn" id="asp">${svg('speak')}استماع</button>`:''}</div></article>
   <div id="aev"></div>
   <details class="card inline-src fold"><summary>${svg('page')} صفحة المصدر — اضغط للعرض</summary>${lawPagesHTML(a)}</details>
   <div class="pn no-print">${pv?`<button class="btn" data-go="#/a/${pv.id}">${svg('back')}<span>${esc(pv.label)}</span></button>`:'<span></span>'}${nx?`<button class="btn" data-go="#/a/${nx.id}"><span>${esc(nx.label)}</span><svg class="i" viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="${IC.back}"/></svg></button>`:''}</div>
   <div id="amemo"></div>
   ${a.issue?'':`<h2 id="aprs">مبادئ تذكر هذه المادة (${ps.length})</h2>${ps.length?`<div class="list">${ps.slice(0,40).map(p=>card(p,null)).join('')}</div>${ps.length>40?`<button class="btn" data-f2="1">عرض الكل (${ps.length})</button>`:''}`:'<p class="muted">لا توجد في المكتبة مبادئ تحيل إلى هذه المادة بعد.</p>'}`}`;
  const url=location.href.split('#')[0]+'#/a/'+a.id;
  const uf=el.querySelector('[data-unfoldtxt]');if(uf)uf.onclick=()=>{el.querySelector('.ltxt').classList.remove('folded');uf.remove();};
  const jp=el.querySelector('[data-jump]');if(jp)jp.onclick=()=>{const h=$('aprs');if(h)window.scrollTo({top:h.getBoundingClientRect().top+scrollY-70,behavior:'smooth'});};
  $('acp').onclick=()=>clip(artQuote(a),()=>toast('نُسخ نص المادة'));
  $('alk').onclick=()=>clip(url,()=>toast('نُسخ الرابط'));
  // تعديلات لاحقة على هذه المادة، أو ما تعدّله هذه المادة في قوانين أخرى
  const ev=artEv(L,a),rv=AMBY[a.id]||[];
  if(ev.length||rv.length){const box=$('aev');
    box.innerHTML=(ev.length?`<div class="card amendbox"><h3>${ev.some(e=>e.how==='إلغاء')?'أُلغيت هذه المادة':'عُدّلت هذه المادة بعد هذه النسخة'}</h3>${ev.map((e,i)=>`<div class="aitem"><p><span class="abadge ${e.how==='إلغاء'?'rep':''}">${esc(e.how)}${e.part?' — '+esc(e.part):''}</span> بـ${lawLink(e.by)}${e.date?' الصادر في '+fdate(e.date):''} — <button class="linkbtn" data-go="#/a/${e.by_art}">مادة التعديل</button></p><div class="ltxt atext" id="aet${i}"><p class="muted">جارٍ تحميل نص التعديل…</p></div></div>`).join('')}<p class="hint">نص التعديل منقول كما نُشر، ولم يُدمج في نص المادة أعلاه. «قارن» يبيّن الفرق بين النصين كلمةً كلمة.</p></div>`:'')
     +(rv.length?`<div class="card amendbox new"><h3>ما تعدّله هذه المادة</h3>${rv.map(e=>{const bx=LAWBYID[e.lid];const tgt=e.how==='إضافة'?`إضافة المادة ${esc(e.n)}`:`المادة ${esc(e.n)}`;return `<p><span class="abadge">${esc(e.how)}${e.part?' — '+esc(e.part):''}</span> ${bx&&e.how!=='إضافة'?`<button class="linkbtn" data-go="#/a/${e.lid}-A${pad4(e.n)}">${tgt}</button>`:tgt} من ${bx?`<button class="linkbtn" data-go="#/law/${bx.id}">${esc(bx.short)}</button>`:'القانون الأصلي'}</p>`;}).join('')}</div>`:'');
    ev.forEach((e,i)=>loadLaw(e.by_id).then(()=>{const t=ARTBYID[e.by_art],d=$('aet'+i);if(!d)return;if(!t){d.innerHTML='<p class="muted">تعذّر تحميل نص التعديل.</p>';return;}
      const sg=e.how==='إلغاء'?null:amSeg(t.paras,a.n,a.bis);
      const full=sg&&sg.seg.length&&e.how==='استبدال'&&!e.part&&!(sg.lab&&/فقرة|بند/.test(sg.lab));
      d.innerHTML=`<p class="tl">${esc(t.label)} — ${esc(t.law.short)}</p>`+(sg&&sg.clause?`<p class="clause">${esc(sg.clause)}</p>`:'')
        +(sg&&sg.seg.length?`${full?'<p class="nlab">النص بعد الاستبدال</p>':''}${sg.lab?`<p class="slab">${esc(sg.lab)}</p>`:''}${sg.seg.map(x=>`<p>${esc(x)}</p>`).join('')}`:t.paras.map(x=>`<p>${esc(x)}</p>`).join(''))
        +(full&&a.paras.length?`<button class="btn sm cmpb" data-cmp="${i}">${svg('filter')}قارن بالنص السابق</button><div class="diff" id="adf${i}" hidden></div>`:'')
        +(e.src==='amali'?'<p class="hint">نص التعديل من مساهمة «عمّالي» (منقول بصريًا، لم يُطابَق مع صفحات الجريدة).</p>':'');
      const cb=d.querySelector('[data-cmp]');if(cb)cb.onclick=()=>{const f=$('adf'+i);if(!f.innerHTML)f.innerHTML=diffHTML(a.paras.join('\n'),sg.seg.join('\n'));f.hidden=!f.hidden;cb.classList.toggle('on',!f.hidden);};
    }).catch(()=>{}));}if($('asp'))$('asp').onclick=()=>speakArt(a);
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
    <div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>${esc(M.title)}</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
    <div class="verban small">${svg('info')}<span>${esc(M.note)}</span></div><div id="mbody"></div>`;
   draw();el.onclick=e=>{const b=e.target.closest('[data-mpg]');if(!b)return;const g=+b.dataset.mpg;side(pgCaption(M.page_meta,g),lawPageHTML(M.pages_col,M.page_meta,g,null));};
   if(k!=null)setTimeout(()=>{const t=$('mp'+k);if(t)t.scrollIntoView({block:'center'});},60);
  }).catch(()=>{el.innerHTML='<div class="empty">تعذّر تحميل المذكرة.</div>';});}
// ---------- views scaffold
const main=$('main');
const SNAV=[['home','home','الرئيسية','مبدأ اليوم وما فتحته مؤخرًا'],['search','scale','المبادئ',`${nf(PR.length)} مبدأ · بحث وتصفح`],['laws','scroll','التشريعات','نصوص القوانين مادةً مادة'],['index','book','الفهرس','الموضوعات والقوانين والكتب'],['saved','star','المحفوظات','مجلداتك وملاحظاتك'],['about','info','عن المكتبة','المصادر وقواعد النزاهة'],['report','report','التقارير','طريقة الاستخراج والتحقق']];
IC.home='M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z';
main.innerHTML=`<div class="shell"><aside class="sidenav" aria-label="الأقسام">${SNAV.map(([k,i,t,d])=>`<button class="navcard" data-nav="${k}"><span class="ic">${svg(i)}</span><span><b>${t}</b><small>${d}</small></span></button>`).join('')}
 <button class="navcard" data-a2="settings"><span class="ic">${svg('gear')}</span><span><b>الإعدادات</b><small>الخط والمظهر والقفل</small></span></button>
 <button class="navcard" data-a2="rate"><span class="ic">${svg('star')}</span><span><b>ملاحظاتك واقتراحاتك</b><small>قيّم الأقسام وأرسل رأيك</small></span></button></aside>
 <div class="views">${['home','search','index','saved','more','item','report','about','laws','review'].map(v=>`<section id="v-${v}" hidden></section>`).join('')}</div></div>`;
// ---------- search engine
const F={q:'',col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:'',ap:'',ay:''};let SCOPE='p';
function terms(q){const o=[];west(q).replace(/"([^"]+)"|«([^»]+)»|(\S+)/g,(m,a,b,c)=>{const t=norm(a||b||c);if(t)o.push(t)});return o;}
const CLS={'ا':'[اأإآ]','ي':'[يىئ]','ه':'[هة]','و':'[وؤ]'};
function hlRe(ts){if(!ts.length)return null;return new RegExp('('+ts.map(t=>[...t].map(ch=>ch===' '?'\\s+':(CLS[ch]||ch.replace(/[.*+?^${}()|[\]\\\/]/g,'\\$&'))+'[\\u064B-\\u0652\\u0640]*').join('')).join('|')+')','g');}
const hl=(s,re)=>{s=esc(s);return re?s.replace(re,'<mark>$1</mark>'):s;};
let cur=[],shown=30;
function filterPR(){const ts=terms(F.q),art=west(F.art).replace(/\s+/g,'');
  return PR.filter(p=>ts.every(t=>p.ns.includes(t))&&(!F.col||p.col===F.col)&&(!F.tp||p.tp.some(x=>x[0]===F.tp))&&(!F.ch||p.c.some(x=>x.ch===F.ch))&&(!F.rv||p.rv.length)&&(!F.sec||p.sk===F.sec||p.sk.startsWith(F.sec+'›'))
   &&(!F.lw&&!art||p.lw.some(([l,as])=>(!F.lw||l===F.lw)&&(!art||as.some(a=>a===art||a.split('/')[0]===art))))
   &&(!F.ap&&!F.ay||p.c.some(c=>c.k&&apMatch(c.k))));}
// رقم الطعن وسنته: يطابق أي طعن في مفتاح الحكم («24/1983+25/1983@1983-12-26»)
function apMatch(k){const n=west(F.ap).trim(),y=west(F.ay).trim();return k.split('@')[0].split('+').some(x=>{const [a,b]=x.split('/');return (!n||a===n)&&(!y||b===y);});}
// ---------- الانتقال المباشر: «م 41 من 6/2010»، «المادة 154 جزاء»، «الطعن 730/2012»، «V09L-0184»
let RULAP=null;
function rulAp(){if(RULAP)return RULAP;RULAP={};Object.keys(RUL).forEach(k=>k.split('@')[0].split('+').forEach(a=>(RULAP[a]=RULAP[a]||[]).push(k)));return RULAP;}
const LAWALIAS={'العمل':'6/2010','عمل':'6/2010','المدني':'67/1980','مدني':'67/1980','الجزاء':'16/1960','جزاء':'16/1960','المرافعات':'38/1980','مرافعات':'38/1980','الاثبات':'39/1980','اثبات':'39/1980','التجارة':'68/1980','التجاري':'68/1980','تجاري':'68/1980','الاجراءات':'17/1960','الاجراءات الجزائيه':'17/1960','الاحوال الشخصيه':'51/1984','الاحوال':'51/1984','الخدمه المدنيه':'15/1979','تنظيم القضاء':'80/2026','الشركات':'1/2016','المخدرات':'159/2025','الخبره':'40/1980','الجنسيه':'15/1959','الدستور':'دستور'};
function lawByName(t){t=norm(t).replace(/^(?:ق|قانون|القانون)\s+/,'').trim();if(t.length<2)return null;
  const a=LAWALIAS[t];if(a)return LAWBYKEY[a]||LAWIX.find(x=>x.type==='دستور')||null;
  const c=LAWIX.filter(x=>x.cat==='law'&&x.status!=='ملغى'&&norm(x.short).includes(t)).sort((x,y)=>x.short.length-y.short.length);return c[0]||null;}
function smartJump(q){const s=' '+west(q).replace(/[()«»]/g,' ').replace(/\s+/g,' ')+' ',out=[],seen=new Set();const add=o=>{if(!seen.has(o.go)){seen.add(o.go);out.push(o);}};
  const idm=s.match(/\b([A-Za-z0-9]{2,5}-\d{4})\b/);if(idm&&BYID[idm[1].toUpperCase()]){const p=BYID[idm[1].toUpperCase()];add({ic:'page',t:`${COLS[p.col].name} — المبدأ ${p.n}`,s:p.id,go:'#/p/'+p.id});}
  const am=s.match(/\s(?:م|مادة|المادة|ماده|الماده)\s*\.?\s*(\d{1,4})\s/);
  const lm=s.match(/\s(\d{1,4})\s*\/\s*(\d{4})\s/)||s.match(/\s(\d{1,4})\s+(?:لسنة|لسنه|سنة)\s+(\d{4})\s/);
  let law=lm?LAWBYKEY[`${+lm[1]}/${lm[2]}`]:null;
  if(!law&&am){const rest=s.replace(am[0],' ').replace(/\s(?:من|في)\s/g,' ').trim();law=lawByName(rest);}
  if(am&&law){const n=+am[1],D=LAWDATA[law.id],a=D?D.byN[n]:{id:`${law.id}-A${pad4(n)}`};if(a)add({ic:'scroll',t:`المادة ${n} — ${law.short}`,s:lawTitle(law),go:'#/a/'+a.id});}
  if(law&&!am)add({ic:'scroll',t:law.short,s:lawTitle(law),go:'#/law/'+law.id});
  if(!lm&&!am){const L2=lawByName(s.trim());if(L2&&norm(s.trim()).length>=3&&/قانون|ق /.test(s))add({ic:'scroll',t:L2.short,s:lawTitle(L2),go:'#/law/'+L2.id});}
  for(const m of s.matchAll(/(\d{1,5})\s*\/\s*(\d{4})/g)){const ks=rulAp()[`${+m[1]}/${m[2]}`]||[];ks.slice(0,4).forEach(k=>{const ses=k.split('@')[1];add({ic:'gavel',t:`الطعن ${+m[1]}/${m[2]}`,s:`جلسة ${ses?ses.split('-').reverse().join('/'):''} — ${RUL[k].length} ${RUL[k].length>2&&RUL[k].length<11?'مبادئ':'مبدأ'}`,go:'#/r/'+k});});}
  return out;}
const jumpHTML=js=>js.length?`<div class="jump card"><h3>${svg('open')} انتقال مباشر</h3>${js.map(j=>`<button class="arow" data-go="${esc(j.go)}">${svg(j.ic)}<span><b>${esc(j.t)}</b><small>${esc(j.s)}</small></span></button>`).join('')}</div>`:'';
// ---------- card
// الحكم نفسه: يُفرَّق بين المبدأ نفسه منشورًا في موضع آخر (تطابق النص) ومبدأ آخر قرره الحكم ذاته
const txn=s=>s.replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\u0621-\u064A0-9]+/g,' ').trim();
const TXW={};const txw=p=>TXW[p.id]||(TXW[p.id]=new Set(txn(p.p.join(' ')).split(' ').filter(Boolean)));
function sameText(a,b){const A=txw(a),B=txw(b);if(!A.size||!B.size)return false;let i=0;A.forEach(w=>{if(B.has(w))i++;});return Math.min(A.size,B.size)>=4&&i/Math.min(A.size,B.size)>=0.8;}
function relSplit(p){const s=[],o=[];(p.rel||[]).forEach(id=>{const q=BYID[id];if(q)(sameText(p,q)?s:o).push(q);});return [s,o];}
function blocks(p){const o=[];let ci=0;const pos=p.cp&&p.cp.length===p.c.length?p.cp:p.c.map(()=>p.p.length);
  p.p.forEach((x,k)=>{o.push(['t',x]);while(ci<p.c.length&&pos[ci]===k+1)o.push(['c',p.c[ci++]]);});while(ci<p.c.length)o.push(['c',p.c[ci++]]);return o;}
const MT={b:'مصنَّف من أبواب الكتاب',k:'الكلمة المفتاحية للمكتب الفني',a:'تصنيف آلي — يحتاج تأكيدًا'};
// الشارات: تظهر أولها، والباقي خلف «+n» يتسع عند الضغط
const splitChips=h=>h?h.match(/<button[\s\S]*?<\/button>/g)||[]:[];
function chipsFold(arr,k){if(arr.length<=k+1)return arr.join('');return arr.slice(0,k).join('')+`<span class="cmore" hidden>${arr.slice(k).join('')}</span><button class="chip plus" data-unfold aria-label="عرض الباقي">+${arr.length-k}</button>`;}
// قائمة الإجراءات الأخرى للمبدأ (الهاتف): مشاركة، ملاحظة، استماع، ونسخ أجزاء بعينها
function actsSheet(p){const k=(p.c.find(c=>c.k)||{}).k;
  const it=(a,ic,t,s)=>`<button class="ash" data-a="${a}">${svg(ic)}<span><b>${t}</b>${s?`<small>${s}</small>`:''}</span></button>`;
  const d=dlg(`${COLS[p.col].name} · ${p.n}`,`<div class="ashs" data-id="${p.id}">
   ${it('share','share','مشاركة','واتساب أو البريد أو غيرهما')}
   ${it('note','note',NOTE[p.id]?'تعديل ملاحظتي':'إضافة ملاحظة','تُحفظ في جهازك')}
   ${'speechSynthesis' in window?it('speak','speak','استماع','قراءة النص بصوت عربي'):''}
   ${it('cite','copy','نسخ الإسناد فقط','رقم الطعن والجلسة ومكان النشر')}
   ${it('copytext','copy','نسخ نص المبدأ فقط','دون الإسناد')}
   ${it('link','link','نسخ رابط المبدأ','رابط ثابت يفتحه مباشرة')}
   ${k&&RUL[k]&&RUL[k].length>1?`<button class="ash" data-go="#/r/${esc(k)}">${svg('gavel')}<span><b>كل مبادئ هذا الحكم</b><small>${RUL[k].length} مبدأ</small></span></button>`:''}
   <a class="ash" href="${amaliP(p.id)}" target="_blank" rel="noopener"><img src="icons/partners/amali.svg" alt="" class="pic"><span><b>افتح في «عمّالي»</b><small>المبدأ نفسه في منصة القاضي ↗</small></span></a>
  </div>`,'sheet');return d;}
function card(p,re,o={}){
  const h=[];let open=false;
  blocks(p).forEach(([k,x])=>{if(k==='t'){if(open){h.push('</ul>');open=false;}h.push(`<p>${hl(x,re)}</p>`);}else{if(!open){h.push('<ul class="cits">');open=true;}
    const n=x.k&&RUL[x.k]?RUL[x.k].length:0;h.push(`<li>${hl(x.raw,re)}${x.k?`<button class="rk" data-go="#/r/${esc(x.k)}" title="كل ما ورد عن هذا الحكم">الحكم${n>1?' · '+n:''}</button>`:''}</li>`);}});
  if(open)h.push('</ul>');if(!p.c.length)h.push('<ul class="cits"><li>لا يوجد إسناد في المصدر</li></ul>');
  const rchip=q=>`<button class="chip" data-go="#/p/${q.id}">${esc(COLS[q.col].name)} ${q.n}</button>`,al=alsoOf(p),[rs0,ro]=relSplit(p),rs=rs0.filter(q=>!al.includes(q.id));
  const also=al.length?`<div class="also"><span>ورد أيضًا في</span>${chipsFold(al.map(i=>{const q=BYID[i];return `<button class="chip" data-go="#/p/${q.id}"${q.rx!==undefined||q.rule?' title="ومعه نص القاعدة"':''}>${esc(COLS[q.col].name)} · ${q.n}</button>`;}),3)}</div>`:'';
  const rel=(rs.length?`<span class="relw" title="النص نفسه منشور في موضع آخر">المبدأ نفسه في: ${rs.map(rchip).join('')}</span>`:'')+(ro.length?`<span class="relw other" title="مبادئ أخرى قررها الحكم نفسه في مسائل مختلفة">من الحكم نفسه: ${ro.map(rchip).join('')}</span>`:'');
  const tps=p.tp.filter(x=>TL[x[0]]).map(([t,m,lo])=>`<button class="chip${m==='a'?' auto':''}${lo?' low':''}" data-f="tp" data-v="${esc(t)}" title="${esc(TL[t][0])} — ${MT[m]||''}">${esc(TL[t][1])}</button>`).join('');
  const lws=p.lw.map(([l,as,su])=>`<button class="chip lw${su?' sus':''}${LAWBYKEY[l]?' full':''}" ${LAWBYKEY[l]?(artOf(l,as[0])?`data-go="#/a/${artOf(l,as[0]).id}"`:`data-go="#/law/${LAWBYKEY[l].id}"`):`data-f="lw" data-v="${esc(l)}"`} title="${esc(LL[l]||l)}${LAWBYKEY[l]?' — افتح نص المادة':''}">${as.length?'م '+esc(as.slice(0,3).join('، '))+(as.length>3?'…':'')+' · ':''}${l==='دستور'?'الدستور':'ق '+esc(l)}</button>`).join('');
  const fav=!!FAV[p.id],note=NOTE[p.id];
  const tpA=splitChips(tps),lwA=splitChips(lws),nrel=rs.length+ro.length,flag=p.rv.length?'<span class="chip flag">يحتاج مراجعة</span>':'';
  const more=[lwA.length?`${lwA.length} ${lwA.length===1?'قانون':'قوانين'}`:'',nrel?`${nrel} ${nrel===1?'مبدأ مرتبط':'مبادئ مرتبطة'}`:'',tpA.length>1?`${tpA.length-1} ${tpA.length===2?'موضوع آخر':'موضوعات أخرى'}`:''].filter(Boolean);
  const meta=o.page?(flag+tpA.join('')+lwA.join('')+(nrel?`<details class="mfold"><summary>${nrel} ${nrel===1?'مبدأ مرتبط':'مبادئ مرتبطة بالحكم نفسه'}</summary>${rel}</details>`:''))
    :(flag+(tpA[0]||'')+(more.length?`<details class="mfold"><summary>${more.join(' · ')}</summary>${tpA.slice(1).join('')}${lwA.join('')}${rel}</details>`:''));
  return `<article class="pr card" id="p${p.id}" data-id="${p.id}">
   <div class="num">${p.n}${p.np!==p.n?`<small>طُبع ${p.np}</small>`:''}<div class="idchip">${p.id}</div></div>
   <div class="body">
    <div class="crumb"><span>${esc(COLS[p.col].name)}</span>${p.sec.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
    ${p.ttl?`<div class="ttl">${hl(p.ttl,re)}</div>`:''}<div class="text">${h.join('')}</div>
    ${p.rule===undefined&&p.rx!==undefined?`<details class="rule" data-rx="${p.id}"${o.open?' open':''}><summary>القاعدة — نص الحكم</summary><div class="text">جارٍ التحميل…</div></details>`:''}
    ${p.rule?`<details class="rule"${o.open||(re&&(re.lastIndex=0,re.test(p.rule)))?' open':''}><summary>القاعدة — نص الحكم</summary><div class="text">${hl(p.rule,re)}</div></details>`:''}
    ${p.fn.length?`<div class="fn">${p.fn.map(esc).join('<br>')}</div>`:''}${p.sa.length?`<div class="sa">${p.sa.map(esc).join('<br>')}</div>`:''}
    ${also}<div class="meta">${meta}</div>
    <div class="acts no-print">
     <button class="btn" data-a="copy">${svg('copy')}نسخ</button>
     <button class="btn${fav?' on':''}" data-a="fav">${svg('star')}${fav?'محفوظ':'حفظ'}</button>
     <button class="btn" data-a="src" title="صورة الصفحة في المصدر">${svg('page')}ص ${printed(p).join('–')}</button>
     <span class="sp"></span>
     ${o.page?'':`<button class="btn" data-go="#/p/${p.id}">${svg('open')}فتح</button>`}
     <button class="btn icon more" data-a="more" aria-label="إجراءات أخرى" title="إجراءات أخرى">${svg('dots')}</button>
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
  const put=f=>{const n=Date.now();FAV[p.id]={f,t:cur?cur.t:n,updated:n};delete DEL.favs[p.id];saveUser();refreshCard(p.id);closeDlg();toast('حُفظ في «'+f+'»');if(/^#\/saved/.test(location.hash))viewSaved();};
  d.addEventListener('click',e=>{const b=e.target.closest('[data-fold]');if(b)put(b.dataset.fold);});
  $('nfb').onclick=()=>{const v=$('nf').value.trim();if(!v)return;if(!FOLD.includes(v)){FOLD.push(v);FOLDT[v]=Date.now();delete DEL.folders[v];}put(v);};
  if(cur)$('unfav').onclick=()=>{delete FAV[p.id];DEL.favs[p.id]=Date.now();saveUser();refreshCard(p.id);closeDlg();toast('أُزيل من المحفوظات');};
}
function noteDlg(p){
  const d=dlg('ملاحظتي على المبدأ',`<div class="set"><textarea id="nt" rows="6" style="font:inherit;padding:10px;border:1px solid var(--rule);border-radius:12px;background:var(--bg);color:var(--ink);width:100%">${esc(NOTE[p.id]||'')}</textarea>
   <div class="rowi"><button class="btn primary" id="ns">حفظ</button>${NOTE[p.id]?'<button class="btn" id="nd">حذف الملاحظة</button>':''}<span class="hint">تُحفظ في جهازك، وتنتقل إلى أجهزتك الأخرى بالمزامنة المشفّرة إن فعّلتها.</span></div></div>`);
  $('nt').focus();
  $('ns').onclick=()=>{const v=$('nt').value.trim();if(v){NOTE[p.id]=v;NOTET[p.id]=Date.now();delete DEL.notes[p.id];}else{delete NOTE[p.id];delete NOTET[p.id];DEL.notes[p.id]=Date.now();}saveUser();refreshCard(p.id);closeDlg();toast('حُفظت الملاحظة');};
  if($('nd'))$('nd').onclick=()=>{delete NOTE[p.id];delete NOTET[p.id];DEL.notes[p.id]=Date.now();saveUser();refreshCard(p.id);closeDlg();};
}
// ---------- الطباعة: تُطبع المادة المطلوبة وحدها (لا صفحة التطبيق)، في طبقة طباعة داخل الصفحة نفسها بخطوطها
const prDate=()=>new Date().toLocaleDateString('ar-KW',{year:'numeric',month:'long',day:'numeric'});
// صور الصفحات في الطباعة: عنصر <img> للشبكة مقصوص داخل إطاره (المتصفح لا يطبع خلفيات CSS افتراضيًا).
// تُبنى الطبقة وتُطبع مباشرة داخل ضغطة المستخدم، لأن Safari يحجب الطباعة إن تأخرت عن الضغطة.
function prImgs(root){root.querySelectorAll('.pgimg[data-gc]').forEach(d=>{const gc=+d.dataset.gc,cx=+d.dataset.cx,ry=+d.dataset.ry;
  const img=document.createElement('img');img.className='pgcut';img.alt='';img.src=d.dataset.src;img.style.cssText=`position:absolute;width:${gc*100}%;height:1000%;left:${-cx*100}%;top:${-ry*100}%;max-width:none`;
  d.style.backgroundImage='none';d.prepend(img);});}
// تحميل صور الشبكات مسبقًا عند فتح حوار الطباعة، لتكون جاهزة لحظة الضغط
const PRPRE={};function prPreload(html){(html.match(/data-src="([^"]+)"/g)||[]).forEach(m=>{const u=m.slice(10,-1);if(!PRPRE[u]){const i=new Image();i.src=u;PRPRE[u]=i;}});}
function printHTML(title,html,sub=''){let r=$('printroot');if(!r){r=document.createElement('div');r.id='printroot';document.body.appendChild(r);}
  r.innerHTML=`<header class="prh"><span>مبادئ التمييز</span><span>${esc(prDate())}</span></header><h1>${esc(title)}</h1>${sub?`<div class="prsub">${esc(sub)}</div>`:''}${html}
   <footer class="prf">طُبع من «مبادئ التمييز» — النصوص منقولة حرفيًا من مصادرها. راجع المصدر الرسمي قبل الاعتماد.</footer>`;
  r.querySelectorAll('details').forEach(d=>d.remove());
  if(IOSAPP()){pdfPrint(title,r);return;}
  prImgs(r);
  const t0=document.title;document.title=title;document.body.classList.add('printing');
  const done=()=>{document.body.classList.remove('printing');document.title=t0;r.innerHTML='';window.removeEventListener('afterprint',done);};
  window.addEventListener('afterprint',done);
  window.print();   // متزامن داخل الضغطة
  if(/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))setTimeout(done,1500);}
// ---------- الطباعة في تطبيق iPhone/iPad المثبّت على الشاشة الرئيسية: iOS لا يدعم window.print() هناك،
// فتُرسم الصفحات على لوحة رسم (A4) ويُصنع منها ملف PDF يُفتح له خيار «طباعة» من قائمة المشاركة.
const IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const IOSAPP=()=>LS.get('pdfprint',false)||(IOS&&(navigator.standalone===true||matchMedia('(display-mode: standalone)').matches));
const PPW=1240,PPH=1754,PPM=96,PPT=150/72;   // A4 بدقة 150 نقطة في البوصة
function prModel(r){const out=[];const T=(s,o)=>{s=(s||'').replace(/\s+/g,' ').trim();if(s)out.push(Object.assign({t:'x',s},o));};
  const walk=(el,ctx)=>{for(const n of el.children){const c=n.classList,tag=n.tagName;
    if(c.contains('prh')){out.push({t:'head',a:n.children[0]?.textContent||'',b:n.children[1]?.textContent||''});continue;}
    if(tag==='H1'){T(n.textContent,{f:'700 %px "Reem Kufi","Cairo",sans-serif',z:17,col:'#0b2545',g:4});continue;}
    if(c.contains('prsub')){T(n.textContent,{f:'500 %px "Cairo",sans-serif',z:9.5,col:'#555',g:10});continue;}
    if(tag==='H2'){if(c.contains('prsec'))out.push({t:'rule',gap:12});T(n.textContent,{f:'700 %px "Cairo",sans-serif',z:13,col:'#0b2545',g:4,b:8});continue;}
    if(tag==='H3'){T(n.textContent,{f:'700 %px "Cairo",sans-serif',z:12,col:'#12325e',g:2,b:6});continue;}
    if(c.contains('prmeta')){T(n.textContent,{f:'600 %px "Cairo",sans-serif',z:9,col:'#6b5a2e',g:3});continue;}
    if(tag==='P'){const fn=ctx.fn||ctx.note;T(n.textContent,{f:'400 %px "Noto Naskh Arabic","Geeza Pro",serif',z:c.contains('prcit')?11:fn?10.5:13,col:c.contains('prcit')?'#333':fn?'#444':'#111',g:5,ind:ctx.fn?14:0,bg:ctx.note?'#f6f1e3':null});continue;}
    if(c.contains('prnote')){T(n.textContent,{f:'400 %px "Noto Naskh Arabic","Geeza Pro",serif',z:10.5,col:'#444',g:5,bg:'#f6f1e3'});continue;}
    if(c.contains('prfn')){if(n.querySelector('p'))walk(n,Object.assign({},ctx,{fn:1}));else T(n.textContent,{f:'400 %px "Noto Naskh Arabic",serif',z:10.5,col:'#444',g:5,ind:14});continue;}
    if(tag==='FIGURE'){const d=n.querySelector('.pgimg'),h=d&&d.querySelector('.hlbox'),cap=n.querySelector('figcaption');
      if(d){const ar=d.style.aspectRatio.split('/').map(Number);out.push({t:'img',src:d.dataset.src,gc:+d.dataset.gc,cx:+d.dataset.cx,ry:+d.dataset.ry,ar:ar[1]/ar[0],
        hl:h?['left','top','width','height'].map(k=>parseFloat(h.style[k])/100):null});}
      if(cap)T(cap.textContent,{f:'500 %px "Cairo",sans-serif',z:8.5,col:'#666',g:8,al:'center'});continue;}
    if(c.contains('prf')){out.push({t:'rule',gap:14});T(n.textContent,{f:'500 %px "Cairo",sans-serif',z:8,col:'#777',g:0});continue;}
    walk(n,ctx);
    if(c.contains('prblock'))out.push({t:'rule',gap:10,dash:1});}};
  walk(r,{});return out;}
async function prRender(model,title){const imgs={};
  await Promise.all([...new Set(model.filter(b=>b.t==='img').map(b=>b.src))].map(u=>new Promise(res=>{const i=new Image();i.onload=i.onerror=()=>res();i.src=u;imgs[u]=i;})));
  try{await Promise.all(['400 20px "Noto Naskh Arabic"','500 20px "Cairo"','600 20px "Cairo"','700 20px "Cairo"','700 20px "Reem Kufi"'].map(f=>document.fonts.load(f,'ابت')));}catch(e){}
  const pages=[];let cv,cx,y;const W=PPW-2*PPM,bottom=PPH-PPM-30;
  const np=()=>{cv=document.createElement('canvas');cv.width=PPW;cv.height=PPH;cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,PPW,PPH);cx.direction='rtl';pages.push(cv);y=PPM;};np();
  for(const b of model){
    if(b.t==='head'){cx.font=`600 ${9*PPT}px "Cairo",sans-serif`;cx.fillStyle='#6b5a2e';cx.textAlign='right';cx.fillText(b.a,PPW-PPM,y+9*PPT);cx.textAlign='left';cx.direction='ltr';cx.fillText(b.b,PPM,y+9*PPT);cx.direction='rtl';
      y+=9*PPT*1.6;cx.fillStyle='#b8923a';cx.fillRect(PPM,y,W,3);y+=10*PPT;continue;}
    if(b.t==='rule'){y+=b.gap*PPT/2;if(y>bottom)continue;cx.fillStyle=b.dash?'#bbb':'#ccc';if(b.dash){for(let x=PPM;x<PPW-PPM;x+=12)cx.fillRect(x,y,6,1.5);}else cx.fillRect(PPM,y,W,1.5);y+=b.gap*PPT/2;continue;}
    if(b.t==='img'){const im=imgs[b.src];if(!im||!im.naturalWidth)continue;let w=Math.min(W,12.5/21*PPW),h=w*b.ar;const maxH=bottom-PPM;if(h>maxH){h=maxH;w=h/b.ar;}
      if(y+h>bottom)np();const x=(PPW-w)/2,sw=im.naturalWidth/b.gc,sh=im.naturalHeight/10;
      cx.drawImage(im,b.cx*sw,b.ry*sh,sw,sh,x,y,w,h);cx.strokeStyle='#999';cx.lineWidth=1.5;cx.strokeRect(x,y,w,h);
      if(b.hl){cx.strokeStyle='#1d5aa6';cx.lineWidth=3;cx.strokeRect(x+b.hl[0]*w,y+b.hl[1]*h,b.hl[2]*w,b.hl[3]*h);}y+=h+6*PPT;continue;}
    const z=b.z*PPT,lh=z*1.9,mw=W-(b.ind||0)*PPT;cx.font=b.f.replace('%',z);
    const lines=[];let cur='';for(const w of b.s.split(' ')){const t=cur?cur+' '+w:w;if(cur&&cx.measureText(t).width>mw){lines.push(cur);cur=w;}else cur=t;}if(cur)lines.push(cur);
    y+=(b.b||0)*PPT;
    for(const ln of lines){if(y+lh>bottom)np();
      if(b.bg){cx.fillStyle=b.bg;cx.fillRect(PPM,y,W,lh);}
      cx.font=b.f.replace('%',z);cx.fillStyle=b.col;cx.textAlign=b.al==='center'?'center':'right';
      cx.fillText(ln,b.al==='center'?PPW/2:PPW-PPM-(b.ind||0)*PPT,y+z*1.35);y+=lh;}
    y+=(b.g||0)*PPT;}
  pages.forEach((c,i)=>{const g=c.getContext('2d');g.direction='rtl';g.font=`500 ${8*PPT}px "Cairo",sans-serif`;g.fillStyle='#888';g.textAlign='center';g.fillText(`${title.slice(0,70)} — صفحة ${i+1} من ${pages.length}`,PPW/2,PPH-PPM/2);});
  return pages;}
function mkPDF(jpgs){const E=new TextEncoder(),parts=[],offs=[];let len=0;const push=x=>{const b=typeof x==='string'?E.encode(x):x;parts.push(b);len+=b.length;};
  const obj=(id,f)=>{offs[id]=len;push(`${id} 0 obj\n`);f();push('\nendobj\n');};const pw=595.28,ph=841.89,n=jpgs.length,tot=2+3*n;
  push('%PDF-1.4\n');obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2,()=>push(`<< /Type /Pages /Kids [${jpgs.map((_,i)=>`${3+3*i} 0 R`).join(' ')}] /Count ${n} >>`));
  jpgs.forEach((j,i)=>{const p=3+3*i,cs=`q ${pw} 0 0 ${ph} 0 0 cm /Im${i} Do Q`;
    obj(p,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${p+2} 0 R >> >> /Contents ${p+1} 0 R >>`));
    obj(p+1,()=>push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`));
    obj(p+2,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${PPW} /Height ${PPH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.length} >>\nstream\n`);push(j);push('\nendstream');});});
  const xo=len;push(`xref\n0 ${tot+1}\n0000000000 65535 f \n`);for(let i=1;i<=tot;i++)push(String(offs[i]).padStart(10,'0')+' 00000 n \n');
  push(`trailer\n<< /Size ${tot+1} /Root 1 0 R >>\nstartxref\n${xo}\n%%EOF\n`);return new Blob(parts,{type:'application/pdf'});}
async function pdfPrint(title,r){const d=dlg(`${svg('print')} طباعة`,`<div class="set"><p class="hint" style="margin:0" id="pdfst">جارٍ تجهيز الصفحات للطباعة…</p><div class="prchoices" id="pdfgo"></div></div>`);
  try{const pages=await prRender(prModel(r),title);r.innerHTML='';
    const jpgs=await Promise.all(pages.map(c=>new Promise(res=>c.toBlob(b=>b.arrayBuffer().then(a=>res(new Uint8Array(a))),'image/jpeg',.88))));
    const name=(title.replace(/[\\/:*?"<>|]+/g,' ').slice(0,60).trim()||'مبادئ التمييز')+'.pdf',file=new File([mkPDF(jpgs)],name,{type:'application/pdf'});
    window.__pdf=file;if(!$('pdfst'))return;
    $('pdfst').textContent=`الملف جاهز (${pages.length} ${pages.length>2&&pages.length<11?'صفحات':'صفحة'}). اضغط «طباعة»، ثم اختر «طباعة» من القائمة التي تظهر.`;
    const can=navigator.canShare&&navigator.canShare({files:[file]});
    $('pdfgo').innerHTML=`<button class="btn primary" id="pdfshare"><b>${svg('print')} طباعة</b><small>${can?'من قائمة المشاركة: «طباعة» أو «حفظ في الملفات»':'يفتح الملف، ثم اطبعه من زر المشاركة'}</small></button>`;
    $('pdfshare').onclick=async()=>{if(can){try{await navigator.share({files:[file],title});closeDlg();}catch(e){if(e&&e.name!=='AbortError')toast('تعذّرت المشاركة');}}
      else{const u=URL.createObjectURL(file);window.open(u,'_blank')||(location.href=u);closeDlg();}};}
  catch(e){console.error(e);if($('pdfst'))$('pdfst').textContent='تعذّر تجهيز ملف الطباعة على هذا الجهاز.';r.innerHTML='';}}
const prPara=t=>`<p>${esc(t)}</p>`;
function prPrinciple(p,withPg){const C=COLS[p.col];
  return `<section class="prblock"><div class="prmeta">${esc(C.title)} — المبدأ ${p.n} — ص ${printed(p).join('–')}</div>${p.ttl?`<h2>${esc(p.ttl)}</h2>`:''}
   ${blocks(p).map(b=>b[0]==='t'?prPara(b[1]):`<p class="prcit">${esc(b[1].raw)}</p>`).join('')}${p.rule?`<p><b>القاعدة:</b> ${esc(p.rule)}</p>`:''}
   ${p.fn.length?`<div class="prfn">${p.fn.map(prPara).join('')}</div>`:''}${NOTE[p.id]?`<div class="prnote"><b>ملاحظتي:</b> ${esc(NOTE[p.id])}</div>`:''}
   ${withPg?`<div class="prpages">${pagesHTML(p)}</div>`:''}</section>`;}
function prArticle(a,withText,withPg){const L=a.law;
  return `<section class="prblock">${withText?`<h2>${esc(a.label)}</h2>${a.paras.length?a.paras.map(prPara).join(''):'<p>(لا يوجد نص لهذه المادة في الطبعة)</p>'}
   ${a.notes&&a.notes.length?`<div class="prfn"><b>حاشية الطبعة:</b>${a.notes.map(prPara).join('')}</div>`:''}`:''}
   ${withPg?`<div class="prpages">${lawPagesHTML(a)}</div>`:''}</section>`;}
// حوار خيارات الطباعة بحسب الصفحة المفتوحة
function printDlg(){const h=decodeURIComponent((location.hash||'').replace(/^#\/?/,''));let T='',O=[];
  if(h.startsWith('p/')){const p=BYID[h.slice(2)];if(!p)return window.print();T=`${COLS[p.col].title} — المبدأ ${p.n}`;
    O=[['المبدأ فقط','النص والإسناد والمصدر',()=>printHTML(T,prPrinciple(p,false))],
       ['المبدأ مع صورة صفحته','للمطابقة بالمصدر',()=>printHTML(T,prPrinciple(p,true))],
       ['صورة الصفحة فقط','كما في الكتاب',()=>printHTML(T,`<div class="prpages">${pagesHTML(p)}</div>`,`ص ${printed(p).join('–')}`)]];}
  else if(h.startsWith('r/')){const key=h.slice(2),ids=(RUL[key]||[]).filter(i=>BYID[i]),[ap,ses]=key.split('@');T=`الطعن ${ap.replace(/\+/g,' ، ')}`;
    const sub=`جلسة ${ses?ses.split('-').reverse().join('/'):''} — ${ids.length} مبدأ`;
    O=[['مبادئ الحكم','نصوصها وإسنادها',()=>printHTML(T,ids.map(i=>prPrinciple(BYID[i],false)).join(''),sub)],
       ['مع صور صفحاتها','للمطابقة بالمصدر',()=>printHTML(T,ids.map(i=>prPrinciple(BYID[i],true)).join(''),sub)]];}
  else if(h.startsWith('a/')){const a=ARTBYID[h.slice(2)];if(!a)return window.print();const L=a.law;T=`${a.label} — ${L.title}`;const sub=L.text_version;
    O=[['نص المادة','مع حاشية الطبعة',()=>printHTML(T,prArticle(a,true,false),sub)],
       ['المادة مع صورة صفحتها','للمطابقة بالطبعة',()=>printHTML(T,prArticle(a,true,true),sub)],
       ['صورة الصفحة فقط','كما في الطبعة',()=>printHTML(T,prArticle(a,false,true),sub)]];
    const ps=a.issue?[]:artPR(a);if(ps.length)O.push([`المادة ومبادئها (${ps.length})`,'نص المادة ثم المبادئ التي تذكرها',()=>printHTML(T,prArticle(a,true,false)+`<h2 class="prsec">مبادئ تذكر هذه المادة</h2>`+ps.map(p=>prPrinciple(p,false)).join(''),sub)]);}
  else if(h.startsWith('law/')){const L=LAWDATA[h.slice(4)];if(!L)return;T=L.title;
    const full=()=>{let last='',out='';L.articles.forEach(a=>{const tr=(a.trail||[]).join(' › ');if(tr&&tr!==last){out+=`<h2 class="prsec">${esc(tr)}</h2>`;last=tr;}
      out+=`<section class="prart"><h3>${esc(a.label)}</h3>${a.paras.length?a.paras.map(prPara).join(''):'<p>(لا نص في الطبعة)</p>'}${a.notes&&a.notes.length?`<div class="prfn">${a.notes.map(prPara).join('')}</div>`:''}</section>`;});
      return (L.preamble&&L.preamble.length?`<div class="prpre">${[].concat(L.preamble).map(prPara).join('')}</div>`:'')+out;};
    O=[['نص القانون كاملًا',`${L.articles.length} مادة، مع حواشي الطبعة`,()=>printHTML(T,full(),L.text_version)]];}
  else if(h.startsWith('m/')){const lid=h.slice(2).split('/')[0],M=MEMO[lid+'-M'];if(!M)return;T=M.title;
    const np=new Set(M.paras.map(x=>x.pg)).size;O=[['المذكرة كاملة',`نصها كما في الطبعة — ${np} صفحة في الأصل${np>60?'، فالطباعة طويلة':''}`,()=>printHTML(T,M.paras.map(p=>p.h?`<h2 class="prsec">${esc(p.t)}</h2>`:prPara(p.t)).join(''),M.note)]];}
  else return window.print();
  const cur=h.startsWith('p/')?BYID[h.slice(2)]:h.startsWith('a/')?ARTBYID[h.slice(2)]:null;
  if(cur)prPreload(h.startsWith('p/')?pagesHTML(cur):lawPagesHTML(cur));
  if(h.startsWith('r/'))prPreload((RUL[h.slice(2)]||[]).filter(i=>BYID[i]).map(i=>pagesHTML(BYID[i])).join(''));
  if(O.length===1&&!h.startsWith('m/'))return O[0][2]();
  const d=dlg(`${svg('print')} طباعة`,`<div class="set"><p class="hint" style="margin:0">${esc(T)}</p><div class="prchoices">${O.map((o,i)=>`<button class="btn" data-pr="${i}"><b>${esc(o[0])}</b><small>${esc(o[1])}</small></button>`).join('')}</div></div>`);
  d.addEventListener('click',e=>{const b=e.target.closest('[data-pr]');if(!b)return;closeDlg();O[+b.dataset.pr][2]();});}
// ---------- الاستماع: أفضل صوت عربي في الجهاز، وقراءة جملة جملة مع شريط تحكم، وتهيئة النص القانوني للنطق
const AR_MON=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
function ttsNorm(s){return String(s).replace(/ـ/g,'').replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/[۰-۹]/g,d=>d.charCodeAt(0)-1776).replace(/(^|[\s(،«])م\s*\.?\s*(\d)/g,'$1المادة $2').replace(/(^|[\s(،«])ق\s*\.?\s*(\d)/g,'$1القانون $2').replace(/(^|[\s(،«])ص\s*\.?\s*(\d)/g,'$1صفحة $2')
  .replace(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*((?:19|20)\d{2})/g,(m,d,mo,y)=>+mo>=1&&+mo<=12?`${+d} ${AR_MON[+mo-1]} ${y}`:m)
  .replace(/(رقم\s*)?(\d+)\s*\/\s*((?:19|20)\d{2})/g,(m,r,n,y)=>`رقم ${n} لسنة ${y}`)
  .replace(/(^|\s)ج\s*\.?\s*ع(\s|$)/g,'$1الجمعية العامة$2')
  .replace(/[()\[\]«»"]/g,'، ').replace(/\s[-–—]\s|^\s*[-–—]\s*/gm,'، ').replace(/…|\.{3}/g,'. ').replace(/،(\s*،)+/g,'،').replace(/\s+/g,' ').trim();}
function ttsChunks(text){const out=[];String(text).split(/\n+|(?<=[.!؟:؛])\s+/).map(x=>x.replace(/^[\s،,.؛:]+/,'').trim()).filter(Boolean).forEach(s=>{
  while(s.length>230){let k=s.lastIndexOf('،',230);if(k<80)k=s.lastIndexOf(' ',230);if(k<40)k=230;out.push(s.slice(0,k+1).trim());s=s.slice(k+1).trim();}if(s)out.push(s);});
  const m=[];out.forEach(s=>{if(m.length&&m[m.length-1].length+s.length<120)m[m.length-1]+=' '+s;else m.push(s);});return m;}
const ttsArVoices=()=>('speechSynthesis' in window?speechSynthesis.getVoices():[]).filter(v=>/^ar/i.test(v.lang));
function ttsScore(v){let s=v.localService?20:0;if(/premium|enhanced|natural|neural|محس/i.test(v.name))s+=8;if(/Majed|Maged|Tarik|Hamed|Naayf|Salma|Zariyah|Hoda|Laila|Mariam|Amira|Shakir|Fahed|Fatima/i.test(v.name))s+=2;if(/ar[-_](KW|SA|AE)/i.test(v.lang))s+=1;return s;}
function ttsVoice(){const L=ttsArVoices();return L.find(v=>v.voiceURI===S.voice)||L.sort((a,b)=>ttsScore(b)-ttsScore(a))[0]||null;}
if('speechSynthesis' in window)speechSynthesis.addEventListener?.('voiceschanged',()=>{if($('vsel'))ttsVoiceUI();});
const TTS={q:[],i:0,id:null,el:null,paused:false,title:''};
function ttsStop(){if('speechSynthesis' in window)speechSynthesis.cancel();TTS.q=[];TTS.id=null;TTS.paused=false;TTS.el?.classList.remove('speaking');TTS.el=null;$('ttsbar')?.remove();speakingId=null;}
function ttsNext(){const ss=speechSynthesis;if(TTS.i>=TTS.q.length){ttsStop();return;}
  const u=new SpeechSynthesisUtterance(TTS.q[TTS.i]),v=ttsVoice();u.lang=v?v.lang:'ar-SA';if(v)u.voice=v;u.rate=S.rate||1;u.pitch=1;
  const my=TTS.id;u.onend=()=>{if(TTS.id!==my||TTS.paused)return;TTS.i++;ttsNext();};u.onerror=e=>{if(TTS.id!==my)return;if(e.error==='interrupted'||e.error==='canceled')return;TTS.i++;ttsNext();};
  ss.speak(u);ttsBar();}
function ttsBar(){let b=$('ttsbar');if(!TTS.id)return;if(!b){b=document.createElement('div');b.id='ttsbar';b.className='ttsbar no-print';b.setAttribute('role','region');b.setAttribute('aria-label','الاستماع');document.body.appendChild(b);
    b.onclick=e=>{const k=e.target.closest('[data-tt]')?.dataset.tt;if(!k)return;const ss=speechSynthesis;
      if(k==='stop')ttsStop();
      if(k==='pause'){if(TTS.paused){TTS.paused=false;ss.cancel();ttsNext();}else{TTS.paused=true;ss.cancel();ttsBar();}}
      if(k==='back'){TTS.i=Math.max(0,TTS.i-1);TTS.paused=false;ss.cancel();setTimeout(ttsNext,60);}
      if(k==='fwd'){TTS.i=Math.min(TTS.q.length-1,TTS.i+1);TTS.paused=false;ss.cancel();setTimeout(ttsNext,60);}
      if(k==='rate'){const R=[.8,.9,1,1.15,1.3],c=R.indexOf(S.rate||1);S.rate=R[(c+1)%R.length];saveS();TTS.paused=false;ss.cancel();setTimeout(ttsNext,60);}};}
  b.innerHTML=`<div class="tti"><b>${esc(TTS.title)}</b><span>${TTS.i+1} / ${TTS.q.length}</span></div>
   <div class="ttc"><button class="btn icon" data-tt="back" aria-label="الجملة السابقة">${svg('back')}</button><button class="btn icon primary" data-tt="pause" aria-label="${TTS.paused?'متابعة':'إيقاف مؤقت'}">${TTS.paused?'▶':'❚❚'}</button><button class="btn icon" data-tt="fwd" aria-label="الجملة التالية"><svg class="i" viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="${IC.back}"/></svg></button>
   <button class="btn" data-tt="rate" aria-label="السرعة"><span dir="ltr">${S.rate||1}×</span></button><button class="btn icon" data-tt="stop" aria-label="إيقاف">■</button></div>`;}
function ttsSpeak(id,title,text,el){if(!('speechSynthesis' in window)){toast('الاستماع غير متاح في هذا المتصفح');return;}
  if(TTS.id===id){ttsStop();return;}ttsStop();if(!ttsArVoices().length)toast('لا يوجد صوت عربي في هذا الجهاز — انظر «الاستماع» في الإعدادات');
  TTS.q=ttsChunks(ttsNorm(text));TTS.i=0;TTS.id=id;TTS.title=title;TTS.el=el;speakingId=id;el?.classList.add('speaking');ttsNext();}
let speakingId=null;
function speak(p){const txt=[p.ttl,...blocks(p).map(b=>b[0]==='t'?b[1]:b[1].raw)].filter(Boolean).join('\n');
  ttsSpeak(p.id,`${COLS[p.col].name} · ${p.n}`,txt,document.querySelector(`article.pr[data-id="${p.id}"]`));}
function speakArt(a){ttsSpeak(a.id,`${a.label} — ${a.law.short}`,[a.label+'.',...a.paras].join('\n'),document.querySelector('.artcard'));}
function ttsVoiceUI(){const s=$('vsel');if(!s)return;const L=ttsArVoices().sort((a,b)=>ttsScore(b)-ttsScore(a)),cur=ttsVoice();
  s.innerHTML=L.length?L.map(v=>`<option value="${esc(v.voiceURI)}"${cur&&cur.voiceURI===v.voiceURI?' selected':''}>${esc(v.name)} (${esc(v.lang)})${v.localService?'':' ☁'}</option>`).join(''):'<option value="">لا يوجد صوت عربي في هذا الجهاز</option>';
  $('vnone').hidden=!!L.length;}
// ---------- source pages
const PT={};
async function pageLines(col,g){const b=Math.floor((g-1)/1000),k=col+'/'+b;if(!PT[k])PT[k]=fetch(`pagetext/${col}/t${String(b).padStart(3,'0')}.json`).then(r=>r.ok?r.json():{}).catch(()=>({}));return (await PT[k])[g]||[];}
function pageFig(p,g){const C=COLS[p.col],PW=C.pw||595.276,PH=C.ph||822.047,cr=C.crop||[0,0,1,1],cell=C.cell||[684,1000],cw=cr[2]-cr[0],chh=cr[3]-cr[1];
  const reg=p.rg.find(r=>r.page===g);
  const box=reg?`<div class="hlbox" style="left:${((reg.bbox[0]-6)/PW-cr[0])/cw*100}%;top:${((reg.bbox[1]-4)/PH-cr[1])/chh*100}%;width:${(reg.bbox[2]-reg.bbox[0]+12)/PW/cw*100}%;height:${(reg.bbox[3]-reg.bbox[1]+8)/PH/chh*100}%"></div>`:'';
  const gp=C.gp||20,gc=gp/10,b=Math.floor((g-1)/gp),k=(g-1)%gp,cx=k%gc,ry=Math.floor(k/gc);
  return `<figure class="pg" data-g="${g}"><div class="pgimg" role="img" data-src="pages/${p.col}/g${String(b).padStart(3,'0')}.webp" data-gc="${gc}" data-cx="${cx}" data-ry="${ry}" aria-label="صورة الصفحة ${pageNo(p.col,g)}" style="aspect-ratio:${cell[0]}/${cell[1]};background-image:url(pages/${p.col}/g${String(b).padStart(3,'0')}.webp);background-size:${gc*100}% 1000%;background-position:${cx*100/(gc-1)}% ${ry*100/9}%">${box}</div><figcaption>${pageCap(p.col,g)}</figcaption></figure><details class="pgtxt" data-id="${p.id}" data-g="${g}"><summary>نص الصفحة المستخرج</summary><div class="ptx">…</div></details>`;}
// صفحات المبدأ متصلة من أولها إلى آخرها، وزرّان لعرض الصفحة السابقة والتالية (داخل حدود المجموعة أو الملف)
function pagesHTML(p){if(COLS[p.col].noimg){const ns=printed(p);return `<p class="muted pgnote">${ns.length?`الصفحة ${ns.join('–')} من الكتاب. `:''}المصدر ملف Word نُقل نصه كما هو، فلا صورة صفحة لهذه المجموعة.</p>`;}
  if(!p.pg.length)return '';const g0=p.pg[0],g1=p.pg[p.pg.length-1],C=COLS[p.col],d=pageDoc(p.col,g0),lo=d?d.first:1,hi=d?d.last:(C.last||1e9);
  const gs=[];for(let g=g0;g<=g1;g++)gs.push(g);
  return `<div class="pgnav no-print" data-pgnav="prev" data-id="${p.id}" data-g="${g0}"${g0<=lo?' hidden':''}><button class="btn sm">${svg('back')}الصفحة السابقة</button></div><div class="pgs">${gs.map(g=>pageFig(p,g)).join('')}</div><div class="pgnav no-print" data-pgnav="next" data-id="${p.id}" data-g="${g1}"${g1>=hi?' hidden':''}><button class="btn sm">الصفحة التالية<svg class="i" viewBox="0 0 24 24" style="transform:scaleX(-1)"><path d="${IC.back}"/></svg></button></div>`;}
function wirePages(root){root.querySelectorAll('details.pgtxt').forEach(d=>d.addEventListener('toggle',async()=>{if(!d.open||d.dataset.ok)return;d.dataset.ok=1;
  const p=BYID[d.dataset.id],g=+d.dataset.g,reg=p.rg.find(r=>r.page===g),ls=await pageLines(p.col,g);
  d.querySelector('.ptx').innerHTML=ls.map(([t,top,size,bb])=>`<div class="ln${reg&&top>=reg.bbox[1]-1&&top<=reg.bbox[3]?' hit':''}${bb||size>=18?' h':''}${size<=12?' small':''}">${esc(t)}</div>`).join('')||'—';}));}
function openSrc(p){const b=side(`${COLS[p.col].name} · ${p.n} · ص ${printed(p).join('–')}`,pagesHTML(p));wirePages(b);const hb=b.querySelector('.hlbox');if(hb)setTimeout(()=>{b.scrollTop=Math.max(0,hb.offsetTop+hb.parentElement.offsetTop-b.clientHeight/3)},40);}
// ---------- ترتيب بطاقات الرئيسية بحسب اهتمام المستخدم (يُحفظ في هذا الجهاز)
function ordered(kind,list){const o=((S.ord||{})[kind]||[]).filter(k=>list.includes(k));return [...o,...list.filter(k=>!o.includes(k))];}
function arrangeDlg(kind){const base=kind==='fams'?FAMS:ORDER,name=k=>kind==='fams'?k:COLS[k].name;
  const draw=()=>{const L=ordered(kind,base);const d=dlg(`${svg('filter')} ترتيب ${kind==='fams'?'الموضوعات':'الكتب'}`,`<div class="set"><p class="hint" style="margin:0">ضع ما تعمل فيه أولًا. يُحفظ الترتيب في هذا الجهاز.</p>
    <ol class="arr">${L.map((k,i)=>`<li><span class="an">${i+1}</span><b>${esc(name(k))}</b><span class="ab"><button class="btn icon" data-mv="top" data-k="${esc(k)}" aria-label="إلى الأول"${i?'':' disabled'}>⤒</button><button class="btn icon" data-mv="up" data-k="${esc(k)}" aria-label="أعلى"${i?'':' disabled'}>▲</button><button class="btn icon" data-mv="down" data-k="${esc(k)}" aria-label="أسفل"${i<L.length-1?'':' disabled'}>▼</button></span></li>`).join('')}</ol>
    <div class="rowi"><button class="btn primary" data-close>تم</button><button class="btn" id="ardef">الترتيب الأصلي</button></div></div>`);
    d.addEventListener('click',e=>{const b=e.target.closest('[data-mv]');if(!b)return;const L2=ordered(kind,base),i=L2.indexOf(b.dataset.k);L2.splice(i,1);
      L2.splice(b.dataset.mv==='top'?0:b.dataset.mv==='up'?i-1:i+1,0,b.dataset.k);S.ord=Object.assign({},S.ord,{[kind]:L2});saveS();viewHome();renderBrowse();draw();
      const nb=document.querySelector(`.arr [data-mv="${b.dataset.mv}"][data-k="${CSS.escape(b.dataset.k)}"]`);if(nb&&!nb.disabled)nb.focus();});
    $('ardef').onclick=()=>{const o=Object.assign({},S.ord);delete o[kind];S.ord=o;saveS();viewHome();renderBrowse();draw();};};
  draw();}
// صفحة «عن المكتبة» تعرض رقم الإصدار في آخرها
function aboutVer(){const e=$('v-about');if(e&&!e.querySelector('.verline'))e.insertAdjacentHTML('beforeend',`<p class="verline">الإصدار ${buildLabel()}</p>`);}
// ---------- رقم الإصدار (يطابق VERSION في sw.js — يحدّثهما tools/bump-version.sh معًا)
const APP_BUILD='202610021142';
const buildLabel=()=>{const b=APP_BUILD;return `${b.slice(0,4)}.${b.slice(4,6)}.${b.slice(6,8)} — ${b.slice(8,10)}:${b.slice(10,12)}`;};
// ---------- الجولة التعريفية لأول تشغيل: شرائح قصيرة، «تخطٍّ»، وتثبيت التطبيق على الشاشة الرئيسية
const IS_STANDALONE_APP=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
function introInstall(){const ios=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(IS_STANDALONE_APP())return `<p class="ok">✓ التطبيق مثبّت على هذا الجهاز.</p>`;
  if(ios)return `<ol class="steps"><li>اضغط زر المشاركة <span class="kbd">${svg('share')}</span> في Safari${/iPad/.test(navigator.userAgent)||navigator.maxTouchPoints>1&&!/iPhone/.test(navigator.userAgent)?' (أعلى الشاشة)':' (أسفل الشاشة)'}.</li><li>اختر «إضافة إلى الشاشة الرئيسية».</li><li>اضغط «إضافة». يفتح بعدها كتطبيق، ويعمل دون اتصال، وتبقى محفوظاتك في أمان.</li></ol>`;
  return `${deferredInstall?`<p><button class="btn primary" id="itinst">${svg('download')}تثبيت الآن</button></p>`:''}<ol class="steps"><li><b>أندرويد:</b> قائمة Chrome ⋮ ← «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</li><li><b>الحاسوب:</b> أيقونة التثبيت في شريط العنوان في Chrome أو Edge.</li></ol>`;}
// لكل شريحة: أيقونة، عنوان، نص، ومشهد مصغّر من التطبيق نفسه (بيانات حقيقية، دون أي نص مخترع)
function introVis(k){
  if(k==='search')return `<div class="ivis"><div class="isb">${svg('search')}<span>مكافأة نهاية الخدمة</span><em>${svg('filter')}تصفية</em></div>
    <div class="ichips">${['قانون العمل','المادة 51','عمالي'].map(x=>`<span>${x}</span>`).join('')}</div></div>`;
  if(k==='item'){const p=BYID['V09L-0184']||PR[0];if(!p)return '';const t=p.p[0].split(' ').slice(0,18).join(' ');
    return `<div class="ivis icard"><b>${esc(COLS[p.col].name)} · ${p.n}</b><p>${esc(t)}…</p><small>${esc((p.c[0]||{}).raw||'')}</small>
     <div class="iacts">${[['copy','نسخ'],['print','طباعة'],['speak','استماع'],['page','ص '+printed(p)[0]]].map(([i,l])=>`<span>${svg(i)}${l}</span>`).join('')}</div></div>`;}
  if(k==='laws'){const L=['LAW-67-1980','LAW-6-2010','LAW-68-1980'].map(i=>LAWBYID[i]).filter(Boolean);
    return `<div class="ivis ilist">${L.map(l=>`<div>${svg('scroll')}<b>${esc(l.short||l.title)}</b><small>${esc(l.type||'')} ${l.number||''}/${l.year||''}</small></div>`).join('')}</div>`;}
  if(k==='saved')return `<div class="ivis ichips big">${['قضية 12/2026','إنهاء الخدمة','الإثبات'].map(x=>`<span>${svg('star')}${x}</span>`).join('')}<div class="isync">${svg('lock')}مزامنة مشفّرة بين الحاسوب والآيفون والآيباد</div></div>`;
  return '';}
const INTRO=[
 ['home','','مكتبة مبادئ محكمة التمييز الكويتية والتشريعات الكويتية في مكان واحد: منقولة حرفيًا من مصادرها، مجانية، وتعمل دون اتصال.'],
 ['search','ابحث كما تفكّر','بكلمة أو عبارة أو رقم طعن أو رقم مادة. البحث يتجاهل التشكيل والهمزات، و«تصفية» تضيّق النتائج.'],
 ['item','المبدأ ومصدره','نص المبدأ مع إسناده وصورة صفحته في الكتاب. انسخه جاهزًا للإيراد، أو اطبعه، أو استمع إليه.'],
 ['laws','التشريعات مادةً مادة','القوانين والمراسيم واللوائح، مع صورة صفحة كل مادة ومذكرتها الإيضاحية والمبادئ التي تحيل إليها.'],
 ['saved','محفوظاتك معك','مجلدات لقضاياك وملاحظاتك، تنقلها إلى أجهزتك الأخرى بلا حساب ولا خادم.'],
 ['install','ثبّته على جهازك','يفتح بلمسة من الشاشة الرئيسية كأي تطبيق، ويعمل دون اتصال، ويحفظ محفوظاتك.']];
function introShow(force){if(!force&&(LS.get('intro',0)||window.self!==window.top))return;let i=0;const w=document.createElement('div');w.className='intro';w.id='intro';w.setAttribute('role','dialog');w.setAttribute('aria-label','جولة تعريفية');
  document.body.appendChild(w);document.body.classList.add('noscroll');
  w.innerHTML='<div class="iin"></div>';weave(w,10);const inn=w.querySelector('.iin');
  const end=()=>{LS.set('intro',Date.now());w.remove();document.body.classList.remove('noscroll');};
  const draw=()=>{const [k,t,x]=INTRO[i],last=i===INTRO.length-1;
    inn.innerHTML=`<div class="itop"><span class="ist">${i+1} / ${INTRO.length}</span>${last?'':'<button class="ibtn ghost" id="itskip">تخطٍّ</button>'}</div>
     <div class="islide" data-k="${k}">${k==='home'?`<img class="ilogo" src="icons/icon.svg" alt=""><h1 class="iword">مبادئ التمييز</h1><div class="iline"></div><p class="ilead">${esc(x)}</p>
       <div class="istats"><span><b>${nf(PR.length)}</b>مبدأ</span><span><b>${nf(LAWIX.length||0)}</b>تشريع</span><span><b>${ORDER.length}</b>مجموعة</span></div>`
      :`<div class="iic">${svg(k==='install'?'download':k==='item'?'page':k==='laws'?'scroll':k==='saved'?'star':'search')}</div><h2>${esc(t)}</h2><p>${esc(x)}</p>${k==='install'?introInstall():introVis(k)}`}</div>
     <div class="ibot"><div class="dots" aria-hidden="true">${INTRO.map((_,j)=>`<i${j===i?' class="on"':''}></i>`).join('')}</div>
      <div class="inav${i?'':' one'}">${i?'<button class="ibtn ghost" id="itprev">السابق</button>':''}<button class="ibtn gold" id="itnext">${last?'ابدأ الاستعمال':i?'التالي':'ابدأ الجولة'}</button></div></div>`;
    if($('itskip'))$('itskip').onclick=end;if($('itprev'))$('itprev').onclick=()=>{i--;draw();};$('itnext').onclick=()=>{if(last)end();else{i++;draw();}};
    if($('itinst'))$('itinst').onclick=()=>installDlg();};
  let x0=null;w.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
  w.addEventListener('touchend',e=>{if(x0==null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)<50)return;
    if(dx>0&&i<INTRO.length-1){i++;draw();}else if(dx<0&&i>0){i--;draw();}},{passive:true});   // في العربية السحب يمينًا = التالي
  const kd=e=>{if(!document.body.contains(w)){document.removeEventListener('keydown',kd);return;}if(e.key==='Escape')end();if(e.key==='ArrowLeft'&&i<INTRO.length-1){i++;draw();}if(e.key==='ArrowRight'&&i>0){i--;draw();}};document.addEventListener('keydown',kd);
  draw();}
// ---------- HOME
function dailyPick(){const pool=PR.filter(p=>!p.rv.length&&p.c.length);const d=new Date();const k=d.getFullYear()*372+d.getMonth()*31+d.getDate();return pool[(k*2654435761>>>0)%pool.length];}
function mini(p){return `<button class="mini card" data-go="#/p/${p.id}"><span class="s">${esc(COLS[p.col].name)} · ${p.n}</span><span class="t">${esc(p.ttl||p.p[0])}</span></button>`;}
// الرئيسية: تحية في سطر، ثم «بوابتا المكتبة» (المبادئ والتشريعات) يجمعهما خيط الذهب، ثم ما يعين القاضي على المتابعة
function todayLine(){try{return new Date().toLocaleDateString('ar-KW-u-nu-latn',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}catch(_){return '';}}
function famChip(f){return `<button class="fchip" data-go="#/index/fam/${encodeURIComponent(f)}"><span class="ic">${svg(FAMIC[famLetter[f]]||'scale')}</span><b>${esc(f)}</b><small>${nf(famcount[f]||0)}</small></button>`;}
function viewHome(){
  const el=$('v-home'),dp=dailyPick(),hr=new Date().getHours();
  const greet=(hr<12?'صباح الخير':'مساء الخير')+(S.name?'، '+esc(S.name):'');
  const recent=HIST.map(i=>BYID[i]).filter(Boolean).slice(0,10);
  const arts=LAWIX.reduce((s,x)=>s+(x.articles||0),0),lastG=LAWIX.filter(x=>x.src==='gazette'&&x.issued).sort((a,b)=>b.issued.localeCompare(a.issued))[0];
  const favN=Object.keys(FAV).filter(i=>BYID[i]).length;
  el.innerHTML=`<div class="hero h2"><div class="hline"><h1>${greet}</h1><span class="today">${esc(todayLine())}</span></div>
   <form class="sbox" id="hsf">${svg('search')}<input id="hq" type="search" placeholder="كلمة، عبارة، رقم طعن، أو «م 41 من 6/2010»" autocomplete="off" enterkeyhint="search">${micBtn('hq')}<button class="btn primary" type="submit">بحث</button></form></div>
   <div class="gates" role="group" aria-label="أقسام المكتبة">
    <button class="gate pr" data-go="#/search"><span class="gk">${svg('scale')}</span><span class="gnum">${nf(PR.length)}</span><span class="glab">مبدأ</span><b>المبادئ</b><small>${ORDER.length} مجموعة · ${nf(Object.keys(RUL).length)} حكمًا مفهرسًا</small><span class="garr">${svg('back')}</span></button>
    <button class="gate lw" data-go="#/laws"><span class="gk">${svg('scroll')}</span><span class="gnum">${nf(LAWIX.length)}</span><span class="glab">تشريعًا</span><b>التشريعات</b><small>${nf(arts)} مادة${lastG?` · آخر ما نُشر: ${esc(lastG.short)}`:''}</small><span class="garr">${svg('back')}</span></button>
   </div>
   <div>
   ${recent.length?`<div class="sech"><h2>تابع من حيث توقفت</h2><button class="lnk" data-hist>عرض السجل ‹</button></div><div class="hrow">${recent.map(mini).join('')}</div>`:''}
   <div class="sech"><h2>الموضوعات</h2><span class="sechb"><button class="lnk" data-arrmode="fams">${svg('filter')}ترتيب</button><button class="lnk" data-go="#/search">الكل ‹</button></span></div><div class="fstrip">${ordered('fams',FAMS).map(famChip).join('')}</div>
   <div class="sech"><h2>مبدأ اليوم</h2></div><div class="card daily"><div class="lbl">${svg('star')} ${esc(COLS[dp.col].title)} — ${dp.n}</div><div class="text">${esc(dp.p.join(' '))}</div><ul class="cits">${dp.c.map(c=>`<li>${esc(c.raw)}</li>`).join('')}</ul><button class="btn" data-go="#/p/${dp.id}">${svg('open')}فتح المبدأ</button></div>
   ${newLaws(3)}
   <div class="numline"><span><b>${nf(PR.length)}</b>مبدأ</span><span><b>${ORDER.length}</b>مجموعة</span><span><b>${nf(LAWIX.length)}</b>تشريعًا</span><span><b>${nf(arts)}</b>مادة</span><span><b>${nf(LORD.length)}</b>قانونًا مُحالًا إليه</span>${favN?`<span><b>${nf(favN)}</b>في محفوظاتك</span>`:''}</div>
   </div>`;
  weave(el.querySelector('.hero'),8);el.querySelectorAll('.gate').forEach(g=>weave(g,7));
  $('hsf').onsubmit=e=>{e.preventDefault();doSearch($('hq').value);};
}
// «صدر حديثًا»: آخر ما أضيف من الجريدة الرسمية ومن المساهمات، بالأحدث إصدارًا
function newLaws(n=5){const L=LAWIX.filter(x=>x.src==='gazette'||x.src==='amali').sort((a,b)=>(b.issued||String(b.year)).localeCompare(a.issued||String(a.year))).slice(0,n);if(!L.length)return '';
  return `<div class="sech"><h2>صدر حديثًا</h2><button class="lnk" data-go="#/laws">كل التشريعات ‹</button></div><div class="card newl">${L.map(x=>`<button class="nrow" data-go="#/law/${x.id}"><span class="ic">${svg('scroll')}</span><span class="t"><b>${esc(x.short)}</b><small>${esc(lawTitle(x))}${x.issued?' · '+esc(fdate(x.issued)):''}</small></span>${x.src==='amali'?'<span class="abadge">مساهمة</span>':'<span class="abadge new">جديد</span>'}</button>`).join('')}</div>`;}
const maxFam=()=>Math.max(...Object.values(famcount));
const grip=g=>g?`<span class="grip" aria-hidden="true">${svg('grip')}</span>`:'';
const famTop=f=>TORD.filter(t=>famOf(t)===f).slice(0,4).map(t=>TL[t][1].split(/[:،(]/)[0].trim()).join(' · ');
function famTile(f,g){return `<button class="tile" data-k="${esc(f)}" data-go="#/index/fam/${encodeURIComponent(f)}">${grip(g)}<span class="ic">${svg(FAMIC[famLetter[f]]||'scale')}</span><b>${esc(f)}</b><span class="sub">${esc(famTop(f))}…</span><span class="n">${nf(famcount[f]||0)} مبدأ · ${TORD.filter(t=>famOf(t)===f).length} موضوعًا</span><span class="meter"><i style="width:${(famcount[f]||0)/maxFam()*100}%"></i></span></button>`;}
function bookTile(c,g){return `<button class="tile book" data-k="${c}" data-go="#/index/book/${c}">${grip(g)}<span class="spine"></span><span><b>${esc(COLS[c].name)}</b><br><span class="n">${nf(COLS[c].n)} مبدأ</span></span></button>`;}
function doSearch(q){q=(q||'').trim();Object.assign(F,{q,col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:'',ap:'',ay:''});SCOPE='p';if($('lnum')){$('lnum').value='';$('lyr').value='';}if(q){QH=[q,...QH.filter(x=>x!==q)].slice(0,8);LS.set('qhist',QH);}go('#/search');}
// ---------- voice search
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function micBtn(target){return SR?`<button class="btn icon" type="button" data-mic="${target}" title="بحث بالصوت" aria-label="بحث بالصوت">${svg('mic')}</button>`:'';}
function listen(target,btn){const r=new SR();r.lang='ar-KW';r.interimResults=false;btn.classList.add('on');toast('تحدّث الآن…');
  r.onresult=e=>{const t=e.results[0][0].transcript;const i=$(target);i.value=t;if(target==='hq')doSearch(t);else{F.q=t;runSearch();}};
  r.onend=()=>btn.classList.remove('on');r.onerror=()=>{btn.classList.remove('on');toast('تعذّر التعرّف على الصوت');};r.start();}
// ---------- SEARCH
function buildSearch(){
  const el=$('v-search');
  el.innerHTML=`<div class="searchbar"><form class="sbox" id="ssf">${svg('search')}<input id="sq" type="search" placeholder="ابحث في نص المبدأ أو الإسناد: مكافأة نهاية الخدمة، 423/2003، «الفصل التعسفي»" autocomplete="off" enterkeyhint="search">${micBtn('sq')}<button class="btn" type="button" id="ftog">${svg('filter')}تصفية</button></form></div>
   <div class="scope" id="scope" role="tablist"><button data-scope="p" role="tab">المبادئ</button><button data-scope="l" role="tab">التشريعات</button></div>
   <div class="sfields" id="sfp"><label>رقم الطعن<input id="fap" inputmode="numeric" placeholder="مثل 730" autocomplete="off"></label><label>السنة<input id="fay" inputmode="numeric" placeholder="مثل 2012" autocomplete="off"></label></div>
   <div class="sfields" id="sfl" hidden><label>رقم التشريع<input id="lnum" inputmode="numeric" placeholder="مثل 6" autocomplete="off"></label><label>السنة<input id="lyr" inputmode="numeric" placeholder="مثل 2010" autocomplete="off"></label></div>
   <div class="quick" id="sqk"></div>
   <div id="lres" hidden></div>
   <div class="card filters" id="fbox" hidden>
    <label>المجموعة<select id="fcol"><option value="">الكل</option>${ORDER.map(k=>`<option value="${k}">${esc(COLS[k].name)} (${nf(COLS[k].n)})</option>`).join('')}</select></label>
    <label>الموضوع<input class="fsrch" type="search" data-for="ftp" placeholder="ابحث في الموضوعات…" autocomplete="off" enterkeyhint="done"><select id="ftp"><option value="">الكل</option>${FAMS.map(f=>`<optgroup label="${esc(f)}">${TORD.filter(t=>famOf(t)===f).map(t=>`<option value="${esc(t)}">${esc(TL[t][1])} (${tcount[t]})</option>`).join('')}</optgroup>`).join('')}</select></label>
    <label>الدائرة<input class="fsrch" type="search" data-for="fch" placeholder="ابحث في الدوائر…" autocomplete="off" enterkeyhint="done"><select id="fch"><option value="">الكل</option>${CHS.map(s=>`<option>${esc(s)}</option>`).join('')}</select></label>
    <label>القانون<input class="fsrch" type="search" data-for="flw" placeholder="ابحث باسم القانون أو رقمه…" autocomplete="off" enterkeyhint="done"><select id="flw"><option value="">الكل</option>${LORD.map(l=>`<option value="${esc(l)}">${esc(LL[l]||l)} (${lcount[l]})</option>`).join('')}</select></label>
    <label>المادة<input id="fart" inputmode="numeric" placeholder="مثل 51" autocomplete="off"></label>
    <label class="ck"><input id="frv" type="checkbox"> يحتاج مراجعة فقط</label>
   </div>
   <div class="bar2"><div class="active-f" id="actf"></div><span class="count" id="count"></span></div>
   <div class="hint">البحث يتجاهل التشكيل والهمزات والتاء المربوطة. ضع العبارة بين علامتي تنصيص للبحث عنها متصلة. اضغط «/» للبحث من أي مكان.</div>
   <div id="browse" hidden></div>
   <div class="list" id="list"></div><div class="more"><button class="btn" id="more" hidden>عرض المزيد</button></div>`;
  let t;$('sq').addEventListener('input',()=>{clearTimeout(t);t=setTimeout(()=>{if(SCOPE==='l'){lawScope();return;}F.q=$('sq').value;runSearch();quickChips();},150)});
  $('ssf').onsubmit=e=>{e.preventDefault();const q=$('sq').value.trim();if(q){QH=[q,...QH.filter(x=>x!==q)].slice(0,8);LS.set('qhist',QH);}$('sq').blur();};
  $('ftog').onclick=()=>{$('fbox').hidden=!$('fbox').hidden;$('sfp').hidden=$('fbox').hidden&&!F.ap&&!F.ay;};
  [['fcol','col'],['ftp','tp'],['fch','ch'],['flw','lw']].forEach(([i,k])=>$(i).onchange=()=>{F[k]=$(i).value;runSearch()});
  $('fart').oninput=()=>{clearTimeout(t);t=setTimeout(()=>{F.art=$('fart').value;runSearch()},200)};
  $('frv').onchange=()=>{F.rv=$('frv').checked;runSearch()};
  el.querySelectorAll('.fsrch').forEach(selFilter);
  $('more').onclick=()=>{shown+=30;renderList()};
  ['fap','fay'].forEach(i=>$(i).oninput=()=>{clearTimeout(t);t=setTimeout(()=>{F.ap=$('fap').value;F.ay=$('fay').value;runSearch()},200)});
  ['lnum','lyr'].forEach(i=>$(i).oninput=()=>{clearTimeout(t);t=setTimeout(lawScope,200)});
  $('scope').onclick=e=>{const b=e.target.closest('[data-scope]');if(!b)return;setScope(b.dataset.scope);};
  setScope(SCOPE);
}
const QSUG={p:['مكافأة نهاية الخدمة','الفصل التعسفي','التقادم','التعويض عن الضرر الأدبي','الإعلان','الحضانة','الاختصاص'],l:['قانون العمل','القانون المدني','قانون المرافعات','قانون الجزاء','الإثبات','الأحوال الشخصية','تنظيم القضاء']};
function quickChips(){const k=$('sqk');if(!k)return;if(($('sq').value||'').trim()){k.innerHTML='';return;}
  const rec=SCOPE==='p'?QH.slice(0,3).map(q=>`<button class="chip" data-q="${esc(q)}">${svg('clock')}${esc(q)}</button>`).join(''):'';
  k.innerHTML=rec+QSUG[SCOPE].map(q=>SCOPE==='l'?`<button class="chip" data-lq="${esc(q)}">${esc(q)}</button>`:`<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join('');}
function setScope(sc){SCOPE=sc;document.querySelectorAll('#scope [data-scope]').forEach(b=>b.setAttribute('aria-selected',b.dataset.scope===sc));
  const L=sc==='l';$('sfp').hidden=L||($('fbox').hidden&&!F.ap&&!F.ay);$('sfl').hidden=!L;$('lres').hidden=!L;['list','actf','count'].forEach(i=>{const e=$(i);if(e)e.closest('.bar2')?e.closest('.bar2').hidden=L:e.hidden=L;});
  $('list').hidden=L;$('ftog').hidden=L;if(L)$('fbox').hidden=true;document.querySelector('#v-search .more').hidden=L;$('browse').hidden=L;
  $('sq').placeholder=L?'ابحث في نصوص المواد: مكافأة، تقادم، «الفصل التعسفي»، أو «م 41 من 6/2010»':'ابحث في نص المبدأ أو الإسناد: مكافأة نهاية الخدمة، 423/2003، «الفصل التعسفي»';
  quickChips();if(L)lawScope();else runSearch();}
// نطاق التشريعات: رقم التشريع وسنته، والبحث في نصوص المواد كلها
async function lawScope(){const box=$('lres');if(!box||SCOPE!=='l')return;const q=($('sq').value||'').trim(),n=west($('lnum').value).trim(),y=west($('lyr').value).trim();
  quickChips();
  const laws=(n||y)?LAWIX.filter(x=>(!n||String(x.number)===n)&&(!y||String(x.year)===y)):[];
  let h=jumpHTML(q?smartJump(q):[]);
  if(laws.length)h+=`<div class="arthits card"><h3>${svg('scroll')} التشريعات (${laws.length})</h3>${laws.slice(0,30).map(x=>`<button class="arow" data-go="#/law/${x.id}"><b>${esc(x.short)}${x.status==='ملغى'?' <span class="abadge rep">ملغى</span>':''}</b><span>${esc(lawTitle(x))} · ${esc(x.ver||'')}</span></button>`).join('')}</div>`;
  const ts=terms(q);
  if(ts.length){box.innerHTML=h+'<div class="empty">جارٍ البحث في نصوص المواد…</div>';await loadAllLaws();if(SCOPE!=='l'||($('sq').value||'').trim()!==q)return;
    const re=hlRe(ts),o=[];LAWIX.forEach(x=>{const L=LAWDATA[x.id];if(!L)return;if(laws.length&&!laws.includes(x))return;L.articles.forEach(a=>{if(ts.every(t=>a.ns.includes(t)))o.push([L,a]);});});
    h+=o.length?`<div class="arthits card"><h3>${svg('search')} في نصوص المواد (${nf(o.length)})</h3>${o.slice(0,60).map(([L,a])=>`<button class="arow" data-go="#/a/${a.id}"><b>${esc(a.label)} · ${esc(L.short)}</b><span>${hl(a.paras.join(' ').slice(0,240),re)}${a.paras.join(' ').length>240?'…':''}</span></button>`).join('')}${o.length>60?`<p class="hint">تُعرض أول 60 نتيجة؛ ضيّق البحث برقم التشريع وسنته أو بكلمة أخرى.</p>`:''}</div>`:'<div class="empty">لا توجد مواد تطابق البحث.</div>';}
  else if(!laws.length&&!q){const top=[...LAWIX].sort((a,b)=>(lcount[b.key]||0)-(lcount[a.key]||0)).slice(0,9),nw=LAWIX.filter(x=>x.src==='gazette'||x.src==='amali').sort((a,b)=>(b.issued||String(b.year)).localeCompare(a.issued||String(a.year))).slice(0,3);
    h+=`<div class="hint">اكتب كلمة للبحث في نصوص المواد، أو رقم التشريع وسنته، أو انتقل مباشرة: «م 41 من 6/2010».</div>
     <div class="sech"><h2>الأكثر إحالةً في المبادئ</h2><button class="lnk" data-go="#/laws">كل التشريعات (${nf(LAWIX.length)}) ‹</button></div><div class="grid g3">${top.map(lawTile).join('')}</div>
     ${nw.length?`<div class="sech"><h2>صدر حديثًا</h2></div><div class="grid g3">${nw.map(lawTile).join('')}</div>`:''}`;}
  box.innerHTML=h;}
// صندوق بحث فوق القائمة المنسدلة: يُبقي الخيارات المطابقة فقط (يتجاهل التشكيل والهمزات)، ويحفظ الاختيار الحالي
const FSORIG={};
function selFilter(inp){const sel=$(inp.dataset.for);FSORIG[sel.id]=sel.innerHTML;
  inp.addEventListener('input',()=>{const q=norm(inp.value.trim()),cur=sel.value;sel.innerHTML=FSORIG[sel.id];if(!q)return;
    sel.querySelectorAll('option').forEach(o=>{if(o.value===''||o.value===cur)return;if(!norm(o.textContent).includes(q)&&!norm(o.value).includes(q))o.remove();});
    sel.querySelectorAll('optgroup').forEach(g=>{if(!g.querySelector('option'))g.remove();});sel.value=cur;
    const n=sel.querySelectorAll('option').length-1;inp.setAttribute('aria-label',`${n} نتيجة`);});}
function fsReset(){document.querySelectorAll('.fsrch').forEach(i=>{if(i.value){i.value='';const sel=$(i.dataset.for);sel.innerHTML=FSORIG[sel.id];}});}
function syncInputs(){fsReset();$('sq').value=F.q;$('fcol').value=F.col;$('ftp').value=F.tp;$('fch').value=F.ch;$('flw').value=F.lw;$('fart').value=F.art;$('frv').checked=F.rv;$('fap').value=F.ap;$('fay').value=F.ay;}
// صفحة «المبادئ» بلا بحث ولا مرشح = تصفح: الموضوعات والكتب (مع وضع الترتيب)؛ ومع البحث = النتائج
const idleF=()=>!F.q&&!F.col&&!F.tp&&!F.ch&&!F.lw&&!F.art&&!F.rv&&!F.sec&&!F.ap&&!F.ay;
let RAWN=0;
const mbW=n=>{const r=n%100;return n===1?'مبدأ':n===2?'مبدآن':r>=3&&r<=10?'مبادئ':r>=11?'مبدأً':'مبدأ';};
function runSearch(){shown=30;cur=filterPR();RAWN=cur.length;cur=collapse(cur);const idle=idleF()&&SCOPE==='p';
  $('browse').hidden=!idle;$('list').hidden=idle;document.querySelector('#v-search>.hint').hidden=idle;if(idle){renderBrowse();$('more').hidden=true;}else renderList();
  const L={col:v=>COLS[v]?.name,tp:v=>TL[v]?.[1],ch:v=>v,lw:v=>LL[v]||v,art:v=>'المادة '+v,rv:()=>'يحتاج مراجعة',sec:v=>v.split('›').slice(-1)[0],ap:v=>'طعن رقم '+v,ay:v=>'سنة الطعن '+v};
  $('actf').innerHTML=Object.keys(L).filter(k=>F[k]).map(k=>`<button class="chip" data-clr="${k}">${esc(L[k](F[k]))}</button>`).join('');
  const dn=RAWN-cur.length;
  $('count').innerHTML=idle?`${nf(PR.length)} مبدأ في ${ORDER.length} مجموعة`:`${nf(cur.length)} ${mbW(cur.length)}`+(dn>0?` <button class="lnk" data-dupall title="المبدأ نفسه منشور في أكثر من كتاب يُعرض مرة واحدة">دُمج ${nf(dn)} مكرر</button>`:DUPALL&&Object.keys(DG).length?` <button class="lnk" data-dupall>دمج المكرر</button>`:'');}
// ---------- التصفح ووضع الترتيب (سحب وإفلات من المقبض، والأسهم بديلًا)
let ARR=null;   // نوع البطاقات الجاري ترتيبها: fams | cols | null
function renderBrowse(){const b=$('browse');if(!b)return;
  const sec=(kind,title,base,tile)=>{const on=ARR===kind;return `<div class="sech"><h2>${title}</h2><button class="btn sm${on?' gold':''}" data-arrmode="${kind}" aria-pressed="${on}">${on?svg('check')+'تم':svg('filter')+'ترتيب'}</button></div>
    ${on?`<div class="arrhint"><p>${svg('grip')} اسحب البطاقة إلى مكانها. يُحفظ الترتيب في هذا الجهاز ويظهر في الرئيسية.</p><span><button class="lnk" data-arrange="${kind}">بالأسهم</button><button class="lnk" data-arrdef="${kind}">الترتيب الأصلي</button></span></div>`:''}
    <div class="grid g3 sortable${on?' arranging':''}" id="bz-${kind}" data-kind="${kind}">${ordered(kind,base).map(k=>tile(k,true)).join('')}</div>`;};
  const by=LS.get('browseby','fams');
  const seg=`<div class="seg bseg" role="group"><button data-bby="fams" aria-pressed="${by==='fams'}">حسب الموضوع</button><button data-bby="ch" aria-pressed="${by==='ch'}">حسب الدائرة</button></div>`;
  const chs=`<div class="sech"><h2>تصفح حسب الدائرة</h2></div><p class="hint">الدائرة كما وردت في إسناد المبدأ نفسه (الطعن ورقمه وسنته). المبدأ الواحد قد يرد في أكثر من دائرة.</p><div class="grid g3">${CHS.map(c=>[c,chcount[c]||0]).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`<button class="tile" data-f="ch" data-v="${esc(c)}"><span class="ic">${svg(CHIC[c]||'scale')}</span><b>${esc(c)}</b><span class="n">${nf(n)} مبدأ</span><span class="meter"><i style="width:${n/Math.max(...Object.values(chcount))*100}%"></i></span></button>`).join('')}</div>`;
  b.innerHTML=seg+(by==='ch'?chs:sec('fams','تصفح حسب الموضوع',FAMS,famTile))+sec('cols','الكتب والمجموعات',ORDER,bookTile);
  b.querySelectorAll('.sortable').forEach(sortable);}
function arrMode(kind){ARR=ARR===kind?null:kind;if(ARR&&location.hash!=='#/search'){Object.assign(F,{q:'',col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:'',ap:'',ay:''});SCOPE='p';go('#/search');}
  renderBrowse();if(ARR){setTimeout(()=>{const g=$('bz-'+ARR),sb=document.querySelector('#v-search .searchbar');if(!g)return;const h=g.previousElementSibling.previousElementSibling||g;window.scrollTo({top:Math.max(0,h.getBoundingClientRect().top+scrollY-(sb?sb.offsetHeight:0)-8),behavior:'smooth'});},80);}}
function sortable(grid){const kind=grid.dataset.kind;let drag=null;
  grid.addEventListener('pointerdown',e=>{if(!grid.classList.contains('arranging'))return;const tile=e.target.closest('.tile');if(!tile||e.button)return;
    e.preventDefault();const r=tile.getBoundingClientRect();drag={tile,ox:e.clientX-r.left,oy:e.clientY-r.top,id:e.pointerId,moved:false};
    tile.setPointerCapture(e.pointerId);tile.classList.add('lift');grid.classList.add('dragging');if(navigator.vibrate)try{navigator.vibrate(6)}catch(_){}});
  const place=(x,y)=>{const t=drag.tile;t.style.transform='';const r=t.getBoundingClientRect();t.style.transform=`translate(${x-drag.ox-r.left}px,${y-drag.oy-r.top}px) rotate(-1.2deg) scale(1.04)`;};
  grid.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;drag.moved=true;
    const kids=[...grid.children],G=grid.getBoundingClientRect();   // موضع البطاقة من التخطيط لا من التحويل الجاري، حتى لا تتأرجح المبادلة
    const over=kids.find(k=>k!==drag.tile&&e.clientX>=G.left+k.offsetLeft&&e.clientX<=G.left+k.offsetLeft+k.offsetWidth&&e.clientY>=G.top+k.offsetTop&&e.clientY<=G.top+k.offsetTop+k.offsetHeight);
    if(over){const rects=new Map(kids.map(k=>[k,k.getBoundingClientRect()]));
      if(kids.indexOf(over)<kids.indexOf(drag.tile))grid.insertBefore(drag.tile,over);else grid.insertBefore(drag.tile,over.nextSibling);
      [...grid.children].forEach(k=>{if(k===drag.tile)return;const a=rects.get(k),b=k.getBoundingClientRect(),dx=a.left-b.left,dy=a.top-b.top;if(!dx&&!dy)return;
        k.style.transition='none';k.style.transform=`translate(${dx}px,${dy}px)`;requestAnimationFrame(()=>{k.style.transition='transform .22s cubic-bezier(.3,.7,.2,1)';k.style.transform='';});});}
    place(e.clientX,e.clientY);
    if(e.clientY<90)scrollBy(0,-10);else if(e.clientY>innerHeight-130)scrollBy(0,10);});
  const end=e=>{if(!drag||e.pointerId!==drag.id)return;const t=drag.tile;t.style.transform='';t.classList.remove('lift');grid.classList.remove('dragging');
    const order=[...grid.children].map(k=>k.dataset.k);if(drag.moved){S.ord=Object.assign({},S.ord,{[kind]:order});saveS();}drag=null;};
  grid.addEventListener('pointerup',end);grid.addEventListener('pointercancel',end);}
function renderList(){const re=hlRe(terms(F.q));const ah=artHits();$('list').innerHTML=(F.q?jumpHTML(smartJump(F.q)):'')+(ah.length?`<details class="arthits card fold"><summary>${svg('scroll')} في نصوص التشريعات: ${nf(ah.length)} ${ah.length===1?'مادة':ah.length<11?'مواد':'مادة'} <small>${esc(ah.slice(0,2).map(([L,a])=>a.label+' · '+L.short).join(' — '))}${ah.length>2?' …':''}</small></summary>${ah.slice(0,8).map(([L,a])=>`<button class="arow" data-go="#/a/${a.id}"><b>${esc(a.label)} · ${esc(L.short)}</b><span>${hl(a.paras.join(' ').slice(0,220),re)}${a.paras.join(' ').length>220?'…':''}</span></button>`).join('')}${ah.length>8?`<button class="btn sm" data-scope-l="1">كل المواد في نطاق «التشريعات» (${nf(ah.length)})</button>`:''}</details>`:'')+(cur.length?cur.slice(0,shown).map(p=>card(p,re)).join(''):'<div class="empty">لا توجد نتائج. جرّب كلمة أقصر أو أزل أحد المرشحات.</div>');$('more').hidden=cur.length<=shown;prefetchRules(cur.slice(0,shown));}
function setFilter(k,v){Object.assign(F,{q:'',col:'',tp:'',ch:'',lw:'',art:'',rv:false,sec:'',ap:'',ay:''});SCOPE='p';F[k]=v;go('#/search');}
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
  if(idxTab==='topics'){b.innerHTML=`<p class="muted">التصنيف الموحّد يجمع مبادئ كل المجموعات تحت موضوع واحد مهما اختلف تبويب كتابها. التصنيف وصف مساعد لا يغيّر شيئًا من النص.</p><input class="flt" id="tflt" placeholder="ابحث عن موضوع…"><div id="tres"></div><div class="grid g3" id="fams">${ordered('fams',FAMS).map(f=>famTile(f)).join('')}</div>`;
    $('tflt').oninput=()=>{const q=norm($('tflt').value);$('fams').hidden=!!q;$('tres').innerHTML=q?`<div class="rows">${TORD.filter(t=>norm(TL[t][1]).includes(q)).slice(0,80).map(t=>topicRow(t)).join('')||'<div class="empty">لا يوجد موضوع بهذا الاسم.</div>'}</div>`:'';};}
  if(idxTab==='laws'){const mx=lcount[LORD[0]];b.innerHTML=`<p class="muted">القوانين التي تحيل إليها نصوص المبادئ، مرتبة بعدد المبادئ. افتح القانون لترى مواده.</p><input class="flt" id="lflt" placeholder="ابحث باسم القانون أو رقمه…"><div class="rows" id="lrows"></div>`;
    const draw=q=>$('lrows').innerHTML=LORD.filter(l=>!q||norm(LL[l]||l).includes(q)||l.includes(q)).map(l=>`<button class="row" data-go="#/index/law/${encodeURIComponent(l)}"><span>${esc(LL[l]||l)}</span><span class="n">${nf(lcount[l])}</span><span class="bar"><i style="width:${lcount[l]/mx*100}%"></i></span></button>`).join('');
    draw('');$('lflt').oninput=()=>draw(norm(west($('lflt').value)));}
  if(idxTab==='books'){b.innerHTML=`<p class="muted">تصفح كل كتاب بأبوابه وعناوينه كما وردت فيه.</p><div class="grid g3">${ordered('cols',ORDER).map(c=>bookTile(c)).join('')}</div>`;}
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
  if(p.rx!==undefined&&p.rule===undefined){el.innerHTML=LOADMSG;ensureRule(p).then(()=>{if(location.hash==='#/p/'+id)viewItem(id);});return;}
  HIST=[id,...HIST.filter(x=>x!==id)].slice(0,30);LS.set('hist',HIST);
  document.title=`${COLS[p.col].name} ${p.n} — مبادئ التمييز`;
  const [rs,ro]=relSplit(p);
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>${esc(COLS[p.col].title)} — ${p.n}</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
   <div class="list" data-main="1">${card(p,null,{page:1,open:1})}</div>
   <div class="card inline-src"><h3 style="margin-top:0">صفحة المصدر (${printed(p).join('–')})</h3>${pagesHTML(p)}</div>
   ${pnav(p)}
   ${rs.length?`<h2>المبدأ نفسه في مواضع أخرى (${rs.length})</h2><p class="muted">النص نفسه — كاملًا أو بعضه — منشور في مجموعة أو باب آخر.</p><div class="list">${rs.map(q=>card(q,null)).join('')}</div>`:''}
   ${ro.length?`<h2>مبادئ أخرى من الحكم نفسه (${ro.length})</h2><p class="muted">قررها الحكم ذاته (رقم الطعن والدائرة وتاريخ الجلسة واحدة) في مسائل أخرى، فوردت في أبواب أخرى.</p><div class="list">${ro.map(q=>card(q,null)).join('')}</div>`:''}`;
  wirePages(el);}
function viewRuling(key){const el=$('v-item'),all=RUL[key]||[],ids=collapse(all.map(i=>BYID[i])).map(p=>p.id),[ap,ses]=key.split('@');
  const chs=[...new Set(all.flatMap(i=>BYID[i].c.filter(c=>c.k===key).map(c=>c.ch)).filter(Boolean))],srcs=[...new Set(all.map(i=>COLS[BYID[i].col].name))];
  const cit=ids.length?BYID[ids[0]].c.find(c=>c.k===key):null;document.title=`الطعن ${ap} — مبادئ التمييز`;
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>بطاقة الحكم</h2><button class="btn" data-print>${svg('print')}طباعة</button></div>
   <div class="card rhead"><div class="kv"><span><b>الطعن</b>${esc(ap.replace(/\+/g,' ، '))}</span>${chs.length?`<span><b>الدائرة</b>${esc(chs.join('، '))}</span>`:''}<span><b>الجلسة</b>${esc(ses?ses.split('-').reverse().join('/'):'')}</span><span><b>المبادئ</b>${ids.length}${all.length>ids.length?` <small class="muted">(في ${all.length} موضعًا)</small>`:''}</span></div>
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
  if(savedTab==='hist'){const hs=HIST.filter(i=>BYID[i]);body=hs.length?`<p class="hint">السجل خاص بهذا الجهاز ولا يُزامَن. ما تحتاجه على أجهزتك الأخرى أضفه إلى المحفوظات.</p><div class="grid g2">${hs.map(i=>`<div class="hrow">${mini(BYID[i])}<button class="btn icon hfav" data-hfav="${i}" aria-pressed="${!!FAV[i]}" title="${FAV[i]?'محفوظ':'أضف إلى المحفوظات'}" aria-label="أضف إلى المحفوظات">${svg('star')}</button></div>`).join('')}</div><p><button class="btn" data-a2="clrhist">مسح السجل</button></p>`:'<div class="empty">لا يوجد سجل بعد.</div>';}
  el.innerHTML=`<div class="vh"><h2>المحفوظات</h2><div class="seg">${[['favs','المحفوظة'],['notes','ملاحظاتي'],['hist','السجل']].map(([k,l])=>`<button data-st="${k}" aria-pressed="${savedTab===k}">${l}</button>`).join('')}</div></div><p class="hint">كل ما هنا محفوظ في هذا الجهاز. لنقله إلى أجهزتك الأخرى فعّل «المزامنة بين أجهزتك» أو خذ نسخة احتياطية من «الإعدادات».</p>${body}`;}
function printSaved(){const favs=Object.entries(FAV).filter(([id,v])=>BYID[id]&&(!savedFold||v.f===savedFold)).map(x=>BYID[x[0]]);
  const w=window.open('','_blank');if(!w){toast('اسمح بالنوافذ المنبثقة للطباعة');return;}
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>مذكرة مبادئ</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;600&family=Reem+Kufi:wght@700&display=swap"><style>body{font-family:"Noto Naskh Arabic",serif;margin:32px;line-height:1.9;color:#111}h1{font-family:"Reem Kufi";color:#0b2545;margin:0}.s{color:#555;font-size:13px;border-bottom:2px solid #b8912f;padding-bottom:8px;margin-bottom:18px}.p{break-inside:avoid;margin-bottom:18px;padding-bottom:12px;border-bottom:1px solid #ccc}.h{font-size:12px;color:#0b2545;font-weight:600}.c{font-size:13px;color:#444}.n{background:#f7efd9;padding:6px 10px;font-size:13px}</style></head><body>
   <h1>مذكرة مبادئ${savedFold?' — '+esc(savedFold):''}</h1><div class="s">${favs.length} مبدأً · من «مبادئ التمييز» · ${new Date().toLocaleDateString('ar-KW')}</div>
   ${favs.map((p,i)=>`<div class="p"><div class="h">${i+1}. ${esc(COLS[p.col].title)} — ${p.n} — ص ${printed(p).join('–')}</div>${p.ttl?`<b>${esc(p.ttl)}</b>`:''}<div>${p.p.map(esc).join('<br>')}</div>${p.rule?`<div><b>القاعدة:</b> ${esc(p.rule)}</div>`:''}<div class="c">${p.c.map(c=>esc(c.raw)).join('<br>')}</div>${NOTE[p.id]?`<div class="n">ملاحظتي: ${esc(NOTE[p.id])}</div>`:''}</div>`).join('')}
   <script>setTimeout(()=>print(),600)<\/script></body></html>`);w.document.close();}
// ---------- MORE / REPORTS / ABOUT
function viewMore(){const inst=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
  const T=(attr,ic,b,n)=>`<button class="tile" ${attr}><span class="ic">${svg(ic)}</span><b>${b}</b><span class="n">${n}</span></button>`;
  $('v-more').innerHTML=`<h2>أدواتك</h2><div class="grid g3">
  ${T('data-go="#/index/topics"','book','الفهرس','الموضوعات والقوانين والكتب')}
  ${T('data-a2="sync"','link','المزامنة بين أجهزتك','انقل محفوظاتك وملاحظاتك بين الهاتف والحاسوب')}
  ${T('data-a2="offline"','download','العمل دون اتصال','نزّل صور صفحات المصادر كلها إلى الجهاز')}
  ${T('data-a2="settings"','gear','الإعدادات','الخط والحجم والمظهر، واسمك وصورتك، والقفل')}
  ${inst?'':T('data-a2="install"','open','ثبّت التطبيق','أضفه إلى الشاشة الرئيسية أو سطح المكتب')}
 </div><h2>عن المكتبة</h2><div class="grid g3">
  ${T('data-a2="guide"','page','الدليل المصوّر','شرح كل قسم بالصور، خطوة خطوة')}
  ${T('data-go="#/about"','info','عن المكتبة','المصادر وقواعد النزاهة والروابط')}
  ${T('data-go="#/report"','report','تقارير الاستخراج','طريقة العمل والفحوص وما يحتاج مراجعة')}
  ${T('data-go="#/review"','check',`المراجعة البشرية <span class="abadge">${nf(PR.filter(p=>p.rv.length).length-Object.keys(RVD).filter(i=>BYID[i]&&BYID[i].rv.length).length)}</span>`,'المبادئ المعلَّمة: قرّر فيها واحدًا واحدًا ثم صدّر قراراتك')}
  ${T('data-a2="rate"','star','ملاحظاتك واقتراحاتك','قيّم الأقسام وأرسل رأيك عبر واتساب أو البريد')}
 </div><h2>التطبيق الشقيق</h2><div class="grid g2">${amaliCard()}</div>`;}
// ---------- المراجعة البشرية: المبادئ المعلَّمة «يحتاج مراجعة»، قرار لكل مبدأ يُحفظ في الجهاز ويُصدَّر ملفًا يُدمج في الدفعة التالية
let RVD=LS.get('rvdec',{}),rvCol='',rvSt='open',rvN=20;
function viewReview(){const el=$('v-review');const all=PR.filter(p=>p.rv.length),cols=[...new Set(all.map(p=>p.col))];
  const L=all.filter(p=>(!rvCol||p.col===rvCol)&&(rvSt==='all'||(rvSt==='open'?!RVD[p.id]:!!RVD[p.id]))),done=all.filter(p=>RVD[p.id]).length;
  const DL={ok:['صحيح','okc'],fix:['يُصحَّح','flc'],del:['يُحذف','flc'],later:['لاحقًا','']};
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>المراجعة البشرية</h2><span class="muted">${nf(done)} من ${nf(all.length)}</span></div>
   <div class="bar-p" style="margin:6px 0 12px"><i style="width:${all.length?done/all.length*100:0}%"></i></div>
   <p class="muted">كل مبدأ هنا عُلّم آليًا لسبب يظهر فوقه. افتح «المصدر» لتقارن مع صورة الصفحة، ثم قرّر: صحيح كما هو، أو يُصحَّح (واكتب التصحيح حرفيًا من الصورة)، أو يُحذف (ليس مبدأً أو مكرر). القرارات تُحفظ في هذا الجهاز؛ صدّرها ملفًا وأرسله ليُدمج في الدفعة التالية.</p>
   <div class="quick"><button class="chip${rvCol?'':' on'}" data-rvc="">الكل (${nf(all.length)})</button>${cols.map(c=>`<button class="chip${rvCol===c?' on':''}" data-rvc="${c}">${esc(COLS[c].name)} (${all.filter(p=>p.col===c).length})</button>`).join('')}</div>
   <div class="seg" role="group" style="margin:8px 0">${[['open','لم يُقرَّر'],['done','قُرِّر'],['all','الكل']].map(([k,t])=>`<button data-rvs="${k}" aria-pressed="${rvSt===k}">${t}</button>`).join('')}</div>
   <div class="rowi" style="margin:6px 0 14px"><button class="btn primary" id="rvexp"${done?'':' disabled'}>${svg('download')}تصدير القرارات (${nf(done)})</button><button class="btn" id="rvcp"${done?'':' disabled'}>${svg('copy')}نسخ</button></div>
   <div class="list" id="rvlist">${L.slice(0,rvN).map(p=>{const d=RVD[p.id];return `<div class="rvitem" data-rv="${p.id}"><div class="rvwhy">${svg('report')} ${p.rv.map(esc).join(' · ')}</div>${card(p,null)}
     <div class="rvdec">${['ok','fix','del','later'].map(k=>`<button class="btn${d&&d.d===k?' on':''}" data-rvd="${k}">${DL[k][0]}</button>`).join('')}${d&&d.note?`<div class="note"><b>التصحيح</b>${esc(d.note)}</div>`:''}</div></div>`;}).join('')||'<div class="empty">لا شيء هنا.</div>'}</div>
   ${L.length>rvN?`<div class="more"><button class="btn" id="rvmore">عرض المزيد (${nf(L.length-rvN)})</button></div>`:''}`;
  el.onclick=e=>{const t=e.target;
    const c=t.closest('[data-rvc]');if(c){rvCol=c.dataset.rvc;rvN=20;viewReview();return;}
    const st=t.closest('[data-rvs]');if(st){rvSt=st.dataset.rvs;rvN=20;viewReview();return;}
    if(t.closest('#rvmore')){rvN+=20;viewReview();return;}
    if(t.closest('#rvexp')||t.closest('#rvcp')){const out={app:'mabadi',kind:'review-decisions',v:1,date:new Date().toISOString(),build:APP_BUILD,decisions:Object.entries(RVD).map(([id,d])=>({id,col:BYID[id]&&BYID[id].col,n:BYID[id]&&BYID[id].n,flags:BYID[id]&&BYID[id].rv,decision:d.d,note:d.note||'',at:d.t}))};
      const txt=JSON.stringify(out,null,1);if(t.closest('#rvcp')){clip(txt,()=>toast('نُسخت القرارات'));return;}
      const blob=new Blob([txt],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`mabadi-review-${new Date().toISOString().slice(0,10)}.json`;a.click();toast('صُدّر الملف');return;}
    const b=t.closest('[data-rvd]');if(b){const id=b.closest('[data-rv]').dataset.rv,k=b.dataset.rvd;
      if(k==='fix'){const d=dlg(`${svg('note')} التصحيح — ${esc(COLS[BYID[id].col].name)} · ${BYID[id].n}`,`<div class="set"><p class="hint" style="margin:0">اكتب ما يجب أن يكون عليه النص حرفيًا كما في صورة الصفحة، أو صف الخطأ (رقم طعن، تاريخ، كلمة…).</p><textarea id="rvnote" rows="5" style="width:100%;font:inherit;padding:10px;border:1px solid var(--rule);border-radius:12px;background:var(--bg);color:var(--ink)">${esc((RVD[id]||{}).note||'')}</textarea><div class="rowi"><button class="btn primary" id="rvok">حفظ</button><button class="btn" data-close>إلغاء</button></div></div>`);
        $('rvok').onclick=()=>{RVD[id]={d:'fix',note:$('rvnote').value.trim(),t:Date.now()};LS.set('rvdec',RVD);closeDlg();viewReview();};$('rvnote').focus();return;}
      if(RVD[id]&&RVD[id].d===k)delete RVD[id];else RVD[id]={d:k,t:Date.now()};LS.set('rvdec',RVD);viewReview();}};}
let repDone=false;
async function viewReport(){const el=$('v-report');if(repDone)return;repDone=true;el.innerHTML='<div class="empty">جارٍ التحميل…</div>';
  const R=await fetch('data/reports.json').then(r=>r.json()).catch(()=>[]);
  el.innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>تقارير الاستخراج</h2></div><p class="muted">لكل مجموعة تقرير بطريقة الاستخراج والفحوص التي اجتازتها، والمبادئ المعلَّمة للمراجعة البشرية.</p>`+R.filter(x=>COLS[x.col]).map(R=>{const ps=PR.filter(p=>p.col===R.col&&p.rv.length);
   return `<details class="card" style="padding:12px 16px;margin-bottom:10px"><summary style="cursor:pointer;font-weight:600">${esc(R.title)}</summary>
    <div class="stats" style="margin-top:12px">${R.stats.map(([v,l])=>`<div class="stat card"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <h3>طريقة الاستخراج</h3><div class="prose"><ul>${R.method.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <h3>الفحوص</h3><div class="tbl"><table><thead><tr><th>الفحص</th><th>النتيجة</th><th>التفصيل</th></tr></thead><tbody>${R.checks.map(([a,ok,c])=>`<tr><td>${esc(a)}</td><td class="${ok?'okc':'flc'}">${ok?'اجتاز':'ملاحظات'}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table></div>
    <h3>يحتاج مراجعة (${ps.length})</h3><div class="tbl"><table><tbody>${ps.map(p=>`<tr><td><button class="btn" data-go="#/p/${p.id}">${p.n}</button></td><td>${p.pg.map(g=>g+COLS[p.col].off).join('–')}</td><td>${p.rv.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
    ${R.notes&&R.notes.length?`<h3>ملاحظات</h3><div class="prose"><ul>${R.notes.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`:''}</details>`}).join('')+'<div id="lrep"><div class="empty">جارٍ فحص التشريعات…</div></div>';
  await loadAllLaws();if(!$('lrep'))return;const rvA=[];LAWIX.forEach(x=>{const L=LAWDATA[x.id];if(!L)return;L.articles.forEach(a=>{const rs=[...(a.review||[])];try{artEv(L,a).filter(e=>e.part&&e.how!=='إلغاء').forEach(e=>rs.push(`تعديل جزئي (${e.part}) بـ${e.short||e.by_key} لم يُدمج في النص`));}catch(_){}if(rs.length)rvA.push([x,a,rs]);});});
  const by=k=>LAWIX.filter(x=>k(x)).length,arts=LAWIX.reduce((s,x)=>s+(x.articles||0),0);
  $('lrep').innerHTML=`<h2 style="margin-top:22px">تقرير التشريعات</h2><p class="muted">كيف دخلت نصوص التشريعات إلى المكتبة، وما يحتاج منها مراجعة.</p>
   <div class="stats"><div class="stat card"><b>${nf(LAWIX.length)}</b><span>تشريعًا</span></div><div class="stat card"><b>${nf(arts)}</b><span>مادة</span></div><div class="stat card"><b>${nf(by(x=>x.src==='gazette'))}</b><span>من الجريدة الرسمية</span></div><div class="stat card"><b>${nf(by(x=>x.src==='amali'))}</b><span>مساهمة «عمّالي»</span></div><div class="stat card"><b>${nf(by(x=>x.status==='معدّل'))}</b><span>معدّلًا</span></div><div class="stat card"><b>${nf(rvA.length)}</b><span>مادة تحتاج مراجعة</span></div></div>
   <h3>طريقة الاستخراج</h3><div class="prose"><ul><li><b>طبعة وزارة العدل (فبراير 2011):</b> قراءة طبقة النص في ملف الطبعة صفحةً صفحة، وتقطيع المواد بعناوينها، ونقل الحواشي إلى موادها. كل كلمة في المخرَج موجودة في الملف، والتقسيم إلى فقرات اجتهادي.</li><li><b>الجريدة الرسمية:</b> فكّ ترميز الخطوط في ملف العدد بجدول حروف مُراجَع، وإزالة العلامة المائية، ثم مطابقة كل مادة مع صورة صفحتها.</li><li><b>التعديلات:</b> تُسجَّل أحداث التعديل والإلغاء من نص التشريع المعدِّل نفسه، وتُعلَّم المادة الأصلية «معدّلة» أو «ملغاة» مع النص المنشور، دون دمج آلي.</li></ul></div>
   <h3>الفحوص</h3><div class="tbl"><table><thead><tr><th>الفحص</th><th>النتيجة</th></tr></thead><tbody><tr><td>تسلسل أرقام المواد في كل تشريع (بلا فجوة إلا ما نصّت الطبعة على إلغائه)</td><td class="okc">اجتاز</td></tr><tr><td>كل فقرة في حزم التصدير موجودة حرفيًا في نصوص المكتبة</td><td class="okc">اجتاز</td></tr><tr><td>لا حرف غير مقروء (U+FFFD) في نصوص الجريدة</td><td class="okc">اجتاز</td></tr><tr><td>التشريعات غير المطابَقة مع الجريدة موسومة بذلك</td><td class="okc">اجتاز</td></tr></tbody></table></div>
   <h3>مواد تحتاج مراجعة (${rvA.length})</h3><div class="tbl"><table><tbody>${rvA.map(([x,a,rs])=>`<tr><td><button class="btn" data-go="#/a/${a.id}">${esc(a.label)}</button></td><td>${esc(x.short)}</td><td>${rs.map(esc).join('<br>')}</td></tr>`).join('')||'<tr><td>—</td></tr>'}</tbody></table></div>`;}
function viewAbout(){setTimeout(aboutVer,0);$('v-about').innerHTML=`<div class="vh"><button class="btn" data-back>${svg('back')}رجوع</button><h2>عن المكتبة</h2></div><div class="prose">
  <p>«مبادئ التمييز» مبادرة شخصية مجانية غير تجارية، تجمع مبادئ محكمة التمييز الكويتية من مجموعاتها الرسمية وإصدارات مكتبها الفني في مكان واحد، ليسهل البحث فيها ونسخها وطباعتها، ولو دون اتصال.</p>
  <h3>قواعد النزاهة</h3><ul>
   <li>نص كل مبدأ منقول <b>حرفيًا</b> كما ورد في مصدره. لا يُعاد صياغته ولا يُختصر ولا يُصحَّح إملائيًا.</li>
   <li>لا يُخترع مبدأ ولا يُخمَّن حرف. ما شُكّ في قراءته يُعلَّم «يحتاج مراجعة» مع سببه.</li>
   <li>رقم الطعن وتاريخ الجلسة يُفحصان آليًا ويُقارنان بين المصادر، وكل تعارض يُعلَّم ولا يُحسم بالتخمين.</li>
   <li>كل مبدأ مربوط بصورة صفحته في المصدر. عند أي شك، <b>المرجع هو النص المطبوع في المصدر</b>.</li>
   <li>التصنيف بالموضوع والقانون وصف مساعد، وليس جزءًا من النص.</li></ul>
  <p>هذه المكتبة ليست جهة رسمية ولا تصدر عن محكمة التمييز أو وزارة العدل.</p>
  <h3>المصادر</h3></div><div class="grid g2">${ORDER.map(k=>`<div class="card" style="padding:10px 14px;display:flex;gap:10px;align-items:baseline"><span>${esc(COLS[k].title)}</span><span class="muted" style="margin-inline-start:auto">${nf(COLS[k].n)}</span></div>`).join('')}</div>
  <div class="prose"><h3>التشريعات</h3><p>تضم المكتبة ${nf(LAWIX.length)} تشريعًا (${nf(LAWIX.filter(x=>(x.cat||'law')==='law').length)} قانونًا ومرسومًا بقانون، و${nf(LAWIX.filter(x=>x.cat==='reg').length)} مرسومًا ولائحةً وقرارًا) بمجموع ${nf(LAWIX.reduce((s,x)=>s+(x.articles||0),0))} مادة، وكل مادة موصولة بالمبادئ التي تذكرها وبصورة صفحتها في مصدرها.</p><ul>
   <li><b>طبعة وزارة العدل</b> «مجموعة التشريعات الكويتية» (الطبعة الأولى، فبراير 2011): ${nf(LAWIX.filter(x=>x.src!=='gazette'&&x.src!=='amali').length)} تشريعًا، بنصها كما في الطبعة وبحواشيها، وتشمل التعديلات حتى تاريخها.</li>
   <li><b>الجريدة الرسمية «الكويت اليوم»</b>: ${nf(LAWIX.filter(x=>x.src==='gazette').length)} تشريعًا صدر في 2025–2026، منقولة من ملف العدد نفسه ومطابَقة مع صور صفحاته، وهي وحدها الموسومة «روجعت على الجريدة».</li>
   <li><b>مساهمة «عمّالي»</b>: ${nf(LAWIX.filter(x=>x.src==='amali').length)} وثيقة في مجال العمل نقلها تطبيق «عمّالي» بصريًا، ولم تُطابَق بعد مع صفحات الجريدة؛ تحمل تنبيهًا بذلك.</li></ul>
   <ul><li>نص المادة منقول حرفيًا. التعديل اللاحق لا يُدمج في النص آليًا، بل يظهر إلى جانبه بنصه المنشور، مع إمكان مقارنة النصين.</li><li>ما لم يُراجع على الجريدة الرسمية يُعلَّم، وما كان التعديل فيه جزئيًا يبقى «يحتاج مراجعة».</li><li>التشريعات تخضع للتعديل باستمرار؛ قبل الاعتماد في حكم ارجع إلى الجريدة الرسمية.</li></ul>
  <h3>التطبيق الشقيق</h3></div>${amaliCard()}<div class="prose"><p class="muted">كل من التطبيقين مستقل ويعمل دون اتصال، ولا يطلب شيئًا من الآخر؛ الرابط يفتحه المستخدم بنفسه. على الآيفون والآيباد يُفتح في Safari لا في التطبيق المثبّت.</p>
  <h3>روابط ثابتة</h3><ul><li>لكل مبدأ رابط ثابت بمعرّفه: <code>#/p/V09L-0001</code></li><li>ولكل حكم رابط يجمع ما ورد عنه: <code>#/r/69/1977@1979-03-12</code></li><li>ولكل تشريع ومادة رابط: <code>#/law/LAW-6-2010</code> و<code>#/a/LAW-6-2010-A0041</code></li></ul>
</div>`;}
// ---------- SETTINGS
function settingsDlg(toSync){
  const d=dlg(`${svg('gear')} الإعدادات`,`<div class="set">
   <section><h4>ملفي</h4><div class="rowi"><label class="avatar bigav" style="cursor:pointer" title="تغيير الصورة" id="avl">${S.photo?`<img src="${S.photo}" alt="">`:esc((S.name||'').charAt(0)||'+')}<input type="file" accept="image/*" id="avf" hidden></label>
    <input type="text" id="sname" placeholder="اسمك (يظهر في الترحيب فقط)" value="${esc(S.name)}"></div>
    <div class="rowi">${S.photo?'<button class="btn" id="avx">إزالة الصورة</button>':''}<span class="hint">الاسم والصورة يُحفظان في هذا الجهاز فقط ولا يُرسلان إلى أي مكان.</span></div></section>
   <section><h4>قفل التطبيق</h4><div class="rowi">${S.pin?`<span>القفل مفعّل.</span><button class="btn" id="pinoff">إلغاء القفل</button><button class="btn" id="pinchg">تغيير الرمز</button>`:`<input type="password" id="pin1" inputmode="numeric" maxlength="8" placeholder="رمز من 4 إلى 8 أرقام"><input type="password" id="pin2" inputmode="numeric" maxlength="8" placeholder="أعد كتابته"><button class="btn primary" id="pinon">تفعيل</button>`}</div>
    ${S.pin?`<div class="rowi" id="biorow" hidden><span>${FACEIC.replace('<svg ','<svg class="i" ')} فتح ب${bioName()}</span>${S.bio?`<button class="btn" id="biooff">إيقاف</button>`:`<button class="btn primary" id="bioon">تفعيل</button>`}</div>`:''}
    <div class="rowi"><span>يُقفل بعد الخروج بـ</span><select id="lockmin" style="flex:0 1 140px">${[1,5,15,60].map(m=>`<option value="${m}"${S.lockMin==m?' selected':''}>${m} دقيقة</option>`).join('')}</select></div>
    <span class="hint">القفل يمنع فتح التطبيق على هذا الجهاز دون الرمز، ويحمي محفوظاتك وملاحظاتك من العرض. نصوص المكتبة نفسها عامة.</span></section>
   <section><h4>خط النصوص</h4><div class="fontopts">${Object.entries(FONTS).map(([k,f])=>`<button data-font="${k}" aria-pressed="${S.font===k}" style="font-family:${f.css.replace(/"/g,"'")},serif"><span>قضت المحكمة</span><small>${f.l}</small></button>`).join('')}</div>
    <div class="rowi"><span>الحجم</span><input type="range" id="fs" min=".85" max="1.6" step=".05" value="${S.fs}"><b id="fsv">${Math.round(S.fs*100)}٪</b></div>
    <div class="rowi"><span>تباعد الأسطر</span><input type="range" id="lh" min="1.6" max="2.4" step=".05" value="${S.lh}"></div>
    <div class="preview">عقد العمل. الخصيصتان الأساسيتان له التبعية والأجر.</div><span class="hint">عنوان «مبادئ التمييز» ثابت ولا يتغير بتغيير الخط.</span></section>
   <section><h4>المظهر</h4><div class="seg">${[['auto','تلقائي'],['light','فاتح'],['dark','داكن']].map(([k,l])=>`<button data-theme="${k}" aria-pressed="${S.theme===k}">${l}</button>`).join('')}</div></section>
   <section><h4>الاستماع</h4>${'speechSynthesis' in window?`<div class="rowi"><span>الصوت</span><select id="vsel" style="flex:1 1 200px;min-width:0"></select></div>
    <div class="rowi"><span>السرعة</span><input type="range" id="vrate" min=".7" max="1.4" step=".05" value="${S.rate||1}"><b id="vratev" dir="ltr">${S.rate||1}×</b><button class="btn" id="vtest">${svg('speak')}تجربة</button></div>
    <span class="hint">جودة الصوت من أصوات جهازك. الأصوات المعلَّمة ☁ يقرؤها المتصفح عبر الإنترنت، والبقية تعمل في الجهاز. لصوت أوضح: على الآيفون الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات ← العربية ← نزّل «ماجد (محسّن)». وعلى ويندوز: الإعدادات ← الوقت واللغة ← الكلام ← أضف صوتًا عربيًا.</span>
    <span class="hint" id="vnone" hidden>لا يوجد صوت عربي في هذا الجهاز بعد؛ أضفه من إعدادات النظام كما في الأعلى.</span>`:'<span class="hint">الاستماع غير متاح في هذا المتصفح.</span>'}</section>
   <section><h4>الدليل والفيديو</h4><div id="gvid"></div><div class="rowi"><button class="btn primary" id="gopen">${svg('open')}عرض الدليل</button><a class="btn" href="${GUIDE_PDF}" download="دليل-مبادئ-التمييز.pdf">${svg('download')}PDF</a><span class="hint">دليل مصوّر بفصل لكل قسم. وفي أعلى كل قسم رابط «الدليل» يفتح فصله مباشرة.</span></div></section>
   <section><h4>رأيك</h4><div class="rowi"><button class="btn primary" data-a2="rate">${svg('star')}ملاحظاتك واقتراحاتك</button><span class="hint">تقييم لكل قسم، يُحفظ في جهازك وترسله أنت.</span></div></section>
   <section id="syncsec"><h4>المزامنة بين أجهزتك</h4><div id="syncbox"></div></section>
   <section><h4>الجولة التعريفية</h4><div class="rowi"><button class="btn" id="tour">${svg('info')}عرض الجولة التعريفية</button><button class="btn" data-a2="install">${svg('download')}تثبيت التطبيق</button></div></section>
   <section><h4>بياناتي</h4><div class="rowi"><button class="btn" id="bk">${svg('download')}نسخة احتياطية</button><label class="btn" style="cursor:pointer">استعادة<input type="file" accept="application/json" id="rs" hidden></label></div>
    <span class="hint">نسخة غير مشفّرة: المحفوظات والمجلدات والملاحظات والإعدادات والسجل في ملف واحد، للاحتفاظ به أو نقله يدويًا.</span></section>
   <p class="verline">الإصدار ${buildLabel()}</p></div>`);
  ttsVoiceUI();if($('vsel')){$('vsel').onchange=()=>{S.voice=$('vsel').value;upd();};$('vrate').oninput=()=>{S.rate=+$('vrate').value;$('vratev').textContent=S.rate+'×';upd();};
   $('vtest').onclick=()=>ttsSpeak('test','تجربة الصوت','المادة 41 من القانون رقم 6/2010: يستحق العامل مكافأة نهاية الخدمة. (الطعن 730/2012 عمالي جلسة 21/1/2014)',null);}
  $('tour').onclick=()=>{closeDlg();introShow(true);};
  $('gopen').onclick=()=>{closeDlg();openGuide('');};
  syncUI();if(toSync===true)setTimeout(()=>{const x=$('syncsec');if(x)x.scrollIntoView({block:'start'});},60);
  fetch('docs/intro.jpg',{method:'HEAD'}).then(r=>{if(!r.ok||!$('gvid'))return;$('gvid').innerHTML=`<button class="vposter" id="gvp" aria-label="تشغيل الفيديو التعريفي"><img src="docs/intro.jpg" alt=""><span class="play">${svg('open')}تشغيل الفيديو التعريفي</span></button>`;
    $('gvp').onclick=()=>{$('gvid').innerHTML='<video src="docs/intro.mp4" controls autoplay playsinline preload="none" poster="docs/intro.jpg" style="width:100%;border-radius:12px"></video>';};}).catch(()=>{});
  const upd=()=>{saveS();applyLook();};
  $('sname').oninput=()=>{S.name=$('sname').value.trim();upd();};
  $('avf').onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=()=>{const c=document.createElement('canvas'),z=192,m=Math.min(img.width,img.height);c.width=c.height=z;c.getContext('2d').drawImage(img,(img.width-m)/2,(img.height-m)/2,m,m,0,0,z,z);S.photo=c.toDataURL('image/jpeg',.82);upd();settingsDlg();};img.src=URL.createObjectURL(f);};
  if($('avx'))$('avx').onclick=()=>{S.photo='';upd();settingsDlg();};
  if($('pinon'))$('pinon').onclick=async()=>{const a=$('pin1').value,b=$('pin2').value;if(!/^\d{4,8}$/.test(a))return toast('الرمز من 4 إلى 8 أرقام');if(a!==b)return toast('الرمزان غير متطابقين');S.pin=await sha(a);S.pinLen=a.length;upd();toast('فُعّل القفل');settingsDlg();};
  if($('biorow'))bioAvail().then(ok=>{if(ok&&$('biorow'))$('biorow').hidden=false;});
  if($('bioon'))$('bioon').onclick=async()=>{try{S.bio=await bioEnroll();upd();toast(`فُعّل الفتح ب${bioName()}`);settingsDlg();}catch(e){toast(e&&e.name==='NotAllowedError'?'أُلغي التفعيل':'تعذّر التفعيل على هذا الجهاز');}};
  if($('biooff'))$('biooff').onclick=()=>{delete S.bio;upd();toast(`أُوقف الفتح ب${bioName()}`);settingsDlg();};
  if($('pinoff'))$('pinoff').onclick=()=>{S.pin='';delete S.pinLen;delete S.bio;upd();toast('أُلغي القفل');settingsDlg();};
  if($('pinchg'))$('pinchg').onclick=()=>{S.pin='';delete S.pinLen;delete S.bio;upd();settingsDlg();};
  $('lockmin').onchange=()=>{S.lockMin=+$('lockmin').value;upd();};
  d.querySelectorAll('[data-font]').forEach(b=>b.onclick=()=>{S.font=b.dataset.font;upd();d.querySelectorAll('[data-font]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  $('fs').oninput=()=>{S.fs=+$('fs').value;$('fsv').textContent=Math.round(S.fs*100)+'٪';upd();};
  $('lh').oninput=()=>{S.lh=+$('lh').value;upd();};
  d.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{S.theme=b.dataset.theme;upd();d.querySelectorAll('[data-theme]').forEach(x=>x.setAttribute('aria-pressed',x===b));});
  $('bk').onclick=()=>{const blob=new Blob([JSON.stringify({app:'mabadi',v:1,date:new Date().toISOString(),settings:S,favs:FAV,folders:FOLD,notes:NOTE,hist:HIST},null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`mabadi-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();syncMarkExported();};
  $('rs').onchange=async e=>{try{const j=JSON.parse(await e.target.files[0].text());if(j.app!=='mabadi')throw 0;S=Object.assign({},DEF,j.settings||{});FAV=j.favs||{};FOLD=j.folders&&j.folders.length?j.folders:['عام'];NOTE=j.notes||{};HIST=j.hist||[];
    const n=Date.now();for(const id in FAV)FAV[id].updated=n;NOTET={};for(const id in NOTE)NOTET[id]=n;FOLDT={};FOLD.forEach(f=>FOLDT[f]=n);DEL={favs:{},folders:{},notes:{}};
    saveS();saveUser();LS.set('hist',HIST);applyLook();toast('استُعيدت بياناتك');closeDlg();route();}catch(_){toast('الملف غير صالح');}};
}
// ---------- المزامنة المشفّرة بين الأجهزة (نواة «عمّالي» في sync-core.js، بلا خادم)
const SYNC_FILE='mabadi-data.amali',SYNC_META='mb_sync',TOMB_DAYS=180;
const IS_IOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const IS_STANDALONE=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
// يحوّل بيانات الجهاز إلى صيغة الملف: لكل نوع {items:{id:{...,updated}}, del:{id:ms}}
function syncPayload(){const fi={},fo={},no={};
  for(const id in FAV)fi[id]={id,f:FAV[id].f,t:FAV[id].t,updated:FAV[id].updated||FAV[id].t||0};
  FOLD.forEach(n=>fo[n]={id:n,updated:FOLDT[n]||0});
  for(const id in NOTE)no[id]={id,x:NOTE[id],updated:NOTET[id]||0};
  return {favorites:{items:fi,del:Object.assign({},DEL.favs)},folders:{items:fo,del:Object.assign({},DEL.folders)},notes:{items:no,del:Object.assign({},DEL.notes)}};}
// يعيد صيغة الملف إلى بيانات الجهاز، مع حفظ ترتيب المجلدات، وإبقاء كل مجلد فيه محفوظات، وتنظيف علامات الحذف القديمة
function syncApply(P){const it=k=>(P[k]&&P[k].items)||{},dl=k=>Object.assign({},(P[k]&&P[k].del)||{}),n=Date.now(),old=n-TOMB_DAYS*864e5;
  FAV={};for(const [id,x] of Object.entries(it('favorites')))if(x&&x.f)FAV[id]={f:x.f,t:x.t||x.updated||n,updated:x.updated||n};
  const fo=it('folders'),names=Object.keys(fo);FOLDT={};names.forEach(k=>FOLDT[k]=fo[k].updated||n);
  FOLD=[...FOLD.filter(f=>names.includes(f)),...names.filter(f=>!FOLD.includes(f)).sort((a,b)=>FOLDT[a]-FOLDT[b])];
  DEL={favs:dl('favorites'),folders:dl('folders'),notes:dl('notes')};
  Object.values(FAV).forEach(v=>{if(!FOLD.includes(v.f)){FOLD.push(v.f);FOLDT[v.f]=n;delete DEL.folders[v.f];}});
  if(!FOLD.length){FOLD=['عام'];FOLDT['عام']=n;}
  NOTE={};NOTET={};for(const [id,x] of Object.entries(it('notes')))if(x&&x.x){NOTE[id]=x.x;NOTET[id]=x.updated||n;}
  for(const k in DEL)for(const id in DEL[k])if(DEL[k][id]<old)delete DEL[k][id];
  LS.set('favs',FAV);LS.set('folders',FOLD);LS.set('notes',NOTE);LS.set('del',DEL);LS.set('notest',NOTET);LS.set('foldt',FOLDT);
  syncRefresh();}
function syncRefresh(){if(/^#\/saved/.test(location.hash))viewSaved();if($('syncbox'))syncUI();}
function syncMarkExported(){try{const m=JSON.parse(localStorage.getItem(SYNC_META)||'{}')||{};m.exported=Date.now();localStorage.setItem(SYNC_META,JSON.stringify(m));}catch(_){}syncNudge();}
// حوار داخل التطبيق يطلب رمز المزامنة (يعيد النص أو null)
function syncAskPass(why){return new Promise(res=>{let done=false;const fin=v=>{if(done)return;done=true;clearInterval(iv);closeDlg();res(v);};
  const d=dlg(`${svg('lock')} رمز المزامنة`,`<div class="set"><p style="margin:0">${esc(why)}</p><input type="password" id="spw" autocomplete="off" placeholder="رمز المزامنة">
   <div class="rowi"><button class="btn primary" id="spok">فتح</button><button class="btn" id="spno">إلغاء</button></div></div>`);
  const iv=setInterval(()=>{if(!document.body.contains(d))fin(null);},400);
  $('spok').onclick=()=>fin($('spw').value||null);$('spno').onclick=()=>fin(null);$('spw').onkeydown=e=>{if(e.key==='Enter')fin($('spw').value||null);};setTimeout(()=>$('spw')&&$('spw').focus(),50);});}
// الآيفون والآيباد لا يستبدلان الملف بل يضيفان «1» و«2»… إلى اسمه؛ لذلك يقبل الجلب عدة ملفات معًا وتُدمج بالأقدم فالأحدث، فلا يحتاج المستخدم إلى تغيير الأسماء
function syncPickFile(){return new Promise(res=>{const i=document.createElement('input');i.type='file';i.accept='.amali';i.multiple=true;i.hidden=true;document.body.appendChild(i);
  const end=v=>{i.remove();res(v);};i.onchange=()=>{const fs=[...i.files].sort((a,b)=>a.lastModified-b.lastModified);end(fs.length>1?fs:(fs[0]||null));};i.addEventListener('cancel',()=>end(null));i.click();});}
let syncReopen=false,syncChg=false;
const SYNC=window.AmaliSync?AmaliSync.create({inner:'mabadi-data',fileName:SYNC_FILE,idbName:'mabadi_sync',metaKey:SYNC_META,
  getPayload:syncPayload,
  merge:d=>{const P=syncPayload(),a=AmaliSync.mergeById(P.favorites,d.favorites),b=AmaliSync.mergeById(P.folders,d.folders),c=AmaliSync.mergeById(P.notes,d.notes);syncApply(P);
    return {add:a.add+b.add+c.add,upd:a.upd+b.upd+c.upd,del:a.del+b.del+c.del};},
  replace:d=>{try{localStorage.setItem('mabadi:prerep',JSON.stringify({at:Date.now(),p:syncPayload()}));}catch(_){}syncApply(d);},
  notify:(m)=>toast(m),askPass:w=>{syncReopen=true;return syncAskPass(w);},pickFileFallback:syncPickFile}):null;
// يشغّل عملية مزامنة ثم يعيد فتح الإعدادات إن أغلقها حوار الرمز
async function syncRun(fn){const b=document.querySelectorAll('#syncbox button');b.forEach(x=>x.disabled=true);syncReopen=false;
  try{await fn();}catch(e){toast(e&&e.message?e.message:'تعذّرت العملية');}
  if(syncReopen||!$('syncbox'))settingsDlg(true);else syncUI();syncNudge();}
const ago=t=>{if(!t)return 'لم يحدث بعد';const m=Math.round((Date.now()-t)/6e4);if(m<1)return 'الآن';if(m<60)return `قبل ${m} دقيقة`;const h=Math.round(m/60);if(h<24)return `قبل ${h} ساعة`;const d=Math.round(h/24);return d===1?'أمس':`قبل ${d} يومًا`;};
function syncUI(){const box=$('syncbox');if(!box)return;
  if(!SYNC||!window.crypto||!crypto.subtle){box.innerHTML='<span class="hint">المزامنة غير متاحة في هذا المتصفح. استعمل النسخة الاحتياطية أدناه.</span>';return;}
  const st=SYNC.state,m=SYNC.meta(),hasKey=!!st.key&&!syncChg,dir=SYNC.canLinkFolder(),dirty=SYNC.isDirty(),pr=LS.get('prerep',null);
  box.innerHTML=`<p class="hint" style="margin:0 0 8px">ملف واحد مشفّر على جهازك (${esc(SYNC_FILE)}) تحفظه في مجلد سحابي تختاره: OneDrive أو iCloud أو Google Drive. لا خادم ولا حساب، ولا يُرسل التطبيق شيئًا. تُزامَن المحفوظات والمجلدات والملاحظات فقط؛ السجل والإعدادات تبقى في كل جهاز.</p>
   <div class="syncstep"><b>١. رمز المزامنة</b>${hasKey?`<div class="rowi"><span class="okdot">معتمد على هذا الجهاز</span><button class="btn" id="spchg">تغيير الرمز</button></div>`:
    `<div class="rowi"><input type="password" id="sp1" autocomplete="new-password" placeholder="6 أحرف فأكثر"><input type="password" id="sp2" autocomplete="new-password" placeholder="أعد كتابته"><button class="btn primary" id="spset">${svg('lock')}اعتماد الرمز</button></div>
    <span class="hint">اكتب الرمز نفسه على كل أجهزتك. على جهاز ثانٍ يكفي «جلب» ثم كتابة الرمز. إن نسيته لا يمكن فتح الملف، وتبقى بيانات جهازك سليمة.</span>`}</div>
   <div class="syncstep"><b>٢. ${dir?'المجلد والمزامنة':IS_IOS?'قبل العمل وبعده':'الجلب والحفظ'}</b>
   ${dir?`<div class="rowi"><button class="btn" id="slink">${svg('link')}${st.dir?'تغيير مجلد المزامنة':'ربط مجلد المزامنة'}</button>${st.dir?`<span class="hint">المجلد: «${esc(st.dir.name)}»</span>`:''}</div>
     <div class="rowi"><button class="btn primary" id="snow">${svg('download')}مزامنة الآن${dirty?' <i class="dirty" title="تغييرات لم تُحفظ"></i>':''}</button><button class="btn" id="spull">جلب فقط</button><button class="btn" id="spush">حفظ فقط</button></div>`
    :`<div class="rowi"><button class="btn primary" id="spull">${svg('download')}${IS_IOS?'① قبل العمل: جلب من ملف':'جلب من ملف'}</button><button class="btn${dirty?' primary':''}" id="spush">${svg('share')}${IS_IOS?'② بعد العمل: حفظ في ملف':'حفظ في ملف'}${dirty?' <i class="dirty"></i>':''}</button></div>
     <span class="hint">${IS_IOS?'عند الحفظ اختر «حفظ في الملفات» ثم مجلد المزامنة في iCloud Drive أو OneDrive أو Google Drive، وإن لم يسمح iOS بالاستبدال وأضاف رقمًا إلى الاسم (mabadi-data 1…) فلا بأس: عند «جلب» اختر الملفات كلها معًا فتُدمج بالأحدث، ثم احفظ ملفًا واحدًا واحذف القديمة متى شئت.':'ربط المجلد متاح على الحاسوب في متصفح Chrome أو Edge. هنا: اجلب الملف قبل العمل، واحفظه بعده في مجلد المزامنة.'}</span>`}
   <div class="syncstat">آخر جلب: ${ago(m.pulled)} · آخر حفظ: ${ago(m.pushed)}${dirty?' · <b>تغييرات لم تُحفظ</b>':''}</div></div>
   <details class="syncadv"><summary>خيارات أخرى</summary><div class="rowi"><button class="btn" id="srep">استبدال بيانات هذا الجهاز من ملف…</button>${pr?`<button class="btn" id="sundo">التراجع عن آخر استبدال (${ago(pr.at)})</button>`:''}</div>
    <label class="rowi"><input type="checkbox" id="snudge"${S.nudge!==false?' checked':''}> ذكّرني بالنسخ الاحتياطي إن مرّ أسبوع دون مزامنة أو نسخة</label></details>`;
  const on=(id,f)=>{const e=$(id);if(e)e.onclick=f;};
  on('spset',()=>syncRun(async()=>{const a=$('sp1').value,b=$('sp2').value;if(a.length<6)throw new Error('رمز المزامنة 6 أحرف فأكثر');if(a!==b)throw new Error('الرمزان غير متطابقين');await SYNC.setPass(a);syncChg=false;toast('اعتُمد الرمز على هذا الجهاز');}));
  on('spchg',()=>{syncChg=true;syncUI();toast('الرمز الجديد يُعتمد على هذا الجهاز، وتطلبه أجهزتك الأخرى مرة واحدة عند الجلب');});
  on('slink',()=>syncRun(()=>SYNC.linkFolder()));on('snow',()=>syncRun(()=>SYNC.syncNow()));on('spull',()=>syncRun(()=>SYNC.pull()));on('spush',()=>syncRun(()=>SYNC.push()));
  on('srep',()=>{if(!confirm('ستُستبدل محفوظات هذا الجهاز ومجلداته وملاحظاته بمحتوى الملف الذي تختاره. تُحفظ نسخة من بياناتك الحالية للتراجع. متابعة؟'))return;
    if(!confirm('تأكيد أخير: استبدال بيانات هذا الجهاز؟'))return;syncRun(()=>SYNC.pickReplace());});
  on('sundo',()=>{const pr=LS.get('prerep',null);if(!pr||!confirm('إعادة بيانات الجهاز كما كانت قبل آخر استبدال؟'))return;const P=pr.p,n=Date.now();
    ['favorites','folders','notes'].forEach(k=>{Object.values(P[k].items).forEach(x=>x.updated=n);});syncApply(P);saveUser();try{localStorage.removeItem('mabadi:prerep');}catch(_){}toast('أُعيدت بياناتك السابقة');syncUI();});
  const nu=$('snudge');if(nu)nu.onchange=()=>{S.nudge=nu.checked;saveS();syncNudge();};}
// شريط تنبيه هادئ: تثبيت التطبيق على الآيفون، ثم التذكير بالنسخ الاحتياطي
function syncNudge(){const old=$('nudge');if(old)old.remove();const n=Date.now(),D=864e5;let html='',kind='';
  const hasData=Object.keys(FAV).length||Object.keys(NOTE).length;
  if(IS_IOS&&!IS_STANDALONE()&&hasData&&n-(LS.get('iosnudge',0)||0)>30*D){kind='ios';
    html=`<b>ثبّت التطبيق على الشاشة الرئيسية</b> (مشاركة ← إضافة إلى الشاشة الرئيسية)، وإلا قد يمسح Safari محفوظاتك إذا لم تفتحه أسبوعًا.<span><button class="btn" data-nu="ok">فهمت</button></span>`;}
  else if(SYNC&&hasData&&S.nudge!==false){const first=Math.min(...Object.values(FAV).map(v=>v.t||n),...Object.values(NOTET),n),last=Math.max(SYNC.lastBackup(),first);
    if(n-last>7*D&&n>(LS.get('bknudge',0)||0)){kind='bk';html=`<b>${SYNC.lastBackup()?'مرّ أسبوع على آخر مزامنة أو نسخة احتياطية.':'محفوظاتك في هذا الجهاز فقط.'}</b> احفظها بالمزامنة المشفّرة أو بنسخة احتياطية.<span><button class="btn primary" data-nu="go">الإعدادات</button><button class="btn" data-nu="later">لاحقًا</button></span>`;}}
  if(!html)return;const e=document.createElement('div');e.id='nudge';e.className='nudge';e.setAttribute('role','status');e.innerHTML=html;document.body.appendChild(e);
  e.onclick=ev=>{const b=ev.target.closest('[data-nu]');if(!b)return;const k=b.dataset.nu;
    if(kind==='ios')LS.set('iosnudge',n);if(k==='later')LS.set('bknudge',n+7*D);if(k==='go'){LS.set('bknudge',n+D);settingsDlg(true);}e.remove();if(kind==='ios')setTimeout(syncNudge,400);};}
// ---------- offline
function offlineDlg(){dlg(`${svg('download')} العمل دون اتصال`,`<div class="set"><p style="margin:0">بعد أول زيارة تُحفظ نصوص المكتبة في الجهاز. صور الصفحات تُحفظ عند فتحها، ويمكنك تنزيلها كلها الآن (نحو 380 ميغابايت).</p>
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
// ---------- guide: جدول القسم ← صفحة الدليل (يتحقق منه ويحدّثه tools/guide/build-guide.mjs)
const GUIDE={home:3,search:4,filters:6,item:7,source:9,ruling:10,index:11,laws:13,saved:15,offline:16,settings:17,feedback:19,about:20};
const GUIDE_PDF='docs/guide.pdf',GUIDE_WEB='docs/guide/index.html';
// «عمّالي» — التطبيق الشقيق: رابط يفتحه المستخدم بنفسه (لا اتصال بين التطبيقين)، وأيقونته محفوظة في هذا المستودع
const AMALI_URL='https://ommali-app.github.io/',amaliP=id=>AMALI_URL+'#p='+encodeURIComponent(id);
function amaliCard(){return `<a class="partner card" href="${AMALI_URL}" target="_blank" rel="noopener"><img src="icons/partners/amali.svg" alt="" width="56" height="56"><span><b>«عمّالي»</b><small>لقاضي الدائرة العمالية — رول الجلسة وقراراتها، وحساب المستحقات والمواعيد الإجرائية، وإخراج الحكم بقالبه؛ ومبادئه وتشريعاته من «مبادئ التمييز». يعمل على الجهاز دون اتصال.</small><em>${svg('open')}افتح عمّالي</em></span></a>`;}
// الدليل داخل التطبيق: طبقة بشريط علوي فيه «إغلاق» وتنزيل PDF، فلا يُحبس المستخدم في ملف PDF داخل التطبيق المثبّت
function openGuide(k){closeGuide(true);const w=document.createElement('div');w.className='gview';w.id='gview';w.setAttribute('role','dialog');w.setAttribute('aria-label','دليل الاستخدام');
  w.innerHTML=`<div class="gvtop"><button class="btn" id="gvx" aria-label="إغلاق الدليل">${svg('x')}إغلاق</button><b>دليل الاستخدام</b><a class="btn" href="${GUIDE_PDF}" download="دليل-مبادئ-التمييز.pdf">${svg('download')}PDF</a></div>
   <iframe src="${GUIDE_WEB}?v=${APP_BUILD}#${k?'ch-'+k:'top'}" title="دليل الاستخدام"></iframe>`;
  document.body.appendChild(w);document.body.classList.add('noscroll');history.pushState({guide:1},'');
  $('gvx').onclick=()=>history.back();}
function closeGuide(silent){const w=$('gview');if(!w)return false;w.remove();document.body.classList.remove('noscroll');return true;}
window.addEventListener('popstate',()=>{closeGuide();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('gview'))history.back();});
function guideKey(v){const h=(location.hash||'').replace(/^#\/?/,'');
  if(v==='item')return h.startsWith('r/')?'ruling':(h.startsWith('law/')||h.startsWith('a/')||h.startsWith('m/'))?'laws':'item';
  return {home:'home',search:'search',index:'index',saved:'saved',report:'about',about:'about',laws:'laws',more:'settings'}[v];}
function guideLink(v){return;   // لا زر «دليل» عائم فوق الصفحات؛ الدليل في «المزيد» وفي الجولة التعريفية
  const el=$('v-'+v);if(!el)return;const k=guideKey(v),pg=v==='home'?null:GUIDE[k];let a=el.querySelector(':scope > .guidelnk');
  if(!pg){if(a)a.remove();return;}
  if(!a){a=document.createElement('a');a.className='guidelnk no-print';a.target='_blank';a.rel='noopener';el.prepend(a);a.addEventListener('click',e=>{e.preventDefault();openGuide(a.dataset.k);});}
  a.dataset.k=k;
  a.href=`${GUIDE_PDF}#page=${pg}`;a.innerHTML=`${svg('info')}الدليل`;a.title='افتح فصل هذا القسم في دليل الاستخدام';}
// ---------- feedback (local only; nothing is sent by the app)
const FB_PHONE='';   // رقم واتساب اختياري بصيغة دولية دون + (مثال 965XXXXXXXX)، يبقى فارغًا في المستودع العام
const FB_EMAIL='';   // بريد اختياري، يبقى فارغًا في المستودع العام
const FBS=[['search','البحث','الكلمات والعبارات، أرقام الطعون والمواد، وسرعة النتائج'],
 ['read','قراءة المبدأ ونسخه','عرض النص، النسخ بالإسناد، المشاركة والطباعة'],
 ['source','صور الصفحات والمصادر','صورة الصفحة الأصلية، تحديد موضع المبدأ، نص الصفحة'],
 ['index','الفهرس والمرشحات','الموضوعات والقوانين والكتب، وتضييق النتائج'],
 ['ruling','بطاقة الحكم والإحالات','المبادئ المستخلصة من الطعن نفسه في أكثر من مجموعة'],
 ['laws','التشريعات','نصوص القوانين واللوائح، المذكرات، وربط المواد بالمبادئ'],
 ['saved','المحفوظات والملاحظات','المجلدات، الملاحظات الخاصة، النسخة الاحتياطية'],
 ['offline','العمل دون اتصال والتثبيت','تنزيل المكتبة، الفتح دون إنترنت، الإضافة إلى الشاشة'],
 ['look','المظهر والخطوط','الألوان، الوضع الداكن، الخط وحجمه، القفل']];
const FBV={easy:['🟢','سهل وواضح'],ok:['🟡','مقبول'],bad:['🔴','فيه خلل'],na:['⚪','لم أجرّبه']};
const FBP=['بطء','صعوبة الفهم','خطأ في النتيجة','لا يعمل على جهازي','الترتيب مربك','ينقصه شيء'];
const FBD=['آيفون','آيباد','أندرويد','حاسوب'];
function fbGuess(){const u=navigator.userAgent;if(/iPad|Macintosh/.test(u)&&navigator.maxTouchPoints>1)return 'آيباد';if(/iPhone/.test(u))return 'آيفون';if(/Android/.test(u))return 'أندرويد';return 'حاسوب';}
function fbLoad(){return LS.get('fb2',null)||{sec:{},device:fbGuess(),stars:0,rec:'',best:'',improve:'',name:''};}
function fbText(st){const L=['📋 استبيان تجربة تطبيق «مبادئ التمييز»'];
  L.push([st.device||'—',`التقييم ${st.stars||'—'}/5`,st.rec?`يوصي بالاعتماد: ${st.rec}`:'يوصي بالاعتماد: —'].join(' | '));
  if(st.name.trim())L.push('المُقيّم: '+st.name.trim());
  const rows=FBS.filter(([k])=>st.sec[k]&&st.sec[k].v&&st.sec[k].v!=='na');
  if(rows.length){L.push('');rows.forEach(([k,t])=>{const s=st.sec[k];L.push(`• ${t}: ${FBV[s.v][0]} ${FBV[s.v][1]}${s.p&&s.p.length&&s.v!=='easy'?' — '+s.p.join('، '):''}`);if(s.n&&s.n.trim()&&s.v!=='easy')L.push('   '+s.n.trim().replace(/\n+/g,' '));});}
  if(st.best.trim()||st.improve.trim())L.push('');
  if(st.best.trim())L.push('👍 أكثر ما نفعني: '+st.best.trim());
  if(st.improve.trim())L.push('🛠 أهم تحسين: '+st.improve.trim());
  L.push('','— الشاشة '+innerWidth+'×'+innerHeight+' · '+new Date().toISOString().slice(0,10));
  return L.join('\n');}
function feedbackScreen(){closeDlg();let st=fbLoad();const save=()=>LS.set('fb2',st);
  const o=document.createElement('div');o.className='fbx';o.setAttribute('role','dialog');o.setAttribute('aria-label','ملاحظاتك واقتراحاتك');
  const secHTML=([k,t,d])=>{const s=st.sec[k]||{};return `<div class="fbsec" data-k="${k}"><div class="fbh"><b>${t}</b><small>${d}</small></div>
    <div class="fbv">${Object.entries(FBV).map(([v,[e,l]])=>`<button type="button" data-v="${v}" aria-pressed="${s.v===v}">${e} ${l}</button>`).join('')}</div>
    <div class="fbmore"${s.v==='ok'||s.v==='bad'?'':' hidden'}><div class="fbp">${FBP.map(p=>`<button type="button" data-p="${p}" aria-pressed="${!!(s.p||[]).includes(p)}">${p}</button>`).join('')}</div>
    <label class="fbl">الموضع بدقة واقتراح التحسين<textarea rows="3" data-n>${esc(s.n||'')}</textarea></label></div></div>`;};
  o.innerHTML=`<header class="fbtop"><button class="btn icon" data-fbclose aria-label="إغلاق">${svg('x')}</button><b>ملاحظاتك واقتراحاتك</b><span class="fbcount" id="fbcnt"></span></header>
   <div class="fbbody"><p class="muted">قيّم ما جرّبته من أقسام التطبيق. ما تكتبه يُحفظ في جهازك فقط حتى ترسله أنت بنفسك، والتطبيق لا يرسل شيئًا.</p>
   <h3>تقييم الأقسام</h3>${FBS.map(secHTML).join('')}
   <h3>أسئلة عامة</h3>
   <div class="fbq"><b>الجهاز</b><div class="fbv" data-g="device">${FBD.map(x=>`<button type="button" data-o="${x}" aria-pressed="${st.device===x}">${x}</button>`).join('')}</div></div>
   <div class="fbq"><b>التقييم العام</b><div class="stars fbstars">${[1,2,3,4,5].map(n=>`<button type="button" data-s="${n}" class="${n<=st.stars?'on':''}" aria-label="${n} من 5">${svg('star')}</button>`).join('')}</div></div>
   <div class="fbq"><b>هل توصي باعتماده؟</b><div class="fbv" data-g="rec">${['نعم','بتحفّظ','لا'].map(x=>`<button type="button" data-o="${x}" aria-pressed="${st.rec===x}">${x}</button>`).join('')}</div></div>
   <label class="fbl">أكثر ما نفعني<textarea rows="2" data-f="best">${esc(st.best)}</textarea></label>
   <label class="fbl">أهم تحسين تقترحه<textarea rows="2" data-f="improve">${esc(st.improve)}</textarea></label>
   <label class="fbl">اسمك (اختياري)<input type="text" data-f="name" value="${esc(st.name)}" maxlength="80"></label>
   <h3>الإرسال</h3><p class="muted">يفتح واتساب أو البريد والنص جاهز، وتختار أنت المرسَل إليه.</p>
   <div class="fbsend"><button class="btn primary" id="fbwa">${svg('wa')}أرسل عبر واتساب</button><button class="btn" id="fbml">${svg('mail')}بالبريد</button><button class="btn" id="fbcp">${svg('copy')}نسخ</button></div>
   <details class="fbprev"><summary>معاينة النص</summary><pre id="fbpre"></pre></details>
   <button class="btn fbclear" id="fbclr">مسح والبدء من جديد</button></div>`;
  document.body.appendChild(o);document.body.classList.add('noscroll');
  const upd=()=>{save();const n=FBS.filter(([k])=>st.sec[k]&&st.sec[k].v).length;$('fbcnt').textContent=`قُيِّم ${n} من ${FBS.length}`;$('fbpre').textContent=fbText(st);};upd();
  const close=()=>{o.remove();document.body.classList.remove('noscroll');};
  o.addEventListener('click',e=>{const t=e.target;
    if(t.closest('[data-fbclose]'))return close();
    const sec=t.closest('.fbsec');
    const vb=t.closest('[data-v]');if(vb&&sec){const k=sec.dataset.k,s=st.sec[k]=st.sec[k]||{};s.v=vb.dataset.v;sec.querySelectorAll('[data-v]').forEach(b=>b.setAttribute('aria-pressed',b===vb));sec.querySelector('.fbmore').hidden=!(s.v==='ok'||s.v==='bad');upd();return;}
    const pb=t.closest('[data-p]');if(pb&&sec){const s=st.sec[sec.dataset.k]=st.sec[sec.dataset.k]||{};s.p=s.p||[];const p=pb.dataset.p,i=s.p.indexOf(p);i<0?s.p.push(p):s.p.splice(i,1);pb.setAttribute('aria-pressed',i<0);upd();return;}
    const ob=t.closest('[data-o]');if(ob){const g=ob.parentElement.dataset.g;st[g]=ob.dataset.o;ob.parentElement.querySelectorAll('[data-o]').forEach(b=>b.setAttribute('aria-pressed',b===ob));upd();return;}
    const sb=t.closest('[data-s]');if(sb){st.stars=+sb.dataset.s;o.querySelectorAll('[data-s]').forEach(b=>b.classList.toggle('on',+b.dataset.s<=st.stars));upd();return;}});
  o.addEventListener('input',e=>{const t=e.target;if(t.matches('[data-n]')){const k=t.closest('.fbsec').dataset.k;(st.sec[k]=st.sec[k]||{}).n=t.value;}else if(t.dataset.f)st[t.dataset.f]=t.value;upd();});
  $('fbwa').onclick=()=>open(`https://wa.me/${FB_PHONE}?text=${encodeURIComponent(fbText(st))}`,'_blank','noopener');
  $('fbml').onclick=()=>{location.href=`mailto:${FB_EMAIL}?subject=${encodeURIComponent('استبيان تجربة تطبيق «مبادئ التمييز»')}&body=${encodeURIComponent(fbText(st))}`;};
  $('fbcp').onclick=()=>clip(fbText(st),()=>toast('نُسخ النص'));
  let arm=0;$('fbclr').onclick=()=>{if(!arm){arm=1;$('fbclr').textContent='اضغط مرة أخرى للتأكيد';$('fbclr').classList.add('danger');setTimeout(()=>{arm=0;if($('fbclr')){$('fbclr').textContent='مسح والبدء من جديد';$('fbclr').classList.remove('danger');}},4000);return;}
    try{localStorage.removeItem('mabadi:fb2')}catch(_){}close();feedbackScreen();toast('بدأت من جديد');};
  o.querySelector('[data-fbclose]').focus();
  addEventListener('keydown',function esc_(e){if(e.key==='Escape'&&document.body.contains(o)){close();removeEventListener('keydown',esc_);}});
}
// ---------- router
const NAVMAP={laws:'#/laws',home:'#/',search:'#/search',index:'#/index/topics',saved:'#/saved',more:'#/more',report:'#/report',about:'#/about'};
function show(v,nav){['home','search','index','saved','more','item','report','about','laws','review'].forEach(x=>$('v-'+x).hidden=x!==v);guideLink(v);
  document.querySelectorAll('[data-nav]').forEach(b=>b.setAttribute('aria-current',b.dataset.nav===nav));}
function route(){const h=decodeURIComponent((location.hash||'').replace(/^#\/?/,''));closeDlg();if(ARR&&h!=='search')ARR=null;if(TTS.id)ttsStop();if($('hback'))$('hback').hidden=!h;
  document.title='مبادئ التمييز';
  if(h.startsWith('p/')){viewItem(h.slice(2));show('item','');}
  else if(h.startsWith('r/')){viewRuling(h.slice(2));show('item','');}
  else if(h==='search'){syncInputs();setScope(SCOPE);show('search','search');}
  else if(h.startsWith('index')){const [,sub,...rest]=h.split('/');viewIndex(sub||idxTab,rest.join('/'));show('index',innerWidth>=1000?'index':'search');}
  else if(h==='saved'){viewSaved();show('saved','saved');}
  else if(h==='more'){viewMore();show('more','more');}
  else if(h==='report'){viewReport();show('report',innerWidth>=1000?'report':'more');}
  else if(h==='review'){viewReview();show('review',innerWidth>=1000?'report':'more');}
  else if(h==='about'){viewAbout();show('about',innerWidth>=1000?'about':'more');}
  else if(h==='laws'){viewLaws();show('laws','laws');}
  else if(h.startsWith('law/')){viewLaw(h.slice(4));show('item','laws');}
  else if(h.startsWith('a/')){viewArt(h.slice(2));show('item','laws');}
  else if(h.startsWith('m/')){const [lid,k]=h.slice(2).split('/');viewMemo(lid,k);show('item','laws');}
  else{viewHome();show('home','home');}
  window.scrollTo({top:0});}
let navs=0;window.addEventListener('hashchange',()=>{navs++;route();});
function go(h){if(location.hash===h||(h==='#/'&&!location.hash))route();else location.hash=h;}
// ---------- global clicks
document.addEventListener('click',e=>{const t=e.target;
  const nb=t.closest('[data-nav]');if(nb){go(NAVMAP[nb.dataset.nav]);return;}
  if(t.closest('#me')){settingsDlg();return;}
  if(t.closest('#pal')){palette();return;}
  if(t.closest('[data-close]')){closeDlg();return;}
  const act=t.closest('[data-a]');if(act){const p=BYID[act.closest('[data-id]').dataset.id],a=act.dataset.a;
    if(a==='copy')clip(quoteText(p),()=>toast('نُسخ النص مع الإسناد والمصدر'));if(a==='share')shareDlg(p);if(a==='fav')favDlg(p);if(a==='note')noteDlg(p);if(a==='speak')speak(p);if(a==='src')openSrc(p);
    if(a==='more')actsSheet(p);
    if(a==='cite')clip(p.c.map(c=>c.raw).join('\n')||'',()=>toast('نُسخ الإسناد'));
    if(a==='copytext')clip(blocks(p).filter(b=>b[0]==='t').map(b=>b[1]).join('\n'),()=>toast('نُسخ نص المبدأ'));
    if(a==='link')clip(plink(p),()=>toast('نُسخ الرابط'));
    if(act.classList.contains('ash')&&a!=='more'&&!['note','share'].includes(a))closeDlg();
    return;}
  if(t.closest('[data-hist]')){savedTab='hist';go('#/saved');return;}
  const lq=t.closest('[data-lq]');if(lq){const L=lawByName(lq.dataset.lq);if(L)go('#/law/'+L.id);return;}
  const uf=t.closest('[data-unfold]');if(uf){const m=uf.previousElementSibling;if(m){m.hidden=false;uf.remove();}return;}
  const a2=t.closest('[data-a2]');if(a2){const k=a2.dataset.a2;if(k==='settings')settingsDlg();if(k==='sync')settingsDlg(true);if(k==='guide')openGuide('');if(k==='rate')feedbackScreen();if(k==='offline')offlineDlg();if(k==='install')installDlg();if(k==='printsaved')printSaved();
    if(k==='copysaved'){const ps=Object.entries(FAV).filter(([id,v])=>BYID[id]&&(!savedFold||v.f===savedFold)).map(x=>quoteText(BYID[x[0]]));clip(ps.join('\n\n———\n\n'),()=>toast(`نُسخ ${ps.length} مبدأ`));}
    if(k==='clrhist'){HIST=[];LS.set('hist',HIST);viewSaved();}return;}
  const st=t.closest('[data-st]');if(st){savedTab=st.dataset.st;viewSaved();return;}
  const hf=t.closest('[data-hfav]');if(hf){if(BYID[hf.dataset.hfav])favDlg(BYID[hf.dataset.hfav]);return;}
  const ar=t.closest('[data-arrange]');if(ar){arrangeDlg(ar.dataset.arrange);return;}
  const am=t.closest('[data-arrmode]');if(am){arrMode(am.dataset.arrmode);return;}
  if(t.closest('[data-scope-l]')){setScope('l');$('sq').value=F.q;lawScope();window.scrollTo({top:0});return;}
  const bb=t.closest('[data-bby]');if(bb){LS.set('browseby',bb.dataset.bby);renderBrowse();return;}
  if(t.closest('[data-dupall]')){DUPALL=!DUPALL;LS.set('dupall',DUPALL?'1':'');runSearch();return;}
  const ad=t.closest('[data-arrdef]');if(ad){const o=Object.assign({},S.ord);delete o[ad.dataset.arrdef];S.ord=o;saveS();renderBrowse();toast('عاد الترتيب الأصلي');return;}
  if(t.closest('.arranging .tile'))return;   // في وضع الترتيب البطاقة تُسحب ولا تُفتح
  const sf=t.closest('[data-sf]');if(sf){savedFold=sf.dataset.sf;viewSaved();return;}
  const mic=t.closest('[data-mic]');if(mic){listen(mic.dataset.mic,mic);return;}
  const pn=t.closest('[data-pgnav]');if(pn){const p=BYID[pn.dataset.id],g=+pn.dataset.g,nx=pn.dataset.pgnav==='next'?g+1:g-1,box=pn.parentElement.querySelector('.pgs');if(!p||!box)return;
    const d=pageDoc(p.col,g),lo=d?d.first:1,hi=d?d.last:1e9;if(nx<lo||nx>hi)return;box.insertAdjacentHTML(pn.dataset.pgnav==='next'?'beforeend':'afterbegin',pageFig(p,nx));pn.dataset.g=nx;wirePages(box);
    if(nx<=lo&&pn.dataset.pgnav==='prev')pn.hidden=true;if(nx>=hi&&pn.dataset.pgnav==='next')pn.hidden=true;return;}
  const gb=t.closest('[data-go]');if(gb){go(gb.dataset.go);return;}
  if(t.closest('[data-back]')){if(navs>0)history.back();else go('#/');return;}
  if(t.closest('[data-print]')){printDlg();return;}
  const fb=t.closest('[data-f]');if(fb){setFilter(fb.dataset.f,fb.dataset.v);return;}
  const qb=t.closest('[data-q]');if(qb){doSearch(qb.dataset.q);return;}
  const cl=t.closest('[data-clr]');if(cl){F[cl.dataset.clr]=cl.dataset.clr==='rv'?false:'';syncInputs();runSearch();return;}
});
if('serviceWorker' in navigator){const hadSW=!!navigator.serviceWorker.controller;navigator.serviceWorker.register('sw.js').catch(()=>{});
}
// التحقق من وجود إصدار أحدث منشور (version.json) عند الفتح وعند العودة للتطبيق وكل نصف ساعة: رسالة صغيرة وزر «تحديث الآن»
let updLater=false;
async function checkUpdate(){if(updLater||!navigator.onLine||$('updbar'))return;try{const r=await fetch('version.json?t='+Date.now(),{cache:'no-store'});if(!r.ok)return;const j=await r.json();
  if(j&&j.build&&String(j.build)>APP_BUILD)showUpdate(String(j.build));}catch(_){}}
function showUpdate(b){if($('updbar'))return;const e=document.createElement('div');e.id='updbar';e.className='nudge upd';e.setAttribute('role','status');
  e.innerHTML=`<b>يتوفر تحديث جديد للتطبيق</b> (الإصدار ${b.slice(0,4)}.${b.slice(4,6)}.${b.slice(6,8)} — ${b.slice(8,10)}:${b.slice(10,12)}).<span><button class="btn primary" id="updgo">${svg('download')}تحديث الآن</button><button class="btn" id="updno">لاحقًا</button></span>`;
  document.body.appendChild(e);
  $('updgo').onclick=async()=>{$('updgo').disabled=true;$('updgo').textContent='جارٍ التحديث…';
    try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg)await reg.update();
      if('caches' in window){const ks=await caches.keys();await Promise.all(ks.filter(k=>k.startsWith('mabadi-shell-')).map(k=>caches.delete(k)));}}catch(_){}
    location.reload();};
  $('updno').onclick=()=>{updLater=true;e.remove();};}
setTimeout(checkUpdate,4000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkUpdate();});setInterval(checkUpdate,30*60e3);
buildSearch();route();setTimeout(loadAllLaws,1500);if(SYNC)SYNC.restore().then(()=>{if($('syncbox'))syncUI();}).catch(()=>{});setTimeout(syncNudge,2500);introShow();if(!location.hash||location.hash==='#/')playWeave();else wovenOnce=true;
document.body.insertAdjacentHTML('beforeend',`<button class="totop" id="totop" hidden aria-label="العودة إلى الأعلى">${svg('back').replace('<svg','<svg style="transform:rotate(-90deg)"')}</button>`);
$('totop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
{let lastY=0,tt=0;addEventListener('scroll',()=>{const b=$('totop'),y=scrollY;b.hidden=false;const up=y<lastY-4;
  if(y<900||!up){if(y>lastY+4||y<900)b.classList.remove('on');}else{b.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>b.classList.remove('on'),2500);}
  lastY=y;},{passive:true});}
})().catch(e=>{const m=document.getElementById('main');if(m)m.innerHTML='<div class="empty">تعذّر تحميل المكتبة. أعد تحميل الصفحة.</div>';console.error(e);});
