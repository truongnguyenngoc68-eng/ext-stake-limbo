(() => {
  'use strict';
  let state = null, autoResumeSelected = true;
  const post = type => window.parent.postMessage({channel: 'slide-lab', type}, location.origin);
  const style = document.createElement('style');
  style.textContent = '.slide-progress-controls{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.slide-progress-controls button{padding:6px 9px;font-size:11px}.slide-progress-controls button:disabled{opacity:.4;cursor:default}';
  document.head.append(style);
  function attach() {
    const root = document.getElementById('app');
    if (!root) return;
    const nativeButton = [...root.querySelectorAll('button')].find(button =>
      /^(?:▶ CƯỢC THẬT|■ DỪNG)$/.test(button.textContent.trim()));
    if (!nativeButton) return;
    nativeButton.style.display = 'none';
    let controls = nativeButton.parentElement.querySelector('.slide-progress-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'slide-progress-controls';
      for (const name of ['Start', 'Pause', 'Reset']) {
        const button = document.createElement('button');
        button.textContent = name;
        button.dataset.control = name;
        button.addEventListener('click', () => {
          if (name === 'Start') {
            if (state?.paused) post('resume-live');
            else nativeButton.click();
          } else post(name === 'Pause' ? !state?.running && (state?.paused || state?.pending || state?.needsReconciliation) ? 'resume-live' : 'pause-live' : 'reset-live');
        });
        controls.append(button);
      }
      nativeButton.parentElement.append(controls);
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:5px;font-size:11px;margin-top:8px';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox'; toggle.checked = autoResumeSelected; toggle.id = 'slide-auto-resume';
      toggle.addEventListener('change', () => window.parent.postMessage({channel: 'slide-lab',
        type: 'auto-resume-setting', enabled: toggle.checked}, location.origin));
      label.append(toggle, 'Tự tiếp tục sau F5');
      nativeButton.parentElement.parentElement.append(label);
    }
    const unavailable = !!(state?.busy || state?.stopping || state?.resuming || state?.controlBusy);
    const canContinue = !!state && !state.running && (state.paused || state.pending || state.needsReconciliation);
    const toggle = document.getElementById('slide-auto-resume');
    if (state?.autoResumeAfterReload !== undefined) autoResumeSelected = state.autoResumeAfterReload;
    if (toggle) toggle.checked = autoResumeSelected;
    controls.querySelector('[data-control="Start"]').disabled = unavailable || !!state?.running ||
      !!state?.pending || !!state?.needsReconciliation || nativeButton.disabled;
    const pauseButton = controls.querySelector('[data-control="Pause"]');
    const pauseLabel = canContinue ? 'Continue' : state?.pausing ? 'Đang Pause…' : 'Pause';
    if (pauseButton.textContent !== pauseLabel) pauseButton.textContent = pauseLabel;
    pauseButton.disabled = canContinue ? unavailable : !state?.running || !!state?.pausing;
    controls.querySelector('[data-control="Reset"]').disabled = !state || !!state.running ||
      !!state.checkingBalance || unavailable;
    controls.querySelector('[data-control="Start"]').title = state?.paused ? 'Tiếp tục bậc và thống kê hiện tại' : 'Bắt đầu phiên cược';
    pauseButton.title = canContinue ? 'Tự xác nhận và tiếp tục tiến độ hiện tại; kết quả cũ chưa đối chiếu được lưu lại' : 'Dừng cược tiếp theo, giữ tiến độ; chờ cược hiện tại hoàn tất';
    controls.querySelector('[data-control="Reset"]').title = 'Đưa bậc, số vòng và thống kê phiên về đầu; không tự chạy';
  }
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== location.origin ||
        event.data?.channel !== 'slide-lab') return;
    if (event.data.type === 'auto-resume-status') { autoResumeSelected = event.data.data.enabled; requestAnimationFrame(attach); return; }
    if (event.data.type !== 'live-state') return;
    state = event.data.data;
    requestAnimationFrame(attach);
  });
  new MutationObserver(attach).observe(document.getElementById('app'), {childList: true, subtree: true});
  attach();
})();
