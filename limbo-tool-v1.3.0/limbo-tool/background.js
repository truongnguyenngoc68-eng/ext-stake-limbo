importScripts('stats.js','stats-store.js');
const alarmName='limbo-balance-3m';let sending=false;
async function schedule(){const {telegram}=await chrome.storage.local.get('telegram');if(telegram?.enabled)await chrome.alarms.create(alarmName,{delayInMinutes:3,periodInMinutes:3});else await chrome.alarms.clear(alarmName)}
chrome.runtime.onInstalled.addListener(schedule);chrome.runtime.onStartup.addListener(schedule);
chrome.action.onClicked.addListener(tab=>chrome.sidePanel.open({tabId:tab.id}));
chrome.runtime.onMessage.addListener((m,_s,reply)=>{if(m.type==='open-options'){chrome.runtime.openOptionsPage();return}if(m.type==='telegram-config'){schedule().then(()=>reply({ok:true}));return true}});
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
 if(m.type!=='limbo-stat-event'||!sender.tab||!/^https:\/\/stake1022\.com\/(?:[^/]+\/)?casino\/games\/limbo\/?(?:\?|$)/.test(sender.url||''))return;
 if(!m.event||!['start','end','bet','issue','request'].includes(m.event.kind))return;
 LimboStatsStore.update(m.event).then(()=>reply({ok:true})).catch(()=>{void chrome.storage.local.set({statisticsError:true});reply({ok:false})});return true;
});
chrome.alarms.onAlarm.addListener(async alarm=>{
if(alarm.name!==alarmName||sending)return;sending=true;
try{const {telegram:t}=await chrome.storage.local.get('telegram');if(!t?.enabled)return;
const tabs=await chrome.tabs.query({url:'https://stake1022.com/*'});let balance;
for(const tab of tabs.filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''))){try{const b=await chrome.tabs.sendMessage(tab.id,{type:'limbo-wallet'});if(b?.ok&&Number.isFinite(b.amount)&&b.amount>=0&&/^[a-z0-9]{1,15}$/i.test(b.currency)){balance=b;break}}catch{}}
if(!balance){await chrome.storage.local.set({telegramStatus:'Không đọc được số dư từ tab Limbo.'});return}
const report=await LimboStatsStore.read().catch(()=>null);
const lines=[`💰 LIMBO · Số dư tài khoản`,`${balance.amount.toFixed(8)} ${balance.currency.toUpperCase()}`];
if(report&&Object.keys(report.totals).length){
 lines.push('📊 Tất cả tab · từ khi bật bản 1.3.0');
 for(const [currency,total]of Object.entries(report.totals)){
  lines.push(`${currency.toUpperCase()} · Vol xác nhận: ${total.volume.toFixed(8)} · ${total.bets} cược`);
  lines.push(`TP: ${total.tp} lượt · SL: ${total.sl} lượt · Khác/chưa rõ: ${total.other}`);
  lines.push(`Vol các lượt TP: ${(total.tpVolume||0).toFixed(8)} · SL: ${(total.slVolume||0).toFixed(8)}`);
  if(total.last)lines.push(`Lượt cuối: ${total.last.outcome==='tp'?'TP':total.last.outcome==='sl'?'SL':'khác/chưa rõ'} · Vol ${total.last.volume.toFixed(8)}${total.last.partial?' (thiếu dữ liệu)':''}`);
 }
 if(report.issues)lines.push(`⚠ ${report.issues} lần thiếu dữ liệu; volume chỉ gồm cược đã xác nhận.`);
}else lines.push('📊 Chưa có dữ liệu cược được xác nhận từ bản 1.3.0.');
const {statisticsError}=await chrome.storage.local.get('statisticsError');if(statisticsError)lines.push('⚠ Lưu thống kê từng lỗi; số liệu có thể thiếu.');
lines.push(new Date(balance.time).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}));
const text=lines.join('\n');
const response=await fetch(`https://api.telegram.org/bot${t.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:t.chat,text}),signal:AbortSignal.timeout(15000)});
const result=await response.json();await chrome.storage.local.set({telegramStatus:response.ok&&result.ok?'Đã gửi lúc '+new Date().toISOString():'Telegram từ chối; kiểm tra token/chat ID.'});
}catch{await chrome.storage.local.set({telegramStatus:'Gửi lỗi hoặc timeout; chờ chu kỳ sau, không gửi lại tin cũ.'})}finally{sending=false}});
