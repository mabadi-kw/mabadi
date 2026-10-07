// يقارن نسخة المتصفح بنسخة بايثون على الحالات نفسها
import {scan,verdict} from './privacy.js';import {execSync} from 'node:child_process';
const cases=JSON.parse(execSync(`python3 dump_cases.py`,{cwd:new URL('.',import.meta.url).pathname}).toString());
let ok=0,bad=0;for(const [s,exp] of cases){const v=verdict(scan(s));if(v===exp)ok++;else{bad++;console.log('✘',exp,'→',v,s);}}
console.log(`\n${ok} ✔ / ${bad} ✘`);process.exit(bad?1:0);
