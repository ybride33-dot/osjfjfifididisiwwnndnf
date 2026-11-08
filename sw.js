/* J.A.R.V.I.S 오프라인 캐시 — 설치 후 서버·인터넷 없이 실행 */
const CV='jarvis-v4-single-1';
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CV).then(c=>c.addAll(['./','./index.html'])).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CV).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url); if(u.origin!==location.origin)return;
  e.respondWith(caches.match(r).then(hit=>{
    const net=fetch(r).then(res=>{ if(res&&res.ok){ const cp=res.clone(); caches.open(CV).then(c=>c.put(r,cp)); } return res; }).catch(()=>hit);
    if(hit)return hit;
    if(r.mode==='navigate'){ return caches.match('./index.html').then(ih=>ih||net); }
    return net; })); });
