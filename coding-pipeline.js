/* Experimental user-specified multi-step programs. No eval / user JavaScript execution. */
(function(root){
'use strict';
const SIMPLE={
 '앞뒤 공백 제거':'trim','공백 제거':'trim','소문자':'lower','대문자':'upper','공백으로 나누기':'splitSpace','쉼표로 나누기':'splitComma','공백으로 합치기':'joinSpace','하이픈으로 합치기':'joinDash','쉼표로 합치기':'joinComma','뒤집기':'reverse','중복 제거':'unique','정렬':'sort','짝수만':'even','홀수만':'odd','양수만':'positive','음수만':'negative','제곱':'square','두 배':'double','절댓값':'abs','합':'sum','곱':'product','평균':'mean','최댓값':'max','최솟값':'min','길이':'length','키 목록':'keys'
};
const OPS=new Set([...Object.values(SIMPLE),'greater','less','add','multiply','get']);
function parse(text){
 if(typeof text!=='string'||!text.trim()||Array.from(text).length>500)return {error:'단계를 1~500자로 입력해 주세요.'};
 const parts=text.split(/\s*(?:->|→)\s*/);if(parts.length>10||parts.some(x=>!x.trim()))return {error:'단계는 1~10개이며 -> 로 구분해 주세요.'};
 const steps=[];for(const raw of parts){const s=raw.trim().replace(/\s+/g,' ');if(Object.hasOwn(SIMPLE,s)){steps.push({op:SIMPLE[s]});continue;}
  let m=s.match(/^(-?\d{1,6})\s*(초과만|미만만|더하기|곱하기)$/);if(m){steps.push({op:{'초과만':'greater','미만만':'less','더하기':'add','곱하기':'multiply'}[m[2]],arg:Number(m[1])});continue;}
  m=s.match(/^속성 ([A-Za-z_][A-Za-z0-9_]{0,30})$/);if(m){steps.push({op:'get',arg:m[1]});continue;}
  return {error:'알 수 없는 단계: '+s+'. “자비스 코딩 설계 도움말”을 확인해 주세요.'};
 }
 return {steps};
}
/* This self-contained interpreter is also included verbatim in rendered code. */
function runtime(input,steps){
 const limit=100, maxString=2000, maxNumber=1000000000;
 const fail=m=>{throw new Error(m)};
 const number=x=>{if(typeof x!=='number'||!Number.isFinite(x)||Math.abs(x)>maxNumber)fail('숫자 범위 초과 또는 숫자가 아님');return x;};
 const string=x=>{if(typeof x!=='string'||x.length>maxString)fail('문자열이 아니거나 너무 깁니다');return x;};
 const array=x=>{if(!Array.isArray(x)||x.length>limit)fail('배열이 아니거나 너무 깁니다');return x;};
 const numericArray=x=>array(x).map(number);
 const result=x=>{if(typeof x==='number')return number(x);if(typeof x==='string')return string(x);if(x===null||typeof x==='boolean')return x;if(Array.isArray(x)){if(x.length>limit)fail('배열이 너무 깁니다');return x.map(result);}if(x&&typeof x==='object'){const keys=Object.keys(x);if(keys.length>limit)fail('객체가 너무 큽니다');const o=Object.create(null);for(const k of keys){string(k);Object.defineProperty(o,k,{value:result(x[k]),enumerable:true,writable:true,configurable:true});}return o;}fail('JSON 값만 지원합니다');};
 let v=result(input);
 for(const step of steps){const a=step.arg;
  switch(step.op){
   case 'trim':v=string(v).trim();break;case 'lower':v=string(v).toLowerCase();break;case 'upper':v=string(v).toUpperCase();break;
   case 'splitSpace':v=string(v).split(' ');break;case 'splitComma':v=string(v).split(',');break;
   case 'joinSpace':case 'joinDash':case 'joinComma':v=array(v).map(string).join(step.op==='joinSpace'?' ':step.op==='joinDash'?'-':',');break;
   case 'reverse':v=typeof v==='string'?Array.from(string(v)).reverse().join(''):array(v).slice().reverse();break;
   case 'unique':v=Array.from(new Set(array(v)));break;case 'sort':v=numericArray(v).sort((x,y)=>x-y);break;
   case 'even':v=numericArray(v).filter(x=>Number.isInteger(x)&&x%2===0);break;case 'odd':v=numericArray(v).filter(x=>Number.isInteger(x)&&Math.abs(x%2)===1);break;
   case 'positive':v=numericArray(v).filter(x=>x>0);break;case 'negative':v=numericArray(v).filter(x=>x<0);break;
   case 'greater':v=numericArray(v).filter(x=>x>a);break;case 'less':v=numericArray(v).filter(x=>x<a);break;
   case 'square':v=numericArray(v).map(x=>number(x*x));break;case 'double':v=numericArray(v).map(x=>number(x*2));break;case 'abs':v=numericArray(v).map(x=>Math.abs(x));break;
   case 'add':v=typeof v==='number'?number(v+a):numericArray(v).map(x=>number(x+a));break;case 'multiply':v=typeof v==='number'?number(v*a):numericArray(v).map(x=>number(x*a));break;
   case 'sum':v=numericArray(v).reduce((x,y)=>number(x+y),0);break;case 'product':v=numericArray(v).reduce((x,y)=>number(x*y),1);break;
   case 'mean':{const n=numericArray(v);v=n.length?n.reduce((x,y)=>number(x+y),0)/n.length:null;break;}
   case 'max':{const n=numericArray(v);v=n.length?Math.max(...n):null;break;}case 'min':{const n=numericArray(v);v=n.length?Math.min(...n):null;break;}
   case 'length':v=typeof v==='string'?Array.from(string(v)).length:array(v).length;break;
   case 'keys':if(!v||typeof v!=='object'||Array.isArray(v))fail('객체가 필요합니다');v=Object.keys(v);break;
   case 'get':if(!v||typeof v!=='object'||Array.isArray(v)||!Object.prototype.hasOwnProperty.call(v,a))fail('해당 속성이 없습니다');v=v[a];break;
   default:fail('알 수 없는 단계');
  }
  v=result(v);
 }
 return v;
}
function validate(steps){return Array.isArray(steps)&&steps.length>0&&steps.length<=10&&steps.every(s=>s&&typeof s==='object'&&OPS.has(s.op)&&(['greater','less','add','multiply'].includes(s.op)?Number.isInteger(s.arg)&&Math.abs(s.arg)<=999999:s.op==='get'?typeof s.arg==='string'&&/^[A-Za-z_][A-Za-z0-9_]{0,30}$/.test(s.arg):s.arg===undefined));}
function run(steps,input){if(!validate(steps))throw Error('단계 형식이 올바르지 않습니다');return runtime(input,steps);}
function render(steps){if(!validate(steps))throw Error('단계 형식이 올바르지 않습니다');return 'function solve(input) {\n  const steps = '+JSON.stringify(steps).replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+';\n  return ('+runtime.toString()+')(input, steps);\n}';}
function equal(a,b){if(a===b)return true;if(a===null||b===null||typeof a!==typeof b)return false;if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>equal(x,b[i]));if(typeof a==='object'){const x=Object.keys(a).sort(),y=Object.keys(b).sort();return x.length===y.length&&x.every((k,i)=>k===y[i]&&equal(a[k],b[k]));}return false;}
function help(){return '🧰 코딩 설계 — 직접 순서를 지정해 조합하는 실험 도구\n· 예: 자비스 코딩 설계 앞뒤 공백 제거 -> 소문자 -> 공백으로 나누기 -> 뒤집기 -> 하이픈으로 합치기\n· 예제 검사: 요청 뒤에 | [{"input":"  Hello World  ","output":"world-hello"}]\n· 단계: '+Object.keys(SIMPLE).join(' · ')+'\n· 숫자 단계: 5 초과만 · 3 미만만 · 10 더하기 · 2 곱하기\n· 객체: 속성 name (영문 이름) · 키 목록\n· 단계 최대 10개, 예제 최대 8개. 숫자·문자열 길이·배열 크기 제한이 있습니다. 코드는 자동 실행하지 않습니다.\n※ 사용자가 단계 순서를 지정해야 합니다. 자유 문장을 이해하는 범용 AI나 범용 JavaScript 실행기가 아닙니다.';}
function message(raw){try{
 const parts=String(raw||'').split('|');if(parts.length>2)return '❌ | 는 예제 구분에 한 번만 사용해 주세요.';const parsed=parse(parts[0]);if(parsed.error)return '❌ '+parsed.error;
 let details='',examples;if(parts.length===2){if(parts[1].length>12000)throw Error('예제가 너무 깁니다');examples=JSON.parse(parts[1]);if(!Array.isArray(examples)||!examples.length||examples.length>8||!examples.every(e=>e&&typeof e==='object'&&Object.hasOwn(e,'input')&&Object.hasOwn(e,'output')))throw Error('예제는 input과 output을 가진 객체 1~8개여야 합니다');
 let passed=0;details=examples.map((e,i)=>{try{const got=run(parsed.steps,e.input),ok=equal(got,e.output);if(ok)passed++;return (ok?'✅':'❌')+' '+(i+1)+'번: 결과 '+JSON.stringify(got)+' / 기대 '+JSON.stringify(e.output);}catch(err){return '❌ '+(i+1)+'번: '+err.message;}}).join('\n');details='· 예제 '+passed+'/'+examples.length+'개 일치 (지정한 단계 해석기로 검사)\n'+details+'\n';
 }else details='· 예제가 없어 결과를 시험하지 않았습니다.\n';
 return '🧰 코딩 설계 · 단계 '+parsed.steps.length+'개\n'+details+'\n'+render(parsed.steps)+'\n\n※ 지정한 단계로 만든 코드입니다. JavaScript 코드는 자동 실행하지 않았으며, 예제가 맞아도 모든 입력의 정답을 보장하지 않습니다.';
 }catch(e){return '❌ '+(e instanceof SyntaxError?'예제 JSON 형식을 확인해 주세요.':e.message);}}
const api={SIMPLE,parse,validate,run,render,equal,help,message};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSCodingPipeline=api;
})(typeof globalThis!=='undefined'?globalThis:this);
