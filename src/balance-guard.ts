export class BalanceGuard {
 last:number|null;unchanged=0;
 constructor(initial:number|null){this.last=initial}
 sample(balance:number|null,hadBet:boolean){
  if(balance===null||!Number.isFinite(balance)||balance<0)return {check:true,reason:'Không đọc được số dư trên trang'};
  if(hadBet&&this.last!==null&&Math.round(balance*1e8)===Math.round(this.last*1e8))this.unchanged++;else this.unchanged=0;
  this.last=balance;
  return {check:this.unchanged>=3,reason:this.unchanged>=3?'Số dư không đổi qua 3 vòng có cược — cần kiểm tra lại':''};
 }
}
