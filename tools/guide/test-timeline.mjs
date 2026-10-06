// المسار عبر الزمن في نتائج البحث
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900}}]]){
  const c=await context(b,vp,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html#/');await p.waitForTimeout(3500);
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(1500);await p.fill('#sq','مكافأة نهاية الخدمة');await p.waitForTimeout(1500);
  const N=async()=>parseInt((await p.textContent('#count')).replace(/[^0-9]/g,''))||0;
  ck(nm+': لوحة المسار تظهر',await p.locator('details.tline').count()===1);
  const yrs=await p.locator('.tlc[data-yr]').count();ck(nm+': سنوات قابلة للضغط',yrs>5,yrs);
  const tot=await N();
  const btn=p.locator('.tlc[data-yr]').nth(Math.floor(yrs/2));const y=await btn.getAttribute('data-yr');
  await btn.click();await p.waitForTimeout(1200);
  ck(nm+': السنة المختارة مميزة',await p.locator(`.tlc.on[data-yr="${y}"]`).count()===1);
  ck(nm+': سطر «معروض الآن» يذكر السنة',(await p.locator('.tlsel').innerText()).includes(y));
  ck(nm+': العمود المختار ليس ذهبيًا',await p.evaluate(()=>getComputedStyle(document.querySelector('.tlc.on .tlb')).backgroundColor)!=='rgb(184, 146, 58)');
  ck(nm+': زر «كل السنوات» ظاهر',await p.locator('[data-clr="yr"]').count()>=1);
  const tot2=await N();ck(nm+': الترشيح قلّل النتائج',tot2>0&&tot2<tot,`${tot}→${tot2}`);
  await p.locator('.tline [data-clr="yr"]').click();await p.waitForTimeout(1200);
  ck(nm+': «كل السنوات» يلغي الترشيح',await p.locator('.tlc.on').count()===0&&(await N())===tot);
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck(nm+': لا تمرير أفقي للصفحة',w<=1,w);
  if(nm==='مكتب'){await p.locator('.tlc[data-yr]').nth(Math.floor(yrs*0.75)).click();await p.waitForTimeout(1200);await p.screenshot({path:'out/timeline-sel.png',clip:{x:0,y:240,width:1280,height:300}});}
  if(nm==='مكتب')await p.screenshot({path:'out/timeline.png',clip:{x:0,y:0,width:1280,height:700}});
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
