// حالة المبدأ والنص في تاريخ معيّن
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{const c=await context(b,{viewport:{width:390,height:844},isMobile:true,hasTouch:true},url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const go=async h=>{await p.evaluate(h=>{location.hash=h;},h);await p.waitForTimeout(1800);};
  await p.goto(url+'index.html#/');await p.waitForTimeout(3500);
  await go('#/p/V09L-0445');
  ck('مبدأ 2014 على م51 من 6/2010 عليه تنبيه «صدر بعده تعديل»',await p.locator('details.stb.yel').count()===1);
  await p.locator('details.stb.yel summary').click();await p.waitForTimeout(400);
  const t=await p.locator('details.stb.yel').innerText();ck('التنبيه يذكر 85/2017 و17/2018',t.includes('85/2017')&&t.includes('17/2018'),t.slice(0,200));
  ck('رابط «النص يوم الجلسة» يحمل تاريخ الجلسة',await p.locator('details.stb.yel [data-go*="@2014-01-07"]').count()>0);
  await go('#/p/MQ44-0002');ck('حكم الهيئة العامة 2/2022 عليه «حكم عدول»',(await p.locator('.stb.ga').count())===1);
  await go('#/p/MQ44-0120');ck('مبدأ بلا تعديل لاحق لا يحمل تنبيهًا أصفر',(await p.locator('details.stb.yel').count())===0);
  await go('#/a/LAW-6-2010-A0051@2014-01-07');await p.waitForTimeout(1500);
  ck('صفحة المادة 51 تعرض «النص في تاريخ معيّن»',await p.locator('#apit .pit').count()===1);
  ck('ثلاثة إصدارات في الخط الزمني',await p.locator('#apit [data-v]').count()===3,await p.locator('#apit [data-v]').count());
  const n=await p.locator('#pitn').innerText();ck('في 7/1/2014 يُعرض نص المصدر',n.includes('نص المصدر'),n);
  await p.click('#pitnow');await p.waitForTimeout(400);ck('«الأحدث» يبيّن أن التعديل جزئي ولم يُدمج',(await p.locator('#pitn').innerText()).includes('جزئيًا'));
  await go('#/a/LAW-51-1984-A0026');await p.waitForTimeout(1500);
  const V=await p.locator('#apit [data-v]').count();ck('م26 أحوال شخصية: إصدار بعد استبدال 10/2025',V===2,V);
  if(V===2){await p.click('#apit [data-v="1"]');await p.waitForTimeout(400);ck('الإصدار الثاني يعرض نص الاستبدال',(await p.locator('#pitn').innerText()).includes('10/2025'));}
  ck('لا أخطاء في الصفحة',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck('لا تمرير أفقي',w<=1,w);
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
