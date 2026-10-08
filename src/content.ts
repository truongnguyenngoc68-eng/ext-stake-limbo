import {OBSERVED,readStored,writeStored,mergeRounds,stoppedSnapshot} from './persistence.ts';
import {readRounds,afterSnapshot} from './adapter.ts';
import type {Round} from './model.ts';
import {Live} from './live.ts';
import {StakeDOM} from './stake-dom.ts';
import type {LiveOptions} from './live.ts';
import type {Config} from './model.ts';
import {telegramDefaults,roundSignals} from './signals.ts';
import type {Signal,SignalRules} from './signals.ts';
const origin=chrome.runtime.getURL('').replace(/\/$/,'');
let live:Live|undefined;
let expanded=false;
let cancelPicker:(()=>void)|undefined;
function pickBalance(){
 cancelPicker?.();send('picker-status','Bấm vào con số số dư trong thanh đầu trang Stake');
 const handler=(event:MouseEvent)=>{
  const hit=event.target as Element;if(!hit.closest('[role="banner"],header')){send('picker-status','Chọn số dư ở thanh đầu trang');return}
  event.preventDefault();event.stopImmediatePropagation();
  const candidates=[hit,...Array.from(hit.querySelectorAll('span'))].filter(e=>/^\s*[$€₫]?\s*\d[\d.,\s]*\s*(?:USDT|BTC|ETH|BNB|LTC|SOL)?\s*$/i.test(e.textContent||''));
  const leaf=candidates.find(e=>!e.children.length)||candidates[0];if(!leaf){send('picker-status','Chưa chọn được số dư; bấm trực tiếp vào con số');return}
  const parts:string[]=[];let node:Element|null=leaf;let selector='';
  while(node){const id=node.id;const testId=node.getAttribute('data-testid');const base=id?`#${CSS.escape(id)}`:testId?`[data-testid="${CSS.escape(testId)}"]`:'';if(base&&document.querySelectorAll(base).length===1){parts.unshift(base);selector=parts.join(' > ');break}const siblings=node.parentElement?Array.from(node.parentElement.children).filter(e=>e.tagName===node!.tagName):[node];parts.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${siblings.indexOf(node)+1})`);node=node.parentElement}
  if(!selector)selector=parts.join(' > ');send('balance-picked',{selector,text:leaf.textContent?.trim()});cancelPicker?.();
 };
 document.addEventListener('click',handler,true);const timer=setTimeout(()=>{cancelPicker?.();send('picker-status','Đã hết thời gian chọn số dư')},30000);cancelPicker=()=>{document.removeEventListener('click',handler,true);clearTimeout(timer);cancelPicker=undefined};
}
let rules:SignalRules=telegramDefaults().rules;let sequence=0;let previousLiveRunning=false;
const reportedTrades=new Set<string>();let previousSteps:Record<string,number>={};
const fmt=(v:number)=>v.toFixed(8).replace(/0+$/,'').replace(/\.$/,'');
function emit(event:Signal){void chrome.runtime.sendMessage({type:'signal-event',event}).catch(()=>{})}
async function loadRules(){try{const result=await chrome.runtime.sendMessage({type:'signal-rules'});if(result?.targets&&result?.entry)rules=result}catch{}}
void loadRules();chrome.storage.onChanged.addListener(changes=>{if(changes['slide-telegram-v1'])void loadRules()});
function liveChanged(){
 if(!live)return;send('live-state',live.snapshot());persistObserved();
 if(live.running!==previousLiveRunning){emit({id:crypto.randomUUID(),time:Date.now(),kind:live.running||/người dùng|giới hạn|Đạt|hết bảng/.test(live.message)?'startStop':'error',text:`${live.running?'▶':'■'} [STAKE] AUTO\n${live.running?'Bắt đầu phiên':live.message}`});previousLiveRunning=live.running}
 for(const t of live.engine.trades){const id=`${t.roundId}:${t.target}:${t.step}`;if(reportedTrades.has(id)||t.outcome==='WAIT')continue;reportedTrades.add(id);emit({id,time:t.time,kind:t.outcome==='WIN'?'win':'loss',text:`${t.outcome==='WIN'?'🎉':'❌'} [STAKE] ${t.outcome==='WIN'?'THẮNG':'THUA'} · ${t.target}\nx${t.result} / x${t.target} · cược ${fmt(t.amount)}\nP/L vòng: ${t.profit>=0?'+':''}${fmt(t.profit)} · tổng: ${fmt(live.engine.profit)}\nVốn~${fmt(live.engine.balance)} · ${t.outcome==='WIN'?'reset bậc 1':`bậc ${live.engine.positions[t.tableId].step+1}`}`})}
 for(const t of live.engine.config.targets){const p=live.engine.positions[t.id];if(previousSteps[t.id]!==undefined&&p.step>previousSteps[t.id])emit({id:crypto.randomUUID(),time:Date.now(),kind:'step',text:`📈 [STAKE] TĂNG BẬC · ${t.target}\nBậc ${p.step+1}/${t.steps.length} · cược ${fmt(t.steps[p.step].amount)} · x${t.steps[p.step].multiplier??t.target}`});previousSteps[t.id]=p.step}
 if(reportedTrades.size>20000){const keep=Array.from(reportedTrades).slice(-10000);reportedTrades.clear();keep.forEach(id=>reportedTrades.add(id))}
}
function signalRound(r:Round){sequence++;for(const signal of roundSignals(r,history,rules)){
 if(signal.kind==='round'){const en=live?.running?live.engine:undefined;const wallet=live?.balanceGuard.last;signal.text=`💰 [STAKE] R${sequence} · x${r.value}${en?wallet!==null&&wallet!==undefined?` · số dư ${fmt(wallet)}`:` · vốn~${fmt(en.balance)}`:''}`;
 if(en)signal.text+='\n'+en.config.targets.filter(t=>t.enabled).map(t=>{const p=en.positions[t.id],s=t.steps[p.step];return `• ${t.target}: ${p.step+1}/${t.steps.length} - ${p.used}/${s.rounds}v${p.stopped?' (dừng)':!p.active&&t.entry.enabled?' (chờ)':''}`}).join('\n')}
 emit(signal)}
}
async function startLive(config:Config,options:LiveOptions){
 if(live?.running){send('live-state',live.snapshot());return}
 try{
  if(unavailable||!previous.length||Date.now()-lastChange>45000)throw Error('Nguồn vòng chưa ổn định');
  await navigator.locks.request('stake-slide-lab-auto',{ifAvailable:true},async lock=>{
   if(!lock)throw Error('Auto đang được dùng ở tab khác');
   reportedTrades.clear();previousSteps={};previousLiveRunning=false;
   live=new Live(config,history,options,liveChanged);
   liveChanged();
   await new Promise<void>(resolve=>{live!.release=resolve});
  });
 }catch(e){send('live-state',{running:false,message:String(e),trades:[],next:[]})}
}
let restoredLive:any=null;let observedQueue=Promise.resolve();let lastPersisted='';
function persistObserved(){const data={history,sequence,live:live?.snapshot()??restoredLive};const serialized=JSON.stringify(data);if(serialized===lastPersisted)return;lastPersisted=serialized;observedQueue=observedQueue.catch(()=>{}).then(()=>writeStored(OBSERVED,JSON.parse(serialized))).catch(()=>{lastPersisted='';send('picker-status','Không lưu được lịch sử trong extension')})}
let frame:HTMLIFrameElement|undefined;let previous:Round[]=[];let history:Round[]=[];let lastChange=Date.now();let unavailable=false;
function send(type:string,data:unknown){frame?.contentWindow?.postMessage({channel:'slide-lab',type,data},origin)}
function toggle(){
 if(frame){frame.remove();frame=undefined;return}
 frame=document.createElement('iframe');frame.src=chrome.runtime.getURL('index.html');frame.title='Slide Lab — mô phỏng';
 Object.assign(frame.style,{position:'fixed',top:'12px',right:'12px',width:'420px',maxWidth:'calc(100vw - 24px)',height:'calc(100vh - 24px)',border:'1px solid #2d4454',borderRadius:'16px',zIndex:'2147483647',boxShadow:'0 20px 80px #0008'});document.documentElement.append(frame);
 (document.fullscreenElement||document.documentElement).append(frame);
}
document.addEventListener('fullscreenchange',()=>{if(frame)(document.fullscreenElement||document.documentElement).append(frame)});
window.addEventListener('message',e=>{if(!frame||e.source!==frame.contentWindow||e.origin!==origin||e.data?.channel!=='slide-lab')return;if(e.data.type==='ready'){send('seed',history);send('status',{ok:!unavailable&&previous.length>0&&Date.now()-lastChange<45000,count:history.length});if(live)send('live-state',live.snapshot());else if(restoredLive)send('live-state',restoredLive)}if(e.data.type==='update-config'){try{if(!live)throw Error('Chưa có phiên Auto');live.updateConfig(e.data.config);send('picker-status','Đã lưu chiến thuật; áp dụng sau ván đang cược hoặc tại cửa sổ tiếp theo')}catch(error){send('picker-status',String(error))}}if(e.data.type==='adjust-step'){try{live?.adjustStep(e.data.id,e.data.delta)}catch(error){send('picker-status',String(error))}}if(e.data.type==='diagnostics'){try{send('diagnostics',live?.diagnostics()||{version:'1.0.10',state:'Chưa có phiên Auto',current:new StakeDOM(document,()=>true,'usdt').diagnostics()})}catch(error){send('diagnostics',{version:'1.0.10',error:String(error)})}}if(e.data.type==='wide'){expanded=!expanded;frame.style.width=expanded?'min(1100px, calc(100vw - 24px))':'420px'}if(e.data.type==='pick-balance')pickBalance();if(e.data.type==='check-live'){try{send('picker-status',live?.driver.health(live.engine.next().filter(p=>p.action==='BET'))||'Bắt đầu phiên sau khi chọn số dư để kiểm tra đầy đủ')}catch(e){send('picker-status',String(e))}}if(e.data.type==='start-live')void startLive(e.data.config,e.data.options);if(e.data.type==='stop-live')void live?.stop('Đã dừng bởi người dùng');if(e.data.type==='close'){frame.remove();frame=undefined}});
chrome.runtime.onMessage.addListener(msg=>{if(msg?.type==='toggle-slide-lab')toggle()});
function scan(){
 if(!/\/casino\/games\/slide\/?$/.test(location.pathname)){if(!unavailable){unavailable=true;send('gap',[]);void live?.stop('Đã rời trang Slide')}send('status',{ok:false,count:history.length});return}
 const current=readRounds();if(!current.length){if(!unavailable){unavailable=true;send('gap',[]);void live?.stop('Mất dữ liệu lịch sử')}send('status',{ok:false,count:history.length});return}
 const batch=afterSnapshot(previous,current);
 if(unavailable){history=mergeRounds(history,current);send('gap',history);lastChange=Date.now()}else if(batch.kind==='seed'){history=mergeRounds(history,current);sequence=Math.max(sequence,history.length);send('seed',history);lastChange=Date.now()}else if(batch.kind==='gap'){history=mergeRounds(history,current);send('gap',history);void live?.stop('Mất ID vòng liên tiếp');lastChange=Date.now()}else if(batch.rounds.length){live?.observe(batch.rounds);for(const r of batch.rounds){signalRound(r);history.push(r)}history=history.slice(-5000);send('rounds',batch.rounds);lastChange=Date.now()}
 persistObserved();unavailable=false;previous=current;send('status',{ok:Date.now()-lastChange<45000,count:history.length});
 if(live?.running){if(Date.now()-lastChange>45000||!navigator.onLine)void live.stop('Nguồn game gián đoạn');else void live.tick().catch(e=>live?.stop(String(e)))}
}
async function initialize(){try{const saved=await readStored(OBSERVED);if(saved){history=saved.history??[];sequence=saved.sequence??history.length;restoredLive=stoppedSnapshot(saved.live)}}catch{send('picker-status','Không khôi phục được lịch sử đã lưu')}scan();setInterval(scan,500)}
void initialize();
