const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
for(const str of ['generativelanguage.googleapis.com','LLM.gemAsk','LLM.GEM','LLM.hasGem','GMODELS','gemContents','Gemini 키(선택)','text.pollinations.ai/openai','gemma-2-2b-it'])assert.ok(!html.includes(str),'Removed '+str);
assert.ok(html.includes("if(k==='jvs-gk')"),'Historical secret remains excluded from backups');assert.ok(!html.includes("removeItem('jvs-gk')"),'Existing local key not deleted without explicit instruction');
assert.ok(html.includes('instruction-code-model.js')&&html.includes('코딩 엔진 시험'),'User-trained model and bounded coding engine preserved');
console.log('PASS Gemini, Pollinations, and later Gemma removal; backup exclusions and local coding retained');
