const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm'),M=require('../instruction-code-model.js');
const raw=JSON.parse(fs.readFileSync('instruction-weights.json','utf8')),results=JSON.parse(fs.readFileSync('training/instruction-evaluation.json','utf8'));assert.ok(M.validate(raw));const model=M.prepare(raw);assert.equal(model.meta.parameters,83296);
for(const kind of ['validation','test','extra','fresh','novel']){let n=0;for(const row of results[kind].details){const output=M.generate(model,row.prompt);assert.equal(output,row.generated,kind+' '+row.prompt);if(output===row.expected)n++}assert.equal(n,results[kind].exact);}
assert.equal(results.test.exact,30);assert.equal(results.extra.exact,13);assert.equal(results.fresh.exact,14);assert.equal(results.novel.exact,0);
assert.throws(()=>M.generate(model,'',30),/1~160/);assert.throws(()=>M.generate(model,'가'.repeat(161),30),/1~160/);const bad=JSON.parse(JSON.stringify(raw));bad.weights.Q.data.pop();assert.ok(!M.validate(bad));
const sw=fs.readFileSync('sw.js','utf8');assert.match(sw,/instruction-code-model\.js/);assert.ok(!sw.includes('instruction-weights.json'),'weights are downloaded lazily');
const html=fs.readFileSync('index.html','utf8'),start=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',start);let calls=0;const fetcher=async()=>{calls++;return {ok:true,json:async()=>raw}};
(async()=>{assert.match(await M.report(fetcher),/새로 작성한 추가 요청: 14\/20/);assert.match(await M.requestMessage('두 수를 더해줘',fetcher),/정답이 아닐 수/);assert.equal(calls,1);
const ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVS_VER:'test',JVSInstructionCode:M});vm.runInContext(html.slice(start,end)+'return {reply:"unhandled"}; }',ctx);
assert.match((await ctx.brain('자비스 코딩 학습 보고')).reply,/0\/4/);assert.match((await ctx.brain('자비스 코딩 요청 두 숫자를 더하는 함수를 만들어줘')).reply,/function solution/);
console.log('PASS model validation, all Python/JS predictions, limits, lazy loading, routing and experimental warnings');})().catch(e=>{console.error(e);process.exitCode=1});
