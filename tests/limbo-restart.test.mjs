import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
const code=readFileSync(new URL('../limbo-tool/content.js',import.meta.url),'utf8');
function fixture({manual=false,advanced=false,resume=null,remote=false}={}){
 const dom=new JSDOM(`<button data-testid="manual-tab">Thủ công</button><button data-testid="auto-tab">Tự động</button><button data-testid="auto-bet-button" data-autobet-status="start">Bắt Đầu Cược Tự Động</button><input type="number" data-testid="input-game-amount" data-bet-amount-active-currency="usdt" value="0"><input type="checkbox" data-testid="advanced-toggle-status-disabled"><div id="advanced"><input type="number" data-testid="stop-on-profit-input" value="0"><input type="number" data-testid="stop-on-loss-input" value="0"><input type="number" data-testid="limit-input" value="0"><button data-testid="reset-on-win-button">Reset</button><button data-testid="enable-on-win-button">Increase</button><input type="number" data-testid="on-win-input" value="0" disabled><button data-testid="reset-on-loss-button">Reset</button><button data-testid="enable-on-loss-button">Increase</button><input type="number" data-testid="on-loss-input" value="0" disabled></div><input type="number" data-testid="target-multiplier" value="2">`,{url:'https://stake1022.com/vi/casino/games/limbo',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const statsPanel=dom.window.document.createElement('div');statsPanel.innerHTML='<button data-testid="button-liveStats" data-active="true"></button><span data-testid="bets-stats-wagered">0</span><span data-testid="bets-stats-profit">0</span>';dom.window.document.body.append(statsPanel);
 const w=dom.window;let tick,time=1000,manualListener;const submissions=[],stops=[];
 const listeners=[];if(remote)w.chrome={runtime:{onMessage:{addListener:fn=>listeners.push(fn)},sendMessage:async()=>({})}};
 for(const id of ['input-game-amount','stop-on-profit-input','stop-on-loss-input'])w.document.querySelector(`[data-testid="${id}"]`).step='0.00000001';
 w.document.querySelector('[data-testid="target-multiplier"]').step='0.01';
 const one=id=>w.document.querySelector(`[data-testid="${id}"]`),button=one('auto-bet-button'),input=one('input-game-amount');
 w.Element.prototype.getClientRects=function(){return this.hidden||this.closest('[hidden]')?[]:[{}]};w.setInterval=fn=>{tick=fn};w.Date.now=()=>time;
 const add=w.document.addEventListener.bind(w.document);w.document.addEventListener=(type,fn,options)=>{if(type==='click'&&options===true)manualListener=fn;return add(type,fn,options)};
 button.hidden=manual;w.document.querySelector('#advanced').hidden=!advanced;
 const check=w.document.querySelector('[type="checkbox"]');check.checked=advanced;
 check.addEventListener('click',()=>{w.document.querySelector('#advanced').hidden=!check.checked});
 one('auto-tab').onclick=()=>{button.hidden=false};
 for(const side of ['win','loss']){one(`reset-on-${side}-button`).onclick=()=>{one(`on-${side}-input`).disabled=true};one(`enable-on-${side}-button`).onclick=()=>{one(`on-${side}-input`).disabled=false}}
 const running=()=>{button.textContent='Dừng Cược Tự Động';button.setAttribute('data-autobet-status','stop')};
 const complete=()=>{button.textContent='Bắt Đầu Cược Tự Động';button.setAttribute('data-autobet-status','start')};
 button.onclick=()=>{
  if(button.getAttribute('data-autobet-status')!=='start'){stops.push(time);complete();return}
  submissions.push({amount:Number(input.value),tp:Number(one('stop-on-profit-input').value),sl:Number(one('stop-on-loss-input').value),target:Number(one('target-multiplier').value),loss:Number(one('on-loss-input').value),winReset:one('on-win-input').disabled,lossReset:one('on-loss-input').disabled});running();
 };
 if(resume)w.sessionStorage.setItem('limbo-auto-reload-v2',JSON.stringify(resume));
 w.eval(code);const panel=w.document.querySelector('#limbo-restart-tool').shadowRoot;
 return {dom,w,one,button,input,panel,submissions,stops,running,complete,remote:m=>{let result;for(const fn of listeners)fn(m,{},r=>{result=r});return result},click:()=>panel.querySelector('#toggle').click(),advance:(ms=250)=>{time+=ms;tick()},pump:(steps=100)=>{for(let i=0;i<steps;i++){time+=250;tick()}},until:(n)=>{for(let i=0;i<130&&submissions.length<n;i++){time+=250;tick()}},manualStop:()=>{manualListener({isTrusted:true,target:button});button.click()},field:(id,v)=>{panel.querySelector('#'+id).value=v},status:()=>panel.querySelector('output').textContent};
}
const verify=s=>{assert.equal(s.amount,.001);assert.equal(s.tp,1.1);assert.equal(s.sl,1);assert.equal(s.target,9);assert.equal(s.winReset,true);assert.equal(s.lossReset,false);assert.equal(s.loss,14)};
for(const count of [1,2,3,5,10])for(const scenario of ['TP','SL','wrongTP','wrongSL','blank','disabled','rejected'])test(`Auto verification ${scenario} over ${count} rounds`,()=>{
 const f=fixture({manual:true});try{
  f.click();f.until(1);assert.equal(f.submissions.length,1);verify(f.submissions[0]);f.advance();
  for(let i=0;i<count;i++){
   const before=f.submissions.length;f.complete();f.input.value=scenario==='SL'?'0.18888377':scenario==='blank'?'':'.001';
   if(scenario==='wrongTP')f.one('stop-on-profit-input').value='0';if(scenario==='wrongSL')f.one('stop-on-loss-input').value='0';
   if(scenario==='rejected'){f.input.value='.2';f.input.addEventListener('input',()=>{f.input.value='.2'})}
   if(scenario==='disabled'){f.button.disabled=true;f.pump(10);assert.equal(f.submissions.length,before);f.button.disabled=false}
   if(scenario==='rejected'){f.pump(150);assert.equal(f.submissions.length,before);assert.match(f.status(),/30 giây/);break}
   f.until(before+1);assert.equal(f.submissions.length,before+1);verify(f.submissions.at(-1));f.advance();
  }
 }finally{f.dom.window.close()}
});
const checks=[
 ['SL zero blocks initial Auto',f=>{f.field('sl','0');f.click();f.pump();assert.equal(f.submissions.length,0)}],
 ['TP zero blocks initial Auto',f=>{f.field('tp','0');f.click();f.pump();assert.equal(f.submissions.length,0)}],
 ['Stake greater than SL blocks Auto',f=>{f.field('amount','2');f.click();f.pump();assert.equal(f.submissions.length,0)}],
 ['Missing SL blocks Auto',f=>{f.one('stop-on-loss-input').remove();f.click();f.pump(150);assert.equal(f.submissions.length,0)}],
 ['Rejected SL blocks Auto',f=>{f.one('stop-on-loss-input').addEventListener('input',e=>e.target.value='0');f.click();f.pump(150);assert.equal(f.submissions.length,0)}],
 ['SL zero during run stops native game',f=>{f.click();f.until(1);f.advance();f.one('stop-on-loss-input').value='0';f.pump(8);assert.equal(f.stops.length,1);assert.equal(f.submissions.length,1)}],
 ['SL changed during run stops native game',f=>{f.click();f.until(1);f.advance();f.one('stop-on-loss-input').value='10';f.pump(8);assert.equal(f.stops.length,1)}],
 ['Missing SL during run stops native game',f=>{f.click();f.until(1);f.advance();f.one('stop-on-loss-input').remove();f.pump(8);assert.equal(f.stops.length,1)}],
 ['Manual Stop never restarts',f=>{f.click();f.until(1);f.advance();f.manualStop();f.pump(150);assert.equal(f.submissions.length,1)}],
 ['No repeated start when acceptance is unknown',f=>{f.button.onclick=()=>{f.submissions.push({})};f.click();f.until(1);f.pump(50);assert.equal(f.submissions.length,1);assert.match(f.status(),/Không xác nhận/)}],
 ['Switch currency aborts before start',f=>{f.click();f.advance();f.input.setAttribute('data-bet-amount-active-currency','btc');f.pump();assert.equal(f.submissions.length,0)}],
 ['Error toast blocks Auto',f=>{const e=f.w.document.createElement('div');e.setAttribute('role','alert');e.textContent='Không đủ tiền';f.w.document.body.append(e);f.click();f.pump();assert.equal(f.submissions.length,0)}],
 ['Success toast allows Auto',f=>{const e=f.w.document.createElement('div');e.setAttribute('role','alert');e.textContent='Tự động cược đã bắt đầu';f.w.document.body.append(e);f.click();f.until(1);assert.equal(f.submissions.length,1)}],
 ['Reload waits for completion and saves resume marker',f=>{f.click();f.until(1);f.advance();f.panel.querySelector('#reloadNow').click();f.pump(12);assert.equal(f.w.sessionStorage.getItem('limbo-auto-reload-v2'),null);f.complete();f.pump(12);const saved=JSON.parse(f.w.sessionStorage.getItem('limbo-auto-reload-v2'));assert.equal(saved.config.sl,1);assert.equal(saved.currency,'usdt');assert.equal(f.submissions.length,1)}],
 ['Fifty consecutive TP/SL cycles keep verified limits',f=>{f.click();f.until(1);f.advance();for(let i=0;i<50;i++){f.complete();f.input.value=i%2?'.188':'0.001';f.one('stop-on-profit-input').value='0';f.one('stop-on-loss-input').value='0';f.until(i+2);assert.equal(f.submissions.length,i+2);verify(f.submissions.at(-1));f.advance()}}]
];
for(const [name,check]of checks)test(name,()=>{const f=fixture({manual:true});try{check(f)}finally{f.dom.window.close()}});
const savedConfig={amount:.001,tp:1.1,sl:1,target:9,limit:0,winMode:'reset',win:0,lossMode:'increase',loss:14,reload:0};
test('Scheduled reload restores config, opens Auto/Advanced and verifies before start',()=>{
 const f=fixture({manual:true,resume:{config:savedConfig,currency:'usdt',time:1000}});try{f.until(1);assert.equal(f.submissions.length,1);verify(f.submissions[0]);assert.equal(f.w.sessionStorage.getItem('limbo-auto-reload-v2'),null)}finally{f.dom.window.close()}
});
test('Expired reload marker cannot start bets',()=>{const f=fixture({resume:{config:savedConfig,currency:'usdt',time:-400000}});try{f.pump(150);assert.equal(f.submissions.length,0)}finally{f.dom.window.close()}});
test('Reload marker cannot resume with another currency',()=>{const f=fixture({resume:{config:savedConfig,currency:'btc',time:1000}});try{f.pump();assert.equal(f.submissions.length,0);assert.match(f.status(),/loại tiền/)}finally{f.dom.window.close()}});
test('Reload marker with zero SL cannot start',()=>{const f=fixture({resume:{config:{...savedConfig,sl:0},currency:'usdt',time:1000}});try{f.pump();assert.equal(f.submissions.length,0)}finally{f.dom.window.close()}});
test('Increase on win and reset on loss are applied independently',()=>{const f=fixture();try{f.field('winMode','increase');f.field('win','2.5');f.field('lossMode','reset');f.click();f.until(1);assert.equal(f.submissions.length,1,f.status()+JSON.stringify([...f.panel.querySelectorAll('input,select')].map(e=>[e.id,e.value])));assert.equal(f.one('on-win-input').disabled,false);assert.equal(Number(f.one('on-win-input').value),2.5);assert.equal(f.submissions[0].lossReset,true)}finally{f.dom.window.close()}});
test('Stop request retries when game button was temporarily disabled',()=>{const f=fixture();try{f.click();f.until(1);f.advance();f.button.disabled=true;f.one('stop-on-loss-input').value='0';f.pump(4);assert.equal(f.stops.length,0);f.click();f.button.disabled=false;f.pump(8);assert.equal(f.stops.length,1);assert.equal(f.submissions.length,1)}finally{f.dom.window.close()}});
test('No overlay is displayed on the game',()=>{const f=fixture();try{assert.equal(f.w.document.querySelector('#limbo-restart-tool').style.display,'none')}finally{f.dom.window.close()}});
test('Duplicate script cannot create a second controller',()=>{const f=fixture();try{f.w.eval(code);assert.equal(f.w.document.querySelectorAll('#limbo-restart-tool').length,1)}finally{f.dom.window.close()}});

async function panelFixture(){
 const core=fixture({manual:true,remote:true});
 const ui=new JSDOM(readFileSync(new URL('../limbo-tool/panel.html',import.meta.url),'utf8'),{runScripts:'outside-only'});
 const w=ui.window;let poll;const sent=[];
 const event={addListener(){}};
 w.chrome={tabs:{query:async()=>[{id:10,active:true,url:'https://stake1022.com/vi/casino/games/limbo'}],onRemoved:event,onUpdated:event,sendMessage:async(id,message)=>{sent.push({id,message});await new Promise(r=>setImmediate(r));return core.remote(message)}}};
 w.chrome.storage={local:{get:async()=>({})},onChanged:{addListener(){}}};w.chrome.runtime={openOptionsPage(){}};w.eval(readFileSync(new URL('../limbo-tool/domains.js',import.meta.url),'utf8'));w.setInterval=(fn,ms)=>{if(ms===750)poll=fn};w.eval(readFileSync(new URL('../limbo-tool/panel.js',import.meta.url),'utf8'));
 const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r))};await flush();
 return {core,ui,w,sent,flush,poll:()=>poll(),close(){core.dom.window.close();ui.window.close()}};
}
test('Side panel mounts independent controls and starts selected tab with verified SL',async()=>{
 const f=await panelFixture();try{
  assert.equal(f.w.document.querySelector('#tabs').value,'10');
  assert.equal(f.w.document.querySelector('#sl').value,'1');
  f.w.document.querySelector('#toggle').click();await f.flush();f.core.until(1);
  assert.equal(f.core.submissions.length,1);verify(f.core.submissions[0]);
  assert.ok(f.sent.every(s=>s.id===10));
 }finally{f.close()}
});
test('Side panel queues edits and start even while a status request is in flight',async()=>{
 const f=await panelFixture();try{
  f.poll();await Promise.resolve();
  const sl=f.w.document.querySelector('#sl');sl.value='0';sl.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  f.w.document.querySelector('#toggle').click();await f.flush();f.core.pump(150);
  assert.equal(f.core.submissions.length,0);assert.match(f.core.status(),/TP\/SL phải > 0/);
  assert.ok(f.sent.some(s=>s.message.action==='toggle'&&s.message.config.sl==='0'));
 }finally{f.close()}
});

for(const amount of [.001,.00001,.0001,.01,.00000001])for(let rounds=1;rounds<=10;rounds++)test(`Exact initial stake ${amount}, ${rounds} rounds`,()=>{
 const f=fixture({manual:true});try{f.field('amount',amount.toFixed(8));f.click();f.until(1);assert.equal(f.submissions.length,1);assert.equal(f.submissions[0].amount,amount);f.advance();
  for(let i=0;i<rounds;i++){f.complete();f.input.value='.01';f.until(i+2);assert.equal(f.submissions.length,i+2);assert.equal(f.submissions.at(-1).amount,amount);f.advance()}
 }finally{f.dom.window.close()}
});
test('Native amount is committed on blur before the start button is clicked',()=>{
 const f=fixture();try{let committed=.01;f.input.value='.01';f.input.addEventListener('blur',()=>{committed=Number(f.input.value)});const start=f.button.onclick;f.button.onclick=()=>{assert.equal(committed,.00001);start()};f.field('amount','0.00001');f.click();f.until(1);assert.equal(f.submissions.length,1)}finally{f.dom.window.close()}
});
test('Site rounding 0.001 up to 0.01 prevents all start clicks',()=>{
 const f=fixture();try{f.input.addEventListener('blur',()=>{f.input.value='0.01'});f.click();f.pump(150);assert.equal(f.submissions.length,0);assert.match(f.status(),/30 giây/)}finally{f.dom.window.close()}
});
for(const text of ['0','-0.001','1e-3','0.000000001','0.001.0',''])test(`Invalid initial amount ${JSON.stringify(text)} blocks betting`,()=>{
 const f=fixture();try{f.field('amount',text);f.click();f.pump();assert.equal(f.submissions.length,0)}finally{f.dom.window.close()}
});
test('Comma decimal 0,00001 remains 0.00001',()=>{const f=fixture();try{f.field('amount','0,00001');f.click();f.until(1);assert.equal(f.submissions.length,1);assert.equal(f.submissions[0].amount,.00001)}finally{f.dom.window.close()}});
test('A delayed stale panel response cannot overwrite 0.001 with old 0.01',async()=>{
 const f=await panelFixture();try{
  f.core.field('amount','0.01');let release;
  f.w.chrome.tabs.sendMessage=async(_id,message)=>{const snapshot=f.core.remote(message);if(!message.action)await new Promise(r=>{release=r});return snapshot};
  f.poll();await new Promise(r=>setImmediate(r));
  const amount=f.w.document.querySelector('#amount');amount.value='0.001';amount.dispatchEvent(new f.w.Event('input',{bubbles:true}));amount.dispatchEvent(new f.w.Event('change',{bubbles:true}));
  release();await f.flush();assert.equal(Number(amount.value),.001);
  f.w.document.querySelector('#toggle').click();await f.flush();f.core.until(1);
  assert.equal(f.core.submissions.length,1);assert.equal(f.core.submissions[0].amount,.001);
 }finally{f.close()}
});
for(const percent of [1.3,1.1,1.05,2.5,0.01,14])test(`Native implicit-step percentage ${percent} is accepted without weakening stake checks`,()=>{
 const f=fixture();try{f.field('amount','0.0005');f.field('tp','0.6');f.field('sl','0.5');f.field('target','90');f.field('loss',String(percent));f.click();f.until(1);
  assert.equal(f.submissions.length,1);assert.equal(f.submissions[0].loss,percent);assert.equal(f.submissions[0].amount,.0005);assert.equal(f.submissions[0].tp,.6);assert.equal(f.submissions[0].sl,.5);
  if(!Number.isInteger(percent))assert.equal(f.one('on-loss-input').validity.stepMismatch,true);
 }finally{f.dom.window.close()}
});
for(const kind of ['max','min','custom','explicitStep','stakeStep','tpStep','slStep'])test(`Fractional percentage exception still rejects ${kind}`,()=>{
 const f=fixture();try{f.field('loss','1.3');const percent=f.one('on-loss-input');
  if(kind==='max')percent.max='1';if(kind==='min')percent.min='2';if(kind==='custom')percent.setCustomValidity('Rejected');if(kind==='explicitStep')percent.step='1';
  if(kind==='stakeStep')f.input.step='0.01';if(kind==='tpStep')f.one('stop-on-profit-input').step='1';if(kind==='slStep'){f.field('sl','0.5');f.one('stop-on-loss-input').step='1'}
  f.click();f.pump(150);assert.equal(f.submissions.length,0);assert.match(f.status(),/Cấu hình không hợp lệ:/);
 }finally{f.dom.window.close()}
});

test('Closed live statistics are opened before Auto, and an already open panel is never toggled',()=>{
 const f=fixture();try{
  const toggle=f.one('button-liveStats');toggle.setAttribute('data-active','false');f.one('bets-stats-profit').hidden=true;f.one('bets-stats-wagered').hidden=true;
  let opened=0;toggle.onclick=()=>{opened++;toggle.setAttribute('data-active','true')};
  f.click();f.pump(20);assert.equal(opened,1);assert.equal(f.submissions.length,0);
  f.one('bets-stats-profit').hidden=false;f.one('bets-stats-wagered').hidden=false;
  f.until(1);assert.equal(f.submissions.length,1);assert.equal(opened,1);
  f.advance();f.complete();f.until(2);assert.equal(f.submissions.length,2);assert.equal(opened,1);
 }finally{f.dom.window.close()}
});
test('Missing or unreadable live statistics block all Auto starts and report timeout',()=>{
 for(const mode of ['missing','unreadable','ambiguous']){
  const f=fixture();try{
   if(mode==='missing'){f.one('button-liveStats').remove();f.one('bets-stats-wagered').remove()}
   if(mode==='unreadable')f.one('bets-stats-wagered').textContent='…';
   if(mode==='ambiguous')f.w.document.body.append(f.one('bets-stats-wagered').cloneNode(true));
   f.click();f.pump(130);assert.equal(f.submissions.length,0);assert.match(f.status(),/bảng thống kê/);
  }finally{f.dom.window.close()}
 }
});
test('Each restart rechecks statistics and reopens a panel closed between cycles',()=>{
 const f=fixture();try{
  f.click();f.until(1);f.advance();f.complete();const toggle=f.one('button-liveStats');
  toggle.setAttribute('data-active','false');f.one('bets-stats-wagered').hidden=true;
  let opened=0;toggle.onclick=()=>{opened++;toggle.setAttribute('data-active','true');f.one('bets-stats-wagered').hidden=false};
  f.until(2);assert.equal(opened,1);assert.equal(f.submissions.length,2);
 }finally{f.dom.window.close()}
});
