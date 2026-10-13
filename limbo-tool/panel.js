const tabs=document.getElementById('tabs'),app=document.getElementById('app'),connection=document.getElementById('connection');
let source='',busy=false,mounted=false,queue=Promise.resolve(),revision=0;
const reconnectAfter=new Map();let disconnected='';
async function requestPanel(selected,action,config){
 const message={type:'limbo-panel',action,config};
 try{const result=await chrome.tabs.sendMessage(Number(selected),message);if(!result)throw Error('Tab chưa phản hồi.');return result}
 catch(error){
  if(action||selected!==source||!chrome.scripting?.executeScript)throw error;
  const now=Date.now(),next=reconnectAfter.get(selected)||0;
  if(now<next)throw error;
  reconnectAfter.set(selected,now+15000);
  globalThis.LimboLog?.emit('panel.reconnect.start',{tabId:Number(selected),reason:String(error)},'warn');
  try{
   await chrome.scripting.executeScript({target:{tabId:Number(selected)},files:['debug-log.js','content.js']});
   const result=await chrome.tabs.sendMessage(Number(selected),message);
   if(!result)throw Error('Tab chưa phản hồi sau khi nối lại.');
   globalThis.LimboLog?.emit('panel.reconnect.success',{tabId:Number(selected)});
   return result;
  }catch(reconnectError){globalThis.LimboLog?.emit('panel.reconnect.failure',{tabId:Number(selected),error:reconnectError},'error');throw reconnectError}
 }
}
async function refresh(){
 const all=(await chrome.tabs.query({url:await LimboDomains.patterns()})).filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''));
 const previous=source;
 tabs.replaceChildren(new Option('Chọn tab Limbo',''),...all.map(t=>new Option(`Limbo · tab ${t.id}${t.active?' · đang mở':''}`,String(t.id))));
 if(all.some(t=>String(t.id)===previous))source=previous;else source=String(all.find(t=>t.active)?.id|| (all.length===1?all[0].id:''));
 tabs.value=source;if(previous!==source){mounted=false;app.replaceChildren()}
}
function values(){return Object.fromEntries([...app.querySelectorAll('input[id],select[id]')].map(e=>[e.id,e.value]));}
function sync(action){
 if(!source||(!action&&busy))return;
 const selected=source,config=action?values():undefined,requestedRevision=revision;
 queue=queue.then(()=>perform(action,selected,config,requestedRevision)).catch(()=>{});return queue;
}
async function perform(action,selected,config,requestedRevision){
 if(selected!==source)return;busy=true;
 try{
  const result=await requestPanel(selected,action,config);
  if(selected!==source)return;
  if(!result)throw Error('missing');
  if(!mounted||disconnected===selected){app.innerHTML=result.html;mounted=true;}
  for(const button of app.querySelectorAll('button'))button.disabled=false;
  for(const [key,value]of Object.entries(result.config)){const e=app.querySelector('#'+key);if(e){if(requestedRevision===revision&&(document.activeElement!==e||result.disabled))e.value=key==='amount'&&Number.isFinite(value)?value.toFixed(8):value;e.disabled=result.disabled}}
  const preview=app.querySelector('#amountPreview'),amount=app.querySelector('#amount');
  if(preview&&amount){const raw=amount.value.trim().replace(',','.');const n=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(raw)?Number(raw):NaN;preview.textContent=Number.isFinite(n)&&n>0?`Mức bắt đầu: ${n.toFixed(8)}`:'Tiền cược chưa hợp lệ';}
  app.querySelector('output').textContent=result.status;app.querySelector('#toggle').textContent=result.toggle;
  disconnected='';connection.textContent=result.ready?'Đã kết nối tab Limbo. Tool chạy trong tab kể cả khi đóng panel.':'Đang tải cấu hình…';
 }catch(error){if(disconnected!==selected){globalThis.LimboLog?.emit('panel.sync.error',{error,selected,action,config},'error');disconnected=selected}connection.textContent='Tab đang mất kết nối. Panel tự thử nối lại; nếu vẫn lỗi, xem Debug log.';for(const control of app.querySelectorAll('button,input,select'))control.disabled=true;}
 finally{busy=false}
}
tabs.onchange=()=>{source=tabs.value;mounted=false;app.replaceChildren();void sync()};
app.addEventListener('input',()=>{revision++;const amount=app.querySelector('#amount'),preview=app.querySelector('#amountPreview');if(amount&&preview)preview.textContent='Mức bạn nhập: '+amount.value;});
app.addEventListener('change',()=>{revision++;void sync('save')});
app.addEventListener('click',event=>{const id=event.target.closest('button')?.id;if(['toggle','reloadNow','telegram'].includes(id))void sync(id)});
chrome.tabs.onRemoved.addListener(()=>void refresh());
chrome.tabs.onUpdated.addListener((_id,change)=>{if(change.status==='complete')void refresh()});
void refresh().then(()=>sync());setInterval(()=>void sync(),750);

chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.stakeDomain)void refresh().then(()=>sync())});
document.getElementById('settings').onclick=()=>chrome.runtime.openOptionsPage();

document.getElementById('extensionVersion').textContent='v'+(chrome.runtime.getManifest?.().version||'Không xác định');

document.getElementById('debugLogs').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('debug.html')});

document.getElementById('openMonitor').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('options.html#monitor')});
setInterval(()=>void refresh().catch(()=>{}),5000);
