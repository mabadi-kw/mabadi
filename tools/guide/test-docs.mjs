// اختبار: روابط «الدليل» في كل قسم تفتح الصفحة الصحيحة، والدليل والفيديو موجودان.
import fs from 'node:fs';import path from 'node:path';
import {ROOT,serve,browser,context} from './lib.mjs';
import {pdfPages,appTable} from './build-guide.mjs';
import {CHAPTERS} from './chapters.mjs';
let bad=0;const ok=(c,m)=>{console.log((c?'✔ ':'✘ ')+m);if(!c)bad++;};
const pdf=path.join(ROOT,'docs','guide.pdf');ok(fs.existsSync(pdf),'الدليل موجود: docs/guide.pdf');
const {map}=await pdfPages(pdf);const tab=appTable();
for(const c of CHAPTERS)ok(tab&&tab[c.key]===map[c.key],`الفصل «${c.title}»: الجدول ${tab&&tab[c.key]} ← الدليل ${map[c.key]}`);
for(const f of ['intro.mp4','intro.jpg'])ok(fs.existsSync(path.join(ROOT,'docs',f)),`الفيديو: docs/${f}`);
// الروابط داخل التطبيق نفسه
const {server,url}=await serve();const b=await browser();
try{const c=await context(b,{viewport:{width:1280,height:800}},url);const p=await c.newPage();
  const routes={home:'#/',search:'#/search',index:'#/index/topics',saved:'#/saved',laws:'#/laws',item:'#/p/V09L-0184',about:'#/about'};
  for(const [k,r] of Object.entries(routes)){await p.goto(url+'index.html'+r);await p.waitForFunction(()=>document.querySelector('.shell')&&!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(300);
    const href=await p.evaluate(()=>{const v=[...document.querySelectorAll('.views > section')].find(s=>!s.hidden);const a=v&&v.querySelector(':scope > .guidelnk');return a?a.getAttribute('href'):null;});
    ok(href===`docs/guide.pdf#page=${map[k]}`,`رابط «الدليل» في ${r} → ${href}`);}
  await c.close();}finally{await b.close();server.close();}
process.exitCode=bad?1:0;console.log(bad?`${bad} فشل`:'كل الاختبارات ناجحة');
