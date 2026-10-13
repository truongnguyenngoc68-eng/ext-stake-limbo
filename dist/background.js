if(typeof importScripts==="function")importScripts("round-archive.js","status-icons.js");
(function(){"use strict";const c=()=>({enabled:!1,token:"",chatId:"",notify:{hit:!0,entry:!0,win:!0,loss:!1,step:!0,error:!0,startStop:!0,round:!0},rules:{targets:[90,250,450],entry:{enabled:!1,count:5,op:"<",value:2}}});function h(t){if(!t||typeof t.enabled!="boolean"||typeof t.token!="string"||typeof t.chatId!="string")throw Error("Cấu hình Telegram không hợp lệ");if(t.enabled&&(!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(t.token)||!/^(-?\d+|@[A-Za-z0-9_]{5,})$/.test(t.chatId)))throw Error("Bot Token hoặc Chat ID chưa đúng định dạng");if(!t.notify||Object.keys(c().notify).some(e=>typeof t.notify[e]!="boolean"))throw Error("Loại thông báo không hợp lệ");if(!t.rules||!Array.isArray(t.rules.targets)||t.rules.targets.length>20||t.rules.targets.some(e=>!Number.isFinite(e)||e<1.01||e>4294967e3))throw Error("Danh sách target tín hiệu không hợp lệ");const r=t.rules.entry;if(!r||!Number.isInteger(r.count)||r.count<1||r.count>1e3||!["<",">","<=",">="].includes(r.op)||!Number.isFinite(r.value)||r.value<1)throw Error("Điều kiện tín hiệu không hợp lệ")}const o="slide-telegram-v1",s="slide-signals-v1";let g=Promise.resolve(),d=0;const y=t=>new Promise(r=>setTimeout(r,t));async function l(){const t=(await chrome.storage.local.get(o))[o];try{if(t)return h(t),t}catch{}return c()}async function u(){return(await chrome.storage.local.get(s))[s]||[]}async function i(t){const r=await u(),e=r.findIndex(n=>n.id===t.id);e<0?r.push(t):r[e]=t,await chrome.storage.local.set({[s]:r.slice(-500)})}async function f(t,r=!1){if((await u()).some(a=>a.id===t.id))return{ok:!0,duplicate:!0};const e=await l(),n={...t,text:t.text.slice(0,1e3),status:"Đã ghi nhận"};try{const z=(await chrome.storage.local.get("slide-message-templates-v1"))["slide-message-templates-v1"]||{},tpl=z[t.kind];if(false&&typeof tpl==="string"&&tpl.trim()){const vars={message:n.text,kind:t.kind,time:new Date(t.time).toLocaleString("vi-VN"),result:(n.text.match(/(?:x|×)([0-9.,]+)/i)||[])[1]||"—",round:(n.text.match(/(?:R|vòng\s*)([0-9]+)/i)||[])[1]||"—"};n.text=tpl.replace(/\{(message|kind|time|result|round)\}/g,(full,key)=>vars[key]).slice(0,1000)}}catch{}// Keep the complete original message; remove only the branding label.
 n.text=n.text.replace(/\[STAKE\]\s*/gi,'').trim();
 if(!r&&(!e.enabled||!e.notify[t.kind]))return await i(n),{ok:!0,skipped:!0};if(!e.enabled)return await i({...n,status:"Telegram đang tắt"}),{ok:!1,error:"Bật Telegram và lưu cấu hình trước"};if(!await chrome.permissions.contains({origins:["https://api.telegram.org/*"]}))return await i({...n,status:"Chưa cho phép kết nối Telegram"}),{ok:!1,error:"Chưa cho phép Telegram"};await i({...n,status:"Đang gửi"}),await y(Math.max(0,1100-(Date.now()-d))),d=Date.now();try{const a=await fetch(`https://api.telegram.org/bot${e.token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:e.chatId,text:n.text}),signal:AbortSignal.timeout(8e3)}),p=await a.json();if(!a.ok||p.ok!==!0){const w=String(p.description||`Telegram HTTP ${a.status}`).replaceAll(e.token,"[redacted]");return await i({...n,status:`Lỗi: ${w}`}),{ok:!1,error:w}}return await i({...n,status:"Đã gửi Telegram"}),{ok:!0}}catch{const a="Không xác nhận được Telegram đã nhận (timeout/mạng). Không tự gửi lại để tránh trùng.";return await i({...n,status:a}),{ok:!1,error:a}}}function k(t){var r;return t.id===chrome.runtime.id&&((r=t.url)==null?void 0:r.startsWith(chrome.runtime.getURL("")))}function m(t){try{const url=new URL(t.url);return t.id===chrome.runtime.id&&url.protocol==='https:'&&url.pathname.replace(/\/$/,'').endsWith('/casino/games/slide')}catch{return false}}async function b(t,r){if(t.type==="signal-rules"&&m(r))return(await l()).rules;if(t.type==="signal-event"&&m(r)){const e=t.event;return!e||typeof e.id!="string"||e.id.length>200||!Number.isFinite(e.time)||typeof e.text!="string"||e.text.length>2e3||!["hit","entry","win","loss","step","error","startStop","round"].includes(e.kind)?{ok:!1}:f(e)}return k(r)?t.type==="telegram-templates-get"?{templates:(await chrome.storage.local.get("slide-message-templates-v1"))["slide-message-templates-v1"]||{}}:t.type==="telegram-templates-save"?(typeof t.templates!=="object"||t.templates===null||Object.entries(t.templates).some(([key,val])=>!["hit","entry","win","loss","step","error","startStop","round"].includes(key)||typeof val!=="string"||val.length>1000)?{ok:!1,error:"Mẫu không hợp lệ (tối đa 1000 ký tự)"}:(await chrome.storage.local.set({"slide-message-templates-v1":t.templates}),{ok:!0})):t.type==="telegram-get"?{config:await l(),logs:await u()}:t.type==="telegram-save"?(h(t.config),await chrome.storage.local.set({[o]:t.config}),{ok:!0}):t.type==="telegram-test"?f({id:crypto.randomUUID(),time:Date.now(),kind:"test",text:"✅ Slide Lab: kết nối Telegram thành công. Tin thử từ extension trên máy của bạn."},!0):t.type==="open-signals"?(await chrome.tabs.create({url:chrome.runtime.getURL("index.html#signals")}),{ok:!0}):{ok:!1}:{ok:!1,error:"Nguồn yêu cầu không hợp lệ"}}chrome.runtime.onMessage.addListener((t,r,e)=>["signal-event","signal-rules","telegram-get","telegram-save","telegram-test","telegram-templates-get","telegram-templates-save","open-signals"].includes(t==null?void 0:t.type)?(g=g.then(()=>b(t,r).then(e).catch(n=>e({ok:!1,error:t.type==="telegram-save"?String(n):"Không xử lý được yêu cầu"}))),!0):!1);
let durableWrites=Promise.resolve();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=='slide-persist-session')return false;
 const session=message.session;
 if(!m(sender)||session?.schema!==1||!Number.isFinite(session.savedAt)||!session.engine?.config||session.origin!==new URL(sender.url).origin){reply({ok:false});return false;}
 durableWrites=durableWrites.catch(()=>{}).then(async()=>{
  const key='slide-lab-durable-live-v1';const stored=(await chrome.storage.local.get(key))[key];
  if(!stored||session.savedAt>=stored.savedAt)await chrome.storage.local.set({[key]:session});
 });
 durableWrites.then(()=>reply({ok:true})).catch(()=>reply({ok:false}));return true;
});
const connectingTabs=new Map();
function ensureSlideConnection(tabId){if(connectingTabs.has(tabId))return connectingTabs.get(tabId);const pending=injectSlideConnection(tabId).finally(()=>connectingTabs.delete(tabId));connectingTabs.set(tabId,pending);return pending;}
async function injectSlideConnection(tabId){
 if(!Number.isInteger(tabId))throw Error("Không tìm thấy tab Slide");
 const [result]=await chrome.scripting.executeScript({target:{tabId},func:()=>{
  const slide=location.protocol==='https:'&&location.pathname.replace(/\/$/,'').endsWith('/casino/games/slide');
  const dom=!!document.querySelector('input[data-testid="input-game-amount"]')&&!!document.querySelector('input[data-testid^="target-multiplier-"]');
  return {slide,dom,loaded:!!globalThis.__slideLabObserverLoaded,valid:globalThis.__slideLabLifecycle?.valid?.()===true};
 }});
 if(!result?.result?.slide)throw Error("Mở màn Slide và chờ tải xong, rồi bấm biểu tượng extension");
 let alive=false;
 if(result.result.loaded){try{const pong=await chrome.tabs.sendMessage(tabId,{type:'slide-lab-ping'});alive=pong?.ok===true;
  if(alive&&pong.version!=='1.0.56')return {ok:true,version:pong.version,updateAvailable:true};
 }catch{}}
 // A live observer owns the financial session. A failed handshake must not
 // dispose it and create a competing engine while an async submit is pending.
 if(!alive&&result.result.loaded&&result.result.valid)throw Error('Observer hiện có còn hoạt động; đang thử nối lại kênh đọc, giữ nguyên phiên');
 if(!alive){
  await chrome.scripting.executeScript({target:{tabId},files:['content-lifecycle.js','wallet-reader.js','content.js','recovery-monitor.js','progress-checkpoint-view.js']});
  const pong=await chrome.tabs.sendMessage(tabId,{type:'slide-lab-ping'});
  if(pong?.ok!==true||pong.version!=='1.0.56')throw Error('Script trên trang chưa phản hồi sau khi nạp lại');
 }
 return {ok:true};
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.type!=='slide-ensure-connection')return false;
 if(sender.id!==chrome.runtime.id||(sender.url&&sender.url!==chrome.runtime.getURL('sidepanel.html'))){reply({ok:false,error:'Nguồn kết nối không hợp lệ'});return false;}
 ensureSlideConnection(message.tabId).then(reply).catch(error=>{globalThis.SlideStatus?.markError?.(message.tabId);reply({ok:false,error:`Không kết nối được tab Slide: ${String(error?.message||error)}. Bấm biểu tượng extension trên tab Slide để cấp quyền.`})});return true;
});
chrome.action.onClicked.addListener(tab=>{ensureSlideConnection(tab.id).catch(error=>{globalThis.SlideStatus?.markError?.(tab.id);console.error(error)})});
chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(console.error);
})();
