import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {StakeDOM} from '../src/stake-dom.ts';
import {readRounds} from '../src/adapter.ts';
function fixture(){
 const dom=new JSDOM(`<div class="game-sidebar"><button data-testid="auto-tab">Tự động</button><label><div><input type="number" data-testid="input-game-amount" data-bet-amount-active-currency="usdt"></div></label><input type="number" data-testid="target-multiplier-2.00"><input type="number" data-testid="limit-input"><button data-testid="autobet-add-bet">Thêm cược</button><div class="my-bets"><ul class="rows"></ul></div><button id="start">Bắt Đầu Cược Tự Động</button></div><div class="bottom-bar"><div class="wrap">Vòng tiếp theo trong: 9.0s</div></div><button data-past-game-id="seed" data-last-game-index="0">1,23×</button>`);
 const w=dom.window;Object.assign(globalThis,{HTMLInputElement:w.HTMLInputElement,Event:w.Event});Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
 w.Element.prototype.getClientRects=function(){return this.hasAttribute('hidden')?[]:[{width:100,height:20}]} as any;
 const events:string[]=[];const root=w.document;const list=root.querySelector('ul')!;
 root.querySelector('[data-testid="autobet-add-bet"]')!.addEventListener('click',()=>{const amount=(root.querySelector('[data-testid="input-game-amount"]') as HTMLInputElement).value;const target=(root.querySelector('[data-testid^="target-multiplier-"]') as HTMLInputElement).value;events.push(`add:${target}:${amount}`);const row=root.createElement('li');row.innerHTML=`<span>${target}×</span><span>${Number(amount).toFixed(8)}</span><button><svg data-ds-icon="Trash"></svg></button>`;row.querySelector('button')!.addEventListener('click',()=>{events.push('delete');row.remove()});list.append(row)});
 root.querySelector('#start')!.addEventListener('click',()=>{events.push('start');root.querySelector('#start')!.textContent='Dừng Cược Tự Động'});
 return {root,events,driver:new StakeDOM(root,()=>true,'usdt')};
}
const bet=(step:number,amount:number,target=450)=>({id:'450',step,amount,target,rounds:1,action:'BET' as const});
test('Delete all previous rows before adding changed ladder and verify amount',async()=>{const {driver,events}=fixture();await driver.configure([bet(1,.01)]);await driver.configure([bet(2,.03)]);assert.deepEqual(events,['add:450:0.01','delete','add:450:0.03']);assert.ok(driver.verify([bet(2,.03)]))});
test('Retain native list across steps with equal amount and target',async()=>{const {driver,events}=fixture();await driver.configure([bet(1,.01)]);await driver.configure([bet(2,.01)]);assert.equal(events.filter(e=>e==='delete').length,0)});
test('Unchanged step retains list, finite native limit is 1',async()=>{const {driver,events,root}=fixture();await driver.configure([bet(1,.01)]);await driver.configure([bet(1,.01)]);assert.equal(events.length,1);assert.equal((root.querySelector('[data-testid="limit-input"]') as HTMLInputElement).value,'1')});
test('Two target rows retained exactly and submit only after verification',async()=>{const {driver,events}=fixture();const bets=[bet(1,.01,90),{...bet(1,.03),id:'second'}];await driver.configure(bets);await driver.submit(bets,'seed');assert.equal(events.at(-1),'start');assert.ok(driver.verify(bets))});
test('Altered list and wrong anchor block submit',async()=>{const {driver,events}=fixture();await driver.configure([bet(1,.01)]);await assert.rejects(driver.submit([bet(1,.03)],'seed'));await assert.rejects(driver.submit([bet(1,.01)],'unknown'));assert.ok(!events.includes('start'))});
test('Locale parser, ordering, repeated values and hidden duplicate layout',()=>{const {root}=fixture();const older=root.createElement('button');older.setAttribute('data-past-game-id','old');older.setAttribute('data-last-game-index','1');older.textContent='1,23×';root.body.append(older);const hidden=older.cloneNode(true) as HTMLElement;hidden.setAttribute('hidden','');hidden.setAttribute('data-past-game-id','hidden');root.body.prepend(hidden);assert.deepEqual(readRounds(root).map(r=>r.id),['old','seed'])});

test('Countdown reads nested signed-in layout instead of requiring the first wrap',()=>{const {root,driver}=fixture();root.querySelector('.bottom-bar')!.innerHTML='<div class="wrap">Trạng thái kết nối mạng</div><section><span>Vòng tiếp theo trong:</span><span> 5,4 s</span></section>';assert.equal(driver.countdown(),5.4);root.querySelector('.bottom-bar')!.remove();const countdown=root.createElement('div');countdown.textContent='Vòng tiếp theo trong: 6.2s';root.body.append(countdown);assert.equal(driver.countdown(),6.2)});

test('Signed-in receipt reads amount without requiring an input disabled flag or nested text class',async()=>{const {driver,root}=fixture();await driver.configure([bet(1,.001)],0);assert.equal((root.querySelector('[data-testid="limit-input"]') as HTMLInputElement).value,'0');await driver.submit([bet(1,.001)],'seed',0);root.querySelector('.bottom-bar')!.textContent='';const box=root.createElement('div');box.setAttribute('data-testid','slide-status-box');box.textContent='Cược Của Tôi 0.00100000';root.body.append(box);assert.equal(driver.currentStake(),.001);box.textContent='Cược Của Tôi 0.00000000';assert.equal(driver.currentStake(),0)});

test('Untagged game status reads .005 and ignores count-plus-amount list headers',async()=>{const {root,driver}=fixture();await driver.configure([bet(1,.005)],0);await driver.submit([bet(1,.005)],'seed',0);root.querySelector('.bottom-bar')!.textContent='';const box=root.createElement('div');box.innerHTML='<span>Cược Của Tôi</span><svg></svg><span>0.00500000</span>';root.body.append(box);assert.equal(driver.currentStake(),.005);const listHeader=root.createElement('div');listHeader.textContent='Cược Của Tôi 5 0.00500000';root.body.append(listHeader);assert.equal(driver.currentStake(),.005)});

test('Actual diagnostic regression: label-first status never reads sidebar count 5',async()=>{const {root,driver}=fixture();await driver.configure([bet(1,.05)],0);await driver.submit([bet(1,.05)],'seed',0);const header=root.createElement('div');header.className='my-bets';header.innerHTML='<span>Cược Của Tôi 5</span>';root.querySelector('.game-sidebar')!.append(header);const box=root.createElement('div');box.setAttribute('data-testid','slide-status-box');box.innerHTML='<div class="content"><span data-ds-text>Cược Của Tôi</span><svg></svg><span data-ds-text>0.05000000</span></div>';root.body.append(box);assert.deepEqual(driver.statusAmounts(),[.05]);assert.equal(driver.currentStake(),.05);box.textContent='15 người chiến thắng 0.08678720';assert.deepEqual(driver.statusAmounts(),[]);assert.equal(driver.currentStake(),null);box.textContent='Cược Của Tôi 0.00000000';assert.deepEqual(driver.statusAmounts(),[0])});

test('Start blocked before click when game amount is locked',async()=>{const {root,driver,events}=fixture();await driver.configure([bet(1,.001)],0);(root.querySelector('[data-testid="input-game-amount"]') as HTMLInputElement).disabled=true;await assert.rejects(driver.submit([bet(1,.001)],'seed',0),/khóa/);assert.ok(!events.includes('start'))});

test('Locked game while reconfiguring ladder defers before deleting accepted list',async()=>{const {root,driver,events}=fixture();await driver.configure([bet(1,.001)],0);(root.querySelector('[data-testid="input-game-amount"]') as HTMLInputElement).disabled=true;await assert.rejects(driver.configure([bet(2,.003)],0),/chuyển pha/);assert.ok(driver.verify([bet(1,.001)]));assert.equal(events.filter(e=>e==='delete').length,0)});

test('Cancel acknowledges native Auto and repeated submit never toggles it off',async()=>{
 const {root,driver,events}=fixture();await driver.configure([bet(1,.001)],0);
 root.querySelector('#start')!.addEventListener('click',()=>{root.querySelector('#start')!.textContent='Hủy'});
 await driver.submit([bet(1,.001)],'seed',0);assert.equal(driver.nativeActive,true);
 const box=root.createElement('div');box.setAttribute('data-testid','slide-status-box');box.textContent='Cược Của Tôi 0.00100000';root.body.append(box);
 assert.equal(driver.currentStake(),.001);await assert.rejects(driver.submit([bet(1,.001)],'seed',0),/Auto đã bật/);
 await assert.rejects(driver.configure([bet(2,.003)],0),/Auto đang chạy/);assert.equal(events.filter(e=>e==='start').length,1);
 root.querySelector('#start')!.textContent='Dừng Cược Tự Động';assert.equal(driver.currentStake(),.001);
});
test('Delayed Stop/Cancel acknowledgement clicks once including concurrent stop requests',async()=>{
 const {root,driver}=fixture();const old=root.querySelector('#start')!;const toggle=old.cloneNode(true) as HTMLButtonElement;old.replaceWith(toggle);
 toggle.textContent='Hủy';driver.nativeActive=true;let clicks=0;
 toggle.addEventListener('click',()=>{clicks++;toggle.textContent='Dừng Cược Tự Động';setTimeout(()=>{toggle.textContent='Bắt Đầu Cược Tự Động'},350)});
 await Promise.all([driver.stopNative(),driver.stopNative()]);assert.equal(clicks,1);assert.equal(driver.nativeActive,false);
 await driver.stopNative();assert.equal(clicks,1);
});
test('Auto activating during preparation prevents a stale Start click',async()=>{
 const {root,driver,events}=fixture();await driver.configure([bet(1,.001)],0);
 setTimeout(()=>{root.querySelector('#start')!.textContent='Hủy'},20);
 await assert.rejects(driver.submit([bet(1,.001)],'seed',0),/Trạng thái Auto đã đổi/);assert.ok(!events.includes('start'));
});

test('Live plus DOM integration: keep Cancel/Stop across rounds and delete/re-add only for changed amount',async()=>{
 const {Live}=await import('../src/live.ts');const {defaults}=await import('../src/model.ts');
 const {root,driver,events}=fixture();const old=root.querySelector('#start')!;const toggle=old.cloneNode(true) as HTMLButtonElement;old.replaceWith(toggle);
 let starts=0,stops=0;toggle.addEventListener('click',()=>{if(toggle.textContent==='Bắt Đầu Cược Tự Động'){starts++;toggle.textContent='Hủy'}else{stops++;toggle.textContent='Bắt Đầu Cược Tự Động'}});
 const wallet=root.createElement('span');wallet.id='wallet';wallet.textContent='1.00000000';root.body.append(wallet);driver.balanceSelector='#wallet';
 const box=root.createElement('div');box.setAttribute('data-testid','slide-status-box');box.textContent='Cược Của Tôi 0.00000000';root.body.append(box);
 const c=defaults();c.stopLoss=0;c.takeProfit=0;c.targets=c.targets.filter(t=>t.enabled);c.targets[0].steps=[{amount:.001,rounds:2,action:'BET'},{amount:.003,rounds:100,action:'BET'}];
 const live=new Live(c,[{id:'seed',value:1.23,time:0}],{currency:'usdt',maxRoundBet:0,maxTotalBet:0,maxRounds:0,continuous:true},()=>{},driver);
 await live.tick();assert.equal(starts,1);assert.equal((root.querySelector('[data-testid="limit-input"]') as HTMLInputElement).value,'0');
 for(let i=1;i<=3;i++){
  box.textContent='Cược Của Tôi '+(i<=2?'0.00100000':'0.00300000');toggle.textContent=i%2?'Hủy':'Dừng Cược Tự Động';await live.tick();assert.equal(live.pending?.receiptSeen,true);
  for(const el of root.querySelectorAll('[data-last-game-index]'))el.setAttribute('data-last-game-index',String(Number(el.getAttribute('data-last-game-index'))+1));
  const r={id:'actual-'+i,value:1.01,time:i};const history=root.createElement('button');history.setAttribute('data-past-game-id',r.id);history.setAttribute('data-last-game-index','0');history.textContent='1.01×';root.body.append(history);
  wallet.textContent=String(1-(i<=2?i*.001:.005));box.textContent='Cược Của Tôi 0.00000000';live.observe([r]);
  while(live.checkingBalance)await new Promise(r=>setTimeout(r,20));assert.equal(live.running,true);
  await live.tick();if(i===1){assert.equal(starts,1);assert.equal(stops,0);assert.equal(events.filter(e=>e==='delete').length,0)}
 }
 assert.equal(starts,2);assert.equal(stops,1);assert.equal(events.filter(e=>e==='delete').length,1);assert.equal(live.betRounds,3);assert.equal(live.engine.turnover,.005);assert.equal(live.engine.positions['450'].used,1);
 await live.stop('test complete');assert.equal(stops,2);assert.equal(starts,2);
});

test('Regression: nine rows including grouped x3300/x9300/x19300 can be configured and started',async()=>{
 const {root,driver,events}=fixture();root.querySelector('[data-testid="autobet-add-bet"]')!.addEventListener('click',()=>{
  const row=root.querySelector('ul')!.lastElementChild!;const value=Number((root.querySelector('[data-testid^="target-multiplier-"]') as HTMLInputElement).value);
  row.querySelector('span')!.textContent=value.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+'×';
 });
 const wanted=[90,250,350,440,880,120,3300,9300,19300].map((target,i)=>({...bet(1,i<6?.005:.001,target),id:String(target)}));
 await driver.configure(wanted,0);assert.ok(driver.verify(wanted));await driver.submit(wanted,'seed',0);assert.equal(events.filter(e=>e==='start').length,1);assert.equal(driver.rows().length,9);
});

test('Large English grouped targets are verified regardless of native row insertion order',async()=>{
 const {root,driver,events}=fixture();root.querySelector('[data-testid="autobet-add-bet"]')!.addEventListener('click',()=>{
  const list=root.querySelector('ul')!,row=list.lastElementChild!;const value=Number((root.querySelector('[data-testid^="target-multiplier-"]') as HTMLInputElement).value);
  row.querySelector('span')!.textContent=value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'×';list.prepend(row);
 });
 const wanted=[90,3300,4000000].map(target=>({...bet(1,.00100001,target),id:String(target)}));await driver.configure(wanted,0);assert.ok(driver.verify(wanted));await driver.submit(wanted,'seed',0);assert.equal(events.filter(e=>e==='start').length,1);
});
test('Actual altered amount still blocks Auto after grouped target parser fix',async()=>{
 const {root,driver,events}=fixture();root.querySelector('[data-testid="autobet-add-bet"]')!.addEventListener('click',()=>{root.querySelector('ul')!.lastElementChild!.querySelectorAll('span')[1].textContent='0.00200000'});
 await assert.rejects(driver.configure([bet(1,.001,3300)],0),/cần x3300 · 0.001/);assert.ok(!events.includes('start'));
});
test('Grouped multiplier parsing preserves decimals and rejects malformed grouping',async()=>{
 const {multiplier}=await import('../src/adapter.ts');for(const [text,value] of [['3.300,00×',3300],['9,300.00×',9300],['19.300,00×',19300],['4.000.000,00×',4000000],['4,000,000.00×',4000000],['4.000.000×',4000000],['3\u202f300,25×',3300.25],['1,001×',1.001],['1.01×',1.01]] as const)assert.equal(multiplier(text),value,text);
 for(const text of ['3.30,00×','3,30.00×','4..000×','4,000.00.00×'])assert.ok(Number.isNaN(multiplier(text)),text);
 const {root}=fixture();root.querySelector('[data-past-game-id]')!.textContent='19.300,00×';assert.equal(readRounds(root)[0].value,19300);
});
