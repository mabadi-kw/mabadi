// التنقل السريع (الدائرة والموضوع)، قائمة الاختيار، ومقارنة الدوائر
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900}}]]){
  const c=await context(b,vp,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const N=async()=>parseInt((await p.textContent('#count')).replace(/[^0-9]/g,''))||0;
  const hw=async()=>p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  await p.goto(url+'index.html#/');await p.waitForTimeout(3500);
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(1200);await p.fill('#sq','مكافأة نهاية الخدمة');await p.waitForTimeout(1500);
  ck(nm+': لوحة التنقل السريع تظهر',await p.locator('.facets').count()===1);
  const n0=await N();
  await p.locator('.facets [data-fset="ch"][data-v="عمالي"]').click();await p.waitForTimeout(1200);
  const n1=await N();ck(nm+': اختيار دائرة من اللوحة يرشّح دون مغادرة الصفحة',n1>0&&n1<n0,`${n0}→${n1}`);
  ck(nm+': الدائرة المختارة مميزة',await p.locator('.facets .chip.fc.on[data-v="عمالي"]').count()===1);
  ck(nm+': شارة الدائرة النشطة فيها زر تغيير وزر إزالة',await p.locator('#actf .achip [data-pick="ch"]').count()===1&&await p.locator('#actf .achip [data-clr="ch"]').count()===1);
  await p.locator('#actf [data-pick="ch"]').click();await p.waitForTimeout(500);
  ck(nm+': قائمة اختيار الدائرة تُفتح',await p.locator('.dlg.pick .pko').count()>=2);
  await p.locator('.dlg.pick .pko[data-v="مدني"]').click();await p.waitForTimeout(1200);
  ck(nm+': التبديل إلى «مدني» من القائمة',await p.locator('#actf [data-pick="ch"]').innerText().then(t=>t.includes('مدني'))&&await p.locator('.dlg').count()===0);
  await p.locator('.facets [data-fset="ch"][data-v=""]').click();await p.waitForTimeout(1200);
  ck(nm+': «كل الدوائر» يعيد العدد',await N()===n0,await N());
  // الموضوع: اختيار ثم تبديل إلى موضوع شقيق
  await p.locator('.facets [data-fset="tp"][data-tog]').first().click();await p.waitForTimeout(1200);
  const t1=await p.locator('#actf [data-pick="tp"]').innerText();
  ck(nm+': بعد اختيار موضوع تظهر موضوعات العائلة نفسها',(await p.locator('.facets .fl').allInnerTexts()).some(x=>x.includes('في «'))&&await p.locator('.facets [data-fset="tp"][data-tog]').count()>1,t1);
  await p.locator('.facets [data-pick="tp"]').click();await p.waitForTimeout(500);
  await p.fill('#pkq','تقادم');await p.waitForTimeout(300);
  const vis=await p.locator('.dlg.pick .pko:visible').count();ck(nm+': البحث داخل قائمة الموضوعات',vis>=1&&vis<15,vis);
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  await p.locator('#actf [data-clr="tp"]').click();await p.waitForTimeout(1000);
  ck(nm+': × يزيل الموضوع',await p.locator('#actf [data-pick="tp"]').count()===0);
  // مقارنة الدوائر
  await p.locator('.facets [data-go="#/cmp"]').click();await p.waitForTimeout(2500);
  ck(nm+': صفحة المقارنة تعرض بطاقات الدوائر',await p.locator('.ctile').count()>=2);
  const pr=await p.locator('.cpair').count();ck(nm+': أزواج متقاربة بين الدوائر',pr>=1,pr);
  ck(nm+': التظليل حاضر',await p.locator('.cpair mark.dif').count()>0);
  const vis1=await p.locator('.ccol:visible').count();
  if(nm==='جوال'){ck(nm+': عمود دائرة واحد ظاهر في الهاتف',vis1===1,vis1);await p.locator('.ctile').nth(1).click();await p.waitForTimeout(600);
    const d=await p.locator('.ctile').nth(1).getAttribute('data-ctab');ck(nm+': اختيار دائرة يعرض عمودها',await p.locator(`.ccol.on[data-ch="${d}"]`).isVisible());}
  else ck(nm+': الأعمدة جنبًا إلى جنب في المكتب',vis1>=2,vis1);
  ck(nm+': لا تمرير أفقي في صفحة المقارنة',await hw()<=1,await hw());
  if(nm==='مكتب')await p.screenshot({path:'out/cmp.png',fullPage:false});
  await p.locator('.cpair [data-go^="#/cmp/"]').first().click();await p.waitForTimeout(1500);
  ck(nm+': مقارنة مبدأين كاملين',await p.locator('.cpg.full .cmi').count()===2);
  if(nm==='جوال')await p.screenshot({path:'out/cmp-pair-m.png'});
  await p.evaluate(()=>{location.hash='#/a/LAW-38-1980-A0144';});await p.waitForTimeout(2500);
  const ca=await p.locator('[data-cmpa]').count();ck(nm+': زر «قارن بين الدوائر» في صفحة المادة',ca===1,ca);
  if(ca){await p.locator('[data-cmpa]').click();await p.waitForTimeout(2500);ck(nm+': المقارنة من المادة',(await p.locator('.cscope').innerText()).includes('المادة 144'));}
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
