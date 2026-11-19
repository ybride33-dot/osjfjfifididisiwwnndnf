#!/usr/bin/env python3
import importlib.util,json,pathlib,numpy as np
root=pathlib.Path(__file__).resolve().parent.parent;s=importlib.util.spec_from_file_location('model',root/'tools/train_composer_model.py');c=importlib.util.module_from_spec(s);s.loader.exec_module(c)
a=json.loads((root/'composer-weights.json').read_text());r=json.loads((root/'training/composer-evaluation.json').read_text());p={k:np.array(x['data'],dtype=np.float32).reshape(x['shape']) for k,x in a['weights'].items()};init=c.initialize(np.random.default_rng(c.SEED));data,groups=c.examples()
assert not set(groups['train'])&set(groups['test']) and not set(groups['train'])&set(groups['validation']) and not set(groups['test'])&set(groups['validation'])
assert sum(x.size for x in p.values())==a['metadata']['parameters']==51673 and sum(float(np.abs(p[k]-init[k]).sum()) for k in p)>1
before=c.evaluate(init,data['test']);after=c.evaluate(p,data['test']);assert before['exact']==0 and after['exact']==71 and after['total']==71
for x,pred in zip(r['held_out'],after['pred']):assert x['predicted']==pred.tolist()
rng=np.random.default_rng(1);x=np.array([c.feature(v) for v in ['짝수 배열 합','양수 제곱','홀수 리스트']*3]);y=np.stack([rng.integers(0,n,len(x)) for n in c.HEADS],axis=1);_,g=c.gradient(init,x,y)
for k in init:
 ix=np.unravel_index(np.abs(g[k]).argmax(),g[k].shape);old=init[k][ix].copy();eps=.003;init[k][ix]=old+eps;plus=c.gradient(init,x,y)[0];init[k][ix]=old-eps;minus=c.gradient(init,x,y)[0];init[k][ix]=old;assert abs((plus-minus)/(2*eps)-float(g[k][ix]))<.0007,k
print('PASS real changed weights, fixed combination split, held-out metrics, cross-language predictions and finite-difference backprop')
