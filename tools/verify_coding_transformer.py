#!/usr/bin/env python3
"""Optional PyTorch cross-check; generated code is never executed."""
import json,pathlib,sys,torch,numpy as np
R=pathlib.Path(__file__).resolve().parent.parent;sys.path.insert(0,str(R/'tools'));import train_coding_transformer as T
j=json.loads((R/'transformer-coding-weights.json').read_text());m=T.Model();state={k:torch.tensor(v['data'],dtype=torch.float32).reshape(v['shape']) for k,v in j['weights'].items()};m.load_state_dict(state)
c,counts=T.corpus();assert counts==j['metadata']['code_files'];got=T.code_eval(m,c['test'],3210);assert got==j['metadata']['code_final_test'],(got,j['metadata']['code_final_test'])
rows=T.instruction_data();val=T.validation_loss(m,rows['validation']);assert abs(val-j['metadata']['validation_loss'])<1e-5,(val,j['metadata']['validation_loss'])
bench=json.loads((R/'training/coding-benchmark-transformer.json').read_text());fresh=json.loads((R/'training/transformer-fresh-evaluation.json').read_text());different=[]
for case in bench['details']+fresh['details']:
 p=T.generate(m,case['prompt'])
 if p!=case['generated']:different.append((case['prompt'],p,case['generated']))
assert not different,different[:3]
# Numerical backprop check on a small batch and an actually-used learned weight.
x=torch.tensor([[T.BOS,T.TABLE['f'],T.TABLE['u'],T.TABLE['n']],[T.BOS,T.TABLE['a'],T.TABLE['b'],T.TABLE['c']]],dtype=torch.long);y=torch.tensor([[T.TABLE['f'],T.TABLE['u'],T.TABLE['n'],T.TABLE['c']],[T.TABLE['a'],T.TABLE['b'],T.TABLE['c'],T.EOS]],dtype=torch.long);q=torch.from_numpy(np.stack([T.feature('배열을 더해줘'),T.feature('짝수 확인')]))
m.zero_grad();loss=T.loss(m,x,y,q);loss.backward();param=m.block.qkv.weight;grad=param.grad.detach().numpy();idx=np.unravel_index(np.abs(grad).argmax(),grad.shape);old=float(param.data[idx]);eps=.002
with torch.no_grad():param[idx]=old+eps;plus=float(T.loss(m,x,y,q));param[idx]=old-eps;minus=float(T.loss(m,x,y,q));param[idx]=old
num=(plus-minus)/(2*eps);actual=float(grad[idx]);assert abs(num-actual)<.003,(idx,num,actual)
torch.manual_seed(T.SEED);initial=T.Model();delta=sum(float(torch.abs(m.state_dict()[k]-initial.state_dict()[k]).sum()) for k in state);assert abs(delta-j['metadata']['weight_change_l1'])<.1,(delta,j['metadata']['weight_change_l1'])
print(f'PASS true changed weights, 80 PyTorch/JavaScript generations agree, split counts, held-out metrics and finite-difference gradient (error {abs(num-actual):.6f})')
