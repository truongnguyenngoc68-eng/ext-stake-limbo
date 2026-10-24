(() => {
 const $=id=>document.getElementById(id),list=$('configList'),panel=$('configFormPanel'),status=$('configStatus');
 let rows=[],editingId=null,changed=false,busy=false,usingId=null;
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
 const btn=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=fn;return b;};
 const title=el('h3'),form=el('form'),nameLabel=el('label','Tên cấu hình'),name=el('input'),grid=el('div',undefined,'editor-grid'),fields={};
 name.name='configName';name.type='text';name.maxLength=100;name.required=true;name.placeholder='Ví dụ: 325x · vốn 100';nameLabel.append(name);
 const labels={amount:'Tiền cược ban đầu',target:'Mục tiêu ×',tp:'TP',sl:'SL',winMode:'Khi thắng',win:'Tăng khi thắng %',lossMode:'Khi thua',loss:'Tăng khi thua %',limit:'Số cược (0 = ∞)',reload:'Reload sau (phút)'};
 for(const [k,text]of Object.entries(labels)){const label=el('label',text),e=el(k.endsWith('Mode')?'select':'input');e.name=k;
  if(k.endsWith('Mode'))for(const [v,t]of [['reset','Cài đặt lại'],['increase','Tăng %']]){const o=el('option',t);o.value=v;e.append(o);}
  else {e.type='text';e.inputMode='decimal';e.autocomplete='off';}fields[k]=e;label.append(e);grid.append(label);
 }
 const save=el('button','Lưu cấu hình','monitor-primary');save.type='submit';const cancel=btn('Đóng',()=>{if(discard()){panel.hidden=true;changed=false;}}),actions=el('div',undefined,'editor-actions');actions.append(save,cancel);
 form.append(nameLabel,grid,actions);panel.append(title,el('p','Điền thông số rồi Lưu cấu hình. Việc lưu ở đây không thay đổi tab game.','editor-note'),form);
 const usePanel=el('section',undefined,'config-use'),useTitle=el('h3'),tabLabel=el('label','Tab Limbo đang mở'),tabSelect=el('select'),useButton=btn('Điền vào Monitor',useConfig);
 tabLabel.append(tabSelect);usePanel.append(useTitle,tabLabel,useButton,el('p','Chỉ điền thông số. Sang Monitor kiểm tra và bấm Lưu vào tab khi game đã dừng.','editor-note'));usePanel.hidden=true;list.after(usePanel);
 function say(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 function discard(){return !changed||confirm('Bỏ thay đổi chưa lưu của cấu hình đang sửa?');}
 function raw(){return Object.fromEntries(Object.entries(fields).map(([k,e])=>[k,e.value]));}
 function setBusy(value){busy=value;for(const e of $('configs').querySelectorAll('button,input,select'))e.disabled=value;}
 function open(row){if(busy||!discard())return;editingId=row?.id||null;name.value=row?.name||'';const c=row?.config||LimboConfigs.defaults;for(const [k,e]of Object.entries(fields))e.value=k==='amount'?c[k].toFixed(8):c[k];title.textContent=row?'Sửa cấu hình: '+row.name:'Tạo cấu hình mới';save.textContent=row?'Lưu thay đổi':'Lưu cấu hình';changed=false;panel.hidden=false;say('');panel.scrollIntoView?.({behavior:'smooth',block:'nearest'});name.focus();}
 form.addEventListener('input',()=>{changed=true;});form.addEventListener('change',()=>{changed=true;});
 form.onsubmit=async event=>{
  event.preventDefault();if(busy)return;const c=LimboConfigs.parse(raw()),label=name.value.trim();
  if(!label||!LimboConfigs.valid(c))return say('Nhập tên và kiểm tra: cược > 0 và ≤ SL; TP/SL > 0; mục tiêu ≥ 1,01; % ≥ 0; số cược/reload là số nguyên ≥ 0.',true);
  setBusy(true);
  try{rows=await LimboConfigs.save(label,c,editingId||undefined);editingId=editingId||rows.at(-1).id;changed=false;title.textContent='Sửa cấu hình: '+label;save.textContent='Lưu thay đổi';render();say('Đã lưu “'+label+'”. Lần sau mở tab Cấu hình / Lịch sử và bấm Sửa.');}
  catch(error){say(error.message,true);}finally{setBusy(false);}
 };
 async function remove(row){if(busy||!confirm('Xóa cấu hình “'+row.name+'”?'))return;setBusy(true);try{rows=await LimboConfigs.remove(row.id);if(editingId===row.id){panel.hidden=true;editingId=null;changed=false;}if(usingId===row.id)usePanel.hidden=true;render();say('Đã xóa cấu hình.');}catch(error){say(error.message,true);}finally{setBusy(false);}}
 function render(){
  $('configCount').textContent=rows.length+' cấu hình';list.replaceChildren();
  if(!rows.length){list.append(el('div','Chưa có cấu hình nào. Bấm “+ Tạo cấu hình mới”, điền thông số rồi lưu.','config-empty'));return;}
  const wrap=el('div',undefined,'monitor-table-wrap'),table=el('table',undefined,'monitor-table'),head=el('thead'),headRow=el('tr');for(const t of ['Tên cấu hình','Mục tiêu / cược','TP / SL','Khi thua','Thao tác'])headRow.append(el('th',t));head.append(headRow);const body=el('tbody');
  for(const row of rows){const tr=el('tr'),c=row.config,a=el('td'),b=el('td'),d=el('td'),e=el('td'),f=el('td');a.append(el('strong',row.name,'config-name'));b.append(el('strong',c.target+'×'),el('span',c.amount.toFixed(8),'cell-caption'));d.textContent=c.tp+' / '+c.sl;e.textContent=c.lossMode==='reset'?'Cài đặt lại':'Tăng '+c.loss+'%';const controls=el('div',undefined,'row-actions');const edit=btn('Sửa',()=>open(row));edit.className='monitor-primary';edit.dataset.configEdit=row.id;controls.append(edit,btn('Dùng cho tab',()=>chooseTab(row)),btn('Xóa',()=>remove(row)));f.append(controls);tr.append(a,b,d,e,f);body.append(tr);}
  table.append(head,body);wrap.append(table);list.append(wrap);
 }
 async function refresh(){try{rows=await LimboConfigs.list();render();}catch{say('Không đọc được danh sách cấu hình.',true);}}
 async function chooseTab(row){
  if(busy)return;usingId=row.id;useTitle.textContent='Dùng cấu hình: '+row.name;usePanel.hidden=false;tabSelect.replaceChildren();useButton.disabled=true;
  try{const tabs=(await chrome.tabs.query({url:await LimboDomains.patterns()})).filter(t=>/\/casino\/games\/limbo\/?(?:\?|$)/.test(t.url||''));for(const t of tabs){const o=el('option','Tab '+t.id+' · '+new URL(t.url).host);o.value=t.id;tabSelect.append(o);}useButton.disabled=!tabs.length;if(!tabs.length)say('Chưa có tab Limbo đang mở. Cấu hình vẫn đã được lưu.',true);}
  catch{say('Không đọc được danh sách tab Limbo.',true);}usePanel.scrollIntoView?.({behavior:'smooth',block:'nearest'});
 }
 async function useConfig(){if(busy)return;const row=rows.find(r=>r.id===usingId),id=Number(tabSelect.value);if(!row||!id)return;setBusy(true);try{await LimboMonitor.useConfig(id,row.config);}catch(error){say(error.message,true);}finally{setBusy(false);}}
 $('configNew').onclick=()=>open(null);
 chrome.storage.onChanged?.addListener((changes,area)=>{if(area==='local'&&changes.limboSavedConfigsV1)void refresh();});
 window.addEventListener('beforeunload',event=>{if(changed){event.preventDefault();event.returnValue='';}});
 globalThis.LimboConfigHistory={refresh};void refresh();
})();
