// Research only. Never imports the live driver or sends betting commands.
export const clone = value => structuredClone(value);
const finite = (n, lo, hi) => Number.isFinite(n) && n >= lo && n <= hi;
export function defaults() {
  return {id:crypto.randomUUID(),name:'Chờ GAP · thử nghiệm',bankroll:100,exhausted:'hold',condition:'gap',gap:180,lowCount:5,lowValue:2,horizon:50,train:60,validation:20,
    targets:[{id:crypto.randomUUID(),enabled:true,target:90,steps:[{amount:.002,rounds:100,action:'BET'}]}]};
}
export function validate(c) {
  if(!c||typeof c.id!=='string'||!c.id||typeof c.name!=='string'||!c.name.trim()||c.name.length>100)throw Error('Tên chiến thuật cần 1–100 ký tự.');
  if(!finite(c.bankroll,.00000001,1e7)||!['hold','reset','stop'].includes(c.exhausted)||!['gap','low','always'].includes(c.condition))throw Error('Vốn hoặc chế độ chưa hợp lệ.');
  for(const [n,max] of [[c.gap,100000],[c.lowCount,1000],[c.horizon,10000]])if(!Number.isInteger(n)||n<1||n>max)throw Error('GAP, độ dài chuỗi và cửa sổ phải là số nguyên dương.');
  if(!finite(c.lowValue,1,4294967000)||!Number.isInteger(c.train)||!Number.isInteger(c.validation)||c.train<10||c.validation<10||c.train+c.validation>90)throw Error('Tỷ lệ chia cần ít nhất 10% cho mỗi phần.');
  if(!Array.isArray(c.targets)||!c.targets.length||c.targets.length>20)throw Error('Cần 1–20 bảng target.');
  if(new Set(c.targets.map(t=>t.id)).size!==c.targets.length)throw Error('ID bảng bị trùng.');
  for(const t of c.targets){
    if(typeof t.id!=='string'||typeof t.enabled!=='boolean'||!finite(t.target,1.01,4294967000)||!Array.isArray(t.steps)||!t.steps.length||t.steps.length>100)throw Error('Target hoặc danh sách bậc không hợp lệ.');
    for(const s of t.steps)if(!finite(s.amount,.00000001,1e7)||Math.abs(s.amount*1e8-Math.round(s.amount*1e8))>.0001||!Number.isInteger(s.rounds)||s.rounds<1||s.rounds>100000||!['BET','WAIT'].includes(s.action)||(s.multiplier!==undefined&&!finite(s.multiplier,1.01,4294967000)))throw Error('Bậc: mức cược >0, tối đa 8 số lẻ; số vòng nguyên dương.');
  }
  return c;
}
export function parseHistory(input) {
  const source=input?.rounds||input?.rows||input;
  if(!Array.isArray(source)||!source.length||source.length>1000000)throw Error('Lịch sử cần 1–1.000.000 vòng.');
  const seen=new Set(),rows=[];
  for(const r of source){
    const v=Array.isArray(r)?{id:r[0],value:r[1],time:r[2],gapBefore:!!r[3]}:r;
    if(!v||typeof v.id!=='string'||!v.id||v.id.length>200||!finite(v.value,1,4294967000)||!finite(v.time,0,8640000000000000))throw Error('Có vòng sai ID, hệ số hoặc thời gian.');
    if(seen.has(v.id))throw Error('Lịch sử trùng ID; cần làm sạch nguồn trước khi thử.');
    seen.add(v.id);rows.push({id:v.id,value:v.value,time:v.time,gapBefore:v.gapBefore===true});
  }
  // Observation timestamps may be equal for batches. They must not run backwards.
  if(rows.some((r,i)=>i&&r.time<rows[i-1].time))throw Error('Lịch sử phải theo thứ tự cũ → mới.');
  return rows;
}
export function demo(n=50000) {
  let state=26111009;return Array.from({length:n},(_,i)=>{state^=state<<13;state^=state>>>17;state^=state<<5;const u=((state>>>0)+1)/4294967296;
    return {id:'sample-'+i,value:Math.max(1,Math.floor(.98/u*100)/100),time:1791475200000+i*12000,gapBefore:i===17000||i===35000};});
}
export const modelProbability=t=>.98/t;
export function wilson(k,n) {
  if(!n)return null;const z=1.959963984540054,p=k/n,d=1+z*z/n,c=(p+z*z/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/d;return [Math.max(0,c-h),Math.min(1,c+h)];
}
export function split(rows,c){const a=Math.floor(rows.length*c.train/100),b=a+Math.floor(rows.length*c.validation/100);return [rows.slice(0,a),rows.slice(a,b),rows.slice(b)];}
export function gaps(rows,t) {
  let current=0,known=false;const completed=[];
  for(const r of rows){if(r.gapBefore){current=0;known=false;}if(r.value>=t){if(known)completed.push(current);current=0;known=true;}else current++;}
  const sorted=[...completed].sort((a,b)=>a-b),q=p=>sorted.length?sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)]:null;
  return {current,known,completed,p50:q(.5),p90:q(.9),max:sorted.at(-1)??null};
}
// One signal per target drought / low-run crossing. Full H-round outcome windows
// must not overlap or cross an observed discontinuity. No look-ahead in entry.
export function episodes(rows,c,target) {
  const out=[];let gap=0,known=false,low=0,next=0,armed=true;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];if(r.gapBefore){gap=0;known=false;low=0;armed=true;}
    if(r.value>=target){gap=0;known=true;if(c.condition==='gap')armed=true;}else gap++;
    if(r.value<c.lowValue)low++;else {low=0;if(c.condition==='low')armed=true;}
    const eligible=c.condition==='always'||armed&&(c.condition==='gap'?known&&gap>=c.gap:low>=c.lowCount);
    if(!eligible||i<next)continue;
    if(c.condition!=='always')armed=false;
    if(i+c.horizon>=rows.length)continue;
    const future=rows.slice(i+1,i+1+c.horizon);
    if(future.some(v=>v.gapBefore))continue;
    out.push({anchor:r.id,from:i+1,to:i+c.horizon,hit:future.some(v=>v.value>=target)});next=i+c.horizon;
  }
  return out;
}
const units=n=>BigInt(Math.round(n*1e8)),number=n=>Number(n)/1e8;
export function simulate(rows,c,kind='configured') {
  validate(c);let balance=units(c.bankroll),peak=balance,dd=0n,turnover=0n,bets=0,wins=0,halt='',gap=0,low=0;const path=[],positions=new Map();
  const targets=c.targets.filter(t=>t.enabled).sort((a,b)=>a.target-b.target);
  for(const t of targets)positions.set(t.id,{step:0,used:0,active:false,stopped:false,gap:0,known:false});
  let warm=false;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(r.gapBefore||i===0){low=0;warm=false;for(const p of positions.values()){p.gap=0;p.known=false;p.active=false;} }
    const plans=[];
    for(const t of targets){const p=positions.get(t.id);const eligible=kind==='flat'||p.active||c.condition==='always'||(c.condition==='gap'?p.known&&p.gap>=c.gap:warm&&low>=c.lowCount);
      if(p.stopped||!eligible)continue;
      const s=kind==='configured'?t.steps[p.step]:{...t.steps[0],action:'BET'};plans.push({t,p,s,target:s.multiplier??t.target});}
    const required=plans.reduce((a,p)=>a+(p.s.action==='BET'?units(p.s.amount):0n),0n);
    if(required>balance){halt='Không đủ vốn cho lượt kế tiếp';break;}
    for(const {t,p,s,target} of plans){p.active=true;const hit=r.value>=target;
      if(s.action==='BET'){const a=units(s.amount);turnover+=a;bets++;if(hit){wins++;balance+=a*units(target)/100000000n-a;}else balance-=a;}
      if(kind==='configured'){
        if(s.action==='BET'&&hit){p.step=0;p.used=0;p.active=false;}
        else if(++p.used>=s.rounds){p.used=0;if(p.step<t.steps.length-1)p.step++;else if(c.exhausted==='reset'){p.step=0;p.active=false;}else if(c.exhausted==='stop')p.stopped=true;}
      }else if(hit)p.active=false;
    }
    for(const t of targets){const p=positions.get(t.id);if(r.value>=t.target){p.gap=0;p.known=true;}else p.gap++;}
    low=r.value<c.lowValue?low+1:0;warm=true;
    if(balance>peak)peak=balance;if(peak-balance>dd)dd=peak-balance;
    if(i%Math.max(1,Math.floor(rows.length/100))===0)path.push(number(balance)-c.bankroll);
  }
  path.push(number(balance)-c.bankroll);
  return {profit:number(balance)-c.bankroll,balance:number(balance),turnover:number(turnover),bets,wins,losses:bets-wins,drawdown:number(dd),roi:turnover?number(balance-units(c.bankroll))/number(turnover):null,halt,path};
}
export function analyze(rows,c,target) {
  validate(c);const parts=split(rows,c),test=parts[2],e=episodes(test,c,target),hits=e.filter(v=>v.hit).length;
  return {parts:parts.map(p=>p.length),n:e.length,hits,rate:e.length?hits/e.length:null,ci:wilson(hits,e.length),baseline:1-(1-modelProbability(target))**c.horizon,gap:gaps(rows,target),
    comparisons:['flat','condition','configured'].map(kind=>({kind,...simulate(test,c,kind)}))};
}
