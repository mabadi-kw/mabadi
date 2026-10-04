// لقطات تطويرية سريعة (لا تُستعمل في الدليل): node tools/guide/shots-dev.mjs <مجلد الإخراج>
import {serve,browser,context} from './lib.mjs';
const OUT=process.argv[2]||'/tmp/shots';import fs from 'node:fs';fs.mkdirSync(OUT,{recursive:true});
const {server,url}=await serve();const b=await browser();
async function shot(name,vp,hash,act){const c=await context(b,{viewport:vp,deviceScaleFactor:2,isMobile:vp.width<800,hasTouch:vp.width<800},url);
  await c.addInitScript(()=>{for(const k of ['bknudge','iosnudge'])localStorage.setItem('mabadi:'+k,'9999999999999');localStorage.setItem('mabadi:intro','1');localStorage.setItem('mabadi:hist',JSON.stringify(['V09L-0184','V03L-0020']));});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+'index.html#/');await p.waitForTimeout(3000);
  if(hash!=='#/'){await p.evaluate(h=>{location.hash=h;},hash);await p.waitForTimeout(1200);}
  if(act)await act(p);await p.waitForTimeout(500);
  await p.screenshot({path:`${OUT}/${name}.png`,fullPage:!!vp.full});if(errs.length)console.log(name,'ERRORS',errs);await c.close();console.log('✔',name);}
const M={width:390,height:844},MF={width:390,height:844,full:true},D={width:1400,height:900};
await shot('m-home',M,'#/');
await shot('m-home-full',MF,'#/');
await shot('m-principles',M,'#/search');
await shot('m-arrange',M,'#/search',async p=>{await p.click('#browse [data-arrmode="fams"]');await p.waitForTimeout(1200);
  const tiles=await p.$$('#bz-fams .tile');const a=await tiles[1].boundingBox(),c=await tiles[3].boundingBox();
  await p.mouse.move(a.x+a.width-25,a.y+25);await p.mouse.down();await p.mouse.move(a.x+a.width-25,a.y+60,{steps:5});await p.mouse.move(c.x+c.width/2,c.y+c.height/2,{steps:12});await p.waitForTimeout(300);await p.screenshot({path:`${OUT}/m-dragging.png`});await p.mouse.up();await p.waitForTimeout(300);
  console.log('order',await p.evaluate(()=>JSON.parse(localStorage.getItem('mabadi:settings')).ord));});
await shot('m-results',M,'#/search',async p=>{await p.fill('#sq','مكافأة نهاية الخدمة');await p.waitForTimeout(1200);});
await shot('d-home',D,'#/');
await shot('d-principles',D,'#/search');
await b.close();server.close();
