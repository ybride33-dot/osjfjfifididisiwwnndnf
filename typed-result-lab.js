/* 선택형 고정 결과 비교 실험. 임의 코드·생성 코드를 실행하지 않는다. */
(function(root){
'use strict';
const unsupported=reason=>({t:'unsupported',reason});
// 고정 예제만 관찰한다. 범용 직렬화기나 보안 경계가 아니다.
function encode(value){
 const seen=new WeakSet();let nodes=0;
 function visit(v,depth){
  if(++nodes>300||depth>12)return unsupported('budget');
  if(v===undefined)return {t:'undefined'};
  if(v===null)return {t:'null'};
  if(typeof v==='boolean')return {t:'boolean',v};
  if(typeof v==='string')return v.length>512?unsupported('string_length'):{t:'string',v};
  if(typeof v==='number'){
   if(Number.isNaN(v))return {t:'number',v:'NaN'};
   if(v===Infinity)return {t:'number',v:'+Infinity'};
   if(v===-Infinity)return {t:'number',v:'-Infinity'};
   return {t:'number',v:Object.is(v,-0)?'-0':v};
  }
  if(typeof v==='bigint')return {t:'bigint',v:v.toString()};
  if(typeof v!=='object')return unsupported(typeof v);
  if(seen.has(v))return unsupported('repeat_reference');
  seen.add(v);
  const isArray=Array.isArray(v),proto=Object.getPrototypeOf(v);
  if(isArray?proto!==Array.prototype:(proto!==Object.prototype&&proto!==null))return unsupported('prototype');
  const keys=Reflect.ownKeys(v);
  if(keys.length>101||keys.some(k=>typeof k!=='string'))return unsupported('own_keys');
  if(isArray){
   if(v.length>100)return unsupported('array_length');
   for(const key of keys){if(key==='length')continue;const i=Number(key);
    if(!Number.isInteger(i)||i<0||i>=v.length||String(i)!==key)return unsupported('array_extra_property');
    const d=Object.getOwnPropertyDescriptor(v,key);if(!d||!('value' in d)||!d.enumerable)return unsupported('array_descriptor');}
   const items=[];for(let i=0;i<v.length;i++){const d=Object.getOwnPropertyDescriptor(v,String(i));items.push(d?visit(d.value,depth+1):{t:'hole'});}
   return {t:'array',items};
  }
  const entries=[];for(const key of keys.sort()){const d=Object.getOwnPropertyDescriptor(v,key);
   if(!d||!('value' in d)||!d.enumerable)return unsupported('object_descriptor');entries.push([key,visit(d.value,depth+1)]);}
  return {t:'object',proto:proto===null?'null':'object',entries};
 }
 return visit(value,0);
}
function hasUnknown(x){if(!x||typeof x!=='object')return false;if(x.t==='unsupported')return true;
 return Array.isArray(x)?x.some(hasUnknown):Object.keys(x).some(k=>hasUnknown(x[k]));}
function observe(fn,knownJsonUnavailable){try{const value=fn();let raw={status:'unavailable'};
 // JSON 변환이 불가능함을 확인한 고정 예제에서만 변환을 생략한다.
 // 일반적으로 unsupported 태그나 반복 참조가 JSON 불가를 뜻하진 않는다.
 if(!knownJsonUnavailable)try{raw={status:'json',data:JSON.parse(JSON.stringify({value}))};}catch(_){}
 return {outcome:'returned',value:encode(value),raw};}
 catch(e){return {outcome:'threw',thrown:e instanceof Error?{t:'error',name:e.name,message:e.message}:{t:'thrown_value',value:encode(e)},raw:{status:'unavailable'}};}}
function semantic(v){return v.outcome==='returned'?{outcome:'returned',value:v.value}:{outcome:'threw',thrown:v.thrown};}
function decide(a,b){const x=semantic(a),y=semantic(b);if(hasUnknown(x)||hasUnknown(y))return 'unknown';return JSON.stringify(x)===JSON.stringify(y)?'match':'different';}
// 오직 사전에 작성한 함수만 실행한다. 명령 문자열은 소스 코드가 아니다.
const cycle=()=>{const a={};a.self=a;return a;};
const PRESETS=[
 {label:'0 과 -0',left:()=>0,right:()=>-0},
 {label:'NaN 과 null',left:()=>NaN,right:()=>null},
 {label:'Infinity 과 -Infinity',left:()=>Infinity,right:()=>-Infinity},
 {label:'배열 빈 칸과 undefined',left:()=>new Array(1),right:()=>[undefined]},
 {label:'빈 객체와 값이 undefined인 속성',left:()=>({}),right:()=>({x:undefined})},
 {label:'NaN 과 NaN',left:()=>NaN,right:()=>NaN},
 {label:'TypeError 와 RangeError',left:()=>{throw new TypeError('fixed');},right:()=>{throw new RangeError('fixed');}},
 {label:'순환 객체 두 개',left:cycle,right:cycle,leftJsonUnavailable:true,rightJsonUnavailable:true},
 {label:'숫자 1 과 BigInt 1n',left:()=>1,right:()=>1n,rightJsonUnavailable:true},
];
function compare(number){if(!Number.isInteger(number)||number<1||number>PRESETS.length)return null;
 const p=PRESETS[number-1],left=observe(p.left,p.leftJsonUnavailable),right=observe(p.right,p.rightJsonUnavailable),result=decide(left,right);
 let plain='unavailable';if(left.raw.status==='json'&&right.raw.status==='json')plain=JSON.stringify(left.raw.data)===JSON.stringify(right.raw.data)?'same':'different';
 return {number,label:p.label,result,left:semantic(left),right:semantic(right),plain};}
function help(){return '🧪 결과 비교 실험 · 고정 예제\n'+PRESETS.map((p,i)=>(i+1)+'. '+p.label).join('\n')+
 '\n\n사용: 자비스 결과 비교 1 (1~9번)\n· 이 기능은 위의 정해진 예제만 비교하며 사용자·생성 코드는 실행하거나 채점하지 않습니다.\n· 비교 규칙은 문제마다 달라질 수 있습니다.';}
function message(input){const s=String(input===undefined?'':input).trim();if(!s||s==='도움말')return help();
 if(!/^[1-9]$/.test(s))return '⚠️ 1~9번 고정 예제만 선택할 수 있어요.\n\n'+help();
 const r=compare(Number(s));const label={match:'일치',different:'다름',unknown:'확인 불가'}[r.result];
 const raw={same:'일반 JSON으로는 같게 보임',different:'일반 JSON에서도 다르게 보임',unavailable:'일반 JSON만으로 비교 불가'}[r.plain];
 return '🧪 결과 비교 실험 '+r.number+'번: '+r.label+'\n· 태그 비교: '+label+'\n· '+raw+'\n· 왼쪽: '+JSON.stringify(r.left)+'\n· 오른쪽: '+JSON.stringify(r.right)+
 '\n\n※ 고정 예제만 비교합니다. 모델·사용자 코드를 실행하거나 자동 채점하지 않습니다. 결과 판정 규칙은 문제에 따라 달라질 수 있습니다.';}
const api=Object.freeze({help,message,compare});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSTypedResultLab=api;
})(typeof globalThis!=='undefined'?globalThis:this);
