(() => {
 let opening;
 function open(){return opening??=new Promise((resolve,reject)=>{const r=indexedDB.open('limbo-daily-journal',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('days')){r.result.createObjectStore('days',{keyPath:'date'});r.result.createObjectStore('bets');const events=r.result.createObjectStore('events',{autoIncrement:true});events.createIndex('date','date');}if(!r.result.objectStoreNames.contains('balances')){const b=r.result.createObjectStore('balances',{keyPath:'key'});b.createIndex('date','date');}};r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null;};resolve(r.result);};r.onerror=()=>{opening=null;reject(r.error);};r.onblocked=()=>{opening=null;reject(Error('Đóng trang lịch sử cũ rồi mở lại để nâng cấp dữ liệu.'));};});}
 async function record(raw){
  const e={...raw,time:Number.isFinite(raw.time)?raw.time:Date.now()};
  if(e.kind==='bet'&&!LimboDaily.valid(e))return;
  const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction(['days','bets','events'],'readwrite'),days=tx.objectStore('days'),bets=tx.objectStore('bets'),events=tx.objectStore('events');
   tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error||Error('Không lưu được nhật ký ngày.'));
   const save=()=>{const day=LimboDaily.date(e.time),get=days.get(day);get.onsuccess=()=>{days.put(LimboDaily.apply(get.result,e));if(e.kind==='bet')bets.put({date:day,time:e.time,tab:e.tab,currency:e.currency,amount:e.amount,payout:e.payout},e.id);else events.add({date:day,time:e.time,tab:e.tab??null,name:String(e.name||'Sự kiện').slice(0,100),detail:String(e.detail||'').slice(0,700),issue:!!e.issue});};};
   if(e.kind==='bet'){const get=bets.get(e.id);get.onsuccess=()=>{if(!get.result)save();};}else save();
  });
 }
 async function read(dates=[]){const db=await open();return new Promise((resolve,reject)=>{
  const tx=db.transaction(['days','events','balances'],'readonly'),get=tx.objectStore('days').getAll(),logs=[],balances=[];let rows=[];
  get.onsuccess=()=>{rows=get.result;};
  for(const date of dates.slice(0,31)){const cursor=tx.objectStore('events').index('date').openCursor(IDBKeyRange.only(date),'prev');let n=0;cursor.onsuccess=()=>{const c=cursor.result;if(!c||n++>=200)return;logs.push(c.value);c.continue();};}
  for(const date of dates.slice(0,31)){const b=tx.objectStore('balances').index('date').getAll(date);b.onsuccess=()=>balances.push(...b.result);}
  tx.oncomplete=()=>resolve({days:rows.sort((a,b)=>b.date.localeCompare(a.date)),events:logs.sort((a,b)=>b.time-a.time),balances:balances.sort((a,b)=>a.time-b.time)});tx.onerror=tx.onabort=()=>reject(tx.error);
 });}
 async function balance(s){
  if(!Number.isFinite(s.amount)||s.amount<0||s.amount>1e12||!Number.isFinite(s.time)||typeof s.currency!=='string'||!/^[a-z0-9]{1,15}$/i.test(s.currency)||typeof s.host!=='string')return;
  s={...s,currency:s.currency.toUpperCase()};const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(['days','balances'],'readwrite'),store=tx.objectStore('balances'),key=s.host+':'+s.currency+':'+Math.floor(s.time/60000)*60000,get=store.get(key),days=tx.objectStore('days'),date=LimboDaily.date(s.time);get.onsuccess=()=>store.put(LimboDaily.candle(get.result,s));const day=days.get(date);day.onsuccess=()=>{if(!day.result)days.put(LimboDaily.fresh(date));};tx.oncomplete=()=>resolve();tx.onerror=tx.onabort=()=>reject(tx.error);});
 }
 chrome.runtime.onMessage.addListener((m,s)=>{if(m.type==='limbo-history-snapshot'&&s.id===chrome.runtime.id&&s.tab&&(!s.frameId||s.frameId===0)&&globalThis.LimboDomains?.validUrl(s.url)&&m.snapshot?.ok)void balance({host:new URL(s.url).host,currency:m.snapshot.currency,amount:m.snapshot.amount,time:Date.now()}).catch(()=>{void chrome.storage.local.set({limboDailyError:'Không lưu được một số mẫu số dư; biểu đồ có thể thiếu.'});});});
 async function safe(e){try{await record(e);}catch{await chrome.storage.local.set({limboDailyError:'Có dữ liệu chưa lưu được. Xem Debug log; nhật ký có thể thiếu.'}).catch(()=>{});throw Error('Daily journal write failed');}}
 chrome.runtime.onMessage.addListener((m,s,reply)=>{
  if(m.type==='limbo-daily-read'&&s.id===chrome.runtime.id&&String(s.url||'').split(/[?#]/)[0]===chrome.runtime.getURL('options.html')){read(Array.isArray(m.dates)?m.dates.filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)):[]).then(data=>reply({ok:true,...data}),error=>reply({ok:false,error:String(error?.message||error)}));return true;}
 });
 chrome.runtime.onInstalled.addListener(()=>{void safe({kind:'event',name:'Cập nhật tool / bắt đầu ghi nhật ký',detail:'Ghi nhận từ thời điểm này; không truy hồi lịch sử cược cũ.',issue:true}).catch(()=>{});void chrome.alarms.clear('limbo-remote-1m');void chrome.storage.local.remove(['limboRemote','limboRemoteDone','limboRemoteAcks','limboRemoteStatus','limboRemoteSeen']);});
 chrome.runtime.onStartup.addListener(()=>void safe({kind:'event',name:'Mở lại Chrome',detail:'Khoảng Chrome tắt không được quan sát; kiểm tra nếu game có cược ngoài nhật ký.',issue:true}).catch(()=>{}));
 globalThis.LimboDailyStore={record:safe,read,balance};
 void chrome.alarms.clear('limbo-remote-1m').catch(()=>{});
 void chrome.storage.local.remove(['limboRemote','limboRemoteDone','limboRemoteAcks','limboRemoteStatus','limboRemoteSeen']).catch(()=>{});
})();
