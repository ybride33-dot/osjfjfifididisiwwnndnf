/* Locally trained conditional one-block causal transformer. Never executes generated code. */
(function(root){
'use strict';
const D=48,H=4,HD=12,F=96,Q=256,CTX=80,BOS=96,EOS=95;
const SHAPES={'embedding.weight':[97,D],'position.weight':[CTX,D],'condition.weight':[D,Q],'block.ln1.weight':[D],'block.ln1.bias':[D],'block.qkv.weight':[3*D,D],'block.qkv.bias':[3*D],'block.proj.weight':[D,D],'block.proj.bias':[D],'block.ln2.weight':[D],'block.ln2.bias':[D],'block.fc1.weight':[F,D],'block.fc1.bias':[F],'block.fc2.weight':[D,F],'block.fc2.bias':[D],'final.weight':[D],'final.bias':[D],'out.weight':[96,D],'out.bias':[96]};
let cached=null,pending=null;
function validate(data){if(!data||data.schema!==1||typeof data.vocab!=='string'||data.vocab.length!==95||!data.metadata||!data.weights)return false;const m=data.metadata;if(m.ctx!==CTX||m.dimension!==D||m.heads!==H||m.ff!==F||m.features!==Q)return false;return Object.entries(SHAPES).every(([k,s])=>{const w=data.weights[k];return w&&Array.isArray(w.shape)&&w.shape.length===s.length&&s.every((n,i)=>w.shape[i]===n)&&Array.isArray(w.data)&&w.data.length===s.reduce((a,b)=>a*b,1)&&w.data.every(Number.isFinite);});}
function prepare(data){if(!validate(data))throw Error('학습 모델 형식을 확인해 주세요.');const w={};for(const k of Object.keys(SHAPES))w[k]=new Float32Array(data.weights[k].data);return {meta:data.metadata,vocab:data.vocab,w};}
async function load(fetcher){if(cached)return cached;if(pending)return pending;const f=fetcher||(typeof fetch==='function'?fetch.bind(root):null);if(!f)throw Error('모델 파일을 불러오지 못했습니다.');pending=(async()=>{const r=await f('./transformer-coding-weights.json');if(!r.ok)throw Error('모델 파일을 불러오지 못했습니다.');return prepare(await r.json());})();try{cached=await pending;return cached;}finally{pending=null;}}
function features(prompt){const s=Array.from(String(prompt).toLowerCase().replace(/\s/g,'')).slice(0,200),q=new Float64Array(Q);let n=0;for(let width=1;width<=2;width++)for(let i=0;i<=s.length-width;i++){let h=2166136261;for(let k=0;k<width;k++)h=Math.imul((h^s[i+k].codePointAt(0))>>>0,16777619)>>>0;q[h%Q]++;n++;}if(n){const norm=Math.sqrt(n);for(let i=0;i<Q;i++)q[i]/=norm;}return q;}
function linear(x,w,b,rows,cols){const out=new Float32Array(rows);for(let o=0;o<rows;o++){let z=b?b[o]:0,base=o*cols;for(let i=0;i<cols;i++)z+=x[i]*w[base+i];out[o]=z;}return out;}
function norm(x,g,b){let mean=0,varsum=0;for(const a of x)mean+=a;mean/=x.length;for(const a of x)varsum+=(a-mean)*(a-mean);const inv=1/Math.sqrt(varsum/x.length+1e-5),out=new Float32Array(x.length);for(let i=0;i<x.length;i++)out[i]=(x[i]-mean)*inv*g[i]+b[i];return out;}
function generate(m,prompt,maxLength){
 if(typeof prompt!=='string'||!prompt.trim()||Array.from(prompt).length>160)throw Error('코딩 요청은 1~160자로 입력하세요.');const w=m.w,q=features(prompt),cond=linear(q,w['condition.weight'],null,D,Q),keys=[],values=[],ids=[];let token=BOS;
 const limit=Math.max(1,Math.min(CTX,Number.isInteger(maxLength)?maxLength:CTX));
 for(let pos=0;pos<limit;pos++){
  let x=new Float32Array(D);for(let i=0;i<D;i++)x[i]=w['embedding.weight'][token*D+i]+w['position.weight'][pos*D+i]+cond[i];
  const a=norm(x,w['block.ln1.weight'],w['block.ln1.bias']),qkv=linear(a,w['block.qkv.weight'],w['block.qkv.bias'],3*D,D),k=qkv.slice(D,2*D),v=qkv.slice(2*D);keys.push(k);values.push(v);const mix=new Float32Array(D);
  for(let h=0;h<H;h++){
   const off=h*HD,scores=new Float64Array(keys.length);let highest=-Infinity;for(let j=0;j<keys.length;j++){let z=0;for(let i=0;i<HD;i++)z+=qkv[off+i]*keys[j][off+i];scores[j]=z/Math.sqrt(HD);if(scores[j]>highest)highest=scores[j];}
   let den=0;for(let j=0;j<scores.length;j++){scores[j]=Math.exp(scores[j]-highest);den+=scores[j];}for(let i=0;i<HD;i++){let z=0;for(let j=0;j<scores.length;j++)z+=scores[j]/den*values[j][off+i];mix[off+i]=z;}
  }
  const projection=linear(mix,w['block.proj.weight'],w['block.proj.bias'],D,D);for(let i=0;i<D;i++)x[i]+=projection[i];
  const ln=norm(x,w['block.ln2.weight'],w['block.ln2.bias']),hidden=linear(ln,w['block.fc1.weight'],w['block.fc1.bias'],F,D);for(let i=0;i<F;i++)hidden[i]=Math.max(0,hidden[i]);const ff=linear(hidden,w['block.fc2.weight'],w['block.fc2.bias'],D,F);for(let i=0;i<D;i++)x[i]+=ff[i];
  const final=norm(x,w['final.weight'],w['final.bias']),logits=linear(final,w['out.weight'],w['out.bias'],96,D);let best=0;for(let i=1;i<logits.length;i++)if(logits[i]>logits[best])best=i;if(best===EOS)break;ids.push(best);token=best;
 }
 return ids.map(i=>m.vocab[i]).join('');
}
async function report(fetcher){try{const m=(await load(fetcher)).meta;return `🧪 자비스 초소형 트랜스포머 코딩 실험\n· 외부 모델 없이 무작위 초기값에서 학습: 가중치 ${m.parameters.toLocaleString()}개, 주의집중 헤드 ${m.heads}개\n· 코드 ${m.code_files.train}파일로 선행 학습 → 자체 작성 ${m.train_tasks}가지 요청 유형, ${m.train_prompts}개 표현으로 추가 학습\n· 같은 50문제에서 기존 요청 모델 ${m.baseline_exact}/${m.benchmark_total} → 이 모델 ${m.benchmark_exact}/${m.benchmark_total}: 정답 코드 문자열 완전 일치 기준\n· 학습에 포함된 유형의 새 표현 ${m.seen_exact}/${m.seen_total}, 요청·정답 쌍 학습에서 제외한 유형 ${m.novel_exact}/${m.novel_total} (1개 기준 정답은 최대 출력 80자를 넘음)\n· 별도 새 표현: 학습 유형 ${m.fresh_seen_exact}/${m.fresh_seen_total} (기존 ${m.fresh_seen_old}/${m.fresh_seen_total}), 요청 학습에서 빠진 유형 ${m.fresh_novel_exact}/${m.fresh_novel_total} (2개 기준 정답은 80자를 넘음)\n· 기존 10유형의 새 표현: 기존 ${m.old_scope_baseline}/${m.old_scope_total}, 새 모델 ${m.old_scope_new}/${m.old_scope_total} (일부 퇴보)\n· 코드 다음 글자 시험: 선행 학습 직후 ${(m.code_pretrained_test.next_char_accuracy*100).toFixed(1)}% → 요청 추가 학습 후 ${(m.code_final_test.next_char_accuracy*100).toFixed(1)}% (일부 예측력 감소)\n· 사용: 자비스 코딩 트랜스포머 두 숫자를 더하는 함수를 만들어줘\n· 예제가 틀리면 정해진 후보 22개에서 일치하는 수정 후보를 찾아 제안합니다.\n· 예제 검사: 요청 뒤에 | [{"args":[2,3],"output":5},{"args":[-2,4],"output":2}]\n※ 기존 모델과 학습한 요청 유형 수가 다릅니다. 같은 정답 코드가 학습에 등장하며 시험 표현도 비슷할 수 있습니다. 문자열 비교는 동작이 같은 다른 코드도 틀린 것으로 셉니다. 정답과 다른 코드도 생성합니다. 범용 코딩 실력이나 실행 결과를 보장하지 않으며 생성 코드를 자동 실행하지 않습니다.`;}catch(e){return '❌ 트랜스포머 파일을 불러오지 못했습니다. 첫 사용에는 인터넷이 필요할 수 있습니다.';}}
async function requestMessage(raw,fetcher,auditor){try{
 const parts=String(raw||'').split('|');if(parts.length>2)throw Error('요청과 예제는 | 하나로 구분해 주세요.');const prompt=parts[0].trim();let examples;
 if(parts.length===2){if(parts[1].length>6000)throw Error('예제가 너무 깁니다.');try{examples=JSON.parse(parts[1]);}catch(e){throw Error('예제 JSON 형식을 확인해 주세요.');}}
 const m=await load(fetcher),out=generate(m,prompt);let report='· 예제가 없어 결과를 시험하지 않았습니다.',suggestion='';
 if(examples!==undefined){const a=auditor||root.JVSCodingAuditor;if(!a||typeof a.check!=='function')report='· 예제 검사 도구가 준비되지 않았습니다.';else{const r=a.check(out,examples);report=r.error?'· 검사 보류: '+r.error:'· 예제 '+r.pass+'/'+r.total+'개 일치 (확인된 코드의 별도 참조 연산으로 비교)\n'+r.results.map((x,i)=>(x.ok?'✅ ':'❌ ')+(i+1)+'번: 결과 '+JSON.stringify(x.got)+' / 기대 '+JSON.stringify(x.expected)).join('\n');
 if((r.error||r.pass!==r.total)&&typeof a.suggest==='function'){const found=a.suggest(examples);if(!found.error){if(found.matches.length===1)suggestion='\n\n🔧 예제와 일치하는 수정 후보 1/'+found.examined+'개 (자동 변경 아님):\n'+found.matches[0].code+'\n· 예제와 일치할 뿐 요청 의도나 다른 입력에서의 정답을 보장하지 않습니다.';else if(found.matches.length>1)suggestion='\n\n🔎 예제에 맞는 후보가 '+found.matches.length+'/'+found.examined+'개입니다. 서로 구별되는 예제를 더 주세요.';else suggestion='\n\n🔎 정해진 후보 '+found.examined+'개에서 예제에 맞는 수정 후보를 찾지 못했습니다.';}}
 }}
 return `🧪 자비스 트랜스포머 코드 생성 · 실험\n요청: ${prompt}\n${report}\n\n${out||'(생성 결과 없음)'}${suggestion}\n\n※ 코드가 틀리거나 미완성일 수 있습니다. 정해진 참조 연산만 검사하며 생성 코드를 자동 실행하지 않습니다. 예제가 맞아도 다른 입력을 보장하지 않습니다.`;
 }catch(e){return '❌ '+(e&&e.message||'모델 처리 오류');}}
const api={SHAPES,validate,prepare,load,features,generate,report,requestMessage};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSTransformerCoding=api;
})(typeof globalThis!=='undefined'?globalThis:this);
