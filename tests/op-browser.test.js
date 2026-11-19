/* Optional browser integration test: NODE_PATH=/path/to/playwright/node_modules node tests/op-browser.test.js */
let chromium;try{chromium=require('playwright').chromium;}catch{console.log('SKIP browser test: install playwright and Chromium');process.exit(0);}
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}const ext=path.extname(f),mime={'.html':'text/html','.js':'text/javascript','.json':'application/json'}[ext]||'text/plain';fs.readFile(f,(e,data)=>{if(e)res.writeHead(404).end();else res.writeHead(200,{'Content-Type':mime}).end(data);});});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const port=server.address().port;
 const browser=await chromium.launch({args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:740},isMobile:true,hasTouch:true});
 await context.addInitScript(()=>{localStorage.setItem('jvs-unlock',JSON.stringify({t:Date.now()}));if(!localStorage.getItem('jvs-browser-test'))localStorage.setItem('jvs-browser-test','preserved');});
 await context.route('https://api.open-meteo.com/**',async route=>{await route.fulfill({json:{current:{temperature_2m:12.3}}}).catch(()=>{});});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:'+port+'/',{waitUntil:'load'});await page.locator('#boot.off').waitFor({timeout:20000});
 assert.equal(await page.evaluate(()=>JVS_VER),'20.33');
 await page.locator('#inp').fill('op');await page.locator('#send').tap();await page.locator('#opHud').waitFor();
 assert.equal(await page.locator('#opClose').evaluate(e=>getComputedStyle(e).pointerEvents),'auto');
 assert.equal(await page.locator('#opClose').evaluate(e=>{const r=e.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),true);
 await page.locator('#opClose').tap();assert.equal(await page.locator('#opHud').count(),0);
 assert.equal(await page.evaluate(()=>document.body.style.touchAction),'');
 await page.evaluate(()=>brainSend('오피'));await page.locator('#opHud').waitFor();await page.locator('#opClose').tap();assert.equal(await page.locator('#opHud').count(),0);
 await page.evaluate(()=>brainSend('op'));await page.locator('#opHud').waitFor();await page.keyboard.press('Escape');assert.equal(await page.locator('#opHud').count(),0);
 const result=await page.evaluate(async()=>(await brain('자비스 알고리즘 시험')).reply);assert.match(result,/8\/8/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('jvs-browser-test')),'preserved');
 await context.setOffline(true);await page.evaluate(()=>brainSend('op'));await page.locator('#opHud').waitFor();await page.waitForFunction(()=>document.querySelector('#opNetwork')?.textContent==='오프라인');await page.locator('#opClose').tap();
 assert.equal(await page.locator('#opHud').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS mobile-sized Chromium: typed OP, voice transcript route, touch close, repeat, Escape, offline, saved state and coding command');
 await browser.close();await new Promise(resolve=>server.close(resolve));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
