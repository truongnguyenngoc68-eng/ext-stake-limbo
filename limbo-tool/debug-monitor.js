'use strict';
(() => {
 const get=id=>document.getElementById(id);let rows=[],busy=false;
 function render(){
  const query=get('eventSearch').value.trim().toLowerCase();
  const filtered=rows.filter(row=>(!get('errorsOnly').checked||['error','warn'].includes(row.level))&&JSON.stringify(row).toLowerCase().includes(query));
  get('eventList').replaceChildren(...filtered.map(row=>{
   const item=document.createElement('details'),title=document.createElement('summary'),body=document.createElement('pre');
   title.textContent='#'+row.id+' · '+new Date(row.time||row.receivedAt).toLocaleTimeString('vi-VN')+' · '+(row.level||'info')+' · '+row.event+' · tab '+(row.tabId??'worker/page');
   if(row.level==='error')title.className='negative';
   body.textContent=JSON.stringify(row,null,2);item.append(title,body);return item;
  }));
  if(!filtered.length)get('eventList').textContent=rows.length?'Không có sự kiện khớp bộ lọc.':'Chưa có bản ghi. Đang chờ extension / tab gửi dữ liệu.';
 }
 async function refresh(){
  if(busy)return;busy=true;
  try{
   rows=await LimboJournal.recent(100);render();
   get('latest').textContent=rows.length?JSON.stringify(rows.find(r=>r.level==='error')||rows[0],null,2):'Chưa có chẩn đoán.';
   const last=rows[0],age=last?Math.max(0,Math.floor((Date.now()-(last.epoch||Date.parse(last.receivedAt||last.time)))/1000)):null;
   get('journalHealth').textContent=last?'Journal #'+last.id+' · '+age+' giây trước · '+rows.length+' bản ghi hiển thị'+(age>30?' · Chưa có sự kiện mới; kiểm tra kết nối tab.':''): 'Journal trống.';
   try{
    const health=await Promise.race([chrome.runtime.sendMessage({type:'limbo-debug-health'}),new Promise((_,reject)=>setTimeout(()=>reject(Error('Worker timeout')),2500))]);
    if(!health?.ok)throw Error('Worker chưa hỗ trợ kiểm tra kết nối');
    get('journalHealth').textContent+=' · Worker đã kết nối';
    if(!enabled&&!busyFile())get('status').textContent='Worker đã kết nối. Journal được đọc trực tiếp; chọn file để stream ra đĩa.';
   }catch(error){get('journalHealth').textContent+=' · Mất kết nối worker: '+error.message+' · Reload extension khi sẵn sàng, sau đó tải lại trang Debug.';}
  }catch(error){get('journalHealth').textContent='Không đọc được journal: '+error.message}finally{busy=false}
 }
 function busyFile(){return typeof handle!=='undefined'&&handle!==null;}
 get('eventSearch').oninput=render;get('errorsOnly').onchange=render;
 void refresh();void updateMonitor();setInterval(()=>void refresh(),1500);
})();
