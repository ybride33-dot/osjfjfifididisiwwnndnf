/* Remove only cached files whose request URL identifies the exact retired model.
   No localStorage, IndexedDB, other cache entries, or whole cache is deleted. */
(function(root){
'use strict';
const ORIGIN='https://huggingface.co';
const PREFIX='/mlc-ai/gemma-2-2b-it-q4f16_1-MLC/';
function matches(url){try{const u=new URL(url);return u.origin===ORIGIN&&u.pathname.startsWith(PREFIX);}catch(e){return false;}}
async function run(storage){
 if(!storage||typeof storage.keys!=='function')return {scanned:0,removed:0,errors:0};let names;try{names=await storage.keys();}catch(e){return {scanned:0,removed:0,errors:1};}
 const result={scanned:0,removed:0,errors:0};
 for(const name of names){try{const cache=await storage.open(name),keys=await cache.keys();for(const key of keys){result.scanned++;if(matches(key.url)){try{if(await cache.delete(key))result.removed++;}catch(e){result.errors++;}}}}catch(e){result.errors++;}}
 return result;
}
const api={matches,run};if(typeof module!=='undefined'&&module.exports)module.exports=api;else {root.JVSLegacyModelCleanup=api;if(root.caches)run(root.caches).catch(()=>{});}
})(typeof window!=='undefined'?window:globalThis);
