(() => {
 let opening;
 function open(){if(!opening)opening=new Promise((resolve,reject)=>{const r=indexedDB.open('limbo-confirmed-statistics',1);r.onupgradeneeded=()=>{r.result.createObjectStore('meta');r.result.createObjectStore('bets')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>{opening=null;reject(r.error)}});return opening;}
 async function update(event){
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction(['meta','bets'],event?'readwrite':'readonly'),meta=tx.objectStore('meta'),bets=tx.objectStore('bets');let state;
   tx.oncomplete=()=>resolve(LimboStats.summary(state));tx.onerror=tx.onabort=()=>reject(tx.error||Error('Statistics transaction failed'));
   const get=meta.get('state');
   get.onsuccess=()=>{
    state=get.result||LimboStats.fresh();if(!event)return;
    const apply=()=>{state.seen={};state=LimboStats.apply(state,event);if(Object.hasOwn(state.seen,event.id))bets.put(1,event.id);state.seen={};meta.put(state,'state');};
    if(event.kind==='bet'&&typeof event.id==='string'){const previous=bets.get(event.id);previous.onsuccess=()=>{if(!previous.result)apply()};}else apply();
   };
  });
 }
 globalThis.LimboStatsStore={update,read:()=>update(null)};
})();
