(() => {
 const fresh=()=>({version:1,active:{},sessions:[],closedTabs:{}});
 const round=n=>Number(n.toFixed(8));
 function apply(state,e){
  state=state?.version===1?state:fresh();state.closedTabs??={};const key=String(e.tab);
  if(e.kind==='open'){delete state.closedTabs[key];return state;}
  if(e.kind==='close'){const row=state.sessions.find(r=>r.id===state.active[key]);if(row){row.closed=e.time;row.status='closed';}delete state.active[key];state.closedTabs[key]=e.time;return state;}
  if(e.kind!=='snapshot'||!Number.isInteger(e.tab)||!Number.isFinite(e.time))return state;
  if(Object.hasOwn(state.closedTabs,key))return state;
  const s=e.stats,valid=s&&Number.isFinite(s.volume)&&s.volume>=0&&Number.isFinite(s.profit)&&typeof e.currency==='string'&&/^[a-z0-9]{1,15}$/i.test(e.currency);
  let row=state.sessions.find(r=>r.id===state.active[key]);
  if(row&&valid&&row.currency&&row.currency!==e.currency.toUpperCase()){apply(state,{kind:'close',tab:e.tab,time:e.time});delete state.closedTabs[key];row=null;}
  if(!row){row={id:e.tab+':'+e.time,tab:e.tab,started:e.time,status:'open',currency:valid?e.currency.toUpperCase():'',volume:0,profit:0,resets:0,missing:0,last:null};state.sessions.push(row);state.active[key]=row.id;}
  if(!valid){row.missing++;return state;}
  if(row.last&&e.time<row.last.time)return state;
  row.currency=e.currency.toUpperCase();
  if(row.last){const reset=s.volume<row.last.volume-1e-8;
   row.volume=round(row.volume+(reset?s.volume:s.volume-row.last.volume));
   row.profit=round(row.profit+(reset?s.profit:s.profit-row.last.profit));if(reset){row.resets++;row.missing++;}
   if(e.time-row.last.time>30000)row.missing++;
  }
  row.last={volume:s.volume,profit:s.profit,time:e.time};return state;
 }
 globalThis.LimboHistory={fresh,apply};
})();
