// اختبار الطباعة: كل خيار يطبع المطلوب وحده (طبقة #printroot)، وصور الصفحات تُقصّ صورًا قابلة للطباعة. يحفظ ملفات PDF في out/print/
import fs from 'node:fs';import path from 'node:path';
import {serve,browser,context,HERE} from './lib.mjs';
const OUT=path.join(HERE,'out','print');fs.mkdirSync(OUT,{recursive:true});
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{const c=await context(b,{viewport:{width:1280,height:800}},url);
  // الطباعة الفعلية تُستبدل بتسجيل الحالة لحظة الطباعة
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:intro','1');window.print=()=>{const r=document.getElementById('printroot');
    window.__pr={on:document.body.classList.contains('printing'),text:r.innerText,imgs:r.querySelectorAll('img.pgcut').length,title:document.title};};});
  const p=await c.newPage();p.on('pageerror',e=>{bad++;console.log('✘ خطأ',String(e));});
  await p.goto(url+'index.html#/');await p.waitForTimeout(3000);
  const run=async(n,h,opt,want)=>{await p.evaluate(h=>{location.hash=h;},h);await p.waitForTimeout(1800);await p.evaluate(()=>window.__pr=null);
    await p.click('[data-print]:visible');await p.waitForTimeout(300);const cnt=await p.locator('[data-pr]').count();if(opt>=0)await p.click(`[data-pr="${opt}"]`);
    await p.waitForFunction(()=>window.__pr,null,{timeout:15000});const r=await p.evaluate(()=>window.__pr);
    await p.emulateMedia({media:'print'});await p.pdf({path:path.join(OUT,n+'.pdf'),format:'A4'});await p.emulateMedia({media:'screen'});
    ck(`${n}: ${want.d}`,r.on&&(want.n==null||cnt===want.n)&&(!want.has||r.text.includes(want.has))&&(!want.not||!r.text.includes(want.not))&&(want.imgs==null||(want.imgs?r.imgs>0:r.imgs===0)),JSON.stringify({cnt,imgs:r.imgs}));
    await p.evaluate(()=>window.dispatchEvent(new Event('afterprint')));};
  await run('principle','#/p/V09L-0184',0,{d:'المبدأ فقط (3 خيارات، دون صور ولا واجهة)',n:3,has:'730/2012',not:'الرئيسية',imgs:false});
  await run('principle-page','#/p/V09L-0184',1,{d:'المبدأ مع صورة صفحته',has:'730/2012',imgs:true});
  await run('page-only','#/p/V09L-0184',2,{d:'صورة الصفحة فقط',not:'730/2012',imgs:true});
  await p.evaluate(()=>{location.hash='#/p/V09L-0184';});await p.waitForTimeout(1500);await p.click('article.pr[data-id="V09L-0184"] .rk >> visible=true');await p.waitForTimeout(1200);
  await run('ruling',await p.evaluate(()=>decodeURIComponent(location.hash)),0,{d:'مبادئ الحكم (خياران)',n:2,has:'730/2012',imgs:false});
  await run('article','#/a/LAW-67-1980-A0001',0,{d:'نص المادة مع حاشية الطبعة (4 خيارات)',n:4,has:'تسرى النصوص',imgs:false});
  await run('article-principles','#/a/LAW-67-1980-A0001',3,{d:'المادة ومبادئها',has:'مبادئ تذكر هذه المادة'});
  await run('law','#/law/LAW-6-2010',-1,{d:'القانون كاملًا مباشرة',has:'في شأن العمل',imgs:false});
  await run('memo','#/m/LAW-67-1980',0,{d:'المذكرة كاملة مع تنبيه الطول',n:1});
  ck('بعد الطباعة تعود الواجهة',!(await p.evaluate(()=>document.body.classList.contains('printing'))));
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
