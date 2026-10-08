(()=>{
'use strict';
// Presentation-only: do not bypass the underlying balance guard or change a saved user limit.
function walk(){
 const root=document.getElementById('app');if(!root)return;
 const labels=[...root.querySelectorAll('label')];
 for(const label of labels){
  const text=(label.textContent||'').trim();
  if(text.startsWith('Giới hạn tổng cược / vòng') || text.startsWith('Trần tổng cược / vòng')){
   // Show existing saved limit instead of forcing it to zero.
   const input=label.querySelector('input');
   if(input && input.value==='0') {label.style.display='none';}
  }
  if(text==='Đồng cược'){
   const row=label.parentElement;
   if(row){
    const picker=[...row.querySelectorAll('button')].find(b=>/Số dư: tự nhận diện|Chọn số dư trên Stake/.test(b.textContent||''));
    if(picker){picker.disabled=true;picker.style.pointerEvents='none';picker.title='Đọc số dư tự động; khi chưa xác minh được, Auto sẽ không gửi cược';}
   }
  }
 }
 const cap=[...root.querySelectorAll('input[type="number"]')].find(x=>x.closest('label') && /Giới hạn tổng cược \/ vòng|Trần tổng cược \/ vòng/.test(x.closest('label').textContent||''));
 if(cap && cap.value==='0'){
  // Already disabled. Keep Vue value unchanged and visible planned total.
  const label=cap.closest('label');if(label)label.style.display='none';
 }
}
window.addEventListener('message',event=>{
 const msg=event.data;
 if(!msg||msg.channel!=='slide-lab'||msg.type!=='auto-wallet')return;
 const data=msg.data||{};
 const root=document.getElementById('app');if(!root)return;
 const row=[...root.querySelectorAll('button')].find(b=>/Số dư: tự nhận diện|Chọn số dư trên Stake/.test(b.textContent||''));
 if(!row)return;
 row.textContent=(data.verified&&Number.isFinite(data.balance))
  ? `Tự đọc số dư: ${Number(data.balance).toFixed(8)} ${data.currency||''}`
  : 'Đang xác minh số dư…';
 row.title=data.verified?'Số dư lấy từ thanh đầu trang Stake':'Không nhận diện được một số dư duy nhất. Tạm dừng thao tác cược.';
});
const observer=new MutationObserver(()=>{if(!document.hidden)walk()});
observer.observe(document.documentElement,{subtree:true,childList:true});
setInterval(walk,1500);walk();
})();
