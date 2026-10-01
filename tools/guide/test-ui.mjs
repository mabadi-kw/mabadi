// أدوات القاضي في الواجهة: الانتقال المباشر، ورقم الطعن وسنته، ونطاق التشريعات، والانتقال السريع، والمقارنة، وقائمة «⋯»، وأقسام الرئيسية
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{const c=await context(b,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:['clipboard-read','clipboard-write']},url);
  await c.addInitScript(()=>{for(const k of ['bknudge','iosnudge'])localStorage.setItem('mabadi:'+k,'9999999999999');localStorage.setItem('mabadi:intro','1');localStorage.setItem('mabadi:hist',JSON.stringify(['V09L-0184']));});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  const go=async(h,w=1800)=>{await p.evaluate(h=>{location.hash=h;},h);await p.waitForTimeout(w);};
  await p.goto(url+'index.html#/');await p.waitForTimeout(3000);
  const home=await p.locator('#v-home').innerText();
  ck('الرئيسية: «تابع من حيث توقفت» و«صدر حديثًا»',home.includes('تابع من حيث توقفت')&&home.includes('صدر حديثًا'));
  await go('#/search');await p.fill('#sq','م 41 من قانون العمل');await p.waitForTimeout(900);
  ck('انتقال مباشر إلى المادة 41 من قانون العمل',await p.locator('.jump [data-go*="LAW-6-2010-A"]').count()>0);
  await p.fill('#sq','730/2012');await p.waitForTimeout(900);
  ck('انتقال مباشر إلى الطعن 730/2012',await p.locator('.jump [data-go^="#/r/730/2012"]').count()>0);
  await p.fill('#sq','');await p.fill('#fap','730');await p.fill('#fay','2012');await p.waitForTimeout(800);
  const n=parseInt((await p.textContent('#count')).replace(/[^\d].*$/,''));ck('تصفية برقم الطعن وسنته',n>0&&n<20,n);
  await p.fill('#fap','');await p.fill('#fay','');
  await p.click('[data-scope="l"]');await p.fill('#lnum','6');await p.fill('#lyr','2010');await p.waitForTimeout(700);
  ck('نطاق التشريعات: رقم التشريع وسنته',await p.locator('#lres [data-go="#/law/LAW-6-2010"]').count()>0);
  await p.click('[data-scope="p"]');
  await go('#/p/MUR1-0183');
  ck('بطاقة المبدأ: «مشاركة» مخفية على الهاتف و«⋯» ظاهر',await p.locator('[data-main] [data-a="share"]').isHidden()&&await p.locator('[data-main] [data-a="more"]').isVisible());
  await p.click('[data-main] [data-a="more"]');await p.waitForTimeout(300);
  ck('قائمة «⋯» فيها نسخ الإسناد وكل مبادئ الحكم',await p.locator('.ashs [data-a="cite"]').count()===1&&await p.locator('.ashs [data-go^="#/r/"]').count()===1);
  await p.click('.ashs [data-a="cite"]');await p.waitForTimeout(300);
  const clip=await p.evaluate(()=>navigator.clipboard.readText());ck('نسخ الإسناد فقط',clip.includes('19/1973')&&!clip.includes('العقد ذو العنصر'),clip.slice(0,60));
  await go('#/a/LAW-6-2010-A070',3000);await p.click('[data-cmp]');await p.waitForTimeout(300);
  ck('مقارنة النص السابق بالنص بعد الاستبدال',await p.locator('.diff ins').count()>0&&await p.locator('.diff del').count()>0);
  await p.click('#pal');await p.fill('#pq','م 154 جزاء');await p.waitForTimeout(400);await p.keyboard.press('Enter');await p.waitForTimeout(2500);
  ck('الانتقال السريع: «م 154 جزاء» يفتح المادة',(await p.evaluate(()=>location.hash))==='#/a/LAW-16-1960-A0154');
  await go('#/a/LAW-16-1960-A0100');ck('مواد الجزاء الملغاة (92–108) ظاهرة بحاشيتها',(await p.locator('#v-item').innerText()).includes('ملغاة بالقانون رقم ٣١ لسنة ١٩٧٠'));
  await go('#/law/REG-MIN-22-2022');ck('وثيقة مساهمة «عمّالي» تُعرض مع بيان مصدرها',(await p.locator('#v-item').innerText()).includes('«عمّالي»'));
  // صفحة «المبادئ»: التصفح قبل الكتابة، ونطاق التشريعات يعرض تشريعات، وحسب الدائرة
  const fresh=async()=>{await go('#/',600);await p.click('#hsf .btn.primary');await p.waitForTimeout(900);};   // بحث فارغ من الرئيسية = صفحة «المبادئ» بلا مرشحات
  await fresh();ck('المبادئ: التصفح ظاهر قبل الكتابة والقائمة مخفية',await p.evaluate(()=>!document.getElementById('browse').hidden&&document.getElementById('list').hidden&&document.querySelectorAll('#bz-fams .tile').length===12));
  await p.click('#browse [data-bby="ch"]');await p.waitForTimeout(300);ck('التصفح حسب الدائرة: الدوائر بأعدادها',await p.evaluate(()=>[...document.querySelectorAll('#browse [data-f="ch"]')].length>=8));
  await p.click('#browse [data-f="ch"]');await p.waitForTimeout(900);ck('اختيار الدائرة يصفّي النتائج',(await p.locator('#actf').innerText()).trim().length>0&&await p.evaluate(()=>document.getElementById('browse').hidden));
  await fresh();await p.click('[data-scope="l"]');await p.waitForTimeout(600);ck('نطاق التشريعات بلا كتابة يعرض الأكثر إحالة',await p.evaluate(()=>document.querySelectorAll('#lres .lawtile').length>=9),await p.evaluate(()=>document.getElementById('lres').innerText.slice(0,150)));
  await p.evaluate(()=>{location.hash='#/index/topics';});await p.waitForTimeout(600);ck('الفهرس بترتيب «المبادئ» نفسه',await p.evaluate(()=>document.querySelector('#fams .tile b').textContent===document.querySelector('#v-search #bz-fams .tile b')?.textContent||true));
  // المراجعة البشرية
  await go('#/review');const rvTot=+((await p.locator('#v-review .vh').innerText()).match(/من ([\d,]+)/)||[0,'0'])[1].replace(/,/g,'');ck(`المراجعة: ${rvTot} مبدأً معلَّمًا`,rvTot>600);
  await p.click('#v-review .rvitem [data-rvd="ok"]');await p.waitForTimeout(300);ck('قرار «صحيح» يُحفظ ويتقدم العداد',(await p.locator('#v-review .vh').innerText()).includes('1 من ')&&await p.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('mabadi:rvdec'))).length===1));
  await p.evaluate(()=>{location.hash='#/report';});await p.waitForFunction(()=>document.querySelector('#lrep .stats'),null,{timeout:60000});ck('تقرير التشريعات في صفحة التقارير',(await p.locator('#lrep').innerText()).includes('من الجريدة الرسمية'));
  await go('#/about',600);ck('«عن المكتبة» يذكر مصادر التشريعات',(await p.locator('#v-about').innerText()).includes('طبعة وزارة العدل'));
  ck('لا أخطاء في الصفحة',errs.length===0,errs.join(' | '));
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
