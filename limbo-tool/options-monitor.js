let monitorBusy=false,selectedTab=null,dirty=false,presets=[],presetBusy=false;
const pending=new Set(),snapshotsByTab=new Map(),drafts=new Map();
const monitorCards=document.getElementById('monitorCards'),monitorCount=document.getElementById('monitorCount');
const stateNames={OFF:'Tool đã tắt',PREPARE:'Chuẩn bị',WAIT_START:'Chờ xác nhận',RUNNING:'Đang chạy',WAIT_IDLE:'Chờ chạy lại',RELOADING:'Đang reload'};
function node(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function button(text,fn){const b=node('button',text);b.type='button';b.onclick=fn;return b;}
const format=(n,d=8)=>Number.isFinite(n)?n.toFixed(d):'—';
const table=node('table',undefined,'monitor-table'),thead=node('thead'),tbody=node('tbody'),tr=node('tr');
for(const label of ['Tab / mục tiêu','Game / tool','Lãi / lỗ','Cược / tổng cược','Thao tác'])tr.append(node('th',label));thead.append(tr);table.append(thead,tbody);
const wrap=node('div',undefined,'monitor-table-wrap');wrap.append(table);monitorCards.replaceChildren(wrap);
const editor=node('section',undefined,'monitor-editor');editor.hidden=true;monitorCards.after(editor);
const title=node('h3'),editorState=node('p',undefined,'editor-state'),form=node('form'),grid=node('div',undefined,'editor-grid'),inputs={};
const labels={amount:'Tiền cược ban đầu',target:'Mục tiêu ×',tp:'TP',sl:'SL',winMode:'Khi thắng',win:'Tăng khi thắng %',lossMode:'Khi thua',loss:'Tăng khi thua %',limit:'Số cược (0 = ∞)',reload:'Reload sau (phút)'};
for(const [key,text]of Object.entries(labels)){
 const label=node('label',text),e=node(key.endsWith('Mode')?'select':'input');
 if(key.endsWith('Mode'))for(const [v,t]of [['reset','Cài đặt lại'],['increase','Tăng %']]){const o=node('option',t);o.value=v;e.append(o);}
 else {e.type='text';e.inputMode='decimal';e.autocomplete='off';}
 e.name=key;inputs[key]=e;label.append(e);grid.append(label);
}
const feedback=node('p',undefined,'monitor-feedback');feedback.setAttribute('role','status');
function say(text,error=false){feedback.textContent=text;feedback.classList.toggle('error',error);}
const apply=node('button','Lưu vào tab','monitor-primary');apply.type='submit';
const undo=button('Lấy lại từ tab',()=>{const data=snapshotsByTab.get(selectedTab)?.data;if(data){fill(data.config);dirty=false;remember();refreshEditor();say('Đã lấy lại cấu hình hiện tại.');}});
const formActions=node('div',undefined,'editor-actions');formActions.append(apply,undo);form.append(grid,formActions);
const library=node('div',undefined,'config-library'),presetLabel=node('label','Cấu hình đã lưu'),presetSelect=node('select'),nameLabel=node('label','Tên cấu hình'),nameInput=node('input');
nameInput.type='text';nameInput.maxLength=100;nameInput.placeholder='Ví dụ: 325× · TP/SL 10';presetLabel.append(presetSelect);nameLabel.append(nameInput);
const libraryActions=node('div',undefined,'editor-actions'),presetButtons=[];
for(const [action,text]of [['new','Lưu mẫu mới'],['update','Cập nhật mẫu'],['rename','Đổi tên'],['remove','Xóa mẫu']]){const b=button(text,()=>mutatePreset(action));b.dataset.presetAction=action;presetButtons.push(b);libraryActions.append(b);}
library.append(presetLabel,nameLabel,libraryActions);editor.append(title,editorState,library,form,node('p','Tắt tool không dừng lượt Auto trên game. Chờ game dừng trước khi sửa. Chọn mẫu chỉ điền thông số; bấm Lưu vào tab để áp dụng.','editor-note'),feedback);
library.replaceChildren(presetLabel,button('Mở Cấu hình / Lịch sử',()=>document.getElementById('configsTab').click()));
function values(){return Object.fromEntries(Object.entries(inputs).map(([k,e])=>[k,e.value]));}
function fill(c){for(const [k,e]of Object.entries(inputs))e.value=k==='amount'&&Number.isFinite(c[k])?c[k].toFixed(8):c[k]??'';}
function remember(){if(selectedTab!==null)drafts.set(selectedTab,{values:values(),dirty,preset:presetSelect.value,name:nameInput.value});}
function editable(data){return data?.ready!==false&&data?.state==='OFF'&&data?.native?.state==='IDLE'&&data?.observerVersion===chrome.runtime.getManifest?.().version;}
function refreshEditor(){
 if(selectedTab===null)return;const data=snapshotsByTab.get(selectedTab)?.data,allowed=editable(data)&&!pending.has(selectedTab);
 title.textContent='Cấu hình · Tab '+selectedTab+(dirty?' · Chưa lưu':'');
 editorState.textContent=!data?'Tab mất kết nối; giữ nguyên cấu hình nháp.':pending.has(selectedTab)?'Đang gửi lệnh…':allowed?'Sẵn sàng chỉnh cấu hình':data.state!=='OFF'?'Tool đang bật · tắt tool trước khi sửa.':'Chờ game dừng hoặc F5 tab để đồng bộ phiên bản.';
 for(const e of Object.values(inputs))e.disabled=!allowed;apply.disabled=!allowed;presetSelect.disabled=!allowed;undo.disabled=!data||pending.has(selectedTab);for(const b of presetButtons)b.disabled=presetBusy;
}
function selectTab(id){if(presetBusy)return;remember();selectedTab=id;editor.hidden=false;const saved=drafts.get(id),data=snapshotsByTab.get(id)?.data;fill(saved?.values||data?.config||LimboConfigs.defaults);dirty=saved?.dirty||false;presetSelect.value=saved?.preset||'';nameInput.value=saved?.name||'';say('');refreshEditor();editor.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
for(const event of ['input','change'])form.addEventListener(event,()=>{dirty=true;remember();refreshEditor();});nameInput.oninput=remember;
function renderPresets(){const selected=presetSelect.value;presetSelect.replaceChildren();const empty=node('option','Chọn cấu hình đã lưu…');empty.value='';presetSelect.append(empty);for(const p of presets){const o=node('option',p.name+' · '+p.config.target+'×');o.value=p.id;presetSelect.append(o);}presetSelect.value=presets.some(p=>p.id===selected)?selected:'';}
async function loadPresets(){try{presets=await LimboConfigs.list();renderPresets();}catch{say('Không đọc được danh sách cấu hình đã lưu.',true);}}
presetSelect.onchange=()=>{const p=presets.find(p=>p.id===presetSelect.value);if(p&&editable(snapshotsByTab.get(selectedTab)?.data)){fill(p.config);nameInput.value=p.name;dirty=true;remember();refreshEditor();say('Đã điền mẫu; kiểm tra rồi bấm Lưu vào tab.');}};
async function mutatePreset(action){
 if(presetBusy)return;presetBusy=true;refreshEditor();
 try{const id=presetSelect.value;
  if(action==='remove'){const p=presets.find(p=>p.id===id);if(!p)throw Error('Chọn mẫu cần xóa.');if(!confirm('Xóa mẫu “'+p.name+'”?'))return;presets=await LimboConfigs.remove(id);}
  else if(action==='rename')presets=await LimboConfigs.rename(id,nameInput.value);
  else {const c=LimboConfigs.parse(values());if(!LimboConfigs.valid(c))throw Error('Thông số chưa hợp lệ; chưa lưu mẫu.');if(action==='update'&&!id)throw Error('Chọn mẫu cần cập nhật.');presets=await LimboConfigs.save(nameInput.value,c,action==='update'?id:undefined);}
  renderPresets();if(action==='new')presetSelect.value=presets.at(-1).id;remember();say('Đã lưu danh sách cấu hình trên máy.');
 }catch(error){say(error.message,true);}finally{presetBusy=false;refreshEditor();}
}
async function sendControl(id,action,config){
 if(action==='start'&&drafts.get(id)?.dirty){selectTab(id);say('Lưu vào tab hoặc Lấy lại từ tab trước khi bật tool.',true);return null;}
 if(pending.has(id))return null;pending.add(id);refreshEditor();
 try{let timer,result;try{result=await Promise.race([chrome.tabs.sendMessage(id,{type:'limbo-control',action,config}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Tab chưa phản hồi; kiểm tra trạng thái trước khi gửi lại.')),5000);})]);}finally{clearTimeout(timer);}
  if(!result?.ok)throw Error(result?.error||'Lệnh chưa được xác nhận.');
  if(selectedTab===id)say(action==='stop'?'Đã tắt tool; lượt Auto trên game vẫn tiếp tục.':action==='start'?'Tab đã nhận lệnh bật tool; đang kiểm tra trước khi bắt đầu.':'Đã lưu cấu hình vào tab '+id+'.');return result;
 }catch(error){if(selectedTab===id)say(error.message,true);else alert('Tab '+id+': '+error.message);return null;}
 finally{pending.delete(id);await updateMonitor();refreshEditor();}
}
form.onsubmit=async e=>{e.preventDefault();const id=selectedTab;if(!editable(snapshotsByTab.get(id)?.data))return say('Tab chưa sẵn sàng chỉnh cấu hình.',true);const config=LimboConfigs.parse(values());if(!LimboConfigs.valid(config))return say('Kiểm tra cược > 0 và ≤ SL, TP/SL > 0, mục tiêu ≥ 1,01, % ≥ 0; số cược/reload nguyên ≥ 0.',true);const submitted=JSON.stringify(values()),result=await sendControl(id,'save',config);if(result&&selectedTab===id&&JSON.stringify(values())===submitted){fill(result.config);dirty=false;remember();refreshEditor();}};
function monitorRow(tab,data){
 const row=node('tr',undefined,'tab-card');row.dataset.tabId=tab.id;row.classList.toggle('row-selected',selectedTab===tab.id);
 const installed=chrome.runtime.getManifest?.().version,compatible=!!data&&data.observerVersion===installed,game=data?.native?.state;
 const first=node('td'),header=node('div',undefined,'card-head'),choose=button('Tab '+tab.id,async()=>{await chrome.tabs.update(tab.id,{active:true});await chrome.windows.update(tab.windowId,{focused:true});});choose.title='Mở tab Limbo';header.append(choose);first.append(header,node('strong','×'+(data?.config?.target??'—'),'target-value'));
 if(/^https:\/\//.test(tab.url||'')){const link=node('a',new URL(tab.url).host,'card-status');link.href=tab.url;link.target='_blank';link.rel='noopener noreferrer';first.append(link);}
 const state=node('td');state.append(node('span',!data?'Mất kết nối':game==='RUNNING'?'Game đang chạy':game==='IDLE'?'Game đã dừng':'Game chưa xác minh','badge '+(!data?'error':game==='RUNNING'?'running':'')));
 if(data){state.append(node('div',data.state==='OFF'?'Tool đã tắt':'Tool: '+(stateNames[data.state]||'Không xác định'),'tool-status'));if(data.state==='OFF'&&game==='RUNNING')state.append(node('div','Không tự chạy lại lượt tiếp theo','card-status'));if(!compatible)state.append(node('div','F5 tab để đồng bộ v'+installed+'.','sync-warning'));}
 const profit=node('td'),currency=data?.wallet?.currency?.toUpperCase()||'',stats=data?.wallet?.displayedStats;profit.append(node('strong',(stats?.profit>0?'+':'')+format(stats?.profit,4),'profit-value '+(stats?.profit<0?'negative':stats?.profit>0?'positive':'')),node('span',currency,'cell-caption'));
 const metrics=node('td');metrics.append(node('strong',format(data?.amount),'stake-value'),node('span','Vol: '+format(stats?.volume,4),'cell-caption'),node('span','Lượt: '+(data?.cycles??'—'),'cell-caption'));
 const actions=node('td'),controls=node('div',undefined,'row-actions'),on=data?.state!=='OFF';
 const toggle=button(on?'Tắt tool':'Bật tool',()=>sendControl(tab.id,on?'stop':'start'));toggle.dataset.control='toggle';toggle.className=on?'monitor-stop':'monitor-primary';toggle.disabled=!compatible||data?.ready===false||pending.has(tab.id)||(!on&&game!=='IDLE');
 const edit=button('Sửa',()=>selectTab(tab.id));edit.dataset.control='edit';edit.disabled=!data;edit.setAttribute('aria-label','Sửa cấu hình tab '+tab.id);controls.append(toggle,edit);actions.append(controls);
 const detail=node('details',undefined,'row-details');detail.append(node('summary','Chi tiết'),node('p',data?.reason||data?.status||'Tab chưa có kết nối.','card-status'),node('p','Số dư: '+format(data?.wallet?.amount)+' '+currency+' · TP: '+format(data?.config?.tp)+' · SL: '+format(data?.config?.sl)+' · Giới hạn: '+(data?.config?.limit??'—'),'card-status'),node('p','Dữ liệu: '+(data?.time?new Date(data.time).toLocaleTimeString('vi-VN'):'—'),'card-status'));actions.append(detail);row.append(first,state,profit,metrics,actions);return row;
}
async function updateMonitor(){
 if(monitorBusy||document.getElementById('monitor').hidden)return;monitorBusy=true;
 try{
  const tabs=(await chrome.tabs.query({url:await LimboDomains.patterns()})).filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''));
  const snapshots=await Promise.all(tabs.map(async tab=>{let timer;try{return await Promise.race([chrome.tabs.sendMessage(tab.id,{type:'limbo-monitor'}),new Promise(resolve=>{timer=setTimeout(()=>resolve(null),2500);})]);}catch{return null;}finally{clearTimeout(timer);}}));
  snapshotsByTab.clear();tabs.forEach((tab,i)=>snapshotsByTab.set(tab.id,{tab,data:snapshots[i]}));
  monitorCount.textContent=tabs.length+' tab · '+snapshots.filter(s=>s?.native?.state==='RUNNING').length+' game đang chạy · '+snapshots.filter(s=>!s||!s.native||s.native.state==='UNKNOWN').length+' chưa xác minh';
  const opened=new Set([...tbody.children].filter(r=>r.querySelector('details')?.open).map(r=>r.dataset.tabId));
  tbody.replaceChildren(...tabs.map((tab,i)=>monitorRow(tab,snapshots[i])));for(const row of tbody.children)if(opened.has(row.dataset.tabId))row.querySelector('details').open=true;
  if(!tabs.length){const row=node('tr'),cell=node('td','Mở các tab Limbo trên tên miền đã cài để theo dõi tại đây.','monitor-empty');cell.colSpan=5;row.append(cell);tbody.append(row);}
  if(selectedTab!==null&&!dirty){const data=snapshotsByTab.get(selectedTab)?.data;if(data?.config&&!form.contains(document.activeElement))fill(data.config);}refreshEditor();
 }catch(error){monitorCount.textContent='Không đọc được danh sách tab';globalThis.LimboLog?.emit('monitor.refresh.error',{error},'error');}finally{monitorBusy=false;}
}
document.getElementById('monitorRefresh').onclick=()=>void updateMonitor();setInterval(()=>void updateMonitor(),1500);
if(typeof LimboConfigs!=='undefined')void loadPresets();
chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.limboSavedConfigsV1)void loadPresets();});
globalThis.LimboMonitor={async useConfig(id,config){
 if(drafts.get(id)?.dirty&&!confirm('Thay bản nháp chưa lưu của tab '+id+' bằng cấu hình này?'))return false;
 document.getElementById('monitorTab').click();await updateMonitor();
 if(!snapshotsByTab.has(id))throw Error('Tab đã đóng. Chọn lại tab đang mở.');
 selectTab(id);fill(config);dirty=true;remember();refreshEditor();say('Đã điền cấu hình. Chờ tool/game dừng rồi bấm Lưu vào tab; chưa bắt đầu Auto.');return true;
}};
