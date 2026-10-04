// شاشة القفل: الرمز السري، وتفعيل الفتح ببصمة الوجه/البصمة (WebAuthn) بمصادِق افتراضي، والفتح به، ورفض المحاولة الفاشلة.
import path from 'node:path';import {serve,browser,context,HERE} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url:u0}=await serve();const url=u0.replace('127.0.0.1','localhost');const b=await browser();
try{const c=await context(b,{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true},url);
  await c.addInitScript(()=>{for(const k of ['bknudge','iosnudge'])localStorage.setItem('mabadi:'+k,'9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const cdp=await c.newCDPSession(p);await cdp.send('WebAuthn.enable');
  const {authenticatorId}=await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
  await p.goto(url+'index.html#/');await p.waitForTimeout(3000);
  // تفعيل الرمز ثم البصمة من الإعدادات
  await p.evaluate(()=>{location.hash='#/more';});await p.waitForTimeout(800);await p.click('#v-more [data-a2="settings"]');await p.waitForTimeout(800);
  if(!await p.locator('#pin1').count())await p.screenshot({path:path.join(HERE,'out','lock-dbg.png')});
  await p.fill('#pin1','2468');await p.fill('#pin2','2468');await p.click('#pinon');await p.waitForTimeout(800);
  await p.waitForSelector('#biorow:not([hidden])',{timeout:5000}).catch(()=>{});
  ck('خيار «فتح بالبصمة» يظهر بعد تفعيل الرمز',await p.locator('#biorow:not([hidden])').count()===1);
  await p.click('#bioon');await p.waitForTimeout(1200);
  ck('تُحفظ هوية مفتاح المرور',await p.evaluate(()=>!!JSON.parse(localStorage.getItem('mabadi:settings')).bio));
  // القفل والفتح التلقائي بالبصمة
  await p.reload();await p.waitForTimeout(800);
  await p.waitForTimeout(2500);ck('الفتح التلقائي بالبصمة يزيل شاشة القفل',await p.locator('#lock').count()===0);
  // فشل التحقق: يبقى القفل، ثم الرمز يفتحه
  await cdp.send('WebAuthn.setUserVerified',{authenticatorId,isUserVerified:false});
  await p.reload();await p.waitForTimeout(3500);
  ck('شاشة القفل تظهر مع زر البصمة',await p.locator('#lock [data-bio]').count()===1);
  await p.screenshot({path:path.join(HERE,'out','lock.png')});
  ck('عند فشل البصمة يبقى القفل',await p.locator('#lock').count()===1,await p.locator('#lmsg').textContent().catch(()=>''));
  for(const k of '2468')await p.click(`#lock [data-k="${k}"]`);await p.waitForTimeout(800);
  ck('الرمز السري يفتح القفل دائمًا',await p.locator('#lock').count()===0);
  ck('لا أخطاء في الصفحة',errs.length===0,errs.join(' | '));
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
