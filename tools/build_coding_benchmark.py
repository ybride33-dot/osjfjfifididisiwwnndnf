#!/usr/bin/env python3
"""Hand-authored coding benchmark and training examples; no external AI data."""
import json,pathlib
R=pathlib.Path(__file__).resolve().parent.parent;old=json.loads((R/'training/code-instructions.json').read_text())
# Each case contains independently specified examples. Test cases are fixed before training.
old_cases={
'add':(['첫 번째와 두 번째 숫자를 합산해 반환하는 함수','인자로 전달한 두 값을 덧셈해 돌려줘'],[[[2,3],5],[[-4,3],-1],[[0,0],0]]),
'subtract':(['첫 인자에서 다음 인자를 빼는 자바스크립트 함수','숫자 a에서 숫자 b를 뺀 결과를 반환해'],[[[7,2],5],[[-2,4],-6],[[0,0],0]]),
'multiply':(['입력 두 인자의 곱셈 결과를 돌려주는 함수','두 숫자를 서로 곱한 결과를 반환해줘'],[[[3,4],12],[[-2,4],-8],[[0,10],0]]),
'square':(['입력받은 숫자를 자기 자신과 곱해 반환하는 함수','한 정수의 두 번째 거듭제곱을 구해줘'],[[[4],16],[[-3],9],[[0],0]]),
'absolute':(['인자로 주어진 수의 부호 없는 크기를 반환해','음수 또는 양수의 절댓값을 구하는 함수'],[[[-9],9],[[2],2],[[0],0]]),
'even':(['정수가 짝수인지 불리언으로 돌려주는 코드','숫자가 2로 나누어떨어지는지 확인해줘'],[[[4],True],[[3],False],[[-2],True]]),
'maximum':(['두 숫자 중에서 더 큰 숫자를 반환하는 코드','a와 b 가운데 최댓값을 돌려줘'],[[[2,3],3],[[-4,-7],-4],[[0,0],0]]),
'minimum':(['두 숫자 중에서 더 작은 숫자를 반환하는 코드','a와 b 가운데 최솟값을 돌려줘'],[[[2,3],2],[[-4,-7],-7],[[0,0],0]]),
'array_sum':(['숫자 배열의 원소들을 모두 합한 값을 반환해','숫자 목록 전체를 더해서 결과를 알려줘'],[[[[1,2,3]],6],[[[]],0],[[[-3,2]],-1]]),
'reverse':(['입력된 배열의 순서를 거꾸로 반환하는 함수','목록의 요소 순서를 역순으로 돌려줘'],[[[[1,2,3]],[3,2,1]],[[[]],[]],[[[4]],[4]]])}
# code, example inputs, training paraphrases, validation, frozen test prompts
new=[
('odd','function solution(n) { return n % 2 !== 0; }',[[[3],True],[[4],False],[[-3],True]],['정수가 홀수인지 확인하는 함수','숫자의 홀수 여부를 반환해','입력 n이 홀수면 참을 반환','홀수 판별 자바스크립트 코드','주어진 값의 홀수 여부 검사','숫자가 홀수인지 알려줘','홀수 확인 함수를 작성해','정수 홀수 판정 함수'],['입력된 숫자가 홀수인지 확인해줘','홀수인지 불리언으로 돌려줘'],['숫자가 홀수면 참인 함수를 만들어줘','정수를 입력받아 홀수 여부를 판단해']),
('cube','function solution(n) { return n * n * n; }',[[[3],27],[[0],0],[[-2],-8]],['숫자의 세제곱을 반환하는 함수','정수 n의 세제곱 계산','입력을 세 번 곱하는 코드','숫자를 세제곱해 반환','한 수의 세제곱 함수','n을 세 번 곱한 결과','세제곱을 구하는 자바스크립트','입력한 정수의 세제곱 계산'],['수의 세제곱을 알려줘','세 번 곱한 값을 반환해'],['숫자를 세 번 곱한 결과를 반환해줘','한 숫자의 세제곱을 구하는 함수를 작성해']),
('array_length','function solution(arr) { return arr.length; }',[[[[1,2]],2],[[[]],0],[[[3]],1]],['배열의 길이를 반환하는 함수','배열 원소 개수를 구해','리스트에 항목이 몇 개인지 계산','배열 길이 자바스크립트 함수','입력 배열의 요소 수 반환','목록 길이 확인 코드','배열의 항목 수를 알려줘','리스트 원소 개수 반환 함수'],['목록의 길이를 반환하는 코드','배열 길이 계산 프로그램'],['배열 안에 들어 있는 원소의 개수를 반환해줘','리스트의 길이를 돌려주는 함수를 만들어줘']),
('string_length','function solution(s) { return s.length; }',[[['abc'],3],[[''],0],[['hi!'],3]],['문자열 길이를 반환하는 함수','글자의 문자열 길이를 구해','문자열의 자바스크립트 길이','입력 문자열의 length 반환','문자열 길이 계산 코드','텍스트의 길이를 반환해','문자열이 몇 글자인지 알려줘','문자열 길이 함수 작성'],['입력된 텍스트의 길이를 반환해','문자열 글자 수를 세는 함수'],['영문 문자열의 길이를 돌려주는 함수를 작성해','입력된 영어 텍스트의 글자 수를 반환해']),
('lower','function solution(s) { return s.toLowerCase(); }',[[['HELLO'],'hello'],[['AbC'],'abc'],[[''],'']],['문자열을 소문자로 바꾸는 함수','텍스트를 모두 소문자로 변환','입력 문자열 소문자 반환','영문을 소문자로 만드는 코드','소문자 변환 자바스크립트','대문자 영어를 소문자로','문자열 소문자 함수 작성','입력 텍스트의 소문자 변환'],['문자열을 소문자로 변경해줘','영문 텍스트를 소문자로 변환'],['영어 문자열을 전부 소문자로 바꾸는 함수','받은 글자를 소문자로 변환해서 반환해']),
('upper','function solution(s) { return s.toUpperCase(); }',[[['hello'],'HELLO'],[['AbC'],'ABC'],[[''],'']],['문자열을 대문자로 바꾸는 함수','텍스트를 모두 대문자로 변환','입력 문자열 대문자 반환','영문을 대문자로 만드는 코드','대문자 변환 자바스크립트','소문자 영어를 대문자로','문자열 대문자 함수 작성','입력 텍스트의 대문자 변환'],['문자열을 대문자로 변경해줘','영문 텍스트를 대문자로 변환'],['영어 문자열을 전부 대문자로 바꾸는 함수','받은 글자를 대문자로 변환해서 반환해']),
('trim','function solution(s) { return s.trim(); }',[[['  hi '],'hi'],[['a b'],'a b'],[['  '],'']],['문자열 앞뒤 공백을 지우는 함수','텍스트 양쪽 공백 제거','입력 문자열 앞뒤 공백 삭제','문자열 양 끝의 빈칸을 제거해','문자열 앞뒤 띄어쓰기 제거 코드','영문 텍스트의 양끝 공백 없애기','문자열 trim 함수 작성','양쪽 공백을 제거하는 자바스크립트'],['문자열 양옆 공백을 지워줘','텍스트 앞뒤 공백 제거 함수'],['문자열의 양쪽 끝 공백을 없애는 함수','입력 문장의 맨 앞과 뒤 공백을 제거해']),
('array_max','function solution(arr) { return arr.length ? Math.max(...arr) : null; }',[[[[1,3,2]],3],[[[]],None],[[[-3,-2]],-2]],['배열 최댓값 빈 배열은 null 반환','빈 배열은 null 숫자 배열의 최대값','숫자 목록에서 가장 큰 값 빈 배열 null','배열에서 최댓값을 구하고 비어 있으면 null','배열 최대 숫자 빈 배열 null 함수','배열이 비면 null 아니면 가장 큰 수','빈 목록은 null 배열 최대값 코드','배열 최대를 계산하되 빈 배열은 null'],['빈 배열이면 null 그 외 최대 요소','숫자 배열의 최대를 구하고 빈 배열은 null'],['숫자 배열의 최댓값을 반환하고 비면 null을 반환해','목록에서 가장 큰 수를 찾되 빈 목록이면 null']),
('array_min','function solution(arr) { return arr.length ? Math.min(...arr) : null; }',[[[[1,3,2]],1],[[[]],None],[[[-3,-2]],-3]],['배열 최솟값 빈 배열은 null 반환','빈 배열은 null 숫자 배열의 최소값','숫자 목록에서 가장 작은 값 빈 배열 null','배열에서 최솟값을 구하고 비어 있으면 null','배열 최소 숫자 빈 배열 null 함수','배열이 비면 null 아니면 가장 작은 수','빈 목록은 null 배열 최소값 코드','배열 최소를 계산하되 빈 배열은 null'],['빈 배열이면 null 그 외 최소 요소','숫자 배열의 최소를 구하고 빈 배열은 null'],['숫자 배열의 최솟값을 반환하고 비면 null을 반환해','목록에서 가장 작은 수를 찾되 빈 목록이면 null']),
('even_filter','function solution(arr) { return arr.filter(n => n % 2 === 0); }',[[[[1,2,3,4]],[2,4]],[[[]],[]],[[[-2,-1]],[-2]]],['배열에서 짝수만 남기는 함수','숫자 리스트 짝수 필터','배열 짝수만 골라 반환','짝수 원소만 추출하는 코드','숫자 배열의 짝수만 선택','목록에서 짝수 요소 필터링','정수 배열 짝수 필터 함수','배열에서 홀수 제외하고 짝수 반환'],['숫자 배열 짝수 요소만 반환','짝수 원소만 남겨줘'],['숫자 목록에서 짝수 원소만 골라 배열로 반환해','입력 배열에서 짝수 값만 추출하는 함수']),
('unique','function solution(arr) { return [...new Set(arr)]; }',[[[[1,2,1]],[1,2]],[[[]],[]],[[[3,3]],[3]]],['배열에서 중복을 제거하는 함수','배열의 중복 항목 없애기','숫자 리스트를 중복 없이 반환','배열 중복 원소 제거 코드','중복 없는 배열 만들기','목록의 반복된 값을 제거해','입력 배열의 중복을 지워줘','배열에서 중복 제거 자바스크립트'],['배열의 중복 값을 제거해줘','목록에서 중복 요소를 없애줘'],['숫자 배열의 반복된 원소를 한 번씩만 반환해','리스트에서 중복된 항목을 없애는 함수']),
('str_reverse','function solution(s) { return Array.from(s).reverse().join(\'\'); }',[[['abc'],'cba'],[['가나'],'나가'],[[''],'']],['문자열을 거꾸로 뒤집는 함수','입력 텍스트의 순서를 반대로','문자열을 역순으로 만드는 코드','글자를 반대 순서로 반환해','문자열 순서 반전 자바스크립트','문자열을 뒤집어 반환','입력 문자 순서를 거꾸로','텍스트 순서 뒤집는 함수'],['문자열을 역순으로 반환','문자 텍스트를 거꾸로 바꿔줘'],['받은 문자열의 문자를 뒤에서부터 나열해줘','텍스트를 거꾸로 뒤집은 문자열을 반환하는 함수'])]
novel=[
('factorial','function solution(n) { let x = 1; for (let i = 2; i <= n; i++) x *= i; return x; }','0 이상의 정수의 팩토리얼을 반환하는 함수',[[[0],1],[[5],120],[[3],6]]),
('palindrome','function solution(s) { return s === Array.from(s).reverse().join(\'\'); }','문자열이 회문인지 확인하는 함수를 만들어줘',[[['aba'],True],[['ab'],False],[[''],True]]),
('gcd','function solution(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }','양의 정수 두 개의 최대공약수를 구해줘',[[[12,18],6],[[7,3],1],[[10,5],5]]),
('array_product','function solution(arr) { return arr.reduce((a, b) => a * b, 1); }','숫자 배열의 원소를 모두 곱하는 함수를 만들어줘',[[[[2,3]],6],[[[]],1],[[[0,4]],0]]),
('join_words','function solution(arr) { return arr.join(\' \'); }','단어 배열을 공백으로 이어 문자열을 만들어줘',[[[['a','b']],'a b'],[[[]],''],[[['a']],'a']]),
('positive_filter','function solution(arr) { return arr.filter(n => n > 0); }','배열에서 양수만 남기는 함수를 만들어줘',[[[[-1,0,2]],[2]],[[[]],[]],[[[2,3]],[2,3]]])]
train=[];bench=[]
for task in old['tasks']:
 prompts,examples=old_cases[task['id']];train.append({k:task[k] for k in ['id','code','train','validation']})
 for p in prompts:bench.append({'id':task['id'],'group':'기존 10유형','prompt':p,'expected':task['code'],'examples':[{'args':a,'output':b} for a,b in examples]})
for id,code,examples,prompts,val,test in new:
 train.append({'id':id,'code':code,'train':prompts,'validation':val})
 for p in test:bench.append({'id':id,'group':'추가 12유형','prompt':p,'expected':code,'examples':[{'args':a,'output':b} for a,b in examples]})
for id,code,prompt,examples in novel:bench.append({'id':id,'group':'요청 학습 제외 6유형','prompt':prompt,'expected':code,'examples':[{'args':a,'output':b} for a,b in examples]})
assert len(train)==22 and len(bench)==50
for x in train:assert set(x['train']).isdisjoint(x['validation'])
for x in bench:
 t=next((t for t in train if t['id']==x['id']),None)
 if t: assert x['prompt'] not in t['train']+t['validation']
for path,data in [('training/transformer-instructions.json',{'schema':1,'note':'Hand-authored 22 training task types. Test prompts and six unseen task types in separate benchmark.','tasks':train}),('training/coding-benchmark-v1.json',{'schema':1,'note':'Fixed before training; hand-authored and related to the training vocabulary; strict canonical exact match is conservative. Six task types entirely held out.','cases':bench})]:
 (R/path).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('train tasks',len(train),'prompts',sum(len(t['train']) for t in train),'validation',sum(len(t['validation']) for t in train),'benchmark',len(bench))
