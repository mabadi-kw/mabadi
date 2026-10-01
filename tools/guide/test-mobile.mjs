// فحص الواجهة على الجوال (آيفون وأندرويد): لا تمرير أفقي في أي صفحة، سهم الرجوع، ثبات مربع البحث وحده،
// البحث داخل قوائم التصفية، فتح الدليل وإغلاقه، ورأس نافذة الملاحظات، وحجم خط الحقول (يمنع تكبير iOS).
import path from 'node:path';import fs from 'node:fs';
import {serve,browser,context,HERE} from './lib.mjs';
const OUT=path.join(HERE,'out','mobile');fs.mkdirSync(OUT,{recursive:true});
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const DEVS={iphone:{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'},
  android:{viewport:{width:412,height:915},deviceScaleFactor:2.6,isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'},
  small:{viewport:{width:360,height:740},deviceScaleFactor:3,isMobile:true,hasTouch:true}};
const ROUTES=['#/','#/search','#/p/V09L-0184','#/index/topics','#/index/law/6%2F2010','#/laws','#/law/LAW-6-2010','#/a/LAW-67-1980-A0001','#/m/LAW-67-1980','#/saved','#/more','#/report','#/about'];
const {server,url}=await serve();const b=await browser();
try{for(const [dn,opt] of Object.entries(DEVS)){const c=await context(b,opt,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:intro','1');localStorage.setItem('mabadi:iosnudge','9999999999999');});
  const p=await c.newPage();p.on('pageerror',e=>{bad++;console.log('✘ خطأ',dn,String(e));});
  await p.goto(url+'index.html#/');await p.waitForFunction(()=>document.querySelector('.shell')&&!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(800);
  const wide=[];for(const r of ROUTES){await p.evaluate(r=>{location.hash=r;},r);await p.waitForTimeout(1300);
    const m=await p.evaluate(()=>({sw:document.documentElement.scrollWidth,w:innerWidth,back:!document.getElementById('hback').hidden}));
    if(m.sw>m.w+1)wide.push(`${r} (${m.sw}>${m.w})`);if((r==='#/')===m.back)wide.push(`${r}: سهم الرجوع ${m.back?'ظاهر':'مخفي'}`);}
  ck(`${dn}: لا تمرير أفقي في ${ROUTES.length} صفحة، وسهم الرجوع في كل صفحة عدا الرئيسية`,!wide.length,wide.join(' | '));
  // سهم الرجوع يعود للصفحة السابقة
  await p.evaluate(()=>{location.hash='#/laws';});await p.waitForTimeout(900);await p.evaluate(()=>{location.hash='#/law/LAW-6-2010';});await p.waitForTimeout(1200);
  await p.click('#hback');await p.waitForTimeout(800);ck(`${dn}: سهم الرجوع يعود إلى الصفحة السابقة`,(await p.evaluate(()=>location.hash))==='#/laws');
  // البحث: المربع وحده ثابت، والتلميح والعداد يمرّان مع الصفحة
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(900);await p.fill('#sq','مكافأة نهاية الخدمة');await p.waitForTimeout(1500);
  await p.evaluate(()=>scrollTo(0,1800));await p.waitForTimeout(500);
  const st=await p.evaluate(()=>{const sb=document.querySelector('#v-search .searchbar').getBoundingClientRect(),h=document.querySelector('#v-search>.hint').getBoundingClientRect();return {sbTop:sb.top,sbH:sb.height,hintBottom:h.bottom};});
  ck(`${dn}: عند التمرير يبقى مربع البحث وحده (ارتفاعه ${Math.round(st.sbH)}px) والتلميح يختفي`,st.sbTop>=0&&st.sbTop<5&&st.sbH<80&&st.hintBottom<0,JSON.stringify(st));
  await p.screenshot({path:path.join(OUT,`${dn}-search-scrolled.png`)});
  // البحث داخل قائمة الموضوعات
  await p.evaluate(()=>scrollTo(0,0));await p.click('#ftog');await p.waitForTimeout(300);
  const all=await p.$$eval('#ftp option',o=>o.length);await p.fill('.fsrch[data-for="ftp"]','مكافاه');await p.waitForTimeout(200);
  const opts=await p.$$eval('#ftp option',o=>o.map(x=>x.textContent));
  ck(`${dn}: صندوق البحث فوق «الموضوع» يضيّق القائمة (${all} ← ${opts.length}) ويتجاهل الهمزة والتاء`,opts.length>1&&opts.length<all&&opts.slice(1).every(t=>/مكاف/.test(t)),opts.slice(0,4).join('، '));
  await p.selectOption('#ftp',{index:1});await p.waitForTimeout(600);ck(`${dn}: الاختيار من القائمة المضيّقة يصفّي النتائج`,(await p.textContent('#actf')).length>0);
  await p.fill('.fsrch[data-for="flw"]','6/2010');await p.waitForTimeout(200);ck(`${dn}: البحث برقم القانون في قائمة «القانون»`,(await p.$$eval('#flw option',o=>o.length))<=4);
  await p.screenshot({path:path.join(OUT,`${dn}-filters.png`)});
  const fonts=await p.$$eval('input,select,textarea',els=>els.filter(e=>e.offsetParent).map(e=>parseFloat(getComputedStyle(e).fontSize)).filter(f=>f<16));
  ck(`${dn}: كل الحقول بخط 16px فأكثر (لا تكبير تلقائي في iOS)`,!fonts.length,fonts.join(','));
  // الدليل يُفتح داخل التطبيق ويُغلق بزر الإغلاق وبالرجوع
  await p.evaluate(()=>{location.hash='#/more';});await p.waitForTimeout(900);await p.click('[data-a2="guide"]');await p.waitForTimeout(1500);
  const gv=await p.evaluate(()=>{const f=document.querySelector('#gview iframe');return f&&{src:f.getAttribute('src'),top:document.querySelector('.gvtop').getBoundingClientRect().height};});
  ck(`${dn}: «الدليل» يفتح داخل التطبيق من «المزيد» على الغلاف`,gv&&gv.src.endsWith('#top'),JSON.stringify(gv));
  const fr=p.frame({url:/guide\/index\.html/});ck(`${dn}: نسخة الويب من الدليل تُحمَّل`,!!fr&&(await fr.locator('#top').count())===1);
  await p.screenshot({path:path.join(OUT,`${dn}-guide.png`)});
  await p.click('#gvx');await p.waitForTimeout(500);ck(`${dn}: «إغلاق» يغلق الدليل ويبقى في الصفحة نفسها`,!(await p.$('#gview'))&&(await p.evaluate(()=>location.hash))==='#/more');
  await p.click('[data-a2="guide"]');await p.waitForTimeout(600);await p.goBack();await p.waitForTimeout(500);ck(`${dn}: زر الرجوع في الجهاز يغلق الدليل`,!(await p.$('#gview'))&&(await p.evaluate(()=>location.hash))==='#/more');
  // نافذة الملاحظات: زر الإغلاق يعمل
  await p.evaluate(()=>document.querySelector('[data-a2="rate"]').click());await p.waitForSelector('.fbx');
  const fx=await p.evaluate(()=>{const t=document.querySelector('.fbtop'),x=t.querySelector('.btn');const r=x.getBoundingClientRect();return {h:r.height,w:r.width};});
  await p.click('.fbtop .btn');await p.waitForTimeout(300);ck(`${dn}: زر إغلاق الملاحظات ≥44px ويغلق`,fx.h>=44&&fx.w>=44&&!(await p.$('.fbx')),JSON.stringify(fx));
  await c.close();}
  // الجولة التعريفية: تظهر لأول مرة فقط، و«تخطٍّ» يغلقها، وآخر شريحة تشرح التثبيت على الآيفون
  {const c=await context(b,DEVS.iphone,url);const p=await c.newPage();p.on('pageerror',e=>{bad++;console.log('✘ خطأ',String(e));});
    await p.goto(url+'index.html#/');await p.waitForSelector('#intro',{timeout:120000});
    let n=0;while(await p.$('#itskip')){await p.click('#itnext');n++;if(n>10)break;}
    const last=await p.textContent('#intro .islide');await p.screenshot({path:path.join(OUT,'intro-install.png')});
    ck('الجولة: 6 شرائح، وآخرها خطوات «إضافة إلى الشاشة الرئيسية» في الآيفون',n===5&&last.includes('إضافة إلى الشاشة الرئيسية'),`${n} | ${last.slice(0,80)}`);
    await p.click('#itnext');await p.waitForTimeout(200);await p.reload();await p.waitForTimeout(4000);ck('الجولة لا تظهر ثانية بعد إنهائها',!(await p.$('#intro')));
    await p.evaluate(()=>localStorage.removeItem('mabadi:intro'));await p.reload();await p.waitForSelector('#intro');await p.screenshot({path:path.join(OUT,'intro-1.png')});
    await p.click('#itskip');ck('«تخطٍّ» يغلق الجولة',!(await p.$('#intro')));
    // ترتيب بطاقات الرئيسية
    // ترتيب البطاقات في صفحة «المبادئ»: بالسحب، وبالأسهم بديلًا، ويُحفظ
    await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(1200);
    const first=()=>p.$eval('#bz-cols .tile.book b',e=>e.textContent);const before=await first();
    await p.click('#browse [data-arrmode="cols"]');await p.waitForTimeout(900);ck('وضع الترتيب: مقابض ظاهرة وبطاقات متقطعة الإطار',await p.$eval('#bz-cols',g=>g.classList.contains('arranging')&&getComputedStyle(g.querySelector('.grip')).display!=='none'));
    const tiles=await p.$$('#bz-cols .tile');const a=await tiles[1].boundingBox(),c0=await tiles[0].boundingBox();const second=await tiles[1].$eval('b',e=>e.textContent);
    await p.mouse.move(a.x+40,a.y+30);await p.mouse.down();await p.mouse.move(a.x+40,a.y+10,{steps:4});await p.mouse.move(c0.x+40,c0.y+20,{steps:10});await p.waitForTimeout(250);await p.screenshot({path:path.join(OUT,'arrange.png')});await p.mouse.up();await p.waitForTimeout(300);
    ck(`السحب والإفلات: «${second}» صار الأول`,(await first())===second&&second!==before);
    await p.reload();await p.waitForTimeout(4000);await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(1200);ck('الترتيب يبقى بعد إعادة التحميل ويظهر في الرئيسية',(await first())===second);
    await p.click('#browse [data-arrmode="cols"]');await p.waitForTimeout(600);await p.click('#browse [data-arrange="cols"]');await p.waitForSelector('.arr');const lastName=await p.$eval('.arr li:last-child b',e=>e.textContent);
    await p.click('.arr li:last-child [data-mv="top"]');await p.waitForTimeout(200);await p.click('.dlg [data-close].btn.primary');await p.waitForTimeout(300);ck(`بالأسهم: «${lastName}» صار الأول`,(await first())===lastName);
    await p.click('#browse [data-arrdef="cols"]');await p.waitForTimeout(300);ck('«الترتيب الأصلي» يعيده',(await first())===before);
    await p.evaluate(()=>{location.hash='#/';});await p.waitForTimeout(900);
    await p.evaluate(()=>document.querySelector('[data-a2="settings"]').click());await p.waitForSelector('.verline');ck('رقم الإصدار ظاهر في الإعدادات',/الإصدار \d{4}\.\d{2}\.\d{2}/.test(await p.textContent('.verline')));
    await c.close();}
  // الآيباد: زر «طباعة» لا يتداخل مع رابط «الدليل»
  for(const [n,vp] of [['ipad-land',{width:1180,height:820}],['ipad-port',{width:820,height:1180}]]){const c=await context(b,{viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true},url);
    await c.addInitScript(()=>{localStorage.setItem('mabadi:intro','1');localStorage.setItem('mabadi:bknudge','9999999999999');});const p=await c.newPage();
    const bad2=[];for(const r of ['#/p/V09L-0184','#/a/LAW-67-1980-A0001','#/law/LAW-6-2010','#/saved']){await p.goto(url+'index.html'+r);await p.waitForTimeout(3500);
      const ov=await p.evaluate(()=>{const v=document.querySelector('.view:not([hidden])')||document,g=[...document.querySelectorAll('.guidelnk')].find(e=>e.offsetParent);if(!g)return null;const a=g.getBoundingClientRect();
        return [...document.querySelectorAll('.vh .btn, .vh h2')].filter(e=>e.offsetParent).some(e=>{const r=e.getBoundingClientRect();return !(r.right<=a.left||r.left>=a.right||r.bottom<=a.top||r.top>=a.bottom);});});
      if(ov)bad2.push(r);}
    await p.goto(url+'index.html#/p/V09L-0184');await p.waitForTimeout(3500);await p.screenshot({path:path.join(OUT,n+'-item.png')});
    ck(`${n}: رابط «الدليل» لا يتداخل مع أزرار الرأس`,!bad2.length,bad2.join(', '));await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
