(() => {
  'use strict';
  const KEY = 'slide-lab-round-archive-v1', SIZE = 100;
  let rows = [], page = 1, min = 1, targets = [90, 113, 150, 250, 350, 410, 450, 680, 880, 1660];
  const section = document.createElement('section');
  section.className = 'round-history';
  section.innerHTML = '<div class="history-heading"><h3>KẾT QUẢ GẦN ĐÂY</h3><span>20 vòng đã quan sát</span></div><div class="recent-rounds"></div><div class="history-kpis"></div><details class="history-browser"><summary>Lịch sử vòng <span class="archive-count"></span></summary><p class="history-note">Lưu tối đa 50.000 vòng đã thu thập, kể cả khi đóng sidebar. Dấu ⋮ chỉ khoảng dữ liệu gián đoạn; thời gian là lúc đọc kết quả.</p><div class="history-filters"><label>Hệ số từ<input type="number" min="1" step="0.01" value="1" aria-label="Lọc hệ số tối thiểu"></label><label>Phân tích target<select aria-label="Target phân tích"></select></label><button type="button" class="history-export">Xuất JSON</button></div><p class="history-target-stats"></p><div class="archive-rounds"></div><div class="history-pagination"><button type="button" data-page="first" aria-label="Trang đầu">«</button><button type="button" data-page="prev" aria-label="Trang trước">‹</button><label>Trang<input type="number" min="1" value="1" aria-label="Trang lịch sử"></label><span class="history-pages"></span><button type="button" data-page="next" aria-label="Trang sau">›</button><button type="button" data-page="last" aria-label="Trang cuối">»</button></div><p class="history-match-count"></p></details>';
  const find = css => section.querySelector(css);
  const format = value => value.toLocaleString('en-US', {maximumFractionDigits: 2});
  const mount = () => {
    const host = document.getElementById('slide-round-history-host');
    if (host && section.parentElement !== host) host.append(section);
  };
  function chips(host, data) {
    host.replaceChildren(...data.map(r => {
      const chip = document.createElement('span');
      chip.className = r[1] >= 90 ? 'round-big' : r[1] >= 10 ? 'round-high' : r[1] >= 2 ? 'round-mid' : 'round-low';
      chip.textContent = (r[3] ? '⋮ ' : '') + format(r[1]) + '×';
      chip.title = 'ID: ' + r[0] + '\nĐọc lúc: ' + new Date(r[2]).toLocaleString('vi-VN') + (r[3] ? '\nKhoảng dữ liệu trước vòng này bị gián đoạn' : '');
      return chip;
    }));
  }
  function targetOptions() {
    const select = find('select'), selected = select.value;
    select.replaceChildren(...targets.slice().sort((a,b) => a-b).map(t => {
      const option = document.createElement('option'); option.value = String(t); option.textContent = 'x' + format(t); return option;
    }));
    if (targets.includes(Number(selected))) select.value = selected;
  }
  function render() {
    mount();
    chips(find('.recent-rounds'), rows.slice(-20).reverse());
    const recent = rows.slice(-100), max = recent.length ? Math.max(...recent.map(r => r[1])) : null;
    find('.history-kpis').replaceChildren(...[
      ['Đã lưu', rows.length.toLocaleString('vi-VN') + ' vòng'],
      ['Max ' + recent.length + 'v', max === null ? '—' : format(max) + '×'],
      ['≥90 · ' + recent.length + 'v', String(recent.filter(r => r[1] >= 90).length) + ' hit']
    ].map(([label, value]) => { const box = document.createElement('div'), small = document.createElement('small'), strong = document.createElement('b'); small.textContent = label; strong.textContent = value; box.append(small,strong); return box; }));
    find('.archive-count').textContent = rows.length.toLocaleString('vi-VN') + ' / 50.000';
    const filtered = rows.filter(r => r[1] >= min).reverse(), pages = Math.max(1, Math.ceil(filtered.length / SIZE));
    page = Math.max(1, Math.min(pages, page));
    if (find('details').open) chips(find('.archive-rounds'), filtered.slice((page-1)*SIZE, page*SIZE));
    else find('.archive-rounds').replaceChildren();
    find('[aria-label="Trang lịch sử"]').value = page;
    find('[aria-label="Trang lịch sử"]').max = pages;
    find('.history-pages').textContent = '/ ' + pages;
    for (const button of section.querySelectorAll('[data-page]')) button.disabled = ['first','prev'].includes(button.dataset.page) ? page <= 1 : page >= pages;
    find('.history-match-count').textContent = filtered.length.toLocaleString('vi-VN') + ' vòng khớp · 100 vòng/trang · Mới nhất trước';
    const target = Number(find('select').value), hits = rows.filter(r => r[1] >= target).length;
    let gap = 0, censored = false;
    for (let i=rows.length-1;i>=0;i--) {
      if (rows[i][1] >= target) break;
      gap++; if (rows[i][3] || i === 0) { censored = true; break; }
    }
    find('.history-target-stats').textContent = rows.length ? 'x' + format(target) + ': ' + hits + '/' + rows.length.toLocaleString('vi-VN') + ' hit (' + (hits / rows.length * 100).toFixed(2) + '% quan sát) · Chưa hit ' + (censored ? '≥' : '') + gap + ' vòng liên tục đã đọc' : 'Chưa có dữ liệu. Mở Slide để bắt đầu tích lũy lịch sử.';
  }
  find('details').addEventListener('toggle',render);
  find('[aria-label="Lọc hệ số tối thiểu"]').addEventListener('change', event => {min = Math.max(1, Number(event.target.value) || 1); page = 1; render();});
  find('select').addEventListener('change',render);
  find('[aria-label="Trang lịch sử"]').addEventListener('change', event => {page = Math.floor(Number(event.target.value) || 1); render();});
  section.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    const pages = Math.max(1, Math.ceil(rows.filter(r => r[1] >= min).length / SIZE));
    page = button.dataset.page === 'first' ? 1 : button.dataset.page === 'last' ? pages : page + (button.dataset.page === 'next' ? 1 : -1); render();
  }));
  find('.history-export').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({schema:1,rounds:rows.map(r=>({id:r[0],value:r[1],time:r[2],gapBefore:!!r[3]}))})],{type:'application/json'}));
    const link = document.createElement('a'); link.href = url; link.download = 'slide-round-history.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  chrome.storage.onChanged.addListener((changes,area) => { if(area === 'local' && changes[KEY]) {rows = changes[KEY].newValue?.rows || []; render();} });
  window.addEventListener('message', event => {
    if(event.source !== window.parent || event.origin !== location.origin || event.data?.channel !== 'slide-lab' || event.data.type !== 'live-state')return;
    const next = [...new Set((event.data.data?.progress || []).filter(p=>p.enabled).map(p=>p.target))];
    if(next.length && next.join() !== targets.join()) {targets = next; targetOptions(); render();}
  });
  new MutationObserver(mount).observe(document.getElementById('app'),{childList:true,subtree:true});
  targetOptions(); render();
  chrome.storage.local.get(KEY).then(data=>{rows=data[KEY]?.rows||[];render();}).catch(()=>{find('.history-match-count').textContent='Không đọc được lịch sử lưu trên trình duyệt.';});
})();
