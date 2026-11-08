/* J.A.R.V.I.S 오프라인 캐시 — 설치 후 서버·인터넷 없이 실행 */
const CV='jarvis-v4-single-33';
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CV).then(c=>c.addAll(['./','./index.html','./brain-pack.js','./games.js','./knowledge-pack3.js'])).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.indexOf('jarvis-v4-')===0&&k!==CV).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url); if(u.origin!==location.origin){ if(!/cdn\.jsdelivr\.net|esm\.run$|text\.pollinations\.ai|ko\.wikipedia\.org$/.test(u.hostname))return;
    e.respondWith(caches.open(CV).then(function(c){ return c.match(r).then(function(hit){ return hit||fetch(r).then(function(res){ if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone()); return res; }); }); })); return; }
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(res=>{ if(res&&res.ok){ const cp=res.clone(); caches.open(CV).then(c=>c.put(r,cp)); } return res; }).catch(()=>hit);
    if(hit)return hit;
    if(r.mode==='navigate'){ return caches.match('./index.html').then(ih=>ih||net); }
    return net; })); });
