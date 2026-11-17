/* 자비스 코딩 수업 v1: 제한된 반복문 모델에서 예제 기반 경계 수정.
   생성된 텍스트를 eval/new Function으로 실행하지 않는다. */
(function(root){
 'use strict';
 const KEY='jvs-code-school';
 const lesson=[
  {before:'function f(n){let sum=0;for(let i=0;i<n;i++){sum+=i;}return sum;}',after:'function f(n){let sum=0;for(let i=0;i<=n;i++){sum+=i;}return sum;}', note:'끝값을 포함하려면 < 대신 <=를 쓴다.'},
  {before:'function f(n){let sum=0;for(let i=1;i<=n;i++){sum+=i;}return sum;}',after:'function f(n){let sum=0;for(let i=1;i<n;i++){sum+=i;}return sum;}', note:'끝값을 제외하려면 <= 대신 <를 쓴다.'}
 ];
 // 본문의 임의 코드를 실행하지 않도록 이 형태만 파싱한다.
 function parse(code){
  const m=String(code).match(/^function\s+[a-zA-Z_$][\w$]*\(n\)\s*\{\s*let\s+sum\s*=\s*0\s*;\s*for\s*\(\s*let\s+([a-zA-Z_$][\w$]*)\s*=\s*([01])\s*;\s*\1\s*(<=|<)\s*n\s*;\s*\1\+\+\s*\)\s*\{\s*sum\s*\+=\s*\1\s*;\s*\}\s*return\s+sum\s*;\s*\}$/);
  return m?{variable:m[1],start:Number(m[2]),op:m[3]}:null;
 }
 function run(code,n){
  const p=parse(code); if(!p||!Number.isInteger(n)||n<0||n>100)return null;
  let sum=0, steps=0;
  for(let i=p.start;p.op==='<'?i<n:i<=n;i++){
   if(++steps>101)return null; sum+=i;
  }
  return sum;
 }
 function replaceOp(code,op){
  const p=parse(code); if(!p||!['<','<='].includes(op))return null;
  const name=p.variable.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const needle=new RegExp('(for\\s*\\(\\s*let\\s+'+name+'\\s*=\\s*[01]\\s*;\\s*'+name+'\\s*)(<=|<)(\\s*n\\s*;)');
  const out=code.replace(needle,(all,a,old,b)=>a+op+b);
  return parse(out)?out:null;
 }
 function derive(before,after){
  const a=parse(before),b=parse(after);
  if(!a||!b||a.op===b.op)return null;
  return replaceOp(before,b.op)===after?{from:a.op,to:b.op}:null;
 }
 function rules(storage){
  try{const x=storage.get(KEY); if(!x||!Array.isArray(x.rules))return [];
   return x.rules.filter(r=>r&&['<','<='].includes(r.from)&&['<','<='].includes(r.to)&&r.from!==r.to).slice(0,2);
  }catch(e){return [];}
 }
 function teach(storage){
  const learned=[];
  for(const ex of lesson){const r=derive(ex.before,ex.after);if(r&&!learned.some(x=>x.from===r.from&&x.to===r.to))learned.push(r);}
  storage.set(KEY,{schema:1,rules:learned,learnedAt:new Date().toISOString()});
  return {count:learned.length,lessons:lesson.map(x=>x.note)};
 }
 const exercises=[
  {title:'0부터 n까지 포함',code:'function g(n){let sum=0;for(let k=0;k<n;k++){sum+=k;}return sum;}',expected:n=>n*(n+1)/2},
  {title:'1부터 n까지 포함',code:'function h(n){let sum=0;for(let j=1;j<n;j++){sum+=j;}return sum;}',expected:n=>n*(n+1)/2},
  {title:'0부터 n 미만',code:'function q(n){let sum=0;for(let z=0;z<=n;z++){sum+=z;}return sum;}',expected:n=>n*(n-1)/2},
  {title:'1부터 n 미만',code:'function r(n){let sum=0;for(let a=1;a<=n;a++){sum+=a;}return sum;}',expected:n=>n*(n-1)/2}
 ];
 function solve(problem, learned){
  const p=parse(problem.code); if(!p)return null;
  const samples=[1,3,5];
  for(const rule of learned){
   if(rule.from!==p.op)continue;
   const candidate=replaceOp(problem.code,rule.to); if(!candidate)continue;
   if(samples.every(n=>run(candidate,n)===problem.expected(n)))return candidate;
  }
  return null;
 }
 function exam(storage){
  const rs=rules(storage), results=exercises.map(p=>{
   const fixed=solve(p,rs);
   // 수업 예제와 풀이용 입력에 없는 별도의 입력값을 검증한다.
   const passed=!!fixed&&[2,4,7].every(n=>run(fixed,n)===p.expected(n));
   return {title:p.title,passed,fixed:fixed||null};
  });
  return {learned:rs.length, passed:results.filter(r=>r.passed).length,total:results.length,results};
 }
 function lessonMessage(storage){
  const r=teach(storage);
  return '📘 자비스 코딩 수업 1 완료 — 반복문 경계\n· 예제 '+lesson.length+'개에서 수정 규칙 '+r.count+'개 추출·저장\n· '+r.lessons.join('\n· ')+'\n· 다음: “자비스 코딩 시험”\n※ Qwen 없이 제한된 반복문 규칙을 익힙니다. 일반적인 코딩 모델 학습은 아닙니다.';
 }
 function examMessage(storage){
  const r=exam(storage);
  return '🧪 자비스 코딩 시험 1 — 반복문 경계\n· 학습된 규칙: '+r.learned+'개 · 별도 문제 '+r.passed+'/'+r.total+' 통과\n'+r.results.map(x=>'· '+(x.passed?'✅ ':'❌ ')+x.title+(x.passed?' → '+x.fixed:'')).join('\n')+'\n· 각 문제는 풀이용 입력 3개로 후보 선택 후 다른 입력 3개로 검사합니다.\n※ 같은 유형의 작은 시험이며 범용 코딩 실력이나 자기수정 성공을 뜻하지 않습니다.'+(r.learned?'':'\n먼저 “자비스 코딩 수업”을 입력하세요.');
 }
 const api={parse,run,replaceOp,derive,teach,exam,lessonMessage,examMessage};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.JVSCodeSchool=api;
})(typeof globalThis!=='undefined'?globalThis:this);
