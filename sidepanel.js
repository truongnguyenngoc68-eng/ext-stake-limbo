(() => {
  'use strict';
  const frame = document.getElementById('slide-panel');
  const origin = location.origin;
  const commands = new Set(['ready', 'update-config', 'adjust-step', 'diagnostics',
    'pick-balance', 'check-live', 'start-live', 'stop-live', 'pause-live', 'resume-live', 'reset-live', 'auto-resume-setting']);
  let port = null, currentTab = null, generation = 0, windowId;
  let retryTimer = null, retryDelay = 750;
  function retry() {
    if (retryTimer) return;
    const delay = retryDelay;
    retryDelay = Math.min(10000, Math.round(retryDelay * 1.5));
    retryTimer = setTimeout(() => { retryTimer = null; connect(); }, delay);
  }
  const send = (type, data) => frame.contentWindow.postMessage({channel: 'slide-lab', type, data}, origin);
  const disconnected = (reason = 'Mở tab Stake Slide rồi bấm biểu tượng extension để kết nối.') => {
    send('status', {ok: false, count: 0});
    send('picker-status', reason);
  };
  function detach() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    generation++;
    if (port) { const previous = port; port = null; previous.disconnect(); }
  }
  async function connect() {
    detach();
    const request = generation;
    try {
      windowId = (await chrome.windows.getCurrent()).id;
      const [tab] = await chrome.tabs.query({active: true, windowId});
      if (request !== generation) return;
      currentTab = tab?.id;
      if (!Number.isInteger(tab?.id)) throw Error('Không tìm thấy tab đang chọn');
      // Chrome may omit tab.url under activeTab. The loader validates location
      // inside the target tab before loading any observer scripts.
      const prepared = await chrome.runtime.sendMessage({type: 'slide-ensure-connection', tabId: tab.id});
      if (request !== generation) return;
      if (!prepared?.ok) {
        disconnected();
        send('picker-status', prepared?.error || 'Bấm biểu tượng extension trên tab Slide để kết nối.');
        retry();
        return;
      }
      const connected = chrome.tabs.connect(tab.id, {name: 'slide-lab-panel'});
      port = connected;
      connected.onMessage.addListener(message => {
        if (port === connected && message?.channel === 'slide-lab' && !commands.has(message.type)) {
          retryDelay = 750;
          send(message.type, message.data);
        }
      });
      connected.onDisconnect.addListener(() => {
        const error = chrome.runtime.lastError?.message;
        if (port === connected) { port = null; disconnected(error || 'Kênh đọc trang đã đóng; đang thử kết nối lại…'); retry(); }
      });
      connected.postMessage({channel: 'slide-lab', type: 'ready'});
    } catch (error) { if (request === generation) { disconnected(`Lỗi kết nối Side Panel: ${String(error?.message || error)}`); retry(); } }
  }
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.origin !== origin ||
        event.data?.channel !== 'slide-lab') return;
    if (event.data.type === 'ready') { connect(); return; }
    if (!commands.has(event.data.type)) return;
    if (!port) { disconnected(); return; }
    try { port.postMessage(event.data); } catch { detach(); disconnected(); retry(); }
  });
  function refresh() { detach(); retryDelay = 750; frame.src = 'index.html'; }
  chrome.tabs.onActivated.addListener(info => { if (info.windowId === windowId) refresh(); });
  chrome.tabs.onUpdated.addListener((id, change) => {
    if (id !== currentTab) return;
    if (change.status === 'loading') {
      detach(); retryDelay = 750;
      send('status', {ok: false, count: 0});
      send('picker-status', 'Đang tải lại trang; giữ nguyên tiến độ và tự kết nối lại…');
    } else if (change.status === 'complete') connect();
  });
  window.addEventListener('unload', detach);
})();
