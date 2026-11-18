/* Self-contained, bounded algorithms. No external model, eval, dynamic code execution, or user JS. */
(function(root){
'use strict';
function binarySearch(p){
 if(!p||!Array.isArray(p.values)||p.values.length>10000||!Array.from(p.values).every(Number.isSafeInteger)||!Number.isSafeInteger(p.target))throw new TypeError('정수 배열 values와 정수 target 필요');
 const a=p.values;for(let i=1;i<a.length;i++)if(a[i]<a[i-1])throw new TypeError('배열은 오름차순이어야 합니다');
 let lo=0,hi=a.length;while(lo<hi){const mid=lo+Math.floor((hi-lo)/2);if(a[mid]<p.target)lo=mid+1;else hi=mid;}return lo<a.length&&a[lo]===p.target?lo:-1;
}
function dijkstra(p){
 if(!p||!Number.isInteger(p.n)||p.n<1||p.n>100||!Array.isArray(p.edges)||p.edges.length>1000||!Number.isInteger(p.start)||!Number.isInteger(p.end)||p.start<0||p.start>=p.n||p.end<0||p.end>=p.n)throw new TypeError('n(1~100), edges, start, end 확인');
 const g=Array.from({length:p.n},()=>[]);for(const e of p.edges){if(!Array.isArray(e)||e.length!==3||!Array.from(e).every(Number.isSafeInteger)||e[0]<0||e[0]>=p.n||e[1]<0||e[1]>=p.n||e[2]<0||e[2]>100000)throw new TypeError('간선은 [출발,도착,0 이상의 가중치]');g[e[0]].push([e[1],e[2]]);}
 const dist=Array(p.n).fill(Infinity),prev=Array(p.n).fill(-1),used=Array(p.n).fill(false);dist[p.start]=0;
 for(let k=0;k<p.n;k++){let u=-1;for(let i=0;i<p.n;i++)if(!used[i]&&(u<0||dist[i]<dist[u]))u=i;if(u<0||dist[u]===Infinity)break;used[u]=true;if(u===p.end)break;for(const [v,w] of g[u])if(dist[u]+w<dist[v]){dist[v]=dist[u]+w;prev[v]=u;}}
 if(!Number.isFinite(dist[p.end]))return null;const path=[];for(let u=p.end;u!==-1;u=prev[u])path.push(u);return {distance:dist[p.end],path:path.reverse()};
}
function topoSort(p){
 if(!p||!Number.isInteger(p.n)||p.n<0||p.n>100||!Array.isArray(p.edges)||p.edges.length>1000)throw new TypeError('n(0~100)과 edges 필요');
 const g=Array.from({length:p.n},()=>[]),deg=Array(p.n).fill(0);for(const e of p.edges){if(!Array.isArray(e)||e.length!==2||!Array.from(e).every(Number.isInteger)||e[0]<0||e[0]>=p.n||e[1]<0||e[1]>=p.n)throw new TypeError('간선은 [출발,도착]');g[e[0]].push(e[1]);deg[e[1]]++;}
 const q=[];for(let i=0;i<p.n;i++)if(deg[i]===0)q.push(i);const out=[];for(let i=0;i<q.length;i++){const u=q[i];out.push(u);for(const v of g[u])if(--deg[v]===0)q.push(v);}return out.length===p.n?out:null;
}
function editDistance(p){
 if(!p||typeof p.a!=='string'||typeof p.b!=='string')throw new TypeError('문자열 a와 b 필요');const a=Array.from(p.a),b=Array.from(p.b);if(a.length>200||b.length>200)throw new RangeError('문자열은 각각 200 코드포인트 이하');
 let prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const cur=[i];for(let j=1;j<=b.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=cur;}return prev[b.length];
}
function brackets(p){
 if(!p||typeof p.text!=='string'||p.text.length>10000)throw new TypeError('text 문자열 10000자 이하 필요');const stack=[];const pair={')':'(',']':'[','}':'{'};for(const c of p.text){if(c==='('||c==='['||c==='{')stack.push(c);else if(c===')'||c===']'||c==='}')if(stack.pop()!==pair[c])return false;}return stack.length===0;
}
function primes(p){
 if(!p||!Number.isInteger(p.n)||p.n<0||p.n>10000)throw new TypeError('n은 0~10000 정수');const composite=new Uint8Array(p.n+1);for(let i=2;i*i<=p.n;i++)if(!composite[i])for(let j=i*i;j<=p.n;j+=i)composite[j]=1;const out=[];for(let i=2;i<=p.n;i++)if(!composite[i])out.push(i);return out;
}
function longestIncreasing(p){
 if(!p||!Array.isArray(p.values)||p.values.length>10000||!Array.from(p.values).every(Number.isSafeInteger))throw new TypeError('정수 배열 values 최대 10000개');const tails=[];for(const x of p.values){let l=0,h=tails.length;while(l<h){const m=(l+h)>>1;if(tails[m]<x)l=m+1;else h=m;}tails[l]=x;}return tails.length;
}
function gcd(p){
 if(!p||!Number.isSafeInteger(p.a)||!Number.isSafeInteger(p.b)||Math.abs(p.a)>1000000000||Math.abs(p.b)>1000000000)throw new TypeError('a와 b는 절댓값 10억 이하 정수');let a=Math.abs(p.a),b=Math.abs(p.b);while(b!==0){const r=a%b;a=b;b=r;}return a;
}
const defs={
 '이진탐색':{fn:binarySearch,description:'오름차순 배열에서 대상이 처음 나오는 0부터 시작하는 위치 (-1: 없음)',sample:{values:[1,3,3,5],target:3}},
 '최단경로':{fn:dijkstra,description:'방향 그래프의 음수 없는 가중치 최단거리와 경로 (없으면 null)',sample:{n:4,edges:[[0,1,3],[0,2,1],[2,1,1],[1,3,2]],start:0,end:3}},
 '위상정렬':{fn:topoSort,description:'방향 그래프의 위상 순서 (사이클이면 null)',sample:{n:4,edges:[[0,1],[0,2],[2,3]]}},
 '편집거리':{fn:editDistance,description:'삽입·삭제·치환으로 바꾸는 최소 횟수',sample:{a:'kitten',b:'sitting'}},
 '괄호검사':{fn:brackets,description:'소괄호·대괄호·중괄호 짝 검사; 다른 문자는 무시',sample:{text:'a+(b[2])'}},
 '소수목록':{fn:primes,description:'0부터 n 이하의 모든 소수',sample:{n:20}},
 '최장증가부분수열':{fn:longestIncreasing,description:'엄격히 증가하는 부분수열의 최대 길이',sample:{values:[3,1,5,2,6,4,9]}},
 '최대공약수':{fn:gcd,description:'두 정수의 최대공약수 (0,0은 0)',sample:{a:84,b:30}}
};
function normalize(name){return String(name||'').trim().replace(/\s+/g,'');}
function pick(name){const key=normalize(name);return Object.hasOwn(defs,key)?defs[key]:null;}
function listMessage(){return '🧠 자비스 알고리즘 도구 — '+Object.keys(defs).length+'종\n'+Object.entries(defs).map(([n,v])=>'· '+n+': '+v.description).join('\n')+'\n\n사용: “자비스 알고리즘 코드 최단경로” 또는 “자비스 알고리즘 실행 최대공약수 | {"a":84,"b":30}”\n· 예제에서 찾기: 자비스 알고리즘 추론 [{"input":{"a":12,"b":8},"output":4},{"input":{"a":9,"b":6},"output":3}]\n※ 직접 작성된 제한 알고리즘이며, 임의 문제를 이해하는 범용 AI는 아닙니다.';}
function codeMessage(name){const x=pick(name);if(!x)return '❌ 지원하지 않는 알고리즘. “자비스 알고리즘 목록”을 확인하세요.';const code=x.fn.toString().replace(/^function\s+\w+\s*\(/,'function solve(');return '🧩 '+normalize(name)+' — '+x.description+'\n· 입력 예: '+JSON.stringify(x.sample)+'\n'+code+'\n※ 제공 코드를 자동으로 실행하거나 외부 모델에 보내지 않습니다.';}
function runMessage(name,raw){const x=pick(name);if(!x)return '❌ 지원하지 않는 알고리즘. “자비스 알고리즘 목록”을 확인하세요.';try{if(String(raw).length>40000)throw new Error('입력 길이 초과');const data=JSON.parse(raw),value=x.fn(data);return '▶ '+normalize(name)+' 결과: '+JSON.stringify(value);}catch(e){return '❌ 입력 또는 계산 오류: '+(e&&e.message||'JSON 확인');}}
function same(a,b,depth){
 if(a===b)return true;if(depth>8||a===null||b===null||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const ka=Object.keys(a).sort(),kb=Object.keys(b).sort();if(ka.length!==kb.length||ka.length>1000)return false;
 return ka.every((k,i)=>k===kb[i]&&same(a[k],b[k],depth+1));
}
function infer(examples){
 if(!Array.isArray(examples)||examples.length<2||examples.length>6||!examples.every(e=>e&&typeof e==='object'&&Object.hasOwn(e,'input')&&Object.hasOwn(e,'output')))return {error:'input과 output이 있는 예제를 2~6개 넣으세요.'};
 const matches=[];for(const [name,v] of Object.entries(defs)){try{if(examples.every(e=>same(v.fn(e.input),e.output,0)))matches.push(name);}catch(e){}}
 return {matches,examined:Object.keys(defs).length};
}
function inferMessage(raw){
 let examples;try{if(String(raw).length>40000)throw Error('입력 길이 초과');examples=JSON.parse(raw);}catch(e){return '❌ 예제 JSON을 확인하세요.';}
 const r=infer(examples);if(r.error)return '❌ '+r.error;if(!r.matches.length)return '🔎 알고리즘 '+r.examined+'종에서 예제와 일치하는 후보를 못 찾았습니다.';
 const name=r.matches[0],code=pick(name).fn.toString().replace(/^function\s+\w+\s*\(/,'function solve(');
 return '🔎 예제 기반 탐색: '+r.examined+'종 중 '+r.matches.length+'종 일치 ('+r.matches.join(', ')+')\n· 첫 후보 코드: '+name+'\n'+code+'\n※ 예제에 맞는 후보일 뿐 다른 입력에서도 맞는다고 보장하지 않습니다.'+(r.matches.length>1?' 다른 예제를 추가해 구분하세요.':'');
}
function testMessage(){const cases=[['이진탐색',{values:[1,2,2,4],target:2},1],['최단경로',{n:3,edges:[[0,1,4],[0,2,1],[2,1,2]],start:0,end:1},{distance:3,path:[0,2,1]}],['위상정렬',{n:2,edges:[[0,1],[1,0]]},null],['편집거리',{a:'kitten',b:'sitting'},3],['괄호검사',{text:'([)]'},false],['소수목록',{n:10},[2,3,5,7]],['최장증가부분수열',{values:[3,1,2,5,4]},3],['최대공약수',{a:84,b:30},6]];let ok=0;const lines=cases.map(([name,input,expected])=>{const passed=JSON.stringify(pick(name).fn(input))===JSON.stringify(expected);if(passed)ok++;return (passed?'✅ ':'❌ ')+name;});return '🧪 알고리즘 자체 시험 '+ok+'/'+cases.length+'\n'+lines.join('\n')+'\n※ 미리 정한 소규모 시험입니다. 범용 개발 능력을 뜻하지 않습니다.';}
const api={names:()=>Object.keys(defs),pick,listMessage,codeMessage,runMessage,infer,inferMessage,testMessage};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSAlgorithms=api;
})(typeof globalThis!=='undefined'?globalThis:this);
