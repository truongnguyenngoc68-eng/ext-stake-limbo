(() => {
  const KEY = 'slide-lab-widget-layout-v1';
  const widgets = [
    {id:'progress',label:'Tiến độ cược',hint:'Bậc, W/L, tỷ lệ và lãi nếu thắng',selector:'.progress-table'},
    {id:'loss',label:'Chuỗi thua',hint:'Chuỗi hiện tại và dài nhất từng target',selector:'.live-loss-analysis'},
    {id:'history',label:'Kết quả & lịch sử',hint:'20 vòng gần đây · Kho lưu 50.000 vòng',selector:'#slide-round-history-host'}
  ];
  const defaults = () => ({order:widgets.map(w=>w.id),hidden:[]});
  function validate(value) {
    const valid = widgets.map(w=>w.id), order = [...new Set(value?.order || [])].filter(id=>valid.includes(id));
    return {order:[...order,...valid.filter(id=>!order.includes(id))],hidden:(value?.hidden||[]).filter(id=>valid.includes(id))};
  }
  let settings = defaults(), revised = false;
  try {settings=validate(JSON.parse(localStorage.getItem(KEY)));} catch {}
  const style = document.createElement('style');document.head.append(style);
  const button = document.createElement('button');button.type='button';button.className='widget-customize';button.textContent='⊞';button.title='Tùy chỉnh widget';button.setAttribute('aria-label','Tùy chỉnh widget');
  const dialog = document.createElement('dialog');dialog.className='widget-dialog';
  dialog.innerHTML='<div class="widget-dialog-heading"><h2>Tùy chỉnh trang đầu</h2><button type="button" class="widget-close" aria-label="Đóng tùy chỉnh">✕</button></div><p>Chọn widget cần xem và thứ tự hiển thị. Không ảnh hưởng phiên cược.</p><div class="widget-options"></div><div class="widget-dialog-actions"><button type="button" class="widget-default">Mặc định</button><button type="button" class="accent widget-done">Xong</button></div>';
  document.body.append(dialog);
  function paintOptions() {
    dialog.querySelector('.widget-options').replaceChildren(...settings.order.map((id,index)=>{
      const widget=widgets.find(w=>w.id===id),row=document.createElement('div');row.className='widget-option';
      const label=document.createElement('label'),check=document.createElement('input'),text=document.createElement('span'),title=document.createElement('b'),hint=document.createElement('small');
      check.type='checkbox';check.checked=!settings.hidden.includes(id);check.setAttribute('aria-label','Hiển thị '+widget.label);check.dataset.widget=id;
      check.addEventListener('change',()=>{settings.hidden=check.checked?settings.hidden.filter(value=>value!==id):[...settings.hidden,id];save();});
      title.textContent=widget.label;hint.textContent=widget.hint;text.append(title,hint);label.append(check,text);row.append(label);
      for(const [delta,caption] of [[-1,'↑'],[1,'↓']]) {
        const move=document.createElement('button');move.type='button';move.textContent=caption;move.setAttribute('aria-label',(delta<0?'Đưa lên: ':'Đưa xuống: ')+widget.label);move.disabled=index+delta<0||index+delta>=settings.order.length;
        move.addEventListener('click',()=>{[settings.order[index],settings.order[index+delta]]=[settings.order[index+delta],settings.order[index]];save();paintOptions();});row.append(move);
      }
      return row;
    }));
  }
  function mount() {
    const header=document.querySelector('main.compact>header');
    if(header&&button.parentElement!==header)header.append(button);
    let css='';
    for(const [index,id] of settings.order.entries()) {
      const widget=widgets.find(w=>w.id===id);
      css+='main.compact>'+widget.selector+'{order:'+(4+index)+';'+(settings.hidden.includes(id)?'display:none!important;':'')+'}';
    }
    const lossIndex=settings.order.indexOf('loss'),historyIndex=settings.order.indexOf('history');
    if(Math.abs(lossIndex-historyIndex)===1&&!settings.hidden.includes('loss')&&!settings.hidden.includes('history')) {
      css+='@media(min-width:520px){main.compact>.live-loss-analysis,main.compact>#slide-round-history-host{grid-column:span 1}}';
    }
    if(style.textContent!==css)style.textContent=css;
  }
  function save() {
    revised=true;localStorage.setItem(KEY,JSON.stringify(settings));
    chrome.storage.local.set({[KEY]:settings}).catch(()=>{});mount();
  }
  button.addEventListener('click',()=>{paintOptions();dialog.showModal();});
  for(const css of ['.widget-close','.widget-done'])dialog.querySelector(css).addEventListener('click',()=>dialog.close());
  dialog.querySelector('.widget-default').addEventListener('click',()=>{settings=defaults();save();paintOptions();});
  new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});
  chrome.storage.local.get(KEY).then(data=>{if(data[KEY]&&!revised){settings=validate(data[KEY]);localStorage.setItem(KEY,JSON.stringify(settings));mount();}}).catch(()=>{});
  mount();
})();
