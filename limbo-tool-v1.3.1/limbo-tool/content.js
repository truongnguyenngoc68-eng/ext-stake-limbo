(() => {
  'use strict';
  if (window.__limboRestart) return;
  window.__limboRestart = true;
  const visible=e=>!!e&&e.getClientRects().length>0;
  const one=id=>{const es=[...document.querySelectorAll(`[data-testid="${id}"]`)].filter(visible);return es.length===1?es[0]:null};
  const numeric=s=>String(s).trim()?Number(String(s).replace(',','.')):NaN;
  const money=s=>{const text=String(s).trim().replace(',','.');return /^(?:\d+(?:\.\d{1,8})?|\.\d{1,8})$/.test(text)?Number(text):NaN};
  const isLimbo=()=>/\/casino\/games\/limbo\/?$/.test(location.pathname);
  let statCycle='';
  function stat(event){try{if(typeof chrome!=='undefined'&&chrome.runtime?.sendMessage)void chrome.runtime.sendMessage({type:'limbo-stat-event',event}).catch(()=>{});}catch{}}
  function startStats(){
    statCycle=crypto.randomUUID();document.documentElement.setAttribute('data-limbo-stat-cycle',statCycle);
    stat({kind:'start',id:statCycle,currency:identity,tp:config.tp,sl:config.sl});
  }
  function endStats(reason){if(!statCycle)return;stat({kind:'end',id:statCycle,reason});statCycle='';document.documentElement.removeAttribute('data-limbo-stat-cycle');}
  window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin||event.data?.type!=='limbo-confirmed-bet-v1')return;const e=event.data.event;if(e&&['bet','issue','request'].includes(e.kind))stat(e);});
  window.addEventListener('pagehide',()=>endStats('other'));
  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((m,_s,reply)=>{
    if(m.type!=='limbo-wallet')return;
    const wallet=one('coin-toggle');const raw=wallet?.textContent.trim().replace(/\s/g,'')||'';
    const amount=/^\d+(?:[.,]\d{1,8})?$/.test(raw)?Number(raw.replace(',','.')):NaN;
    const readStat=id=>{const text=one(id)?.textContent.trim().replace(/\s/g,'')||'';return /^[+-]?\d+(?:[.,]\d{1,8})?$/.test(text)?Number(text.replace(',','.')):null};
    const volume=readStat('bets-stats-wagered'),profit=readStat('bets-stats-profit');
    const displayedStats=volume!==null&&volume>=0&&profit!==null?{volume,profit}:null;
    reply({ok:isLimbo()&&Number.isFinite(amount),amount,currency:wallet?.getAttribute('data-active-currency'),displayedStats,time:Date.now()});
  });
  const defaults={amount:0.001,tp:1.1,sl:1,target:9,limit:0,winMode:'reset',win:0,lossMode:'increase',loss:14,reload:0};
  const host=document.createElement('div');host.id='limbo-restart-tool';
  host.style.display='none';
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>
  :host{position:fixed;right:12px;bottom:12px;z-index:2147483647;font:14px Arial;color:white}
  section{width:min(300px,calc(100vw - 32px));box-sizing:border-box;background:#102633;border:1px solid #547184;border-radius:12px;padding:12px;box-shadow:0 4px 24px #0008}
  .body{max-height:65vh;overflow:auto}label{display:block;margin:10px 0 4px}input,select,button{box-sizing:border-box;padding:8px;border-radius:6px;border:1px solid #547184}
  input,select{width:100%;background:#071b27;color:white}button{cursor:pointer;background:#1475e1;color:white;width:100%;margin-top:8px}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:8px}p{font-size:12px;line-height:1.5}output{display:block;margin:10px 0;color:#b7e6ff;line-height:1.4}.head{display:flex;align-items:center;gap:8px}.head button{width:auto;margin:0;margin-left:auto}
  </style><section><div class="head"><strong>Limbo Auto · 1.3.1</strong><button id="collapse">Thu gọn</button></div><div class="body">
  <label>Tiền cược ban đầu<input id="amount" type="text" inputmode="decimal" autocomplete="off" value="0.001"></label><p id="amountPreview">Mức bắt đầu: 0.00100000 · có thể nhập 0.00001</p>
  <div class="pair"><label>TP<input id="tp" type="number" step="0.00000001" min="0" value="1.1"></label><label>SL<input id="sl" type="number" step="0.00000001" min="0" value="1"></label></div>
  <div class="pair"><label>Mục tiêu ×<input id="target" type="number" min="1.01" step="0.01" value="9"></label><label>Số cược (0 = ∞)<input id="limit" type="number" min="0" step="1" value="0"></label></div>
  <div class="pair"><label>Khi thắng<select id="winMode"><option value="reset">Cài đặt lại</option><option value="increase">Tăng %</option></select></label><label>Tăng khi thắng %<input id="win" type="number" min="0" step="0.01" value="0"></label></div>
  <div class="pair"><label>Khi thua<select id="lossMode"><option value="increase">Tăng %</option><option value="reset">Cài đặt lại</option></select></label><label>Tăng khi thua %<input id="loss" type="number" min="0" step="0.01" value="14"></label></div>
  <label>Tự reload sau bao nhiêu phút (0 = tắt)<input id="reload" type="number" min="0" step="1" value="0"></label>
  <p>Reload chờ lượt Auto hoàn thành. Sau reload tự mở Tự động/Nâng cao, kiểm tra cấu hình rồi chạy tiếp.</p>
  </div><button id="toggle">Bắt đầu Auto</button><output>Đang tắt</output><div class="body" id="extra"><button id="reloadNow">Reload khi lượt hoàn thành</button><button id="telegram">Telegram · số dư mỗi 3 phút</button><p>Tool áp dụng toàn bộ cấu hình trên khi bắt đầu và mỗi lần chạy lại. Bấm Dừng trên game sẽ tắt tool.</p></div></section>`;
  document.documentElement.append(host);
  const field=id=>root.querySelector('#'+id),status=root.querySelector('output');
  let state='OFF',config=null,startedAt=0,lastAction=0,stableAt=0,readyAt=0,runningSeen=false,cycles=0,identity='',reloadAt=0,reloadWanted=false,initialReady=true;
  const notice=t=>{status.textContent=t};
  const storageKey='limbo-auto-config-v2';
  const resumeKey='limbo-auto-reload-v2';
  const fields=Object.keys(defaults);
  const readConfig=()=>Object.fromEntries(fields.map(k=>[k,k.endsWith('Mode')?field(k).value:k==='amount'?money(field(k).value):numeric(field(k).value)]));
  function valid(c){return fields.every(k=>k.endsWith('Mode')?['reset','increase'].includes(c[k]):Number.isFinite(c[k]))&&c.amount>0&&Number(c.amount.toFixed(8))===c.amount&&c.tp>0&&c.sl>0&&c.amount<=c.sl&&c.target>=1.01&&c.target<=1000000&&c.win>=0&&c.loss>=0&&Number.isInteger(c.limit)&&c.limit>=0&&Number.isInteger(c.reload)&&c.reload>=0;}
  function showConfig(c){for(const k of fields)field(k).value=k==='amount'?c.amount.toFixed(8):c[k]??defaults[k];}
  function saveConfig(){const c=readConfig();if(valid(c)&&typeof chrome!=='undefined'&&chrome.storage?.local)void chrome.storage.local.set({[storageKey]:c}).catch(()=>{});}
  for(const k of fields)field(k).addEventListener('change',saveConfig);
  const preview=()=>{const n=money(field('amount').value);field('amountPreview').textContent=Number.isFinite(n)&&n>0?`Mức bắt đầu: ${n.toFixed(8)} · cùng loại tiền đang chọn trên game`:'Nhập tiền dạng 0.001 hoặc 0.00001, tối đa 8 số lẻ.'};
  field('amount').addEventListener('input',preview);
  if(typeof chrome!=='undefined'&&chrome.storage?.local){initialReady=false;chrome.storage.local.get(storageKey).then(s=>{if(s[storageKey]&&valid(s[storageKey]))showConfig(s[storageKey]);}).catch(()=>{}).finally(()=>{initialReady=true;restore()});}
  function clearResume(){try{sessionStorage.removeItem(resumeKey)}catch{}}
  function off(t){endStats('other');state='OFF';reloadWanted=false;runningSeen=false;clearResume();for(const k of fields)field(k).disabled=false;field('toggle').textContent='Bắt đầu Auto';notice(t);}
  function arm(c,expected=''){
    config=c;identity=expected;state='PREPARE';startedAt=Date.now();lastAction=0;stableAt=0;readyAt=0;runningSeen=false;reloadWanted=false;
    reloadAt=c.reload>0?Date.now()+c.reload*60000:0;for(const k of fields)field(k).disabled=true;field('toggle').textContent='Tắt Auto / chạy lại';notice('Đang mở Tự động và Nâng cao…');
  }
  function restore(){let saved;try{saved=JSON.parse(sessionStorage.getItem(resumeKey)||'null')}catch{}clearResume();if(!saved||!valid(saved.config)||Date.now()-saved.time>300000||Date.now()<saved.time||!isLimbo())return;showConfig(saved.config);arm(saved.config,saved.currency);notice('Sau reload: đang kiểm tra game trước khi chạy tiếp…');}
  if(initialReady)restore();
  field('toggle').onclick=()=>{if(state==='STOPPING')return notice('Đang yêu cầu dừng game do TP/SL không đúng; chờ xác nhận.');if(state!=='OFF')return off('Đã tắt tool; lượt đang chạy trên game vẫn tiếp tục.');if(!initialReady)return notice('Đang tải cấu hình…');const c=readConfig();if(!valid(c))return notice('Tiền cược phải > 0 và ≤ SL; TP/SL phải > 0. Kiểm tra mục tiêu, %, số cược và reload.');if(!isLimbo())return notice('Mở trang Limbo trước.');saveConfig();cycles=0;arm(c);};
  field('collapse').onclick=()=>{const hidden=!field('extra').hidden;for(const e of root.querySelectorAll('.body'))e.hidden=hidden;field('collapse').textContent=hidden?'Mở rộng':'Thu gọn'};
  field('telegram').onclick=()=>chrome.runtime.sendMessage({type:'open-options'});
  field('reloadNow').onclick=()=>{if(state==='OFF')return notice('Bật Auto trước khi hẹn reload.');reloadWanted=true;notice('Đã hẹn reload khi lượt hoàn thành.');};
  function manual(event){if(!event.isTrusted||state==='OFF')return;const b=event.target.closest?.('[data-testid="auto-bet-button"], [data-testid="manual-tab"]');if(b&&(b.getAttribute('data-testid')==='manual-tab'||b.getAttribute('data-autobet-status')!=='start'))off('Bạn đã dừng hoặc chuyển Thủ công; tool đã tắt.');}
  document.addEventListener('click',manual,true);
  const action=(fn)=>{if(Date.now()-lastAction<750)return false;lastAction=Date.now();stableAt=0;readyAt=0;fn();return true;};
  const write=(input,n)=>{
    const text=input.getAttribute('data-testid')==='input-game-amount'?n.toFixed(8):String(n);
    input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:text}));
    input.dispatchEvent(new Event('change',{bubbles:true}));input.blur();
  };
  function validNative(input){
    if(input.checkValidity())return true;
    const id=input.getAttribute('data-testid'),v=input.validity;
    // Stake accepts fractional percentages but omits step, so HTML defaults to 1.
    // Only disregard that implicit-step mismatch for the two percentage fields.
    return ['on-win-input','on-loss-input'].includes(id)&&input.getAttribute('step')===null&&v.stepMismatch&&
      Number.isFinite(numeric(input.value))&&numeric(input.value)>=0&&
      !['badInput','customError','patternMismatch','rangeOverflow','rangeUnderflow','tooLong','tooShort','typeMismatch','valueMissing'].some(k=>v[k]);
  }
  function reload(){try{sessionStorage.setItem(resumeKey,JSON.stringify({config,currency:identity,time:Date.now()}));state='RELOADING';notice('Đang tải lại trang…');location.reload();}catch{off('Không lưu được trạng thái reload; tool đã tắt.');}}
  setInterval(()=>{
    if(state==='OFF'||state==='RELOADING')return;
    if(!isLimbo())return off('Đã rời trang Limbo; tool đã tắt.');
    if([...document.querySelectorAll('[role="alert"]')].some(e=>visible(e)&&/lỗi|không đủ|thất bại|error|insufficient|failed|limit exceeded/i.test(e.textContent)))return off('Trang báo lỗi; tool đã tắt.');
    if(reloadAt&&Date.now()>=reloadAt)reloadWanted=true;
    const amount=one('input-game-amount');
    const currentCurrency=amount?.getAttribute('data-bet-amount-active-currency');
    if(currentCurrency){if(identity&&identity!==currentCurrency)return off('Đã đổi loại tiền; tool đã tắt.');identity=currentCurrency;}
    const button=one('auto-bet-button');
    const running=button&&/Dừng Cược Tự Động|Stop Autobet/i.test(button.textContent);
    const idle=button?.getAttribute('data-autobet-status')==='start'&&/Bắt Đầu Cược Tự Động|Start Autobet/i.test(button.textContent);
    if(state==='STOPPING'){
      if(idle&&!button.disabled)return off('Đã dừng game do cấu hình TP/SL không còn đúng.');
      if(running&&!button.disabled)action(()=>button.click());
      notice('TP/SL không đúng · đang yêu cầu dừng game; chưa xác nhận dừng.');return;
    }
    if(running){
      const tp=one('stop-on-profit-input'),sl=one('stop-on-loss-input');
      if(!tp||!sl||!Number.isFinite(numeric(sl.value))||numeric(sl.value)<=0||Math.abs(numeric(sl.value)-config.sl)>1e-10||!Number.isFinite(numeric(tp.value))||numeric(tp.value)<=0||Math.abs(numeric(tp.value)-config.tp)>1e-10){
        state='STOPPING';clearResume();reloadWanted=false;notice('Phát hiện TP/SL không đúng · yêu cầu dừng game.');
        if(!button.disabled)action(()=>button.click());return;
      }
    }
    if(running){state='RUNNING';runningSeen=true;stableAt=0;notice(`Auto đang chạy · đã bắt đầu ${cycles} lượt${reloadWanted?' · chờ hoàn thành để reload':''}`);return;}
    if(state==='WAIT_START'){if(Date.now()-startedAt>10000)return off('Không xác nhận được Auto bắt đầu; không bấm lại.');return;}
    if(state==='RUNNING'){
      if(!idle||button.disabled){if(!stableAt)stableAt=Date.now();if(Date.now()-stableAt>30000)off('Mất trạng thái game; tool đã tắt.');return;}
      state='WAIT_IDLE';stableAt=Date.now();notice('Lượt hoàn thành · chờ 2 giây');return;
    }
    if(state==='WAIT_IDLE'){
      if(!idle||button.disabled){stableAt=Date.now();return;}
      if(Date.now()-stableAt<2000)return;
      endStats('complete');
      if(reloadWanted&&runningSeen)return reload();
      state='PREPARE';startedAt=Date.now();stableAt=0;readyAt=0;
    }
    if(state!=='PREPARE')return;
    if(Date.now()-startedAt>30000)return off('Không xác nhận được cấu hình trong 30 giây; tool đã tắt.');
    if(!button){const auto=one('auto-tab');if(auto&&!auto.disabled)action(()=>auto.click());return;}
    if(!idle||button.disabled)return;
    const advanced=[...document.querySelectorAll('input[data-testid^="advanced-toggle-status-"]')].filter(visible);
    if(advanced.length!==1)return;
    if(!advanced[0].checked){action(()=>advanced[0].click());return;}
    const settings=[['input-game-amount',config.amount],['stop-on-profit-input',config.tp],['stop-on-loss-input',config.sl],['target-multiplier',config.target],['limit-input',config.limit]];
    for(const side of ['win','loss']){
      const input=one(`on-${side}-input`),reset=one(`reset-on-${side}-button`),increase=one(`enable-on-${side}-button`);
      if(!input||!reset||!increase)return;
      const wantIncrease=config[side+'Mode']==='increase';
      if(input.disabled===wantIncrease){const choose=wantIncrease?increase:reset;if(!choose.disabled)action(()=>choose.click());return;}
      if(wantIncrease)settings.push([`on-${side}-input`,config[side]]);
    }
    const resolved=settings.map(([id,n])=>[one(id),n]);
    if(!identity||resolved.some(([e])=>!e||e.disabled))return;
    const mismatch=resolved.find(([e,n])=>!Number.isFinite(numeric(e.value))||Math.abs(numeric(e.value)-n)>1e-10);
    if(mismatch){action(()=>write(...mismatch));return;}
    const invalid=resolved.find(([e])=>!validNative(e));
    if(invalid)return off(`Cấu hình không hợp lệ: ${invalid[0].getAttribute('data-testid')} = ${invalid[0].value}. Tool chưa bắt đầu.`);
    if(!readyAt){readyAt=Date.now();return;}
    if(Date.now()-readyAt<1000)return;
    if(reloadWanted&&runningSeen)return reload();
    const finalAmount=one('input-game-amount');
    if(!finalAmount||money(finalAmount.value)!==config.amount)return off('Tiền cược không khớp chính xác; không bắt đầu.');
    startStats();state='WAIT_START';startedAt=Date.now();stableAt=0;readyAt=0;cycles++;notice(`Đã kiểm tra mức bắt đầu ${config.amount.toFixed(8)} · đang bắt đầu Auto…`);button.click();
  },250);
  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((m,_s,reply)=>{
    if(m.type!=='limbo-panel')return;
    if(m.config&&state==='OFF')for(const k of fields)if(k in m.config)field(k).value=k==='amount'&&typeof m.config[k]==='number'?m.config[k].toFixed(8):m.config[k];
    preview();
    if(m.action==='save')saveConfig();
    if(['toggle','reloadNow','telegram'].includes(m.action))field(m.action).click();
    reply({html:root.innerHTML,config:readConfig(),disabled:state!=='OFF',status:status.textContent,toggle:field('toggle').textContent,ready:initialReady});
  });
})();
