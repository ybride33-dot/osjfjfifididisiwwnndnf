const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const ver=(html.match(/const JVS_VER='([^']+)'/)||[])[1];assert.ok(ver);
assert.ok(html.indexOf('const JVS_VER=')<html.indexOf("document.getElementById('verSub').textContent"),'version is initialized before header rendering');
const start=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',start);
const context=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVS_VER:ver});vm.runInContext(html.slice(start,end)+'return {reply:"unhandled"}; }',context);
let installed,skipped=false,handlers={};
const cache={addAll(a){installed=a;return Promise.resolve();}};
class RequestStub{constructor(url,options){this.url=url;this.cache=options.cache;}}
const swctx=vm.createContext({self:{addEventListener:(k,fn)=>handlers[k]=fn,skipWaiting:()=>{skipped=true;}},caches:{open:async()=>cache},Request:RequestStub});
vm.runInContext(sw,swctx);
(async()=>{
 for(const phrase of ['버전','자비스 버전','현재 버전','버전 확인'])assert.equal((await context.brain(phrase)).reply,'현재 실행 버전: v'+ver);
 let wait;handlers.install({waitUntil(p){wait=p;}});await wait;
 assert.ok(skipped);assert.ok(installed.some(x=>x.url==='./index.html'));assert.ok(installed.every(x=>x.cache==='reload'),'precache must bypass stale HTTP cache');
 assert.match(html,/controllerchange/);assert.match(html,/updateViaCache:'none'/);
 console.log('PASS version label/routing, cache-bypassing installation, and update handler');
})().catch(e=>{console.error(e);process.exitCode=1});
