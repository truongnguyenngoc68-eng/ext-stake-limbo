const tabs=document.getElementById('tabs'),app=document.getElementById('app'),connection=document.getElementById('connection');
let source='',busy=false,mounted=false,queue=Promise.resolve(),revision=0;
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
  const result=await chrome.tabs.sendMessage(Number(selected),{type:'limbo-panel',action,config});
  if(selected!==source)return;
  if(!result)throw Error('missing');
  if(!mounted){app.innerHTML=result.html;mounted=true;}
  for(const [key,value]of Object.entries(result.config)){const e=app.querySelector('#'+key);if(e){if(requestedRevision===revision&&(document.activeElement!==e||result.disabled))e.value=key==='amount'&&Number.isFinite(value)?value.toFixed(8):value;e.disabled=result.disabled}}
  const preview=app.querySelector('#amountPreview'),amount=app.querySelector('#amount');
  if(preview&&amount){const raw=amount.value.trim().replace(',','.');const n=/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(raw)?Number(raw):NaN;preview.textContent=Number.isFinite(n)&&n>0?`Mức bắt đầu: ${n.toFixed(8)}`:'Tiền cược chưa hợp lệ';}
  app.querySelector('output').textContent=result.status;app.querySelector('#toggle').textContent=result.toggle;
  connection.textContent=result.ready?'Đã kết nối tab Limbo. Tool chạy trong tab kể cả khi đóng panel.':'Đang tải cấu hình…';
 }catch{connection.textContent='Chưa kết nối. Reload tiện ích rồi F5 tab Limbo; sau đó mở lại panel.';app.replaceChildren();mounted=false}
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
