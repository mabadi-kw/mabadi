// يسجّل فيديو تعريفيًا قصيرًا (نحو دقيقة ونصف) من التطبيق نفسه: بحث، فتح مبدأ، نسخ، صورة المصدر، التصفية، التشريعات، المحفوظات.
// تعليقات عربية أسفل الشاشة، بلا صوت، ببيانات حقيقية ودون أسماء. المخرجات: docs/intro.mp4 وdocs/intro.jpg
// الاستعمال: npm run video   (يحتاج ffmpeg في PATH لتحويل التسجيل إلى mp4)
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {serve,browser,context,ROOT,HERE,mkdirp} from './lib.mjs';
import {DEMO,QUERY} from './chapters.mjs';
const OUT=path.join(HERE,'out','video');fs.rmSync(OUT,{recursive:true,force:true});mkdirp(OUT);
const W=1280,H=720;
const SEED={'mabadi:folders':JSON.stringify(['عام','إنهاء الخدمة والمكافأة']),
 'mabadi:favs':JSON.stringify({'V09L-0184':{f:'إنهاء الخدمة والمكافأة',t:1},'V09L-0016':{f:'إنهاء الخدمة والمكافأة',t:2},'V09L-0246':{f:'عام',t:3}}),
 'mabadi:notes':JSON.stringify({'V09L-0184':'للرجوع إليه في مسائل الحرمان من المكافأة.'}),
 'mabadi:hist':JSON.stringify(['V09L-0184','V09L-0016','V09L-0246'])};

// طبقة العرض: شريط التعليق ومؤشر مرئي — تُحقن في كل صفحة
const OVERLAY=()=>{const mk=()=>{if(document.getElementById('vcap'))return;
  const st=document.createElement('style');st.textContent=`#vcap{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:2147483647;max-width:88%;
   background:rgba(11,31,59,.92);color:#fff;font:600 26px/1.6 Cairo,sans-serif;padding:10px 28px;border-radius:14px;border-bottom:4px solid #b8923a;
   box-shadow:0 8px 30px rgba(0,0,0,.25);text-align:center;direction:rtl;transition:opacity .35s;opacity:0;pointer-events:none}
   #vcap.on{opacity:1}#vcur{position:fixed;z-index:2147483647;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:rgba(184,146,58,.55);
   border:2px solid #fff;box-shadow:0 0 0 2px rgba(11,31,59,.5);pointer-events:none;left:-40px;top:-40px;transition:left .6s ease,top .6s ease,transform .15s}
   #vcur.dn{transform:scale(.7)}#vend{position:fixed;inset:0;z-index:2147483646;background:#0b1f3b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;color:#fff;direction:rtl}
   #vend h1{font:700 64px 'Reem Kufi',Cairo;margin:0}#vend p{font:500 26px Cairo;margin:0;color:#e9dcb8}#vend i{display:block;width:180px;height:5px;background:#b8923a}`;
  document.head.appendChild(st);const c=document.createElement('div');c.id='vcap';document.body.appendChild(c);
  const u=document.createElement('div');u.id='vcur';document.body.appendChild(u);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mk);else mk();};

async function ready(p){await p.waitForFunction(()=>document.querySelector('.shell')&&!document.getElementById('loading'),null,{timeout:120000}).catch(()=>{});
  await p.evaluate(OVERLAY);await p.waitForTimeout(300);}
const wait=(p,ms)=>p.waitForTimeout(ms);
async function cap(p,t,ms=2600){await p.evaluate(t=>{const c=document.getElementById('vcap');if(!c)return;if(!t){c.classList.remove('on');return;}c.textContent=t;c.classList.add('on');},t);if(ms)await wait(p,ms);}
async function point(p,sel){const el=typeof sel==='string'?p.locator(sel).first():sel;await el.scrollIntoViewIfNeeded().catch(()=>{});const b=await el.boundingBox();if(!b)return null;
  const x=b.x+b.width/2,y=b.y+b.height/2;await p.evaluate(([x,y])=>{const u=document.getElementById('vcur');if(u){u.style.left=x+'px';u.style.top=y+'px';}},[x,y]);await wait(p,700);return el;}
async function tap(p,sel){const el=await point(p,sel);if(!el)throw new Error('لم يوجد العنصر: '+sel);
  await p.evaluate(()=>document.getElementById('vcur')?.classList.add('dn'));await el.click();await wait(p,180);await p.evaluate(()=>document.getElementById('vcur')?.classList.remove('dn'));}
async function go(p,url,route){await cap(p,'',350);await p.evaluate(r=>{location.hash=r;},route);await wait(p,900);await p.evaluate(OVERLAY);}
async function scroll(p,dy,steps=6){for(let i=0;i<steps;i++){await p.mouse.wheel(0,dy/steps);await wait(p,120);}}

const {server,url}=await serve();const b=await browser();
try{
  const c=await context(b,{viewport:{width:W,height:H},deviceScaleFactor:1,recordVideo:{dir:OUT,size:{width:W,height:H}},permissions:['clipboard-read','clipboard-write']},url);
  await c.addInitScript(seed=>{if(!sessionStorage.getItem('seeded')){localStorage.clear();for(const k in seed)localStorage.setItem(k,seed[k]);sessionStorage.setItem('seeded','1');}},SEED);
  const p=await c.newPage();p.on('pageerror',e=>console.warn('خطأ في الصفحة:',String(e)));
  const t0=Date.now();
  await p.goto(url+'index.html#/');await ready(p);await wait(p,600);
  // ١. الافتتاح
  await cap(p,'مبادئ التمييز — مبادئ محكمة التمييز والتشريعات الكويتية في مكان واحد',3400);
  await cap(p,'مجانية، وتعمل دون اتصال، ولا ترسل شيئًا من جهازك',3000);
  // ٢. البحث
  await go(p,url,'#/search');
  await cap(p,'ابحث بكلمة أو عبارة أو رقم طعن أو رقم مادة',0);
  await tap(p,'#sq');await p.locator('#sq').pressSequentially(QUERY,{delay:110});await wait(p,1600);
  await cap(p,'النتائج تظهر أثناء الكتابة، والكلمات المطابقة مظللة',2800);
  await scroll(p,420);await wait(p,1200);await scroll(p,-420);await wait(p,500);
  // ٣. التصفية
  await cap(p,'ضيّق النتائج بالقانون ورقم المادة',0);
  await tap(p,'#ftog');await wait(p,500);await point(p,'#flw');await p.selectOption('#flw','6/2010');await wait(p,700);
  await tap(p,'#fart');await p.locator('#fart').pressSequentially('41',{delay:160});await wait(p,2200);
  // ٤. المبدأ
  await go(p,url,'#/p/'+DEMO);await wait(p,600);
  await cap(p,'نص المبدأ حرفيًا كما في مصدره، مع رقم الطعن وتاريخ الجلسة',3400);
  await cap(p,'«نسخ» ينسخه مع الإسناد، جاهزًا للإيراد في المذكرات والأحكام',0);
  await tap(p,`article.pr[data-id="${DEMO}"] [data-a="copy"]:visible`);await wait(p,2600);
  // ٥. صورة المصدر
  await cap(p,'وكل مبدأ مربوط بصورة صفحته في الكتاب الأصلي',0);
  await tap(p,`article.pr[data-id="${DEMO}"] [data-a="src"]:visible`);await wait(p,1200);
  await p.keyboard.press('Escape');await scroll(p,380,8);await wait(p,3000);
  // ٦. التشريعات
  await go(p,url,'#/laws');
  await cap(p,'التشريعات: القوانين والمراسيم واللوائح مادةً مادة',3000);
  await go(p,url,'#/a/LAW-67-1980-A0001');await wait(p,500);
  await cap(p,'لكل مادة صورة صفحتها، وحاشية الطبعة، والمذكرة الإيضاحية، والمبادئ التي تحيل إليها',3800);
  await scroll(p,500);await wait(p,1400);
  // ٧. المحفوظات
  await go(p,url,'#/saved');
  await cap(p,'احفظ ما تحتاجه في مجلداتك، وأضف ملاحظاتك — كلها في جهازك فقط',3600);
  // ٨. الختام
  await cap(p,'',0);
  await p.evaluate(()=>{const d=document.createElement('div');d.id='vend';document.getElementById('vcur')?.remove();d.innerHTML='<h1>مبادئ التمييز</h1><i></i><p>الدليل المصوّر متاح من الإعدادات</p>';document.body.appendChild(d);});
  await wait(p,3200);
  const dur=(Date.now()-t0)/1000;const vid=p.video();await c.close();
  const webm=await vid.path();console.log('مدة التسجيل التقريبية:',dur.toFixed(0),'ث');
  const mp4=path.join(ROOT,'docs','intro.mp4'),jpg=path.join(ROOT,'docs','intro.jpg');mkdirp(path.dirname(mp4));
  // يُقصّ أول نصف ثانية (شاشة التحميل البيضاء) ويُحوَّل H.264 بلا صوت، مع faststart للتشغيل الفوري
  execFileSync('ffmpeg',['-y','-loglevel','error','-ss','0.6','-i',webm,'-an','-c:v','libx264','-preset','slow','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart','-r','25',mp4]);
  execFileSync('ffmpeg',['-y','-loglevel','error','-ss','2.5','-i',mp4,'-frames:v','1','-q:v','3',jpg]);
  console.log('الفيديو:',path.relative(ROOT,mp4),(fs.statSync(mp4).size/1e6).toFixed(1),'MB — الغلاف:',path.relative(ROOT,jpg));
}finally{await b.close();server.close();}
