const fs=require('node:fs'),assert=require('node:assert/strict');const html=fs.readFileSync('index.html','utf8');
assert.ok(!/Qwen2\.5-0\.5B-Instruct|Qwen2\.5-1\.5B-Instruct|Qwen\/Qwen2\.5-0\.5B|neopolita\/qwen2\.5|@wllama\/wllama/i.test(html),'Qwen runners absent');
assert.ok(!html.includes('brwLoad(){')&&!html.includes('skullRemoteRun(){')&&!html.includes('gemma-2-2b-it'),'all user-removed model routes absent');
assert.ok(!html.includes("removeItem('jvs-llm')"),'previous settings not erased');assert.match(html,/기존 기록은 보존됩니다/);assert.match(html,/coding-engine\.js/);assert.ok(Number((fs.readFileSync('sw.js','utf8').match(/jarvis-v4-single-(\d+)/)||[])[1])>=87);
console.log('PASS Qwen/Gemma runners remain removed; previous preferences and coding tools retained');
