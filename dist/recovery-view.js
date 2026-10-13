(()=>{
  const key='slide-lab-last-checkpoint-v1';
  const div=document.createElement('details');div.style.cssText='position:relative;margin:34px 10px 5px;padding:8px;background:#14283a;color:#e4f1fa;border:1px solid #426078;border-radius:8px;font:12px Arial,sans-serif;';
  div.innerHTML='<summary style="cursor:pointer">💾 Điểm khôi phục / chẩn đoán v1.0.56</summary><pre style="white-space:pre-wrap;line-height:1.5" id="slide-checkpoint">Đang kiểm tra…</pre><small>Tiến độ được lưu riêng. Tự tiếp tục sau F5 theo tùy chọn của phiên.</small>';
  div.id='slide-recovery-details';
  window.SlideTools.add(div);
  function refresh(){chrome.storage.local.get(key).then(data=>{
    const state=data[key]||{};const pre=div.querySelector('#slide-checkpoint');
    pre.textContent=state.savedAt?'Lần ghi: '+new Date(state.savedAt).toLocaleString()+'\nVòng mới nhất: '+(state.roundId||'—')+'\nSố dư trên đầu trang: '+(state.wallet??'chưa xác minh')+'\nSố vòng quan sát trên trang: '+(state.seenInThisPage??0)+'\nSố vòng còn trong lịch sử: '+(state.roundHistory?.length??0)+'\nTrình duyệt online: '+(state.online?'Có':'Không'):'Chưa có checkpoint từ trang Slide';
  }).catch(()=>{})};setInterval(refresh,5000);refresh();
})();
