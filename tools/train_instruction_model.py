#!/usr/bin/env python3
"""From-scratch conditional character MLP trained on Korean request/JS answer pairs.
NumPy only. All data and held-out splits are in training/code-instructions.json.
"""
import argparse,copy,hashlib,json,math,pathlib,time
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent.parent
DATA=json.loads((ROOT/'training/code-instructions.json').read_text(encoding='utf8'))
VOCAB=''.join(chr(i) for i in range(32,127));EOS=len(VOCAB);V=EOS+1;CTX=24;DIM=12;H=128;Q=256;SEED=20261116;C={x:i for i,x in enumerate(VOCAB)}

def hash_feature(text):
 s=''.join(text.lower().split())[:200];out=np.zeros(Q,dtype=np.float32);n=0
 for width in (1,2):
  for i in range(len(s)-width+1):
   h=2166136261
   for c in s[i:i+width]:h=((h^ord(c))*16777619)&0xffffffff
   out[h%Q]+=1;n+=1
 if n:out/=math.sqrt(n)
 return out

def dataset(split):
 contexts=[];features=[];targets=[]
 for task in DATA['tasks']:
  for prompt in task[split]:
   q=hash_feature(prompt);ids=[C[c] for c in task['code']]+[EOS]
   for j,token in enumerate(ids):
    prior=ids[max(0,j-CTX):j];contexts.append([C[' ']]*(CTX-len(prior))+prior);features.append(q);targets.append(token)
 return np.array(contexts,dtype=np.uint8),np.array(features,dtype=np.float32),np.array(targets,dtype=np.uint8)

def code_group(path):
 p=path.split('/')
 if len(p)>=4 and p[:2]==['src','algorithms']:return '/'.join(p[:4])
 if len(p)>=3 and p[:2]==['src','data-structures']:return '/'.join(p[:3])
 return '/'.join(p[:-1])
def code_split(group):
 n=int.from_bytes(hashlib.sha256(('jarvis-code-split-v1:'+group).encode()).digest()[:4],'big')%10
 return 'test' if n==0 else ('validation' if n==1 else 'train')
def code_windows():
 corpus=json.loads((ROOT/'code-corpus.json').read_text(encoding='utf8'));groups={'train':[],'validation':[],'test':[]};files={k:0 for k in groups};seen=set()
 for f in corpus['files']:
  if f['kind']!='code':continue
  text=f['text'];digest=hashlib.sha256(text.encode()).hexdigest()
  if digest in seen:continue
  seen.add(digest);name=code_split(code_group(f['path']));a=np.fromiter((C.get(ch if ch not in '\n\t\r' else ' ',C['?']) for ch in text),dtype=np.uint8,count=len(text))
  if len(a)>CTX:groups[name].append(np.lib.stride_tricks.sliding_window_view(a,CTX+1));files[name]+=1
 return {k:np.concatenate(v,axis=0) for k,v in groups.items()},files,corpus

def code_loss(p,data,indices):
 total=0.;n=0
 for i in range(0,len(indices),512):
  rows=data[indices[i:i+512]];q=np.zeros((len(rows),Q),dtype=np.float32);_,_,v=forward(p,rows[:,:CTX],q);target=rows[:,CTX];total+=float(-np.log(np.maximum(v[np.arange(len(rows)),target],1e-30)).sum());n+=len(rows)
 return round(total/n,6)

def initialize(rng):
 return {'E':rng.normal(0,.12,(V,DIM)).astype('f'), 'W':rng.normal(0,1/math.sqrt(CTX*DIM),(CTX*DIM,H)).astype('f'),'Q':rng.normal(0,.03,(Q,H)).astype('f'),'b':np.zeros(H,dtype='f'),'O':rng.normal(0,1/math.sqrt(H),(H,V)).astype('f'),'c':np.zeros(V,dtype='f')}

def forward(p,x,q):
 emb=p['E'][x].reshape(len(x),-1);h=np.tanh(emb@p['W']+q@p['Q']+p['b']);z=h@p['O']+p['c'];z-=z.max(axis=1,keepdims=True);v=np.exp(z);v/=v.sum(axis=1,keepdims=True);return emb,h,v

def gradient(p,x,q,y):
 emb,h,prob=forward(p,x,q);n=len(y);loss=-np.log(np.maximum(prob[np.arange(n),y],1e-30)).mean();dz=prob.copy();dz[np.arange(n),y]-=1;dz/=n
 dO=h.T@dz;dc=dz.sum(0);dh=(dz@p['O'].T)*(1-h*h);dw=emb.T@dh;dq=q.T@dh;db=dh.sum(0);de=(dh@p['W'].T).reshape(n,CTX,DIM);dE=np.zeros_like(p['E']);np.add.at(dE,x.ravel(),de.reshape(-1,DIM));return float(loss),{'E':dE,'W':dw,'Q':dq,'b':db,'O':dO,'c':dc}

def generate(p,prompt,limit=100):
 q=hash_feature(prompt).reshape(1,-1);ids=[]
 for i in range(limit):
  x=np.array(([C[' ']]*CTX+ids)[-CTX:],dtype=np.int64).reshape(1,-1);_,_,v=forward(p,x,q);token=int(v.argmax(1)[0]);
  if token==EOS:return ''.join(VOCAB[i] for i in ids)
  ids.append(token)
 return ''.join(VOCAB[i] for i in ids)

def score(p,split):
 pairs=[(t['id'],s,t['code']) for t in DATA['tasks'] for s in t[split]] if split!='novel_tasks' else [(x['id'],x['prompt'],x['code']) for x in DATA['novel_tasks']]
 details=[{'task':i,'prompt':q,'expected':want,'generated':generate(p,q),'exact_match':False} for i,q,want in pairs]
 for x in details:x['exact_match']=x['generated']==x['expected']
 return {'exact':sum(x['exact_match'] for x in details),'total':len(details),'details':details}

def encode(p):return {k:{'shape':list(v.shape),'data':np.round(v.astype(np.float64),7).reshape(-1).tolist()} for k,v in p.items()}

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--steps',type=int,default=16000);parser.add_argument('--batch',type=int,default=128);parser.add_argument('--pretrain-steps',type=int,default=12000);a=parser.parse_args();assert 1<=a.steps<=50000 and 1<=a.pretrain_steps<=50000 and 1<=a.batch<=512
 x,q,y=dataset('train');r=np.random.default_rng(SEED);p=initialize(r);mom={k:np.zeros_like(v) for k,v in p.items()};vel={k:np.zeros_like(v) for k,v in p.items()};best=None;bestscore=-1;beststep=0;t0=time.time()
 before=score(p,'test');print('Dataset',len(DATA['tasks']),'tasks,',len(x),'target character windows; before test exact',before['exact'],'/',before['total'],flush=True)
 corpus_data,code_files,corpus=code_windows();er=np.random.default_rng(SEED+1);test_indices=er.choice(len(corpus_data['test']),size=min(12000,len(corpus_data['test'])),replace=False)
 before_code=code_loss(p,corpus_data['test'],test_indices);print('Code pretraining files',code_files,'initial held-out character loss',before_code,flush=True)
 zero=np.zeros((a.batch,Q),dtype=np.float32)
 for step in range(1,a.pretrain_steps+1):
  row=corpus_data['train'][r.integers(0,len(corpus_data['train']),size=a.batch)];loss,g=gradient(p,row[:,:CTX],zero,row[:,CTX])
  for k in p:
   mom[k]=.9*mom[k]+.1*g[k];vel[k]=.999*vel[k]+.001*g[k]*g[k];p[k]-=.002*(mom[k]/(1-.9**step))/(np.sqrt(vel[k]/(1-.999**step))+1e-8)
  if step%4000==0 or step==a.pretrain_steps:print('code pretrain',step,'loss',round(loss,4),'seconds',round(time.time()-t0,1),flush=True)
 after_pretrain=code_loss(p,corpus_data['test'],test_indices);print('Pretrained held-out character loss',after_pretrain,flush=True)
 # Reset optimizer state before supervised instruction tuning.
 mom={k:np.zeros_like(v) for k,v in p.items()};vel={k:np.zeros_like(v) for k,v in p.items()}
 for step in range(1,a.steps+1):
  idx=r.integers(0,len(y),size=a.batch);loss,g=gradient(p,x[idx],q[idx],y[idx])
  for k in p:
   mom[k]=.9*mom[k]+.1*g[k];vel[k]=.999*vel[k]+.001*g[k]*g[k];p[k]-=.002*(mom[k]/(1-.9**step))/(np.sqrt(vel[k]/(1-.999**step))+1e-8)
  if step%2000==0 or step==a.steps:
   val=score(p,'validation');print('step',step,'loss',round(loss,4),'validation exact',val['exact'],'/',val['total'],'seconds',round(time.time()-t0,1),flush=True)
   if val['exact']>bestscore:best=copy.deepcopy(p);bestscore=val['exact'];beststep=step
 assert best is not None
 test=score(best,'test');novel=score(best,'novel_tasks');validation=score(best,'validation')
 extra_data=json.loads((ROOT/'training/extra-instruction-probes.json').read_text(encoding='utf8'));target_by_id={t['id']:t['code'] for t in DATA['tasks']}
 extra_details=[{'task':x['id'],'prompt':x['prompt'],'expected':target_by_id[x['id']],'generated':generate(best,x['prompt'])} for x in extra_data]
 for x in extra_details:x['exact_match']=x['generated']==x['expected']
 extra={'exact':sum(x['exact_match'] for x in extra_details),'total':len(extra_details),'details':extra_details}
 fresh_data=json.loads((ROOT/'training/fresh-instruction-probes.json').read_text(encoding='utf8'))
 fresh_details=[{'task':x['id'],'prompt':x['prompt'],'expected':target_by_id[x['id']],'generated':generate(best,x['prompt'])} for x in fresh_data]
 for x in fresh_details:x['exact_match']=x['generated']==x['expected']
 fresh={'exact':sum(x['exact_match'] for x in fresh_details),'total':len(fresh_details),'details':fresh_details}
 print('chosen',beststep,'held-out paraphrases',test['exact'],'/',test['total'],'extra probes',extra['exact'],'/',extra['total'],'novel tasks',novel['exact'],'/',novel['total'],flush=True)
 meta={'model':'jarvis-instruction-code-mlp-v1','type':'conditional character MLP from scratch; trained to generate JavaScript conditioned on Korean requests','parameters':sum(v.size for v in best.values()),'ctx':CTX,'dim':DIM,'hidden':H,'features':Q,'seed':SEED,'pretrain_steps':a.pretrain_steps,'code_files':code_files,'code_source':corpus['source'],'code_revision':corpus['revision'],'code_license':corpus['license'],'code_test_windows':len(test_indices),'code_initial_loss':before_code,'code_pretrained_loss':after_pretrain,'code_post_instruction_loss':code_loss(best,corpus_data['test'],test_indices),'train_steps':a.steps,'chosen_step':beststep,'batch':a.batch,'train_tasks':len(DATA['tasks']),'train_prompts':sum(len(t['train']) for t in DATA['tasks']),'validation_exact':validation['exact'],'validation_total':validation['total'],'test_before_exact':before['exact'],'test_exact':test['exact'],'test_total':test['total'],'extra_exact':extra['exact'],'extra_total':extra['total'],'fresh_exact':fresh['exact'],'fresh_total':fresh['total'],'novel_exact':novel['exact'],'novel_total':novel['total'],'evaluation':'Exact string match on new phrasings of seen program tasks; novel tasks held out entirely; not general coding accuracy.'}
 (ROOT/'instruction-weights.json').write_text(json.dumps({'schema':1,'vocab':VOCAB,'metadata':meta,'weights':encode(best)},separators=(',',':')),encoding='utf8')
 (ROOT/'training/instruction-evaluation.json').write_text(json.dumps({'metadata':meta,'validation':validation,'test':test,'extra':extra,'fresh':fresh,'novel':novel},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('Saved',meta['parameters'],'parameters; elapsed',round(time.time()-t0,1),'seconds',flush=True)
if __name__=='__main__':main()
