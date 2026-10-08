// Independent observation archive: never changes the betting engine or session counters.
(() => {
  const KEY = 'slide-lab-round-archive-v1', LIMIT = 50000;
  let writes = Promise.resolve();
  const valid = r => r && typeof r.id === 'string' && r.id.length <= 200 &&
    Number.isFinite(r.value) && r.value >= 1 && Number.isFinite(r.time);
  async function append(rounds, gap, seed) {
    const stored = await chrome.storage.local.get([KEY, 'slide-lab-durable-live-v1']);
    const previous = stored[KEY];
    const legacy = (stored['slide-lab-durable-live-v1']?.observed || []).filter(valid);
    const rows = Array.isArray(previous?.rows) ? previous.rows.slice() : legacy.map(r => [r.id, r.value, r.time]);
    const seen = new Set(rows.map(r => r[0]));
    const overlaps = rounds.some(r => seen.has(r.id));
    const fresh = rounds.filter(valid).filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
    if (!fresh.length && previous) return;
    let segment = previous?.segment || 0;
    // No shared ID after reload/disconnection: keep both ranges, mark their boundary.
    if (rows.length && fresh.length && (gap || seed && !overlaps)) segment++;
    fresh.forEach((r, index) => rows.push([r.id, r.value, r.time, index === 0 && segment !== (previous?.segment || 0) ? 1 : 0]));
    await chrome.storage.local.set({[KEY]: {schema: 1, limit: LIMIT, segment, savedAt: Date.now(), rows: rows.slice(-LIMIT)}});
  }
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type !== 'slide-archive-rounds') return false;
    let allowed = false;
    try { const url = new URL(sender.url); allowed = sender.id === chrome.runtime.id && url.protocol === 'https:' && /\/casino\/games\/slide\/?$/.test(url.pathname); } catch {}
    if (!allowed || !Array.isArray(message.rounds) || message.rounds.length > 5000 || !message.rounds.every(valid)) {
      reply({ok: false}); return false;
    }
    writes = writes.catch(() => {}).then(() => append(message.rounds, message.gap === true, message.seed === true));
    writes.then(() => reply({ok: true})).catch(() => reply({ok: false}));
    return true;
  });
})();
