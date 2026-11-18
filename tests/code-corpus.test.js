const assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path'),vm=require('node:vm');
const api=require('../code-corpus.js'),root=path.join(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'code-corpus.json'),'utf8'));
assert.equal(data.schema,1);assert.equal(data.license,'MIT');assert.equal(data.files.length,597);
assert.equal(data.files.filter(x=>x.kind==='code').length,360);
assert.equal(data.files.filter(x=>x.kind==='doc').length,237);
assert.ok(fs.readFileSync(path.join(root,data.licenseFile),'utf8').includes('Copyright (c) 2018 Oleksii Trekhleb'));
for(let i=0;i<data.files.length;i++){
 const x=data.files[i];assert.equal(x.id,i+1);assert.equal(crypto.createHash('sha256').update(x.text,'utf8').digest('hex'),x.sha256);
}
for(const [query,expected] of [['이진 탐색','binary'],['퀵 정렬','quick'],['다익스트라','dijkstra'],['그래프','graph'],['피보나치','fibonacci'],['정렬','sort']]){
 const found=api.search(data,query);assert.ok(found.length,query);assert.ok(found.some(r=>r.path.toLowerCase().includes(expected)),query+' path');
}
assert.deepEqual(api.search(data,'검색불가능한용어xyz987'),[]);
assert.deepEqual(api.search(data,''),[]);
(async()=>{
 let calls=0;const fetcher=async url=>{calls++;assert.equal(url,'./code-corpus.json');return {ok:true,json:async()=>data}};
 assert.match(await api.report(fetcher),/597개 파일/);
 assert.match(await api.searchMessage('이진 탐색',fetcher),/binary/i);
 const item=data.files.find(x=>x.text.length>2400);assert.match(await api.view(item.id,fetcher),/앞부분만 표시/);
 assert.match(await api.view(999999,fetcher),/없습니다/);
 assert.equal(calls,1,'cache prevents repeated downloads');
 // Verify actual chat routing through the real leading part of brain().
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const begin=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',begin);
 assert.ok(begin>=0&&end>begin);
 const ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVSCodeCorpus:api});
 vm.runInContext(html.slice(begin,end)+'return {reply:"unhandled"}; }',ctx);
 assert.match((await ctx.brain('코드 자료')).reply,/597개 파일/);
 assert.match((await ctx.brain('코드 자료 검색 이진 탐색')).reply,/binary/i);
 assert.match((await ctx.brain('코드 자료 보기 '+item.id)).reply,/참고용 원본/);
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');assert.match(sw,/\.\/code-corpus\.json/);
 console.log('PASS corpus: 597 file hashes and MIT notice, Korean search, lazy loading, command routing and SW manifest');
})().catch(e=>{console.error(e);process.exitCode=1});
