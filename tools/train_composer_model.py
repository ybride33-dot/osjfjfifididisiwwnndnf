#!/usr/bin/env python3
"""Train a tiny multi-head neural semantic parser, no pretrained/external model.
Fixed synthetic data: split on whole (sign, parity, map, reducer) combinations.
Model predicts four bounded operations; JS code emitted by the existing engine.
"""
import argparse,hashlib,json,math,pathlib,random,time
import numpy as np
ROOT=pathlib.Path(__file__).resolve().parent.parent
SEED=73319;FEATURES=512;H=96
SIGNS=['none','positive','negative','nonzero'];PARITIES=['none','even','odd'];MAPS=['identity','square','abs','double','negate'];REDUCERS=['sum','count','product','max','min','array','sort','unique','prefix','mean','median','mode','maxsub'];HEADS=[len(SIGNS),len(PARITIES),len(MAPS),len(REDUCERS)];N=sum(HEADS)
SOURCES=['정수 배열에서','배열 속','숫자 리스트에서','수 목록에서','배열에 있는','주어진 숫자 배열에서']
SIGN=[['','모든','모든','전체','','모든'],['양수인','양의','0보다 큰','양수에 해당하는','0 초과인','양수'],['음수인','음의','0보다 작은','음수에 해당하는','0 미만인','음수'],['0이 아닌','영이 아닌','0과 다른','0이 아닌','영이 아닌','0이 아닌']]
PARITY=[['원소를','값을','숫자를','수들을','항목을','원소들을'],['짝수 원소를','짝수인 값을','짝수 숫자를','짝수 수들을','짝수인 항목을','짝수 원소들을'],['홀수 원소를','홀수인 값을','홀수 숫자를','홀수 수들을','홀수인 항목을','홀수 원소들을']]
MAP=[['그대로 두고','변환 없이','그냥','원래대로 두고','바꾸지 말고','원래 값을 사용해서'],['제곱한 뒤','각각 제곱해서','제곱으로 바꾸고','각 수를 제곱하고','제곱해서','제곱하여'],['절댓값으로 바꾼 뒤','절대값으로 변환하고','각각 절댓값을 구해서','절대값을 취하고','절댓값으로','절대값을 계산해서'],['두 배로 만든 뒤','2배로 바꾸고','각각 두 배 해서','2를 곱하고','두 배로 변환하고','두 배하여'],['부호를 반대로 바꾼 뒤','부호 반전하고','각 숫자에 마이너스를 붙이고','부호를 뒤집고','부호를 반대로 해서','부호를 뒤집어서']]
REDUCE=[['합계를 구해 줘','전부 더해 줘','합을 반환해','합산하는 함수를 만들어','더한 결과를 돌려줘','합계를 반환해줘'],['개수를 구해 줘','몇 개인지 세어 줘','개수를 반환해','갯수 계산 함수를 만들어','몇 개인지 반환해','개수를 돌려줘'],['곱을 구해 줘','전부 곱해 줘','곱을 반환해','곱셈 함수를 만들어','곱한 결과를 돌려줘','곱을 계산해줘'],['최댓값을 구해 줘','최대값을 찾아 줘','가장 큰 값을 반환해','가장 큰 수를 돌려줘','최대값을 반환해','가장 큰 값을 찾아줘'],['최솟값을 구해 줘','최소값을 찾아 줘','가장 작은 값을 반환해','가장 작은 수를 돌려줘','최소값을 반환해','가장 작은 값을 찾아줘'],['배열을 반환해 줘','목록으로 돌려줘','배열 결과를 반환해','리스트로 만들어 줘','그 결과를 배열로 반환해','결과 목록을 돌려줘'],['오름차순으로 정렬해 줘','작은 순서로 정렬해 줘','오름차순 정렬해서 반환해','정렬된 배열을 만들어 줘','작은 값부터 정렬해','오름차순으로 정렬해 반환해'],['중복을 제거해 줘','중복을 없애서 반환해','중복 없이 배열로 반환해','같은 값을 제거한 목록을 만들어','중복값을 제거해 반환해','중복을 빼고 배열로 돌려줘'],['누적합을 구해 줘','순서대로 누적한 합을 반환해','누적 합계 배열을 반환해','각 위치까지의 누적합을 만들어','누적 합을 반환해','순차 누적합 배열을 돌려줘'],['평균을 구해 줘','평균값을 계산해 줘','평균을 반환해','산술 평균을 구하는 함수를 만들어','평균값을 반환해','평균을 계산해 반환해'],['중앙값을 구해 줘','중앙값을 계산해 줘','중간값을 반환해','중앙값을 구하는 함수를 만들어','중간값을 계산해','중앙값을 계산해 반환해'],['최빈값을 구해 줘','가장 자주 나온 수를 찾아 줘','최빈값을 반환해','가장 많이 등장한 값을 구해','최빈값을 계산해','가장 빈번한 값을 반환해'],['최대 구간 합을 구해 줘','연속 부분 배열의 최대 합을 찾아 줘','최대 연속 구간 합을 반환해','연속 구간의 최대 합을 구해','최대 부분배열 합을 계산해','최대 연속 합을 반환해']]

def split(combo):
 data='jarvis-composition-v1:'+','.join(str(x) for x in combo);n=int.from_bytes(hashlib.sha256(data.encode()).digest()[:4],'big')%10
 return 'test' if n==0 else 'validation' if n==1 else 'train'
def make_prompt(combo,style,r):
 a,b,c,d=combo
 # Each component phrase can occur in training. Full operation combinations are disjoint.
 if style=='train':pick=lambda xs:r.choice(xs);source=r.choice(SOURCES)
 elif style=='validation':pick=lambda xs:xs[4];source=SOURCES[4]
 else:pick=lambda xs:xs[5];source=SOURCES[5]
 return ' '.join(x for x in [source,pick(SIGN[a]),pick(PARITY[b]),pick(MAP[c]),pick(REDUCE[d])] if x)
def examples():
 r=random.Random(SEED);out={'train':[],'validation':[],'test':[]};combos={k:[] for k in out}
 for a in range(len(SIGNS)):
  for b in range(len(PARITIES)):
   for c in range(len(MAPS)):
    for d in range(len(REDUCERS)):
     combo=(a,b,c,d);k=split(combo);combos[k].append(combo)
     for i in range(10 if k=='train' else 1):out[k].append((make_prompt(combo,k,r),combo))
 return out,combos

def feature(text):
 s=''.join(text.lower().split())[:240];out=np.zeros(FEATURES,dtype=np.float32);n=0
 for width in (1,2,3):
  for i in range(len(s)-width+1):
   h=2166136261
   for c in s[i:i+width]:h=((h^ord(c))*16777619)&0xffffffff
   out[h%FEATURES]+=1;n+=1
 if n:out/=math.sqrt(n)
 return out

def initialize(r):return {'W':r.normal(0,.05,(FEATURES,H)).astype('f'),'b':np.zeros(H,'f'),'O':r.normal(0,.05,(H,N)).astype('f'),'c':np.zeros(N,'f')}
def forward(p,x):
 h=np.tanh(x@p['W']+p['b']);logits=h@p['O']+p['c'];probs=[];offset=0
 for n in HEADS:
  z=logits[:,offset:offset+n];z=z-z.max(1,keepdims=True);ex=np.exp(z);probs.append(ex/ex.sum(1,keepdims=True));offset+=n
 return h,probs

def gradient(p,x,y):
 h,probs=forward(p,x);n=len(x);zs=[];loss=0
 for k,v in enumerate(probs):
  loss+=float(-np.log(np.maximum(v[np.arange(n),y[:,k]],1e-30)).mean());dz=v.copy();dz[np.arange(n),y[:,k]]-=1;zs.append(dz/n)
 dz=np.concatenate(zs,axis=1);dh=(dz@p['O'].T)*(1-h*h)
 return loss,{'W':x.T@dh,'b':dh.sum(0),'O':h.T@dz,'c':dz.sum(0)}
def evaluate(p,ex):
 x=np.array([feature(q) for q,_ in ex],dtype='f');y=np.array([c for _,c in ex]);_,probs=forward(p,x);pred=np.stack([z.argmax(1) for z in probs],axis=1);mins=np.stack([z.max(1) for z in probs],axis=1).min(1);correct=(pred==y).all(1)
 return {'exact':int(correct.sum()),'total':len(ex),'head_correct':[int((pred[:,i]==y[:,i]).sum()) for i in range(4)],'min_probability':mins,'correct':correct,'pred':pred}
def pack(p):return {k:{'shape':list(x.shape),'data':np.round(x.astype('float64'),7).reshape(-1).tolist()} for k,x in p.items()}

def main():
 arg=argparse.ArgumentParser();arg.add_argument('--steps',type=int,default=4000);arg.add_argument('--batch',type=int,default=128);a=arg.parse_args();assert 1<=a.steps<=50000 and 1<=a.batch<=512
 ex,combos=examples();print('combinations', {k:len(v) for k,v in combos.items()},'questions',{k:len(v) for k,v in ex.items()},flush=True)
 x=np.array([feature(q) for q,_ in ex['train']],dtype='f');y=np.array([c for _,c in ex['train']]);rng=np.random.default_rng(SEED);p=initialize(rng);m={k:np.zeros_like(v) for k,v in p.items()};v={k:np.zeros_like(t) for k,t in p.items()};initial=evaluate(p,ex['test']);t0=time.time();best=None;bestval=-1;beststep=0
 for step in range(1,a.steps+1):
  ix=rng.integers(len(x),size=a.batch);loss,g=gradient(p,x[ix],y[ix])
  for k in p:
   m[k]=.9*m[k]+.1*g[k];v[k]=.999*v[k]+.001*g[k]*g[k];p[k]-=.002*(m[k]/(1-.9**step))/(np.sqrt(v[k]/(1-.999**step))+1e-8)
  if step%500==0 or step==a.steps:
   val=evaluate(p,ex['validation']);print('step',step,'loss',round(loss,3),'validation',val['exact'],'/',val['total'],'seconds',round(time.time()-t0,1),flush=True)
   if val['exact']>bestval:best={k:v.copy() for k,v in p.items()};bestval=val['exact'];beststep=step
 val=evaluate(best,ex['validation']);test=evaluate(best,ex['test'])
 def simple(r):return {k:r[k] for k in ['exact','total','head_correct']}
 meta={'model':'jarvis-composer-v1','architecture':'neural network, four independent categorical heads for structured numeric-array programs; fixed renderer, not an open-ended language model','features':FEATURES,'hidden':H,'heads':HEADS,'parameters':sum(x.size for x in p.values()),'seed':SEED,'steps':a.steps,'best_step':beststep,'batch':a.batch,'train_combinations':len(combos['train']),'validation_combinations':len(combos['validation']),'test_combinations':len(combos['test']),'train_examples':len(ex['train']),'test_before':simple(initial),'validation_after':simple(val),'test_after':simple(test),'split':'sha256 on full operation combination; whole combination held out; component phrases and individual operations also appear in training; same synthetic pattern templates'}
 (ROOT/'composer-weights.json').write_text(json.dumps({'schema':1,'metadata':meta,'weights':pack(best)},separators=(',',':')),encoding='utf8')
 report={'metadata':meta,'held_out':[{'prompt':q,'expected':list(label),'predicted':test['pred'][i].tolist(),'minimum_head_probability':round(float(test['min_probability'][i]),5),'match':bool(test['correct'][i])} for i,(q,label) in enumerate(ex['test'])]}
 (ROOT/'training/composer-evaluation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('best',beststep,'test',test['exact'],'/',test['total'],'initial',initial['exact'],'/',initial['total'],'elapsed',round(time.time()-t0,1),flush=True)
if __name__=='__main__':main()
