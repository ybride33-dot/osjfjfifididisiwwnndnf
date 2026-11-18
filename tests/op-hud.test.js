const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const op=require('../op-hud.js');
for(const s of ['op','OP','오피','오 피','자비스 오피!'])assert.ok(op.isCommand(s),s);
for(const s of ['토니','open','오피스'])assert.ok(!op.isCommand(s),s);
const html=fs.readFileSync('index.html','utf8');
const begin=html.indexOf('async function brain(text){'),end=html.indexOf('  /* 학습된 커스텀 스킬 최우선 */',begin);
let calls=0;const ctx=vm.createContext({typoFix:x=>x,detectLang:()=> 'ko',JVSOP:{isCommand:op.isCommand,toggle(){calls++}}});
vm.runInContext(html.slice(begin,end)+'return {reply:"unhandled"}; }',ctx);
(async()=>{for(const t of ['op','오피','오 피'])assert.match((await ctx.brain(t)).reply,/OP 패널/);assert.equal(calls,3);assert.match(fs.readFileSync('sw.js','utf8'),/op-hud\.js/);assert.ok(!html.includes('성능 발전 (perfLevel 궤적)'));console.log('PASS OP typed/voice transcript routing, HUD cache, old growth graph removed');})().catch(e=>{console.error(e);process.exitCode=1});
