/* 예제 기반 코딩 심화 수업 v1. 임의 JS 실행 없음. 제한된 반복문 모델만 지원한다. */
(function(root){
 'use strict';
 const KEY='jvs-code-lab';
 const OPTIONS={start:[0,1],cmp:['<','<='],step:[1,2],seed:[0,1],op:['add','multiply'],value:['index','one'],filter:['all','even','odd']};
 const FIELDS=Object.keys(OPTIONS);
 const BASE={start:0,cmp:'<',step:1,seed:0,op:'add',value:'index',filter:'all'};
 function valid(p){return !!p&&FIELDS.every(k=>OPTIONS[k].includes(p[k]))&&Object.keys(p).length===FIELDS.length;}
 function withField(field,value){const p=Object.assign({},BASE);p[field]=value;return p;}
 // 각 예제는 코드 모형의 수정 전/후 쌍. 채점용 문제와 따로 둔다.
 const examples=[
  {topic:'시작값',before:withField('start',0),after:withField('start',1)},
  {topic:'시작값',before:withField('start',1),after:withField('start',0)},
  {topic:'끝 경계',before:withField('cmp','<'),after:withField('cmp','<=')},
  {topic:'끝 경계',before:withField('cmp','<='),after:withField('cmp','<')},
  {topic:'증가 간격',before:withField('step',1),after:withField('step',2)},
  {topic:'증가 간격',before:withField('step',2),after:withField('step',1)},
  {topic:'초깃값',before:withField('seed',0),after:withField('seed',1)},
  {topic:'초깃값',before:withField('seed',1),after:withField('seed',0)},
  {topic:'누적 연산',before:withField('op','add'),after:withField('op','multiply')},
  {topic:'누적 연산',before:withField('op','multiply'),after:withField('op','add')},
  {topic:'누적할 값',before:withField('value','index'),after:withField('value','one')},
  {topic:'누적할 값',before:withField('value','one'),after:withField('value','index')},
  {topic:'조건문',before:withField('filter','all'),after:withField('filter','even')},
  {topic:'조건문',before:withField('filter','even'),after:withField('filter','all')},
  {topic:'조건문',before:withField('filter','all'),after:withField('filter','odd')},
  {topic:'조건문',before:withField('filter','odd'),after:withField('filter','all')},
  {topic:'조건문',before:withField('filter','even'),after:withField('filter','odd')},
  {topic:'조건문',before:withField('filter','odd'),after:withField('filter','even')}
 ];
 function extract(e){
  if(!e||!valid(e.before)||!valid(e.after))return null;
  const changed=FIELDS.filter(k=>e.before[k]!==e.after[k]);
  return changed.length===1?{field:changed[0],from:e.before[changed[0]],to:e.after[changed[0]]}:null;
 }
 function validRule(r){return !!r&&FIELDS.includes(r.field)&&OPTIONS[r.field].includes(r.from)&&OPTIONS[r.field].includes(r.to)&&r.from!==r.to;}
 function getRules(storage){
  try{const d=storage.get(KEY);return d&&Array.isArray(d.rules)?d.rules.filter(validRule).slice(0,40):[];}catch(e){return [];}
 }
 function teach(storage){
  const rules=[];
  for(const e of examples){const r=extract(e);if(r&&!rules.some(x=>x.field===r.field&&x.from===r.from&&x.to===r.to))rules.push(r);}
  storage.set(KEY,{schema:1,rules,learnedAt:new Date().toISOString()});
  return {examples:examples.length,rules:rules.length,topics:[...new Set(examples.map(e=>e.topic))]};
 }
 // Only our small, bounded internal representation is interpreted; no arbitrary JS.
 function run(p,n){
  if(!valid(p)||!Number.isInteger(n)||n<0||n>40)return null;
  let acc=p.seed,steps=0;
  for(let i=p.start;p.cmp==='<'?i<n:i<=n;i+=p.step){
   if(++steps>41)return null;
   if(p.filter==='even'&&i%2!==0)continue;
   if(p.filter==='odd'&&i%2!==1)continue;
   const v=p.value==='index'?i:1;
   acc=p.op==='add'?acc+v:acc*v;
   if(!Number.isSafeInteger(acc))return null;
  }
  return acc;
 }
 function render(p){
  if(!valid(p))return null;
  const condition=p.filter==='all'?'':`if(i%2===${p.filter==='even'?0:1}) `;
  return `function solve(n){let acc=${p.seed};for(let i=${p.start};i${p.cmp}n;i+=${p.step}){${condition}acc${p.op==='add'?'+=':'*='}${p.value==='index'?'i':'1'};}return acc;}`;
 }
 const p=(o)=>Object.assign({},BASE,o);
 // Candidate-selection inputs differ from final check inputs. Test family is intentionally narrow.
 const problems=[
  {title:'0부터 n까지의 합',bad:p({cmp:'<'}),expected:n=>n*(n+1)/2},
  {title:'0부터 n 미만의 합',bad:p({cmp:'<='}),expected:n=>n*(n-1)/2},
  {title:'1부터 n까지의 곱',bad:p({start:0,cmp:'<=',seed:1,op:'multiply'}),expected:n=>{let x=1;for(let i=1;i<=n;i++)x*=i;return x;}},
  {title:'0부터 n 미만 개수',bad:p({start:1,value:'one'}),expected:n=>n},
  {title:'짝수 위치의 합',bad:p({step:1}),expected:n=>{let x=0;for(let i=0;i<n;i+=2)x+=i;return x;}},
  {title:'모든 위치의 합',bad:p({step:2}),expected:n=>n*(n-1)/2},
  {title:'합의 초기값 수정',bad:p({seed:1}),expected:n=>n*(n-1)/2},
  {title:'곱의 초기값 수정',bad:p({start:1,cmp:'<=',seed:0,op:'multiply'}),expected:n=>{let x=1;for(let i=1;i<=n;i++)x*=i;return x;}},
  {title:'합이 아닌 곱',bad:p({start:1,cmp:'<=',seed:1,op:'add'}),expected:n=>{let x=1;for(let i=1;i<=n;i++)x*=i;return x;}},
  {title:'곱이 아닌 합',bad:p({op:'multiply'}),expected:n=>n*(n-1)/2},
  {title:'덧셈 대신 개수',bad:p({value:'index'}),expected:n=>n},
  {title:'개수 대신 덧셈',bad:p({value:'one'}),expected:n=>n*(n-1)/2},
  {title:'짝수 조건 추가',bad:p({filter:'all'}),expected:n=>{let x=0;for(let i=0;i<n;i++)if(i%2===0)x+=i;return x;}},
  {title:'홀수 조건 추가',bad:p({filter:'all'}),expected:n=>{let x=0;for(let i=0;i<n;i++)if(i%2===1)x+=i;return x;}},
  {title:'짝수에서 홀수로',bad:p({filter:'even'}),expected:n=>{let x=0;for(let i=0;i<n;i++)if(i%2===1)x+=i;return x;}},
  {title:'홀수 조건 제거',bad:p({filter:'odd'}),expected:n=>n*(n-1)/2},
  {title:'경계와 초깃값 동시 수정',bad:p({cmp:'<',seed:1}),expected:n=>n*(n+1)/2},
  {title:'범위와 곱 초깃값 동시 수정',bad:p({start:0,cmp:'<=',seed:0,op:'multiply'}),expected:n=>{let x=1;for(let i=1;i<=n;i++)x*=i;return x;}}
 ];
 const selection=[0,1,2,3,5], evaluation=[4,6,7,8];
 function choose(problem,rules){
  if(!problem||!valid(problem.bad))return {candidate:null,tried:0};
  let frontier=[{p:problem.bad,depth:0}],seen=new Set([JSON.stringify(problem.bad)]),tried=0;
  for(let at=0;at<frontier.length&&tried<300;at++){
   const item=frontier[at]; if(item.depth>=2)continue;
   for(const r of rules){
    if(!validRule(r)||item.p[r.field]!==r.from)continue;
    const next=Object.assign({},item.p,{[r.field]:r.to}), key=JSON.stringify(next);
    if(seen.has(key))continue; seen.add(key); tried++;
    if(selection.every(n=>run(next,n)===problem.expected(n)))return {candidate:next,tried};
    if(item.depth+1<2)frontier.push({p:next,depth:item.depth+1});
   }
  }
  return {candidate:null,tried};
 }
 function exam(storage){
  const rules=getRules(storage),results=problems.map(problem=>{
   const found=choose(problem,rules);
   const passed=!!found.candidate&&evaluation.every(n=>run(found.candidate,n)===problem.expected(n));
   return {title:problem.title,passed,tried:found.tried,code:found.candidate?render(found.candidate):null};
  });
  return {rules:rules.length,total:results.length,passed:results.filter(x=>x.passed).length,results};
 }
 function lessonMessage(storage){
  const t=teach(storage);
  return `📚 자비스 코딩 심화 수업 완료\n· 수업 예제 ${t.examples}개 → 수정 규칙 ${t.rules}개 추출 및 저장\n· 배운 범위: ${t.topics.join(' · ')}\n· 명령: “자비스 코딩 심화 시험”\n※ Qwen 없이 정해진 반복문 모형을 학습합니다. 자료를 저장하거나 규칙을 추출한 것이지 언어모델 가중치 훈련이 아닙니다.`;
 }
 function examMessage(storage){
  const e=exam(storage);
  const details=e.results.map(x=>`· ${x.passed?'✅':'❌'} ${x.title} (${x.tried}후보)`).join('\n');
  const example=e.results.find(x=>x.passed);
  return `🧪 자비스 코딩 심화 시험\n· 학습 규칙 ${e.rules}개 · ${e.passed}/${e.total}문제 통과\n${details}\n${example?'· 수정 예시: '+example.code+'\n':''}· 후보 선택 입력 5개와 평가 입력 4개를 분리했습니다.\n※ 반복문·조건문으로 제한된 고정 문제군이며 실전 코딩이나 자기수정 성공을 보장하지 않습니다.`+(e.rules?'':'\n먼저 “자비스 코딩 심화 수업”을 입력하세요.');
 }
 const api={valid,extract,teach,run,render,choose,exam,lessonMessage,examMessage};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSCodeLab=api;
})(typeof globalThis!=='undefined'?globalThis:this);
