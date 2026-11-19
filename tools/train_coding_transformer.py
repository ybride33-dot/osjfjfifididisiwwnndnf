#!/usr/bin/env python3
"""Small from-scratch conditional character Transformer. No pretrained network weights.
Requires PyTorch CPU + NumPy. Test sets are never used for checkpoint selection.
"""
import argparse,copy,hashlib,json,math,pathlib,time
import numpy as np,torch
from torch import nn
from torch.nn import functional as F
R=pathlib.Path(__file__).resolve().parent.parent
VOCAB=''.join(chr(i) for i in range(32,127));EOS=95;BOS=96;CTX=80;D=48;NH=4;FF=96;Q=256;SEED=20261119;TABLE={c:i for i,c in enumerate(VOCAB)}
torch.set_num_threads(1);torch.manual_seed(SEED);np.random.seed(SEED)

def feature(text):
 s=''.join(text.lower().split())[:200];q=np.zeros(Q,dtype=np.float32);n=0
 for width in (1,2):
  for i in range(len(s)-width+1):
   h=2166136261
   for c in s[i:i+width]:h=((h^ord(c))*16777619)&0xffffffff
   q[h%Q]+=1;n+=1
 if n:q/=math.sqrt(n)
 return q
class Block(nn.Module):
 def __init__(self):
  super().__init__();self.ln1=nn.LayerNorm(D,eps=1e-5);self.qkv=nn.Linear(D,3*D);self.proj=nn.Linear(D,D);self.ln2=nn.LayerNorm(D,eps=1e-5);self.fc1=nn.Linear(D,FF);self.fc2=nn.Linear(FF,D)
 def forward(self,x):
  b,t,d=x.shape;z=self.ln1(x);q,k,v=self.qkv(z).chunk(3,dim=-1)
  q=q.view(b,t,NH,D//NH).transpose(1,2);k=k.view(b,t,NH,D//NH).transpose(1,2);v=v.view(b,t,NH,D//NH).transpose(1,2)
  a=(q@k.transpose(-2,-1))/math.sqrt(D//NH);mask=torch.ones(t,t,dtype=torch.bool,device=x.device).triu(1);a=a.masked_fill(mask,float('-inf'));a=F.softmax(a,dim=-1)
  x=x+self.proj((a@v).transpose(1,2).contiguous().view(b,t,D));return x+self.fc2(F.relu(self.fc1(self.ln2(x))))
class Model(nn.Module):
 def __init__(self):
  super().__init__();self.embedding=nn.Embedding(97,D);self.position=nn.Embedding(CTX,D);self.condition=nn.Linear(Q,D,bias=False);self.block=Block();self.final=nn.LayerNorm(D,eps=1e-5);self.out=nn.Linear(D,96)
 def forward(self,x,q):
  t=x.shape[1];assert t<=CTX
  h=self.embedding(x)+self.position(torch.arange(t,device=x.device))[None,:,:]+self.condition(q)[:,None,:]
  return self.out(self.final(self.block(h)))

def group(path):
 p=path.split('/')
 if len(p)>=4 and p[:2]==['src','algorithms']:return '/'.join(p[:4])
 if len(p)>=3 and p[:2]==['src','data-structures']:return '/'.join(p[:3])
 return '/'.join(p[:-1])
def split(group):
 n=int.from_bytes(hashlib.sha256(('jarvis-code-split-v1:'+group).encode()).digest()[:4],'big')%10
 return 'test' if n==0 else ('validation' if n==1 else 'train')
def corpus():
 data=json.loads((R/'code-corpus.json').read_text());out={'train':[],'validation':[],'test':[]};seen=set();counts={k:0 for k in out}
 for f in data['files']:
  if f['kind']!='code':continue
  text=f['text'];digest=hashlib.sha256(text.encode()).hexdigest()
  if digest in seen:continue
  seen.add(digest);g=split(group(f['path']));a=np.array([TABLE.get(' ' if c in '\n\r\t' else c,TABLE['?']) for c in text],dtype=np.int64)
  if len(a)>CTX+1:out[g].append(a);counts[g]+=1
 return out,counts

def sample_code(files,rng,batch):
 x=np.empty((batch,CTX),dtype=np.int64);y=np.empty_like(x)
 # proportional to available windows, rather than selecting tiny files disproportionately
 weights=np.array([len(f)-CTX for f in files],dtype=np.float64);weights/=weights.sum()
 for j,idx in enumerate(rng.choice(len(files),batch,p=weights)):
  a=files[idx];start=rng.integers(0,len(a)-CTX);x[j]=a[start:start+CTX];y[j]=a[start+1:start+CTX+1]
 return torch.from_numpy(x),torch.from_numpy(y),torch.zeros(batch,Q)

def instruction_data():
 tasks=json.loads((R/'training/transformer-instructions.json').read_text())['tasks'];out={'train':[],'validation':[]}
 for t in tasks:
  ids=[TABLE[c] for c in t['code']]+[EOS]
  assert len(ids)<=CTX
  for k in out:
   for prompt in t[k]:
    x=np.full(CTX,BOS,dtype=np.int64);y=np.full(CTX,-1,dtype=np.int64);x[:len(ids)]=[BOS]+ids[:-1];y[:len(ids)]=ids
    out[k].append((x,y,feature(prompt),prompt,t['code']))
 return out

def batch_instruction(rows,indices):
 r=[rows[i] for i in indices];return torch.from_numpy(np.stack([x[0] for x in r])),torch.from_numpy(np.stack([x[1] for x in r])),torch.from_numpy(np.stack([x[2] for x in r]))
def loss(m,x,y,q):return F.cross_entropy(m(x,q).reshape(-1,96),y.reshape(-1),ignore_index=-1)
@torch.no_grad()
def validation_loss(m,rows):
 m.eval();nums=[]
 for i in range(0,len(rows),16):
  x,y,q=batch_instruction(rows,range(i,min(i+16,len(rows))));nums.append((float(loss(m,x,y,q)),len(x)))
 return round(sum(x*n for x,n in nums)/sum(n for _,n in nums),6)
@torch.no_grad()
def code_eval(m,files,seed,batches=24):
 m.eval();rng=np.random.default_rng(seed);losses=[];correct=total=0
 for _ in range(batches):
  x,y,q=sample_code(files,rng,16);logits=m(x,q);losses.append(float(F.cross_entropy(logits.reshape(-1,96),y.reshape(-1))));correct+=int((logits.argmax(-1)==y).sum());total+=y.numel()
 return {'loss':round(float(np.mean(losses)),6),'next_char_accuracy':round(correct/total,6),'positions':total}
@torch.no_grad()
def generate(m,prompt):
 m.eval();q=torch.from_numpy(feature(prompt)).unsqueeze(0);ids=[]
 for _ in range(CTX):
  x=torch.tensor([[BOS]+ids],dtype=torch.long);z=m(x,q)[0,-1,:];v=int(z.argmax())
  if v==EOS:break
  ids.append(v)
  if len(ids)>=CTX:break
 return ''.join(VOCAB[i] for i in ids)

def export(m,meta):
 weights={}
 for k,v in m.state_dict().items():
  a=v.detach().cpu().numpy().astype(np.float32);weights[k]={'shape':list(a.shape),'data':[float(x) for x in a.reshape(-1)]}
 (R/'transformer-coding-weights.json').write_text(json.dumps({'schema':1,'vocab':VOCAB,'metadata':meta,'weights':weights},ensure_ascii=True,separators=(',',':')))

def main():
 ap=argparse.ArgumentParser();ap.add_argument('--pretrain-steps',type=int,default=1200);ap.add_argument('--steps',type=int,default=3500);ap.add_argument('--batch',type=int,default=16);ap.add_argument('--interval',type=int,default=250);args=ap.parse_args()
 c,counts=corpus();rows=instruction_data();rng=np.random.default_rng(SEED);m=Model();initial=copy.deepcopy(m.state_dict());parameters=sum(p.numel() for p in m.parameters());print('SETUP',json.dumps({'parameters':parameters,'code_files':counts,'instruction_train':len(rows['train']),'instruction_validation':len(rows['validation']),'ctx':CTX,'heads':NH}),flush=True)
 initial_code=code_eval(m,c['test'],3210);val_initial=validation_loss(m,rows['validation']);print('INITIAL',initial_code,'instruction_val_loss',val_initial,flush=True)
 optim=torch.optim.AdamW(m.parameters(),lr=.001,weight_decay=.01);start=time.time();best_code=1e9;best_pre=None;best_pre_step=0
 for step in range(1,args.pretrain_steps+1):
  m.train();x,y,q=sample_code(c['train'],rng,args.batch);z=loss(m,x,y,q);optim.zero_grad();z.backward();nn.utils.clip_grad_norm_(m.parameters(),1);optim.step()
  if step%args.interval==0 or step==args.pretrain_steps:
   v=code_eval(m,c['validation'],4321,batches=8);print('PRETRAIN',step,'loss',round(float(z),4),'val',v,'seconds',round(time.time()-start,1),flush=True)
   if v['loss']<best_code:best_code=v['loss'];best_pre=copy.deepcopy(m.state_dict());best_pre_step=step
 m.load_state_dict(best_pre);pre_code=code_eval(m,c['test'],3210);print('PRETRAIN_SELECTED',best_pre_step,pre_code,flush=True)
 optim=torch.optim.AdamW(m.parameters(),lr=.0008,weight_decay=.005);best_val=1e9;best=None;best_step=0
 for step in range(1,args.steps+1):
  m.train();ix=rng.integers(0,len(rows['train']),args.batch);x,y,q=batch_instruction(rows['train'],ix);z=loss(m,x,y,q);optim.zero_grad();z.backward();nn.utils.clip_grad_norm_(m.parameters(),1);optim.step()
  if step%args.interval==0 or step==args.steps:
   v=validation_loss(m,rows['validation']);print('INSTRUCT',step,'loss',round(float(z),4),'validation',v,'seconds',round(time.time()-start,1),flush=True)
   if v<best_val:best_val=v;best=copy.deepcopy(m.state_dict());best_step=step
 m.load_state_dict(best);post_code=code_eval(m,c['test'],3210);changed=sum(float(torch.abs(m.state_dict()[k]-initial[k]).sum()) for k in initial);val_details=[]
 for x,y,q,prompt,target in rows['validation']:
  out=generate(m,prompt);val_details.append({'prompt':prompt,'expected':target,'generated':out,'exact':out==target})
 val_exact=sum(x['exact'] for x in val_details)
 meta={'model':'jarvis-small-conditional-causal-transformer-v1','parameters':parameters,'architecture':'one causal self-attention transformer block, four attention heads, learned hashed Korean prompt condition, character-level JavaScript decoding','ctx':CTX,'dimension':D,'heads':NH,'ff':FF,'features':Q,'seed':SEED,'code_files':counts,'code_initial_test':initial_code,'code_pretrained_test':pre_code,'code_final_test':post_code,'pretrain_steps_run':args.pretrain_steps,'pretrain_selected_step':best_pre_step,'instruction_steps_run':args.steps,'instruction_selected_step':best_step,'batch':args.batch,'train_tasks':22,'train_prompts':len(rows['train']),'validation_total':len(rows['validation']),'validation_exact':val_exact,'validation_loss':best_val,'initial_instruction_validation_loss':val_initial,'weight_change_l1':round(changed,4),'note':'Test comparisons use exact source match against canonical handwritten answers. Instruction tasks and phrasing are narrow; no general programming claim.'}
 export(m,meta);(R/'training/transformer-validation.json').write_text(json.dumps({'metadata':meta,'validation':val_details},ensure_ascii=False,indent=2)+'\n');print('DONE',json.dumps(meta,ensure_ascii=False),flush=True)
if __name__=='__main__':main()
