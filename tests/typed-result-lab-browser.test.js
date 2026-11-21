'use strict';
// Local mobile-emulation test only, not a real-device or untrusted-code test.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!f.startsWith(root+path.sep))return res.writeHead(403).end();
 fs.readFile(f,(err,data)=>{if(err)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(f)]||'text/plain'),'Cache-Control':'no-store'}).end(data);});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const c=await browser.newContext({viewport:{width:412,height:860},isMobile:true,hasTouch:true});
  await c.addInitScript(()=>{localStorage.setItem('jvs-unlock',JSON.stringify({t:Date.now()}));if(!localStorage.getItem('typed-lab-marker'))localStorage.setItem('typed-lab-marker','kept');});
  await c.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{current:{temperature_2m:12.3}}}).catch(()=>{}));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load',timeout:45000});
  await p.locator('#boot.off').waitFor({timeout:25000});
  await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload({waitUntil:'load'});
  await p.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:15000});
  await p.locator('#boot.off').waitFor({timeout:25000});
  assert.equal(await p.evaluate(async()=>!!(await caches.match('./typed-result-lab.js'))),true);
  assert.match(await p.evaluate(async()=>(await brain('자비스 결과 비교')).reply),/고정 예제/);
  await p.evaluate(()=>openPanel('chat'));
  await p.locator('#inp').fill('자비스 결과 비교 1');await p.locator('#send').tap();
  await p.waitForFunction(()=>document.querySelector('.m.j:last-child')?.textContent.includes('일반 JSON으로는 같게 보임'),{timeout:15000});
  assert.match(await p.locator('.m.j:last-child').textContent(),/일반 JSON으로는 같게 보임/);
  // Faster typing still preserves the full Unicode text and action buttons.
  const typingText='타이핑 확인 🧪 한글과 emoji. '.repeat(12);
  await p.evaluate(text=>addChat('j',text,[{type:'copy',label:'복사 시험',content:text}]),typingText);
  await p.waitForFunction(text=>document.querySelector('.m.j:last-child > span:nth-child(2)')?.textContent===text,typingText,{timeout:15000});
  await p.locator('.m.j:last-child .btns button').waitFor({timeout:15000});
  assert.equal(await p.locator('.m.j:last-child .btns button').textContent(),'복사 시험');
  assert.match(await p.evaluate(async()=>(await brain('결과 비교 8')).reply),/확인 불가/);
  assert.match(await p.evaluate(async()=>(await brain('결과 비교 globalThis.bad=1')).reply),/고정 예제만 선택/);
  assert.equal(await p.evaluate(()=>globalThis.bad),undefined);
  await c.setOffline(true);await p.reload({waitUntil:'load',timeout:25000});
  await p.locator('#boot.off').waitFor({timeout:25000});
  assert.match(await p.evaluate(async()=>(await brain('자비스 결과 비교 1')).reply),/태그 비교: 다름/);
  assert.match(await p.evaluate(async()=>(await brain('자비스 결과 비교 8')).reply),/확인 불가/);
  assert.equal(await p.evaluate(()=>localStorage.getItem('typed-lab-marker')),'kept');
  assert.deepEqual(errors,[]);
  console.log('PASS mobile emulation: actual chat, fixed demos, source rejection, SW precache and offline reload; not a real-device test');
  await c.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
