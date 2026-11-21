/* OP 오프라인 여행 도구. 외부 라이브러리와 사용자 코드 실행 없이 동작한다. */
(function(root){
'use strict';
const KEY='jvs-op-tools-v1',DAY=86400000,MAX_HOURS=168,MAX_ITEMS=30,MAX_MEMO=10000;
const CITIES=[['서울','Asia/Seoul'],['도쿄','Asia/Tokyo'],['베이징','Asia/Shanghai'],['싱가포르','Asia/Singapore'],['두바이','Asia/Dubai'],['런던','Europe/London'],['파리','Europe/Paris'],['뉴욕','America/New_York'],['로스앤젤레스','America/Los_Angeles'],['시드니','Australia/Sydney'],['UTC','UTC']];
function initial(){return {schema:1,city:'Asia/Tokyo',flightEnd:null,stopElapsed:0,stopStart:null,timerEnd:null,timerRemaining:null,timerDone:false,note:'',items:[],rate:''};}
function validDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const y=Number(s.slice(0,4)),m=Number(s.slice(5,7)),d=Number(s.slice(8,10));if(y<1||m<1||m>12||d<1)return false;
 const leap=y%4===0&&(y%100!==0||y%400===0);return d<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][m-1];}
function localDay(ms){const d=new Date(ms);return String(d.getFullYear()).padStart(4,'0')+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function clean(v){
 const o=initial();if(!v||typeof v!=='object'||v.schema!==1)return o;
 if(CITIES.some(x=>x[1]===v.city))o.city=v.city;
 for(const k of ['flightEnd','stopStart','timerEnd'])if(Number.isSafeInteger(v[k])&&v[k]>0&&v[k]<8640000000000000)o[k]=v[k];
 for(const k of ['stopElapsed','timerRemaining'])if(Number.isFinite(v[k])&&v[k]>=0&&v[k]<=MAX_HOURS*3600000)o[k]=v[k];
 o.timerDone=v.timerDone===true;o.note=typeof v.note==='string'?v.note.slice(0,MAX_MEMO):'';
 if(Array.isArray(v.items))o.items=v.items.slice(0,MAX_ITEMS).filter(x=>x&&typeof x.text==='string'&&x.text.trim()).map(x=>({text:x.text.slice(0,120),checked:x.checked===true,...(validDate(x.date)?{date:x.date}:{})}));
 if(typeof v.rate==='string'&&v.rate.length<=24)o.rate=v.rate;return o;
}
function getState(storage){try{const raw=storage.getItem(KEY);return clean(raw?JSON.parse(raw):null);}catch(e){return initial();}}
function formatDuration(ms){const s=Math.floor(Math.max(0,Number(ms)||0)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60),sec=s%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');}
function timeFor(zone,date){try{return new Intl.DateTimeFormat('ko-KR',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(date);}catch(e){return '시간대를 사용할 수 없음';}}
function parseDuration(h,m,s){
 const p=[h,m,s].map(x=>String(x).trim());if(p.some(x=>x&&!/^\d{1,3}$/.test(x)))return null;const [hours,mins,secs]=p.map(x=>x?Number(x):0);if(hours>MAX_HOURS||mins>59||secs>59)return null;const ms=(hours*3600+mins*60+secs)*1000;return ms>0&&ms<=MAX_HOURS*3600000?ms:null;
}
function convert(kind,input,rate){
 if(String(input).trim()==='')return null;const n=Number(input);if(!Number.isFinite(n)||Math.abs(n)>1e12)return null;let out;
 switch(kind){case 'c-f':out=n*9/5+32;break;case 'f-c':out=(n-32)*5/9;break;case 'km-mi':out=n/1.609344;break;case 'mi-km':out=n*1.609344;break;case 'kg-lb':out=n*2.20462262185;break;case 'lb-kg':out=n/2.20462262185;break;case 'krw-usd':case 'usd-krw':{if(String(rate).trim()==='')return null;const r=Number(rate);if(!Number.isFinite(r)||r<=0||r>1e12)return null;out=kind==='krw-usd'?n/r:n*r;break;}default:return null;}
 return Number.isFinite(out)?Number(out.toPrecision(12)):null;
}
function mount(el,options){
 const storage=options.storage,now=options.now||Date.now,evaluate=options.evaluate,doc=el.ownerDocument;let state=getState(storage),disposed=false,storageOkay=true,audio=null;
 const $=s=>el.querySelector(s),save=()=>{try{storage.setItem(KEY,JSON.stringify(state));storageOkay=true;$('#opToolsSave').textContent='기기에 자동 저장됨';}catch(e){storageOkay=false;$('#opToolsSave').textContent='저장 실패 · 지금 열린 화면에서만 유지';}};
 const choices=CITIES.map(([name,zone])=>`<option value="${zone}">${name}</option>`).join('');
 const wrap=doc.createElement('section');wrap.id='opTools';wrap.innerHTML=`
 <div class="opt-heading"><div><div class="opt-overline">OFFLINE TOOLS / 05</div><h2>여행 도구</h2></div><span>기기에서 작동</span></div>
 <div class="opt-tiles">
 <section class="opt-panel"><div class="opt-head"><b>◷ 세계 시계</b><span>WORLD CLOCK</span></div><label for="optCity">목적지 도시</label><select id="optCity">${choices}</select><div class="opt-digital" id="optWorld">--</div><p>기기 시각 기준 · 서머타임 자동 적용 · 위치 자동 감지 아님</p></section>
 <section class="opt-panel"><div class="opt-head"><b>✈ 비행 카운트다운</b><span>FLIGHT TIMER</span></div><div class="opt-digital" id="optFlight">--:--:--</div><div class="opt-input-row"><label>시간<input id="optFlightH" type="number" inputmode="numeric" min="0" max="168" placeholder="시간"></label><label>분<input id="optFlightM" type="number" inputmode="numeric" min="0" max="59" placeholder="분"></label></div><div class="opt-actions"><button id="optFlightStart">시작</button><button id="optFlightClear" class="opt-ghost">초기화</button></div><p id="optFlightStatus">남은 시간을 직접 입력해 주세요.</p><p>일정 변경은 자동 반영되지 않아요.</p></section>
 <section class="opt-panel"><div class="opt-head"><b>◴ 스톱워치</b><span>STOPWATCH</span></div><div class="opt-digital" id="optStopwatch">00:00:00</div><div class="opt-actions"><button id="optStopStart">시작</button><button id="optStopPause" class="opt-ghost">일시정지</button><button id="optStopReset" class="opt-ghost">초기화</button></div></section>
 <section class="opt-panel"><div class="opt-head"><b>◈ 타이머</b><span>TIMER</span></div><div class="opt-digital" id="optTimer">00:00:00</div><div class="opt-input-row"><label>시간<input id="optTimerH" type="number" inputmode="numeric" min="0" max="168" placeholder="시간"></label><label>분<input id="optTimerM" type="number" inputmode="numeric" min="0" max="59" placeholder="분"></label><label>초<input id="optTimerS" type="number" inputmode="numeric" min="0" max="59" placeholder="초"></label></div><div class="opt-actions"><button id="optTimerStart">시작</button><button id="optTimerPause" class="opt-ghost">일시정지</button><button id="optTimerReset" class="opt-ghost">초기화</button></div><p id="optTimerStatus">시간 입력 후 시작 · 끝나면 화면에 표시</p><p>OP가 열린 동안 종료 시 소리를 시도합니다. 소리·백그라운드 알림은 보장되지 않아요.</p></section>
 <section class="opt-panel opt-wide"><div class="opt-head"><b>✎ 여행 메모</b><span>LOCAL NOTES</span></div><label for="optNote">주소, 계획, 메모</label><textarea id="optNote" maxlength="10000" rows="4" placeholder="오프라인에서 볼 내용을 적어두세요"></textarea><p>입력하면 이 기기에 저장 · 전체 백업에 포함</p><div class="opt-head opt-subhead"><b>📅 여행 플래너 · 체크리스트</b><span>최대 30개</span></div><div class="opt-add"><input id="optItem" maxlength="120" aria-label="할 일" placeholder="준비물 또는 할 일"><button id="optAdd">추가</button></div><label for="optItemDate">날짜 (선택)</label><input id="optItemDate" type="date"><div class="opt-plan-summary" id="optPlanSummary" aria-live="polite"></div><label for="optPlanFilter">목록 보기</label><select id="optPlanFilter"><option value="all">전체</option><option value="today">오늘</option><option value="pending">미완료</option><option value="done">완료</option></select><ul id="optList" aria-label="여행 체크리스트"></ul><p>오늘은 기기 날짜 기준 · 알림은 보내지 않아요.</p></section>
 <section class="opt-panel"><div class="opt-head"><b>＋ 계산기</b><span>CALCULATOR</span></div><label for="optCalc">수식</label><input id="optCalc" inputmode="decimal" maxlength="100" placeholder="예: (12+3)*4"><button id="optCalcGo">계산</button><output id="optCalcResult" class="opt-result" aria-live="polite">—</output><p>+, -, ×, ÷, 괄호 등 · 인터넷 불필요</p></section>
 <section class="opt-panel"><div class="opt-head"><b>⇄ 단위·환율 변환</b><span>CONVERTER</span></div><label for="optConvertType">변환 종류</label><select id="optConvertType"><option value="c-f">℃ → ℉</option><option value="f-c">℉ → ℃</option><option value="km-mi">km → mile</option><option value="mi-km">mile → km</option><option value="kg-lb">kg → lb</option><option value="lb-kg">lb → kg</option><option value="krw-usd">원 → 달러</option><option value="usd-krw">달러 → 원</option></select><label for="optConvertValue">변환할 숫자</label><input id="optConvertValue" type="number" inputmode="decimal" placeholder="숫자 입력"><div id="optRateWrap" hidden><label for="optRate">직접 입력 환율 · 1달러당 원</label><input id="optRate" type="number" inputmode="decimal" min="0" placeholder="예: 1400"><p>입력한 환율만 사용 · 실시간 환율 아님</p></div><button id="optConvertGo">변환</button><output id="optConvertResult" class="opt-result" aria-live="polite">—</output></section>
 </div><div id="opToolsSave" class="opt-save" aria-live="polite">기기에 저장</div>`;
 el.querySelector('.op-footer').before(wrap);
 const city=$('#optCity'),note=$('#optNote'),rate=$('#optRate');city.value=state.city;note.value=state.note;rate.value=state.rate;
 function prepareAudio(){try{const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;if(!audio)audio=new Audio();if(audio.state==='suspended')Promise.resolve(audio.resume()).catch(()=>{});}catch(e){}}
 function playEndSound(){try{if(!audio||audio.state!=='running')return;const now=audio.currentTime;for(let i=0;i<2;i++){const oscillator=audio.createOscillator(),gain=audio.createGain(),at=now+i*.24;oscillator.type='sine';oscillator.frequency.value=880;gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.08,at+.02);gain.gain.exponentialRampToValueAtTime(.0001,at+.18);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(at);oscillator.stop(at+.19);}}catch(e){}}
 let editing=-1,lastDay=localDay(now());
 function drawItems(){const list=$('#optList'),filter=$('#optPlanFilter'),day=localDay(now());lastDay=day;list.textContent='';
  const completed=state.items.filter(x=>x.checked).length;$('#optPlanSummary').textContent='완료 '+completed+' / '+state.items.length+' · 남은 일 '+(state.items.length-completed);
  filter.disabled=$('#optItem').disabled=$('#optItemDate').disabled=$('#optAdd').disabled=editing>=0;let shown=0;
  state.items.forEach((item,i)=>{
   if(filter.value==='today'&&item.date!==day||filter.value==='pending'&&item.checked||filter.value==='done'&&!item.checked)return;
   shown++;const li=doc.createElement('li');li.className='opt-plan-item';
   if(editing===i){
    const title=doc.createElement('input'),date=doc.createElement('input'),buttons=doc.createElement('div'),ok=doc.createElement('button'),cancel=doc.createElement('button'),msg=doc.createElement('p');
    title.type='text';title.maxLength=120;title.value=item.text;title.setAttribute('aria-label','할 일 수정');date.type='date';date.value=item.date||'';date.setAttribute('aria-label','날짜 수정');
    buttons.className='opt-plan-actions';ok.type=cancel.type='button';ok.textContent='저장';cancel.textContent='취소';cancel.className='opt-ghost';msg.setAttribute('role','status');
    ok.addEventListener('click',()=>{const t=title.value.trim(),v=date.value;if(!t){msg.textContent='할 일을 입력해 주세요.';return;}if(v&&!validDate(v)){msg.textContent='날짜를 확인해 주세요.';return;}
     item.text=t.slice(0,120);if(v)item.date=v;else delete item.date;editing=-1;save();drawItems();});
    cancel.addEventListener('click',()=>{editing=-1;drawItems();});buttons.append(ok,cancel);li.append(title,date,buttons,msg);
   }else{
    const row=doc.createElement('div'),label=doc.createElement('label'),box=doc.createElement('input'),text=doc.createElement('span'),actions=doc.createElement('div'),edit=doc.createElement('button'),del=doc.createElement('button');
    row.className='opt-plan-row';actions.className='opt-plan-actions';box.type='checkbox';box.checked=item.checked;box.disabled=edit.disabled=del.disabled=editing>=0;box.setAttribute('aria-label',item.text+' 완료');text.textContent=item.text;
    box.addEventListener('change',()=>{item.checked=box.checked;save();drawItems();});edit.type=del.type='button';edit.textContent='수정';del.textContent='삭제';edit.className=del.className='opt-delete';
    edit.setAttribute('aria-label',item.text+' 수정');del.setAttribute('aria-label',item.text+' 삭제');edit.addEventListener('click',()=>{editing=i;drawItems();const el=$('#optList input[aria-label="할 일 수정"]');if(el)el.focus();});
    del.addEventListener('click',()=>{state.items.splice(i,1);save();drawItems();});label.append(box,text);row.append(label);actions.append(edit,del);row.append(actions);li.append(row);
    if(item.date){const when=doc.createElement('p');when.className='opt-plan-date';when.textContent=item.date+(item.date===day?' · 오늘':item.date<day&&!item.checked?' · 지남':'');li.append(when);}
   }
   list.append(li);
  });
  if(!shown){const empty=doc.createElement('li');empty.className='opt-plan-empty';empty.textContent='표시할 할 일이 없어요.';list.append(empty);}
 }
 function draw(){if(disposed)return;const n=now();if(editing<0&&localDay(n)!==lastDay)drawItems();$('#optWorld').textContent=timeFor(state.city,new Date(n));
  const flight=state.flightEnd===null?null:Math.max(0,state.flightEnd-n);$('#optFlight').textContent=flight===null?'--:--:--':formatDuration(Math.ceil(flight/1000)*1000);$('#optFlightStatus').textContent=flight===null?'남은 시간을 직접 입력해 주세요.':flight===0?'설정한 시간이 끝났어요.':'남은 시간 · 기기 시각 기준';
  const elapsed=Math.min(MAX_HOURS*3600000,state.stopElapsed+(state.stopStart===null?0:Math.max(0,n-state.stopStart)));$('#optStopwatch').textContent=formatDuration(elapsed);
  const remaining=state.timerEnd===null?state.timerRemaining:Math.max(0,state.timerEnd-n);if(state.timerEnd!==null&&remaining===0){state.timerEnd=null;state.timerRemaining=0;state.timerDone=true;save();playEndSound();}$('#optTimer').textContent=formatDuration(Math.ceil((remaining||0)/1000)*1000);$('#optTimerStatus').textContent=state.timerDone?'시간이 끝났어요.':state.timerEnd!==null?'진행 중 · 화면 확인':state.timerRemaining!==null&&state.timerRemaining>0?'일시정지됨':'시간 입력 후 시작 · 끝나면 화면에 표시';
 }
 function duration(prefix,seconds){return parseDuration($('#'+prefix+'H').value,$('#'+prefix+'M').value,seconds?$('#'+prefix+'S').value:'0');}
 city.addEventListener('change',()=>{state.city=city.value;save();draw();});note.addEventListener('input',()=>{state.note=note.value.slice(0,MAX_MEMO);save();});
 $('#optFlightStart').addEventListener('click',()=>{const ms=duration('optFlight',false);if(ms===null){$('#optFlightStatus').textContent='시간과 분을 확인해 주세요. 최대 168시간입니다.';return;}state.flightEnd=now()+ms;save();draw();});
 $('#optFlightClear').addEventListener('click',()=>{state.flightEnd=null;save();draw();});
 $('#optStopStart').addEventListener('click',()=>{if(state.stopStart===null){if(state.stopElapsed>=MAX_HOURS*3600000)state.stopElapsed=0;state.stopStart=now();save();draw();}});
 $('#optStopPause').addEventListener('click',()=>{if(state.stopStart!==null){state.stopElapsed=Math.min(MAX_HOURS*3600000,state.stopElapsed+Math.max(0,now()-state.stopStart));state.stopStart=null;save();draw();}});
 $('#optStopReset').addEventListener('click',()=>{state.stopStart=null;state.stopElapsed=0;save();draw();});
 $('#optTimerStart').addEventListener('click',()=>{if(state.timerEnd!==null)return;const ms=state.timerRemaining!==null&&state.timerRemaining>0?state.timerRemaining:duration('optTimer',true);if(ms===null){$('#optTimerStatus').textContent='시간을 확인해 주세요. 최대 168시간입니다.';return;}prepareAudio();state.timerEnd=now()+ms;state.timerRemaining=null;state.timerDone=false;save();draw();});
 $('#optTimerPause').addEventListener('click',()=>{if(state.timerEnd!==null){state.timerRemaining=Math.max(0,state.timerEnd-now());state.timerEnd=null;state.timerDone=state.timerRemaining===0;save();draw();}});
 $('#optTimerReset').addEventListener('click',()=>{state.timerEnd=null;state.timerRemaining=null;state.timerDone=false;save();draw();});
 const add=()=>{const input=$('#optItem'),date=$('#optItemDate'),text=input.value.trim(),day=date.value;if(!text)return;if(day&&!validDate(day)){$('#opToolsSave').textContent='날짜를 확인해 주세요.';return;}if(state.items.length>=MAX_ITEMS){$('#opToolsSave').textContent='체크리스트는 최대 30개예요.';return;}state.items.push({text:text.slice(0,120),checked:false,...(day?{date:day}:{})});input.value='';date.value='';save();drawItems();};$('#optAdd').addEventListener('click',add);$('#optItem').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add();}});$('#optPlanFilter').addEventListener('change',drawItems);
 const calc=()=>{const text=$('#optCalc').value.trim();if(!text||text.length>100){$('#optCalcResult').textContent='수식을 입력해 주세요.';return;}let val=null;try{val=typeof evaluate==='function'?evaluate(text.replace(/×/g,'*').replace(/÷/g,'/')):null;}catch(e){}$('#optCalcResult').textContent=typeof val==='number'&&Number.isFinite(val)?String(Number(val.toPrecision(12))):'계산할 수 없는 수식입니다.';};$('#optCalcGo').addEventListener('click',calc);$('#optCalc').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();calc();}});
 const convType=$('#optConvertType');function rateVisibility(){$('#optRateWrap').hidden=!['krw-usd','usd-krw'].includes(convType.value);$('#optConvertResult').textContent='—';}convType.addEventListener('change',rateVisibility);rate.addEventListener('input',()=>{state.rate=rate.value.slice(0,24);save();});$('#optConvertGo').addEventListener('click',()=>{const val=convert(convType.value,$('#optConvertValue').value,rate.value);$('#optConvertResult').textContent=val===null?'숫자와 환율을 확인해 주세요.':String(val);});
 drawItems();rateVisibility();draw();if(storageOkay)$('#opToolsSave').textContent='메모·목록 등 이 기기에 저장';const timer=setInterval(draw,250);
 return function(){disposed=true;clearInterval(timer);if(audio&&typeof audio.close==='function'){try{Promise.resolve(audio.close()).catch(()=>{});}catch(e){}}};
}
const api={KEY,CITIES,initial,clean,getState,formatDuration,timeFor,parseDuration,convert,validDate,localDay,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSOPTools=api;
})(typeof window!=='undefined'?window:globalThis);
