/* Fixed reference checks for 22 known code snippets. Never executes generated JS. */
(function(root){
'use strict';
const SPECS=[{"id":"add","code":"function solution(a, b) { return a + b; }"},{"id":"subtract","code":"function solution(a, b) { return a - b; }"},{"id":"multiply","code":"function solution(a, b) { return a * b; }"},{"id":"square","code":"function solution(n) { return n * n; }"},{"id":"absolute","code":"function solution(n) { return Math.abs(n); }"},{"id":"even","code":"function solution(n) { return n % 2 === 0; }"},{"id":"maximum","code":"function solution(a, b) { return Math.max(a, b); }"},{"id":"minimum","code":"function solution(a, b) { return Math.min(a, b); }"},{"id":"array_sum","code":"function solution(arr) { return arr.reduce((a, b) => a + b, 0); }"},{"id":"reverse","code":"function solution(arr) { return [...arr].reverse(); }"},{"id":"odd","code":"function solution(n) { return n % 2 !== 0; }"},{"id":"cube","code":"function solution(n) { return n * n * n; }"},{"id":"array_length","code":"function solution(arr) { return arr.length; }"},{"id":"string_length","code":"function solution(s) { return s.length; }"},{"id":"lower","code":"function solution(s) { return s.toLowerCase(); }"},{"id":"upper","code":"function solution(s) { return s.toUpperCase(); }"},{"id":"trim","code":"function solution(s) { return s.trim(); }"},{"id":"array_max","code":"function solution(arr) { return arr.length ? Math.max(...arr) : null; }"},{"id":"array_min","code":"function solution(arr) { return arr.length ? Math.min(...arr) : null; }"},{"id":"even_filter","code":"function solution(arr) { return arr.filter(n => n % 2 === 0); }"},{"id":"unique","code":"function solution(arr) { return [...new Set(arr)]; }"},{"id":"str_reverse","code":"function solution(s) { return Array.from(s).reverse().join(''); }"}];
const number=x=>typeof x==='number'&&Number.isSafeInteger(x)&&Math.abs(x)<=1000;
const array=x=>Array.isArray(x)&&x.length<=100&&x.every(number);
const str=x=>typeof x==='string'&&x.length<=256;
const BINARY=new Set(['add','subtract','multiply','maximum','minimum']);
const ARRAY=new Set(['array_sum','reverse','array_length','array_max','array_min','even_filter','unique']);
const STRING=new Set(['string_length','lower','upper','trim','str_reverse']);
function validArgs(id,args){if(!Array.isArray(args))return false;if(BINARY.has(id))return args.length===2&&args.every(number);if(ARRAY.has(id))return args.length===1&&array(args[0]);if(STRING.has(id))return args.length===1&&str(args[0]);return args.length===1&&number(args[0]);}
function reference(id,args){if(!validArgs(id,args))throw Error('입력은 유형에 맞는 정수·숫자 배열·문자열로 주세요 (정수 -1000~1000, 배열 최대 100개, 문자열 최대 256자).');const a=args[0],b=args[1];
 switch(id){case 'add':return a+b;case 'subtract':return a-b;case 'multiply':return a*b;case 'maximum':return a>b?a:b;case 'minimum':return a<b?a:b;case 'square':return a*a;case 'absolute':return a<0?-a:a;case 'even':return a%2===0;case 'odd':return a%2!==0;case 'cube':return a*a*a;
 case 'array_sum':{let sum=0;for(const n of a)sum+=n;return sum;}case 'reverse':{const out=[];for(let i=a.length-1;i>=0;i--)out.push(a[i]);return out;}case 'array_length':return a.length;
 case 'array_max':return a.length?Math.max(...a):null;case 'array_min':return a.length?Math.min(...a):null;
 case 'even_filter':{const out=[];for(const n of a)if(n%2===0)out.push(n);return out;}
 case 'unique':{const out=[];for(const n of a)if(!out.includes(n))out.push(n);return out;}
 case 'string_length':return a.length;case 'lower':return a.toLowerCase();case 'upper':return a.toUpperCase();case 'trim':return a.trim();case 'str_reverse':{const chars=Array.from(a),out=[];for(let i=chars.length-1;i>=0;i--)out.push(chars[i]);return out.join('');}default:throw Error('시험 대상이 아닙니다.');}
}
function same(a,b){if(Array.isArray(a)||Array.isArray(b))return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>same(v,b[i]));return a===b;}
function check(code,examples){if(!Array.isArray(examples)||examples.length<2||examples.length>8||examples.some(e=>!e||typeof e!=='object'||!Object.hasOwn(e,'args')||!Object.hasOwn(e,'output')))return {error:'예제는 args 배열과 output을 가진 객체로 2~8개 주세요.'};
 const match=SPECS.find(x=>x.code===code);if(!match)return {error:'생성 코드는 현재 확인된 22개 시험 대상과 일치하지 않아 자동 검사할 수 없습니다.'};let pass=0,results=[];
 for(let i=0;i<examples.length;i++){const e=examples[i];try{const got=reference(match.id,e.args),ok=same(got,e.output);if(ok)pass++;results.push({ok,got,expected:e.output});}catch(err){return {error:(i+1)+'번 예제: '+err.message};}}
 return {id:match.id,pass,total:examples.length,results};
}
function suggest(examples){if(!Array.isArray(examples)||examples.length<2||examples.length>8||examples.some(e=>!e||typeof e!=='object'||!Object.hasOwn(e,'args')||!Object.hasOwn(e,'output')))return {error:'예제는 args 배열과 output을 가진 객체로 2~8개 주세요.'};
 const matches=[];for(const spec of SPECS){try{if(examples.every(e=>validArgs(spec.id,e.args)&&same(reference(spec.id,e.args),e.output)))matches.push(spec);}catch(e){}}
 return {examined:SPECS.length,matches};
}
const api={SPECS,validArgs,reference,check,suggest};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSCodingAuditor=api;
})(typeof globalThis!=='undefined'?globalThis:this);
