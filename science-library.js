/* 과학·수학 참고 자료실: 출처가 있는 발췌문 검색. 모델 학습/추론 기능은 아니다. */
(function(root){
 'use strict';
 const URL='./science-corpus.json';let cached=null,pending=null;
 async function load(fetcher){
  if(cached)return cached;if(pending)return pending;
  const f=fetcher||(typeof fetch==='function'?fetch.bind(root):null);if(!f)throw new Error('fetch unavailable');
  pending=(async()=>{const res=await f(URL);if(!res.ok)throw new Error('download failed');const d=await res.json();
   if(!d||d.schema!==1||!Array.isArray(d.records)||!d.sources)throw new Error('invalid dataset');
   cached=d;return d;})();
  try{return await pending;}finally{pending=null;}
 }
 const aliases=[[/슈뢰딩거/g,'schrodinger'],[/노에터/g,'noether'],[/뇌터/g,'noether'],[/양자역학/g,'quantum'],[/상대성이론/g,'relativity'],[/상대성/g,'relativity'],[/블랙홀/g,'black hole'],[/리만/g,'riemann'],[/힐베르트/g,'hilbert'],[/미분기하학/g,'geometry'],[/위상수학/g,'topology'],[/위상/g,'topology'],[/측도론/g,'measure'],[/확률론/g,'probability'],[/대수학/g,'algebra'],[/미분/g,'derivative'],[/연속/g,'continuous'],[/측도/g,'measure'],[/확률/g,'probability'],[/대수/g,'algebra']];
 function normalize(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').trim();}
 function tokens(q){let s=String(q||'').toLowerCase().slice(0,120);for(const [a,b] of aliases)s=s.replace(a,b);return [...new Set(normalize(s).split(/\s+/).filter(Boolean))].slice(0,6);}
 function search(d,q){
  const ts=tokens(q);if(!ts.length)return [];
  return d.records.map(r=>{
   const name=normalize(r.title+' '+r.field+' '+r.path),body=normalize((r.excerpt||'').slice(0,1000));
   const nw=name.split(' '),bw=body.split(' ');
   const match=(words,t)=>words.some(w=>w===t||(t.length>=3&&w.startsWith(t)));
   if(!ts.every(t=>match(nw,t)||match(bw,t)))return null;
   const titleWords=normalize(r.title).split(' ');
   return {id:r.id,kind:r.kind,field:r.field,title:r.title,score:ts.reduce((n,t)=>n+(match(nw,t)?5:1)+(titleWords.includes(t)?4:0),0)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,8);
 }
 function kindLabel(k){return k==='mathlib'?'Lean 수학 발췌':k==='theoria'?'이론물리 유도':'물리 교재 발췌';}
 function sourceUrl(d,r){const s=d.sources[r.kind];if(!s)return '';return s.url+'/blob/'+s.revision+'/'+r.path+(r.line?'#L'+r.line:'');}
 async function report(fetcher){try{const d=await load(fetcher);return `🌌 과학·수학 자료실\n· 총 ${d.records.length}개 항목: Lean 수학 선언 ${d.counts.mathlib}개 · 이론물리 유도 ${d.counts.theoria}개 · 현대물리 교재 단원 발췌 ${d.counts.openstax}개\n· 검색: “과학 자료 검색 위상수학” 또는 “과학 자료 검색 슈뢰딩거”\n· 선택: “과학 자료 보기 번호”\n※ 서로 다른 항목 1만 개이지, 1만 개의 독립 개념이나 모델 학습을 뜻하지 않습니다. 대부분 영어·Lean 원문이고 일부 수식·맥락은 원문에서 확인해야 합니다.`;}catch(e){return '과학 자료를 불러오지 못했습니다. 인터넷 연결을 확인하세요.';}}
 async function searchMessage(query,fetcher){if(!String(query||'').trim())return '검색어를 넣어 주세요.';try{const d=await load(fetcher),out=search(d,query);return `🔭 과학 자료 검색: ${String(query).slice(0,100)}\n`+(out.length?out.map(x=>`· ${x.id} [${kindLabel(x.kind)}] ${x.field} / ${x.title}`).join('\n'):'결과 없음. 다른 한글·영어 검색어를 시도하세요.')+'\n· “과학 자료 보기 번호”로 출처와 발췌를 확인하세요.';}catch(e){return '과학 자료를 불러오지 못했습니다. 인터넷 연결을 확인하세요.';}}
 async function view(id,fetcher){try{const d=await load(fetcher),r=d.records.find(x=>x.id===Number(id));if(!r)return '해당 번호의 과학 자료가 없습니다.';
  const source=d.sources[r.kind]||{},text=String(r.excerpt||''),limit=2300;
  return `📄 ${r.id} [${kindLabel(r.kind)}] ${r.field} — ${r.title}\n출처: ${source.name||''} · ${source.license||''}${r.contributors?' · 기여자: '+r.contributors:''}\n${source.authors?'저자: '+source.authors+'\n':''}${source.credit?source.credit+'\n':''}원문: ${sourceUrl(d,r)}\n\n${text.slice(0,limit)}${text.length>limit?'\n… 앞부분만 표시 ('+text.length+'자 중 '+limit+'자)':''}\n\n※ 발췌문이며 전체 맥락·수식·가정은 원문을 확인하세요.`;
 }catch(e){return '과학 자료를 불러오지 못했습니다. 인터넷 연결을 확인하세요.';}}
 const api={load,tokens,search,report,searchMessage,view,sourceUrl};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSScienceLibrary=api;
})(typeof globalThis!=='undefined'?globalThis:this);
