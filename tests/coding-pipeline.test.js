/* Execute only generated source made from fixed interpreter + validated static steps. */
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),P=require('../coding-pipeline');
const parse=s=>{const p=P.parse(s);assert.ok(!p.error,p.error);return p.steps};
function check(spec,input,want){const steps=parse(spec),source=P.render(steps),ctx=vm.createContext({});vm.runInContext(source,ctx,{timeout:1000});assert.equal(JSON.stringify(P.run(steps,input)),JSON.stringify(want),spec);assert.equal(JSON.stringify(ctx.solve(input)),JSON.stringify(want),'rendered '+spec);}
check('앞뒤 공백 제거 -> 소문자 -> 공백으로 나누기 -> 뒤집기 -> 하이픈으로 합치기','  Hello World  ','world-hello');
check('속성 data -> 짝수만 -> 2 곱하기 -> 3 더하기 -> 정렬 -> 합',{data:[8,1,2,-2]},25);
check('앞뒤 공백 제거 -> 대문자 -> 뒤집기','  안녕 Hi 👋  ','👋 IH 녕안');
check('쉼표로 나누기 -> 중복 제거 -> 뒤집기 -> 공백으로 합치기','A,B,A,C','C B A');
check('속성 x -> 평균',{x:[]},null);assert.throws(()=>P.run(parse('키 목록 -> 정렬'),{b:1,a:2}),/숫자/);check('키 목록 -> 뒤집기 -> 쉼표로 합치기',{b:1,a:2},'a,b');
assert.throws(()=>P.run(parse('곱'),[100000,100000]),/범위/);assert.throws(()=>P.run(parse('속성 x'),{y:1}),/속성/);assert.throws(()=>P.run(parse('길이'),Array(101).fill(1)),/깁니다/);assert.throws(()=>P.run(parse('길이'),'x'.repeat(2001)),/깁니다/);assert.throws(()=>P.run([{op:'globalThis.process.exit()'}],[]),/형식/);assert.throws(()=>P.run([{op:'add',arg:'1;evil()'}],[]),/형식/);
for(const s of ['eval()', '소문자 -> fetch("x")','소문자 ->', 'a'.repeat(501), Array(11).fill('뒤집기').join(' -> ')])assert.ok(P.parse(s).error,s);
assert.match(P.message('소문자 | [{"input":"HI","output":"hi"}]'),/1\/1/);assert.match(P.message('대문자 | [{"input":"HI","output":"hi"}]'),/0\/1/);assert.match(P.message('소문자 | x'),/JSON/);assert.match(P.message('소문자'),/시험하지 않았/);
let seed=42;const rng=()=>seed=(Math.imul(seed,1664525)+1013904223)>>>0;for(let i=0;i<500;i++){
 const arr=Array.from({length:rng()%15},()=>Number(rng()%21)-10),a=Number(rng()%9)-4,b=Number(rng()%7)-3;
 const spec=`${a} 초과만 -> 두 배 -> ${b} 더하기 -> 중복 제거 -> 정렬`,expected=Array.from(new Set(arr.filter(x=>x>a).map(x=>x*2+b))).sort((x,y)=>x-y);check(spec,arr,expected);
}
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',start),ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVSCodingPipeline:P});vm.runInContext(html.slice(start,end)+'return {reply:"unhandled"}; }',ctx);
(async()=>{const r=await ctx.brain('자비스 코딩 설계 소문자 -> 뒤집기 | [{"input":"Hello","output":"olleh"}]');assert.match(r.reply,/1\/1/);assert.equal(r.actions.length,2);assert.match(r.actions[0].content,/^function solve/);assert.equal(r.actions[1].type,'download');assert.match((await ctx.brain('자비스 코딩 설계 도움말')).reply,/자비스 코딩 설계/);assert.match((await ctx.brain('자비스 코딩 설계 eval()')).reply,/알 수 없는/);const sw=fs.readFileSync('sw.js','utf8');assert.match(sw,/coding-pipeline.js/);console.log('PASS multi-stage DSL, Korean parsing, strings/arrays/objects, failure feedback, constraints, 500 randomized independent-oracle checks, rendered JS, routing & copy/download actions');})().catch(e=>{console.error(e);process.exitCode=1});
