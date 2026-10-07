// التحميل على مرحلتين: الواجهة تظهر قبل الأحكام غير المنشورة، والروابط والبحث تشملها بعد اكتمالها
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{const META=JSON.parse((await import('node:fs')).readFileSync(new URL('../../data/meta.json',import.meta.url)));if(!META.order.some(c=>META.cols[c].unpub)){console.log('لا مجموعات متأخرة — تخطٍّ');console.log('\n0 ✔ / 0 ✘');process.exit(0);}
  const c=await context(b,{viewport:{width:1280,height:800}},url);
  await c.addInitScript(()=>{for(const k of ['bknudge','iosnudge'])localStorage.setItem('mabadi:'+k,'9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  // رابط مباشر إلى مبدأ من مجموعة متأخرة
  await p.goto(url+'#/p/UN25-00001');await p.waitForSelector('#v-item .pr, #v-item article',{timeout:60000}).catch(()=>{});await p.waitForTimeout(800);
  ck('رابط مبدأ من «غير منشورة 2025» يفتح',(await p.locator('#v-item').innerText()).includes('2025'));
  await p.waitForFunction(()=>!document.getElementById('sub').textContent.includes('جارٍ'),null,{timeout:60000});
  const n=await p.evaluate(()=>document.getElementById('sub').textContent);ck('العدد الكلي بعد الاكتمال يشمل المجموعات الثلاث',/(\d[\d,٬]*)/.test(n)&&parseInt(n.replace(/[^\d]/g,''))>50000,n);
  // البحث يجد نصًا من 2026
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(800);
  await p.fill('#sq','قرار لجنة فحص الطعون');await p.waitForTimeout(2500);
  ck('البحث يشمل قرارات 2026',await p.locator('#list article.pr').count()>0);
  ck('لا أخطاء',!errs.length,errs.join('|'));
  await c.close();
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
