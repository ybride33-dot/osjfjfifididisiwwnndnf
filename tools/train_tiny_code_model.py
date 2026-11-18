#!/usr/bin/env python3
"""Train an original tiny character-level MLP on the pinned MIT JS corpus.
No pretrained weights or external model. NumPy CPU implementation of backprop/Adam.
Split by algorithm directory, deduplicate full files, hold test group out of training.
Example: OPENBLAS_NUM_THREADS=1 python3 tools/train_tiny_code_model.py --steps 4000
"""
import argparse, hashlib, json, math, pathlib, sys, time
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent.parent
VOCAB='\n\t'+''.join(chr(i) for i in range(32,127))
CTX=16; DIM=12; HID=128; V=len(VOCAB); SEED=442021
MAP={c:i for i,c in enumerate(VOCAB)}

def group_name(path):
 p=path.split('/')
 if len(p)>=4 and p[0]=='src' and p[1]=='algorithms':return '/'.join(p[:4])
 if len(p)>=3 and p[0]=='src' and p[1]=='data-structures':return '/'.join(p[:3])
 return '/'.join(p[:-1])
def split_name(group):
 n=int.from_bytes(hashlib.sha256(('jarvis-code-split-v1:'+group).encode()).digest()[:4],'big')%10
 return 'test' if n==0 else ('val' if n==1 else 'train')
def prep(corpus):
 groups={};records={k:[] for k in ['train','val','test']}; seen=set();dropped=[]
 for f in corpus['files']:
  if f['kind']!='code':continue
  text=f['text'];h=hashlib.sha256(text.encode()).hexdigest()
  if h in seen:dropped.append(f['path']);continue
  seen.add(h);group=group_name(f['path']);split=split_name(group)
  if group in groups and groups[group]!=split:raise ValueError('group split conflict')
  groups[group]=split
  a=np.fromiter((MAP.get(c,MAP['?']) for c in text),dtype=np.uint8,count=len(text))
  if len(a)>CTX:records[split].append((f['path'],group,h,a))
 return records,groups,dropped

def windows(records):
 out=[]
 for _,_,_,a in records:out.append(np.lib.stride_tricks.sliding_window_view(a,CTX+1))
 if not out:raise ValueError('empty split')
 return np.concatenate(out,axis=0)

def init(rng):
 return dict(E=(rng.normal(0,.12,(V,DIM))).astype(np.float32),
  W1=(rng.normal(0,1/math.sqrt(CTX*DIM),(CTX*DIM,HID))).astype(np.float32),b1=np.zeros(HID,np.float32),
  W2=(rng.normal(0,1/math.sqrt(HID),(HID,V))).astype(np.float32),b2=np.zeros(V,np.float32))

def forward(p,x):
 emb=p['E'][x].reshape(len(x),CTX*DIM); h=np.tanh(emb@p['W1']+p['b1']); logits=h@p['W2']+p['b2']; logits-=logits.max(axis=1,keepdims=True)
 probs=np.exp(logits);probs/=probs.sum(axis=1,keepdims=True);return emb,h,probs

def grad(p,x,y):
 emb,h,prob=forward(p,x); n=len(x);loss=-np.log(np.maximum(prob[np.arange(n),y],1e-30)).mean();acc=(prob.argmax(1)==y).mean()
 dz=prob.copy();dz[np.arange(n),y]-=1;dz/=n
 dW2=h.T@dz;db2=dz.sum(0);dh=(dz@p['W2'].T)*(1-h*h);dW1=emb.T@dh;db1=dh.sum(0)
 demb=(dh@p['W1'].T).reshape(n,CTX,DIM);dE=np.zeros_like(p['E']);np.add.at(dE,x.reshape(-1),demb.reshape(-1,DIM))
 return float(loss),float(acc),dict(E=dE,W1=dW1,b1=db1,W2=dW2,b2=db2)

def evaluate(p,data,idx):
 loss=0.;correct=0;n=0;non_correct=0;non_count=0
 for start in range(0,len(idx),512):
  rows=data[idx[start:start+512]];_,_,prob=forward(p,rows[:,:CTX]);y=rows[:,CTX];m=len(y)
  loss+=float(-np.log(np.maximum(prob[np.arange(m),y],1e-30)).sum());pred=prob.argmax(1);correct+=int((pred==y).sum());mask=~np.isin(y,[MAP[' '],MAP['\n'],MAP['\t']]);non_correct+=int(((pred==y)&mask).sum());non_count+=int(mask.sum());n+=m
 return {'loss_nats':round(loss/n,6),'perplexity':round(math.exp(loss/n),4),'next_char_accuracy':round(correct/n,6),'non_whitespace_accuracy':round(non_correct/non_count,6) if non_count else None,'non_whitespace_windows':non_count,'windows':n}

def baseline_metrics(train,test,idx):
 rows=test[idx];y=rows[:,-1];counts=np.bincount(train[:,-1],minlength=V);top=int(counts.argmax());pair=np.zeros((V,V),dtype=np.int64);np.add.at(pair,(train[:,-2],train[:,-1]),1);pred=pair.argmax(axis=1)[rows[:,-2]]
 return {'majority_character':VOCAB[top],'majority_accuracy':round(float((y==top).mean()),6),'one_previous_character_accuracy':round(float((pred==y).mean()),6)}

def encode(p):
 return {k:{'shape':list(v.shape),'data':np.round(v.astype(np.float64),7).reshape(-1).tolist()} for k,v in p.items()}
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--steps',type=int,default=4000);ap.add_argument('--batch',type=int,default=128);ap.add_argument('--output',default='coding-weights.json');args=ap.parse_args()
 if args.steps<1 or args.steps>50000 or args.batch<1 or args.batch>512:raise ValueError('invalid training config')
 corpus=json.loads((ROOT/'code-corpus.json').read_text());assert corpus['license']=='MIT'
 records,groups,dropped=prep(corpus);data={k:windows(v) for k,v in records.items()}
 print('Data:',{k:{'files':len(records[k]),'groups':sum(1 for x in groups.values() if x==k),'windows':len(data[k])} for k in data},'duplicates excluded',len(dropped),flush=True)
 rng=np.random.default_rng(SEED);p=init(rng);evalrng=np.random.default_rng(SEED+1)
 vi=evalrng.choice(len(data['val']),size=min(12000,len(data['val'])),replace=False);ti=evalrng.choice(len(data['test']),size=min(16000,len(data['test'])),replace=False)
 initial_val=evaluate(p,data['val'],vi);initial_test=evaluate(p,data['test'],ti);print('Initial validation:',initial_val,flush=True);print('Initial test:',initial_test,flush=True)
 m={k:np.zeros_like(v) for k,v in p.items()};v={k:np.zeros_like(a) for k,a in p.items()};t0=time.time();lr=.002
 for step in range(1,args.steps+1):
  idx=rng.integers(0,len(data['train']),size=args.batch);rows=data['train'][idx];loss,acc,g=grad(p,rows[:,:CTX],rows[:,CTX])
  for k in p:
   m[k]=.9*m[k]+.1*g[k];v[k]=.999*v[k]+.001*g[k]*g[k]
   p[k]-=lr*(m[k]/(1-.9**step))/(np.sqrt(v[k]/(1-.999**step))+1e-8)
  if step%500==0 or step==args.steps:
   ev=evaluate(p,data['val'],vi);print(f'step {step}/{args.steps} train_loss {loss:.4f} val_loss {ev["loss_nats"]:.4f} val_accuracy {ev["next_char_accuracy"]:.4f} seconds {time.time()-t0:.1f}',flush=True)
 final_val=evaluate(p,data['val'],vi);final_test=evaluate(p,data['test'],ti)
 metadata={'model':'jarvis-tiny-code-mlp-v1','training':'from scratch; CPU NumPy backprop and Adam; next character prediction','context':CTX,'embedding_dim':DIM,'hidden_dim':HID,'parameter_count':sum(a.size for a in p.values()),'steps':args.steps,'batch':args.batch,'seed':SEED,'source':corpus['source'],'revision':corpus['revision'],'license':'MIT','license_file':corpus['licenseFile'],'split_method':'sha256 algorithm-directory group; no identical full files in more than one split','split_stats':{k:{'files':len(records[k]),'groups':sum(1 for x in groups.values() if x==k),'windows':len(data[k])} for k in data},'duplicate_files_excluded':len(dropped),'validation_before':initial_val,'validation_after':final_val,'test_before':initial_test,'test_after':final_test,'test_baselines':baseline_metrics(data['train'],data['test'],ti),'limits':'97-character alphabet, previous 16 characters only; code completion, not general coding or guaranteed executable code'}
 (ROOT/args.output).write_text(json.dumps({'schema':1,'vocab':VOCAB,'metadata':metadata,'weights':encode(p)},separators=(',',':')),encoding='utf-8')
 report={'metadata':metadata,'files':{k:[{'path':p,'group':g,'sha256':h} for p,g,h,_ in records[k]] for k in records},'excluded_duplicate_paths':dropped}
 (ROOT/'tools/tiny-code-training-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print('Final validation:',final_val,flush=True);print('Final held-out test:',final_test,flush=True);print('Saved model',args.output,'parameters',metadata['parameter_count'],'elapsed',round(time.time()-t0,1),'s',flush=True)
if __name__=='__main__':main()
