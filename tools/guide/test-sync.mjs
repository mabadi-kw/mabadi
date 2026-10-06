// المزامنة: المؤشر، وبطاقة المحفوظات، وما تشمله (المتابعات والتفضيلات)، وتذكير التغييرات غير المحفوظة
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900}}]]){
  const c=await context(b,vp,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');
    if(!sessionStorage.getItem('s')){sessionStorage.setItem('s',1);localStorage.setItem('mabadi:favs',JSON.stringify({'V09L-0184':{f:'عام',t:1}}));}});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html?selftest=1#/');await p.waitForSelector('.gates',{timeout:30000});await p.waitForTimeout(1500);
  ck(nm+': مؤشر «هذا الجهاز فقط» في الرأس',await p.locator('#syncdot.local').count()===1);
  await p.evaluate(()=>{location.hash='#/saved';});await p.waitForTimeout(1000);
  ck(nm+': بطاقة «محفوظاتك في هذا الجهاز فقط»',await p.locator('.synccard.warn').count()===1);
  await p.locator('.synccard.warn [data-a2="sync"]').click();await p.waitForTimeout(600);
  ck(nm+': «فعّل» يفتح المزامنة',await p.locator('#syncbox').count()===1);
  await p.fill('#sp1','abc12345');await p.fill('#sp2','abc12345');await p.click('#spset');await p.waitForTimeout(2500);
  await p.keyboard.press('Escape');await p.waitForTimeout(300);
  const k1=await p.evaluate(()=>window.__mb.syncState().k);ck(nm+': بعد اعتماد الرمز تتغير الحالة',k1==='ok'||k1==='dirty',k1);
  // المتابعة والتفضيلات في الملف
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(800);await p.fill('#sq','مكافأة نهاية الخدمة');await p.keyboard.press('Escape');await p.waitForTimeout(1500);
  await p.locator('#count [data-fol]').click();await p.waitForTimeout(300);
  let P=await p.evaluate(()=>window.__mb.syncPayload());ck(nm+': المتابعة في ملف المزامنة',Object.keys(P.follows.items).length===1,JSON.stringify(P.follows));
  ck(nm+': والحالة «لم يُحفظ»',await p.locator('#syncdot.dirty').count()===1);
  await p.locator('#count [data-fol]').click();await p.waitForTimeout(300);
  P=await p.evaluate(()=>window.__mb.syncPayload());ck(nm+': إلغاء المتابعة يُسجَّل حذفًا',Object.keys(P.follows.items).length===0&&Object.keys(P.follows.del).length===1);
  await p.evaluate(()=>{location.hash='#/p/V09L-0184';});await p.waitForTimeout(1500);
  if(nm==='مكتب')await p.locator('#v-item article.pr[data-id="V09L-0184"] [data-a="citedlg"]').click();else{await p.locator('#v-item article.pr[data-id="V09L-0184"] [data-a="more"]').click();await p.waitForTimeout(300);await p.locator('.ash[data-a="citedlg"]').click();}
  await p.waitForTimeout(300);await p.locator('[data-cf="full"]').click();await p.keyboard.press('Escape');
  P=await p.evaluate(()=>window.__mb.syncPayload());ck(nm+': صيغة الاستشهاد في الملف',P.prefs.items.citefmt&&P.prefs.items.citefmt.v==='full');
  // دمج ملف من «جهاز آخر» فيه متابعة وتفضيل أحدث
  await p.evaluate(()=>{const Q=window.__mb.syncPayload();const t=Date.now()+1000;Q.follows={items:{'tp=L01':{id:'tp=L01',f:{tp:'L01'},t,updated:t}},del:{}};Q.prefs={items:{citefmt:{id:'citefmt',v:'short',updated:t},aisvc:{id:'aisvc',v:'chatgpt',updated:t}},del:{}};window.__mb.syncApply(Q);});
  ck(nm+': الوارد يضيف المتابعة والتفضيلات',await p.evaluate(()=>JSON.parse(localStorage.getItem('mabadi:follow')).length===1&&localStorage.getItem('mabadi:citefmt')==='"short"'&&localStorage.getItem('mabadi:aisvc')==='"chatgpt"'));
  // بطاقة المحفوظات بعد التفعيل سطر حالة
  await p.evaluate(()=>{location.hash='#/saved';});await p.waitForTimeout(1000);ck(nm+': سطر الحالة في المحفوظات',await p.locator('.synccard.line').count()===1);
  // تذكير التغييرات غير المحفوظة منذ يومين (بلا مجلد مربوط)
  await p.evaluate(()=>{localStorage.setItem('mb_sync_chg',String(Date.now()-3*864e5));const m=JSON.parse(localStorage.getItem('mb_sync')||'{}');m.pushed=Date.now()-4*864e5;localStorage.setItem('mb_sync',JSON.stringify(m));localStorage.removeItem('mabadi:dirtynudge');location.hash='#/';});
  await p.reload();await p.waitForSelector('.gates',{timeout:30000});await p.waitForTimeout(4000);
  ck(nm+': تذكير «تغييرات منذ يومين لم تُحفظ»',(await p.locator('#nudge').innerText().catch(()=>'')).includes('منذ يومين'));
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck(nm+': لا تمرير أفقي',w<=1,w);
  if(nm==='مكتب')await p.screenshot({path:'out/sync-d.png',clip:{x:0,y:0,width:1280,height:300}});
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
