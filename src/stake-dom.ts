// DOM driver. No direct API, token reading, WS interception, or retry of wagers.
import {multiplier,readRounds} from './adapter.ts';
export class WindowClosed extends Error {}
export interface Bet {id:string;target:number;amount:number;action:'BET'|'WAIT';step:number;rounds:number}
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export const near=(a:number,b:number)=>Math.abs(a-b)<0.000000005;
export function numeric(raw:string){
 let s=raw.replace(/\s/g,'').replace(/[^\d.,-]/g,'');
 if(s.includes('.')&&s.includes(',')){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'')}
 else s=s.replace(',','.');return /^-?\d+(?:\.\d+)?$/.test(s)?Number(s):NaN;
}
const visible=(e:Element)=>e.getClientRects().length>0;
export class StakeDOM {
 root:Document; alive:()=>boolean; currency:string;lastSignature='';balanceSelector='';nativeActive=false;private stopPromise:Promise<void>|null=null;
 constructor(root:Document,alive:()=>boolean,currency:string,balanceSelector=''){this.root=root;this.alive=alive;this.currency=currency.toLowerCase();this.balanceSelector=balanceSelector}
 one<T extends Element>(selector:string):T {const found=Array.from(this.root.querySelectorAll<T>(selector)).filter(visible);if(found.length!==1)throw Error(`Cần đúng 1 phần tử: ${selector} (thấy ${found.length})`);return found[0]}
 sidebar(){return this.one<HTMLElement>('.game-sidebar')}
 button(rx:RegExp){const list=Array.from(this.sidebar().querySelectorAll<HTMLButtonElement>('button')).filter(b=>visible(b)&&rx.test((b.textContent||'').trim()));if(list.length>1)throw Error('Nút điều khiển không duy nhất');return list[0]}
 startButton(){return this.button(/^(Bắt Đầu Cược Tự Động|Start Auto(?:bet| Bet))$/i)}
 stopButton(){return this.button(/^(Dừng Cược Tự Động|Stop Auto(?:bet| Bet))/i)}
 cancelButton(){return this.button(/^(Hủy|Huy|Cancel)$/i)}
 activeButton(){return this.stopButton()||this.cancelButton()}
 countdown(){
  // Signed-in layouts can put the countdown in a different wrap or nested span.
  const blocks=Array.from(this.root.querySelectorAll('.bottom-bar')).filter(visible);
  const texts=blocks.map(e=>e.textContent||'');texts.push(this.root.body?.textContent||'');
  const rx=/(?:Vòng tiếp theo trong:?|Next round in:?|Next game in:?)\s*([\d.,]+)\s*s/i;
  for(const text of texts){const m=text.match(rx);if(m){const value=numeric(m[1]);if(Number.isFinite(value)&&value>=0)return value}}
  return 0;
 }
 assertAlive(){if(!this.alive())throw Error('Đã dừng');if(!navigator.onLine)throw Error('Offline');if(this.root.querySelector('.network-dot:not(.healthy)'))throw Error('Kết nối game không ổn định')}
 currencyCheck(){const el=this.one<HTMLInputElement>('input[data-testid="input-game-amount"]');if(el.getAttribute('data-bet-amount-active-currency')!==this.currency)throw Error(`Chọn đúng đồng ${this.currency.toUpperCase()} trước khi chạy`);const before=el.parentElement?.querySelector('.before-icon')?.textContent?.trim();if(before)throw Error('Đang bật nhập theo tiền pháp định. Chuyển hiển thị sang đơn vị crypto trước khi Auto');return el}
 async wait<T>(fn:()=>T|undefined|false,timeout=2000):Promise<T>{const end=Date.now()+timeout;do{this.assertAlive();const result=fn();if(result)return result;await sleep(40)}while(Date.now()<end);throw Error('Hết thời gian chờ DOM xác nhận')}
 set(input:HTMLInputElement,v:number){this.assertAlive();if(input.disabled)throw new WindowClosed('Ô nhập đang khóa trong chuyển pha');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,String(v));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.blur()}
 click(b:HTMLButtonElement){this.assertAlive();if(b.disabled)throw Error('Nút đang khóa');b.click()}
 list(){return this.one<HTMLUListElement>('.game-sidebar .my-bets ul.rows')}
 async ensureBetList(){
 const panel=this.one('.game-sidebar .my-bets');
 const ready=()=>{const lists=Array.from(panel.querySelectorAll('ul.rows')).filter(e=>e.getClientRects().length>0);if(lists.length>1)throw Error('Danh sách cược không duy nhất');return lists[0]};
 if(ready())return;
 const headers=Array.from(panel.querySelectorAll('button.header')).filter(e=>e.getClientRects().length>0);
 if(headers.length!==1)throw Error('Không xác định được nút mở Cược Của Tôi');
 const header=headers[0] as HTMLButtonElement;
 if(!header.classList.contains('expanded')&&header.getAttribute('aria-expanded')!=='true')this.click(header);
 await this.wait(ready);
}
 rows(){return Array.from(this.list().children) as HTMLElement[]}
 readRow(el:HTMLElement){const text=el.textContent||'';const m=text.match(/(\d[\d.,\s]*?)\s*[×x]/i);if(!m)throw Error('Không đọc được target trong Cược Của Tôi');const target=multiplier(m[1]);if(!Number.isFinite(target)||target<1.01)throw Error(`Không đọc được target trong dòng: ${text.slice(0,160)}`);const remainder=text.slice((m.index||0)+m[0].length);const amount=numeric(remainder);if(!Number.isFinite(amount)||amount<=0)throw Error('Không đọc được số tiền trong dòng cược');return {target,amount}}
 verify(wanted:Bet[]){const rows=this.rows().map(e=>this.readRow(e));const used=new Set<number>();if(rows.length!==wanted.length)return false;return wanted.every(w=>{const index=rows.findIndex((r,i)=>!used.has(i)&&near(r.target,w.target)&&near(r.amount,w.amount));if(index<0)return false;used.add(index);return true})}
 async clear(){await this.ensureBetList();while(this.rows().length){this.assertAlive();const row=this.rows()[0];const buttons=Array.from(row.querySelectorAll<HTMLButtonElement>('button'));const candidates=buttons.filter(b=>b.querySelector('svg[data-ds-icon="Trash"],svg[data-ds-icon="TrashCan"],svg[data-ds-icon="Delete"],svg[data-ds-icon="Bin"]')||/xóa|delete|remove/i.test(b.getAttribute('aria-label')||''));if(candidates.length!==1){if(buttons.length!==1||!buttons[0].querySelector('svg'))throw Error('Không xác định duy nhất nút xóa dòng cược');candidates.push(buttons[0])}const before=this.rows().length;this.click(candidates[0]);await this.wait(()=>this.rows().length===before-1)}}
 readBalance(){if(!this.balanceSelector)return null;try{const els=Array.from(this.root.querySelectorAll(this.balanceSelector)).filter(visible);if(els.length!==1)return null;const text=els[0].textContent?.trim()||'';if(!/^\s*[$€₫]?\s*\d[\d.,\s]*\s*(?:USDT|BTC|ETH|BNB|LTC|SOL)?\s*$/i.test(text))return null;const v=numeric(text);return Number.isFinite(v)&&v>=0?v:null}catch{return null}}
 health(wanted:Bet[]){const checks:string[]=[];checks.push(navigator.onLine?'mạng trình duyệt OK':'trình duyệt offline');checks.push(this.root.querySelector('.network-dot.healthy')?'kết nối game OK':'chưa xác nhận mạng game');checks.push(this.readBalance()!==null?'đọc số dư OK':'không đọc được số dư');try{checks.push(this.verify(wanted)?'danh sách cược khớp':'danh sách cược khác cấu hình')}catch{checks.push('không đọc được danh sách cược')}return checks.join(' · ')}
 async configure(wanted:Bet[],nativeRounds=1){
  this.assertAlive();if(this.activeButton())throw Error('Stake Auto đang chạy. Dừng trên trang trước khi bắt đầu phiên mới');
  const auto=this.one<HTMLButtonElement>('button[data-testid="auto-tab"]');
  if(!this.root.querySelector('input[data-testid="limit-input"]')){this.click(auto);await this.wait(()=>this.root.querySelector('input[data-testid="limit-input"]')||false)}
  if(this.currencyCheck().disabled)throw new WindowClosed('Game đang chuyển pha; chưa sửa danh sách cược');const advanced=this.root.querySelector<HTMLInputElement>('[data-testid="advanced-toggle"] input[type="checkbox"]');if(advanced?.checked){advanced.click();await this.wait(()=>!advanced.checked)}
  const limit=this.one<HTMLInputElement>('input[data-testid="limit-input"]');this.set(limit,nativeRounds);await this.wait(()=>Number(limit.value)===nativeRounds);
  await this.ensureBetList();
  const signature=JSON.stringify(wanted.map(b=>[b.id,b.target,b.amount]));
  if(!this.verify(wanted)||(this.lastSignature&&this.lastSignature!==signature)){
   await this.clear();
   const prepared:Bet[]=[];
   for(const bet of wanted){this.currencyCheck();const amount=this.one<HTMLInputElement>('input[data-testid="input-game-amount"]');const target=this.one<HTMLInputElement>('input[data-testid^="target-multiplier-"]');this.set(amount,bet.amount);this.set(target,bet.target);await this.wait(()=>near(numeric(amount.value),bet.amount)&&near(numeric(target.value),bet.target));const add=this.one<HTMLButtonElement>('button[data-testid="autobet-add-bet"]');await this.wait(()=>!add.disabled);const before=this.rows().length;this.click(add);await this.wait(()=>this.rows().length===before+1);prepared.push(bet);if(!this.verify(prepared))throw Error(`Stake thêm mức/target khác cấu hình: cần x${bet.target} · ${bet.amount}; đọc ${this.rows().map(row=>row.textContent?.trim()).join(' | ').slice(0,600)}`)}
  }
  if(!this.verify(wanted))throw Error('Danh sách cược không khớp');this.lastSignature=signature;
 }
 async submit(wanted:Bet[],anchor:string,nativeRounds=1){
  this.assertAlive();if(this.activeButton()||this.nativeActive)throw Error('Auto đã bật; giữ nguyên, không bấm lại');await this.ensureBetList();const amount=this.currencyCheck();if(this.countdown()<2.5||amount.disabled)throw new WindowClosed('Cửa sổ cược đang khóa hoặc sắp kết thúc');if(readRounds(this.root).at(-1)?.id!==anchor)throw Error('Vòng đã đổi trong lúc chuẩn bị');if(!this.verify(wanted))throw Error('Danh sách cược bị thay đổi');if(Number(this.one<HTMLInputElement>('input[data-testid="limit-input"]').value)!==nativeRounds)throw Error('Số lượt Stake không khớp batch đã chuẩn bị');const b=this.startButton();if(!b||b.disabled)throw new WindowClosed('Stake chưa sẵn sàng nhận cược');await sleep(60);if(this.activeButton()||this.startButton()!==b)throw Error('Trạng thái Auto đã đổi; không bấm lại');if(this.countdown()<2.5||amount.disabled||b.disabled)throw new WindowClosed('Game bắt đầu trong lúc chuẩn bị');this.click(b);
  // A click is never blindly retried. Ambiguous acknowledgement halts the session.
  await this.wait(()=>this.activeButton(),2000);this.nativeActive=true;
 }
 statusAmounts(){
  const parse=(el:Element)=>{const text=(el.textContent||'').trim();const m=text.match(/^(?:Cược Của Tôi|My Bets?)\s*(?:USDT)?\s*(\d[\d.,]*)\s*(?:USDT)?$/i);return m?numeric(m[1]):NaN};
  const tagged=Array.from(this.root.querySelectorAll('[data-testid="slide-status-box"]')).filter(visible);
  // Read the full status text. The first data-ds-text child can be its LABEL.
  // If the status switches to winners, never fall back to sidebar bet COUNT.
  if(tagged.length)return [...new Set(tagged.map(parse).filter(v=>Number.isFinite(v)&&v>=0))];
  const found=Array.from(this.root.querySelectorAll('div,span')).filter(el=>visible(el)&&!el.closest('.game-sidebar,.my-bets,header,[role="banner"]')&&(el.textContent||'').length<100).map(parse);
  return [...new Set(found.filter(v=>Number.isFinite(v)&&v>=0))];
 }
 currentStake(){if(!this.activeButton())return null;const amounts=this.statusAmounts();return amounts.length===1?amounts[0]:null}

 diagnostics(){
  const texts=(selector:string)=>Array.from(this.root.querySelectorAll(selector)).filter(visible).map(e=>({testId:e.getAttribute('data-testid'),text:(e.textContent||'').trim().slice(0,200)}));
  return {time:Date.now(),online:navigator.onLine,countdown:this.countdown(),statusAmounts:this.statusAmounts(),taggedStatus:texts('[data-testid="slide-status-box"]'),bottomBar:texts('.bottom-bar'),start:!!this.startButton(),stop:!!this.stopButton(),cancel:!!this.cancelButton(),nativeActive:this.nativeActive,wallet:this.readBalance(),limit:this.root.querySelector<HTMLInputElement>('input[data-testid="limit-input"]')?.value,amountDisabled:this.root.querySelector<HTMLInputElement>('input[data-testid="input-game-amount"]')?.disabled,history:Array.from(this.root.querySelectorAll('button[data-past-game-id]')).filter(visible).map(e=>({id:e.getAttribute('data-past-game-id'),index:e.getAttribute('data-last-game-index'),text:e.textContent})),rows:this.rows().map(e=>(e.textContent||'').slice(0,150))};
 }
 async stopNative(){
  if(this.stopPromise)return this.stopPromise;
  this.stopPromise=this.stopOnce();
  try{await this.stopPromise}finally{this.stopPromise=null}
 }
 private async stopOnce(){
  const end=Date.now()+15000;let clicked=false;
  do{
   const active=this.activeButton();
   if(!active&&this.startButton()){this.nativeActive=false;return}
   // Hủy and Dừng are two phases of the same native toggle. Click at most once,
   // then wait for Start; repeating during delayed acknowledgement can re-arm it.
   if(active&&!active.disabled&&!clicked){clicked=true;active.click()}
   if(!this.nativeActive&&!active&&!clicked)return;
   await sleep(100);
  }while(Date.now()<end);
  throw Error('Stake chưa xác nhận dừng. Kiểm tra nút trên trang');
 }
}
