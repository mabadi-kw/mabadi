// عامل البحث: نتائجه مطابقة عددًا لنتائج البحث في الواجهة نفسها (?noworker)
import {serve,browser,context} from './lib.mjs';
let ok=0,bad=0;const ck=(n,c,x='')=>{if(c){ok++;console.log('✔',n);}else{bad++;console.log('✘',n,x);}};
const {server,url}=await serve();const b=await browser();
const Q=['مكافأة نهاية الخدمة','"الفصل التعسفي"','بطلان إعلان صحيفة الاستئناف','عقد الإيجار','قرار لجنة فحص الطعون','المسئولية التقصيرية'];
async function counts(qs){const c=await context(b,{viewport:{width:1280,height:800}},url);
  await c.addInitScript(()=>{localStorage.setItem('mabadi:intro','1');for(const k of ['bknudge','iosnudge'])localStorage.setItem('mabadi:'+k,'9999999999999');});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
  await p.goto(url+qs+'#/search');await p.waitForSelector('#sq');
  await p.waitForFunction(()=>!document.getElementById('sub').textContent.includes('جارٍ'),null,{timeout:60000});await p.waitForTimeout(6000);
  const out=[];for(const q of Q){await p.fill('#sq','');await p.waitForTimeout(300);await p.fill('#sq',q);
    await p.waitForFunction(()=>(t=>!t.includes('جارٍ')&&!t.includes('مجموعة')&&/\d/.test(t))(document.getElementById('count').textContent),null,{timeout:60000});await p.waitForTimeout(400);
    out.push(parseInt((await p.textContent('#count')).replace(/[^\d]/g,''))||0);}
  await c.close();return {out,errs};}
try{const a=await counts(''),n=await counts('?noworker');
  Q.forEach((q,i)=>ck(`«${q}»: العامل ${a.out[i]} = الواجهة ${n.out[i]}`,a.out[i]===n.out[i]&&a.out[i]>0));
  ck('لا أخطاء',!a.errs.length&&!n.errs.length,a.errs.concat(n.errs).join('|'));
}finally{await b.close();server.close();}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
