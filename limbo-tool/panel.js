const tabs=document.getElementById('tabs'),app=document.getElementById('app'),connection=document.getElementById('connection');
let monitoredTabs=[],monitorBusy=false;
let source='',busy=false,mounted=false,queue=Promise.resolve(),revision=0;
async function refresh(){
 const all=(await chrome.tabs.query({url:await LimboDomains.patterns()})).filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''));
 monitoredTabs=all;
 const previous=source;
 tabs.replaceChildren(new Option('Chọn tab Limbo',''),...all.map(t=>new Option(`Limbo · tab ${t.id}${t.active?' · đang mở':''}`,String(t.id))));
 if(all.some(t=>String(t.id)===previous))source=previous;else source=String(all.find(t=>t.active)?.id|| (all.length===1?all[0].id:''));
 tabs.value=source;void updateMonitor();if(previous!==source){mounted=false;app.replaceChildren()}
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
 }catch(error){globalThis.LimboLog?.emit('panel.sync.error',{error,selected,action,config},'error');connection.textContent='Chưa kết nối. Reload tiện ích rồi F5 tab Limbo; sau đó mở lại panel.';app.replaceChildren();mounted=false}
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

const monitorCards=document.getElementById('monitorCards'),monitorCount=document.getElementById('monitorCount');
const stateNames={OFF:'Đã tắt',PREPARE:'Chuẩn bị',WAIT_START:'Chờ xác nhận',RUNNING:'Đang chạy',WAIT_IDLE:'Chờ chạy lại',STOPPING:'Đang dừng',RELOADING:'Đang reload'};
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function monitorCard(tab,data){
 const card=node('article',undefined,'tab-card'+(String(tab.id)===source?' selected':''));
 const head=node('div',undefined,'card-head'),choose=node('button','Tab '+tab.id+' · ×'+(data?.config?.target??'—'));
 choose.type='button';choose.title='Chọn tab để xem cấu hình';choose.onclick=()=>{tabs.value=String(tab.id);tabs.onchange();void updateMonitor()};
 head.append(choose,node('span',data?(stateNames[data.state]||'Không xác định'):'Mất kết nối','badge '+(!data?'error':data.state==='RUNNING'?'running':'')));card.append(head);
 if(data){
  const currency=data.wallet?.currency?.toUpperCase()||'',stats=data.wallet?.displayedStats;
  const format=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(8):'—';
  const metrics=node('div',undefined,'card-metrics');
  metrics.append(node('span','Cược: '+format(data.amount)+' '+currency),node('span','Đã bắt đầu: '+data.cycles+' lượt'));
  const totals=node('div',undefined,'card-metrics');
  totals.append(node('span','Profit: '+format(stats?.profit)+' '+currency,stats?.profit>0?'positive':stats?.profit<0?'negative':''),node('span','Volume: '+format(stats?.volume)));
  card.append(metrics,totals,node('div',data.status,'card-status'));
 }else card.append(node('div','Tab đang tải hoặc chưa có kết nối. F5 tab nếu vừa cập nhật extension.','card-status'));
 return card;
}
async function updateMonitor(){
 if(monitorBusy)return;monitorBusy=true;
 const current=[...monitoredTabs];
 try{
  const snapshots=await Promise.all(current.map(async tab=>{
   let timer;
   try{return await Promise.race([chrome.tabs.sendMessage(tab.id,{type:'limbo-monitor'}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2500)})]);}catch(error){globalThis.LimboLog?.emit('monitor.tab.error',{tabId:tab.id,error},'error');return null}finally{clearTimeout(timer)}
  }));
  if(current.length!==monitoredTabs.length||current.some((t,i)=>t.id!==monitoredTabs[i]?.id))return;
  monitorCount.textContent=current.length+' tab · '+snapshots.filter(s=>s?.state==='RUNNING').length+' đang chạy';
  monitorCards.replaceChildren(...current.map((tab,i)=>monitorCard(tab,snapshots[i])));
  if(!current.length)monitorCards.append(node('p','Mở các tab Limbo trên tên miền đã cài để theo dõi tại đây.','monitor-empty'));
 }finally{monitorBusy=false;}
}
setInterval(()=>void updateMonitor(),1500);
setInterval(()=>void refresh().catch(()=>{}),5000);

document.getElementById('debugLogs').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('debug.html')});
