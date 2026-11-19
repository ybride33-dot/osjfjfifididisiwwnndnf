/* J.A.R.V.I.S 오프라인 캐시 — 설치 후 서버·인터넷 없이 실행 */
const CV='jarvis-v4-single-89';
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CV).then(c=>c.addAll(['./','./index.html','./legacy-model-cleanup.js','./instruction-code-model.js','./tiny-code-model.js','./coding-algorithms.js','./coding-engine.js','./composer-model.js','./coding-pipeline.js','./op-tools.js','./op-hud.js','./science-library.js','./code-corpus.js','./code-corpus.json','./code-lab.js','./code-school.js','./brain-pack.js','./games.js','./knowledge-pack3.js'].map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.indexOf('jarvis-v4-')===0&&k!==CV).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const r=e.request; if(r.method!=='GET')return;
  const u=new URL(r.url); if(u.origin!==location.origin){ if(!/cdn\.jsdelivr\.net|esm\.run$|ko\.wikipedia\.org$/.test(u.hostname))return;
    e.respondWith(caches.open(CV).then(function(c){ return c.match(r).then(function(hit){ return hit||fetch(r).then(function(res){ if(res&&(res.ok||res.type==='opaque'))c.put(r,res.clone()); return res; }); }); })); return; }
  e.respondWith(caches.open(CV).then(async c=>{
    const hit=await c.match(r); if(hit)return hit;
    if(r.mode==='navigate'){ const ih=await c.match('./index.html'); if(ih)return ih; }
    const res=await fetch(r); if(res&&res.ok)await c.put(r,res.clone()).catch(()=>{}); return res;
  })); });
