(() => {
  globalThis.__slideLabLifecycle?.dispose();
  const timers = new Set(), cleanups = new Set();
  let disposed = false;
  const lifecycle = {
    version: '1.0.50',
    valid() {
      if (disposed) return false;
      try { if (!chrome.runtime.id) throw Error('Extension context invalidated'); chrome.runtime.getManifest?.(); return true; }
      catch { lifecycle.dispose(); return false; }
    },
    error(error) {
      if (/context invalidated|Extension context/i.test(String(error))) lifecycle.dispose();
      else console.error('Slide Lab:', error);
    },
    run(callback) {
      if (!lifecycle.valid()) return;
      try { Promise.resolve(callback()).catch(lifecycle.error); } catch (error) { lifecycle.error(error); }
    },
    interval(callback, delay) {
      const timer = setInterval(() => lifecycle.run(callback), delay);
      timers.add(timer); return timer;
    },
    cleanup(callback) { cleanups.add(callback); },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const timer of timers) clearInterval(timer);
      for (const callback of cleanups) { try { callback(); } catch {} }
      timers.clear(); cleanups.clear(); globalThis.__slideLabObserverLoaded = false;
    },
  };
  globalThis.__slideLabLifecycle = lifecycle;
})();
