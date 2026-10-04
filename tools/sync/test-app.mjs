// اختبار المزامنة داخل التطبيق بمتصفح حقيقي: جهازان (حاسوب وآيفون) يتبادلان ملفًا مشفّرًا، مع الحذف والدمج والرمز الخاطئ والاستبدال،
// والترحيل من الصيغة القديمة، والتنبيهات، وزر الإضافة من السجل، وقياسات الواجهة. الاستعمال: node tools/sync/test-app.mjs (من المستودع، بعد npm i في tools/guide)
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
const req=createRequire(new URL('../guide/package.json',import.meta.url));
const {serve,browser,context,HERE}=await import('../guide/lib.mjs');
const OUT=path.join(HERE,'out','sync');fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const PASS='رمز-تجربة-2026',D=864e5;
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const {server,url}=await serve();const b=await browser();
async function dev(name,opts,seed){const c=await context(b,{acceptDownloads:true,...opts},url);
  // في الاختبار لا نافذة اختيار ملفات للنظام: يُعطَّل File System Access فيُستعمل التنزيل و<input type=file>
  await c.addInitScript(seed=>{delete window.showSaveFilePicker;delete window.showOpenFilePicker;delete window.showDirectoryPicker;
    if(!sessionStorage.getItem('seeded')){localStorage.clear();for(const k in seed)localStorage.setItem(k,seed[k]);localStorage.setItem('mabadi:intro','1');sessionStorage.setItem('seeded','1');}},seed||{});
  const p=await c.newPage();p.on('dialog',d=>d.accept());p.on('pageerror',e=>{bad++;console.log('✘ خطأ في صفحة',name,String(e));});
  await p.goto(url+'index.html#/saved');await p.waitForFunction(()=>document.querySelector('.shell')&&!document.getElementById('loading')&&typeof AmaliSync==='object',null,{timeout:120000});await p.waitForTimeout(600);return {c,p};}
const openSync=async p=>{await p.evaluate(()=>document.querySelector('[data-a2="settings"]').click());await p.waitForSelector('#syncsec');await p.evaluate(()=>document.getElementById('syncsec').scrollIntoView());await p.waitForSelector('#syncbox .syncstep');};
async function push(p,file){await openSync(p);const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#spush')]);const f=path.join(OUT,file);await dl.saveAs(f);await p.waitForTimeout(300);return f;}
async function pull(p,file,pass){await openSync(p);const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('#spull')]);await fc.setFiles(file);
  if(pass!==undefined){await p.waitForSelector('#spw',{timeout:8000});await p.fill('#spw',pass);await p.click('#spok');}await p.waitForTimeout(1200);}
// الحالة من التخزين المحلي والواجهة (التطبيق مغلق في دالة، فلا متغيرات عامة)
const st=async p=>{const toast=await p.evaluate(()=>document.getElementById('toast').textContent);await openSync(p);
  return p.evaluate(t=>{const g=k=>JSON.parse(localStorage.getItem('mabadi:'+k)||'null');return {fav:Object.keys(g('favs')||{}).sort(),fold:g('folders')||[],note:g('notes')||{},del:Object.keys((g('del')||{}).favs||{}),
    hasKey:!!document.querySelector('#syncbox .okdot'),dirty:!!document.querySelector('#syncbox .dirty'),toast:t};},toast);};
const visit=async(p,h)=>{await p.evaluate(h=>{location.hash=h;},h);await p.waitForTimeout(700);};

try{
  // الجهاز أ: حاسوب ببيانات بالصيغة القديمة (ملاحظات نصية ومجلدات بلا أوقات)
  const old=Date.now()-10*D;
  const A=await dev('A',{viewport:{width:1280,height:800}},{'mabadi:folders':JSON.stringify(['عام','قضية 12/2026']),
    'mabadi:favs':JSON.stringify({'V09L-0184':{f:'قضية 12/2026',t:old},'V09L-0016':{f:'عام',t:old+1}}),'mabadi:notes':JSON.stringify({'V09L-0184':'ملاحظة أولى'}),'mabadi:hist':JSON.stringify(['V09L-0193'])});
  let s=await A.p.evaluate(()=>{const g=k=>JSON.parse(localStorage.getItem('mabadi:'+k)||'{}');return {n:g('notest'),f:g('foldt'),u:g('favs')['V09L-0184'].updated};});
  ck('الترحيل: أوقات للملاحظات والمجلدات، والمفضلة تأخذ وقت حفظها',s.n['V09L-0184']&&s.f['قضية 12/2026']&&s.u===old);
  ck('التذكير بالنسخ الاحتياطي يظهر لبيانات عمرها أكثر من أسبوع',await A.p.waitForSelector('#nudge',{timeout:8000}).then(()=>true,()=>false));
  await A.p.click('#nudge [data-nu="later"]');ck('«لاحقًا» يخفي التذكير',!(await A.p.locator('#nudge').count()));
  // اعتماد الرمز والحفظ
  await openSync(A.p);await A.p.fill('#sp1','12345');await A.p.fill('#sp2','12345');await A.p.click('#spset');await A.p.waitForTimeout(300);
  ck('رمز أقصر من 6 يُرفض',!(await st(A.p)).hasKey);
  await A.p.fill('#sp1',PASS);await A.p.fill('#sp2',PASS);await A.p.click('#spset');await A.p.waitForTimeout(1500);
  ck('اعتماد الرمز',(await st(A.p)).hasKey);
  const F1=await push(A.p,'f1.amali');const env=JSON.parse(fs.readFileSync(F1,'utf8'));
  ck('الملف بغلاف «عمّالي» ومشفّر (لا نص ظاهر)',env.app==='amali-sync'&&env.kdf.iter===310000&&env.cipher==='AES-GCM-256'&&!fs.readFileSync(F1,'utf8').includes('V09L'));
  const AMALI=req('../../sync-core.js');const inner=await AMALI.decrypt(env,await AMALI.derive(PASS,AMALI.unb64(env.kdf.salt)));
  ck('المحتوى الداخلي mabadi-data بالأقسام الثلاثة، دون السجل والإعدادات',inner.app==='mabadi-data'&&inner.favorites.items['V09L-0184']&&inner.notes.items['V09L-0184'].x==='ملاحظة أولى'&&inner.folders.items['قضية 12/2026']&&!inner.hist&&!inner.settings);
  // الجهاز ب: آيفون فيه مفضلة خاصة به
  const B=await dev('B',{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:IPHONE},{'mabadi:favs':JSON.stringify({'V09L-0193':{f:'عام',t:Date.now()}})});
  ck('آيفون غير مثبّت: يظهر تنبيه التثبيت أولًا',(await B.p.locator('#nudge').textContent()||'').includes('الشاشة الرئيسية'));
  await B.p.click('#nudge [data-nu="ok"]');
  await openSync(B.p);ck('آيفون: زرّا «① قبل العمل» و«② بعد العمل»',(await B.p.textContent('#spull')).includes('①')&&(await B.p.textContent('#spush')).includes('②'));
  const ov=await B.p.evaluate(()=>{const d=document.querySelector('.dlg');return {sw:d.scrollWidth,cw:d.clientWidth,small:[...document.querySelectorAll('#syncbox .btn')].filter(x=>x.offsetParent&&x.getBoundingClientRect().height<44).length};});
  ck('واجهة المزامنة على 390: بلا تمرير أفقي، والأزرار ≥44',ov.sw<=ov.cw&&!ov.small,JSON.stringify(ov));
  await B.p.screenshot({path:path.join(OUT,'sync-iphone.png')});
  await pull(B.p,F1,'رمز-خطأ');let sb=await st(B.p);
  ck('رمز خاطئ: لا يُفتح ولا تتغير البيانات',sb.fav.join()==='V09L-0193'&&!sb.hasKey);
  await pull(B.p,F1,PASS);sb=await st(B.p);
  ck('الجلب بالرمز الصحيح يدمج (٢ من أ + ١ محلي) ويتبنّى المفتاح',sb.fav.join()==='V09L-0016,V09L-0184,V09L-0193'&&sb.hasKey&&sb.note['V09L-0184']==='ملاحظة أولى'&&sb.fold.includes('قضية 12/2026'));
  // ب يحذف مفضلة ويعدّل ملاحظة، ثم يحفظ
  await visit(B.p,'#/p/V09L-0016');await B.p.click('article.pr[data-id="V09L-0016"] [data-a="fav"]:visible');await B.p.click('#unfav');
  await visit(B.p,'#/p/V09L-0184');await B.p.click('article.pr[data-id="V09L-0184"] [data-a="more"]:visible');await B.p.click('.ashs [data-a="note"]');await B.p.fill('#nt','ملاحظة معدّلة');await B.p.click('#ns');
  ck('علامة «تغييرات لم تُحفظ» بعد التعديل من الواجهة',(await st(B.p)).dirty);
  const F2=await push(B.p,'f2.amali');
  // أ يجلب: الحذف يصل والملاحظة تتحدث والمفضلة الجديدة تُضاف، دون طلب الرمز
  await pull(A.p,F2);let sa=await st(A.p);
  ck('أ يجلب دون رمز: حُذفت المحذوفة، وأُضيفت الجديدة، وتحدّثت الملاحظة',sa.fav.join()==='V09L-0184,V09L-0193'&&sa.note['V09L-0184']==='ملاحظة معدّلة'&&sa.del.includes('V09L-0016'));
  await pull(A.p,F1);sa=await st(A.p);
  ck('ملف قديم لا يعيد ما حُذف',!sa.fav.includes('V09L-0016'));
  // الاستبدال بتأكيد مزدوج، ثم حارس الاستبدال، ثم التراجع
  await openSync(A.p);await A.p.click('.syncadv summary');const [fc]=await Promise.all([A.p.waitForEvent('filechooser'),A.p.click('#srep')]);await fc.setFiles(F1);await A.p.waitForTimeout(1200);sa=await st(A.p);
  ck('الاستبدال يجعل بيانات الجهاز مطابقة للملف',sa.fav.join()==='V09L-0016,V09L-0184'&&sa.note['V09L-0184']==='ملاحظة أولى');
  await pull(A.p,F1);ck('حارس الاستبدال: ملف أقدم من الاستبدال لا يُدمج',(await st(A.p)).toast.includes('أقدم من آخر استبدال'));
  await openSync(A.p);await A.p.click('.syncadv summary');await A.p.click('#sundo');await A.p.waitForTimeout(400);sa=await st(A.p);
  ck('التراجع عن آخر استبدال يعيد البيانات السابقة',sa.fav.join()==='V09L-0184,V09L-0193'&&sa.note['V09L-0184']==='ملاحظة معدّلة');
  await A.p.screenshot({path:path.join(OUT,'sync-desktop.png')});
  // السجل: زر الإضافة إلى المحفوظات
  await visit(A.p,'#/more');await visit(A.p,'#/saved');await A.p.waitForTimeout(500);await A.p.click('[data-st="hist"]');await A.p.waitForTimeout(300);
  await A.p.click('[data-hfav="V09L-0193"]');ck('زر النجمة في السجل يفتح حوار الحفظ',await A.p.locator('.dlg [data-fold]').count()>0);
  // النسخة الاحتياطية تُحسب في «آخر نسخة»
  await openSync(A.p);await Promise.all([A.p.waitForEvent('download'),A.p.click('#bk')]);
  ck('تصدير النسخة الاحتياطية يسجَّل وقتًا لآخر نسخة',await A.p.evaluate(()=>Date.now()-(JSON.parse(localStorage.getItem('mb_sync')||'{}').exported||0)<5000));
  await A.c.close();await B.c.close();
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
