import {validate} from './model.ts';
import type {Config,Round,Target} from './model.ts';
const SCALE=100000000n;
const units=(v:number)=>BigInt(Math.round(v*1e8));
const value=(v:bigint)=>Number(v)/1e8;
export interface Trade {tableId:string;roundId:string;time:number;result:number;target:number;step:number;stepRound?:number;stepRounds?:number;amount:number;outcome:'WIN'|'LOSS'|'WAIT';profit:number}
export interface TargetStats {wins:number;losses:number;turnover:number;profit:number;lossStreak:number;maxLossStreak:number}
interface Position {step:number;used:number;active:boolean;stopped:boolean}
export function matches(history:Round[],t:Target){
 if(!t.entry.enabled)return true;
 const last=history.slice(-t.entry.count); if(last.length<t.entry.count)return false;
 return last.every(r=>t.entry.op==='<'?r.value<t.entry.value:t.entry.op==='>'?r.value>t.entry.value:t.entry.op==='<='?r.value<=t.entry.value:r.value>=t.entry.value);
}
export class Engine {
 config:Config; history:Round[]=[]; trades:Trade[]=[]; positions:Record<string,Position>={}; byTarget:Record<string,TargetStats>={};seen=new Set<string>();
 balanceUnits:bigint; peakUnits:bigint; drawdownUnits=0n; turnoverUnits=0n; count=0; wins=0; losses=0; halted='';
 constructor(c:Config,seed:Round[]=[]){validate(c);this.config=structuredClone(c);this.balanceUnits=units(c.bankroll);this.peakUnits=this.balanceUnits;for(const t of c.targets){this.positions[t.id]={step:0,used:0,active:false,stopped:false};this.byTarget[t.id]={wins:0,losses:0,turnover:0,profit:0,lossStreak:0,maxLossStreak:0}}for(const r of seed){if(!this.seen.has(r.id)){this.history.push(r);this.seen.add(r.id)}}this.history=this.history.slice(-1000)}
 get balance(){return value(this.balanceUnits)} get profit(){return value(this.balanceUnits-units(this.config.bankroll))} get drawdown(){return value(this.drawdownUnits)} get turnover(){return value(this.turnoverUnits)}
 updateConfig(c:Config){
  validate(c);if(c.bankroll!==this.config.bankroll)throw Error('Vốn khởi tạo chỉ đổi khi bắt đầu phiên mới');
  const next=structuredClone(c);
  for(const t of next.targets){
   const previous=this.config.targets.find(old=>old.id===t.id);let p=this.positions[t.id];
   if(!previous||!p){p={step:0,used:0,active:false,stopped:false};this.positions[t.id]=p;this.byTarget[t.id]??={wins:0,losses:0,turnover:0,profit:0,lossStreak:0,maxLossStreak:0}}
   else{
    if(p.step>=t.steps.length){p.step=t.steps.length-1;p.used=0}
    if((!previous.enabled&&t.enabled)||JSON.stringify(previous.entry)!==JSON.stringify(t.entry)){p.active=false}
    if(p.stopped&&JSON.stringify(previous.steps)!==JSON.stringify(t.steps)){p.stopped=false;p.used=0;p.active=false}
    if(p.used>=t.steps[p.step].rounds){p.used=0;if(p.step<t.steps.length-1)p.step++;else if(next.exhausted==='reset'){p.step=0;p.active=false}else if(next.exhausted==='stop')p.stopped=true}
   }
  }
  this.config=next;
  if(this.halted==='Đã hết bảng'&&next.targets.some(t=>t.enabled&&!this.positions[t.id].stopped))this.halted='';
  if(next.stopLoss>0&&this.profit<=-next.stopLoss)this.halted='Đạt stop loss';
  if(next.takeProfit>0&&this.profit>=next.takeProfit)this.halted='Đạt take profit';
 }
 next(){return this.config.targets.flatMap(t=>{const p=this.positions[t.id];if(!t.enabled||p.stopped||this.halted||(!p.active&&!matches(this.history,t)))return [];return [{id:t.id,target:t.steps[p.step].multiplier??t.target,step:p.step+1,...t.steps[p.step]}]})}
 consume(r:Round,executed?:Set<string>):Trade[]{
  if(this.seen.has(r.id)||this.halted)return [];
  if(!r.id||!Number.isFinite(r.value)||r.value<1)throw Error('Vòng không hợp lệ');
  this.seen.add(r.id);this.count++;
  const plans=this.config.targets.filter(t=>{const p=this.positions[t.id];return t.enabled&&!p.stopped&&(!executed||executed.has(t.id))&&(p.active||matches(this.history,t))});
  const required=plans.reduce((sum,t)=>sum+(t.steps[this.positions[t.id].step].action==='BET'?units(t.steps[this.positions[t.id].step].amount):0n),0n);
  if(required>this.balanceUnits){this.halted='Không đủ vốn mô phỏng';return []}
  const output:Trade[]=[];
  for(const t of plans){const p=this.positions[t.id];p.active=true;const s=t.steps[p.step];const actualTarget=s.multiplier??t.target;const win=r.value>=actualTarget;
   const profit=s.action==='WAIT'?0n:win?units(s.amount)*units(actualTarget)/SCALE-units(s.amount):-units(s.amount);
   this.balanceUnits+=profit;if(s.action==='BET'){this.turnoverUnits+=units(s.amount);if(win)this.wins++;else this.losses++}
   if(s.action==='BET'){const a=this.byTarget[t.id];a.profit=Number((a.profit+value(profit)).toFixed(8));a.turnover=Number((a.turnover+s.amount).toFixed(8));if(win){a.wins++;a.lossStreak=0}else{a.losses++;a.lossStreak++;a.maxLossStreak=Math.max(a.maxLossStreak,a.lossStreak)}}
   output.push({tableId:t.id,roundId:r.id,time:r.time,result:r.value,target:actualTarget,step:p.step+1,stepRound:p.used+1,stepRounds:s.rounds,amount:s.action==='BET'?s.amount:0,outcome:s.action==='WAIT'?'WAIT':win?'WIN':'LOSS',profit:value(profit)});
   if(s.action==='BET'&&win){p.step=0;p.used=0;p.active=false}else if(++p.used>=s.rounds){p.used=0;if(p.step<t.steps.length-1)p.step++;else if(this.config.exhausted==='reset'){p.step=0;p.active=false}else if(this.config.exhausted==='stop')p.stopped=true}
  }
  this.history.push(r);this.history=this.history.slice(-1000);this.trades.push(...output);this.trades=this.trades.slice(-10000);
  if(this.balanceUnits>this.peakUnits)this.peakUnits=this.balanceUnits;const dd=this.peakUnits-this.balanceUnits;if(dd>this.drawdownUnits)this.drawdownUnits=dd;
  if(this.config.stopLoss>0&&this.profit<=-this.config.stopLoss)this.halted='Đạt stop loss';
  if(this.config.takeProfit>0&&this.profit>=this.config.takeProfit)this.halted='Đạt take profit';
  if(this.config.targets.filter(t=>t.enabled).every(t=>this.positions[t.id].stopped))this.halted='Đã hết bảng';
  return output;
 }
}
