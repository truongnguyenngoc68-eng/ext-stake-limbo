(() => {
 'use strict';
 const fresh=()=>({version:1,since:Date.now(),currencies:{},cycles:{},seen:{},issues:0});
 const currency=s=>typeof s==='string'&&/^[a-z0-9]{1,15}$/i.test(s);
 const money=n=>Number.isFinite(n)&&Math.abs(n)<=1e12;
 const round=n=>Number(n.toFixed(8));
 function apply(state,event){
  if(!state||state.version!==1)state=fresh();
  if(event.kind==='start'&&typeof event.id==='string'&&event.id.length<150&&currency(event.currency)&&money(event.tp)&&event.tp>0&&money(event.sl)&&event.sl>0){
   state.cycles[event.id]??={id:event.id,currency:event.currency.toLowerCase(),tp:event.tp,sl:event.sl,volume:0,profit:0,bets:0,requests:0,complete:false,partial:false,time:Date.now()};
  }else if(event.kind==='end'&&state.cycles[event.id]){const c=state.cycles[event.id];c.complete=true;c.reason=event.reason;c.ended=Date.now();}
  else if(event.kind==='request'){if(state.cycles[event.cycle])state.cycles[event.cycle].requests++;}
  else if(event.kind==='issue'){state.issues++;if(state.cycles[event.cycle])state.cycles[event.cycle].partial=true;}
  else if(event.kind==='bet'&&typeof event.id==='string'&&/^[\w-]{6,150}$/.test(event.id)&&currency(event.currency)&&money(event.amount)&&event.amount>0&&money(event.payout)&&event.payout>=0){
   if(Object.hasOwn(state.seen,event.id))return state;
   state.seen[event.id]=1;
   const key=event.currency.toLowerCase(),profit=round(event.payout-event.amount);
   const total=state.currencies[key]??={volume:0,profit:0,bets:0};
   total.volume=round(total.volume+event.amount);total.profit=round(total.profit+profit);total.bets++;
   const c=state.cycles[event.cycle];
   if(c&&c.currency===key){c.volume=round(c.volume+event.amount);c.profit=round(c.profit+profit);c.bets++;}
   else if(event.cycle)state.issues++;
  }
  return state;
 }
 function summary(state){
  state=state?.version===1?state:fresh();const totals=structuredClone(state.currencies);
  for(const [key,t]of Object.entries(totals)){t.tp=0;t.sl=0;t.tpVolume=0;t.slVolume=0;t.other=0;t.active=0;t.last=null;}
  for(const c of Object.values(state.cycles)){
   const t=totals[c.currency]??={volume:0,profit:0,bets:0,tp:0,sl:0,tpVolume:0,slVolume:0,other:0,active:0,last:null};
   if(!c.complete){t.active++;continue;}
   const partial=c.partial||c.requests!==c.bets;
   const outcome=c.reason!=='complete'||partial||!c.bets?'other':c.profit>=c.tp-1e-8?'tp':c.profit<=-c.sl+1e-8?'sl':'other';t[outcome]++;
   if(outcome==='tp')t.tpVolume=round(t.tpVolume+c.volume);if(outcome==='sl')t.slVolume=round(t.slVolume+c.volume);
   if(!t.last||(c.ended||0)>=(t.last.time||0))t.last={volume:c.volume,profit:c.profit,outcome,partial,time:c.ended};
  }
  return {since:state.since,issues:state.issues,totals};
 }
 globalThis.LimboStats={fresh,apply,summary};
})();
