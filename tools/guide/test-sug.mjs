// اقتراحات البحث، وتنظيم القائمة و«عن المكتبة»
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900}}]]){
  const c=await context(b,vp,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');
    if(!sessionStorage.getItem('s')){sessionStorage.setItem('s',1);localStorage.setItem('mabadi:qhist',JSON.stringify(['الحضانة','التقادم']));localStorage.setItem('mabadi:hist',JSON.stringify(['V09L-0184','V09L-0016','V09L-1078']));}});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html#/search');await p.waitForSelector('#sq',{timeout:30000});await p.waitForTimeout(1500);
  ck(nm+': لا وسوم ثابتة تحت البحث',await p.locator('#sqk .chip').count()===0);
  await p.click('#sq');await p.waitForTimeout(300);
  ck(nm+': القائمة تنسدل عند الضغط',await p.locator('.sugbox:visible').count()===1);
  const hs=await p.locator('.sugbox .sugh span').allInnerTexts();ck(nm+': أقسام: بحث أخير وموضوعات تعمل فيها',hs.includes('عمليات بحث أخيرة')&&hs.includes('موضوعات تعمل فيها'),JSON.stringify(hs));
  await p.locator('.sugbox [data-sugrm]').first().click();await p.waitForTimeout(200);
  ck(nm+': حذف بحث من السجل',await p.evaluate(()=>JSON.parse(localStorage.getItem('mabadi:qhist')).length)===1);
  await p.fill('#sq','مكاف');await p.waitForTimeout(400);
  const ts=await p.locator('.sugbox .sugi b').allInnerTexts();ck(nm+': إكمال «مكاف»',ts.some(t=>t.includes('مكافأة')),JSON.stringify(ts.slice(0,5)));
  const tp=p.locator('.sugbox .sugi').filter({hasText:'موضوع في'}).first();
  if(await tp.count()){await tp.click();await p.waitForTimeout(1200);ck(nm+': اختيار موضوع يرشّح',await p.locator('#actf [data-pick="tp"]').count()===1&&(await p.inputValue('#sq'))==='');}
  await p.fill('#sq','هل يستحق العامل');await p.waitForTimeout(400);
  ck(nm+': اقتراح «اسأل المكتبة» للعبارة',await p.locator('.sugbox .sugi').filter({hasText:'اسأل المكتبة'}).count()===1);
  await p.waitForTimeout(1500);ck(nm+': تُطوى بعد توقف الكتابة فلا تحجب النتائج',await p.locator('.sugbox:visible').count()===0);
  await p.click('#sq');await p.waitForTimeout(200);await p.keyboard.press('Escape');await p.waitForTimeout(200);ck(nm+': Escape يغلق',await p.locator('.sugbox:visible').count()===0);
  // الرئيسية
  await p.evaluate(()=>{location.hash='#/';});await p.waitForTimeout(1200);await p.click('#hq');await p.waitForTimeout(300);
  const vis=await p.evaluate(()=>{const b=[...document.querySelectorAll('.sugbox')].find(x=>!x.hidden);if(!b)return 0;const r=b.getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+Math.min(60,r.height/2));return r.height>100&&b.contains(e)?1:0;});
  ck(nm+': القائمة في الرئيسية ظاهرة كاملة فوق البطاقات',vis===1);
  // عن المكتبة
  await p.evaluate(()=>{location.hash='#/about';});await p.waitForTimeout(1200);
  ck(nm+': تبويبات «عن المكتبة»',await p.locator('.atabs [data-go]').count()===5);
  await p.locator('.atabs [data-go="#/report"]').click();await p.waitForTimeout(1500);ck(nm+': تبويب التقارير',await p.locator('#v-report .atabs .on').innerText()==='التقارير');
  await p.locator('#v-report .atabs [data-go="#/changes"]').click();await p.waitForTimeout(1500);ck(nm+': تبويب ما الجديد',await p.locator('#chgp li').count()>3);
  if(nm==='مكتب'){ck(nm+': القائمة الجانبية 6 أقسام وروابط صغيرة',await p.locator('.sidenav .navcard').count()===6&&await p.locator('.navmini button').count()===3);
    ck(nm+': «عن المكتبة» مضاء في الأسفل',await p.locator('.navmini [data-nav="about"][aria-current="true"]').count()===1);}
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck(nm+': لا تمرير أفقي',w<=1,w);
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
