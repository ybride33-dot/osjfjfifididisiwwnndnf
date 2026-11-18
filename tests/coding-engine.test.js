const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const E=require('../coding-engine.js'),old=require('../code-lab.js');
// Each held-out task combines operations; oracles are independent of the engine.
const tasks=[
 ['조건=짝수; 변환=제곱; 결과=합',a=>a.filter(x=>x%2===0).reduce((t,x)=>t+x*x,0)],
 ['조건=양수,홀수; 변환=두배; 결과=배열',a=>a.filter(x=>x>0&&Math.abs(x%2)===1).map(x=>2*x)],
 ['조건=음수; 변환=절댓값; 결과=최댓값',a=>{const x=a.filter(n=>n<0).map(Math.abs);return x.length?Math.max(...x):null;}],
 ['조건=영아님; 변환=부호반전; 결과=합',a=>a.filter(x=>x!==0).reduce((t,x)=>t-x,0)],
 ['조건=전체; 변환=제곱; 결과=최솟값',a=>a.length?Math.min(...a.map(x=>x*x)):null],
 ['조건=양수,짝수; 변환=부호반전; 결과=최솟값',a=>{const x=a.filter(n=>n>0&&n%2===0).map(n=>-n);return x.length?Math.min(...x):null;}],
 ['조건=홀수; 변환=절댓값; 결과=합',a=>a.filter(x=>Math.abs(x%2)===1).reduce((t,x)=>t+Math.abs(x),0)],
 ['조건=음수,짝수; 변환=두배; 결과=배열',a=>a.filter(x=>x<0&&x%2===0).map(x=>2*x)],
 ['조건=양수; 변환=그대로; 결과=개수',a=>a.filter(x=>x>0).length],
 ['조건=전체; 변환=그대로; 결과=곱',a=>a.reduce((t,x)=>t*x,1)],
 ['조건=음수,홀수; 변환=제곱; 결과=최댓값',a=>{const x=a.filter(x=>x<0&&Math.abs(x%2)===1).map(x=>x*x);return x.length?Math.max(...x):null;}],
 ['조건=짝수; 변환=부호반전; 결과=배열',a=>a.filter(x=>x%2===0).map(x=>-x)],
 ['조건=영아님,양수; 변환=두배; 결과=합',a=>a.filter(x=>x!==0&&x>0).reduce((n,x)=>n+2*x,0)],
 ['조건=홀수,음수; 변환=그대로; 결과=개수',a=>a.filter(x=>x<0&&Math.abs(x%2)===1).length],
 ['조건=짝수; 변환=절댓값; 결과=최솟값',a=>{const x=a.filter(x=>x%2===0).map(Math.abs);return x.length?Math.min(...x):null;}],
 ['조건=전체; 변환=그대로; 결과=배열',a=>a.slice()],
 ['조건=음수; 변환=절댓값; 결과=정렬',a=>a.filter(x=>x<0).map(x=>-x).sort((a,b)=>a-b)],
 ['조건=양수; 변환=제곱; 결과=중복제거',a=>Array.from(new Set(a.filter(x=>x>0).map(x=>x*x)))],
 ['조건=짝수; 변환=두배; 결과=누적합',a=>{let n=0;return a.filter(x=>x%2===0).map(x=>(n+=2*x));}],
 ['조건=홀수; 변환=그대로; 결과=평균',a=>{const b=a.filter(x=>Math.abs(x%2)===1);return b.length?b.reduce((x,y)=>x+y,0)/b.length:null;}],
 ['조건=전체; 변환=그대로; 결과=중앙값',a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?b.length%2?b[(b.length-1)/2]:(b[b.length/2-1]+b[b.length/2])/2:null;}],
 ['조건=영아님; 변환=부호반전; 결과=최빈값',a=>{const b=a.filter(x=>x!==0).map(x=>-x);return b.length?b.slice().sort((x,y)=>b.filter(z=>z===y).length-b.filter(z=>z===x).length)[0]:null;}],
 ['조건=전체; 변환=그대로; 결과=최대구간합',a=>{if(!a.length)return null;let best=-Infinity;for(let i=0;i<a.length;i++)for(let j=i+1;j<=a.length;j++)best=Math.max(best,a.slice(i,j).reduce((x,y)=>x+y,0));return best;}],
 ['조건=양수,짝수; 변환=제곱; 결과=최대구간합',a=>{const b=a.filter(x=>x>0&&x%2===0).map(x=>x*x);if(!b.length)return null;let best=-Infinity;for(let i=0;i<b.length;i++)for(let j=i+1;j<=b.length;j++)best=Math.max(best,b.slice(i,j).reduce((x,y)=>x+y,0));return best;}]
];
let seed=0x496a;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed;}
const inputs=[[],[0],[-3,-2,-1,0,1,2,3],[-1],[-2,0,2]];
for(let i=0;i<35;i++)inputs.push(Array.from({length:rand()%8},()=>Number(rand()%7)-3));
let passed=0;
for(const [spec,oracle] of tasks){
 const p=E.parse(spec).program;assert.ok(p,spec);
 // The old engine does not accept these array program representations.
 assert.equal(old.valid(p),false);
 const code=E.render(p),context=vm.createContext({});vm.runInContext(code,context,{timeout:1000});
 for(const input of inputs){const expected=oracle(input);const actual=E.run(p,input);const output=context.solve(input);assert.equal(JSON.stringify(actual),JSON.stringify(expected),spec+' interpreter');assert.equal(JSON.stringify(output),JSON.stringify(expected),spec+' rendered JS');}
 passed++;
}
assert.equal(E.parse('조건=짝수; 변환=제곱; 결과=합; 나쁜=코드').error!==undefined,true);
assert.ok(E.parse('조건=전체,짝수; 변환=그대로; 결과=합').error);
assert.ok(E.parse('조건=짝수; 변환=process.exit(); 결과=합').error);
assert.equal(E.validateInput([,1]),false);
assert.equal(E.validateInput([1.5]),false);assert.equal(E.validateInput([1001]),false);assert.equal(E.validateInput(Array(101).fill(1)),false);
const prod=E.parse('조건=전체; 변환=제곱; 결과=곱').program;assert.throws(()=>E.run(prod,[1000,1000,1000]),RangeError);
const prodctx=vm.createContext({});vm.runInContext(E.render(prod),prodctx);assert.throws(()=>prodctx.solve([1000,1000,1000]));
const ex=[{input:[-3,2,0,1,4],output:[4,16]},{input:[2,-4,7,6],output:[4,36]}];
const found=E.search(ex);assert.ok(found.program);assert.equal(found.examined,1040);assert.ok(found.matches>=1);assert.deepEqual(E.run(found.program,[8,-2,3]),[64]);
assert.ok(E.search([{input:[1],output:1}]).error);
assert.match(E.examplesMessage('[{"input":[1],"output":1},{"input":[2],"output":2}]'),/候補|후보/);
assert.match(E.executeMessage('조건=양수,짝수; 변환=제곱; 결과=합','-3,2,4'),/결과 20/);
assert.equal(E.describe(E.parse('양수 짝수 제곱 합').program),'조건=양수,짝수; 변환=제곱; 결과=합');
assert.match(E.testMessage(),/9\/9/);
assert.match(E.executeMessage('조건=전체; 변환=그대로; 결과=합','1,alert(1)'),/정수만/);
const html=fs.readFileSync('index.html','utf8'),begin=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',begin);
const ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVSCodingEngine:E});vm.runInContext(html.slice(begin,end)+'return {reply:"unhandled"}; }',ctx);
(async()=>{assert.match((await ctx.brain('자비스 코딩 엔진 시험')).reply,/9\/9/);assert.match((await ctx.brain('자비스 코딩 도움말')).reply,/코드 엔진/);assert.match((await ctx.brain('자비스 코딩 생성 조건=짝수; 변환=제곱; 결과=합')).reply,/function solve/);assert.match((await ctx.brain('자비스 코딩 실행 조건=양수,짝수; 변환=제곱; 결과=합 | -3,2,4')).reply,/결과 20/);assert.match((await ctx.brain('자비스 코딩 예제 '+JSON.stringify(ex))).reply,/후보/);assert.match(fs.readFileSync('sw.js','utf8'),/coding-engine\.js/);console.log(`PASS ${passed}/${tasks.length} array tasks × ${inputs.length} inputs; generated JS + safe interpreter agree with independent oracles`);console.log('PASS 1040-candidate synthesis, ambiguous examples, bounds, overflow, invalid input, and real brain routing');})().catch(e=>{console.error(e);process.exitCode=1});
