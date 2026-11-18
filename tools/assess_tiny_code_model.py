#!/usr/bin/env python3
"""Manual post-training probe: Node syntax checking only, never executes generated JS."""
import json,pathlib,subprocess
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent.parent
model=json.loads((ROOT/'coding-weights.json').read_text());v=model['vocab'];d={c:i for i,c in enumerate(v)};p={k:np.asarray(t['data'],dtype=np.float32).reshape(t['shape']) for k,t in model['weights'].items()};ctx=model['metadata']['context']
prompts=['function add(a,b){\n  return ', 'function square(x){\n  return ', 'function isEven(n){\n  return ', 'function inc(n){\n  return ', 'function max(a,b){\n  ', 'function sum(arr){\n  ', 'function factorial(n){\n  ', 'function double(n){\n  return ']
results=[]
for prompt in prompts:
 text=prompt
 for _ in range(64):
  ids=[d.get(c,d['?']) for c in text[-ctx:].rjust(ctx)];h=np.tanh(p['E'][ids].reshape(1,-1)@p['W1']+p['b1']);text+=v[int(np.argmax(h@p['W2']+p['b2']))]
 source=text+'\n}'
 result=subprocess.run(['node','--check'],input=source,text=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,timeout=5)
 results.append({'prompt':prompt,'continuation':text[len(prompt):],'syntax_valid':result.returncode==0})
print('Syntax-valid greedy completions:',sum(x['syntax_valid'] for x in results),'/',len(results))
print('This is syntax only, not correctness or task-solving; examples are manually defined post-training.')
for r in results:print(repr(r['prompt']),'=>',repr(r['continuation'][:80]),'valid:',r['syntax_valid'])
