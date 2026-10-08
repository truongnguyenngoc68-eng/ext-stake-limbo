import {telegramDefaults,validateTelegram} from './signals.ts';
import type {Signal,TelegramConfig} from './signals.ts';
const KEY='slide-telegram-v1',LOG='slide-signals-v1';
let queue=Promise.resolve();let lastSend=0;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function config():Promise<TelegramConfig>{const stored=(await chrome.storage.local.get(KEY))[KEY];try{if(stored){validateTelegram(stored);return stored}}catch{}return telegramDefaults()}
async function logs():Promise<Signal[]>{return (await chrome.storage.local.get(LOG))[LOG]||[]}
async function record(signal:Signal){const old=await logs();const i=old.findIndex(x=>x.id===signal.id);if(i<0)old.push(signal);else old[i]=signal;await chrome.storage.local.set({[LOG]:old.slice(-500)})}
async function deliver(event:Signal,test=false){
 if((await logs()).some(x=>x.id===event.id))return {ok:true,duplicate:true};
 const c=await config();const signal={...event,text:event.text.slice(0,1000),status:'Đã ghi nhận'};
 if(!test&&(!c.enabled||!c.notify[event.kind as keyof typeof c.notify])){await record(signal);return {ok:true,skipped:true}}
 if(!c.enabled){await record({...signal,status:'Telegram đang tắt'});return {ok:false,error:'Bật Telegram và lưu cấu hình trước'}}
 if(!await chrome.permissions.contains({origins:['https://api.telegram.org/*']})){await record({...signal,status:'Chưa cho phép kết nối Telegram'});return {ok:false,error:'Chưa cho phép Telegram'}}
 await record({...signal,status:'Đang gửi'});
 await sleep(Math.max(0,1100-(Date.now()-lastSend)));lastSend=Date.now();
 try{const response=await fetch(`https://api.telegram.org/bot${c.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:c.chatId,text:signal.text}),signal:AbortSignal.timeout(8000)});const body=await response.json();
  if(!response.ok||body.ok!==true){const error=String(body.description||`Telegram HTTP ${response.status}`).replaceAll(c.token,'[redacted]');await record({...signal,status:`Lỗi: ${error}`});return {ok:false,error}}
  await record({...signal,status:'Đã gửi Telegram'});return {ok:true};
 }catch{const error='Không xác nhận được Telegram đã nhận (timeout/mạng). Không tự gửi lại để tránh trùng.';await record({...signal,status:error});return {ok:false,error}}
}
function trustedUI(sender:chrome.runtime.MessageSender){return sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''))}
function trustedPage(sender:chrome.runtime.MessageSender){return sender.id===chrome.runtime.id&&/^https:\/\/(www\.)?stake1022\.com\//.test(sender.url||'')}
async function handle(msg:any,sender:chrome.runtime.MessageSender){
 if(msg.type==='signal-rules'&&trustedPage(sender))return (await config()).rules;
 if(msg.type==='signal-event'&&trustedPage(sender)){
  const s=msg.event;if(!s||typeof s.id!=='string'||s.id.length>200||!Number.isFinite(s.time)||typeof s.text!=='string'||s.text.length>2000||!['hit','entry','win','loss','step','error','startStop','round'].includes(s.kind))return {ok:false};
  return deliver(s);
 }
 if(!trustedUI(sender))return {ok:false,error:'Nguồn yêu cầu không hợp lệ'};
 if(msg.type==='telegram-get')return {config:await config(),logs:await logs()};
 if(msg.type==='telegram-save'){validateTelegram(msg.config);await chrome.storage.local.set({[KEY]:msg.config});return {ok:true}}
 if(msg.type==='telegram-test')return deliver({id:crypto.randomUUID(),time:Date.now(),kind:'test',text:'✅ Slide Lab: kết nối Telegram thành công. Tin thử từ extension trên máy của bạn.'},true);
 if(msg.type==='open-signals'){await chrome.tabs.create({url:chrome.runtime.getURL('index.html#signals')});return {ok:true}}
 return {ok:false};
}
chrome.runtime.onMessage.addListener((msg,sender,respond)=>{
 if(!['signal-event','signal-rules','telegram-get','telegram-save','telegram-test','open-signals'].includes(msg?.type))return false;
 queue=queue.then(()=>handle(msg,sender).then(respond).catch(e=>respond({ok:false,error:msg.type==='telegram-save'?String(e):'Không xử lý được yêu cầu'})));return true;
});
chrome.action.onClicked.addListener(async tab=>{if(!tab.id||!/^https:\/\/(www\.)?stake1022\.com\//.test(tab.url||''))return;try{await chrome.tabs.sendMessage(tab.id,{type:'toggle-slide-lab'});await chrome.action.setBadgeText({tabId:tab.id,text:''});await chrome.action.setTitle({tabId:tab.id,title:'Mở / đóng Slide Lab'})}catch{await chrome.action.setBadgeText({tabId:tab.id,text:'F5'});await chrome.action.setTitle({tabId:tab.id,title:'Tải lại trang Stake rồi bấm lại biểu tượng'})}});
