(() => {
 const date=time=>new Date(time+7*3600000).toISOString().slice(0,10);
 const fresh=day=>({date:day,currencies:{},tabs:{},issues:0,events:0,first:null,last:null});
 const round=n=>Number(n.toFixed(8));
 const valid=e=>e?.kind==='bet'&&typeof e.id==='string'&&/^[\w-]{6,150}$/.test(e.id)&&typeof e.currency==='string'&&/^[a-z0-9]{1,15}$/i.test(e.currency)&&Number.isFinite(e.amount)&&e.amount>0&&e.amount<=1e12&&Number.isFinite(e.payout)&&e.payout>=0&&e.payout<=1e12;
 function apply(row,e){
  row??=fresh(date(e.time));row.first=row.first===null?e.time:Math.min(row.first,e.time);row.last=row.last===null?e.time:Math.max(row.last,e.time);
  if(valid(e)){const currency=e.currency.toUpperCase(),profit=round(e.payout-e.amount);const add=totals=>{const t=totals[currency]??={volume:0,profit:0,bets:0};t.volume=round(t.volume+e.amount);t.profit=round(t.profit+profit);t.bets++;};add(row.currencies);const tab=row.tabs[e.tab]??={currencies:{}};row.tabs[e.tab]=tab;add(tab.currencies);}
  else {row.events++;if(e.issue)row.issues++;}
  return row;
 }
 globalThis.LimboDaily={date,fresh,valid,apply};
 function candle(row,s){const time=s.time,bucket=Math.floor(time/60000)*60000;row??={key:s.host+':'+s.currency+':'+bucket,date:date(time),host:s.host,currency:s.currency,time:bucket,open:s.amount,high:s.amount,low:s.amount,close:s.amount,first:time,last:time,samples:0};row.high=Math.max(row.high,s.amount);row.low=Math.min(row.low,s.amount);if(time<row.first){row.first=time;row.open=s.amount;}if(time>=row.last){row.last=time;row.close=s.amount;}row.samples++;return row;}
 globalThis.LimboDaily.candle=candle;
})();
