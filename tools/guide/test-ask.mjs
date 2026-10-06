// اسأل المكتبة، وتسميات السنوات، ووسم الدائرة
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{for(const [nm,vp] of [['جوال',{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['مكتب',{viewport:{width:1280,height:900}}]]){
  const c=await context(b,vp,url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html#/');await p.waitForTimeout(3500);
  await p.waitForSelector('.askcta',{timeout:15000}).catch(()=>{});
  ck(nm+': بطاقة «اسأل المكتبة» في الرئيسية',await p.locator('form.askcta #haskq').count()===1);
  await p.locator('.askcta .ak').click();await p.waitForTimeout(800);
  ck(nm+': صفحة السؤال بأمثلة',await p.locator('.askex .chip').count()>=3);
  await p.fill('#askq','هل يستحق العامل مكافأة نهاية الخدمة إذا استقال قبل خمس سنوات');await p.locator('#askf button[type=submit]').click();
  const t0=Date.now();await p.waitForSelector('#askl',{timeout:20000});const ms=Date.now()-t0;console.log('   زمن الجواب الأول',ms,'ms');
  const n=await p.locator('#askl article.pr').count();ck(nm+': ثمانية مبادئ مرتبة',n===8,n);
  const txt=(await p.locator('#askl article.pr').first().innerText());ck(nm+': الأول يتصل بالاستقالة والمكافأة',/استقال/.test(txt)&&/مكافأ/.test(txt),txt.slice(0,160));
  ck(nm+': حقائق الجواب (الدوائر والمواد)',(await p.locator('.askfacts').innerText()).includes('عمالي')&&await p.locator('.aarts .chip').count()>0);
  await p.locator('#askmore').click();await p.waitForTimeout(400);ck(nm+': عرض المزيد',await p.locator('#askl article.pr').count()===18);
  const t1=Date.now();await p.evaluate(()=>{location.hash='#/ask/'+encodeURIComponent('تقادم دعوى العامل بعد انتهاء العقد');});await p.waitForSelector('#askl',{timeout:20000});console.log('   زمن السؤال الثاني',Date.now()-t1,'ms');
  ck(nm+': السؤال الثاني يتصل بالتقادم',/تقادم|تسقط|سقوط/.test(await p.locator('#askl article.pr').first().innerText()));
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(800);await p.fill('#sq','استقالة العامل قبل خمس سنوات مكافأة');await p.waitForTimeout(1200);
  ck(nm+': البحث متعدد الكلمات يقترح «اسأل المكتبة»',await p.locator('.askjump').count()===1);
  await p.locator('.askjump').click();await p.waitForSelector('#askl',{timeout:20000});ck(nm+': الاقتراح يفتح السؤال',(await p.inputValue('#askq')).includes('استقالة'));
  // وسم الدائرة
  ck(nm+': خيار المساعد الخارجي (بطاقة ظاهرة)',await p.locator('.askext [data-ext="claude"]').count()===1);
  await p.locator('[data-ext="copy"]').click();await p.waitForTimeout(300);
  ck(nm+': زر «اسأل المكتبة» في صفحة البحث',await p.evaluate(()=>{location.hash='#/search';return 1;})&&(await p.waitForTimeout(600),await p.locator('.askbtn').isVisible()));
  await p.goBack();await p.waitForTimeout(800);
  ck(nm+': وسم الدائرة في البطاقة',await p.locator('#askl .chtag').count()>0);
  // تسميات السنوات عند اختيار سنة
  await p.evaluate(()=>{location.hash='#/search';});await p.waitForTimeout(800);await p.fill('#sq','مكافأة نهاية الخدمة');await p.waitForTimeout(1500);
  await p.locator('.tlc[data-yr="2014"]').click();await p.waitForTimeout(1200);
  const labs=await p.evaluate(()=>[...document.querySelectorAll('.tlc .tly')].filter(e=>e.textContent).map(e=>{const r=e.getBoundingClientRect();return [e.textContent,r.left,r.right];}));
  let ov=0;labs.sort((a,b)=>a[1]-b[1]);for(let i=1;i<labs.length;i++)if(labs[i][1]<labs[i-1][2]+2)ov++;
  ck(nm+': لا تتداخل أرقام السنوات بعد الاختيار',ov===0,JSON.stringify(labs.map(x=>x[0])));
  // زر «مع الذكاء الاصطناعي»
  await p.evaluate(()=>{localStorage.removeItem('mabadi:aisvc');location.hash='#/';});await p.waitForTimeout(1200);
  ck(nm+': علامة صندوق «اسأل المكتبة» ليست علامة الذكاء الاصطناعي',await p.evaluate(()=>!document.querySelector('.askcta .ak').innerHTML.includes('M12 3l1.8')));
  await p.fill('#haskq','تقادم دعوى العامل');await p.locator('.askcta [data-askai]').click();await p.waitForTimeout(500);
  ck(nm+': أول مرة يسأل عن المساعد',await p.locator('.dlg.aidlg [data-aisv]').count()===3);
  await p.context().route(/claude\.ai|chatgpt\.com/,r=>r.fulfill({contentType:'text/html',body:'<p>ok</p>'}));
  const pop=p.context().waitForEvent('page',{timeout:8000}).catch(()=>null);
  await p.locator('[data-aisv="claude"]').click();const np=await pop;if(np)await np.waitForLoadState().catch(()=>{});
  ck(nm+': يفتح Claude ومعه السؤال',!!np&&/claude\.ai/.test(np.url()),np&&np.url().slice(0,60));if(np)await np.close();
  await p.waitForSelector('#askl',{timeout:20000});ck(nm+': وتبقى صفحة المبادئ للتحقق',(await p.inputValue('#askq')).includes('تقادم'));
  ck(nm+': الاختيار محفوظ ويظهر في البطاقة',(await p.locator('.askext h3').innerText()).includes('Claude'));
  ck(nm+': لا أخطاء',errs.length===0,errs.join(' | '));
  const w=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);ck(nm+': لا تمرير أفقي',w<=1,w);
  if(nm==='مكتب'){await p.evaluate(()=>{location.hash='#/ask/'+encodeURIComponent('هل يستحق العامل مكافأة نهاية الخدمة إذا استقال قبل خمس سنوات');});await p.waitForSelector('#askl');await p.screenshot({path:'out/ask.png'});}
  else{await p.evaluate(()=>{location.hash='#/ask/'+encodeURIComponent('هل يستحق العامل مكافأة نهاية الخدمة إذا استقال قبل خمس سنوات');});await p.waitForSelector('#askl');await p.screenshot({path:'out/ask-m.png'});}
  await c.close();}
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
