// مبادئ التمييز — عامل الخدمة: يجعل المكتبة تعمل دون اتصال.
const VERSION='202610020849';
const SHELL='mabadi-shell-'+VERSION, DATA='mabadi-data', FILES='mabadi-files', FONTS='mabadi-fonts';
const SHELL_FILES=['./','index.html','app.js','sync-core.js','app.css','embed.html','embed.js','manifest.webmanifest','icons/icon.svg','icons/favicon.svg','icons/partners/amali.svg','icons/icon-192.png','data/meta.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>c.addAll(SHELL_FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('mabadi-shell-')&&k!==SHELL).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function networkFirst(req,cacheName){
  const c=await caches.open(cacheName);
  try{const r=await fetch(req);if(r.ok)c.put(req,r.clone());return r;}
  catch(_){return (await c.match(req,{ignoreSearch:true}))||(await caches.match(req,{ignoreSearch:true}))||(req.mode==='navigate'?caches.match('index.html'):Response.error());}
}
async function staleWhileRevalidate(req,cacheName){
  const c=await caches.open(cacheName), hit=await c.match(req);
  const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r;}).catch(()=>null);
  return hit||(await net)||Response.error();
}
async function cacheFirst(req,cacheName){
  const hit=await caches.match(req);if(hit)return hit;
  const r=await fetch(req);if(r.ok||r.type==='opaque'){const c=await caches.open(cacheName);c.put(req,r.clone());}return r;
}
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const u=new URL(req.url);
  if(u.origin==='https://fonts.googleapis.com'||u.origin==='https://fonts.gstatic.com'){e.respondWith(cacheFirst(req,FONTS));return;}
  if(u.origin!==location.origin)return;
  const p=u.pathname;
  if(p.includes('/pages/')){e.respondWith(cacheFirst(req,FILES));return;}
  if(p.includes('/data/')||p.includes('/pagetext/')){e.respondWith(staleWhileRevalidate(req,DATA));return;}
  if(p.includes('/packs/')||p.includes('/docs/')||p.endsWith('/files.json')||p.endsWith('/version.json'))return;
  e.respondWith(networkFirst(req,SHELL));
});
