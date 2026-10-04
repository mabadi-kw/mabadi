// الأشرطة الأفقية على الحاسوب: أزرار التمرير تظهر، وتمرّر الشريط، والسحب بالفأرة يعمل ولا يفتح البطاقة
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{const c=await context(b,{viewport:{width:1280,height:800}},url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html#/');await p.waitForTimeout(3500);
  const w=p.locator('.hswrap:has(.fstrip)').first();await w.scrollIntoViewIfNeeded();
  ck('شريط الموضوعات ملفوف بأزرار التمرير',await w.count()===1);
  const sl=()=>w.locator('.fstrip').evaluate(s=>Math.abs(s.scrollLeft));
  ck('زر «التالي» ظاهر وزر «السابق» مخفي في البداية',await w.locator('.hsb.en').isVisible()&&!(await w.locator('.hsb.st').isVisible()));
  await p.screenshot({path:'out/strip0.png',clip:await w.boundingBox().then(r=>({x:0,y:r.y-60,width:1280,height:r.height+80}))});
  await w.locator('.hsb.en').click();await p.waitForTimeout(700);const a=await sl();
  ck('زر «التالي» يمرّر الشريط',a>100,a);
  ck('زر «السابق» يظهر بعد التمرير',await w.locator('.hsb.st').isVisible());
  await p.screenshot({path:'out/strip1.png',clip:await w.boundingBox().then(r=>({x:0,y:r.y-60,width:1280,height:r.height+80}))});
  await w.locator('.hsb.st').click();await p.waitForTimeout(700);{const b2=await sl();ck('زر «السابق» يعيده إلى الوراء',b2<a,[a,b2]);await w.locator('.fstrip').evaluate(s=>s.scrollLeft=0);await p.waitForTimeout(300);}
  const h0=await p.evaluate(()=>location.hash);
  const r=await w.locator('.fstrip').boundingBox();await p.mouse.move(r.x+200,r.y+r.height/2);await p.mouse.down();await p.mouse.move(r.x+500,r.y+r.height/2,{steps:8});await p.mouse.up();await p.waitForTimeout(400);
  ck('السحب بالفأرة يمرّر الشريط',await sl()>100,await sl());
  ck('السحب لا يفتح الموضوع',await p.evaluate(()=>location.hash)===h0);
  await w.locator('.fchip').first().click({force:true});await p.waitForTimeout(800);
  ck('النقر العادي يفتح الموضوع',await p.evaluate(()=>location.hash)!==h0);
  ck('لا أخطاء في الصفحة',errs.length===0,errs.join(' | '));
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
