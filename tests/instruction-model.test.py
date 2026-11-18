#!/usr/bin/env python3
import importlib.util,json,pathlib,numpy as np
root=pathlib.Path(__file__).resolve().parent.parent;spec=importlib.util.spec_from_file_location('inst',root/'tools/train_instruction_model.py');inst=importlib.util.module_from_spec(spec);spec.loader.exec_module(inst)
artifact=json.loads((root/'instruction-weights.json').read_text());report=json.loads((root/'training/instruction-evaluation.json').read_text());m=artifact['metadata'];p={k:np.array(v['data'],dtype=np.float32).reshape(v['shape']) for k,v in artifact['weights'].items()};initial=inst.initialize(np.random.default_rng(inst.SEED))
assert m['pretrain_steps']==12000 and m['code_files']['train']==297 and m['code_pretrained_loss']<m['code_post_instruction_loss']<m['code_initial_loss']
assert m['parameters']==sum(x.size for x in p.values())==83296 and m['train_prompts']==120 and m['chosen_step']==4000
assert sum(float(np.abs(p[k]-initial[k]).sum()) for k in p)>1
sets={kind:{s for t in inst.DATA['tasks'] for s in t[kind]} for kind in ('train','validation','test')};assert not sets['train']&sets['test'] and not sets['train']&sets['validation'] and not sets['test']&sets['validation']
assert all(t['id'] not in {a['id'] for a in inst.DATA['tasks']} for t in inst.DATA['novel_tasks'])
extra=json.loads((root/'training/extra-instruction-probes.json').read_text());assert not {x['prompt'] for x in extra}&(sets['train']|sets['validation']|sets['test'])
fresh=json.loads((root/'training/fresh-instruction-probes.json').read_text());assert not {x['prompt'] for x in fresh}&(sets['train']|sets['validation']|sets['test']|{x['prompt'] for x in extra})
for kind in ('validation','test','extra','fresh','novel'):
 details=report[kind]['details'];actual=[inst.generate(p,x['prompt']) for x in details];assert all(a==x['generated'] for a,x in zip(actual,details));assert sum(a==x['expected'] for a,x in zip(actual,details))==report[kind]['exact']
assert inst.score(initial,'test')['exact']==0 and report['test']['exact']==30 and report['extra']['exact']==13 and report['fresh']['exact']==14 and report['novel']['exact']==0
rng=np.random.default_rng(4);x=rng.integers(0,inst.V,(8,inst.CTX));q=np.stack([inst.hash_feature(a) for a in ['두 수 더하기','숫자 곱하기']*4]);y=rng.integers(0,inst.V,8);_,g=inst.gradient(initial,x,q,y)
for k in initial:
 ix=np.unravel_index(np.abs(g[k]).argmax(),g[k].shape);orig=initial[k][ix].copy();eps=.003;initial[k][ix]=orig+eps;plus=inst.gradient(initial,x,q,y)[0];initial[k][ix]=orig-eps;minus=inst.gradient(initial,x,q,y)[0];initial[k][ix]=orig
 assert abs((plus-minus)/(2*eps)-float(g[k][ix]))<.0003,k
print('PASS seeded initialization, changed weights, split isolation, all held-out metrics and backprop gradients')
