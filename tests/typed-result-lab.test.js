'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const lab=require('../typed-result-lab');
const expected=['different','different','different','different','different','match','different','unknown','different'];
for(let i=1;i<=9;i++){
 const r=lab.compare(i);assert.equal(r.result,expected[i-1],`case ${i}`);
 assert.match(lab.message(String(i)),/고정 예제만 비교/);
 if(i<=5)assert.equal(r.plain,'same',`JSON collision case ${i}`);
}
assert.equal(lab.compare(8).plain,'unavailable');
assert.equal(lab.compare(9).plain,'unavailable');
// Do not invoke JSON.stringify on the known cyclic fixture or a BigInt;
// both are already classified as unavailable, and browsers can spend long
// enough constructing a cycle error to cause a visible pause.
const originalStringify=JSON.stringify;let cyclicAttempts=0,bigintAttempts=0;
JSON.stringify=function(x,...rest){if(x&&typeof x==='object'&&Object.hasOwn(x,'value')){
 const v=x.value;if(v&&typeof v==='object'&&v.self===v)cyclicAttempts++;
 if(typeof v==='bigint')bigintAttempts++;
}return originalStringify.call(JSON,x,...rest);};
try{assert.equal(lab.compare(8).result,'unknown');assert.equal(lab.compare(9).result,'different');}finally{JSON.stringify=originalStringify;}
assert.equal(cyclicAttempts,0);assert.equal(bigintAttempts,0);
// The nine UI examples retain the same tagged observations as the earlier
// independently recorded fixed research run; not a general equivalence proof.
const research=JSON.parse(fs.readFileSync('tests/fixtures/typed-lab-observations.json','utf8'));
const observed=Object.fromEntries(research.node_observations.map(x=>[x.id,x]));
const mapping=[['zero','negative_zero'],['nan','null'],['positive_infinity','negative_infinity'],['array_hole','array_undefined'],['object_empty','object_undefined'],['nan','nan'],['throw_type','throw_range'],['cycle_unsupported','cycle_unsupported'],['one','bigint_one']];
const semantic=x=>x.outcome==='returned'?{outcome:'returned',value:x.value}:{outcome:'threw',thrown:x.thrown};
for(let i=0;i<mapping.length;i++){const r=lab.compare(i+1);assert.deepEqual(r.left,semantic(observed[mapping[i][0]]));assert.deepEqual(r.right,semantic(observed[mapping[i][1]]));}
for(const x of [-1,0,10,'1',NaN,Infinity,{},null,undefined])assert.equal(lab.compare(x),null);
assert.match(lab.help(),/사용자·생성 코드는 실행하거나 채점하지 않습니다/);
assert.match(lab.message('8'),/확인 불가/);
assert.match(lab.message('1'),/일반 JSON으로는 같게 보임/);
assert.match(lab.message('function(){globalThis.bad=1}'),/고정 예제만 선택/);
assert.equal(globalThis.bad,undefined);
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
assert.match(html,/<script src="typed-result-lab\.js"><\/script>/);
assert.match(sw,/\.\/typed-result-lab\.js/);assert.match(sw,/jarvis-v4-single-95/);
const start=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',start);
assert.ok(start>=0&&end>start);
const ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVSTypedResultLab:lab});
vm.runInContext(html.slice(start,end)+'return {reply:"unhandled"}; }',ctx);
(async()=>{
 assert.match((await ctx.brain('자비스 결과 비교')).reply,/1\. 0 과 -0/);
 assert.match((await ctx.brain('자비스 결과 비교 1')).reply,/태그 비교: 다름/);
 assert.match((await ctx.brain('결과 비교 8')).reply,/태그 비교: 확인 불가/);
 assert.match((await ctx.brain('자비스 결과 비교 globalThis.bad=1')).reply,/고정 예제만 선택/);
 delete ctx.JVSTypedResultLab;
 assert.match((await ctx.brain('자비스 결과 비교 1')).reply,/모듈을 불러오지 못/);
 console.log('PASS 9 fixed demonstrations, JSON collisions, unknown, no source input, chat routing and SW registration');
})().catch(e=>{console.error(e);process.exitCode=1});
