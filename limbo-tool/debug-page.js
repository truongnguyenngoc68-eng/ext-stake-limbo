'use strict';
const $=id=>document.getElementById(id);let handle=null,cursor=0,busy=false,enabled=false;
const errorText=e=>e?.stack||e?.message||String(e);
async function resume(){
 if(busy)return;
 try{
  handle=await LimboJournal.get('file');if(!handle)throw Error('Chưa chọn file.');
  if(await handle.requestPermission({mode:'readwrite'})!=='granted')throw Error('Chưa được cấp quyền đọc/ghi.');
  cursor=await LimboJournal.get('cursor')||0;enabled=true;await flush();
 }catch(e){enabled=false;$('status').textContent=errorText(e);LimboLog.emit('file.resume.error',{error:e},'error')}
}
$('choose').onclick=async()=>{
 if(busy)return;
 try{
  const [chosen]=[await showSaveFilePicker({suggestedName:'limbo-debug-'+new Date().toISOString().replace(/[:.]/g,'-')+'.jsonl',types:[{description:'JSON Lines',accept:{'application/json':['.jsonl']}}]})];
  // One file writer across all Debug pages. The lock is acquired during each append.
  await navigator.locks.request('limbo-debug-file',async()=>{handle=chosen;await LimboJournal.selectFile(handle);cursor=0;enabled=true;});await flush();
 }catch(e){if(e.name!=='AbortError'){enabled=false;$('status').textContent=errorText(e);LimboLog.emit('file.choose.error',{error:e},'error')}}
};
$('resume').onclick=resume;$('stop').onclick=()=>{enabled=false;$('status').textContent='Đã dừng stream. Journal vẫn ghi.'};
async function append(rows,target){
 const file=await target.getFile(),stream=await target.createWritable({keepExistingData:true});
 try{await stream.seek(file.size);if(file.size&&await file.slice(file.size-1).text()!=='\n')await stream.write('\n');await stream.write(rows.map(r=>JSON.stringify(r)+'\n').join(''));await stream.close()}catch(e){await stream.abort().catch(()=>{});throw e}
}
async function flush(){
 if(!enabled||busy)return;busy=true;
 try{await navigator.locks.request('limbo-debug-file',async()=>{
  const stored=await LimboJournal.get('file');if(!stored||!await stored.isSameEntry(handle)){enabled=false;throw Error('File đã đổi ở trang Debug khác. Bấm tiếp tục.');}
  cursor=await LimboJournal.get('cursor')||0;
  const rows=await LimboJournal.batch(cursor);
  if(rows.length){await append(rows,handle);cursor=rows.at(-1).id;await LimboJournal.set('cursor',cursor);$('latest').textContent=JSON.stringify(rows.at(-1),null,2)}
  $('status').textContent='Đang stream: '+handle.name+' · đã ghi đến id '+cursor+' · '+new Date().toLocaleTimeString('vi-VN');
 });}catch(e){enabled=false;$('status').textContent='Lỗi ghi file: '+errorText(e);LimboLog.emit('file.write.error',{error:e,cursor},'error')}finally{busy=false}
}
$('export').onclick=async()=>{
 try{
  const target=await showSaveFilePicker({suggestedName:'limbo-journal.jsonl'});
  const selected=await LimboJournal.get('file');if(selected&&await target.isSameEntry(selected))throw Error('Chọn file xuất khác file đang stream.');
  const end=await LimboJournal.latest(),stream=await target.createWritable();let after=0;
  try{for(;;){const rows=(await LimboJournal.batch(after)).filter(r=>r.id<=end);if(!rows.length)break;await stream.write(rows.map(r=>JSON.stringify(r)+'\n').join(''));after=rows.at(-1).id;}await stream.close()}catch(e){await stream.abort().catch(()=>{});throw e}
  $('status').textContent='Đã xuất journal đến id '+after;
 }catch(e){if(e.name!=='AbortError'){$('status').textContent=errorText(e);LimboLog.emit('file.export.error',{error:e},'error')}}
};
setInterval(()=>void flush(),1000);
chrome.storage.local.get('limboDebugHealth').then(({limboDebugHealth:h})=>{$('status').textContent=h?.error?'Journal lỗi: '+h.error:'Journal đang ghi. Chọn hoặc tiếp tục file để stream.'});
chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.limboDebugHealth?.newValue?.error)$('status').textContent='Journal lỗi: '+c.limboDebugHealth.newValue.error});
