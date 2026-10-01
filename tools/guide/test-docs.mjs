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
try{const c=await context(b,{viewport:{width:1280,height:800}},url);await c.addInitScript(()=>{localStorage.setItem('mabadi:intro','1');localStorage.setItem('mabadi:bknudge','9999999999999');});const p=await c.newPage();
  await p.goto(url+'index.html#/more');await p.waitForFunction(()=>document.querySelector('.shell')&&!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(300);
  await p.click('[data-a2="guide"]');await p.waitForTimeout(800);const src=await p.evaluate(()=>{const f=document.querySelector('#gview iframe');return f&&f.getAttribute('src');});
  ok(!!src&&/#top$/.test(src),`الدليل يفتح من «المزيد» على الغلاف → ${src}`);
  await c.close();}finally{await b.close();server.close();}
process.exitCode=bad?1:0;console.log(bad?`${bad} فشل`:'كل الاختبارات ناجحة');
