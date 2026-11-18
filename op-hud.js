/* OP HUD: standalone overlay; no changes to the original particle canvas. */
(function(root){
'use strict';
let lastReplyMs=null,active=null;
function isCommand(text){return /^(?:자비스\s*)?(?:op|오\s*피)[\s.!?~]*$/i.test(String(text||'').trim());}
function recordReply(ms){if(Number.isFinite(ms)&&ms>=0)lastReplyMs=ms;}
function close(){if(!active)return;const a=active;active=null;clearInterval(a.clock);root.removeEventListener('online',a.net);root.removeEventListener('offline',a.net);a.controller.abort();a.el.remove();}
function toggle(){if(active){close();return false;}open();return true;}
function open(){
 if(active)return;
 const el=document.createElement('section');el.id='opHud';el.setAttribute('role','dialog');el.setAttribute('aria-label','자비스 OP 패널');
 el.innerHTML=`<style>
 #opHud{position:fixed;inset:0;z-index:12000;color:#bdf8ff;background:radial-gradient(ellipse at 50% 36%,rgba(1,35,51,.97),rgba(0,8,16,.985) 76%);font-family:system-ui,sans-serif;overflow:auto;overscroll-behavior:contain}
 #opHud *{box-sizing:border-box} #opHud .oph-wrap{max-width:760px;min-height:100%;margin:auto;padding:calc(env(safe-area-inset-top,0px) + 14px) 15px calc(env(safe-area-inset-bottom,0px) + 22px);position:relative;overflow:hidden}
 #opHud .oph-wrap:before{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 34px,rgba(39,226,242,.035) 35px),repeating-linear-gradient(90deg,transparent 0 34px,rgba(39,226,242,.035) 35px)}
 #opHud .oph-head,#opHud .oph-grid,#opHud .oph-center,#opHud .oph-foot{position:relative} #opHud .oph-head{display:flex;align-items:center;justify-content:space-between;gap:8px;letter-spacing:.18em;font-size:11px;color:#62e9f3}
 #opHud button{color:#bdf8ff;border:1px solid #30d5e7;background:rgba(3,29,38,.9);border-radius:4px;padding:9px 12px;cursor:pointer}
 #opHud .oph-center{display:grid;place-items:center;height:170px;margin:10px 0} #opHud .oph-ring{width:148px;height:148px;border:2px solid #61f7ff;border-radius:50%;box-shadow:0 0 20px #00bdd088,inset 0 0 24px #04a2b866;display:grid;place-items:center;position:relative}
 #opHud .oph-ring:before,#opHud .oph-ring:after{content:'';position:absolute;inset:8px;border:2px dashed #4ad4df;border-radius:50%;animation:oph-spin 16s linear infinite} #opHud .oph-ring:after{inset:20px;border-style:solid;border-color:#53f6ff transparent #53f6ff transparent;animation-direction:reverse;animation-duration:7s}
 #opHud .oph-core{width:54px;height:54px;border-radius:50%;background:radial-gradient(circle,#e4ffff,#36e7f2 38%,#007b93 65%,transparent 72%);box-shadow:0 0 35px #00e7ff}
 #opHud .oph-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px} #opHud .oph-card{min-width:0;border:1px solid rgba(54,224,239,.65);background:linear-gradient(140deg,rgba(0,61,75,.53),rgba(0,15,27,.88));padding:12px;min-height:90px;box-shadow:inset 0 0 14px #00cde316,0 0 12px #00cde313;animation:oph-in .45s both;clip-path:polygon(0 0,calc(100% - 12px) 0,100% 12px,100% 100%,12px 100%,0 calc(100% - 12px))}
 #opHud .oph-card:nth-child(2){animation-delay:.08s}#opHud .oph-card:nth-child(3){animation-delay:.16s}#opHud .oph-card:nth-child(4){animation-delay:.24s}#opHud .oph-label{font-size:10px;letter-spacing:.12em;color:#62e5ed;margin-bottom:8px}#opHud .oph-value{font-size:19px;font-weight:750;line-height:1.3;overflow-wrap:anywhere}#opHud .oph-small{font-size:11px;color:#87c6cc;line-height:1.5;margin-top:5px}#opHud .oph-foot{font-size:10px;color:#5db3bd;margin-top:13px;letter-spacing:.08em} @keyframes oph-spin{to{transform:rotate(360deg)}}@keyframes oph-in{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}@media(max-width:340px){#opHud .oph-grid{grid-template-columns:1fr}#opHud .oph-center{height:130px}#opHud .oph-ring{width:115px;height:115px}}@media(prefers-reduced-motion:reduce){#opHud *{animation:none!important}}
 </style><div class="oph-wrap"><header class="oph-head"><span>◈ J.A.R.V.I.S / OP SYSTEM</span><button type="button" id="opClose" aria-label="패널 닫기">✕ 닫기</button></header><div class="oph-center" aria-hidden="true"><div class="oph-ring"><div class="oph-core"></div></div></div><div class="oph-grid">
 <div class="oph-card"><div class="oph-label">◷ 한국 시간 · KST</div><div class="oph-value" id="opTime">--:--:--</div><div class="oph-small" id="opDate">날짜 확인 중</div></div>
 <div class="oph-card"><div class="oph-label">☀ 날씨 · 서울</div><div class="oph-value" id="opWeather">조회 중…</div><div class="oph-small" id="opWeatherNote">Open-Meteo · 인터넷 필요</div></div>
 <div class="oph-card"><div class="oph-label">◉ 네트워크 상태</div><div class="oph-value" id="opNetwork">확인 중…</div><div class="oph-small">기기 연결 상태 기준 · 인터넷 연결 보장 아님</div></div>
 <div class="oph-card"><div class="oph-label">⌁ 응답 시간</div><div class="oph-value" id="opReply">기록 없음</div><div class="oph-small" id="opLatency">날씨 서버 왕복: 측정 중…</div></div>
 </div><div class="oph-foot">SYSTEM DISPLAY / 기기 시간 및 실제 요청 기준 · 패널은 화면에 표시됩니다</div></div>`;
 document.body.appendChild(el);
 const controller=new AbortController();
 function clock(){if(!el.isConnected)return;const d=new Date();el.querySelector('#opTime').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(d);el.querySelector('#opDate').textContent=new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(d);}
 function net(){el.querySelector('#opNetwork').textContent=navigator.onLine?'온라인 감지':'오프라인';}
 active={el,controller,net,clock:setInterval(clock,1000)};clock();net();root.addEventListener('online',net);root.addEventListener('offline',net);
 el.querySelector('#opReply').textContent=lastReplyMs===null?'이전 답변 없음':Math.round(lastReplyMs)+' ms';
 el.querySelector('#opReply').insertAdjacentHTML('afterend','<div class="oph-small">최근 자비스 답변 처리 시간</div>');
 el.querySelector('#opClose').addEventListener('click',close);
 const start=performance.now(),timeout=setTimeout(()=>controller.abort(),8000);
 fetch('https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m&timezone=Asia%2FSeoul',{signal:controller.signal,cache:'no-store'})
 .then(r=>{if(!r.ok)throw Error('weather');return r.json();}).then(j=>{if(!el.isConnected)return;const t=j&&j.current&&j.current.temperature_2m;if(typeof t!=='number')throw Error('invalid');el.querySelector('#opWeather').textContent=t+'°C';el.querySelector('#opWeatherNote').textContent='서울 · Open-Meteo 현재 기온';el.querySelector('#opLatency').textContent='날씨 서버 요청: '+Math.round(performance.now()-start)+' ms';})
 .catch(()=>{if(!el.isConnected)return;el.querySelector('#opWeather').textContent='조회 불가';el.querySelector('#opWeatherNote').textContent='인터넷 또는 날씨 서비스 확인';el.querySelector('#opLatency').textContent='날씨 서버 요청 실패';}).finally(()=>clearTimeout(timeout));
}
const api={isCommand,recordReply,toggle,close};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSOP=api;
})(typeof window!=='undefined'?window:globalThis);
