(()=>{'use strict';
const key='slide-lab-live-progress-checkpoint-v1';
let latest=null, saved=null, feed=null;
const format=x=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('vi-VN',{minimumFractionDigits:8,maximumFractionDigits:8}):'Chưa xác minh';
const safeTime=x=>x?new Date(x).toLocaleString('vi-VN'):'—';
function attach(){
 const root=document.getElementById('app');if(!root)return;
 let el=document.getElementById('slide-wallet-details');
 if(!el){el=document.createElement('section');el.id='slide-wallet-details';el.style.cssText='margin:10px;padding:10px;border:1px solid #52768a;border-radius:8px;background:#142c3e;color:#eaf7ff;font:12px/1.5 system-ui;white-space:pre-wrap';
 const heading=[...root.querySelectorAll('h2,h3')].find(x=>(x.textContent||'').includes('CẤU HÌNH CHIẾN THUẬT'));
 // Place near top of the app, with minimal interference with Vue.
 window.SlideTools.add(el);
 }
 const s=saved?.session||{};
 const observed=latest?.verified&&Number.isFinite(latest.balance)?latest.balance:null;
 el.textContent='SỐ DƯ & PHIÊN (QUAN SÁT)\n'+
 'Số dư từ trang: '+format(observed)+' USDT'+(latest?.verified?' · đã đọc':' · checkpoint/chưa xác minh')+'\n'+
 'Nguồn vòng: '+(feed?.ok?'đang cập nhật':'chưa sẵn sàng')+' · Lịch sử: '+(feed?.count??0)+' vòng\n'+
 'Vốn mô phỏng ban đầu: '+format(s.bankroll)+'\n'+
 'P/L đã ghi nhận: '+(Number.isFinite(s.profit)?s.profit.toFixed(8):'—')+'\n'+
 'Tổng cược đã ghi nhận: '+(Number.isFinite(s.turnover)?s.turnover.toFixed(8):'—')+'\n'+
 'Vòng đã ghi nhận: '+(s.betRounds??'—')+' · Bảng: '+(Array.isArray(s.progress)?s.progress.length:'—')+'\n'+
 'Checkpoint: '+safeTime(saved?.savedAt)+'\n'+
 'Sau F5: tự tiếp tục nếu đã bật và cược trước đó đã được xác nhận.';
}
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin||e.data?.channel!=='slide-lab')return;if(e.data.type==='auto-wallet')latest=e.data.data;else if(e.data.type==='status'){feed=e.data.data;if(!feed?.ok)latest=null}else return;attach()});
async function load(){try{const r=await chrome.storage.local.get(key);saved=r[key]||null}catch{}attach()}
new MutationObserver(()=>{if(document&&!document.hidden&&!document.getElementById('slide-wallet-details'))attach()}).observe(document.documentElement,{childList:true,subtree:true});
setInterval(load,5000);load();
})();
