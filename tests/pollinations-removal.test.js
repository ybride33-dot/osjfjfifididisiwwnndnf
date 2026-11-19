const fs=require('node:fs'),assert=require('node:assert/strict'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
for(const needle of ['text.pollinations.ai','폴리네이션','cloudAsk','cloudPing','LLM.CLOUD','온라인 우선','LLM.modeIs','LLM.setMode'])assert.ok(!html.includes(needle),'Removed '+needle);
assert.ok(!sw.includes('pollinations'),'Old service worker fetch allowlist removed');assert.ok(html.includes('ko.wikipedia.org'));assert.ok(html.includes('gemma-2-2b-it-q4f16_1-MLC'));assert.ok(html.includes('instruction-code-model.js'));assert.ok(html.includes('op-tools.js'));assert.ok(!html.includes("removeItem('jvs-bmode')"),'legacy preferences preserved');
const start=html.indexOf('const LLM={eng:null'),end=html.indexOf('\n};',start)+3;const ctx=vm.createContext({navigator:{gpu:{}},console,store:{get(){},set(){}}});vm.runInContext(html.slice(start,end)+';globalThis.model=LLM;',ctx);
assert.equal(typeof ctx.model.cloudAsk,'undefined');assert.equal(typeof ctx.model.cloudAskS,'undefined');assert.equal(typeof ctx.model.cloudPing,'undefined');assert.equal(typeof ctx.model.ask,'function');assert.equal(ctx.model.MODELS.pro,'gemma-2-2b-it-q4f16_1-MLC');
console.log('PASS cloud answer route, requests, UI and SW removed; Wikipedia, saved preferences, local model and OP tools retained');
