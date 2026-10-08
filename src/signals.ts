import type {Round} from './model.ts';
export type SignalKind='hit'|'entry'|'win'|'loss'|'step'|'error'|'startStop'|'round'|'test';
export interface Signal {id:string;time:number;kind:SignalKind;text:string;status?:string}
export interface SignalRules {targets:number[];entry:{enabled:boolean;count:number;op:'<'|'>'|'<='|'>=';value:number}}
export interface TelegramConfig {enabled:boolean;token:string;chatId:string;notify:Record<Exclude<SignalKind,'test'>,boolean>;rules:SignalRules}
export const telegramDefaults=():TelegramConfig=>({enabled:false,token:'',chatId:'',notify:{hit:true,entry:true,win:true,loss:false,step:true,error:true,startStop:true,round:true},rules:{targets:[90,250,450],entry:{enabled:false,count:5,op:'<',value:2}}});
export function validateTelegram(c:TelegramConfig){
 if(!c||typeof c.enabled!=='boolean'||typeof c.token!=='string'||typeof c.chatId!=='string')throw Error('Cấu hình Telegram không hợp lệ');
 if(c.enabled&&(!/^\d{5,}:[A-Za-z0-9_-]{20,}$/.test(c.token)||!/^(-?\d+|@[A-Za-z0-9_]{5,})$/.test(c.chatId)))throw Error('Bot Token hoặc Chat ID chưa đúng định dạng');
 if(!c.notify||Object.keys(telegramDefaults().notify).some(k=>typeof c.notify[k as keyof typeof c.notify]!=='boolean'))throw Error('Loại thông báo không hợp lệ');
 if(!c.rules||!Array.isArray(c.rules.targets)||c.rules.targets.length>20||c.rules.targets.some(v=>!Number.isFinite(v)||v<1.01||v>4294967000))throw Error('Danh sách target tín hiệu không hợp lệ');
 const e=c.rules.entry;if(!e||!Number.isInteger(e.count)||e.count<1||e.count>1000||!['<','>','<=','>='].includes(e.op)||!Number.isFinite(e.value)||e.value<1)throw Error('Điều kiện tín hiệu không hợp lệ');
}
export function entryMet(history:Round[],rules:SignalRules){const e=rules.entry;if(!e.enabled||history.length<e.count)return false;return history.slice(-e.count).every(r=>e.op==='<'?r.value<e.value:e.op==='>'?r.value>e.value:e.op==='<='?r.value<=e.value:r.value>=e.value)}
export function roundSignals(round:Round,history:Round[],rules:SignalRules):Signal[]{
 const out:Signal[]=[];const targets=rules.targets.filter(t=>round.value>=t);
 if(targets.length){const threshold=Math.min(...targets);const last=history.findLastIndex(r=>r.value>=threshold);const gap=last<0?`≥${history.length+1}`:String(history.length-last);out.push({id:`hit:${round.id}`,time:round.time,kind:'hit',text:`🔔 [STAKE] BIG HIT\nx${round.value} · sau ${gap} vòng · ngưỡng ≥x${threshold}`})}
 const before=entryMet(history,rules);const after=entryMet([...history,round],rules);
 if(after&&!before)out.push({id:`entry:${round.id}`,time:round.time,kind:'entry',text:`🔔 [STAKE] ĐỦ CHUỖI\n${rules.entry.count} vòng ${rules.entry.op} x${rules.entry.value} · mới nhất x${round.value}`});
 out.push({id:`round:${round.id}`,time:round.time,kind:'round',text:`[STAKE] x${round.value} · vòng ${round.id.slice(0,8)}`});return out;
}
