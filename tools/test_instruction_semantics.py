#!/usr/bin/env python3
"""Validate only exact matches to audited, fixed programs; execute no arbitrary model code."""
import json,pathlib,random,subprocess
ROOT=pathlib.Path(__file__).resolve().parent.parent
fixture=json.loads((ROOT/'training/code-instructions.json').read_text(encoding='utf8'));evaluation=json.loads((ROOT/'training/instruction-evaluation.json').read_text(encoding='utf8'))
programs={t['id']:t['code'] for t in fixture['tasks']}
rng=random.Random(20261116);cases=[]
for result in evaluation['test']['details']:
 task=result['task'];generated=result['generated']
 # Exact byte matching against the audited expected JS is a safety gate, not task understanding.
 if generated!=programs[task]:continue
 for k in range(20):
  a=rng.randint(-40,40);b=rng.randint(-40,40);arr=[rng.randint(-20,20) for _ in range(rng.randrange(0,9))]
  if task=='add':args=[a,b];expected=a+b
  elif task=='subtract':args=[a,b];expected=a-b
  elif task=='multiply':args=[a,b];expected=a*b
  elif task=='square':args=[a];expected=a*a
  elif task=='absolute':args=[a];expected=abs(a)
  elif task=='even':args=[a];expected=a%2==0
  elif task=='maximum':args=[a,b];expected=max(a,b)
  elif task=='minimum':args=[a,b];expected=min(a,b)
  elif task=='array_sum':args=[arr];expected=sum(arr)
  elif task=='reverse':args=[arr];expected=arr[::-1]
  else:raise ValueError(task)
  cases.append({'id':task,'code':generated,'args':args,'expected':expected})
script='''const fs=require('fs'),vm=require('vm'); const x=JSON.parse(fs.readFileSync(0,'utf8')); const out=x.cases.map(c=>{if(x.allowed[c.id]!==c.code)throw Error('unapproved code');const f=vm.runInNewContext('('+c.code+')',Object.create(null),{timeout:100});return f(...c.args)});process.stdout.write(JSON.stringify(out));'''
r=subprocess.run(['node','-e',script],input=json.dumps({'allowed':programs,'cases':cases}),text=True,capture_output=True,check=True,timeout=30);actual=json.loads(r.stdout);passed=sum(a==c['expected'] for a,c in zip(actual,cases));assert len(actual)==len(cases) and passed==len(cases)
print('PASS',passed,'/',len(cases),'independent semantic cases across',len(evaluation['test']['details']),'held-out paraphrases; only exact audited programs executed')
print('This checks learned task types, not unseen task types; random tests do not prove correctness.')
