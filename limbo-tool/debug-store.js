/* Durable journal shared by the worker and the file writer. No automatic pruning. */
(() => {
 let opened;
 function db(){return opened??=new Promise((resolve,reject)=>{const r=indexedDB.open('limbo-debug-v1',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('events',{keyPath:'id',autoIncrement:true});d.createObjectStore('meta');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opened=null;reject(r.error)};});}
 async function transaction(store,mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store,mode);let result;try{result=fn(tx.objectStore(store))}catch(e){tx.abort();reject(e);return}tx.oncomplete=()=>resolve(result?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Journal transaction aborted'));});}
 globalThis.LimboJournal={
  async recent(limit=100){const d=await db();return new Promise((resolve,reject)=>{const rows=[],tx=d.transaction('events','readonly'),r=tx.objectStore('events').openCursor(null,'prev');r.onsuccess=()=>{const c=r.result;if(c&&rows.length<limit){rows.push(c.value);c.continue()}};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error)});},
  async selectFile(handle){return transaction('meta','readwrite',s=>{s.put(handle,'file');s.put(0,'cursor')})},
  async latest(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('events','readonly'),r=tx.objectStore('events').openCursor(null,'prev');let id=0;r.onsuccess=()=>{id=r.result?.key||0};tx.oncomplete=()=>resolve(id);tx.onerror=()=>reject(tx.error)});},
  append:entry=>transaction('events','readwrite',s=>s.add(entry)),
  get:key=>transaction('meta','readonly',s=>s.get(key)),
  set:(key,value)=>transaction('meta','readwrite',s=>s.put(value,key)),
  async batch(after=0,limit=250){const d=await db();return new Promise((resolve,reject)=>{const rows=[],tx=d.transaction('events','readonly');const r=tx.objectStore('events').openCursor(IDBKeyRange.lowerBound(after,true));r.onsuccess=()=>{const c=r.result;if(c&&rows.length<limit){rows.push(c.value);c.continue()}};tx.oncomplete=()=>resolve(rows);tx.onerror=()=>reject(tx.error)});}
 };
})();
