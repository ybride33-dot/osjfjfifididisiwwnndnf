/* OP QR tools: local vendored encoder/decoder, explicit camera access, no uploads. */
(function(root){
'use strict';
const MAX_BYTES=600,MAX_FILE_BYTES=12*1024*1024,MAX_PIXELS=24000000;
const pending={};
function load(name,url){
 if(root[name])return Promise.resolve(root[name]);if(pending[name])return pending[name];
 pending[name]=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.async=true;s.onload=()=>root[name]?resolve(root[name]):reject(Error('QR 도구를 불러오지 못했어요.'));s.onerror=()=>{s.remove();reject(Error('QR 도구를 불러오지 못했어요. 온라인에서 한 번 업데이트해 주세요.'));};document.head.appendChild(s);}).finally(()=>{delete pending[name]});return pending[name];
}
function validateText(s){
 if(typeof s!=='string'||!s.length||!s.trim())return 'QR에 넣을 글을 입력해 주세요.';
 for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))return '글자 형식을 확인해 주세요.';}else if(c>=0xdc00&&c<=0xdfff)return '글자 형식을 확인해 주세요.';}
 if(new TextEncoder().encode(s).length>MAX_BYTES)return '글이 너무 깁니다. UTF-8 기준 최대 600바이트입니다.';return null;
}
function makeQr(text,encoder){const error=validateText(text);if(error)throw Error(error);if(typeof encoder!=='function'||!encoder.stringToBytesFuncs||!encoder.stringToBytesFuncs['UTF-8'])throw Error('QR 생성 도구가 준비되지 않았습니다.');encoder.stringToBytes=encoder.stringToBytesFuncs['UTF-8'];const qr=encoder(0,'M');qr.addData(text,'Byte');qr.make();return qr;}
function drawQr(canvas,qr){const n=qr.getModuleCount(),border=4,scale=Math.max(2,Math.floor(640/(n+border*2))),size=(n+border*2)*scale;canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,size,size);ctx.fillStyle='#000000';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))ctx.fillRect((x+border)*scale,(y+border)*scale,scale,scale);return size;}
function safeUrl(s){try{const u=new URL(String(s));return u.protocol==='https:'||u.protocol==='http:'?u.href:null;}catch(e){return null;}}
function mount(el){
 const doc=el.ownerDocument,$=s=>el.querySelector(s),details=doc.createElement('details');details.id='opQr';details.className='opt-panel op-qr';
 details.innerHTML=`<summary><b>▦ QR 도구</b><span>오프라인 생성 · 읽기</span></summary>
 <div class="op-qr-body"><div class="opt-head"><b>QR 만들기</b></div><label for="qrInput">글 또는 링크</label><textarea id="qrInput" rows="3" maxlength="1200" placeholder="QR에 담을 내용을 입력하세요"></textarea><div class="opt-actions"><button type="button" id="qrMake">만들기</button><button type="button" id="qrSave" class="opt-ghost" hidden>이미지 저장</button></div><p id="qrMakeStatus" aria-live="polite">최대 600바이트 · 한국어와 링크 입력 가능</p><canvas id="qrCanvas" hidden aria-label="만든 QR 코드"></canvas>
 <div class="opt-head opt-subhead"><b>QR 읽기</b></div><div class="opt-actions"><button type="button" id="qrCamera">카메라 켜기</button><button type="button" id="qrStop" class="opt-ghost" hidden>카메라 끄기</button><label class="qr-file-label">사진 선택<input id="qrFile" type="file" accept="image/png,image/jpeg,image/webp" aria-label="QR 사진 선택"></label></div><video id="qrVideo" muted playsinline hidden></video><canvas id="qrScanCanvas" hidden></canvas><p id="qrScanStatus" aria-live="polite">카메라 또는 사진을 선택해 주세요.</p><label for="qrResult">읽은 내용</label><textarea id="qrResult" rows="3" readonly placeholder="여기에 QR 내용이 표시됩니다"></textarea><div class="opt-actions"><button type="button" id="qrCopy" class="opt-ghost" disabled>내용 복사</button><a id="qrOpen" href="#" target="_blank" rel="noopener noreferrer" hidden>링크 열기</a></div><p>QR 내용은 자동으로 열지 않습니다. 카메라를 사용할 때 기기 권한이 필요합니다.</p></div>`;
 (el.querySelector('#opTools')||el.querySelector('.op-footer')).before(details);
 let disposed=false,stream=null,scanTimer=null,cameraEpoch=0,fileEpoch=0,makeEpoch=0,objectUrl=null;
 const video=$('#qrVideo'),canvas=$('#qrCanvas'),scanCanvas=$('#qrScanCanvas'),result=$('#qrResult'),scanStatus=$('#qrScanStatus'),makeStatus=$('#qrMakeStatus');
 const stopTracks=s=>{if(s)for(const t of s.getTracks())try{t.stop()}catch(e){}};
 function stopCamera(note){cameraEpoch++;if(scanTimer!==null){clearTimeout(scanTimer);scanTimer=null;}stopTracks(stream);stream=null;video.pause();video.srcObject=null;video.hidden=true;$('#qrCamera').hidden=false;$('#qrStop').hidden=true;if(note&&!disposed)scanStatus.textContent=note;}
 function cancelFile(){fileEpoch++;if(objectUrl){root.URL.revokeObjectURL(objectUrl);objectUrl=null;}}
 function clearResult(){result.value='';$('#qrCopy').disabled=true;$('#qrOpen').hidden=true;$('#qrOpen').removeAttribute('href');}
 function showResult(text){result.value=String(text);$('#qrCopy').disabled=false;const u=safeUrl(text),a=$('#qrOpen');if(u){a.href=u;a.hidden=false;}else{a.hidden=true;a.removeAttribute('href');}scanStatus.textContent='QR을 읽었습니다. 내용을 확인해 주세요.';}
 function getDecoder(){return load('jsQR','./vendor/jsqr.js');}
 function scanPixels(source,width,height,decoder,maxDim){
  const scale=Math.min(1,maxDim/Math.max(width,height)),w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));scanCanvas.width=w;scanCanvas.height=h;const ctx=scanCanvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h);return decoder(pixels.data,w,h,{inversionAttempts:'attemptBoth'});
 }
 $('#qrInput').addEventListener('input',()=>{makeEpoch++;canvas.hidden=true;$('#qrSave').hidden=true;makeStatus.textContent='내용을 바꿨어요. 다시 만들기를 눌러 주세요.';});
 $('#qrMake').addEventListener('click',async()=>{const epoch=++makeEpoch,text=$('#qrInput').value,error=validateText(text);canvas.hidden=true;$('#qrSave').hidden=true;if(error){makeStatus.textContent=error;return;}makeStatus.textContent='QR을 만드는 중…';try{const encoder=await load('qrcode','./vendor/qrcode-generator.js');if(disposed||epoch!==makeEpoch)return;const qr=makeQr(text,encoder);drawQr(canvas,qr);canvas.hidden=false;$('#qrSave').hidden=false;makeStatus.textContent='QR을 만들었습니다.';}catch(e){if(!disposed&&epoch===makeEpoch)makeStatus.textContent='QR을 만들지 못했어요. '+(e.message||'');}});
 $('#qrSave').addEventListener('click',()=>{try{const a=doc.createElement('a');a.download='jarvis-qr.png';a.href=canvas.toDataURL('image/png');a.click();}catch(e){makeStatus.textContent='이미지 저장을 시작하지 못했어요.';}});
 $('#qrCamera').addEventListener('click',async()=>{
  stopCamera();cancelFile();clearResult();const epoch=cameraEpoch;scanStatus.textContent='카메라와 QR 도구를 준비 중…';
  try{const decoder=await getDecoder();if(disposed||epoch!==cameraEpoch)return;if(!root.navigator.mediaDevices||!root.navigator.mediaDevices.getUserMedia)throw Error('이 브라우저에서는 카메라를 사용할 수 없어요.');
   const next=await root.navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}}});if(disposed||epoch!==cameraEpoch){stopTracks(next);return;}stream=next;video.srcObject=stream;video.hidden=false;$('#qrCamera').hidden=true;$('#qrStop').hidden=false;await video.play();if(disposed||epoch!==cameraEpoch)return;scanStatus.textContent='QR을 화면 안에 맞춰 주세요.';
   const tick=()=>{if(disposed||epoch!==cameraEpoch||!stream)return;try{if(video.videoWidth&&video.videoHeight){const found=scanPixels(video,video.videoWidth,video.videoHeight,decoder,720);if(found&&typeof found.data==='string'){stopCamera();showResult(found.data);return;}}}catch(e){stopCamera('카메라 화면을 읽지 못했어요.');return;}scanTimer=setTimeout(tick,250);};tick();
  }catch(e){if(disposed||epoch!==cameraEpoch)return;stopCamera('카메라를 켜지 못했어요. 권한과 기기 설정을 확인해 주세요.');}
 });
 $('#qrStop').addEventListener('click',()=>stopCamera('카메라를 껐습니다.'));
 $('#qrFile').addEventListener('change',async e=>{const file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;stopCamera();cancelFile();clearResult();const epoch=fileEpoch;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>MAX_FILE_BYTES){scanStatus.textContent='PNG, JPEG, WebP 사진만 선택해 주세요. 최대 12MB입니다.';return;}scanStatus.textContent='사진에서 QR을 찾는 중…';let currentUrl=null;try{const decoder=await getDecoder();if(disposed||epoch!==fileEpoch)return;const url=root.URL.createObjectURL(file);objectUrl=currentUrl=url;const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('사진을 읽을 수 없습니다.'));image.src=url;});if(objectUrl===url){root.URL.revokeObjectURL(url);objectUrl=null;}if(disposed||epoch!==fileEpoch)return;if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>MAX_PIXELS)throw Error('사진 크기가 너무 큽니다.');const found=scanPixels(image,image.naturalWidth,image.naturalHeight,decoder,1280);if(found&&typeof found.data==='string')showResult(found.data);else scanStatus.textContent='QR을 찾지 못했어요. 더 선명한 사진을 선택해 주세요.';}catch(err){if(!disposed&&epoch===fileEpoch)scanStatus.textContent=err.message||'사진을 읽지 못했어요.';}finally{if(currentUrl&&objectUrl===currentUrl){root.URL.revokeObjectURL(currentUrl);objectUrl=null;}}});
 $('#qrCopy').addEventListener('click',async()=>{try{await root.navigator.clipboard.writeText(result.value);scanStatus.textContent='내용을 복사했습니다.';}catch(e){result.focus();result.select();scanStatus.textContent='내용을 선택했어요. 직접 복사해 주세요.';}});
 details.addEventListener('toggle',()=>{if(!details.open){stopCamera('카메라를 껐습니다.');cancelFile();}});const visibility=()=>{if(doc.hidden){stopCamera('화면이 전환되어 카메라를 껐습니다.');cancelFile();}};doc.addEventListener('visibilitychange',visibility);
 return ()=>{disposed=true;makeEpoch++;cancelFile();stopCamera();doc.removeEventListener('visibilitychange',visibility);details.remove();};
}
const api={MAX_BYTES,MAX_FILE_BYTES,MAX_PIXELS,validateText,makeQr,drawQr,safeUrl,mount};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.JVSOPQR=api;
})(typeof window!=='undefined'?window:globalThis);
