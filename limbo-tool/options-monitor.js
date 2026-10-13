let monitorBusy=false;
const monitorCards=document.getElementById('monitorCards'),monitorCount=document.getElementById('monitorCount');
const stateNames={OFF:'Tool đã tắt',PREPARE:'Chuẩn bị',WAIT_START:'Chờ xác nhận',RUNNING:'Đang chạy',WAIT_IDLE:'Chờ chạy lại',STOPPING:'Đang dừng',RELOADING:'Đang reload'};
function node(tag,text,className){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;}
function monitorCard(tab,data){
 const card=node('article',undefined,'tab-card');
 const installedVersion=chrome.runtime.getManifest?.().version;
 const head=node('div',undefined,'card-head'),choose=node('button','Tab '+tab.id+' · ×'+(data?.config?.target??'—'));
 choose.type='button';choose.title='Mở tab Limbo';choose.onclick=async()=>{await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true})};
 const gameState=data?.native?.state;
 const label=!data?'Mất kết nối':gameState==='RUNNING'?'Game đang chạy':gameState==='IDLE'?'Game đã dừng':data.native?'Game chưa xác định':'Game chưa xác minh';
 head.append(choose,node('span',label,'badge '+(!data?'error':gameState==='RUNNING'?'running':'')));card.append(head);
 const url=tab.url||'';
 if(/^https:\/\//.test(url)){const link=node('a',url,'card-status');link.href=url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);}
 if(data)card.append(node('div','Tool: '+(stateNames[data.state]||'Không xác định')+(data.state==='OFF'&&gameState==='RUNNING'?' · không tự chạy lại lượt tiếp theo':''),'tool-status'));
 if(data){
  if(data.observerVersion&&installedVersion&&data.observerVersion!==installedVersion)card.append(node('div','Tab đang dùng observer v'+data.observerVersion+'; F5 tab để đồng bộ v'+installedVersion+'.','sync-warning'));
  const currency=data.wallet?.currency?.toUpperCase()||'',stats=data.wallet?.displayedStats;
  const format=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(8):'—';
  const metrics=node('div',undefined,'card-metrics');
  metrics.append(node('span','Cược: '+format(data.amount)+' '+currency),node('span','Đã bắt đầu: '+data.cycles+' lượt'));
  const totals=node('div',undefined,'card-metrics');
  totals.append(node('span','Profit: '+format(stats?.profit)+' '+currency,stats?.profit>0?'positive':stats?.profit<0?'negative':''),node('span','Volume: '+format(stats?.volume)));
  card.append(metrics,totals,node('div',data.status,'card-status'));
  card.append(node('div','Số dư: '+format(data.wallet?.amount)+' '+currency+' · TP: '+format(data.config?.tp)+' · SL: '+format(data.config?.sl)+' · Giới hạn: '+(data.config?.limit??'—'),'card-status'));
  card.append(node('div','Dữ liệu: '+(data.time?new Date(data.time).toLocaleTimeString('vi-VN'):'—'),'hint'));
 }else card.append(node('div','Tab đang tải hoặc chưa có kết nối. F5 tab nếu vừa cập nhật extension.','card-status'));
 return card;
}
async function updateMonitor(){
 if(monitorBusy||document.getElementById('monitor').hidden)return;monitorBusy=true;
 try{
  const current=(await chrome.tabs.query({url:await LimboDomains.patterns()})).filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''));
  const snapshots=await Promise.all(current.map(async tab=>{
   let timer;
   try{return await Promise.race([chrome.tabs.sendMessage(tab.id,{type:'limbo-monitor'}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2500)})]);}catch(error){globalThis.LimboLog?.emit('monitor.tab.error',{tabId:tab.id,error},'error');return null}finally{clearTimeout(timer)}
  }));
  monitorCount.textContent=current.length+' tab · '+snapshots.filter(s=>s?.native?.state==='RUNNING').length+' game đang chạy · '+snapshots.filter(s=>s&&!s.native||s?.native?.state==='UNKNOWN').length+' chưa xác minh';
  monitorCards.replaceChildren(...current.map((tab,i)=>monitorCard(tab,snapshots[i])));
  if(!current.length)monitorCards.append(node('p','Mở các tab Limbo trên tên miền đã cài để theo dõi tại đây.','monitor-empty'));
 }catch(error){monitorCount.textContent='Không đọc được danh sách tab';globalThis.LimboLog?.emit('monitor.refresh.error',{error},'error')}finally{monitorBusy=false;}
}



document.getElementById('monitorRefresh').onclick=()=>void updateMonitor();
setInterval(()=>void updateMonitor(),1500);
