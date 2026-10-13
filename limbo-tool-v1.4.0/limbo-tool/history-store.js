let historyQueue=Promise.resolve();
function historyEvent(event){const task=historyQueue.then(async()=>{const {limboHistory}=await chrome.storage.local.get('limboHistory');const state=LimboHistory.apply(limboHistory,event);await chrome.storage.local.set({limboHistory:state});});historyQueue=task.catch(()=>{});return task;}
const historyUrl=url=>/^https:\/\/stake1022\.com\/(?:[^/]+\/)?casino\/games\/limbo\/?(?:\?|$)/.test(url||'');
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m.type!=='limbo-history-snapshot'||!sender.tab||(sender.frameId&&sender.frameId!==0)||!historyUrl(sender.url))return;
 historyEvent({kind:'snapshot',tab:sender.tab.id,time:Date.now(),stats:m.snapshot?.displayedStats,currency:m.snapshot?.currency}).then(()=>reply({ok:true})).catch(()=>reply({ok:false}));return true;
});
chrome.tabs.onRemoved.addListener(id=>{void historyEvent({kind:'close',tab:id,time:Date.now()}).catch(()=>{});});
chrome.tabs.onCreated.addListener(tab=>{void historyEvent({kind:'open',tab:tab.id,time:Date.now()}).catch(()=>{});});
chrome.tabs.onUpdated.addListener((id,change)=>{if(change.url)void historyEvent({kind:historyUrl(change.url)?'open':'close',tab:id,time:Date.now()}).catch(()=>{});});
async function reconcileHistory(){const tabs=await chrome.tabs.query({url:'https://stake1022.com/*'});const ids=new Set(tabs.filter(t=>historyUrl(t.url)).map(t=>String(t.id)));const {limboHistory}=await chrome.storage.local.get('limboHistory');for(const id of Object.keys(limboHistory?.active||{}))if(!ids.has(id))await historyEvent({kind:'close',tab:Number(id),time:Date.now()});}
chrome.runtime.onStartup.addListener(()=>{void reconcileHistory().catch(()=>{});});
chrome.runtime.onInstalled.addListener(()=>{void reconcileHistory().catch(()=>{});});
