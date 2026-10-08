export interface Round { id:string; value:number; time:number }
export interface Step { amount:number; multiplier?:number; rounds:number; action:'BET'|'WAIT' }
export interface Target { id:string; target:number; enabled:boolean; entry:{enabled:boolean; count:number; op:'<'|'>'|'<='|'>='; value:number}; steps:Step[] }
export interface Config { bankroll:number; stopLoss:number; takeProfit:number; exhausted:'hold'|'reset'|'stop'; targets:Target[] }
export const defaults=():Config=>({bankroll:100,stopLoss:20,takeProfit:20,exhausted:'stop',targets:[90,450,410,370,250].map(target=>({id:String(target),target,enabled:target===450,entry:{enabled:false,count:5,op:'<',value:2},steps:[0.01,0.03,0.09,0.25,0.6,1.5].map(amount=>({amount,rounds:100,action:'BET'}))}))});
export function validate(c:Config) {
 if(!c||!Array.isArray(c.targets)||!c.targets.length||c.targets.length>20)throw Error('Cần 1–20 target');
 if(!['hold','reset','stop'].includes(c.exhausted))throw Error('Quy tắc hết bảng không hợp lệ');
 for(const [k,v] of Object.entries({bankroll:c.bankroll,stopLoss:c.stopLoss,takeProfit:c.takeProfit}))if(!Number.isFinite(v)||v<0||v>1e7|| (k==='bankroll'&&v===0))throw Error('Vốn/giới hạn phải là số hợp lệ, tối đa 10 triệu');
 if(new Set(c.targets.map(t=>t.id)).size!==c.targets.length)throw Error('ID target bị trùng');
 for(const t of c.targets){
  if(typeof t.id!=='string'||typeof t.enabled!=='boolean'||!Number.isFinite(t.target)||t.target<1.01||t.target>4294967000)throw Error('Target phải từ 1.01 đến 4,294,967,000');
  if(!t.entry||typeof t.entry.enabled!=='boolean'||!['<','>','<=','>='].includes(t.entry.op)||!Number.isInteger(t.entry.count)||t.entry.count<1||t.entry.count>1000||!Number.isFinite(t.entry.value)||t.entry.value<1)throw Error('Điều kiện vào chuỗi không hợp lệ');
  if(!Array.isArray(t.steps)||!t.steps.length||t.steps.length>100)throw Error('Mỗi target cần 1–100 bậc');
  for(const s of t.steps)if((s.multiplier!==undefined&&(!Number.isFinite(s.multiplier)||s.multiplier<1.01||s.multiplier>4294967000))||!Number.isFinite(s.amount)||s.amount<=0||s.amount>1e7||Math.abs(s.amount*1e8-Math.round(s.amount*1e8))>0.0001||!Number.isInteger(s.rounds)||s.rounds<1||s.rounds>100000||!['BET','WAIT'].includes(s.action))throw Error('Bậc cược: mức > 0 (tối đa 8 số thập phân), số vòng nguyên ≥ 1');
 }
}

export function duplicateTarget(source:Target,id:string):Target {
 return {...source,id,enabled:false,entry:{...source.entry},steps:source.steps.map(step=>({...step}))};
}
