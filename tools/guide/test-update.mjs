// زر «تحديث الآن» مع ذاكرة متصفح كما في GitHub Pages (max-age=600): بعد التحديث يُحمَّل الإصدار الجديد ولا يعود التنبيه
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {browser,fontCSS} from './lib.mjs';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..','..');
const T={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.webp':'image/webp'};
let BUILD='202601010000',JSB=BUILD;   // JSB: ما يقدّمه الخادم الوسيط من app.js (قد يتأخر عن version.json)
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';
  const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  let body=fs.readFileSync(f);
  if(p==='/app.js')body=Buffer.from(body.toString().replace(/const APP_BUILD='\d+'/,`const APP_BUILD='${JSB}'`));
  if(p==='/sw.js')body=Buffer.from(body.toString().replace(/const VERSION='\d+'/,`const VERSION='${JSB}'`));
  if(p==='/version.json')body=Buffer.from(JSON.stringify({build:BUILD}));
  const et='"'+crypto.createHash('md5').update(body).digest('hex')+'"';
  if(q.headers['if-none-match']===et){r.writeHead(304,{etag:et,'cache-control':'max-age=600'});r.end();return;}
  r.writeHead(200,{'content-type':T[path.extname(f)]||'application/octet-stream','cache-control':'max-age=600',etag:et});r.end(body);});
await new Promise(res=>srv.listen(0,'127.0.0.1',res));const url=`http://127.0.0.1:${srv.address().port}/`;
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const b=await browser();
try{const c=await b.newContext({locale:'ar',viewport:{width:1280,height:800}});
  await c.route(u=>!u.href.startsWith(url),r=>r.abort());
  await c.route(/fonts\.googleapis\.com/,r=>r.fulfill({contentType:'text/css',body:fontCSS(url+'tools/guide/fonts/')}));
  await c.addInitScript(()=>{localStorage.setItem('mabadi:bknudge','9999999999999');localStorage.setItem('mabadi:iosnudge','9999999999999');localStorage.setItem('mabadi:intro','1');});
  const p=await c.newPage();
  await p.goto(url+'index.html#/');await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:30000}).catch(()=>{});
  await p.reload();await p.waitForTimeout(3000);
  ck('عامل الخدمة يتحكم في الصفحة',await p.evaluate(()=>!!navigator.serviceWorker.controller));
  BUILD='202612312359';   // نشر إصدار جديد: version.json جديد، وapp.js ما زال قديمًا في الخادم الوسيط
  await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForTimeout(7000);
  ck('لا تنبيه ما دام app.js القديم هو المقدَّم',await p.locator('#updbar').count()===0);
  JSB=BUILD;await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await p.waitForSelector('#updbar',{timeout:15000}).catch(()=>{});
  ck('يظهر تنبيه التحديث',await p.locator('#updbar').count()===1);
  await Promise.all([p.waitForEvent('load',{timeout:30000}),p.click('#updgo')]);
  await p.waitForTimeout(6500);
  ck('بعد «تحديث الآن» لا يعود التنبيه',await p.locator('#updbar').count()===0);
  const js=await p.evaluate(async()=>(await (await fetch('app.js')).text()).match(/APP_BUILD='(\d+)'/)[1]);
  ck('الواجهة المحمّلة من الإصدار الجديد',js==='202612312359',js);
}finally{await b.close();srv.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
