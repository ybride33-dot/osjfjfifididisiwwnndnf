/* J.A.R.V.I.S coding engine v1. Bounded compositional array programs.
 * The interpreter never evaluates code supplied by a user. No model/AI service.
 */
(function(root){
'use strict';
const FILTERS={전체:'all',짝수:'even',홀수:'odd',양수:'positive',음수:'negative',영아님:'nonzero'};
const MAPS={그대로:'identity',제곱:'square',절댓값:'abs',두배:'double',부호반전:'negate'};
const REDUCERS={합:'sum',개수:'count',곱:'product',최댓값:'max',최솟값:'min',배열:'array',정렬:'sort',중복제거:'unique',누적합:'prefix',평균:'mean',중앙값:'median',최빈값:'mode',최대구간합:'maxsub'};
const fnames={all:'전체',even:'짝수',odd:'홀수',positive:'양수',negative:'음수',nonzero:'영아님'};
const mnames={identity:'그대로',square:'제곱',abs:'절댓값',double:'두배',negate:'부호반전'};
const rnames={sum:'합',count:'개수',product:'곱',max:'최댓값',min:'최솟값',array:'배열',sort:'정렬',unique:'중복제거',prefix:'누적합',mean:'평균',median:'중앙값',mode:'최빈값',maxsub:'최대구간합'};
function valid(p){return !!p&&Array.isArray(p.filters)&&p.filters.length<=2&&p.filters.every(x=>x!=='all'&&Object.hasOwn(fnames,x))&&new Set(p.filters).size===p.filters.length&&Object.hasOwn(mnames,p.map)&&Object.hasOwn(rnames,p.reducer);}
function parse(spec){
 const text=String(spec||'').trim();
 if(!text.includes('=')&&!text.includes(';')){
  const words=text.split(/\s+/).filter(Boolean),conditions=[],maps=[],results=[];
  for(const w of words){if(Object.hasOwn(FILTERS,w))conditions.push(w);else if(Object.hasOwn(MAPS,w))maps.push(w);else if(Object.hasOwn(REDUCERS,w))results.push(w);else return {error:'지원하지 않는 단어: '+w+'. “자비스 코딩 도움말”을 확인하세요.'};}
  if(!conditions.length)conditions.push('전체');if(maps.length!==1||results.length!==1)return {error:'변환과 결과를 각각 하나씩 입력하세요. 예: 양수 짝수 제곱 합'};
  return parse('조건='+conditions.join(',')+'; 변환='+maps[0]+'; 결과='+results[0]);
 }
 const fields=text.split(';').map(x=>x.trim()).filter(Boolean);if(fields.length!==3)return {error:'조건, 변환, 결과를 각각 한 번씩 입력하세요.'};
 const parsed={};for(const field of fields){const match=field.match(/^(조건|변환|결과)\s*=\s*(.+)$/);if(!match||Object.hasOwn(parsed,match[1]))return {error:'형식은 조건=양수,짝수; 변환=제곱; 결과=합 입니다.'};parsed[match[1]]=match[2].trim();}
 if(!Object.hasOwn(parsed,'조건')||!Object.hasOwn(parsed,'변환')||!Object.hasOwn(parsed,'결과'))return {error:'조건, 변환, 결과가 모두 필요합니다.'};
 const words=parsed['조건'].split(',').map(x=>x.trim());if(words.some(x=>!Object.hasOwn(FILTERS,x))||words.length>2||words.length===0)return {error:'조건은 전체, 짝수, 홀수, 양수, 음수, 영아님 중 최대 두 개입니다.'};
 if(words.includes('전체')&&words.length>1)return {error:'전체는 다른 조건과 함께 쓸 수 없습니다.'};
 if(new Set(words).size!==words.length)return {error:'같은 조건을 중복할 수 없습니다.'};
 if(!Object.hasOwn(MAPS,parsed['변환'])||!Object.hasOwn(REDUCERS,parsed['결과']))return {error:'지원하지 않는 변환 또는 결과입니다. “자비스 코딩 도움말”을 확인하세요.'};
 const p={filters:words.filter(x=>x!=='전체').map(x=>FILTERS[x]),map:MAPS[parsed['변환']],reducer:REDUCERS[parsed['결과']]};return valid(p)?{program:p}:{error:'형식이 올바르지 않습니다.'};
}
function validateInput(a){return Array.isArray(a)&&a.length<=100&&Array.from(a).every(x=>Number.isSafeInteger(x)&&Math.abs(x)<=1000);}
function check(v){if(!Number.isSafeInteger(v))throw new RangeError('안전한 정수 범위 초과');return v;}
function run(p,a){
 if(!valid(p))throw new Error('지원하지 않는 프로그램');if(!validateInput(a))throw new Error('입력은 -1000~1000 정수 최대 100개여야 합니다.');
 let out=[];for(const x of a){if(p.filters.includes('even')&&x%2!==0)continue;if(p.filters.includes('odd')&&Math.abs(x%2)!==1)continue;if(p.filters.includes('positive')&&x<=0)continue;if(p.filters.includes('negative')&&x>=0)continue;if(p.filters.includes('nonzero')&&x===0)continue;
 let y=x;if(p.map==='square')y=x*x;else if(p.map==='abs')y=Math.abs(x);else if(p.map==='double')y=x*2;else if(p.map==='negate')y=-x;out.push(check(y));}
 if(p.reducer==='array')return out;if(p.reducer==='count')return out.length;if(p.reducer==='max')return out.length?Math.max(...out):null;if(p.reducer==='min')return out.length?Math.min(...out):null;
 if(p.reducer==='sort')return out.slice().sort((a,b)=>a-b);if(p.reducer==='unique')return [...new Set(out)];
 if(p.reducer==='prefix'){let n=0;return out.map(x=>(n=check(n+x)));}
 if(p.reducer==='mean'){if(!out.length)return null;let n=0;for(const x of out)n=check(n+x);return n/out.length;}
 if(p.reducer==='median'){if(!out.length)return null;const s=out.slice().sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;}
 if(p.reducer==='mode'){if(!out.length)return null;const counts=new Map();for(const x of out)counts.set(x,(counts.get(x)||0)+1);let best=out[0];for(const x of out)if(counts.get(x)>counts.get(best))best=x;return best;}
 if(p.reducer==='maxsub'){if(!out.length)return null;let ending=out[0],best=out[0];for(let i=1;i<out.length;i++){ending=Math.max(out[i],check(ending+out[i]));best=Math.max(best,ending);}return best;}
 let acc=p.reducer==='product'?1:0;for(const y of out)acc=check(p.reducer==='product'?acc*y:acc+y);return acc;
}
function render(p){
 if(!valid(p))throw new Error('지원하지 않는 프로그램');
 const conditions={even:'x % 2 === 0',odd:'Math.abs(x % 2) === 1',positive:'x > 0',negative:'x < 0',nonzero:'x !== 0'};
 const expr={identity:'x',square:'x * x',abs:'Math.abs(x)',double:'x * 2',negate:'-x'};
 const action={array:'return result;',count:'return result.length;',max:'return result.length ? Math.max(...result) : null;',min:'return result.length ? Math.min(...result) : null;',sum:'let total = 0;\n  for (const x of result) { total += x; if (!Number.isSafeInteger(total)) throw new RangeError("정수 범위 초과"); }\n  return total;',product:'let total = 1;\n  for (const x of result) { total *= x; if (!Number.isSafeInteger(total)) throw new RangeError("정수 범위 초과"); }\n  return total;',
 sort:'return result.slice().sort((a, b) => a - b);',unique:'return [...new Set(result)];',
 prefix:'let total = 0; return result.map(x => { total += x; if (!Number.isSafeInteger(total)) throw new RangeError("정수 범위 초과"); return total; });',
 mean:'if (!result.length) return null; let total = 0; for (const x of result) { total += x; if (!Number.isSafeInteger(total)) throw new RangeError("정수 범위 초과"); } return total / result.length;',
 median:'if (!result.length) return null; const sorted = result.slice().sort((a, b) => a - b), i = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;',
 mode:'if (!result.length) return null; const counts = new Map(); for (const x of result) counts.set(x, (counts.get(x) || 0) + 1); let best = result[0]; for (const x of result) if (counts.get(x) > counts.get(best)) best = x; return best;',
 maxsub:'if (!result.length) return null; let ending = result[0], best = ending; for (let i = 1; i < result.length; i++) { const sum = ending + result[i]; if (!Number.isSafeInteger(sum)) throw new RangeError("정수 범위 초과"); ending = Math.max(result[i], sum); best = Math.max(best, ending); } return best;'};
 return 'function solve(values) {\n  if (!Array.isArray(values) || values.length > 100 || !Array.from(values).every(x => Number.isSafeInteger(x) && Math.abs(x) <= 1000)) throw new TypeError("-1000~1000 정수 배열 최대 100개");\n  const result = [];\n  for (const x of values) {\n    if ('+(p.filters.length?p.filters.map(x=>'('+conditions[x]+')').join(' && '):'true')+') result.push('+expr[p.map]+');\n  }\n  '+action[p.reducer]+'\n}';
}
function describe(p){return '조건='+(p.filters.length?p.filters.map(x=>fnames[x]).join(','):'전체')+'; 변환='+mnames[p.map]+'; 결과='+rnames[p.reducer];}
function equal(a,b){return Array.isArray(a)?Array.isArray(b)&&a.length===b.length&&a.every((v,i)=>v===b[i]):a===b;}
function examplesValid(examples){return Array.isArray(examples)&&examples.length>=2&&examples.length<=8&&examples.every(e=>e&&typeof e==='object'&&validateInput(e.input)&&(e.output===null||(typeof e.output==='number'&&Number.isFinite(e.output))||(Array.isArray(e.output)&&e.output.length<=100&&e.output.every(Number.isSafeInteger))));}
function search(examples){
 if(!examplesValid(examples))return {error:'예제는 input 정수 배열과 output 유한한 숫자·정수 배열·null로 2~8개 입력하세요.'};
 const f=['even','odd','positive','negative','nonzero'], groups=[[]];for(let i=0;i<f.length;i++){groups.push([f[i]]);for(let j=i+1;j<f.length;j++)groups.push([f[i],f[j]]);}
 let examined=0,count=0,first=null;for(const filters of groups)for(const map of Object.keys(mnames))for(const reducer of Object.keys(rnames)){
  const p={filters,map,reducer};examined++;
  try{if(examples.every(e=>equal(run(p,e.input),e.output))){count++;if(!first)first=p;}}catch(e){}
 }
 return {program:first,matches:count,examined};
}
function help(){return '🛠 자비스 코드 엔진 — 배열 프로그램 조합\n· 학습 모델: 자비스 코딩 연습 배열 속 양수인 짝수 원소를 제곱한 뒤 합계를 구해 줘\n· 학습 결과: 자비스 코딩 연습 보고\n· 생성: 자비스 코딩 생성 양수 짝수 제곱 합\n· 상세 형식: 자비스 코딩 생성 조건=양수,짝수; 변환=제곱; 결과=합\n· 실행: 자비스 코딩 실행 조건=양수,짝수; 변환=제곱; 결과=합 | -3,2,4\n· 예제 추론: 자비스 코딩 예제 [{"input":[1,2],"output":3},{"input":[3,4],"output":7}]\n· 조건: 전체·짝수·홀수·양수·음수·영아님 (최대 2개)\n· 변환: 그대로·제곱·절댓값·두배·부호반전\n· 결과: 합·개수·곱·최댓값·최솟값·배열·정렬·중복제거·누적합·평균·중앙값·최빈값·최대구간합\n· 정수 -1000~1000 최대 100개. 빈 최댓값·최솟값·평균·중앙값·최빈값·최대구간합은 null. 최빈값 동률은 먼저 등장한 값.\n※ 제한된 도구이며 임의의 프로그램이나 일반 코딩 AI가 아닙니다.';}
function createMessage(spec){const q=parse(spec);if(q.error)return '❌ '+q.error;return '🧩 코드 생성 · '+describe(q.program)+'\n'+render(q.program)+'\n※ 허용된 규칙으로 만든 JavaScript. 임의 코드를 실행하지 않았습니다.';}
function executeMessage(spec,raw){const q=parse(spec);if(q.error)return '❌ '+q.error;const text=String(raw||'').trim();const parts=text?text.split(',').map(x=>x.trim()):[];if(parts.some(x=>!/^[-+]?\d+$/.test(x)))return '❌ 쉼표로 구분한 정수만 입력하세요.';const values=parts.map(Number);try{return '▶ 입력 '+JSON.stringify(values)+'\n· 결과 '+JSON.stringify(run(q.program,values))+'\n· '+describe(q.program);}catch(e){return '❌ '+e.message;}}
function examplesMessage(raw){let data;try{if(String(raw).length>6000)throw 0;data=JSON.parse(raw);}catch(e){return '❌ 예제 JSON을 확인하세요. “자비스 코딩 도움말” 참고.';}const s=search(data);if(s.error)return '❌ '+s.error;if(!s.program)return '🔎 1040개 제한 후보에서 일치하는 프로그램을 찾지 못했습니다.';return '🔎 예제에서 후보 '+s.examined+'개 검사 · 일치 '+s.matches+'개\n· 첫 후보: '+describe(s.program)+'\n'+render(s.program)+'\n※ 예제와 맞는 후보일 뿐 다른 입력에서도 맞는다고 보장할 수 없습니다.'+(s.matches>1?' 여러 후보가 같게 나왔으니 구별되는 예제를 추가하세요.':'');}
function testMessage(){
 const tests=[
  ['양수 짝수 제곱 합',[-3,2,4],20],['전체 그대로 정렬',[3,-2,1],[-2,1,3]],
  ['전체 그대로 중복제거',[2,1,2],[2,1]],['짝수 두배 누적합',[1,2,4],[4,12]],
  ['전체 그대로 평균',[1,2,3,4],2.5],['전체 그대로 중앙값',[4,1,2,3],2.5],
  ['전체 그대로 최빈값',[2,1,2,1],2],['전체 그대로 최대구간합',[-3,2,4,-1],6],
  ['음수 절댓값 최댓값',[],null]
 ];let ok=0;const lines=tests.map(([spec,input,want])=>{try{const p=parse(spec).program,got=run(p,input);if(equal(got,want)){ok++;return '✅ '+spec;}return '❌ '+spec;}catch(e){return '❌ '+spec;}});
 return '🧪 코딩 엔진 내부 시험 '+ok+'/'+tests.length+'\n'+lines.join('\n')+'\n※ 제한된 배열 기능의 자체 시험입니다. 일반 코딩 실력이나 새 문제 전반을 보증하지 않습니다.';
}
const api={parse,valid,validateInput,run,render,describe,search,help,createMessage,executeMessage,examplesMessage,testMessage};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSCodingEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
