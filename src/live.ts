import {Engine,matches} from './engine.ts';
import {StakeDOM,WindowClosed} from './stake-dom.ts';
import type {Bet} from './stake-dom.ts';
import {validate} from './model.ts';
import type {Config,Round} from './model.ts';
import {BalanceGuard} from './balance-guard.ts';
export interface LiveOptions {currency:string;maxRoundBet:number;maxTotalBet:number;maxRounds:number;continuous?:boolean;balanceSelector?:string}
const samePlans=(a:Bet[],b:Bet[])=>JSON.stringify(a.map(p=>[p.id,p.amount,p.target,p.action]))===JSON.stringify(b.map(p=>[p.id,p.amount,p.target,p.action]));
export class Live {
 engine:Engine;driver:StakeDOM;options:LiveOptions;running=true;busy=false;pending:{anchor:string;ids:Set<string>;bets:Bet[];time:number;receiptSeen:boolean}|null=null;lastSubmitted='';lastSeen='';message='Chờ cửa sổ cược';attempts=0;onChange:()=>void;release:(()=>void)|undefined;
 queuedConfig:Config|null=null;
 stepRequests=new Map<string,number>();trace:any[]=[];batchRemaining=0;betRounds=0;balanceGuard:BalanceGuard;checkingBalance=false;
 constructor(config:Config,seed:Round[],opts:LiveOptions,onChange:()=>void,driver?:StakeDOM){
  if(!/^[a-z0-9]{2,10}$/i.test(opts.currency)||![opts.maxRoundBet,opts.maxTotalBet,opts.maxRounds].every(v=>Number.isFinite(v)&&v>=0)||!Number.isInteger(opts.maxRounds))throw Error('Giới hạn Auto không hợp lệ');
  this.engine=new Engine(config,seed);this.options=opts;this.onChange=onChange;this.driver=driver||new StakeDOM(document,()=>this.running,opts.currency,opts.balanceSelector);this.lastSeen=seed.at(-1)?.id||'';this.balanceGuard=new BalanceGuard(this.driver.readBalance?.()??null);
 }
 updateConfig(config:Config){
  if(!this.running)throw Error('Phiên Auto đã dừng; lưu chiến thuật cho phiên mới');
  validate(config);if(config.bankroll!==this.engine.config.bankroll)throw Error('Vốn khởi tạo chỉ đổi khi bắt đầu phiên mới');
  this.queuedConfig=structuredClone(config);this.record('config-queued');this.message=this.pending||this.busy?'Đã lưu chiến thuật; chờ ván đang cược kết thúc để áp dụng':'Đã lưu chiến thuật; áp dụng tại cửa sổ cược tiếp theo';this.onChange();
 }
 applyConfig(){
  if(!this.queuedConfig)return;const config=this.queuedConfig;this.queuedConfig=null;this.engine.updateConfig(config);
  for(const [id,step] of this.stepRequests){const t=config.targets.find(t=>t.id===id&&t.enabled);if(!t)this.stepRequests.delete(id);else this.stepRequests.set(id,Math.min(step,t.steps.length-1))}
  this.record('config-applied');
 }
 adjustStep(id:string,delta:number){
  if(!this.running)throw Error('Bắt đầu Auto trước khi chỉnh bậc Live');if(this.busy||this.checkingBalance)throw Error('Đang đồng bộ; chờ một chút rồi chỉnh bậc');if(delta!==1&&delta!==-1)throw Error('Chỉ tăng/giảm một bậc');
  const t=this.engine.config.targets.find(t=>t.id===id&&t.enabled);if(!t)throw Error('Bảng chưa bật');const current=this.stepRequests.get(id)??this.engine.positions[id].step;const next=Math.max(0,Math.min(t.steps.length-1,current+delta));if(next===current)return;
  this.stepRequests.set(id,next);this.record('manual-step',{id,step:next+1});this.message=`x${t.target}: yêu cầu bậc ${next+1}${this.pending?' sau ván đang cược':' tại cửa sổ cược tiếp theo'}`;this.onChange();
 }
 applyStepRequests(){if(!this.stepRequests.size)return;for(const [id,step] of this.stepRequests){const p=this.engine.positions[id];p.step=step;p.used=0;p.active=true;p.stopped=false}this.stepRequests.clear();if(this.engine.halted==='Đã hết bảng')this.engine.halted=''}
 record(event:string,data?:unknown){let dom:unknown;try{if(typeof this.driver.diagnostics==='function')dom=this.driver.diagnostics()}catch(e){dom={error:String(e)}}this.trace.push({time:Date.now(),event,data,lastSeen:this.lastSeen,pending:this.pending?{anchor:this.pending.anchor,receiptSeen:this.pending.receiptSeen,bets:this.pending.bets}:null,dom});this.trace=this.trace.slice(-80)}
 diagnostics(){let dom:unknown;try{dom=this.driver.diagnostics()}catch(e){dom={error:String(e)}}return {version:'1.0.10',state:this.snapshot(),trace:this.trace,current:dom}}
 progress(){
  const last=new Map<string,typeof this.engine.trades[number]>();for(const trade of [...this.engine.trades].reverse()){if(!last.has(trade.tableId))last.set(trade.tableId,trade)}
  return this.engine.config.targets.map(t=>{
   const p=this.engine.positions[t.id],s=t.steps[p.step],a=this.engine.byTarget[t.id];let entryUsed=0;
   if(t.entry.enabled)for(const r of [...this.engine.history].reverse()){if(!matches([r],{...t,entry:{...t.entry,count:1}}))break;entryUsed++;if(entryUsed>=t.entry.count)break}
   const waiting=!p.active&&!matches(this.engine.history,t),accepted=this.pending?.ids.has(t.id)&&s.action==='BET';
   return {id:t.id,target:t.target,enabled:t.enabled,actualTarget:s.multiplier??t.target,amount:s.action==='WAIT'?0:s.amount,action:s.action,step:p.step+1,steps:t.steps.length,used:p.used,limit:s.rounds,cycleUsed:p.stopped?t.steps.reduce((v,s)=>v+s.rounds,0):t.steps.slice(0,p.step).reduce((v,s)=>v+s.rounds,0)+p.used,cycleLimit:t.steps.reduce((v,s)=>v+s.rounds,0),wins:a.wins,losses:a.losses,profit:a.profit,outcome:last.get(t.id)?.outcome||'—',entryUsed,entryCount:t.entry.count,waiting,queuedStep:this.stepRequests.has(t.id)?this.stepRequests.get(t.id)!+1:null,
    reason:!t.enabled?'Tắt':!this.running?'Đã dừng':p.stopped?'Hết bảng':waiting?`Chờ ${entryUsed}/${t.entry.count} vòng ${t.entry.op} ${t.entry.value}`:s.action==='WAIT'?'Bậc Chờ':accepted?this.pending?.receiptSeen?'Đã thấy cược · chờ kết quả':'Chờ xác nhận cược':'Chờ cửa sổ cược'};
  });
 }
 snapshot(){return {bankroll:this.engine.config.bankroll,configUpdatePending:!!this.queuedConfig,running:this.running,busy:this.busy,message:this.message,pending:!!this.pending,attempts:this.attempts,betRounds:this.betRounds,batchRemaining:this.batchRemaining,wallet:this.balanceGuard.last,unchangedBalance:this.balanceGuard.unchanged,balance:this.engine.balance,profit:this.engine.profit,count:this.engine.count,wins:this.engine.wins,losses:this.engine.losses,turnover:this.engine.turnover,drawdown:this.engine.drawdown,byTarget:this.engine.byTarget,targets:this.engine.config.targets.map(t=>({id:t.id,target:t.target})),targetStates:this.engine.config.targets.map(t=>({id:t.id,target:t.target,enabled:t.enabled,reason:!t.enabled?'Tắt':this.engine.positions[t.id].stopped?'Hết bảng':!this.engine.positions[t.id].active&&!matches(this.engine.history,t)?`Chờ ${t.entry.count} vòng liên tiếp ${t.entry.op} ${t.entry.value}`:'Sẵn sàng / đang cược'})),next:this.engine.next(),trades:this.engine.trades.slice(-100),currency:this.options.currency,progress:this.progress()}}
 async stop(reason:string){this.record('stop',reason);this.running=false;this.message=reason;this.onChange();try{await this.driver.stopNative()}catch(e){this.message+=` • ${String(e)}`;this.onChange()}finally{this.release?.()}}
 observe(batch:Round[]){
  if(!this.running)return;batch=batch.filter(r=>!this.engine.seen.has(r.id));if(!batch.length)return;this.record('results',batch);
  if(this.busy&&batch.length){void this.stop('Vòng đổi trong lúc đồng bộ; kiểm tra cược trên Stake');return}
  for(const r of batch){if(this.engine.seen.has(r.id))continue;
   if(this.pending){if(!this.pending.receiptSeen||batch.length!==1||this.lastSeen!==this.pending.anchor){void this.stop(!this.pending.receiptSeen?`Chưa đọc được xác nhận tổng cược ${this.pending.bets.reduce((sum,b)=>sum+b.amount,0)} trong pha quay; không tự suy đoán kết quả`:batch.length!==1?`Mất ${batch.length} kết quả liên tiếp; cần kiểm tra lại phiên`:'ID vòng không khớp lệnh đã gửi');return}const settled=this.pending;this.engine.consume(r,this.pending.ids);this.pending=null;this.applyConfig();this.applyStepRequests();this.betRounds++;if(this.batchRemaining>0)this.batchRemaining--;this.message='Đã cập nhật kết quả; chờ vòng tiếp theo';const following=this.engine.next() as Bet[];if(this.options.continuous&&(this.batchRemaining<0||this.batchRemaining>0)&&samePlans(settled.bets,following.filter(p=>p.action==='BET'))){this.pending={anchor:r.id,ids:new Set(following.map(p=>p.id)),bets:following.filter(p=>p.action==='BET'),time:Date.now(),receiptSeen:false};this.message='Giữ nguyên Stake Auto: mức cược chưa đổi'}void this.checkBalance(settled.bets)}else this.engine.consume(r,new Set(this.engine.next().filter(p=>p.action==='WAIT').map(p=>p.id)));
   this.lastSeen=r.id;
   if(this.pending){const nextCost=this.pending.bets.reduce((sum,b)=>sum+b.amount,0);if((this.options.maxRounds>0&&this.betRounds>=this.options.maxRounds)||(this.options.maxTotalBet>0&&this.engine.turnover+nextCost>this.options.maxTotalBet+1e-9)||nextCost>this.engine.balance){this.pending=null;void this.stop('Đạt giới hạn vốn / lượt Auto');break}}
   if(this.engine.halted){void this.stop(this.engine.halted);break}
  }this.onChange();
 }
 async checkBalance(bets:Bet[]){this.checkingBalance=true;try{if(!this.pending&&this.driver.nativeActive)await this.driver.stopNative();if(typeof this.driver.readBalance!=='function')return;await new Promise(r=>setTimeout(r,800));if(!this.running)return;const sample=this.balanceGuard.sample(this.driver.readBalance(),true);if(sample.check){await this.stop(`${sample.reason} • ${this.driver.health(bets)}`)}this.onChange()}catch(e){await this.stop(`Không xác nhận được trạng thái Auto: ${String(e)}`)}finally{this.checkingBalance=false}}
 batchSize(_bets:Bet[],_cost:number){return this.options.continuous?0:1}
 async tick(){
  if(!this.running||this.busy)return;
  try{this.driver.assertAlive?.()}catch(e){await this.stop(`Kết nối / trạng thái game cần kiểm tra: ${String(e)}`);return}
  if(this.pending){const shown=this.driver.currentStake();const cost=this.pending.bets.reduce((s,b)=>s+b.amount,0);if(shown!==null&&Math.abs(shown-cost)<0.000000005&&!this.pending.receiptSeen){this.pending.receiptSeen=true;this.record('receipt',shown);this.onChange()}if(Date.now()-this.pending.time>45000)await this.stop('Quá 45 giây chưa xác định kết quả cược');return}
  if(this.checkingBalance)return;
  this.applyConfig();this.applyStepRequests();if(this.engine.halted){await this.stop(this.engine.halted);return}const plans=this.engine.next() as Bet[];const bets=plans.filter(p=>p.action==='BET');
  if(!bets.length){const message=plans.length?'Đang ở bậc Chờ — không đặt cược':'Đang chờ điều kiện vào chuỗi / target chưa sẵn sàng';if(this.message!==message){this.message=message;this.onChange()}return;}
  const cost=bets.reduce((s,b)=>s+b.amount,0);
  if(this.options.maxRoundBet>0&&cost>this.options.maxRoundBet+1e-9){await this.stop(`Tổng vòng tới ${Number(cost.toFixed(8))} vượt trần/vòng ${this.options.maxRoundBet}: ${bets.map(b=>`x${b.target}=${b.amount}`).join(' + ')}`);return}
  if((this.options.maxTotalBet>0&&this.engine.turnover+cost>this.options.maxTotalBet+1e-9)||(this.options.maxRounds>0&&this.betRounds>=this.options.maxRounds)||cost>this.engine.balance){await this.stop('Đạt giới hạn ngân sách / tổng tiền đặt / lượt phiên');return}
  const seconds=this.driver.countdown();if(seconds<4||this.lastSubmitted===this.lastSeen){const message=this.lastSubmitted===this.lastSeen?'Đã gửi lượt ở vòng này, chờ kết quả mới':`Chờ cửa sổ cược: đọc được ${seconds}s (cần ≥4s)`;if(this.message!==message){this.message=message;this.onChange()}return;}
  // No duplicate targets: the page may merge them into a different amount.
  if(new Set(bets.map(p=>p.target)).size!==bets.length){await this.stop('Hai bảng đang có cùng target; tắt một bảng để tránh gộp cược');return}
  this.busy=true;this.message='Đồng bộ: xóa cũ → thêm mới';this.onChange();
  let attemptRegistered=false;
  try{
   const anchor=this.lastSeen;const nativeRounds=this.batchSize(bets,cost);if(this.driver.nativeActive)await this.driver.stopNative();if(typeof this.driver.readBalance==='function'){const wallet=this.driver.readBalance();if(wallet===null)throw Error('Chọn phần tử số dư trên trang trước khi chạy Auto');if(cost>wallet+0.000000005)throw Error(`Tổng cược ${Number(cost.toFixed(8))} vượt số dư đọc trên trang ${wallet}`);}await this.driver.configure(bets,nativeRounds);if(!this.running)return;
   if(this.driver.countdown()<1.5){this.message='Chuẩn bị xong, chờ cửa sổ tiếp theo';return}
   this.lastSubmitted=anchor;this.pending={anchor,ids:new Set(plans.map(p=>p.id)),bets,time:Date.now(),receiptSeen:false};this.attempts++;attemptRegistered=true;this.batchRemaining=nativeRounds===0?-1:nativeRounds;
   await this.driver.submit(bets,anchor,nativeRounds);this.record('submitted',{nativeRounds});this.message=nativeRounds===0?'Stake Auto: Số Cược = 0, giữ chạy đến khi chiến thuật đổi hoặc có lệnh dừng':`Stake Auto chạy ${nativeRounds} vòng ở mức hiện tại; chờ kết quả`;
  }catch(e){if(e instanceof WindowClosed){this.pending=null;this.lastSubmitted='';if(attemptRegistered)this.attempts=Math.max(0,this.attempts-1);this.message='Stake đang khóa cửa sổ cược; giữ cấu hình và chờ cửa sổ tiếp theo';this.record('window-closed')}else await this.stop(`Dừng Auto: ${String(e)}`)}finally{this.busy=false;this.onChange()}
 }
}
