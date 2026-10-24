(() => {
 const defaults={amount:.001,tp:10,sl:10,target:325,limit:0,winMode:'reset',win:0,lossMode:'increase',loss:.34,reload:0};
 const fields=Object.keys(defaults),key='limboSavedConfigsV1';
 function parse(raw){
  const config={};
  for(const k of fields){
   if(k.endsWith('Mode'))config[k]=raw?.[k];
   else {const text=String(raw?.[k]??'').trim().replace(',','.');config[k]=/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)?Number(text):NaN;}
  }
  return config;
 }
 function valid(c){return !!c&&fields.every(k=>k.endsWith('Mode')?['reset','increase'].includes(c[k]):Number.isFinite(c[k]))&&c.amount>0&&Number(c.amount.toFixed(8))===c.amount&&c.tp>0&&c.sl>0&&c.amount<=c.sl&&c.target>=1.01&&c.target<=1000000&&c.win>=0&&c.loss>=0&&Number.isInteger(c.limit)&&c.limit>=0&&Number.isInteger(c.reload)&&c.reload>=0;}
 const clean=rows=>Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&typeof r.name==='string'&&valid(r.config)).slice(0,100):[];
 let queue=Promise.resolve();
 async function list(){const data=await chrome.storage.local.get(key);return clean(data[key]);}
 function change(fn){const next=queue.then(async()=>{const rows=await list();fn(rows);await chrome.storage.local.set({[key]:rows});return rows;});queue=next.catch(()=>{});return next;}
 function save(name,config,id){
  name=String(name).trim().slice(0,100);if(!name||!valid(config))return Promise.reject(Error('Tên và cấu hình chưa hợp lệ.'));
  return change(rows=>{const existing=rows.find(r=>r.id===id);if(id&&!existing)throw Error('Mẫu đã bị xóa.');if(existing)Object.assign(existing,{name,config:{...config}});else {if(rows.length>=100)throw Error('Tối đa 100 mẫu.');rows.push({id:crypto.randomUUID(),name,config:{...config}});}});
 }
 function rename(id,name){name=String(name).trim().slice(0,100);if(!name)return Promise.reject(Error('Nhập tên mẫu.'));return change(rows=>{const row=rows.find(r=>r.id===id);if(!row)throw Error('Chọn mẫu cần đổi tên.');row.name=name;});}
 const remove=id=>change(rows=>{const i=rows.findIndex(r=>r.id===id);if(i<0)throw Error('Chọn mẫu cần xóa.');rows.splice(i,1);});
 globalThis.LimboConfigs={defaults,fields,parse,valid,list,save,rename,remove};
})();
