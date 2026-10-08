(() => {
  'use strict';
  function parse(raw) {
    let text = String(raw).trim();
    if (/[$€₫]/.test(text)) return null;
    text = text.replace(/\s*(USDT|BTC|ETH|BNB|LTC|SOL)$/i, '').replace(/\s/g, '');
    if (!/^\d[\d.,]*$/.test(text)) return null;
    if (text.includes('.') && text.includes(',')) {
      const decimal = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ',';
      const grouping = decimal === '.' ? ',' : '.';
      const [whole, fraction, extra] = text.split(decimal);
      if (extra !== undefined || !/^\d{1,8}$/.test(fraction)) return null;
      if (!new RegExp('^\\d{1,3}(\\' + grouping + '\\d{3})+$').test(whole)) return null;
      text = whole.split(grouping).join('') + '.' + fraction;
    } else {
      // Stake's crypto wallet uses the single separator as its decimal mark.
      text = text.replace(',', '.');
    }
    if (!/^\d+(?:\.\d{1,8})?$/.test(text)) return null;
    const amount = Number(text);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }
  function read(root) {
    const candidates = [];
    const nodes = root.querySelectorAll('header *, [role="banner"] *, nav *, [data-testid*="wallet"] *, [class*="wallet"] *');
    for (const element of nodes) {
      if (element.children.length || !element.getClientRects().length) continue;
      const text = (element.textContent || '').trim();
      // Avoid menu counters and unrelated integer labels in the header.
      if (!/[.,]\d{4,8}(?:\s*(?:USDT|BTC|ETH|BNB|LTC|SOL))?$/i.test(text)) continue;
      const amount = parse(text);
      if (amount !== null) candidates.push(amount);
    }
    const unique = [...new Set(candidates.map(amount => amount.toFixed(8)))];
    return unique.length === 1 ? Number(unique[0]) : null;
  }
  globalThis.SlideWallet = Object.freeze({parse, read});
})();
