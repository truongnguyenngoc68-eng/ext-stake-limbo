// Restore durable UI settings before mounting the application.
const keys = ['slide-lab-config-v1', 'slide-lab-options-v1'];
try {
  const stored = await chrome.storage.local.get(keys);
  for (const key of keys) {
    if (typeof stored[key] === 'string') localStorage.setItem(key, stored[key]);
    else {
      const existing = localStorage.getItem(key);
      if (existing) await chrome.storage.local.set({[key]: existing});
    }
  }
  const original = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    original.call(this, key, value);
    if (this === localStorage && keys.includes(key)) {
      chrome.storage.local.set({[key]: String(value)}).catch(console.error);
    }
  };
} catch (error) { console.error('Slide Lab settings restore:', error); }
await import('./app.js');
