#!/usr/bin/env python3
import importlib.util,json,hashlib,pathlib
import numpy as np
root=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('tiny',root/'tools/train_tiny_code_model.py');tiny=importlib.util.module_from_spec(spec);spec.loader.exec_module(tiny)
corpus=json.loads((root/'code-corpus.json').read_text());report=json.loads((root/'tools/tiny-code-training-report.json').read_text());artifact=json.loads((root/'coding-weights.json').read_text());meta=artifact['metadata']
assert corpus['license']=='MIT' and meta['revision']==corpus['revision'] and meta['parameter_count']==38381
records,groups,duplicates=tiny.prep(corpus);assert not duplicates
sets={k:{x[1] for x in rows} for k,rows in records.items()}
assert not sets['train']&sets['test'] and not sets['train']&sets['val'] and not sets['val']&sets['test']
for split in records:
 assert len(records[split])==meta['split_stats'][split]['files']
 for path,group,sha,arr in records[split]:assert tiny.split_name(group)==split and sha in {x['sha256'] for x in report['files'][split]}
dataset={k:tiny.windows(v) for k,v in records.items()};rng=np.random.default_rng(tiny.SEED);initial=tiny.init(rng);er=np.random.default_rng(tiny.SEED+1);vi=er.choice(len(dataset['val']),size=12000,replace=False);ti=er.choice(len(dataset['test']),size=16000,replace=False)
trained={k:np.array(v['data'],dtype=np.float32).reshape(v['shape']) for k,v in artifact['weights'].items()}
assert sum(float(np.sum(np.abs(initial[k]-trained[k]))) for k in initial)>1
before=tiny.evaluate(initial,dataset['test'],ti);after=tiny.evaluate(trained,dataset['test'],ti);baseline=tiny.baseline_metrics(dataset['train'],dataset['test'],ti)
for metric in ('next_char_accuracy','non_whitespace_accuracy','loss_nats'):
 assert abs(before[metric]-meta['test_before'][metric])<.0001,(metric,before,meta['test_before'])
 assert abs(after[metric]-meta['test_after'][metric])<.0001,(metric,after,meta['test_after'])
assert baseline==meta['test_baselines'];assert after['loss_nats']<before['loss_nats'] and after['next_char_accuracy']>baseline['one_previous_character_accuracy']
# Verify backprop with finite differences, independent of trained checkpoint.
x=rng.integers(0,tiny.V,(8,tiny.CTX));y=rng.integers(0,tiny.V,8);_,_,g=tiny.grad(initial,x,y)
for key in ['E','W1','b1','W2','b2']:
 index=(0,)*initial[key].ndim;old=initial[key][index].copy();eps=.003;initial[key][index]=old+eps;plus=tiny.grad(initial,x,y)[0];initial[key][index]=old-eps;minus=tiny.grad(initial,x,y)[0];initial[key][index]=old
 assert abs((plus-minus)/(2*eps)-float(g[key][index]))<.0003,key
print('PASS source and split integrity, held-out metric reproduction, simple baselines and backprop gradients')
print('Test next-char accuracy:',before['next_char_accuracy'],'→',after['next_char_accuracy'],'bigram:',baseline['one_previous_character_accuracy'],'non-whitespace:',after['non_whitespace_accuracy'])
