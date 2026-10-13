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
  function stat(event){globalThis.LimboLog?.emit('bet.'+event.kind,event,event.kind==='issue'?'error':'info',event.trace||event.cycle);try{if(typeof chrome!=='undefined'&&chrome.runtime?.sendMessage)void chrome.runtime.sendMessage({type:'limbo-stat-event',event}).catch(()=>{});}catch{}}
  function startStats(){
    statCycle=crypto.randomUUID();document.documentElement.setAttribute('data-limbo-stat-cycle',statCycle);
    stat({kind:'start',id:statCycle,currency:identity,tp:config.tp,sl:config.sl});
  }
  function endStats(reason){if(!statCycle)return;stat({kind:'end',id:statCycle,reason});statCycle='';document.documentElement.removeAttribute('data-limbo-stat-cycle');}
  window.addEventListener('message',event=>{if(event.source!==window||event.origin!==location.origin||event.data?.type!=='limbo-confirmed-bet-v1')return;const e=event.data.event;if(e&&['bet','issue','request'].includes(e.kind))stat(e);});
  window.addEventListener('pagehide',()=>endStats('other'));
  function walletSnapshot(){
    const wallet=one('coin-toggle');const raw=wallet?.textContent.trim().replace(/\s/g,'')||'';
    const amount=/^\d+(?:[.,]\d{1,8})?$/.test(raw)?Number(raw.replace(',','.')):NaN;
    const readStat=id=>{const text=one(id)?.textContent.trim().replace(/\s/g,'')||'';return /^[+-]?\d+(?:[.,]\d{1,8})?$/.test(text)?Number(text.replace(',','.')):null};
    const volume=readStat('bets-stats-wagered'),profit=readStat('bets-stats-profit');
    const displayedStats=volume!==null&&volume>=0&&profit!==null?{volume,profit}:null;
    return {ok:isLimbo()&&Number.isFinite(amount),amount,currency:wallet?.getAttribute('data-active-currency'),displayedStats,time:Date.now()};
  }
  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((m,_s,reply)=>{
    if(m.type==='limbo-wallet')reply(walletSnapshot());
  });
  function publishHistory(){try{if(isLimbo()&&typeof chrome!=='undefined'&&chrome.runtime?.sendMessage)void chrome.runtime.sendMessage({type:'limbo-history-snapshot',snapshot:walletSnapshot()}).catch(()=>{});}catch{}}
  publishHistory();
  if(typeof chrome!=='undefined'&&chrome.runtime?.sendMessage)setInterval(publishHistory,10000);
  window.addEventListener('pagehide',publishHistory);
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
  </style><section><div class="head"><strong>Limbo Auto · ${typeof chrome!=='undefined'&&chrome.runtime?.getManifest?chrome.runtime.getManifest().version:'Không xác định'}</strong><button id="collapse">Thu gọn</button></div><div class="body">
  <label>Tiền cược ban đầu<input id="amount" type="text" inputmode="decimal" autocomplete="off" value="0.001"></label><p id="amountPreview">Mức bắt đầu: 0.00100000 · có thể nhập 0.00001</p>
  <div class="pair"><label>TP<input id="tp" type="number" step="0.00000001" min="0" value="1.1"></label><label>SL<input id="sl" type="number" step="0.00000001" min="0" value="1"></label></div>
  <div class="pair"><label>Mục tiêu ×<input id="target" type="number" min="1.01" step="0.01" value="9"></label><label>Số cược (0 = ∞)<input id="limit" type="number" min="0" step="1" value="0"></label></div>
  <div class="pair"><label>Khi thắng<select id="winMode"><option value="reset">Cài đặt lại</option><option value="increase">Tăng %</option></select></label><label>Tăng khi thắng %<input id="win" type="number" min="0" step="0.01" value="0"></label></div>
  <div class="pair"><label>Khi thua<select id="lossMode"><option value="increase">Tăng %</option><option value="reset">Cài đặt lại</option></select></label><label>Tăng khi thua %<input id="loss" type="number" min="0" step="0.01" value="14"></label></div>
  <label>Tự reload sau bao nhiêu phút (0 = tắt)<input id="reload" type="number" min="0" step="1" value="0"></label>
  <p>Reload chờ lượt Auto hoàn thành. Sau reload tự mở Tự động/Nâng cao, kiểm tra cấu hình rồi chạy tiếp.</p>
  </div><button id="toggle">Bắt đầu Auto</button><output>Đang tắt</output><div class="body" id="extra"><button id="reloadNow">Reload khi lượt hoàn thành</button><button id="telegram">Telegram & Lịch sử</button><p>Tool áp dụng toàn bộ cấu hình ở lần đầu. Khi game tự hoàn thành và hiện Bắt đầu cược, tool chỉ đặt lại tiền cược rồi chạy tiếp. Bấm Dừng trên game sẽ tắt tool.</p></div></section>`;
  document.documentElement.append(host);
  const field=id=>root.querySelector('#'+id),status=root.querySelector('output');
  let state='OFF',config=null,startedAt=0,lastAction=0,stableAt=0,idleAt=0,readyAt=0,runningSeen=false,restartOnly=false,cycles=0,identity='',reloadAt=0,reloadWanted=false,initialReady=true,statsRequestedAt=0;
  const debug=(event,data={},level='info',trace)=>globalThis.LimboLog?.emit(event,data,level,trace);
  function nativeAuto(){
    const buttons=[...document.querySelectorAll('[data-testid="auto-bet-button"]')].filter(visible);
    const button=buttons.length===1?buttons[0]:null;
    const text=button?.textContent.replace(/\s+/g,' ').trim()||'',attribute=button?.getAttribute('data-autobet-status')??null;
    const running=/Dừng Cược Tự Động|Stop Autobet/i.test(text),idle=/Bắt Đầu Cược Tự Động|Start Autobet/i.test(text);
    return {state:button&&running&&attribute!=='start'?'RUNNING':button&&idle&&attribute==='start'?'IDLE':'UNKNOWN',text,attribute,disabled:button?.disabled??null,count:buttons.length};
  }
  function presentation(){
    const native=nativeAuto(),toolEnabled=state!=='OFF';
    const summary=native.state==='RUNNING'?(toolEnabled?'Game Auto đang chạy':'Game Auto vẫn chạy · tool đã tắt'):native.state==='IDLE'?(toolEnabled?'Game đang nghỉ · tool '+state:'Game đã dừng · tool đã tắt'):'Chưa xác nhận trạng thái game · tool '+state;
    return {native,toolEnabled,status:summary+' | '+status.textContent};
  }
  function diagnosticChecks(){
    const checks=[];const add=(code,ok,actual,expected)=>checks.push({code,ok,actual,expected});
    const button=one('auto-bet-button'),advanced=[...document.querySelectorAll('input[data-testid^="advanced-toggle-status-"]')].filter(visible);
    add('button.present',!!button,!!button,true);
    add('button.enabled',!!button&&!button.disabled,button?.disabled,false);
    add('button.idle',button?.getAttribute('data-autobet-status')==='start',button?.getAttribute('data-autobet-status'),'start');
    add('statistics.visible',!!walletSnapshot().displayedStats,!!walletSnapshot().displayedStats,true);
    add('advanced.unique',advanced.length===1,advanced.length,1);
    add('advanced.checked',advanced.length===1&&advanced[0].checked,advanced[0]?.checked,true);
    add('currency.known',!!identity,identity,'nonempty');
    if(config){const settings=[['input-game-amount',config.amount],['stop-on-profit-input',config.tp],['stop-on-loss-input',config.sl],['target-multiplier',config.target],['limit-input',config.limit]];
      for(const side of ['win','loss']){const input=one(`on-${side}-input`),want=config[side+'Mode']==='increase';add(`mode.${side}`,!!input&&input.disabled!==want,input?.disabled,want?'increase':'reset');for(const prefix of ['reset','enable'])add(`mode.${side}.${prefix}.present`,!!one(`${prefix}-on-${side}-button`),!!one(`${prefix}-on-${side}-button`),true);if(want)settings.push([`on-${side}-input`,config[side]]);}
      for(const [id,n]of settings){const e=one(id);add(id+'.present',!!e,!!e,true);add(id+'.enabled',!!e&&!e.disabled,e?.disabled,false);add(id+'.value',!!e&&Number.isFinite(numeric(e.value))&&Math.abs(numeric(e.value)-n)<=1e-10,e?.value,n);if(e?.validity){const flags=Object.fromEntries(['valid','stepMismatch','badInput','customError','patternMismatch','rangeOverflow','rangeUnderflow','tooLong','tooShort','typeMismatch','valueMissing'].map(k=>[k,e.validity[k]]));const implicitPercent=['on-win-input','on-loss-input'].includes(id)&&e.getAttribute('step')===null&&flags.stepMismatch&&Number.isFinite(numeric(e.value))&&numeric(e.value)>=0&&!Object.entries(flags).some(([k,v])=>!['valid','stepMismatch'].includes(k)&&v);add(id+'.validity',flags.valid||implicitPercent,{flags,step:e.getAttribute('step'),min:e.min,max:e.max,message:e.validationMessage,implicitPercent},'accepted');}}
      const amount=one('input-game-amount');add('amount.exact',!!amount&&money(amount.value)===config.amount,amount?.value,config.amount);
    }
    return {elapsed:Date.now()-startedAt,readyAge:readyAt?Date.now()-readyAt:null,lastActionAge:Date.now()-lastAction,checks,failed:checks.filter(c=>!c.ok)};
  }
  function debugSnapshot(){
    const ids=['input-game-amount','target-multiplier','stop-on-profit-input','stop-on-loss-input','limit-input','on-win-input','on-loss-input','auto-bet-button'];
    return {native:nativeAuto(),diagnostics:diagnosticChecks(),alerts:[...document.querySelectorAll('[role="alert"]')].filter(visible).map(e=>e.textContent.slice(0,1000)),visibility:document.visibilityState,state,config,cycles,identity,reloadWanted,reloadAt,statCycle,startedAt,lastAction,stableAt,idleAt,readyAt,runningSeen,restartOnly,initialReady,status:status.textContent,wallet:walletSnapshot(),seeds:[...document.querySelectorAll('[data-testid*="seed" i]')].filter(visible).slice(0,30).map(e=>({id:e.getAttribute('data-testid'),value:e.value??e.textContent?.slice(0,2000)})),game:Object.fromEntries(ids.map(id=>{const e=one(id);return [id,e?{value:e.value,text:e.tagName==='BUTTON'?e.textContent:undefined,disabled:e.disabled,autoStatus:e.getAttribute('data-autobet-status'),valid:e.validity?{valid:e.validity.valid,stepMismatch:e.validity.stepMismatch,rangeUnderflow:e.validity.rangeUnderflow,rangeOverflow:e.validity.rangeOverflow}:null}:null]}))};
  }
  globalThis.LimboLog?.setSnapshot(debugSnapshot);
  const notice=t=>{const changed=status.textContent!==t;status.textContent=t;if(changed)debug('state.notice',{output:t,snapshot:debugSnapshot()},/lỗi|không xác nhận|không hợp lệ|không đúng|không khớp|mất trạng thái/i.test(t)?'error':'info')};
  setInterval(()=>debug('monitor.snapshot',debugSnapshot()),5000);
  document.addEventListener('click',e=>{if(e.isTrusted){const b=e.target.closest?.('[data-testid]');if(b)debug('user.click',{testId:b.getAttribute('data-testid'),text:b.tagName==='BUTTON'?b.textContent:undefined,before:debugSnapshot()})}},true);
  document.addEventListener('change',e=>{const id=e.target.getAttribute?.('data-testid');if(e.isTrusted&&id&&/amount|multiplier|profit|loss|limit|on-win|advanced/.test(id))debug('user.change',{testId:id,value:e.target.value,checked:e.target.checked,snapshot:debugSnapshot()})},true);
  root.addEventListener('click',e=>{if(e.target.closest('button'))debug('tool.click',{id:e.target.closest('button').id,snapshot:debugSnapshot()})},true);
  root.addEventListener('change',e=>debug('tool.config.change',{id:e.target.id,value:e.target.value}),true);
  window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.type!=='limbo-debug-observer-v1')return;const d=e.data.entry;if(d&&typeof d.event==='string')debug('page.'+d.event,{...d.data,pageTime:d.pageTime},d.level||'info',d.trace)});
  window.postMessage({type:'limbo-debug-ready-v1'},location.origin);
  window.addEventListener('pagehide',()=>debug('page.hide',debugSnapshot()));
  const storageKey='limbo-auto-config-v2';
  const resumeKey='limbo-auto-reload-v2';
  const fields=Object.keys(defaults);
  const readConfig=()=>Object.fromEntries(fields.map(k=>[k,k.endsWith('Mode')?field(k).value:k==='amount'?money(field(k).value):numeric(field(k).value)]));
  function valid(c){return fields.every(k=>k.endsWith('Mode')?['reset','increase'].includes(c[k]):Number.isFinite(c[k]))&&c.amount>0&&Number(c.amount.toFixed(8))===c.amount&&c.tp>0&&c.sl>0&&c.amount<=c.sl&&c.target>=1.01&&c.target<=1000000&&c.win>=0&&c.loss>=0&&Number.isInteger(c.limit)&&c.limit>=0&&Number.isInteger(c.reload)&&c.reload>=0;}
  function showConfig(c){for(const k of fields)field(k).value=k==='amount'?c.amount.toFixed(8):c[k]??defaults[k];}
  function saveConfig(){const c=readConfig();if(valid(c)&&typeof chrome!=='undefined'&&chrome.storage?.local)void chrome.storage.local.set({[storageKey]:c}).catch(error=>debug('config.save.error',{error,input:c},'error'));}
  for(const k of fields)field(k).addEventListener('change',saveConfig);
  const preview=()=>{const n=money(field('amount').value);field('amountPreview').textContent=Number.isFinite(n)&&n>0?`Mức bắt đầu: ${n.toFixed(8)} · cùng loại tiền đang chọn trên game`:'Nhập tiền dạng 0.001 hoặc 0.00001, tối đa 8 số lẻ.'};
  field('amount').addEventListener('input',preview);
  if(typeof chrome!=='undefined'&&chrome.storage?.local){initialReady=false;chrome.storage.local.get(storageKey).then(s=>{if(s[storageKey]&&valid(s[storageKey]))showConfig(s[storageKey]);}).catch(error=>debug('config.load.error',{error},'error')).finally(()=>{initialReady=true;restore()});}
  function clearResume(){try{sessionStorage.removeItem(resumeKey)}catch{}}
  function off(t){const trace=crypto.randomUUID();debug('tool.stop',{reason:t,before:debugSnapshot(),diagnostics:diagnosticChecks()},'error',trace);endStats('other');state='OFF';reloadWanted=false;runningSeen=false;restartOnly=false;clearResume();for(const k of fields)field(k).disabled=false;field('toggle').textContent='Bắt đầu Auto';notice(t);debug('tool.stopped',{reason:t,after:debugSnapshot()},'info',trace);}
  function arm(c,expected=''){
    statsRequestedAt=0;config=c;identity=expected;state='PREPARE';startedAt=Date.now();lastAction=0;stableAt=0;idleAt=0;readyAt=0;runningSeen=false;restartOnly=false;reloadWanted=false;
    reloadAt=c.reload>0?Date.now()+c.reload*60000:0;for(const k of fields)field(k).disabled=true;field('toggle').textContent='Tắt Auto / chạy lại';notice('Đang mở Tự động và Nâng cao…');
  }
  function restore(){let saved;try{saved=JSON.parse(sessionStorage.getItem(resumeKey)||'null')}catch{}clearResume();if(!saved||!valid(saved.config)||Date.now()-saved.time>300000||Date.now()<saved.time||!isLimbo())return;showConfig(saved.config);arm(saved.config,saved.currency);notice('Sau reload: đang kiểm tra game trước khi chạy tiếp…');}
  if(initialReady)restore();
  field('toggle').onclick=()=>{if(state!=='OFF')return off('Đã tắt tool; lượt đang chạy trên game vẫn tiếp tục.');if(!initialReady)return notice('Đang tải cấu hình…');const c=readConfig();if(!valid(c))return notice('Tiền cược phải > 0 và ≤ SL; TP/SL phải > 0. Kiểm tra mục tiêu, %, số cược và reload.');if(!isLimbo())return notice('Mở trang Limbo trước.');if(one('auto-bet-button')&&nativeAuto().state!=='IDLE')return notice('Chưa thể bật tool: game đang chạy hoặc chưa xác nhận dừng. Chờ Auto hoàn thành rồi bật lại.');saveConfig();cycles=0;arm(c);};
  field('collapse').onclick=()=>{const hidden=!field('extra').hidden;for(const e of root.querySelectorAll('.body'))e.hidden=hidden;field('collapse').textContent=hidden?'Mở rộng':'Thu gọn'};
  field('telegram').onclick=()=>chrome.runtime.sendMessage({type:'open-options'});
  field('reloadNow').onclick=()=>{if(state==='OFF')return notice('Bật Auto trước khi hẹn reload.');reloadWanted=true;notice('Đã hẹn reload khi lượt hoàn thành.');};
  function manual(event){if(!event.isTrusted||state==='OFF')return;const b=event.target.closest?.('[data-testid="auto-bet-button"], [data-testid="manual-tab"]');if(b&&(b.getAttribute('data-testid')==='manual-tab'||b.getAttribute('data-autobet-status')!=='start'))off('Bạn đã dừng hoặc chuyển Thủ công; tool đã tắt.');}
  document.addEventListener('click',manual,true);
  const action=(fn)=>{if(Date.now()-lastAction<750)return false;lastAction=Date.now();stableAt=0;readyAt=0;const trace=crypto.randomUUID();debug('dom.action.input',{snapshot:debugSnapshot()},'info',trace);try{fn();debug('dom.action.output',{snapshot:debugSnapshot()},'info',trace);return true}catch(error){debug('dom.action.error',{error,snapshot:debugSnapshot()},'error',trace);throw error}};
  const write=(input,n)=>{
    const text=input.getAttribute('data-testid')==='input-game-amount'?n.toFixed(8):String(n);
    debug('dom.write.input',{testId:input.getAttribute('data-testid'),before:input.value,input:text});
    input.focus();Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,text);
    input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:text}));
    input.dispatchEvent(new Event('change',{bubbles:true}));input.blur();debug('dom.write.output',{testId:input.getAttribute('data-testid'),output:input.value,valid:input.validity?.valid});
  };
  function ensureLiveStats(){
    const stats=walletSnapshot().displayedStats;
    if(stats){if(statsRequestedAt)debug('stats.ready',{stats});statsRequestedAt=0;return true;}
    const toggle=one('button-liveStats');
    notice('Đang kiểm tra / mở bảng thống kê trực tuyến trước khi chạy Auto…');
    // Only open a confirmed inactive toggle, once per preparation. Never reset totals.
    if(toggle&&!toggle.disabled&&toggle.getAttribute('data-active')==='false'&&!statsRequestedAt){
      action(()=>{statsRequestedAt=Date.now();debug('stats.open.input',{active:toggle.getAttribute('data-active')});toggle.click();debug('stats.open.output',{active:toggle.getAttribute('data-active'),stats:walletSnapshot().displayedStats})});
    }
    return false;
  }
  function validNative(input){
    if(input.checkValidity())return true;
    const id=input.getAttribute('data-testid'),v=input.validity;
    // Stake accepts fractional percentages but omits step, so HTML defaults to 1.
    // Only disregard that implicit-step mismatch for the two percentage fields.
    return ['on-win-input','on-loss-input'].includes(id)&&input.getAttribute('step')===null&&v.stepMismatch&&
      Number.isFinite(numeric(input.value))&&numeric(input.value)>=0&&
      !['badInput','customError','patternMismatch','rangeOverflow','rangeUnderflow','tooLong','tooShort','typeMismatch','valueMissing'].some(k=>v[k]);
  }
  function pressStart(button,source){
    const native=nativeAuto();
    const allowed=button===one('auto-bet-button')&&!button.disabled&&native.state==='IDLE'&&native.attribute==='start'&&/Bắt Đầu Cược Tự Động|Start Autobet/i.test(native.text);
    if(!allowed){readyAt=0;debug('auto.start.blocked',{source,native,snapshot:debugSnapshot()},'warn');notice('Nút chưa ở trạng thái Bắt đầu cược · tool không click.');return false;}
    startStats();state='WAIT_START';startedAt=Date.now();stableAt=0;readyAt=0;cycles++;
    notice(`${source==='restart'?`Đã reset tiền cược ${config.amount.toFixed(8)}`:`Đã kiểm tra mức bắt đầu ${config.amount.toFixed(8)}`} · đang bắt đầu Auto…`);
    debug(`auto.${source}.input`,{permission:'start-only',native,snapshot:debugSnapshot()},'info',statCycle);
    button.click();
    debug(`auto.${source}.output`,{snapshot:debugSnapshot()},'info',statCycle);return true;
  }
  function reload(){try{sessionStorage.setItem(resumeKey,JSON.stringify({config,currency:identity,time:Date.now()}));state='RELOADING';notice('Đang tải lại trang…');location.reload();}catch(error){debug('reload.error',{error},'error');off('Không lưu được trạng thái reload; tool đã tắt.');}}
  setInterval(()=>{
    if(state==='OFF'||state==='RELOADING')return;
    if(!isLimbo())return off('Đã rời trang Limbo; tool đã tắt.');
    if([...document.querySelectorAll('[role="alert"]')].some(e=>visible(e)&&/lỗi|không đủ|thất bại|error|insufficient|failed|limit exceeded/i.test(e.textContent)))return off('Trang báo lỗi; tool đã tắt.');
    if(reloadAt&&Date.now()>=reloadAt)reloadWanted=true;
    const amount=one('input-game-amount');
    const currentCurrency=amount?.getAttribute('data-bet-amount-active-currency');
    if(currentCurrency){if(identity&&identity!==currentCurrency)return off('Đã đổi loại tiền; tool đã tắt.');identity=currentCurrency;}
    const button=one('auto-bet-button');
    const native=nativeAuto();
    const running=native.state==='RUNNING';
    const idle=native.state==='IDLE';
    if(running){state='RUNNING';runningSeen=true;stableAt=0;idleAt=0;notice(`Auto đang chạy · đã bắt đầu ${cycles} lượt${reloadWanted?' · chờ hoàn thành để reload':''}`);return;}
    if(state==='WAIT_START'){if(Date.now()-startedAt>10000)return off('Không xác nhận được Auto bắt đầu; không bấm lại.');return;}
    if(state==='RUNNING'){
      if(!idle||button.disabled){if(!stableAt)stableAt=Date.now();if(Date.now()-stableAt>30000)off('Mất trạng thái game; tool đã tắt.');return;}
      debug('native.idle.detected',{reason:'ui-returned-to-start',snapshot:debugSnapshot(),diagnostics:diagnosticChecks()},'info',statCycle);state='WAIT_IDLE';idleAt=Date.now();notice('Lệnh Auto đã hoàn thành · chờ nút Bắt đầu ổn định…');return;
    }
    if(state==='WAIT_IDLE'){
      if(!idle||button.disabled){idleAt=0;return;}
      if(!idleAt)idleAt=Date.now();
      if(Date.now()-idleAt<2000)return;
      endStats('complete');
      if(reloadWanted&&runningSeen)return reload();
      restartOnly=true;state='PREPARE';startedAt=Date.now();stableAt=0;idleAt=0;readyAt=0;statsRequestedAt=0;
    }
    if(state!=='PREPARE')return;
    if(Date.now()-startedAt>30000)return off(walletSnapshot().displayedStats?'Không xác nhận được cấu hình trong 30 giây; tool đã tắt.':'Không xác nhận được bảng thống kê trong 30 giây; tool chưa bắt đầu Auto.');
    if(!button){const auto=one('auto-tab');if(auto&&!auto.disabled)action(()=>auto.click());return;}
    if(!idle||button.disabled)return;
    if(!ensureLiveStats())return;
    if(restartOnly){
      const restartAmount=one('input-game-amount');
      if(!restartAmount||restartAmount.disabled||!identity)return;
      if(money(restartAmount.value)!==config.amount){action(()=>write(restartAmount,config.amount));return;}
      if(!validNative(restartAmount))return off(`Tiền cược không hợp lệ: ${restartAmount.value}. Tool chưa bắt đầu lại.`);
      if(!readyAt){readyAt=Date.now();return;}
      if(Date.now()-readyAt<1000)return;
      if(!ensureLiveStats())return;
      debug('stats.preflight.confirmed',{stats:walletSnapshot().displayedStats,restartOnly:true});publishHistory();
      pressStart(button,'restart');return;
    }
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
    if(!ensureLiveStats())return;
    debug('stats.preflight.confirmed',{stats:walletSnapshot().displayedStats,restartOnly:false});publishHistory();
    pressStart(button,'start');
  },250);
  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)chrome.runtime.onMessage.addListener((m,_s,reply)=>{
    if(m.type==='limbo-monitor'){
      const amount=one('input-game-amount');
      reply({state,...presentation(),reason:status.textContent,observerVersion:globalThis.chrome?.runtime?.getManifest?.().version,ready:initialReady,cycles,config:readConfig(),amount:amount?money(amount.value):null,wallet:walletSnapshot(),time:Date.now()});
      return;
    }
    if(m.type!=='limbo-panel')return;
    const trace=crypto.randomUUID();if(m.action||m.config)debug('panel.command.input',{message:m,before:debugSnapshot()},'info',trace);
    if(m.config&&state==='OFF')for(const k of fields)if(k in m.config)field(k).value=k==='amount'&&typeof m.config[k]==='number'?m.config[k].toFixed(8):m.config[k];
    preview();
    if(m.action==='save')saveConfig();
    if(['toggle','reloadNow','telegram'].includes(m.action))field(m.action).click();
    if(m.action||m.config)debug('panel.command.output',{snapshot:debugSnapshot()},'info',trace);
    reply({html:root.innerHTML,config:readConfig(),disabled:state!=='OFF',...presentation(),reason:status.textContent,toggle:field('toggle').textContent,ready:initialReady});
  });
})();
