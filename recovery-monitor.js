(()=>{
  'use strict';
  const lifecycle=globalThis.__slideLabLifecycle;
  if(!lifecycle?.valid())return;
  const KEY='slide-lab-last-checkpoint-v1';
  const isSlide=()=>/\/casino\/games\/slide\/?$/.test(location.pathname);
  if(!isSlide())return;
  const rounds=()=>[...document.querySelectorAll('button[data-past-game-id]')].map(el=>el.getAttribute('data-past-game-id')).filter(Boolean);
  let lastRound='',lastTime=Date.now(),count=0,latestWallet=null,saveBusy=false;
  const wallet=()=>{
    return globalThis.SlideWallet.read(document);
  };
  async function scan(){
    try{
    const ids=rounds();const top=ids[0]||null;
    if(top&&top!==lastRound){lastRound=top;lastTime=Date.now();count++}
    latestWallet=wallet();
    if(saveBusy)return;
    saveBusy=true;
    const data=await chrome.storage.local.get(KEY);
    if(!lifecycle.valid())return;
      const prev=data[KEY]||{};
      const checkpoint={...prev,savedAt:Date.now(),roundId:top,roundFeedAgeMs:Date.now()-lastTime,seenInThisPage:count,roundHistory:ids.slice(0,30),wallet:latestWallet,online:navigator.onLine,pageReloadAt:performance.timeOrigin};
      // Preserve user strategy and progress previously exported in a separate snapshot.
      await chrome.storage.local.set({[KEY]:checkpoint});
    }catch(error){lifecycle.error(error)}finally{saveBusy=false}
  }
  lifecycle.interval(scan,4000);lifecycle.run(scan);
})();
