// الحالة (الهيئة العامة والعدول)، «كل الدوائر» يبقى في القائمة، المتابعة، وما الجديد
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900}}]]){
  const c=await context(b,vp,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const N=async()=>parseInt((await p.textContent('#count')).replace(/[^0-9]/g,''))||0;
  await p.goto(url+'index.html#/');await p.waitForTimeout(3500);
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(1000);
  ck(nm+': زر «اعرض كل المبادئ» في التصفح',await p.locator('#browse [data-f="all"]').count()===1);
  await p.locator('#browse [data-f="st"][data-v="ga"]').click();await p.waitForTimeout(1500);
  ck(nm+': أحكام العدول (5)',await N()===5,await N());
  await p.locator('.facets [data-fset="st"][data-v=""]').click();await p.waitForTimeout(2500);
  ck(nm+': «كل الحالات» يبقى في القائمة ويعرض الكل',await p.locator('#browse').isHidden()&&await N()>20000,await N());
  ck(nm+': المسار عبر الزمن للمكتبة كلها',await p.locator('.tline').count()===1);
  await p.locator('.tll [data-fset="st"][data-v="ga"]').click();await p.waitForTimeout(1500);
  ck(nm+': الضغط على «عدول من الهيئة العامة» في المسار',await N()===5);
  await p.locator('#actf [data-clr="st"]').click();await p.waitForTimeout(800);
  await p.fill('#sq','مكافأة نهاية الخدمة');await p.waitForTimeout(1500);
  await p.locator('.facets [data-fset="ch"][data-v="عمالي"]').click();await p.waitForTimeout(1200);
  await p.fill('#sq','');await p.keyboard.press('Escape');await p.waitForTimeout(1500);
  await p.locator('.facets [data-fset="ch"][data-v=""]').click();await p.waitForTimeout(2500);
  ck(nm+': «كل الدوائر» بلا بحث يبقى في القائمة',await p.locator('#browse').isHidden()&&await p.locator('#list article.pr').count()>0);
  // المتابعة
  await p.locator('.facets [data-fset="ch"][data-v="عمالي"]').click();await p.waitForTimeout(1500);
  await p.locator('#count [data-fol]').click();await p.waitForTimeout(400);
  ck(nm+': «تابِع» يصبح «تتابعه»',(await p.locator('#count [data-fol]').innerText()).includes('تتابعه'));
  // محاكاة دفعة جديدة: نُنقص المعروف من المجلة 45
  await p.evaluate(()=>{const k=JSON.parse(localStorage.getItem('mabadi:known'));for(const c in k)k[c]=Math.max(0,k[c]-30);localStorage.setItem('mabadi:known',JSON.stringify(k));location.hash='#/';});
  await p.reload();await p.waitForTimeout(3500);
  await p.waitForSelector('.askcta',{timeout:15000});await p.waitForTimeout(500);const fb=await p.locator('.folban').count();if(!fb){console.log(await p.evaluate(()=>[localStorage.getItem('mabadi:follow'),localStorage.getItem('mabadi:known').slice(0,80),location.hash]));}ck(nm+': تنبيه «جديد فيما تتابعه» في الرئيسية',fb===1,fb);
  if(fb){await p.locator('.folban').click();await p.waitForTimeout(1500);ck(nm+': صفحة «ما تتابعه» تعرض الجديد',await p.locator('.folnew article.pr').count()>0);}
  await p.evaluate(()=>{location.hash='#/a/LAW-6-2010-A0051';});await p.waitForTimeout(2500);
  ck(nm+': «تابِع» في صفحة المادة',await p.locator('.ajump [data-fol]').count()===1);
  // ما الجديد بعد التحديث
  await p.evaluate(()=>{localStorage.setItem('mabadi:seenbuild','"202601010000"');location.hash='#/';});await p.reload();await p.waitForTimeout(5000);
  ck(nm+': شاشة «تم التحديث — ما الجديد»',await p.locator('.dlg.chgdlg li').count()>3);
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck(nm+': لا تمرير أفقي',w<=1,w);
  if(nm==='جوال'){await p.screenshot({path:'out/home-ask-m.png'});}
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
