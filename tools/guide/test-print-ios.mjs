// طباعة تطبيق iPhone المثبّت: تُصنع ملفات PDF على لوحة رسم وتُسلَّم لقائمة المشاركة. يُحاكى هنا بـ mabadi:pdfprint وبديل لـ navigator.share
import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {serve,browser,context,HERE} from './lib.mjs';
const OUT=path.join(HERE,'out','print-ios');fs.mkdirSync(OUT,{recursive:true});
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
try{const c=await context(b,{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2},url);
  await c.addInitScript(()=>{for(const [k,v] of [['bknudge','9999999999999'],['iosnudge','9999999999999'],['intro','1'],['pdfprint','true']])localStorage.setItem('mabadi:'+k,v);
    window.print=()=>{window.__printed=1;};navigator.canShare=()=>true;
    navigator.share=async d=>{const f=d.files[0];const a=new Uint8Array(await f.arrayBuffer());let s='';for(let i=0;i<a.length;i+=8192)s+=String.fromCharCode.apply(null,a.subarray(i,i+8192));window.__shared={name:f.name,type:f.type,b64:btoa(s)};};});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html#/');await p.waitForTimeout(3000);
  const run=async(n,h,opt)=>{await p.evaluate(h=>{location.hash=h;window.__shared=null;window.__printed=0;},h);await p.waitForTimeout(1800);
    await p.click('[data-print]:visible');await p.waitForTimeout(300);if(opt>=0)await p.click(`[data-pr="${opt}"]`);
    await p.waitForSelector('#pdfshare',{timeout:60000});await p.click('#pdfshare');await p.waitForFunction(()=>window.__shared,null,{timeout:10000});
    const r=await p.evaluate(()=>({...window.__shared,printed:window.__printed}));const f=path.join(OUT,n+'.pdf');fs.writeFileSync(f,Buffer.from(r.b64,'base64'));
    const info=execFileSync('pdfinfo',[f]).toString();const pages=+(info.match(/Pages:\s+(\d+)/)||[])[1];
    execFileSync('pdftoppm',['-r','40','-png','-f','1','-l','1',f,path.join(OUT,n)]);
    ck(`${n}: ملف PDF (${pages} صفحة) دون استدعاء window.print`,r.type==='application/pdf'&&pages>=1&&!r.printed&&/\.pdf$/.test(r.name),r.name);return pages;};
  await run('principle','#/p/V09L-0184',0);
  await run('principle-page','#/p/V09L-0184',1);
  await run('article','#/a/LAW-67-1980-A0001',0);
  const n=await run('law','#/law/LAW-11-2026',-1);ck('القانون الكامل في عدة صفحات',n>=3,n);
  ck('لا أخطاء في الصفحة',errs.length===0,errs.join(' | '));
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
