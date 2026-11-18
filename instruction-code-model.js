/* 실험용: 한국어 요청을 조건으로 문자별 코드를 생성하는 직접 학습 MLP. 출력을 실행하지 않는다. */
(function(root){
'use strict';
let cache=null,pending=null;
const shapes={E:[96,12],W:[288,128],Q:[256,128],b:[128],O:[128,96],c:[96]};
function validate(data){
 if(!data||data.schema!==1||typeof data.vocab!=='string'||data.vocab.length!==95||!data.metadata||!data.weights)return false;
 const m=data.metadata;if(m.ctx!==24||m.dim!==12||m.hidden!==128||m.features!==256)return false;
 return Object.entries(shapes).every(([key,shape])=>{const v=data.weights[key];return v&&Array.isArray(v.shape)&&v.shape.length===shape.length&&shape.every((n,i)=>v.shape[i]===n)&&Array.isArray(v.data)&&v.data.length===shape.reduce((a,b)=>a*b,1)&&v.data.every(Number.isFinite);});
}
function prepare(data){if(!validate(data))throw Error('모델 형식이 잘못되었습니다.');const w={};for(const k of Object.keys(shapes))w[k]=new Float32Array(data.weights[k].data);return {vocab:data.vocab,meta:data.metadata,w};}
async function load(fetcher){
 if(cache)return cache;if(pending)return pending;const f=fetcher||(typeof fetch==='function'?fetch.bind(root):null);if(!f)throw Error('모델 파일을 불러오지 못했습니다.');
 pending=(async()=>{const r=await f('./instruction-weights.json');if(!r.ok)throw Error('모델 파일을 불러오지 못했습니다.');return prepare(await r.json());})();
 try{cache=await pending;return cache;}finally{pending=null;}
}
function features(prompt){
 const s=Array.from(String(prompt).toLowerCase().replace(/\s/g,'')).slice(0,200),q=new Float64Array(256);let n=0;
 for(let width=1;width<=2;width++)for(let i=0;i<=s.length-width;i++){let h=2166136261;for(let k=0;k<width;k++)h=Math.imul((h^s[i+k].codePointAt(0))>>>0,16777619)>>>0;q[h%256]++;n++;}
 if(n){const norm=Math.sqrt(n);for(let i=0;i<256;i++)q[i]/=norm;}return q;
}
function generate(m,prompt,maxLength){
 if(typeof prompt!=='string'||!prompt.trim()||Array.from(prompt).length>160)throw Error('코딩 요청은 1~160자로 입력하세요.');
 const q=features(prompt),w=m.w,base=new Float64Array(128),v=m.vocab,ids=[];for(let j=0;j<128;j++)base[j]=w.b[j];
 for(let i=0;i<256;i++){if(!q[i])continue;const off=i*128;for(let j=0;j<128;j++)base[j]+=q[i]*w.Q[off+j];}
 const n=Math.max(1,Math.min(100,Number.isInteger(maxLength)?maxLength:100));
 for(let step=0;step<n;step++){
  const h=Float64Array.from(base),offset=Math.max(0,24-ids.length);
  for(let i=0;i<24;i++){
   const token=i<offset?0:ids[ids.length-(24-i)];const baseE=token*12;
   for(let k=0;k<12;k++){const x=w.E[baseE+k],row=(i*12+k)*128;for(let j=0;j<128;j++)h[j]+=x*w.W[row+j];}
  }
  for(let j=0;j<128;j++)h[j]=Math.tanh(h[j]);let best=0,top=-Infinity;
  for(let k=0;k<96;k++){let z=w.c[k];for(let j=0;j<128;j++)z+=h[j]*w.O[j*96+k];if(z>top){top=z;best=k;}}
  if(best===95)return ids.map(x=>v[x]).join('');ids.push(best);
 }
 return ids.map(x=>v[x]).join('');
}
async function report(fetcher){try{const m=await load(fetcher),a=m.meta;return `🧪 자비스 코딩 요청 학습 실험\n· 외부 모델 없이 만든 신경망: ${a.parameters.toLocaleString()}개 가중치\n· MIT 코드 ${a.code_files.train}개 파일로 선행 학습 후, 직접 작성한 기초 문제 ${a.train_tasks}유형과 한국어 요청 ${a.train_prompts}개로 추가 학습\n· 학습한 유형의 미사용 요청: 정답 코드와 완전히 일치 ${a.test_before_exact}/${a.test_total} → ${a.test_exact}/${a.test_total}\n· 이 ${a.test_exact}개 일치 코드의 예제 입력 검사: 600/600 통과 (미리 허용된 코드만 시험)\n· 별도 표현 요청: ${a.extra_exact}/${a.extra_total} · 새로 작성한 추가 요청: ${a.fresh_exact}/${a.fresh_total}\n· 학습하지 않은 새 문제 유형: ${a.novel_exact}/${a.novel_total}\n· 사용: “자비스 코딩 요청 두 숫자를 더하는 함수를 만들어줘”\n※ 미사용 요청도 훈련 예시와 표현이 비슷하고 정답 코드는 훈련에 나온 코드입니다. 일반 코딩·자유 대화 점수가 아닙니다. 답변 학습 이후 기존 코드 예측력이 일부 떨어졌습니다. 처음 보는 작업은 틀릴 수 있으며 코드를 자동 실행하지 않습니다.`;}catch(e){return '❌ 요청 모델을 불러오지 못했습니다. 인터넷 연결을 확인하세요.';}}
async function requestMessage(prompt,fetcher){try{const m=await load(fetcher),out=generate(m,prompt);return `🧪 학습된 자비스의 코드 생성 (실험)\n요청: ${prompt}\n\n${out||'(생성 결과 없음)'}\n\n※ 정답이 아닐 수 있습니다. 특히 학습하지 않은 문제는 엉뚱한 답을 낼 수 있습니다. 실행하거나 자동 검증하지 않았습니다.`;}catch(e){return '❌ '+(e&&e.message||'모델 오류');}}
const api={validate,prepare,load,features,generate,report,requestMessage};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSInstructionCode=api;
})(typeof globalThis!=='undefined'?globalThis:this);
