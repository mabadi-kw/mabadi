// المعرّف الثابت، والاستشهاد، وقراءة الاستشهاد الملصوق، والبيانات المفتوحة
import fs from 'node:fs';
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900},acceptDownloads:true}]]){
  const c=await context(b,{...vp,acceptDownloads:true},url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const go=async h=>{await p.evaluate(h=>{location.hash=h;},h);await p.waitForTimeout(1500);};
  await p.goto(url+'index.html#/');await p.waitForSelector('.gates',{timeout:30000});await p.waitForTimeout(1000);
  await go('#/t/523-2020-L/4');
  ck(nm+': الرابط الثابت يفتح المبدأ',await p.locator('#v-item article.pr[data-id="MRJ-0476"]').count()===1);
  ck(nm+': سطر المعرّف الثابت',(await p.locator('.refln code').innerText())==='523-2020-L/4');
  await go('#/t/523-2020-L');ck(nm+': رابط الحكم يفتح بطاقة الحكم',(await p.locator('#v-item h2').first().innerText()).includes('بطاقة الحكم'));
  await go('#/p/MRJ-0476');ck(nm+': الرابط القديم ما زال يعمل',await p.locator('#v-item article.pr[data-id="MRJ-0476"]').count()===1);
  // الاستشهاد
  if(nm==='مكتب')await p.locator('#v-item article.pr[data-id="MRJ-0476"] [data-a="citedlg"]').click();else{await p.locator('#v-item article.pr[data-id="MRJ-0476"] [data-a="more"]').click();await p.waitForTimeout(300);await p.locator('.ash[data-a="citedlg"]').click();}
  await p.waitForTimeout(400);
  await p.locator('[data-cf="short"]').click();const s1=await p.locator('#citepv').innerText();
  ck(nm+': الصيغة المختصرة',s1.includes('الطعن رقم 523 لسنة 2020 عمالي — جلسة 26/5/2021')&&s1.startsWith('(تمييز'),s1);
  await p.locator('[data-cf="full"]').click();const s2=await p.locator('#citepv').innerText();ck(nm+': الكاملة فيها المصدر والصفحة',/، ص \d/.test(s2),s2);
  await p.locator('[data-cf="text"]').click();const s3=await p.locator('#citepv').innerText();ck(nm+': مع النص',s3.startsWith('«'),s3.slice(0,40));
  ck(nm+': الاختيار محفوظ',await p.evaluate(()=>localStorage.getItem('mabadi:citefmt'))==='"text"');
  await p.keyboard.press('Escape');
  // الاستشهاد الملصوق
  await go('#/search');await p.fill('#sq','الطعن رقم 523 لسنة 2020 عمالي جلسة 26/5/2021');await p.waitForTimeout(1200);
  const j=await p.locator('.jump [data-go]').evaluateAll(a=>a.map(x=>x.dataset.go));ck(nm+': الاستشهاد الملصوق يقترح الحكم',j.includes('#/r/523/2020@2021-05-26'),JSON.stringify(j));
  await p.fill('#sq','523-2020-L/4');await p.waitForTimeout(1200);
  ck(nm+': المعرّف الثابت في البحث',(await p.locator('.jump [data-go]').evaluateAll(a=>a.map(x=>x.dataset.go))).includes('#/t/523-2020-L/4'));
  // البيانات المفتوحة
  await go('#/data');ck(nm+': صفحة البيانات',await p.locator('#dsc').count()===1);
  if(nm==='مكتب'){await p.selectOption('#dsc','col:MQ45');
    let [dl]=await Promise.all([p.waitForEvent('download'),p.click('#dgo')]);let t=fs.readFileSync(await dl.path(),'utf8');
    ck(nm+': CSV بترويسة عربية وBOM',t.charCodeAt(0)===0xfeff&&t.includes('المعرّف الثابت')&&dl.suggestedFilename().endsWith('.csv'),dl.suggestedFilename());
    await p.click('[data-dfmt="json"]');[dl]=await Promise.all([p.waitForEvent('download'),p.click('#dgo')]);const J=JSON.parse(fs.readFileSync(await dl.path(),'utf8'));
    ck(nm+': JSON بالعدد والمعرّفات',J.count===J.items.length&&J.count>100&&J.items.filter(x=>x.ref).length>J.count*0.9,J.count);}
  // المحفوظات: استشهد بالكل
  await p.evaluate(()=>{localStorage.setItem('mabadi:favs',JSON.stringify({'MRJ-0476':{f:'عام',t:1},'V09L-0184':{f:'عام',t:2}}));location.hash='#/';});await p.reload();await p.waitForSelector('.gates',{timeout:30000});await go('#/saved');await p.waitForTimeout(800);
  const cs=await p.locator('[data-a2="citesaved"]').count();ck(nm+': «استشهد بالكل» في المحفوظات',cs===1,cs);
  if(cs){await p.click('[data-a2="citesaved"]');await p.waitForTimeout(400);ck(nm+': يجمع المبدأين',(await p.locator('#citepv').innerText()).split('«').length>=3);}
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck(nm+': لا تمرير أفقي',w<=1,w);
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
