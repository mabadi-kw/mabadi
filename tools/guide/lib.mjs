// أدوات مشتركة: خادم محلي لملفات المستودع، ومتصفح يقدّم الخطوط من المستودع ويمنع أي اتصال خارجي.
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
export const HERE=path.dirname(fileURLToPath(import.meta.url));
export const ROOT=path.resolve(HERE,'../..');
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.pdf':'application/pdf','.mp4':'video/mp4','.webmanifest':'application/manifest+json'};
export function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let p=decodeURIComponent(new URL(q.url,'http://x').pathname);if(p.endsWith('/'))p+='index.html';
  const f=path.join(ROOT,p);if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
  r.writeHead(200,{'content-type':TYPES[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(r);});
  s.listen(0,'127.0.0.1',()=>res({server:s,url:`http://127.0.0.1:${s.address().port}/`}));});}
export const FONTDIR=path.join(HERE,'fonts');
export function fontCSS(base){const f=(fam,file,w)=>`@font-face{font-family:'${fam}';font-weight:${w};font-display:block;src:url(${base}${file}) format('woff2')}`;
  return [f('Cairo','cairo-arabic-400-normal.woff2',400),f('Cairo','cairo-arabic-600-normal.woff2','500 600'),f('Cairo','cairo-arabic-700-normal.woff2',700),f('Cairo','cairo-arabic-800-normal.woff2',800),
   f('Reem Kufi','reem-kufi-arabic-700-normal.woff2',700),f('Noto Naskh Arabic','noto-naskh-arabic-arabic-400-normal.woff2',400),f('Noto Naskh Arabic','noto-naskh-arabic-arabic-700-normal.woff2','600 700')].join('\n');}
export async function browser(){return chromium.launch(process.env.MABADI_CHROME?{executablePath:process.env.MABADI_CHROME}:{});}
// سياق متصفح: الخطوط من المستودع، وكل طلب خارجي آخر ممنوع
export async function context(b,opts,url){const c=await b.newContext({locale:'ar',serviceWorkers:'block',...opts});
  await c.route(u=>!u.href.startsWith(url),r=>r.abort());   // يُسجَّل أولًا، فالقاعدة التالية تُقدَّم عليه
  await c.route(/fonts\.googleapis\.com/,r=>r.fulfill({contentType:'text/css',body:fontCSS(url+'tools/guide/fonts/')}));
  return c;}
export function mkdirp(d){fs.mkdirSync(d,{recursive:true});}
