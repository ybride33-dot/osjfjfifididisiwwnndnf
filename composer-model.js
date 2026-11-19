/* Experimental locally trained semantic parser + constrained JS generator.
   The neural weights predict operations; coding-engine.js renders and tests them.
   Never executes arbitrary generated or user JavaScript. */
(function(root){
'use strict';
const SIGNS=['none','positive','negative','nonzero'],PARITIES=['none','even','odd'],MAPS=['identity','square','abs','double','negate'],REDUCERS=['sum','count','product','max','min','array','sort','unique','prefix','mean','median','mode','maxsub'];
const SIZES=[4,3,5,13],SHAPES={W:[512,96],b:[96],O:[96,25],c:[25]},CONFIDENCE=0.8;
let cached=null,pending=null;
function validate(data){if(!data||data.schema!==1||!data.metadata||!data.weights||data.metadata.features!==512||data.metadata.hidden!==96)return false;return Object.entries(SHAPES).every(([k,s])=>{const v=data.weights[k];return v&&Array.isArray(v.shape)&&v.shape.length===s.length&&s.every((x,i)=>v.shape[i]===x)&&Array.isArray(v.data)&&v.data.length===s.reduce((a,b)=>a*b,1)&&v.data.every(Number.isFinite);});}
function prepare(data){if(!validate(data))throw Error('학습 모델 형식을 확인해 주세요.');const w={};for(const k of Object.keys(SHAPES))w[k]=new Float32Array(data.weights[k].data);return {meta:data.metadata,w};}
async function load(fetcher){if(cached)return cached;if(pending)return pending;const f=fetcher||(typeof fetch==='function'?fetch.bind(root):null);if(!f)throw Error('모델 파일을 불러오지 못했습니다.');pending=(async()=>{const r=await f('./composer-weights.json');if(!r.ok)throw Error('모델 파일을 불러오지 못했습니다.');return prepare(await r.json());})();try{cached=await pending;return cached;}finally{pending=null;}}
function features(prompt){const s=Array.from(String(prompt).toLowerCase().replace(/\s/g,'')).slice(0,240),q=new Float64Array(512);let count=0;for(let width=1;width<=3;width++)for(let i=0;i<=s.length-width;i++){let h=2166136261;for(let k=0;k<width;k++)h=Math.imul((h^s[i+k].codePointAt(0))>>>0,16777619)>>>0;q[h%512]++;count++;}if(count){const norm=Math.sqrt(count);for(let i=0;i<512;i++)q[i]/=norm;}return q;}
function predict(model,prompt){
 const q=features(prompt),w=model.w,h=new Float64Array(96),z=new Float64Array(25);for(let j=0;j<96;j++)h[j]=w.b[j];
 for(let i=0;i<512;i++){if(!q[i])continue;for(let j=0;j<96;j++)h[j]+=q[i]*w.W[i*96+j];}for(let j=0;j<96;j++)h[j]=Math.tanh(h[j]);
 for(let k=0;k<25;k++){z[k]=w.c[k];for(let j=0;j<96;j++)z[k]+=h[j]*w.O[j*25+k];}
 let offset=0,confidence=1;const ids=[];for(const size of SIZES){let best=0;for(let k=1;k<size;k++)if(z[offset+k]>z[offset+best])best=k;let den=0;for(let k=0;k<size;k++)den+=Math.exp(z[offset+k]-z[offset+best]);confidence=Math.min(confidence,1/den);ids.push(best);offset+=size;}
 const filters=[SIGNS[ids[0]],PARITIES[ids[1]]].filter(x=>x!=='none');return {program:{filters,map:MAPS[ids[2]],reducer:REDUCERS[ids[3]]},confidence,indices:ids};
}
function supportReason(s){
 if(typeof s!=='string'||!s.trim()||Array.from(s).length>160)return '요청은 1~160자로 입력해 주세요.';
 if(!/(배열|리스트|목록)/.test(s))return '이 실험은 숫자 배열 요청만 지원합니다. 예: 배열에서 양수인 짝수 원소를 제곱한 뒤 합계를 구해 줘';
 if(/문자열|텍스트|문자\s*배열|객체|정규식|파일|웹사이트|페이지|API|행렬|인덱스|위치|내림차순|역순|오름차순.{0,15}내림차순/i.test(s))return '이 요청은 현재 숫자 배열 실험 범위를 벗어났습니다.';
 const conditionsText=s.replace(/0\s*이\s*아닌/g,'').replace(/바꾸지\s*말고/g,'');
 if(/아닌|제외|말고|빼고|이상|이하|초과|미만|배수|나머지|처음.{0,3}(?:개|항)|마지막.{0,3}(?:개|항)/.test(conditionsText))return '복잡하거나 숫자 기준이 있는 조건은 지원하지 않습니다.';
 if(/뒤집/.test(s)&&!/부호.{0,5}뒤집/.test(s))return '배열 역순은 지원하지 않습니다.';
 if(/제곱근|루트|세제곱|나눗셈|나누|소수점|소수만|소수인|소수\s*찾|중복.{0,5}횟수|내림|\b(?:eval|function|javascript|script)\b|<script|https?:|삭제|전송|파일|해킹/i.test(s))return '현재 지원하지 않는 연산이나 요청입니다.';
 const maps=[/제곱/,/절댓값|절대값/,/두\s*배|2\s*배/,/부호.{0,5}(?:반전|바꾸|뒤집)/].filter(r=>r.test(s)).length;
 if(maps>1)return '한 번에 변환 하나만 지원합니다. 여러 변환은 나누어 요청해 주세요.';
 return null;
}
function same(a,b){return Array.isArray(a)?Array.isArray(b)&&a.length===b.length&&a.every((x,i)=>x===b[i]):a===b;}
function checkInputs(ex){return Array.isArray(ex)&&ex.length>=2&&ex.length<=8&&ex.every(x=>x&&typeof x==='object'&&Array.isArray(x.input)&&x.input.length<=100&&Array.from(x.input).every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=1000)&&(x.output===null||(typeof x.output==='number'&&Number.isFinite(x.output))||(Array.isArray(x.output)&&x.output.length<=100&&Array.from(x.output).every(Number.isSafeInteger))));}
function solve(model,request,examples,engine){
 const err=supportReason(request);if(err)return {error:err};if(!engine||typeof engine.run!=='function')return {error:'코딩 엔진이 준비되지 않았습니다.'};const guess=predict(model,request),p=guess.program;
 if(examples===undefined){if(guess.confidence<CONFIDENCE)return {error:'요청을 확신 있게 해석하지 못했어요. 조건·변환·결과를 더 구체적으로 적거나 입력과 정답 예제 2개 이상을 주세요.',uncertain:true};return {program:p,confidence:guess.confidence,examples:null};}
 if(!checkInputs(examples))return {error:'예제는 input 정수 배열과 output으로 2~8개 입력해 주세요. 정수는 -1000~1000, 배열은 최대 100개입니다.'};
 let originalPass=true,checks=[];for(const e of examples){try{const got=engine.run(p,e.input),ok=same(got,e.output);checks.push({input:e.input,expected:e.output,got,ok});if(!ok)originalPass=false;}catch(err){checks.push({input:e.input,expected:e.output,got:null,ok:false,error:true});originalPass=false;}}
 const search=engine.search(examples);if(search.error)return {error:search.error};if(!search.program)return {error:'입력 예제와 일치하는 코드를 제한 후보 1,040개에서 찾지 못했습니다.',checks};
 return {program:originalPass?p:search.program,initialProgram:p,changed:!originalPass,matches:search.matches,examined:search.examined,checks,confidence:guess.confidence,examples};
}
async function report(fetcher){try{const m=(await load(fetcher)).meta;return `🧪 자비스 코딩 조합 학습\n· 무작위 초기값부터 학습: 가중치 ${m.parameters.toLocaleString()}개 · 외부 모델 없음\n· 숫자 배열의 조건·변환·결과를 나누어 예측하고 기존 제한 코드 엔진으로 조립합니다.\n· 합성 학습 ${m.train_examples.toLocaleString()}개 요청 / ${m.train_combinations}개 조합\n· 표현 패턴이 비슷한 미학습 조합 시험: ${m.test_before.exact}/${m.test_before.total} → ${m.test_after.exact}/${m.test_after.total}\n· 새로 손으로 쓴 20개 요청: 모델 원시 해석 ${m.fresh_raw_exact}/${m.fresh_total} 일치, 지원 범위 검사 또는 확신 부족으로 ${m.fresh_abstained}개는 답변 보류. 코드 생성한 ${m.fresh_accepted}개 중 ${m.fresh_accepted_correct}개 일치.\n· 사용: 자비스 코딩 연습 배열 속 양수인 짝수 원소를 제곱한 뒤 합계를 구해 줘\n· 예제로 시험: 요청 뒤에 | [{"input":[-2,2,4],"output":20},{"input":[2,3],"output":4}]\n※ 숫자 배열 도구이며 자유로운 프로그래밍·대화 모델은 아닙니다. 조합은 새로워도 각 연산은 사전에 구현돼 있습니다. 조합 시험은 개발 중 반복 활용됐습니다. 예제가 일치해도 모든 입력에 맞는다는 보장은 없습니다.`;}catch(e){return '❌ 조합 모델을 불러오지 못했습니다. 첫 사용에 인터넷이 필요합니다.';}}
async function practiceMessage(raw,fetcher,engine){
 try{const parts=String(raw||'').split('|');if(parts.length>2)return '❌ 요청과 예제 JSON을 | 하나로 나눠 주세요.';const prompt=parts[0].trim();let examples;if(parts.length===2){if(parts[1].length>6000)return '❌ 예제가 너무 깁니다.';try{examples=JSON.parse(parts[1]);}catch(e){return '❌ 예제 JSON 형식을 확인해 주세요.';}}
 const model=await load(fetcher),eng=engine||root.JVSCodingEngine,result=solve(model,prompt,examples,eng);if(result.error)return '❌ '+result.error;
 let head='🧩 자비스 코딩 연습 · 숫자 배열 제한\n· 요청 해석: '+eng.describe(result.program)+'\n';
 if(result.examples){head+=result.changed?'· 첫 해석이 예제에 맞지 않아 제한 후보를 다시 탐색했습니다.\n':'· 첫 해석이 입력 예제에 맞았습니다.\n';head+='· 예제 '+result.examples.length+'개 일치 · 후보 '+result.matches+'/'+result.examined+'개\n';if(result.matches>1)head+='· 서로 다른 후보가 여럿입니다. 요청 의도와 다를 수 있으니 구별되는 예제를 더 주세요.\n';}
 else head+='· 입력 예제를 주지 않아 정답 여부는 시험하지 않았습니다.\n';
 return head+'\n'+eng.render(result.program)+'\n\n※ 해석이 의도와 다를 수 있습니다. 예제 일치도 의도를 보증하지 않으니 확인해 주세요. 정해진 연산으로 코드를 조립하며 임의 코드는 자동 실행하지 않습니다.';
 }catch(e){return '❌ '+(e&&e.message||'모델 처리 오류');}}
const api={SIGNS,PARITIES,MAPS,REDUCERS,CONFIDENCE,validate,prepare,load,features,predict,supportReason,checkInputs,solve,report,practiceMessage};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSComposer=api;
})(typeof globalThis!=='undefined'?globalThis:this);
