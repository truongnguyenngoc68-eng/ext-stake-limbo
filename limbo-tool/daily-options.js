(() => {
 const root=document.getElementById('dailyHistory'),el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 let busy=false;
 const toolbar=el('div',undefined,'toolbar'),intro=el('div');intro.append(el('h2','Nhật ký theo ngày'),el('p','Hiện tất cả ngày · mới nhất ở trên · giờ Việt Nam · gộp tất cả tab','hint'));
 const refresh=el('button','Làm mới');refresh.type='button';refresh.onclick=()=>void load();toolbar.append(intro,refresh);
 const list=el('div'),feedback=el('p',undefined,'monitor-feedback');feedback.setAttribute('role','status');
 root.append(toolbar,list,feedback,el('p','Bắt đầu ghi từ bản 1.8.0. Tổng chỉ gồm cược đã nhận được phản hồi xác nhận; không cộng số cũ trên biểu đồ. Lịch sử trước đó vẫn giữ ở mục bên dưới.','editor-note'));
 function table(tabs){const wrap=el('div',undefined,'monitor-table-wrap'),table=el('table',undefined,'monitor-table'),head=el('thead'),row=el('tr');for(const label of ['Tab','Loại tiền','Vol','Lãi/lỗ','Số ván'])row.append(el('th',label));head.append(row);const body=el('tbody');for(const [id,t]of Object.entries(tabs))for(const [currency,s]of Object.entries(t.currencies)){const tr=el('tr');for(const value of [id,currency,s.volume.toFixed(8),s.profit.toFixed(8),String(s.bets)])tr.append(el('td',value));body.append(tr);}table.append(head,body);wrap.append(table);return wrap;}
 function render(days){
  const opened=new Set([...list.querySelectorAll('details[open]')].map(d=>d.dataset.key));list.replaceChildren();
  if(!days.length){list.append(el('div','Chưa có nhật ký ngày. Dữ liệu sẽ tự xuất hiện khi tool ghi nhận cược hoặc sự kiện mới.','config-empty'));return;}
  for(const day of days){
   const section=el('section',undefined,'daily-day');section.append(el('h3',day.date.split('-').reverse().join('/')+' · '+Object.keys(day.tabs).length+' tab'));
   const totals=el('div',undefined,'daily-totals');
   for(const [currency,t]of Object.entries(day.currencies)){const card=el('article',undefined,'daily-total');card.append(el('h3',currency),el('p','Tổng Vol: '+t.volume.toFixed(8)),el('p','Lãi/lỗ: '+t.profit.toFixed(8),t.profit<0?'negative':'positive'),el('p','Số ván: '+t.bets));totals.append(card);}
   if(!Object.keys(day.currencies).length)totals.append(el('p','Chưa có cược được ghi nhận trong ngày này.','hint'));section.append(totals);
   if(day.issues)section.append(el('p','⚠ '+day.issues+' cảnh báo / khoảng có thể thiếu dữ liệu.','sync-warning'));
   const balance=el('details',undefined,'daily-detail'),chart=el('div');balance.dataset.key=day.date+'-balance';balance.append(el('summary','Biểu đồ nến số dư theo thời gian'),chart);let balanceLoaded=false;balance.ontoggle=async()=>{if(!balance.open||balanceLoaded)return;balanceLoaded=true;chart.textContent='Đang đọc số dư…';try{const out=await chrome.runtime.sendMessage({type:'limbo-daily-read',dates:[day.date]});if(!out?.ok)throw Error(out?.error||'Không đọc được mẫu số dư.');LimboBalanceUI.render(chart,out.balances||[]);}catch(error){balanceLoaded=false;chart.textContent=error.message;}};balance.open=opened.has(balance.dataset.key);section.append(balance);
   const tabs=el('details',undefined,'daily-detail');tabs.dataset.key=day.date+'-tabs';tabs.append(el('summary','Chi tiết từng tab'),table(day.tabs));tabs.open=opened.has(tabs.dataset.key);section.append(tabs);
   const events=el('details',undefined,'daily-detail');events.dataset.key=day.date+'-events';const holder=el('div');events.append(el('summary','Nhật ký sự kiện ('+day.events+')'),holder);let loaded=false;
   events.ontoggle=async()=>{if(!events.open||loaded)return;loaded=true;holder.textContent='Đang đọc…';try{const out=await chrome.runtime.sendMessage({type:'limbo-daily-read',dates:[day.date]});if(!out?.ok)throw Error(out?.error||'Không đọc được sự kiện.');holder.replaceChildren();const ul=el('ul',undefined,'daily-events');for(const e of out.events){const li=el('li');li.append(el('strong',new Date(e.time).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+' · '+(e.tab!==null?'Tab '+e.tab+' · ':'')+e.name),el('p',e.detail));ul.append(li);}if(!out.events.length)ul.append(el('li','Chưa có sự kiện.'));holder.append(ul);if(day.events>200)holder.append(el('p','Hiện 200 sự kiện mới nhất; tổng cược vẫn gồm toàn bộ cược đã ghi.','hint'));}catch(error){loaded=false;holder.textContent=error.message;}};
   events.open=opened.has(events.dataset.key);section.append(events);list.append(section);
  }
 }
 async function load(){
  if(busy)return;busy=true;refresh.disabled=true;
  try{const out=await chrome.runtime.sendMessage({type:'limbo-daily-read'});if(!out?.ok)throw Error(out?.error||'Không đọc được nhật ký ngày. Reload extension rồi mở lại trang này.');render(out.days);const {limboDailyError}=await chrome.storage.local.get('limboDailyError');feedback.textContent=limboDailyError||'Đã hiện '+out.days.length+' ngày · lưu trên máy · '+new Date().toLocaleTimeString('vi-VN');}
  catch(error){feedback.textContent=error.message;}finally{busy=false;refresh.disabled=false;}
 }
 globalThis.LimboDailyUI={refresh:load};
})();
