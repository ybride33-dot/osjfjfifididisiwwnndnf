'use strict';
// Exploratory mobile viewport timing, not a real device benchmark.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const resultPath=path.join(root,'research/answer-judge/wasm-alternatives/typed-ui-performance.json');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(e,data)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(f)]||'text/plain'),'Cache-Control':'no-store'}).end(data);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try {
  const c=await browser.newContext({viewport:{width:412,height:860},isMobile:true,hasTouch:true});
  await c.addInitScript(()=>{localStorage.setItem('jvs-unlock',JSON.stringify({t:Date.now()}));});
  await c.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{current:{temperature_2m:12.3}}}).catch(()=>{}));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load',timeout:45000});
  await p.locator('#boot.off').waitFor({timeout:25000});
  await p.evaluate(()=>openPanel('chat'));
  const client=await c.newCDPSession(p);
  const asset=await p.evaluate(()=>{const e=performance.getEntriesByType('resource').find(x=>x.name.endsWith('/typed-result-lab.js'));return e?{transferSize:e.transferSize,encodedBodySize:e.encodedBodySize,durationMs:e.duration}:null;});
  assert.ok(asset,'new module did not load');
  const runs=[];
  for(const rate of [1,4]){
   await client.send('Emulation.setCPUThrottlingRate',{rate});
   await p.waitForTimeout(500);
   const direct=await p.evaluate(async()=>{
    const commands=Array.from({length:9},(_,i)=>'자비스 결과 비교 '+(i+1));
    for(const c of commands)await brain(c);
    const times=[],byCase=commands.map(()=>[]),baseline=[],labOnly=[];
    for(let rep=0;rep<40;rep++){
     for(let i=0;i<commands.length;i++){
      let t=performance.now();const v=await brain(commands[i]);const dt=performance.now()-t;
      times.push(dt);byCase[i].push(dt);if(!v.reply.includes('결과 비교 실험'))throw Error('unexpected result');
      t=performance.now();JVSTypedResultLab.message(String(i+1));labOnly.push(performance.now()-t);
     }
     let t=performance.now();await brain('자비스 버전');baseline.push(performance.now()-t);
     await new Promise(resolve=>setTimeout(resolve,0));
    }
    function summary(values){values.sort((a,b)=>a-b);const at=q=>values[Math.min(values.length-1,Math.floor(q*(values.length-1)))];
     return {samples:values.length,medianMs:at(.5),p95Ms:at(.95),maxMs:values[values.length-1],meanMs:values.reduce((a,b)=>a+b,0)/values.length};}
    return {...summary(times),perCase:byCase.map((x,i)=>({id:i+1,...summary(x)})),labOnly:summary(labOnly),versionCommand:summary(baseline)};
   });
   await p.evaluate(()=>{
    window.__typedLongTasks=[];
    try{window.__typedObs=new PerformanceObserver(list=>window.__typedLongTasks.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration}))));window.__typedObs.observe({type:'longtask',buffered:false});}catch(e){window.__typedLongTasks=null;}
   });
   const ui=[];
   for(const id of [1,8,9,2,6]){
    const value=await p.evaluate(async(id)=>{
      const cmd='자비스 결과 비교 '+id,expected=(await brain(cmd)).reply;
      const previous=document.querySelector('.m.j:last-child'),begin=performance.now();
      return await new Promise((resolve,reject)=>{
       let first=null;const timer=setTimeout(()=>{observer.disconnect();reject(Error('chat reply timeout'));},15000);
       const observer=new MutationObserver(()=>{
        const item=document.querySelector('.m.j:last-child');if(!item||item===previous)return;
        const text=item.lastElementChild?.textContent||'';
        if(first===null&&text.length)first=performance.now()-begin;
        if(text===expected){const done=performance.now()-begin;clearTimeout(timer);observer.disconnect();resolve({id,firstVisibleMs:first,fullTextMs:done,replyCharacters:expected.length});}
       });
       observer.observe(document.querySelector('#panelBody')||document.body,{subtree:true,childList:true,characterData:true});
       const input=document.querySelector('#inp');input.value=cmd;document.querySelector('#send').click();
      });
    },id);
    ui.push(value);await p.waitForTimeout(200);
   }
   const longTasks=await p.evaluate(()=>{if(window.__typedObs)window.__typedObs.disconnect();return window.__typedLongTasks;});
   runs.push({cpuThrottle:rate,directBrainCalls:direct,chatUi:ui,longTasksDuringChat:longTasks});
  }
  await client.send('Emulation.setCPUThrottlingRate',{rate:1});
  assert.deepEqual(errors,[]);
  const result={purpose:'Exploratory local desktop Chromium mobile viewport; 4x CPU throttle is not a physical phone.',
   viewport:{width:412,height:860},isMobile:true,hardwareConcurrency:await p.evaluate(()=>navigator.hardwareConcurrency),
   moduleBytes:fs.statSync(path.join(root,'typed-result-lab.js')).size,resource:asset,
   notes:['Direct brain timing excludes chat typing, speech and storage.','Chat fullTextMs includes the app’s animated typing and surrounding app work.','Long tasks during chat may come from the rest of the app; this is not attribution or a before-after comparison.','No real phone, production deployment or adversarial execution tested.'],runs};
  fs.mkdirSync(path.dirname(resultPath),{recursive:true});
  fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
  await c.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
