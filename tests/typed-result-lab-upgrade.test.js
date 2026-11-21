'use strict';
// Verify 20.34 current deployed tree -> local experiment cache upgrade.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'jvs-typed-upgrade-'));
cp.execFileSync('bash',['-c','git archive 31d36805657ea5eaac05fe8114cd6ecde2943c16 | tar -x -C "$1"','_',dir],{cwd:root});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),f=path.resolve(dir,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!f.startsWith(dir+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,data)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(f)]||'text/plain'),'Cache-Control':'no-store'}).end(data);});});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const c=await browser.newContext({viewport:{width:412,height:860},isMobile:true,hasTouch:true});
  await c.addInitScript(()=>{localStorage.setItem('jvs-unlock',JSON.stringify({t:Date.now()}));if(!localStorage.getItem('upgrade-test-marker'))localStorage.setItem('upgrade-test-marker','keep');});
  await c.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{current:{temperature_2m:12.3}}}).catch(()=>{}));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});await p.locator('#boot.off').waitFor({timeout:25000});
  assert.equal(await p.evaluate(()=>JVS_VER),'20.34');await p.evaluate(()=>{S.ws['업데이트-검사.txt']='기존 내용 보존';saveS()});
  await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:15000});
  assert.equal(await p.evaluate(()=>typeof JVSTypedResultLab),'undefined');
  for(const f of ['index.html','sw.js','typed-result-lab.js','op-hud.js','op-tools.js'])fs.copyFileSync(path.join(root,f),path.join(dir,f));
  await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
  try{await p.waitForFunction(()=>typeof JVSTypedResultLab!=='undefined',{timeout:20000});}
  catch{await p.reload();await p.waitForFunction(()=>typeof JVSTypedResultLab!=='undefined',{timeout:20000});}
  assert.equal(await p.evaluate(()=>JVS_VER),'20.36');
  assert.equal(await p.evaluate(()=>localStorage.getItem('upgrade-test-marker')),'keep');
  assert.equal(await p.evaluate(()=>S.ws['업데이트-검사.txt']),'기존 내용 보존');
  assert.match(await p.evaluate(async()=>(await brain('자비스 결과 비교 1')).reply),/태그 비교: 다름/);
  assert.equal(await p.evaluate(async()=>!!(await caches.match('./typed-result-lab.js'))),true);
  await c.setOffline(true);await p.reload();await p.locator('#boot.off').waitFor({timeout:25000});
  assert.match(await p.evaluate(async()=>(await brain('자비스 결과 비교 8')).reply),/확인 불가/);
  assert.equal(await p.evaluate(()=>S.ws['업데이트-검사.txt']),'기존 내용 보존');
  assert.deepEqual(errors,[]);console.log('PASS 20.34 -> local staged cache upgrade, preserved workspace, new demos and offline reload; mobile emulator only');
  await c.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();fs.rmSync(dir,{recursive:true,force:true});process.exitCode=1});
