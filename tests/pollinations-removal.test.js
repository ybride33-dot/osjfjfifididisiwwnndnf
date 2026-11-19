const fs=require('node:fs'),assert=require('node:assert/strict');const html=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
for(const needle of ['text.pollinations.ai','폴리네이션','cloudAsk','cloudPing','LLM.CLOUD','온라인 우선','LLM.modeIs','LLM.setMode','gemma-2-2b-it','@mlc-ai/web-llm'])assert.ok(!html.includes(needle),'Removed '+needle);
assert.ok(!sw.includes('pollinations'));assert.ok(html.includes('ko.wikipedia.org'));assert.ok(html.includes('instruction-code-model.js'));assert.ok(html.includes('op-tools.js'));assert.ok(!html.includes("removeItem('jvs-bmode')"));assert.ok(!html.includes('const LLM={'));
console.log('PASS cloud answer route and Gemma removed; Wikipedia, saved preferences, trained model and OP tools retained');
