// Persistent tab watchdog. No game controls are invoked here.
(() => {
  const key='limboTabHealth', alarm='limbo-health-1m';
  let chain=Promise.resolve();
  const serial=fn=>{const next=chain.then(fn);chain=next.catch(error=>LimboLog.emit('health.error',{error},'error'));return next;};
  const initial=()=>({tabs:{},queue:[]});
  async function load(){const data=await chrome.storage.local.get(key);return data[key]||initial();}
  async function save(data){await chrome.storage.local.set({[key]:data});}
  function incident(data,id,row,code,reason){
    if(row.incident===code)return;
    row.incident=code;
    void globalThis.LimboDailyStore?.record({kind:'event',tab:Number(id),name:'Tab bất thường: '+code,detail:reason,issue:true}).catch(()=>{});
    data.queue.push({id,code,reason:reason.slice(0,700),url:row.url,time:Date.now()});
    data.queue=data.queue.slice(-100);
  }
  function update(data,id,s,url){
    const now=Date.now(),old=data.tabs[id]||{},active=s.active===true;
    const safeUrl=new URL(url);safeUrl.search='';safeUrl.hash='';
    const row=data.tabs[id]={...old,url:safeUrl.href,lastSeen:now,active};
    if(s.online===false&&(active||old.active))incident(data,id,row,'offline','Trình duyệt báo mất kết nối mạng.');
    else if(!active&&old.active)incident(data,id,row,'stopped',s.reason||'Tool đã dừng; chưa xác định nguyên nhân.');
    else if(active&&s.state==='RUNNING'&&Number.isFinite(s.lastProgress)&&now-s.lastProgress>=90000)
      incident(data,id,row,'stalled','Auto vẫn hiện đang chạy nhưng không ghi nhận ván cược hoặc thay đổi tổng cược trong ít nhất 90 giây; có thể kết nối game bị gián đoạn.');
    else if(active&&s.online!==false)row.incident=null;
  }
  async function flush(data){
    const {telegram:t}=await chrome.storage.local.get('telegram');
    if(!t?.enabled||!LimboTelegram.settings(t).stopAlerts){data.queue=[];return;}
    if(data.retryAt>Date.now())return;
    while(data.queue.length){
      const item=data.queue[0];
      const text=['⚠️ LIMBO · TAB DỪNG / GIÁN ĐOẠN','Tab '+item.id,item.url||'', 'Lý do: '+item.reason,'Phát hiện: '+new Date(item.time).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),Date.now()-item.time>60000?'Cảnh báo gửi trễ sau khi kết nối Telegram hoạt động lại.':''].filter(Boolean).join('\n');
      try{
        const response=await fetch(`https://api.telegram.org/bot${t.token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:t.chat,text}),signal:AbortSignal.timeout(15000)});
        const result=await response.json();if(!response.ok||!result.ok)throw Error('Telegram từ chối cảnh báo');
        data.queue.shift();await save(data);
        await chrome.storage.local.set({telegramStatus:'Đã gửi cảnh báo tab '+item.id});
      }catch{
        data.retryAt=Date.now()+60000;
        await chrome.storage.local.set({telegramStatus:'Cảnh báo tab đang chờ gửi; sẽ thử lại khi kết nối hoạt động.'});break;
      }
    }
  }
  async function finish(data){await save(data);await flush(data);await save(data);}
  async function schedule(){await chrome.alarms.create(alarm,{delayInMinutes:1,periodInMinutes:1});}
  chrome.runtime.onInstalled.addListener(schedule);chrome.runtime.onStartup.addListener(schedule);
  chrome.runtime.onMessage.addListener((m,sender,reply)=>{
    if(m.type!=='limbo-health'||sender.id!==chrome.runtime.id||!sender.tab||sender.frameId!==0||!LimboDomains.validUrl(sender.url))return;
    if(!m.health||typeof m.health.active!=='boolean')return;
    serial(async()=>{const data=await load();update(data,sender.tab.id,m.health,sender.tab.url||sender.url);await finish(data);}).then(()=>reply({ok:true}),()=>reply({ok:false}));return true;
  });
  chrome.tabs.onRemoved.addListener(id=>serial(async()=>{const data=await load(),row=data.tabs[id];if(row?.active)incident(data,id,row,'closed','Tab đã bị đóng.');delete data.tabs[id];await finish(data);}));
  chrome.tabs.onUpdated.addListener((id,change)=>{if(!change.url&&!change.discarded)return;return serial(async()=>{
    const data=await load(),row=data.tabs[id];
    if(row?.active){
      if(change.discarded)incident(data,id,row,'discarded','Chrome đã giải phóng tab khỏi bộ nhớ (discarded).');
      else if(change.url&&!/\/casino\/games\/limbo\/?(?:\?|$)/.test(change.url)){incident(data,id,row,'navigation','Tab đã chuyển khỏi trang Limbo.');row.active=false;}
    }
    await finish(data);
  });});
  chrome.alarms.onAlarm.addListener(a=>{if(a.name!==alarm)return;return serial(async()=>{
    const data=await load();
    for(const [id,row]of Object.entries(data.tabs)){
      if(!row.active)continue;
      try{
        const s=await Promise.race([chrome.tabs.sendMessage(Number(id),{type:'limbo-health-read'}),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),5000))]);
        if(s&&typeof s.active==='boolean'){update(data,id,s,row.url);continue;}
      }catch{}
      if(Date.now()-row.lastSeen>=90000)incident(data,id,row,'unresponsive','Không nhận phản hồi từ tab trong ít nhất 90 giây; tab có thể bị treo, đang tải lại hoặc kết nối extension bị ngắt. Chưa xác định nguyên nhân chính xác.');
    }
    await finish(data);
  });});
})();
