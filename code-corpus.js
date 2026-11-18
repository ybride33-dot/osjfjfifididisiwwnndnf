/* 오픈소스 코드 참고자료 검색. 이 모듈은 자료를 실행하거나 모델을 학습하지 않는다. */
(function(root){
 'use strict';
 const URL='./code-corpus.json';
 let cached=null;
 async function load(fetcher){
  if(cached)return cached;
  const f=fetcher||(typeof fetch==='function'?fetch.bind(root):null);
  if(!f)throw new Error('자료 로딩을 지원하지 않습니다.');
  const res=await f(URL);if(!res.ok)throw new Error('자료를 불러오지 못했습니다.');
  const data=await res.json();
  if(!data||data.schema!==1||!Array.isArray(data.files))throw new Error('자료 형식 오류');
  cached=data;return data;
 }
 const aliases=[
  [/이진\s*탐색/g,'binary search'],[/이분\s*탐색/g,'binary search'],
  [/퀵\s*정렬/g,'quick sort'],[/병합\s*정렬/g,'merge sort'],[/버블\s*정렬/g,'bubble sort'],[/정렬/g,'sort'],
  [/다익스트라/g,'dijkstra'],[/최단\s*경로/g,'shortest path'],[/깊이\s*우선/g,'depth first'],
  [/너비\s*우선/g,'breadth first'],[/이진\s*트리/g,'binary tree'],[/연결\s*리스트/g,'linked list'],
  [/동적\s*계획법/g,'dynamic programming'],[/피보나치/g,'fibonacci'],[/그래프/g,'graph'],
  [/트리/g,'tree'],[/배열/g,'array'],[/스택/g,'stack'],[/큐/g,'queue'],[/해시/g,'hash'],
  [/재귀/g,'recursive'],[/팩토리얼/g,'factorial'],[/테스트/g,'test']
 ];
 function normalize(s){return String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[^a-z0-9가-힣]+/g,' ').trim();}
 function tokenize(query){
  let s=String(query||'').toLowerCase().slice(0,160);
  for(const [from,to] of aliases)s=s.replace(from,to);
  return [...new Set(normalize(s).split(/\s+/).filter(x=>x.length>0))].slice(0,8);
 }
 function search(data,query){
  const terms=tokenize(query);if(!terms.length)return [];
  return data.files.map(file=>{
   const path=normalize(file.path),body=normalize(file.text.slice(0,6000));
   const pathWords=path.split(' '), bodyWords=body.split(' ');
   const match=(words,t)=>words.some(w=>w===t||(t.length>=3&&w.startsWith(t)));
   if(!terms.every(t=>match(pathWords,t)||match(bodyWords,t)))return null;
   const inPath=terms.reduce((n,t)=>n+(match(pathWords,t)?1:0),0);
   const isTest=/\/(__test__|__tests__|_test_)\//.test(file.path)||/\.test\.js$/.test(file.path);
   return {id:file.id,path:file.path,kind:file.kind,score:inPath*5+(file.kind==='code'&&!isTest?2:0)};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.id-b.id).slice(0,8);
 }
 async function report(fetcher){
  try{const d=await load(fetcher),n=d.files.filter(x=>x.kind==='code').length;
   return `📚 자비스 코드 자료실\n· 총 ${d.files.length}개 파일: JavaScript ${n}개 · 문서 ${d.files.length-n}개\n· 알고리즘, 자료구조, 테스트 등 원본 파일을 보관\n· 사용: “코드 자료 검색 이진 탐색” → “코드 자료 보기 번호”\n· 출처: ${d.source} (MIT, 라이선스 포함)\n※ 참고자료 검색 기능이며 모델 가중치 학습이나 자동 코드 이해가 아닙니다.`;
  }catch(e){return '코드 자료 로딩 실패 — 온라인 연결 후 새로고침해 주세요.';}
 }
 async function searchMessage(query,fetcher){
  if(!String(query||'').trim())return '검색어를 넣어 주세요. 예: “코드 자료 검색 이진 탐색”';
  try{const d=await load(fetcher),r=search(d,query);
   return `🔎 코드 자료 검색: ${String(query).slice(0,100)}\n`+(r.length?r.map(x=>`· ${x.id} [${x.kind==='code'?'코드':'문서'}] ${x.path}`).join('\n'):'일치하는 자료가 없습니다. 다른 검색어를 시도하세요.')+'\n· “코드 자료 보기 번호”로 내용을 확인합니다. 최대 8건 표시.';
  }catch(e){return '코드 자료 로딩 실패 — 연결을 확인해 주세요.';}
 }
 async function view(id,fetcher){
  try{const d=await load(fetcher),item=d.files.find(x=>x.id===Number(id));
   if(!item)return '해당 번호의 코드 자료가 없습니다.';
   const text=String(item.text),limit=2400;
   return `📄 ${item.id} · ${item.path}\n출처: ${d.source} · MIT\n\n${text.slice(0,limit)}${text.length>limit?'\n\n… 앞부분만 표시 ('+text.length+'자 중 '+limit+'자)':''}\n\n※ 참고용 원본. 다른 파일 의존성이 있을 수 있으며 자동 실행하지 않습니다.`;
  }catch(e){return '코드 자료 로딩 실패 — 연결을 확인해 주세요.';}
 }
 const api={load,normalize,tokenize,search,report,searchMessage,view};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSCodeCorpus=api;
})(typeof globalThis!=='undefined'?globalThis:this);
