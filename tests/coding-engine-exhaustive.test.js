const assert=require('node:assert/strict'),vm=require('node:vm'),E=require('../coding-engine.js');
const filters=['짝수','홀수','양수','음수','영아님'];let pairs=['전체',...filters];for(let i=0;i<filters.length;i++)for(let j=i+1;j<filters.length;j++)pairs.push(filters[i]+','+filters[j]);
const maps=['그대로','제곱','절댓값','두배','부호반전'], reducers=['합','개수','곱','최댓값','최솟값','배열','정렬','중복제거','누적합','평균','중앙값','최빈값','최대구간합'];
const arrays=[[],[0],[-3,-2,-1,0,1,2,3],[-2,1,-2,1],[1000,1000,1000],[-1,0,1]];let programs=0,cases=0;
for(const f of pairs)for(const m of maps)for(const r of reducers){const p=E.parse(`조건=${f}; 변환=${m}; 결과=${r}`).program;assert.ok(p);const c=vm.createContext({});vm.runInContext(E.render(p),c,{timeout:1000});for(const arr of arrays){let a,b,ae=false,be=false;try{a=E.run(p,arr)}catch(e){ae=true}try{b=c.solve(arr)}catch(e){be=true}assert.equal(ae,be,JSON.stringify([f,m,r,arr]));if(!ae)assert.equal(JSON.stringify(a),JSON.stringify(b),JSON.stringify([f,m,r,arr]));cases++;}programs++;}
console.log('PASS exhaustive generated JS/interpreter agreement:',programs,'programs,',cases,'input cases');
