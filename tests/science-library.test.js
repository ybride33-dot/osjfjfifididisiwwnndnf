const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const root=path.join(__dirname,'..'),lib=require('../science-library.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'science-corpus.json'),'utf8'));
assert.equal(data.records.length,10000);assert.deepEqual(data.counts,{mathlib:9878,theoria:27,openstax:95});
for(let i=0;i<data.records.length;i++){
 const r=data.records[i];assert.equal(r.id,i+1);assert.ok(r.title&&r.excerpt&&r.path&&data.sources[r.kind]);
 assert.ok(!r.path.startsWith('/')&&!r.path.includes('..'));
}
for(const f of ['third-party/mathlib4-APACHE-2.0.txt','third-party/mathlib4-notices.txt','third-party/openstax-CC-BY-4.0.txt'])assert.ok(fs.existsSync(path.join(root,f)));
for(const [q,kind] of [['위상수학','mathlib'],['슈뢰딩거','theoria'],['상대성이론','theoria'],['확률론','mathlib']]){
 const hits=lib.search(data,q);assert.ok(hits.length,q);assert.ok(hits.some(x=>x.kind===kind),q);
}
assert.equal(lib.search(data,'무의미없는키워드zz987').length,0);
const sch=data.records.find(x=>x.title==='Schrödinger Equation'&&x.kind==='theoria');assert.ok(sch&&sch.contributors);
assert.match(lib.sourceUrl(data,sch),/github\.com\/theoria-dataset\/theoria-dataset\/blob\//);
(async()=>{
 let calls=0;const fetcher=async()=>{calls++;return {ok:true,json:async()=>data}};
 assert.match(await lib.report(fetcher),/10000개 항목/);
 assert.match(await lib.searchMessage('슈뢰딩거',fetcher),/Schrödinger/);
 assert.match(await lib.view(sch.id,fetcher),/CC BY 4\.0/);
 assert.match(await lib.view(sch.id,fetcher),/원문:/);
 assert.match(await lib.view(10001,fetcher),/없습니다/);
 assert.equal(calls,1);
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const begin=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',begin);
 const ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVSScienceLibrary:lib});
 vm.runInContext(html.slice(begin,end)+'return {reply:"unhandled"}; }',ctx);
 assert.match((await ctx.brain('과학 자료')).reply,/10000개 항목/);
 assert.match((await ctx.brain('과학 자료 검색 슈뢰딩거')).reply,/Schrödinger/);
 assert.match((await ctx.brain('과학 자료 보기 '+sch.id)).reply,/Schrödinger/);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(sw,/science-library\.js/);assert.ok(!sw.includes('science-corpus.json'),'large corpus is not precached on boot');
 console.log('PASS 10,000 indexed records, licensing metadata, search, loading and chat routing');
})().catch(e=>{console.error(e);process.exitCode=1});
