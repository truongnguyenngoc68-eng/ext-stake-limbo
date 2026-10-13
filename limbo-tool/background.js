importScripts('debug-store.js','debug-log.js','domains.js','stats.js','stats-store.js','telegram-format.js','history.js','history-store.js');
const alarmName='limbo-balance-3m';let sending=false;
async function schedule(){const {telegram}=await chrome.storage.local.get('telegram');const minutes=LimboTelegram.settings(telegram).interval;if(telegram?.enabled)await chrome.alarms.create(alarmName,{delayInMinutes:minutes,periodInMinutes:minutes});else await chrome.alarms.clear(alarmName)}
chrome.runtime.onInstalled.addListener(()=>Promise.all([schedule(),registerDomain().catch(()=>{})]));chrome.runtime.onStartup.addListener(()=>Promise.all([schedule(),registerDomain().catch(()=>{})]));
chrome.action.onClicked.addListener(tab=>chrome.sidePanel.open({tabId:tab.id}));
chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(m.type==='open-options'){chrome.runtime.openOptionsPage();return}if(m.type==='telegram-config'){schedule().then(()=>reply({ok:true}));return true}});
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m.type!=='limbo-stat-event'||!sender.tab||!LimboDomains.validUrl(sender.url))return;
 if(!m.event||!['start','end','bet','issue','request'].includes(m.event.kind))return;
 LimboStatsStore.update(m.event).then(()=>reply({ok:true})).catch(()=>{void chrome.storage.local.set({statisticsError:true});reply({ok:false})});return true;
});
chrome.alarms.onAlarm.addListener(async alarm=>{
if(alarm.name!==alarmName||sending)return;sending=true;
try{const {telegram:t}=await chrome.storage.local.get('telegram');if(!t?.enabled)return;
const tabs=(await chrome.tabs.query({url:await LimboDomains.patterns()})).filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''));
let balance;const totals=new Map();let read=0;
for(const tab of tabs){try{
 const b=await chrome.tabs.sendMessage(tab.id,{type:'limbo-wallet'});
 if(!b?.ok||!Number.isFinite(b.amount)||b.amount<0||!/^[a-z0-9]{1,15}$/i.test(b.currency))continue;
 balance??=b;const s=b.displayedStats;
 if(!s||!Number.isFinite(s.volume)||s.volume<0||!Number.isFinite(s.profit))continue;
 const key=b.currency.toUpperCase(),t=totals.get(key)||{volume:0,profit:0,count:0,volumes:[],profits:[]};
 t.volume+=s.volume;t.profit+=s.profit;t.count++;t.volumes.push(s.volume);t.profits.push(s.profit);totals.set(key,t);read++;
}catch{}}
if(!balance){await chrome.storage.local.set({telegramStatus:'Không đọc được số dư từ tab Limbo.'});return}
const text=LimboTelegram.format({balance,totals,read,count:tabs.length},t);
if(!text){await chrome.storage.local.set({telegramStatus:'Chọn ít nhất một nội dung thông báo.'});return}
const response=await fetch(`https://api.telegram.org/bot${t.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:t.chat,text}),signal:AbortSignal.timeout(15000)});
const result=await response.json();LimboLog.emit('telegram.response',{status:response.status,result},response.ok&&result.ok?'info':'error');await chrome.storage.local.set({telegramStatus:response.ok&&result.ok?'Đã gửi lúc '+new Date().toISOString():'Telegram từ chối; kiểm tra token/chat ID.'});
}catch(error){LimboLog.emit('telegram.error',{error},'error');await chrome.storage.local.set({telegramStatus:'Gửi lỗi hoặc timeout; chờ chu kỳ sau, không gửi lại tin cũ.'})}finally{sending=false}});

async function registerDomain(){
 const host=await LimboDomains.host(),ids=['mirror-observer','mirror-content'];
 await chrome.scripting.unregisterContentScripts({ids}).catch(()=>{});
 if(host==='stake1022.com')return;
 const matches=['https://'+host+'/*'];
 if(!await chrome.permissions.contains({origins:matches}))throw Error('Chưa cấp quyền tên miền.');
 await chrome.scripting.registerContentScripts([{id:ids[0],matches,js:['bet-observer.js'],world:'MAIN',runAt:'document_start'},{id:ids[1],matches,js:['debug-log.js','content.js'],runAt:'document_idle'}]);
}
chrome.runtime.onMessage.addListener((m,sender,reply)=>{if(m.type!=='stake-domain-config')return;if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('options.html')){reply({ok:false,error:'Nguồn cấu hình không hợp lệ.'});return;}registerDomain().then(()=>reply({ok:true})).catch(e=>reply({ok:false,error:e.message}));return true;});

async function saveDebug(entry,sender){
 try{
  const id=await LimboJournal.append({...LimboLog.clean(entry),tabId:sender?.tab?.id??null,frameId:sender?.frameId??null,receivedAt:new Date().toISOString()});
  return {ok:true,id};
 }catch(error){
  await chrome.storage.local.set({limboDebugHealth:{error:String(error?.stack||error),time:Date.now()}}).catch(()=>{});
  return {ok:false,error:String(error?.message||error)};
 }
}
LimboLog.setSink(entry=>saveDebug(entry));
LimboLog.emit('worker.ready',{version:chrome.runtime.getManifest().version});
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m.type!=='limbo-debug-log'||sender.id!==chrome.runtime.id)return;
 if(!m.entry||typeof m.entry.event!=='string'){reply({ok:false,error:'Invalid log entry'});return;}
 saveDebug(m.entry,sender).then(reply);return true;
});
chrome.runtime.onMessage.addListener((m,sender)=>{
 if(m.type==='limbo-debug-log')return;
 LimboLog.emit('runtime.input',{message:m,tabId:sender.tab?.id});
});
chrome.tabs.onRemoved.addListener(tabId=>LimboLog.emit('tab.closed',{tabId}));
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.status)LimboLog.emit('tab.navigation',{tabId,status:change.status})});
