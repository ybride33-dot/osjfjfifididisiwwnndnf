/* Experimental original character MLP. Local inference only; never executes generated code. */
(function(root){
'use strict';
let cache=null,pending=null;
function validate(data){
 if(!data||data.schema!==1||typeof data.vocab!=='string'||data.vocab.length!==97||!data.metadata||!data.weights)return false;
 const m=data.metadata;if(m.context!==16||m.embedding_dim!==12||m.hidden_dim!==128)return false;
 const expected={E:[97,12],W1:[192,128],b1:[128],W2:[128,97],b2:[97]};
 return Object.entries(expected).every(([key,shape])=>{const v=data.weights[key];return v&&Array.isArray(v.shape)&&v.shape.length===shape.length&&shape.every((n,i)=>v.shape[i]===n)&&Array.isArray(v.data)&&v.data.length===shape.reduce((a,b)=>a*b,1)&&v.data.every(Number.isFinite);});
}
function prepare(data){if(!validate(data))throw Error('모델 파일 형식이 올바르지 않습니다.');const w={};for(const [k,v] of Object.entries(data.weights))w[k]=new Float32Array(v.data);return {vocab:data.vocab,meta:data.metadata,w};}
async function load(fetcher){
 if(cache)return cache;if(pending)return pending;
 const f=fetcher||(typeof fetch==='function'?fetch.bind(root):null);if(!f)throw Error('불러오기를 지원하지 않습니다.');
 pending=(async()=>{const r=await f('./coding-weights.json');if(!r.ok)throw Error('모델 파일을 불러오지 못했습니다.');return prepare(await r.json());})();
 try{cache=await pending;return cache;}finally{pending=null;}
}
function next(m,context){
 const vocab=m.vocab,w=m.w,s=String(context).slice(-16).padStart(16,' '),h=new Float64Array(128);let pos=0;
 for(let j=0;j<128;j++)h[j]=w.b1[j];
 for(let i=0;i<16;i++){
  const token=vocab.indexOf(s[i]),base=(token<0?vocab.indexOf('?'):token)*12;
  for(let k=0;k<12;k++){const x=w.E[base+k],row=(i*12+k)*128;for(let j=0;j<128;j++)h[j]+=x*w.W1[row+j];}
 }
 for(let j=0;j<128;j++)h[j]=Math.tanh(h[j]);
 let best=0,bestLogit=-Infinity;for(let k=0;k<97;k++){let z=w.b2[k];for(let j=0;j<128;j++)z+=h[j]*w.W2[j*97+k];if(z>bestLogit){bestLogit=z;best=k;}}
 return vocab[best];
}
function generate(m,prompt,length){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>400)throw Error('시작 코드는 1~400자로 입력하세요.');
 if(!Array.from(prompt).every(c=>m.vocab.includes(c)))throw Error('이 작은 모델은 영문·숫자·일반 기호 코드만 처리합니다.');
 const limit=Math.max(1,Math.min(64,Number.isInteger(length)?length:64));let text=prompt,added='';
 for(let i=0;i<limit;i++){const c=next(m,text);text+=c;added+=c;if(added.length>=16&&/^[ \t\n]+$/.test(added.slice(-16)))break;}
 return added;
}
function percent(n){return (Number(n)*100).toFixed(1)+'%';}
async function report(fetcher){try{const m=await load(fetcher),a=m.meta.test_before,b=m.meta.test_after,base=m.meta.test_baselines;
 return '🧪 자비스 초소형 코드 모델 (실험용)\n· 외부 모델 없이 무작위 초기값에서 직접 가중치 학습 · '+m.meta.parameter_count.toLocaleString()+'개 파라미터\n· 훈련 JavaScript '+m.meta.split_stats.train.files+'파일, 검증 '+m.meta.split_stats.val.files+'파일, 별도 평가 '+m.meta.split_stats.test.files+'파일 (알고리즘 폴더 단위 분리)\n· 평가 코드 16,000개 지점: 다음 글자 정확도 '+percent(a.next_char_accuracy)+' → '+percent(b.next_char_accuracy)+'; 직전 글자만 보는 단순 기준 '+percent(base.one_previous_character_accuracy)+'\n· 공백 제외 정확도 '+percent(b.non_whitespace_accuracy)+'\n· 사용: “자비스 코드 자동완성 function add(a,b){return”\n※ 다음 글자 예측 실험이지 기능을 구현하는 실력 점수가 아닙니다. 16글자 문맥만 봐서 결과가 틀리거나 무의미할 수 있습니다. 생성 코드는 자동 실행하지 않습니다. MIT 코드 자료로 학습했습니다.';
 }catch(e){return '❌ 코드 모델을 불러오지 못했습니다. 인터넷 연결을 확인하세요.';}}
async function completeMessage(prompt,fetcher){try{const m=await load(fetcher),out=generate(m,prompt,64);return '🧪 자비스 코드 모델 자동완성 (실험)\n'+prompt+out+'\n\n※ 다음 글자 예측 결과이며 잘못된 코드일 수 있습니다. 자동 실행하지 않았습니다. 학습 자료: trekhleb/javascript-algorithms, MIT.';}catch(e){return '❌ '+(e&&e.message||'모델 로딩 오류');}}
const api={validate,prepare,load,next,generate,report,completeMessage};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSTinyCodeModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
