#!/usr/bin/env python3
"""Create new hand-written probes after model checkpoint fixed and original benchmark assessed."""
import json,pathlib
R=pathlib.Path(__file__).resolve().parent.parent;tasks={x['id']:x for x in json.loads((R/'training/transformer-instructions.json').read_text())['tasks']}
seen=[('add','숫자 두 개를 받아 덧셈한 값을 돌려줘'),('subtract','두 수를 입력받고 첫 번째 값에서 두 번째 값을 빼줘'),('multiply','a와 b를 곱한 값을 계산해서 돌려줘'),('square','숫자 하나를 받아 제곱을 반환해줘'),('absolute','숫자의 크기를 절댓값으로 돌려줘'),('even','입력된 숫자가 짝수이면 참을 돌려줘'),('maximum','입력한 두 숫자 중 큰 쪽을 반환해줘'),('minimum','입력한 두 숫자 중 작은 쪽을 반환해줘'),('array_sum','배열 속 숫자들의 합계를 반환해줘'),('reverse','배열에 있는 값들을 역순으로 출력해줘'),('odd','정수 하나를 받아 홀수인지 참 거짓으로 답해줘'),('cube','입력값을 세제곱해서 결과를 돌려줘'),('array_length','배열 원소가 몇 개인지 숫자로 반환해줘'),('string_length','영문 문자열의 자바스크립트 길이를 돌려줘'),('lower','문자열의 모든 영문자를 소문자로 바꿔 반환해줘'),('upper','영문 문자열의 각 문자를 대문자로 변환해줘'),('trim','받은 문자열에서 앞뒤 공백을 지운 후 반환해줘'),('even_filter','숫자 배열에서 짝수 값만 남겨 반환해줘'),('unique','배열의 중복된 숫자를 제거한 결과를 반환해줘'),('str_reverse','문자열 글자 순서를 거꾸로 해서 돌려줘')]
novel=[
('factorial','0 이상의 정수를 입력받아 팩토리얼을 계산해줘','function solution(n) { let x = 1; for (let i = 2; i <= n; i++) x *= i; return x; }'),
('palindrome','입력 문자열이 거꾸로 해도 같은지 판별해줘',"function solution(s) { return s === Array.from(s).reverse().join(''); }"),
('gcd','양의 정수 a와 b의 최대공약수를 반환해줘','function solution(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }'),
('array_product','입력된 숫자 배열의 곱을 구해줘','function solution(arr) { return arr.reduce((a, b) => a * b, 1); }'),
('join_words','문자열 목록을 공백으로 합쳐줘',"function solution(arr) { return arr.join(' '); }"),
('positive_filter','숫자 목록에서 양수인 요소만 반환해줘','function solution(arr) { return arr.filter(n => n > 0); }'),
('is_prime','정수 n이 소수인지 판별하는 함수를 만들어줘','function solution(n) { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }'),
('numeric_sort','숫자 배열을 오름차순으로 정렬해줘','function solution(arr) { return [...arr].sort((a, b) => a - b); }'),
('sum_squares','숫자 배열의 각 값을 제곱한 뒤 모두 더해줘','function solution(arr) { return arr.reduce((a, b) => a + b * b, 0); }'),
('multiple_of_three','정수가 3의 배수인지 확인하는 함수를 작성해줘','function solution(n) { return n % 3 === 0; }')]
cases=[]
for id,prompt in seen:
 assert prompt not in tasks[id]['train']+tasks[id]['validation'];cases.append({'id':id,'group':'학습 유형의 새 표현','prompt':prompt,'expected':tasks[id]['code']})
for id,prompt,code in novel:cases.append({'id':id,'group':'요청 학습에서 제외된 유형','prompt':prompt,'expected':code})
(R/'training/transformer-fresh-probes.json').write_text(json.dumps({'schema':1,'note':'Written after training and after the 50-case benchmark was evaluated; not a representative general coding test. Some novel types were included in the prior benchmark.','cases':cases},ensure_ascii=False,indent=2)+'\n')
print('fresh probes',len(cases))
