(() => {
  const states = {
    idle: {color:'#8993a5',label:'Chưa chạy'},
    running: {color:'#39d99b',label:'Đang chạy'},
    error: {color:'#f06470',label:'Lỗi'},
    paused: {color:'#f4c35b',label:'Pause / đang Pause'}
  };
  function classify(live, connected) {
    if (connected === false) return 'error';
    if (live?.pausing || live?.paused) return 'paused';
    if (live?.running) return 'running';
    if (/error|lỗi|mất |gián đoạn|không đọc|không khớp|không kết nối|không tìm thấy|kiểm tra lại phiên|vòng đổi trong lúc/i.test(live?.message || '')) return 'error';
    return 'idle';
  }
  globalThis.SlideStatus = {states,classify};
  if (typeof document !== 'undefined') {
    let live = null, connected = null;
    function paint() {
      const status = classify(live, connected), info = states[status];
      const icon = document.querySelector('.slide-mascot');
      if (icon) {icon.removeAttribute('aria-hidden');icon.dataset.status=status;icon.title=info.label;icon.setAttribute('role','img');icon.setAttribute('aria-label','Trạng thái: '+info.label);}
      const dot = document.querySelector('.live-toolbar i');
      if (dot) {dot.dataset.status=status;dot.style.backgroundColor=info.color;dot.title=info.label;}
    }
    window.addEventListener('message', event => {
      if(event.source!==window.parent || event.origin!==location.origin || event.data?.channel!=='slide-lab')return;
      if(event.data.type==='live-state')live=event.data.data;
      else if(event.data.type==='status')connected=event.data.data?.ok===true;
      else return;
      paint();
    });
    new MutationObserver(paint).observe(document.getElementById('app'),{childList:true,subtree:true});
    paint();return;
  }
  const tabs = new Map(), images = new Map();
  function iconData(status) {
    if(images.has(status))return images.get(status);
    const canvas=new OffscreenCanvas(32,32),ctx=canvas.getContext('2d');
    ctx.fillStyle=states[status].color;ctx.beginPath();ctx.roundRect(0,0,32,32,8);ctx.fill();
    ctx.fillStyle='#101724';ctx.font='bold 24px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('S',16,17);
    const data=ctx.getImageData(0,0,32,32);images.set(status,data);return data;
  }
  async function update(tabId, status) {
    const target=Number.isInteger(tabId)?{tabId}:{};
    try {
      await chrome.action.setIcon({...target,imageData:iconData(status)});
      await chrome.action.setTitle({...target,title:'Slide Lab · '+states[status].label});
    } catch {}
  }
  globalThis.SlideStatus.markError=tabId=>{const tab=tabs.get(tabId)||{live:null};tab.connected=false;tab.status='error';tabs.set(tabId,tab);return update(tabId,'error');};
  update(null,'idle');
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type!=='slide-icon-status')return false;
    let allowed=false;
    try {const url=new URL(sender.url);allowed=sender.id===chrome.runtime.id&&Number.isInteger(sender.tab?.id)&&url.protocol==='https:'&&/\/casino\/games\/slide\/?$/.test(url.pathname);}catch{}
    if(!allowed||!['live-state','status'].includes(message.kind)){reply({ok:false});return false;}
    const tab=tabs.get(sender.tab.id)||{live:null,connected:null,status:null};
    if(message.kind==='live-state')tab.live=message.data;
    else tab.connected=message.data?.ok===true;
    const status=classify(tab.live,tab.connected);tabs.set(sender.tab.id,tab);
    if(status===tab.status){reply({ok:true});return false;}
    tab.status=status;update(sender.tab.id,status).then(()=>reply({ok:true}));return true;
  });
  chrome.tabs?.onRemoved?.addListener(tabId=>tabs.delete(tabId));
})();
