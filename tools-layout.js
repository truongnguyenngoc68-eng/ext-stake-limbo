// Keep observation panels alive when Vue switches tabs. No live-session writes.
(() => {
  const panels = new Set();
  const parking = document.createElement('div');
  parking.hidden = true;
  parking.id = 'slide-tools-parking';
  document.body.append(parking);
  function mount() {
    const host = document.getElementById('slide-tools-overview') || parking;
    for (const panel of panels) if (panel.parentElement !== host) host.append(panel);
  }
  window.SlideTools = {add(panel) { panels.add(panel); mount(); }};
  new MutationObserver(mount).observe(document.getElementById('app'), {childList: true, subtree: true});
})();
