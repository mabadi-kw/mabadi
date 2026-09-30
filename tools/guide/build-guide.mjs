// يبني دليل الاستخدام المصوّر: يلتقط الصور من التطبيق نفسه، ويولّد صفحة HTML، ويطبعها PDF إلى docs/guide.pdf
// ثم يتحقق أن جدول GUIDE في app.js (القسم ← الصفحة) مطابق لصفحات الدليل. الاستعمال: npm run guide  (أو guide:fix لتحديث الجدول)
import fs from 'node:fs';import path from 'node:path';
import {serve,browser,context,ROOT,HERE,mkdirp,fontCSS} from './lib.mjs';
import {CHAPTERS,DEMO,QUERY} from './chapters.mjs';
const OUT=path.join(HERE,'out');const SHOTS=path.join(OUT,'shots');mkdirp(SHOTS);
const FIX=process.argv.includes('--fix');const SKIPSHOTS=process.argv.includes('--no-shots');
const DEV={d:{viewport:{width:1280,height:800},deviceScaleFactor:1.5},m:{viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}};
// بيانات تجريبية محلية: مجلد محفوظات بمبادئ حقيقية، دون أي اسم شخص
const SEED={'mabadi:folders':JSON.stringify(['عام','إنهاء الخدمة والمكافأة']),
 'mabadi:favs':JSON.stringify({'V09L-0184':{f:'إنهاء الخدمة والمكافأة',t:1},'V09L-0016':{f:'إنهاء الخدمة والمكافأة',t:2},'V09L-0246':{f:'عام',t:3}}),
 'mabadi:notes':JSON.stringify({'V09L-0184':'للرجوع إليه في مسائل الحرمان من المكافأة.'}),
 'mabadi:hist':JSON.stringify(['V09L-0184','V09L-0016','V09L-0246']),'mabadi:qhist':JSON.stringify([QUERY])};
async function ready(p){await p.waitForFunction(()=>document.querySelector('.shell')&&!document.getElementById('loading'),null,{timeout:120000}).catch(()=>{});await p.waitForTimeout(400);}
async function act(p,a,dev){
  if(a==='search'){await p.fill('#sq',QUERY);await p.waitForTimeout(1200);}
  if(a==='filters'){await p.click('#ftog');await p.selectOption('#flw','6/2010');await p.fill('#fart','41');await p.waitForTimeout(900);}
  if(a==='share'){await p.click(`article.pr[data-id="${DEMO}"] [data-a="share"]`);await p.waitForTimeout(400);}
  if(a==='src'){await p.click(`article.pr[data-id="${DEMO}"] [data-a="src"]`);await p.waitForTimeout(1500);}
  if(a==='ruling'){await p.click(`article.pr[data-id="${DEMO}"] .rk`);await p.waitForTimeout(800);}
  if(a==='offline'){await p.click('#v-more [data-a2="offline"]');await p.waitForTimeout(400);}
  if(a==='settings'){await p.evaluate(()=>document.querySelector('[data-a2="settings"]').click());await p.waitForTimeout(400);}
  if(a==='dark'){await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('mabadi:settings')||'{}');S.theme='dark';localStorage.setItem('mabadi:settings',JSON.stringify(S));});await p.reload();await ready(p);await p.waitForTimeout(600);}
  if(a==='feedback'){await p.evaluate(()=>document.querySelector('#v-more [data-a2="rate"]').click());await p.waitForSelector('.fbx');
    await p.click('.fbsec[data-k="search"] [data-v="easy"]');await p.click('.fbsec[data-k="read"] [data-v="ok"]');await p.click('.fbsec[data-k="read"] [data-p="ينقصه شيء"]');await p.waitForTimeout(300);}
}
async function shoot(b,url){
  const list=[];for(const ch of CHAPTERS)for(const s of ch.shots)for(const dv of ['d','m'])list.push([ch,s,dv]);
  for(const dv of ['d','m']){const c=await context(b,DEV[dv],url);
    await c.addInitScript(seed=>{if(!sessionStorage.getItem('seeded')){localStorage.clear();for(const k in seed)localStorage.setItem(k,seed[k]);sessionStorage.setItem('seeded','1');}},SEED);
    const p=await c.newPage();p.on('pageerror',e=>console.warn('خطأ في الصفحة:',String(e)));
    await p.goto(url+'index.html');await ready(p);
    for(const [ch,s,d] of list.filter(x=>x[2]===dv)){
      await p.evaluate(()=>{const S=JSON.parse(localStorage.getItem('mabadi:settings')||'{}');if(S.theme==='dark'){S.theme='auto';localStorage.setItem('mabadi:settings',JSON.stringify(S));}});
      await p.goto(url+'index.html'+s.route);await p.reload();await ready(p);
      await p.waitForTimeout(700);
      if(s.act)await act(p,s.act,dv);
      const f=path.join(SHOTS,`${s.name}-${dv}.jpg`);
      const crop=dv==='d'&&!s.full&&!(await p.$('.fbx'));
      await p.screenshot({path:f,type:'jpeg',quality:82,...(crop?{clip:{x:0,y:0,width:1004,height:800}}:{})});
      await p.keyboard.press('Escape').catch(()=>{});
      console.log('لقطة',s.name,dv);}
    await c.close();}
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function html(pages){const F=fontCSS('../fonts/');
  const toc=CHAPTERS.map((c,i)=>`<li><span class="tn">${i+1}</span><span class="tt">${esc(c.title)}</span><span class="dots"></span><span class="tp">${pages[c.key]||'…'}</span></li>`).join('');
  const chap=(c,i)=>`<section class="ch"><span class="mk">GUIDECH:${c.key}:END</span>
   <header class="chh"><span class="chn">${i+1}</span><h2>${esc(c.title)}</h2></header>
   <p class="what">${esc(c.what)}</p>
   <h3>خطوات الاستعمال</h3><ol class="steps">${c.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
   ${c.tips&&c.tips.length?`<div class="tips">${c.tips.map(t=>`<p><b>تنبيه:</b> ${esc(t)}</p>`).join('')}</div>`:''}
   ${c.shots.map(s=>`<figure class="shot"><div class="pair"><div class="dsk"><img src="shots/${s.name}-d.jpg" alt=""><figcaption>الحاسوب</figcaption></div><div class="mob"><img src="shots/${s.name}-m.jpg" alt=""><figcaption>الآيفون</figcaption></div></div><figcaption class="cap">${esc(s.caption)}</figcaption></figure>`).join('')}
  </section>`;
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>دليل استخدام مبادئ التمييز</title><style>${F}
  @page{size:A4;margin:14mm 14mm 16mm}
  :root{--navy:#0b1f3b;--navy2:#12325e;--gold:#b8923a;--gold-soft:#f3ead3;--ivory:#f4f1ea;--ink:#10213b;--muted:#5e6b80;--rule:#e4ddcc}
  body{margin:0;font-family:Cairo,sans-serif;color:var(--ink);font-size:10.5pt;line-height:1.8}
  .cover{height:265mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10mm;background:var(--navy);color:#fff;border-radius:6mm;position:relative;overflow:hidden;break-after:page}
  .cover svg.sadu{position:absolute;inset:0;width:100%;height:100%;opacity:.12}
  .cover h1{font-family:'Reem Kufi';font-size:44pt;margin:0;color:#fff;position:relative}
  .cover p{margin:0;font-size:15pt;color:#e9dcb8;position:relative}.cover .line{width:60mm;height:1.2mm;background:var(--gold);position:relative}
  .toc{break-after:page}.toc h2,.chh h2{font-family:'Reem Kufi';color:var(--navy2);margin:0}
  .toc ol{list-style:none;padding:0;margin:8mm 0 0}.toc li{display:flex;align-items:baseline;gap:3mm;padding:2.2mm 0;border-bottom:.2mm solid var(--rule);font-size:12pt}
  .tn{display:inline-grid;place-items:center;width:8mm;height:8mm;border-radius:2mm;background:var(--gold-soft);color:var(--navy2);font-weight:700;font-size:10pt}.tt{white-space:nowrap}.dots{flex:1}.tp{font-weight:700;color:var(--gold)}
  .ch{break-before:page}.mk{font-size:3px;color:#fff;line-height:3px;display:block;height:3px;font-family:sans-serif}
  .chh{display:flex;align-items:center;gap:4mm;border-bottom:1.2mm solid var(--gold);padding-bottom:3mm;margin-bottom:4mm}
  .chn{display:grid;place-items:center;width:11mm;height:11mm;border-radius:3mm;background:var(--navy);color:#fff;font-family:'Reem Kufi';font-size:15pt}
  .chh h2{font-size:20pt}.what{font-size:11pt;background:var(--ivory);border-radius:3mm;padding:3mm 4mm;margin:0 0 3mm}
  h3{font-size:12pt;color:var(--navy2);margin:4mm 0 1mm}.steps{margin:0;padding-inline-start:6mm}.steps li{margin:1mm 0}.steps li::marker{color:var(--gold);font-weight:700}
  .tips{margin:3mm 0;border-inline-start:1.2mm solid var(--gold);background:var(--gold-soft);padding:2mm 4mm;border-radius:2mm}.tips p{margin:.5mm 0}
  .shot{margin:5mm 0 0;break-inside:avoid}.pair{display:flex;gap:4mm;align-items:flex-start}.dsk{flex:1}.mob{width:42mm;flex:none}
  .pair img{width:100%;border:.3mm solid var(--rule);border-radius:2mm;display:block}.mob img{border-radius:4mm}
  .pair figcaption{font-size:8pt;color:var(--muted);text-align:center}.cap{font-size:9.5pt;color:var(--navy2);font-weight:600;text-align:center;margin-top:1mm}
  </style></head><body>
  <div class="cover"><svg class="sadu" viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice"><defs><pattern id="p" width="24" height="16" patternUnits="userSpaceOnUse"><path d="M12 2 L20 8 L12 14 L4 8 Z M12 5 L16 8 L12 11 L8 8 Z" fill="none" stroke="#b8923a" stroke-width=".8"/><path d="M0 0 H24 M0 16 H24" stroke="#b8923a" stroke-width=".6" stroke-dasharray="2 2"/></pattern></defs><rect width="120" height="80" fill="url(#p)"/></svg>
   <svg width="90" height="90" viewBox="0 0 512 512" style="position:relative"><rect x="96" y="340" width="320" height="50" rx="8" fill="#b8923a"/><rect x="126" y="282" width="260" height="50" rx="8" fill="#c9a44b"/><path d="M156 224 H356 L336 264 H176 Z" fill="#e3c77f"/><polygon points="256,110 282,146 256,182 230,146" fill="#f2dc9e"/></svg>
   <h1>مبادئ التمييز</h1><div class="line"></div><p>دليل الاستخدام المصوّر</p></div>
  <div class="toc"><h2>المحتويات</h2><ol>${toc}</ol></div>
  ${CHAPTERS.map(chap).join('')}</body></html>`;}
async function render(b,url,pages,file){const c=await b.newContext();const p=await c.newPage();
  fs.writeFileSync(path.join(OUT,'guide.html'),html(pages));
  await p.goto(url+'tools/guide/out/guide.html');await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(500);
  await p.pdf({path:file,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',
    footerTemplate:'<div style="width:100%;text-align:center;font-size:8px;color:#8a7a55;font-family:sans-serif"><span class="pageNumber"></span></div>',margin:{top:'14mm',bottom:'16mm',left:'14mm',right:'14mm'}});
  await c.close();}
export async function pdfPages(file){const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc=await pdfjs.getDocument({data:new Uint8Array(fs.readFileSync(file)),verbosity:0}).promise;const map={};
  for(let i=1;i<=doc.numPages;i++){const t=(await(await doc.getPage(i)).getTextContent()).items.map(x=>x.str).join('');
    for(const m of t.matchAll(/GUIDECH:([a-z]+):END/g))if(!map[m[1]])map[m[1]]=i;}
  return {map,n:doc.numPages};}
export function appTable(){const s=fs.readFileSync(path.join(ROOT,'app.js'),'utf8');const m=s.match(/const GUIDE=(\{[^}]*\});/);return m?JSON.parse(m[1].replace(/(\w+):/g,'"$1":')):null;}
function writeTable(map){const f=path.join(ROOT,'app.js');let s=fs.readFileSync(f,'utf8');const t='const GUIDE='+JSON.stringify(map).replace(/"(\w+)":/g,'$1:')+';';
  s=s.match(/const GUIDE=\{[^}]*\};/)?s.replace(/const GUIDE=\{[^}]*\};/,t):s;fs.writeFileSync(f,s);}
if(import.meta.url===`file://${process.argv[1]}`){
  const {server,url}=await serve();const b=await browser();
  try{
    if(!SKIPSHOTS)await shoot(b,url);
    const tmp=path.join(OUT,'pass1.pdf');await render(b,url,{},tmp);let {map}=await pdfPages(tmp);
    const dst=path.join(ROOT,'docs','guide.pdf');mkdirp(path.dirname(dst));await render(b,url,map,dst);
    const fin=await pdfPages(dst);
    if(JSON.stringify(fin.map)!==JSON.stringify(map))console.warn('تنبيه: تغيّرت أرقام الصفحات بين الطبعتين؛ أعد التشغيل.');
    fs.writeFileSync(path.join(ROOT,'docs','guide-pages.json'),JSON.stringify(fin.map,null,1));
    if(Object.keys(fin.map).length!==CHAPTERS.length)throw new Error('لم تُعثر على كل علامات الفصول في PDF: '+Object.keys(fin.map).join(','));
    const tab=appTable();const diff=Object.keys(fin.map).filter(k=>!tab||tab[k]!==fin.map[k]);
    console.log(`الدليل: docs/guide.pdf — ${fin.n} صفحة`);console.log('صفحات الفصول:',fin.map);
    if(diff.length){if(FIX){writeTable(fin.map);console.log('حُدِّث جدول GUIDE في app.js.');}else{console.warn('تنبيه: جدول GUIDE في app.js لا يطابق الدليل في:',diff.join('، '),'— شغّل npm run guide:fix');process.exitCode=2;}}
    else console.log('جدول GUIDE في app.js مطابق للدليل.');
  }finally{await b.close();server.close();}
}
