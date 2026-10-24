(() => {
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},clock=t=>new Date(t).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});
 function aggregate(rows,minutes){const map=new Map();for(const c of rows){const t=Math.floor(c.time/(minutes*60000))*minutes*60000;let a=map.get(t);if(!a){a={...c,time:t};map.set(t,a);}else{a.high=Math.max(a.high,c.high);a.low=Math.min(a.low,c.low);if(c.first<a.first){a.first=c.first;a.open=c.open;}if(c.last>=a.last){a.last=c.last;a.close=c.close;}a.samples+=c.samples;}}return [...map.values()].sort((a,b)=>a.time-b.time);}
 function render(root,rows){
  root.replaceChildren();if(!rows?.length){root.append(el('p','Chưa có mẫu số dư cho ngày này. Tool bắt đầu lấy mẫu sau khi cập nhật và F5 tab; không khôi phục số dư quá khứ.','hint'));return;}
  const streams=[...new Set(rows.map(r=>r.host+' / '+r.currency))],picker=el('select'),controls=el('div',undefined,'editor-actions'),plot=el('div',undefined,'balance-plot'),summary=el('p',undefined,'balance-summary'),readout=el('p',undefined,'hint');let minutes=5,stream=streams[0];
  for(const s of streams){const o=el('option',s);o.value=s;picker.append(o);}picker.setAttribute('aria-label','Tên miền và loại tiền');picker.onchange=()=>{stream=picker.value;draw();};controls.append(picker);
  for(const n of [5,15,60]){const b=el('button',n+' phút');b.type='button';b.dataset.minutes=n;b.onclick=()=>{minutes=n;draw();};controls.append(b);}
  const tableDetails=el('details',undefined,'daily-detail'),tableHolder=el('div');tableDetails.append(el('summary','Bảng số dư theo thời gian'),tableHolder);
  root.append(controls,summary,plot,readout,tableDetails,el('p','Nến từ số dư ví quan sát khoảng mỗi 10 giây. Xanh: đóng ≥ mở; đỏ: đóng < mở. Không cộng số dư giữa các tab. Khoảng không có mẫu để trống; biến động có thể gồm cược, nạp/rút và thao tác khác. Tách theo tên miền/loại tiền; tool chưa xác minh danh tính tài khoản.','editor-note'));
  function draw(){
   const candles=aggregate(rows.filter(r=>r.host+' / '+r.currency===stream),minutes),first=candles[0],last=candles.at(-1),delta=last.close-first.open;
   summary.textContent='Đầu: '+first.open.toFixed(8)+' → Cuối: '+last.close.toFixed(8)+' · Tăng/giảm: '+(delta>=0?'+':'')+delta.toFixed(8)+' '+first.currency;
   for(const b of controls.querySelectorAll('button'))b.setAttribute('aria-pressed',String(Number(b.dataset.minutes)===minutes));
   const width=Math.max(280,Math.floor(plot.getBoundingClientRect().width)),height=270,left=78,right=15,top=16,bottom=38,span=width-left-right;
   const lo=Math.min(...candles.map(c=>c.low)),hi=Math.max(...candles.map(c=>c.high)),pad=Math.max((hi-lo)*.12,Math.abs(hi)*.0001,.00000001),min=lo-pad,max=hi+pad;
   const start=first.time-minutes*30000,end=last.time+minutes*30000,x=t=>left+(t-start)/(end-start)*span,y=v=>top+(max-v)/(max-min)*(height-top-bottom);
   const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label','Biểu đồ nến số dư '+stream);plot.replaceChildren(svg);
   const add=(tag,attrs,text)=>{const e=document.createElementNS(svg.namespaceURI,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;};
   for(let i=0;i<5;i++){const v=min+(max-min)*i/4,yy=y(v);add('line',{x1:left,x2:width-right,y1:yy,y2:yy,stroke:'#d4deea'});add('text',{x:left-8,y:yy+4,'text-anchor':'end',fill:'#334e69','font-size':12},v.toFixed(first.currency==='USDT'?2:6));}
   const ticks=width<480?2:4;for(let i=0;i<=ticks;i++){const t=start+(end-start)*i/ticks;add('text',{x:left+span*i/ticks,y:height-12,'text-anchor':i===0?'start':i===ticks?'end':'middle',fill:'#334e69','font-size':12},clock(t));}
   const candleWidth=Math.max(1,Math.min(18,span*minutes*60000/(end-start)*.65));
   for(const c of candles){const color=c.close>=c.open?'#087747':'#ba2139',xx=x(c.time);add('line',{x1:xx,x2:xx,y1:y(c.high),y2:y(c.low),stroke:color,'stroke-width':1.5});const rect=add('rect',{x:xx-candleWidth/2,y:Math.min(y(c.open),y(c.close)),width:candleWidth,height:Math.max(1,Math.abs(y(c.open)-y(c.close))),fill:color});const text=clock(c.time)+' · Mở '+c.open.toFixed(8)+' · Cao '+c.high.toFixed(8)+' · Thấp '+c.low.toFixed(8)+' · Đóng '+c.close.toFixed(8);const title=document.createElementNS(svg.namespaceURI,'title');title.textContent=text;rect.append(title);rect.onpointerenter=()=>readout.textContent=text;rect.onclick=()=>readout.textContent=text;}
   readout.textContent='Rê chuột / chạm nến để xem số dư. '+candles.length+' nến có dữ liệu.';
   const wrap=el('div',undefined,'monitor-table-wrap'),table=el('table',undefined,'monitor-table'),head=el('thead'),tr=el('tr');for(const t of ['Thời gian','Mở','Cao','Thấp','Đóng'])tr.append(el('th',t));head.append(tr);const body=el('tbody');for(const c of [...candles].reverse()){const tr=el('tr');for(const v of [clock(c.time),c.open.toFixed(8),c.high.toFixed(8),c.low.toFixed(8),c.close.toFixed(8)])tr.append(el('td',v));body.append(tr);}table.append(head,body);wrap.append(table);tableHolder.replaceChildren(wrap);
  }
  requestAnimationFrame(draw);const observer=new ResizeObserver(()=>{if(root.isConnected&&root.getBoundingClientRect().width)draw();else if(!root.isConnected)observer.disconnect();});observer.observe(plot);
 }
 globalThis.LimboBalanceUI={render,aggregate};
})();
