'''Build a labeled reference index from locally cloned pinned upstream repositories.
No AI training or theorem verification occurs. Retains original excerpts and attribution.
'''
from pathlib import Path
import collections,json,random,re,xml.etree.ElementTree as ET,hashlib
M=Path('/tmp/jarvis-mathlib'); T=Path('/tmp/jarvis-theoria'); P=Path('/tmp/jarvis-physics3')
quotas={'Topology':1200,'Geometry':900,'Analysis':1600,'LinearAlgebra':1100,'NumberTheory':900,'MeasureTheory':1000,'Probability':800,'Algebra':1400,'Combinatorics':978}
ko={'Topology':'위상수학','Geometry':'기하학','Analysis':'해석학','LinearAlgebra':'선형대수','NumberTheory':'정수론','MeasureTheory':'측도론','Probability':'확률론','Algebra':'대수학','Combinatorics':'조합론'}
rev_math='00ff07c42f6b7c240f3c00110203c8bcd93b39af'
rev_theory='ea64e6b7a363ed138562383e783507858ef7c9be'
rev_book='6de0ec7da7ffa90e1972946d896d1c5507d3799a'
rng=random.Random(20261118)
rx=re.compile(r'^\s*(?:(?:private|protected|noncomputable)\s+)*(theorem|lemma|def)\s+([^\s:(\[{]+)')

def without_comments(lines):
 depth=0;out=[]
 for line in lines:
  s=[];i=0;quoted=False
  while i<len(line):
   pair=line[i:i+2]
   if depth:
    if pair=='/-':depth+=1;i+=2
    elif pair=='-/':depth-=1;i+=2
    else:i+=1
   elif not quoted and pair=='--':break
   elif not quoted and pair=='/-':depth=1;i+=2
   else:
    if line[i]=='"' and (i==0 or line[i-1]!='\\'):quoted=not quoted
    s.append(line[i]);i+=1
  out.append(''.join(s))
 return out
records=[]
for category,count in quotas.items():
 candidates=[]
 for file in sorted((M/'Mathlib'/category).rglob('*.lean')):
  lines=file.read_text(encoding='utf8').splitlines(); clean=without_comments(lines)
  for i,line in enumerate(clean):
   m=rx.match(line)
   if not m:continue
   excerpt='\n'.join(lines[i:min(i+4,len(lines))])[:800]
   candidates.append({'kind':'mathlib','field':ko[category],'title':m.group(2),'subtype':m.group(1),'excerpt':excerpt,'path':file.relative_to(M).as_posix(),'line':i+1})
 if len(candidates)<count:raise RuntimeError(f'{category}: {len(candidates)} < {count}')
 chosen=rng.sample(candidates,count);chosen.sort(key=lambda x:(x['path'],x['line']));records.extend(chosen)
 print(category,'available',len(candidates),'selected',len(chosen),flush=True)
for file in sorted((T/'entries').glob('*.json')):
 d=json.loads(file.read_text(encoding='utf8'))
 eqs='\n'.join(e.get('equation_title','')+': '+e.get('equation','') for e in d.get('result_equations',[]))
 steps='\n'.join(str(x.get('step',''))+'. '+x.get('description','')+'\n'+x.get('equation','') for x in d.get('derivation',[]))
 people=', '.join(x.get('full_name','') for x in d.get('contributors',[]) if x.get('full_name'))
 text='설명: '+d.get('explanation','')+'\n\n방정식:\n'+eqs+'\n\n유도 단계:\n'+steps
 records.append({'kind':'theoria','field':'이론물리학','title':d.get('result_name',file.stem),'excerpt':text,'path':file.relative_to(T).as_posix(),'contributors':people})

def clean_element(e):
 if e.tag.startswith('{http://www.w3.org/1998/Math/MathML}'):
  return '[수식은 원문 참조]'+(e.tail or '')
 out=e.text or ''
 for child in e:out+=clean_element(child)
 return out+(e.tail or '')
for file in sorted((P/'modules').rglob('*.cnxml')):
 root=ET.parse(file).getroot();ns={'c':'http://cnx.rice.edu/cnxml'}
 title=root.findtext('c:title',default=file.parent.name,namespaces=ns)
 content=root.find('c:content',ns)
 paras=[]
 if content is not None:
  for e in content.iter('{http://cnx.rice.edu/cnxml}para'):
   text=' '.join(clean_element(e).split())
   if len(text)>70:paras.append(text)
   if len(paras)>=5:break
 excerpt='\n\n'.join(paras)
 if not excerpt:excerpt='이 단원의 텍스트 발췌를 추출하지 못했습니다. 원문을 참고하세요.'
 records.append({'kind':'openstax','field':'현대 물리학','title':title,'excerpt':excerpt,'path':file.relative_to(P).as_posix()})
for i,r in enumerate(records,1):r['id']=i
assert len(records)==10000, len(records)
out={'schema':1,'counts':dict(collections.Counter(x['kind'] for x in records)), 'sources':{
 'mathlib':{'name':'mathlib4','url':'https://github.com/leanprover-community/mathlib4','revision':rev_math,'license':'Apache-2.0','licenseFile':'third-party/mathlib4-APACHE-2.0.txt','noticeFile':'third-party/mathlib4-notices.txt'},
 'theoria':{'name':'TheorIA Dataset','url':'https://github.com/theoria-dataset/theoria-dataset','revision':rev_theory,'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','credit':'TheorIA Dataset, 2026; see each entry for contributors'},
 'openstax':{'name':'University Physics Volume 3','authors':'Samuel J. Ling, Jeff Sanny, William Moebs; OpenStax, Rice University','url':'https://github.com/cnx-user-books/cnxbook-university-physics-volume-3','revision':rev_book,'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','licenseFile':'third-party/openstax-CC-BY-4.0.txt','credit':'Access for free at https://openstax.org'},
 },'records':records}
path=Path('science-corpus.json');path.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf8')
print('TOTAL',len(records),'types',out['counts'],'bytes',path.stat().st_size,'sha256',hashlib.sha256(path.read_bytes()).hexdigest(),flush=True)
