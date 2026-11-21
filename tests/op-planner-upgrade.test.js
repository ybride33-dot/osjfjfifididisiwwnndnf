'use strict';
// 20.35 -> local planner prototype; mobile emulation, not a real phone.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),dir=fs.mkdtempSync(path.join(os.tmpdir(),'jvs-planner-upgrade-'));
cp.execFileSync('bash',['-c','git archive c4e66520fe7fe2a81e162669c11020bfa9c7aa55 | tar -x -C "$1"','_',dir],{cwd:root});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),f=path.resolve(dir,'.'+(u.pathname==='/'?'/index.html':u.pathname));
 if(!f.startsWith(dir+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,data)=>{if(e)return res.writeHead(404).end();res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'}[path.extname(f)]||'text/plain'),'Cache-Control':'no-store'}).end(data);});});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const c=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
  await c.addInitScript(()=>{localStorage.setItem('jvs-unlock',JSON.stringify({t:Date.now()}));if(!localStorage.getItem('planner-migration-marker')){
   localStorage.setItem('planner-migration-marker','keep');localStorage.setItem('jvs-op-tools-v1',JSON.stringify({schema:1,city:'Asia/Seoul',note:'기존 여행 메모 보존',items:[{text:'기존 준비물',checked:true},{text:'기존 할 일',checked:false}],rate:'1400'}));}});
  await c.route('https://api.open-meteo.com/**',r=>r.fulfill({json:{current:{temperature_2m:12.3}}}).catch(()=>{}));
  const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'load'});await p.locator('#boot.off').waitFor({timeout:30000});
  assert.equal(await p.evaluate(()=>JVS_VER),'20.35');assert.equal(await p.evaluate(()=>typeof JVSOPTools.validDate),'undefined');
  await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForFunction(()=>!!navigator.serviceWorker.controller,{timeout:15000});
  for(const f of ['index.html','sw.js','op-hud.js','op-tools.js'])fs.copyFileSync(path.join(root,f),path.join(dir,f));
  await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
  try{await p.waitForFunction(()=>typeof JVSOPTools.validDate==='function',{timeout:20000});}catch{await p.reload();await p.waitForFunction(()=>typeof JVSOPTools.validDate==='function',{timeout:20000});}
  await p.locator('#boot.off').waitFor({timeout:30000});assert.equal(await p.evaluate(()=>JVS_VER),'20.36');await p.evaluate(()=>brainSend('op'));await p.locator('#opTools').waitFor();
  assert.equal(await p.locator('#optNote').inputValue(),'기존 여행 메모 보존');assert.equal(await p.locator('#optCity').inputValue(),'Asia/Seoul');
  assert.equal(await p.locator('#optList input[type=checkbox]').count(),2);assert.equal(await p.locator('#optList input[type=checkbox]').first().isChecked(),true);
  assert.match(await p.locator('#optPlanSummary').textContent(),/완료 1 \/ 2/);
  const today=await p.evaluate(()=>JVSOPTools.localDay(Date.now()));
  await p.locator('#optItem').fill('오늘 준비 🧪');await p.locator('#optItemDate').fill(today);await p.locator('#optAdd').tap();
  await p.locator('#optItem').fill('내일 할 일 <img src=x onerror=alert(1)>');await p.locator('#optItemDate').fill('2099-10-10');await p.locator('#optAdd').tap();
  assert.equal(await p.locator('#optList img').count(),0);assert.equal(await p.locator('#optList input[type=checkbox]').count(),4);
  await p.locator('#optPlanFilter').selectOption('today');assert.equal(await p.locator('#optList input[type=checkbox]').count(),1);assert.match(await p.locator('#optList').textContent(),/오늘 준비/);
  await p.locator('#optList button[aria-label="오늘 준비 🧪 수정"]').tap();assert.equal(await p.locator('#optPlanFilter').isDisabled(),true);
  await p.locator('#optList input[aria-label="할 일 수정"]').fill('수정한 일정');await p.locator('#optList input[aria-label="날짜 수정"]').fill('2098-03-02');
  await p.locator('#optList button', {hasText:'저장'}).tap();assert.equal(await p.locator('#optList input[type=checkbox]').count(),0);
  await p.locator('#optPlanFilter').selectOption('all');assert.match(await p.locator('#optList').textContent(),/수정한 일정/);assert.match(await p.locator('#optList').textContent(),/2098-03-02/);
  await p.locator('#optList button[aria-label="수정한 일정 수정"]').tap();await p.locator('#optList input[aria-label="할 일 수정"]').fill('취소될 내용');await p.locator('#optList button', {hasText:'취소'}).tap();assert.match(await p.locator('#optList').textContent(),/수정한 일정/);
  await p.locator('#optList input[aria-label="수정한 일정 완료"]').check();await p.locator('#optPlanFilter').selectOption('done');assert.equal(await p.locator('#optList input[type=checkbox]').count(),2);
  await p.locator('#optPlanFilter').selectOption('pending');assert.equal(await p.locator('#optList input[type=checkbox]').count(),2);
  await p.locator('#optPlanFilter').selectOption('all');await p.locator('#optList button[aria-label="내일 할 일 <img src=x onerror=alert(1)> 삭제"]').tap();
  const backup=await p.evaluate(()=>makeFullBackup());const state=JSON.parse(backup.keys['jvs-op-tools-v1']);assert.equal(state.note,'기존 여행 메모 보존');assert.equal(state.items.length,3);
  assert.ok(state.items.some(x=>x.text==='수정한 일정'&&x.date==='2098-03-02'&&x.checked));
  assert.equal(await p.locator('#opHud').evaluate(e=>e.scrollWidth<=e.clientWidth),true);
  await p.locator('#opClose').tap();await c.setOffline(true);await p.reload();await p.locator('#boot.off').waitFor({timeout:30000});await p.evaluate(()=>brainSend('op'));await p.locator('#opTools').waitFor();
  assert.equal(await p.locator('#optNote').inputValue(),'기존 여행 메모 보존');assert.match(await p.locator('#optList').textContent(),/수정한 일정/);assert.match(await p.locator('#optList').textContent(),/2098-03-02/);
  assert.equal(await p.locator('#optList input[aria-label="수정한 일정 완료"]').isChecked(),true);assert.equal(await p.evaluate(()=>localStorage.getItem('planner-migration-marker')),'keep');
  await p.locator('#optNote').fill('백업 후 변경');
  await Promise.all([p.waitForNavigation({waitUntil:'load',timeout:30000}),p.evaluate(value=>applyBackup(JSON.stringify(value)),backup)]);
  await p.locator('#boot.off').waitFor({timeout:30000});await p.evaluate(()=>brainSend('op'));await p.locator('#opTools').waitFor();
  assert.equal(await p.locator('#optNote').inputValue(),'기존 여행 메모 보존');assert.match(await p.locator('#optList').textContent(),/2098-03-02/);
  assert.equal(await p.locator('#optList input[aria-label="수정한 일정 완료"]').isChecked(),true);assert.deepEqual(errors,[]);
  console.log('PASS 20.35->planner prototype: existing state migration, dates, edit/cancel, filtering, backup/restore and offline; mobile emulation only');await c.close();
 }finally{await browser.close();await new Promise(ok=>server.close(ok));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);server.close();fs.rmSync(dir,{recursive:true,force:true});process.exitCode=1});
