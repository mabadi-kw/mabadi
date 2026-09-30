// صفحة العرض المختصرة لمبدأ واحد: embed.html#V09L-0001
(async function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const PRE={V09L:'L',V09:'T',MUS:'S'};
const raw=decodeURIComponent((location.hash||'').replace(/^#\/?(p\/)?/,''))||new URLSearchParams(location.search).get('id')||'';
const id=raw.trim().toUpperCase();
const size=()=>{try{parent.postMessage({type:'mabadi:height',id,height:document.documentElement.scrollHeight},'*')}catch(_){}};
new ResizeObserver(size).observe(document.body);
const fail=m=>{$('card').innerHTML=`<div class="empty">${esc(m)}</div>`;size();};
if(!/^[A-Z0-9]+-\d+$/.test(id))return fail('معرّف غير صالح.');
const META=await fetch('data/meta.json').then(r=>r.json());
const pre=id.split('-')[0], col=PRE[pre]||pre, C=META.cols[col];
if(!C)return fail(`لا توجد في المكتبة مجموعة بالرمز ${pre}.`);
const arr=await fetch('data/'+col+'.json').then(r=>r.json());
const p=arr.find(x=>x.id===id);
if(!p)return fail(`لا يوجد مبدأ بالمعرّف ${id}.`);
const lib='index.html#/p/'+id;
$('open').href=lib;
const pp=p.pg.map(g=>g+C.off);
const out=[];let ci=0;const pos=p.cp&&p.cp.length===p.c.length?p.cp:p.c.map(()=>p.p.length);let open=false;
const cit=c=>{if(!open){out.push('<ul class="cits">');open=true;}out.push(`<li>${esc(c.raw)}</li>`);};
p.p.forEach((x,k)=>{if(open){out.push('</ul>');open=false;}out.push(`<p>${esc(x)}</p>`);while(ci<p.c.length&&pos[ci]===k+1)cit(p.c[ci++]);});
while(ci<p.c.length)cit(p.c[ci++]); if(open)out.push('</ul>');
if(!p.c.length)out.push('<ul class="cits"><li>لا يوجد إسناد في المصدر</li></ul>');
$('card').innerHTML=`<article class="pr">
  <div class="num">${p.n}${p.np!==p.n?`<small>طُبع ${p.np}</small>`:''}<div class="idchip">${p.id}</div></div>
  <div class="body"><div class="crumb"><span>${esc(C.name)}</span>${p.sec.map(x=>`<span>${esc(x)}</span>`).join('')}</div>
  ${p.ttl?`<div class="ttl">${esc(p.ttl)}</div>`:''}<div class="text">${out.join('')}</div>
  ${p.rule?`<details class="rule"><summary>القاعدة — نص الحكم</summary><div class="text">${esc(p.rule)}</div></details>`:''}
  ${p.fn.length?`<div class="fn">${p.fn.map(esc).join('<br>')}</div>`:''}
  <div class="hint">المصدر: ${esc(C.title)} — ص ${pp.join('–')}</div></div>
  ${p.rv.length?`<div class="review">⚠️ يحتاج مراجعة: ${p.rv.map(esc).join(' · ')}</div>`:''}
</article>`;
// صورة الصفحة
const PW=C.pw||595.276,PH=C.ph||822.047,cr=C.crop||[0,0,1,1],cell=C.cell||[684,1000],cw=cr[2]-cr[0],chh=cr[3]-cr[1];
$('pages').innerHTML=p.pg.map(g=>{const reg=p.rg.find(r=>r.page===g);
  const box=reg?`<div class="hlbox" style="left:${((reg.bbox[0]-6)/PW-cr[0])/cw*100}%;top:${((reg.bbox[1]-4)/PH-cr[1])/chh*100}%;width:${(reg.bbox[2]-reg.bbox[0]+12)/PW/cw*100}%;height:${(reg.bbox[3]-reg.bbox[1]+8)/PH/chh*100}%"></div>`:'';
  const gp=C.gp||20,gc=gp/10,b=Math.floor((g-1)/gp),k=(g-1)%gp,cx=k%gc,ry=Math.floor(k/gc);
  return `<figure class="pg"><div class="pgimg" role="img" aria-label="صورة الصفحة ${g+C.off}" style="aspect-ratio:${cell[0]}/${cell[1]};background-image:url(pages/${col}/g${String(b).padStart(3,'0')}.webp);background-size:${gc*100}% 1000%;background-position:${cx*100/(gc-1)}% ${ry*100/9}%">${box}</div><figcaption>الصفحة ${g+C.off} من الكتاب</figcaption></figure>`;}).join('');
$('pgs').hidden=false;
$('copy').hidden=false;
$('copy').onclick=()=>{const t=(p.ttl?p.ttl+'\n':'')+p.p.join('\n')+(p.rule?'\nالقاعدة:\n'+p.rule:'')+'\n'+(p.c.length?p.c.map(c=>c.raw).join('\n'):'(لا يوجد إسناد في المصدر)')+(p.fn.length?'\n'+p.fn.join('\n'):'')+`\n[المصدر: ${C.title} — ص ${pp.join('–')}]`;
  const ok=()=>{$('copy').textContent='نُسخ';setTimeout(()=>$('copy').textContent='نسخ',1400)};
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(ok,()=>{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');ok()}catch(_){}ta.remove()});};
document.title=`${C.name} ${p.n} — مبادئ التمييز`;
size();
})().catch(e=>{document.getElementById('card').innerHTML='<div class="empty">تعذّر التحميل.</div>';console.error(e);});
