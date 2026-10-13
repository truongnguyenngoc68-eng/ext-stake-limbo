(() => {
  const panel=document.createElement('section');panel.className='card';
  panel.style.cssText='padding:16px;border:1px solid #384765;border-radius:12px;background:#122037';
  const title=document.createElement('h3');title.textContent='Phòng thử nghiệm chiến thuật';
  const text=document.createElement('p');text.textContent='Phân tích lịch sử, tùy biến BET/WAIT, lưu phiên bản và đọc sổ tay. Chỉ mô phỏng; không đặt cược thật.';
  const button=document.createElement('button');button.textContent='Mở trang nghiên cứu riêng';
  button.onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('research-preview/index.html')});
  panel.append(title,text,button);window.SlideTools?.add(panel);
})();
