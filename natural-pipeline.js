/* A conservative, rule-based Korean phrase-to-pipeline translator, not a neural model. */
(function(root){
'use strict';
const rules=[
 [/(?:객체(?:의)?\s*)?([A-Za-z_][A-Za-z0-9_]{0,30})\s*속성(?:을|를)?(?:\s*(?:꺼내|가져오))?/g,m=>'속성 '+m[1]],
 [/(-?\d{1,6})\s*(?:보다\s*큰|초과)(?:\s*(?:수|값|원소|것))?(?:만|인)?/g,m=>m[1]+' 초과만'],
 [/(-?\d{1,6})\s*(?:보다\s*작은|미만)(?:\s*(?:수|값|원소|것))?(?:만|인)?/g,m=>m[1]+' 미만만'],
 [/(-?\d{1,6})(?:을|를)?\s*(?:더하|더해)/g,m=>m[1]+' 더하기'],
 [/(-?\d{1,6})(?:을|를)?\s*(?:곱하|곱해|곱한)/g,m=>m[1]+' 곱하기'],
 [/(?:앞뒤|양쪽|양\s*끝)(?:의)?\s*공백(?:을|를)?\s*(?:제거|지우|없애)/g,()=> '앞뒤 공백 제거'],
 [/(?:공백)(?:을\s*기준으로|으로|을\s*기준|\s*기준으로)\s*(?:나누|나눠|나눈|분리|쪼개)/g,()=> '공백으로 나누기'],
 [/(?:쉼표)(?:를\s*기준으로|로|\s*기준으로)\s*(?:나누|나눠|나눈|분리|쪼개)/g,()=> '쉼표로 나누기'],
 [/(?:공백)(?:으로|을\s*넣어)\s*(?:합치|합쳐|연결|이어|붙이)/g,()=> '공백으로 합치기'],
 [/(?:하이픈|대시)(?:으로|을\s*넣어)\s*(?:합치|합쳐|연결|이어|붙이)/g,()=> '하이픈으로 합치기'],
 [/(?:쉼표)(?:로|를\s*넣어)\s*(?:합치|합쳐|연결|이어|붙이)/g,()=> '쉼표로 합치기'],
 [/(?:역순|거꾸로)(?:으로)?(?:\s*(?:뒤집|바꾸|돌리|돌려))?|뒤집|돌려/g,()=> '뒤집기'],
 [/(?:중복)(?:을|된\s*값을|된\s*원소를)?\s*(?:제거|없애|지우)/g,()=> '중복 제거'],
 [/(?:오름차순으로\s*)?정렬/g,()=> '정렬'],
 [/(?:짝수)(?:만|인|를|을)/g,()=> '짝수만'],[/(?:홀수)(?:만|인|를|을)/g,()=> '홀수만'],
 [/(?:양수)(?:만|인|를|을)/g,()=> '양수만'],[/(?:음수)(?:만|인|를|을)/g,()=> '음수만'],
 [/소문자(?:로)?/g,()=> '소문자'],[/대문자(?:로)?/g,()=> '대문자'],
 [/(?:제곱)/g,()=> '제곱'],[/(?:두\s*배|2\s*배)(?:로)?/g,()=> '두 배'],[/(?:절댓값|절대값)(?:으로)?/g,()=> '절댓값'],
 [/(?:최댓값|최대값|가장\s*큰\s*값)/g,()=> '최댓값'],[/(?:최솟값|최소값|가장\s*작은\s*값)/g,()=> '최솟값'],
 [/(?:평균)/g,()=> '평균'],[/(?:합계|합산|합(?!치|쳐)|더해|더하)/g,()=> '합'],[/(?:곱(?!하|해))/g,()=> '곱'],
 [/(?:길이|글자\s*수|원소\s*개수)/g,()=> '길이']
];
const unsupported=/아닌|제외|말고|빼고|하지\s*말|이상|이하|내림차순|내림|소수|제곱근|세제곱|나눗셈|나눠줘|나누어줘|파일|전송|삭제|웹|서버|동시에|또는|그리고\s*(?:합|평균)|(?:합|합계)과\s*평균|첫\s*\d|마지막\s*\d|모든\s*공백/i;
function translate(request,pipeline){
 if(typeof request!=='string'||!request.trim()||Array.from(request).length>300)return {error:'요청은 1~300자로 입력해 주세요.'};
 if(unsupported.test(request))return {error:'지원하지 않거나 해석이 애매한 요청입니다. 단계를 나눠 자세히 적어 주세요.'};
 const hits=[];for(const [re,make] of rules){re.lastIndex=0;let m;while((m=re.exec(request))!==null)hits.push({start:m.index,end:m.index+m[0].length,label:make(m)});}
 hits.sort((a,b)=>a.start-b.start||b.end-a.end);const selected=[];for(const h of hits){if(selected.some(x=>h.start<x.end&&h.end>x.start))continue;selected.push(h);}
 selected.sort((a,b)=>a.start-b.start);if(!selected.length||selected.length>10)return {error:'지원하는 작업 단계를 찾지 못했어요. “자비스 코딩 대화 도움말”을 확인해 주세요.'};
 // Mask only matched operation spans and reject remaining unrecognized text.
 let remaining='';for(let i=0;i<request.length;i++)remaining+=selected.some(x=>i>=x.start&&i<x.end)?' ':request[i];
 const allowed=/(?:문자열|리스트|목록|배열|데이터|숫자|정수|객체|프로그램|자바스크립트|함수|코드|원소|요소|값|수|것|속|들|입력|결과|단어|문자|순서|모든|각각|각|다음|그다음|먼저|그|그리고|그런|뒤|후|한|해서|하여|으로|로|에서|의|을|를|에|만든|만들고|만들어|만들|만|인|이|가|와|과|골라|고르|고르고|골라서|고른|추려서|추려|선택해서|선택해|선택하고|선택|꺼내서|꺼내|가져와서|가져와|바꿔서|바꾸고|바꾼|바꿔|바꾸|만든|만들고|만들어|만들|찾아줘|찾아|내줘|계산해서|계산해|계산|구해줘|구해|구하|구한|주세요|해줘|줘|하고|한뒤|한후|한번|해서|하여|해서|여서|해서|고|한|한뒤|한후|서|어|아|어줘|아줘|세요|요|해|되게|출력|반환|해라|필터|기준|배열의|의|으로)/g;
 const longestFirst=new RegExp(allowed.source.slice(3,-1).split('|').sort((a,b)=>b.length-a.length).join('|'),'g');
 remaining=remaining.replace(longestFirst,'').replace(/[\s.,!?~:;()\[\]{}]/g,'');
 if(remaining)return {error:'이 부분은 확실히 해석하지 못했어요: '+remaining.slice(0,40)+'. 지원 단계를 나눠 적어 주세요.'};
 const labels=selected.map(x=>x.label),parsed=pipeline.parse(labels.join(' -> '));if(parsed.error)return {error:parsed.error};return {labels,steps:parsed.steps};
}
function help(){return '🗣️ 코딩 대화 — 정해진 표현을 규칙으로 해석하는 실험\n· 예: 자비스 코딩 대화 숫자 배열에서 짝수만 골라 두 배로 만든 다음 합계를 구해줘\n· 예제 검사: 요청 뒤에 | [{"input":[-3,2,4],"output":12}]\n· 문자열 공백 제거·대소문자·나누기·합치기·뒤집기, 배열 조건·변환·정렬·합·평균 등 일부를 순서대로 조합합니다.\n※ 학습 모델이 아닌 규칙 해석기입니다. 뜻을 잘못 해석할 수 있으니 제시된 단계를 확인하세요. 지원되지 않는 표현은 보류할 수 있습니다.';}
function message(raw,pipeline){
 if(!pipeline)return '❌ 코딩 설계 모듈이 준비되지 않았습니다.';
 const parts=String(raw||'').split('|');if(parts.length>2)return '❌ | 는 예제 구분에 한 번만 사용해 주세요.';const result=translate(parts[0].trim(),pipeline);if(result.error)return '❌ '+result.error;
 const out=pipeline.message(result.labels.join(' -> ')+(parts.length===2?' | '+parts[1]:''));if(out.startsWith('❌'))return out;
 return '🗣️ 코딩 대화 · 규칙 해석\n· 해석한 순서: '+result.labels.join(' → ')+'\n'+out+'\n※ 정해진 표현만 해석하며 뜻이 다를 수 있습니다. 단계와 예제를 확인해 주세요.';
}
const api={translate,help,message};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSNaturalPipeline=api;
})(typeof globalThis!=='undefined'?globalThis:this);
