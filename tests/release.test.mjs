import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';
import {defaults} from '../src/model.ts';
const read = name => readFileSync(new URL(`../dist/${name}`, import.meta.url), 'utf8');
const round = (id, value = 1) => ({id, value, time: Date.now()});
const flush = () => new Promise(resolve => setImmediate(resolve));
function page() {
  const dom = new JSDOM('<header><span>134,69951021</span></header><body><div id="app"></div></body>', {
    url: 'https://stake1073.com/vi/casino/games/slide', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window;
  w.structuredClone = structuredClone;
  w.setInterval = () => 0;
  w.Element.prototype.getClientRects = function () { return this.hidden ? [] : [{}]; };
  w.chrome = {runtime: {id: 'test', getURL: p => `chrome-extension://test/${p}`,
    onConnect: {addListener() {}}, onMessage:{addListener(){},removeListener(){}}, sendMessage: async () => ({targets: [], entry: {enabled: false}})},
    storage: {onChanged: {addListener() {}}, local: {get: async () => ({}), set: async () => {}}}};
  w.eval(read('content-lifecycle.js'));w.eval(read('wallet-reader.js'));
  return {dom, w};
}
test('Wallet decimal separators, grouping, invalid text and ambiguous header', () => {
  const {dom, w} = page();
  try {
    for (const [input, expected] of [['134,69951021', 134.69951021], ['134.69951021', 134.69951021],
      ['1.234,69951021 USDT', 1234.69951021], ['1,234.69951021', 1234.69951021],
      ['0,00000001', 0.00000001], ['0,00000000', 0], ['134,69', 134.69]]) {
      assert.equal(w.SlideWallet.parse(input), expected, input);
    }
    for (const input of ['USDT', '$134,69951021', '1,2,3', '1.2345,12345678', 'NaN', '-1']) {
      assert.equal(w.SlideWallet.parse(input), null, input);
    }
    assert.equal(w.SlideWallet.read(w.document), 134.69951021);
    w.document.querySelector('header').insertAdjacentHTML('beforeend', '<span>99,00000000</span>');
    assert.equal(w.SlideWallet.read(w.document), null);
  } finally { dom.window.close(); }
});
function liveFixture() {
  const fixture = page(), {w} = fixture;
  // Expose closure state only in this test's evaluation, never in the shipped file.
  w.eval(read('content.js').replace('/* Recovery watchdog:', `globalThis.releaseTest={Live:et,Driver:j,control:slideProgressControl,persist:saveSlideSession,
    getSession:()=>h,setSession:session=>{h=session;y=[{id:'seed',value:1,time:Date.now()}];U=[...y];x=Date.now();$=false}};
    /* Recovery watchdog:`));
  w.navigator.locks = {request: async (_name, _options, callback) => callback({})};
  const config = defaults();
  config.stopLoss = 0; config.takeProfit = 0;
  config.targets = config.targets.filter(target => target.enabled);
  config.targets[0].steps[0].rounds = 100;
  const events = [];
  const driver = {readBalance: () => 134.69951021, activeButton: () => null,
    stopNative: async () => events.push('stop'), countdown: () => 10, currentStake: () => .01,
    configure: async () => events.push('configure'), submit: async () => events.push('submit')};
  const live = new w.releaseTest.Live(config, [round('seed')], {
    currency: 'usdt', maxRoundBet: 0, maxTotalBet: 0, maxRounds: 0, continuous: true,
  }, () => {}, driver);
  w.releaseTest.setSession(live);
  return {...fixture, live, events, driver};
}

test('Collapsed My Bets is expanded once before reading; session progress is preserved', async () => {
  const {dom,w,live} = liveFixture();
  try {
    live.engine.positions['450'].used=44;
    live.engine.count=230;
    w.document.body.insertAdjacentHTML('beforeend','<div class="game-sidebar"><div class="my-bets"><button class="header">Cược Của Tôi9</button></div></div>');
    const panel=w.document.querySelector('.my-bets'), header=panel.querySelector('button');
    let clicks=0;
    header.addEventListener('click',()=>{clicks++;header.classList.add('expanded');setTimeout(()=>panel.insertAdjacentHTML('beforeend','<ul class="rows"><li>90,00× 0.00200000</li></ul>'),10)});
    const driver=new w.releaseTest.Driver(w.document,()=>true,'usdt');
    await driver.ensureBetList();
    assert.equal(driver.rows().length,1);
    assert.equal(driver.readRow(driver.rows()[0]).target,90);
    await driver.ensureBetList();
    assert.equal(clicks,1);
    assert.equal(live.engine.positions['450'].used,44);
    assert.equal(live.engine.count,230);
  } finally {dom.window.close()}
});

test('Stop Loss is ignored in old configs and Continue preserves a previously halted session', async () => {
  const {dom,w,live,driver}=liveFixture();
  try {
    const config=structuredClone(live.engine.config);config.stopLoss=.001;
    live.engine.updateConfig(config);
    assert.equal(live.engine.config.stopLoss,0);
    live.engine.consume(round('loss',1));
    assert.equal(live.engine.halted,'');
    live.engine.halted='Đạt stop loss';live.running=false;live.paused=false;
    const count=live.engine.count,used=live.engine.positions['450'].used,profit=live.engine.profit;
    const continuing=w.releaseTest.control('resume-live');await flush();
    assert.equal(live.running,true);assert.equal(live.engine.halted,'');
    assert.equal(live.engine.count,count);assert.equal(live.engine.positions['450'].used,used);assert.equal(live.engine.profit,profit);
    await live.stop('Test complete');await continuing;
  }finally{dom.window.close()}
});

test('Expanded My Bets waits for DOM and clear opens a collapsed empty list', async () => {
  const {dom,w}=liveFixture();
  try {
    w.document.body.insertAdjacentHTML('beforeend','<div class="game-sidebar"><div class="my-bets"><button class="header expanded">Cược Của Tôi0</button></div></div>');
    const panel=w.document.querySelector('.my-bets'),header=panel.querySelector('button');
    let clicks=0;header.addEventListener('click',()=>{clicks++;header.classList.add('expanded');panel.insertAdjacentHTML('beforeend','<ul class="rows"></ul>')});
    const driver=new w.releaseTest.Driver(w.document,()=>true,'usdt');
    setTimeout(()=>panel.insertAdjacentHTML('beforeend','<ul class="rows"></ul>'),10);
    await driver.ensureBetList();assert.equal(clicks,0);
    panel.querySelector('ul').remove();header.classList.remove('expanded');
    await driver.clear();assert.equal(clicks,1);assert.equal(driver.rows().length,0);
  } finally {dom.window.close()}
});
test('Real bundled driver reads comma wallet; pause/resume preserves progress and reset clears it', async () => {
  const {dom, w, live, events} = liveFixture();
  try {
    assert.equal(new w.releaseTest.Driver(w.document, () => true, 'usdt').readBalance(), 134.69951021);
    live.engine.positions['450'].used = 7;
    live.betRounds = 7;
    await w.releaseTest.control('pause-live');
    assert.equal(live.running, false); assert.equal(live.paused, true);
    const continuing = w.releaseTest.control('resume-live');
    await flush();
    assert.equal(live.running, true); assert.equal(live.betRounds, 7);
    assert.equal(live.engine.positions['450'].used, 7);
    await w.releaseTest.control('pause-live');
    await continuing;
    await w.releaseTest.control('reset-live');
    const fresh = w.releaseTest.getSession();
    assert.equal(fresh.running, false); assert.equal(fresh.paused, true);
    assert.equal(fresh.betRounds, 0); assert.equal(fresh.engine.profit, 0);
    assert.equal(fresh.engine.positions['450'].used, 0);
    assert.equal(fresh.engine.positions['450'].step, 0);
    assert.ok(!events.includes('submit'));
  } finally { dom.window.close(); }
});
test('Pause settles accepted round once and does not rearm continuous native betting', async () => {
  const {dom, w, live, events} = liveFixture();
  try {
    // Disable balance-delay scheduling for this receipt/settlement regression.
    live.checkBalance = async () => {};
    await live.tick(); await live.tick();
    assert.equal(live.pending.receiptSeen, true);
    await w.releaseTest.control('pause-live');
    assert.equal(live.pausing, true);
    live.observe([round('settled')]); await live.tick();
    assert.equal(live.betRounds, 1); assert.equal(live.pending, null);
    assert.equal(live.engine.profit, -.01); assert.equal(live.running, false);
    assert.equal(live.paused, true); assert.equal(events.filter(e => e === 'submit').length, 1);
  } finally { dom.window.close(); }
});
test('Missing receipt no longer stops a matching next result or locks Pause', async () => {
  const {dom, w, live, driver} = liveFixture();
  try {
    live.checkBalance = async () => {};
    driver.currentStake = () => null;
    await live.tick();
    assert.equal(live.pending.receiptSeen, false);
    await w.releaseTest.control('pause-live');
    live.observe([round('next-without-receipt')]); await live.tick();
    assert.equal(live.betRounds, 1); assert.equal(live.engine.profit, -.01);
    assert.equal(live.running, false); assert.equal(live.paused, true);
    assert.equal(live.pending, null); assert.equal(live.pausing, false);
  } finally { dom.window.close(); }
});
test('Manual Continue archives unresolved wager without inventing a result; Reset remains available', async () => {
  const {dom, w, live} = liveFixture();
  try {
    await live.tick();
    live.running = false; live.paused = true;
    let audit;
    w.chrome.storage.local.set = async data => { if(data['slide-lab-recovery-audit-v1'])audit=data['slide-lab-recovery-audit-v1']; };
    const continuing = w.releaseTest.control('resume-live'); await flush();
    assert.equal(live.running, true); assert.equal(live.pending, null);
    assert.equal(live.engine.profit, 0); assert.equal(live.betRounds, 0);
    assert.equal(audit.userAcknowledged, true); assert.ok(audit.pending);
    await w.releaseTest.control('pause-live'); await continuing;
    await w.releaseTest.control('reset-live');
    assert.equal(w.releaseTest.getSession().betRounds, 0);
  } finally { dom.window.close(); }
});
test('Pause during configuration blocks a new submission and keeps progress', async () => {
  const {dom, w, live, driver, events} = liveFixture();
  try {
    let configured;
    driver.configure = () => new Promise(resolve => { configured = resolve; });
    const ticking = live.tick();
    await flush();
    assert.equal(live.busy, true);
    const pausing = w.releaseTest.control('pause-live');
    configured();
    await ticking; await pausing;
    assert.equal(live.running, false); assert.equal(live.paused, true);
    assert.equal(live.pending, null); assert.ok(!events.includes('submit'));
  } finally { dom.window.close(); }
});
test('Progress controls invoke Start, Pause, Resume and Reset with correct availability', async () => {
  const dom = new JSDOM('<div id="app"><section><header><span>AUTO</span><button>▶ CƯỢC THẬT</button></header></section></div>', {
    url: 'https://extension.test/index.html', runScripts: 'outside-only', pretendToBeVisual: true,
  });
  const w = dom.window, sent = [];
  w.requestAnimationFrame = callback => callback();
  w.postMessage = data => { if (data?.channel === 'slide-lab') sent.push(data.type); };
  let initialStarts = 0;
  w.document.querySelector('button').addEventListener('click', () => initialStarts++);
  try {
    w.eval(read('progress-controls.js'));
    const button = name => w.document.querySelector(`[data-control="${name}"]`);
    button('Start').click(); assert.equal(initialStarts, 1);
    function state(data) {
      w.dispatchEvent(new w.MessageEvent('message', {source: w, origin: w.location.origin,
        data: {channel: 'slide-lab', type: 'live-state', data}}));
    }
    state({running: true});
    assert.equal(button('Start').disabled, true); assert.equal(button('Reset').disabled, true);
    button('Pause').click(); await flush(); assert.ok(sent.includes('pause-live'));
    state({running: false, paused: true});
    assert.equal(button('Pause').textContent, 'Continue');
    assert.equal(button('Pause').disabled, false);
    button('Pause').click(); await flush(); assert.ok(sent.includes('resume-live'));
    button('Start').click(); button('Reset').click(); await flush();
    assert.ok(sent.includes('resume-live')); assert.ok(sent.includes('reset-live'));
    state({running: false, pending: true, paused: true});
    assert.equal(button('Start').disabled, true); assert.equal(button('Reset').disabled, false);
    assert.equal(button('Pause').textContent, 'Continue'); assert.equal(button('Pause').disabled, false);
  } finally { dom.window.close(); }
});
test('Arbitrary Slide domains connect using active tab permission and DOM preparation', async () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.version, '1.0.50');
  assert.ok(manifest.permissions.includes('activeTab'));
  assert.ok(manifest.permissions.includes('scripting'));
  assert.deepEqual(manifest.host_permissions, ['https://stake1073.com/*', 'https://www.stake1073.com/*']);
  for (const host of ['stake1022.com', 'stake1073.com', 'slide-mirror.example', 'hidden-url']) {
    let messageHandler, connectedId;
    const outgoing = [];
    const child = {postMessage() {}};
    const frame = {contentWindow: child};
    const port = {postMessage: message => outgoing.push(message), disconnect() {},
      onMessage: {addListener() {}}, onDisconnect: {addListener() {}}};
    vm.runInNewContext(read('sidepanel.js'), {URL, location: {origin: 'chrome-extension://test'},
      document: {getElementById: () => frame},
      window: {addEventListener: (type, callback) => {if (type === 'message') messageHandler = callback;}},
      chrome: {runtime: {sendMessage: async message => {
        assert.equal(message.type, 'slide-ensure-connection'); return {ok: true};
      }}, windows: {getCurrent: async () => ({id: 1})}, tabs: {
        query: async () => [{id: 25, ...(host === 'hidden-url' ? {} : {url: `https://${host}/vi/casino/games/slide`})}],
        connect: id => {connectedId = id; return port;},
        onActivated: {addListener() {}}, onUpdated: {addListener() {}},
      }}});
    messageHandler({source: child, origin: 'chrome-extension://test', data: {channel: 'slide-lab', type: 'ready'}});
    await flush();
    assert.equal(connectedId, 25, host);
    assert.equal(outgoing[0].type, 'ready');
  }
});
test('Signal background accepts any injected Slide origin and rejects non-Slide pages', async () => {
  const listeners = [];
  vm.runInNewContext(read('background.js'), {Promise, URL, console, chrome: {
    runtime: {id: 'test', getURL: path => `chrome-extension://test/${path}`,
      onMessage: {addListener: callback => {listeners.push(callback);}}},
    action: {onClicked: {addListener() {}}},
    sidePanel: {setPanelBehavior: async () => {}}, storage: {local: {get: async () => ({})}},
  }});
  const listener = listeners[0];
  for (const host of ['stake1022.com', 'stake1073.com', 'slide-mirror.example']) {
    const rules = await new Promise(resolve => listener({type: 'signal-rules'},
      {id: 'test', url: `https://${host}/vi/casino/games/slide`}, resolve));
    assert.ok(Array.isArray(rules.targets), host);
  }
  const denied = await new Promise(resolve => listener({type: 'signal-rules'},
    {id: 'test', url: 'https://stake1073.com/vi/casino/games/dice'}, resolve));
  assert.equal(denied.ok, false);
});
test('Dynamic loader observes Manual mode, deduplicates injection and validates callers', async () => {
  const listeners = [], injected = [];
  let loaded = false, validDOM = false, slide = true;
  vm.runInNewContext(read('background.js'), {Promise, URL, console, chrome: {
    runtime: {id: 'test', getURL: path => `chrome-extension://test/${path}`,
      onMessage: {addListener: callback => listeners.push(callback)}},
    action: {onClicked: {addListener() {}}}, sidePanel: {setPanelBehavior: async () => {}},
    tabs:{sendMessage:async()=>({ok:true,version:'1.0.50'})},scripting: {executeScript: async options => {
      if (options.func) return [{result: {slide, dom: validDOM, loaded}}];
      injected.push(options.files); loaded = true; return [];
    }},
  }});
  const listener = listeners.at(-1);
  const connect = sender => new Promise(resolve => listener({type: 'slide-ensure-connection', tabId: 7}, sender, resolve));
  const sender = {id: 'test', url: 'chrome-extension://test/sidepanel.html'};
  const [first, second] = await Promise.all([connect(sender), connect(sender)]);
  assert.equal(first.ok, true); assert.equal(second.ok, true); assert.equal(injected.length, 1);
  assert.ok(injected[0].includes('content.js'));
  await connect(sender); assert.equal(injected.length, 1);
  assert.equal((await connect({id: 'other', url: sender.url})).ok, false);
  slide = false;
  assert.equal((await connect(sender)).ok, false);
  assert.equal(injected.length, 1);
});
test('Pause clears only a verified cancelled queued native round and becomes resumable', async () => {
  const {dom, w, live, driver} = liveFixture();
  try {
    await live.tick();
    driver.currentStake = () => null;
    driver.statusAmounts = () => [0];
    driver.startButton = () => ({});
    await w.releaseTest.control('pause-live');
    assert.equal(live.pending, null); assert.equal(live.paused, true); assert.equal(live.running, false);
    assert.equal(live.betRounds, 0);
  } finally { dom.window.close(); }
});
test('Pause completes when cancellation becomes visible later with less than four seconds left', async () => {
  const {dom, w, live, driver} = liveFixture();
  try {
    await live.tick();
    driver.currentStake = () => null;
    driver.statusAmounts = () => [0];
    driver.startButton = () => ({});
    driver.countdown = () => 0;
    await w.releaseTest.control('pause-live');
    assert.equal(live.pausing, true); assert.ok(live.pending);
    driver.countdown = () => 1.2;
    await live.tick();
    assert.equal(live.running, false); assert.equal(live.paused, true);
    assert.equal(live.pausing, false); assert.equal(live.pending, null);
    assert.equal(live.betRounds, 0);
  } finally { dom.window.close(); }
});
test('Unresolved receipt timeout exits pausing and retains unresolved wager', async () => {
  const {dom, w, live, driver} = liveFixture();
  try {
    await live.tick();
    driver.currentStake = () => null;
    driver.statusAmounts = () => [0];
    driver.startButton = () => ({});
    driver.countdown = () => 0;
    await w.releaseTest.control('pause-live');
    live.pending.time = Date.now() - 46000;
    await live.tick();
    assert.equal(live.running, false); assert.equal(live.pausing, false);
    assert.ok(live.pending); assert.equal(live.betRounds, 0);
  } finally { dom.window.close(); }
});
test('Full engine, limits and progress survive a new page context without restarting betting', async () => {
  const {dom, w, live} = liveFixture();
  let saved;
  try {
    w.chrome.storage.local.set = async data => { if (data['slide-lab-durable-live-v1']) saved = structuredClone(data['slide-lab-durable-live-v1']); };
    live.engine.positions['450'].step = 1;
    live.engine.positions['450'].used = 19;
    live.engine.balanceUnits = 9900000000n;
    live.engine.turnoverUnits = 100000000n;
    live.betRounds = 19;
    live.options.maxRounds = 500;
    await w.releaseTest.control('pause-live'); await flush();
    assert.equal(saved.state.betRounds, 19);
  } finally { dom.window.close(); }
  const restoredPage = page(), second = restoredPage.w;
  try {
    second.chrome.storage.local.get = async key => ({[key]: saved});
    second.eval(read('content.js').replace('/* Recovery watchdog:', 'globalThis.restoredSession=()=>h;/* Recovery watchdog:'));
    await flush();
    const restored = second.restoredSession();
    assert.equal(restored.running, false); assert.equal(restored.paused, true);
    assert.equal(restored.betRounds, 19); assert.equal(restored.engine.positions['450'].step, 1);
    assert.equal(restored.engine.positions['450'].used, 19); assert.equal(restored.engine.profit, -1);
    assert.equal(restored.engine.turnover, 1); assert.equal(restored.options.maxRounds, 500);
  } finally { restoredPage.dom.window.close(); }
});
test('Cold UI restores saved configuration/options before app mount and mirrors subsequent saves', async () => {
  const {dom, w} = page();
  try {
    const config = JSON.stringify({...defaults(), bankroll: 222});
    const options = JSON.stringify({currency: 'usdt', maxRounds: 321});
    const saved = {'slide-lab-config-v1': config, 'slide-lab-options-v1': options};
    w.chrome.storage.local.get = async () => saved;
    w.chrome.storage.local.set = async data => Object.assign(saved, data);
    await w.eval('(async()=>{' + read('ui-bootstrap.js').replace("await import('./app.js');", '') + '})()');
    assert.equal(w.localStorage.getItem('slide-lab-config-v1'), config);
    assert.equal(w.localStorage.getItem('slide-lab-options-v1'), options);
    w.localStorage.setItem('slide-lab-options-v1', JSON.stringify({maxRounds: 654}));
    await flush();
    assert.equal(JSON.parse(saved['slide-lab-options-v1']).maxRounds, 654);
  } finally { dom.window.close(); }
});
test('F5 auto resume preserves progress, reconciles confirmed wagers and respects disabled/unconfirmed cases', async () => {
  const first = liveFixture(); let saved;
  try {
    first.w.chrome.storage.local.set = async data => { if(data['slide-lab-durable-live-v1']) saved = structuredClone(data['slide-lab-durable-live-v1']); };
    first.live.engine.positions['450'].used = 7;
    first.live.betRounds = 7;
    first.w.releaseTest.persist(); await flush();
    assert.equal(saved.state.wasRunning, true);
  } finally { first.dom.window.close(); }
  for (const mode of ['ready', 'confirmed', 'unconfirmed', 'disabled']) {
    const fixture = page(), {w, dom} = fixture;
    const record = structuredClone(saved);
    if (mode === 'confirmed' || mode === 'unconfirmed') {
      record.state.needsReconciliation = true;
      record.state.recoveryPending = {anchor:'seed', ids:['450'], bets:[{id:'450',target:450,amount:.01}], receiptSeen:mode==='confirmed'};
    }
    try {
      w.chrome.storage.local.get = async key => ({[key]:key==='slide-lab-auto-resume-v1'?mode!=='disabled':record});
      w.navigator.locks = {request: async (_name,_options,callback) => callback({})};
      w.eval(read('content.js').replace('/* Recovery watchdog:', `globalThis.reloadTest={session:()=>h,resume:slideMaybeResumeAfterReload,
        source:rounds=>{y=rounds;U=[...rounds];x=Date.now();$=false}};/* Recovery watchdog:`));
      await flush();
      const session = w.reloadTest.session();
      session.driver = {readBalance:()=>134.4,nativeActive:false,activeButton:()=>null,currencyCheck:()=>({}),countdown:()=>0,stopNative:async()=>{}};
      w.reloadTest.source(mode==='confirmed'?[round('seed'),round('settled')]:[round('seed')]);
      const continuing = w.reloadTest.resume(); await flush();
      if (mode==='ready'||mode==='confirmed') {
        assert.equal(session.running,true,mode);
        assert.equal(session.betRounds,mode==='confirmed'?8:7);
        assert.equal(session.engine.positions['450'].used,mode==='confirmed'?8:7);
        if(mode==='confirmed') assert.equal(session.engine.profit,-.01);
        await session.stop('Test completed'); await continuing;
      } else {
        await continuing;
        assert.equal(session.running,false,mode); assert.equal(session.betRounds,7);
      }
    } finally { dom.window.close(); }
  }
});
test('Immediate F5 restores the latest four-round journal over stale storage and Start resumes the same engine', async () => {
  const first = liveFixture(); let journal;
  try {
    first.live.engine.positions['450'].used = 4;
    first.live.betRounds = 4;
    first.live.engine.history.push(round('round-four'));
    first.live.engine.trades.push({roundId:'round-four',tableId:'450',target:450,step:1,amount:.01,profit:-.01,outcome:'LOSS'});
    first.w.releaseTest.persist();
    // No await: simulate leaving before the async extension-storage write completes.
    journal = first.w.sessionStorage.getItem('slide-lab-durable-live-v1');
    assert.equal(JSON.parse(journal).state.betRounds, 4);
  } finally { first.dom.window.close(); }
  const {dom, w} = page();
  try {
    const stale = JSON.parse(journal); stale.savedAt -= 1; stale.state.betRounds = 0;
    stale.engine.positions['450'].used = 0; stale.engine.trades = [];
    w.sessionStorage.setItem('slide-lab-durable-live-v1', journal);
    w.chrome.storage.local.get = async key => ({[key]:key==='slide-lab-auto-resume-v1'?true:stale});
    w.navigator.locks = {request:async (_name,_options,callback)=>callback({})};
    w.eval(read('content.js').replace('/* Recovery watchdog:', `globalThis.f5Test={session:()=>h,start:at,
      history:()=>y,source:()=>{U=[...y];x=Date.now();$=false}};/* Recovery watchdog:`));
    await flush();
    const restored = w.f5Test.session();
    assert.equal(restored.betRounds, 4); assert.equal(restored.engine.positions['450'].used, 4);
    assert.equal(restored.engine.trades.length, 1);
    assert.ok(w.f5Test.history().some(item=>item.id==='round-four'));
    restored.driver = {readBalance:()=>134.4,activeButton:()=>null,stopNative:async()=>{}};
    w.f5Test.source();
    const continuing = w.f5Test.start(defaults(), {currency:'usdt',maxRoundBet:0,maxTotalBet:0,maxRounds:0});
    await flush();
    assert.equal(w.f5Test.session(), restored); assert.equal(restored.running, true);
    assert.equal(restored.betRounds, 4); assert.equal(restored.engine.positions['450'].used, 4);
    await restored.stop('Test complete'); await continuing;
  } finally { dom.window.close(); }
});
test('Panel retains UI through F5 and reconnects even after a long healthy session', async () => {
  let messageHandler, updateHandler, scheduled, disconnected;let now=0;
  const child = {postMessage() {}}, frame = {contentWindow: child, src:'index.html'};
  let attempts=0, connections=0;
  const port={postMessage(){},disconnect(){},onMessage:{addListener(){}},onDisconnect:{addListener(fn){disconnected=fn}}};
  vm.runInNewContext(read('sidepanel.js'), {URL,Date:{now:()=>now},location:{origin:'chrome-extension://test'},
    setTimeout:callback=>{scheduled=callback;return 1;},clearTimeout(){},
    document:{getElementById:()=>frame},window:{addEventListener:(name,callback)=>{if(name==='message')messageHandler=callback;}},
    chrome:{runtime:{sendMessage:async()=>({ok:++attempts!==2})},windows:{getCurrent:async()=>({id:1})},tabs:{
      query:async()=>[{id:8,url:'https://mirror.example/vi/casino/games/slide'}],
      connect:()=>{connections++;return port;},onActivated:{addListener(){}},onUpdated:{addListener:callback=>updateHandler=callback},
    }}});
  messageHandler({source:child,origin:'chrome-extension://test',data:{channel:'slide-lab',type:'ready'}});await flush();
  assert.equal(connections,1);
  frame.src='keep-current-ui';
  updateHandler(8,{status:'loading'}); updateHandler(8,{status:'complete'});await flush();
  assert.equal(frame.src,'keep-current-ui');assert.equal(connections,1);assert.equal(typeof scheduled,'function');
  scheduled();await flush();assert.equal(connections,2);assert.equal(frame.src,'keep-current-ui');
  now=3600000;scheduled=null;disconnected();
  assert.equal(typeof scheduled,'function');scheduled();await flush();assert.equal(connections,3);
});

test('Stale wallet warns while native Auto remains active; invalid wallet still stops', async () => {
  const {dom,w,live,driver,events}=liveFixture();
  try {
    w.setTimeout=callback=>setTimeout(callback,0);
    live.balanceGuard.last=134.69951021;
    live.pending={anchor:'seed',bets:[{amount:.01,target:450}],ids:new Set(['450'])};
    driver.activeButton=()=>({});driver.assertAlive=()=>{};driver.health=()=> 'OK';
    for(let i=0;i<3;i++)await live.checkBalance([{amount:.01,target:450}]);
    assert.equal(live.running,true);assert.equal(events.includes('stop'),false);
    assert.match(live.message,/Số dư hiển thị chưa đổi/);
    driver.readBalance=()=>null;await live.checkBalance([{amount:.01,target:450}]);
    assert.equal(live.running,false);assert.match(live.message,/Không đọc được số dư/);
  } finally {dom.window.close()}
});
test('Background commits snapshots after page unload and rejects older revisions', async () => {
  const listeners=[];let stored;
  vm.runInNewContext(read('background.js'), {Promise,URL,console,chrome:{
    runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener:callback=>listeners.push(callback)}},
    action:{onClicked:{addListener(){}}},sidePanel:{setPanelBehavior:async()=>{}},
    storage:{local:{get:async key=>({[key]:stored}),set:async data=>{stored=data['slide-lab-durable-live-v1'];}}},
  }});
  const listener=listeners[1],sender={id:'test',url:'https://mirror.example/vi/casino/games/slide'};
  const send=revision=>new Promise(resolve=>listener({type:'slide-persist-session',session:{schema:1,savedAt:revision,origin:'https://mirror.example',engine:{config:defaults()},state:{betRounds:revision}}},sender,resolve));
  const [newer,older]=await Promise.all([send(4),send(3)]);
  assert.equal(newer.ok,true);assert.equal(older.ok,true);assert.equal(stored.state.betRounds,4);
});
test('Legacy checkpoint overlay is removed without touching extension storage', () => {
 let removed=false;
 vm.runInNewContext(read('progress-checkpoint-view.js'),{document:{getElementById:id=>{assert.equal(id,'slide-progress-checkpoint-banner');return {remove:()=>{removed=true}}}}});
 assert.equal(removed,true);
 vm.runInNewContext(read('progress-checkpoint-view.js'),{document:{getElementById:()=>null}});
});

test('Stale loaded marker triggers fresh script injection and requires a live versioned ping', async () => {
  const listeners=[],injected=[];let fresh=false;
  vm.runInNewContext(read('background.js'),{Promise,URL,console,chrome:{
    runtime:{id:'test',getURL:path=>'chrome-extension://test/'+path,onMessage:{addListener:callback=>listeners.push(callback)}},
    action:{onClicked:{addListener(){}}},sidePanel:{setPanelBehavior:async()=>{}},
    tabs:{sendMessage:async()=>{if(!fresh)throw Error('Receiving end does not exist');return {ok:true,version:'1.0.50'};}},
    scripting:{executeScript:async options=>{if(options.func)return [{result:{slide:true,dom:true,loaded:true}}];injected.push(options.files);fresh=true;return [];}}
  }});
  const result=await new Promise(resolve=>listeners.at(-1)({type:'slide-ensure-connection',tabId:8},{id:'test',url:'chrome-extension://test/sidepanel.html'},resolve));
  assert.equal(result.ok,true);assert.equal(injected.length,1);
  assert.equal(injected[0][0],'content-lifecycle.js');assert.ok(injected[0].includes('content.js'));
});


test('Progress UI estimates net win using the current step target and shows zero for WAIT', async () => {
  const {dom,w,live}=liveFixture();
  try {
    w.eval(read('app.js'));await flush();
    const snapshot=live.snapshot();snapshot.running=false;
    snapshot.progress=snapshot.progress.slice(0,1).map(p=>({...p,amount:.001,actualTarget:1660,action:'BET'}));
    const send=()=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{channel:'slide-lab',type:'live-state',data:structuredClone(snapshot)}}));
    send();await flush();
    assert.equal(w.document.querySelector('.win-profit-estimate').textContent,'+1.659');
    snapshot.progress[0].action='WAIT';send();await flush();
    assert.equal(w.document.querySelector('.win-profit-estimate').textContent,'+0');
  }finally{dom.window.close()}
});

test('Progress table sorts numerically, calculates W/L rate and keeps expanded details by ID', async () => {
  const {dom,w,live}=liveFixture();
  try {
    w.eval(read('app.js'));await flush();
    const snapshot=live.snapshot(),base=snapshot.progress[0];snapshot.count=1480;
    snapshot.progress=[{...base,id:'a',target:1660,wins:0,losses:0},{...base,id:'b',target:113,wins:1,losses:3},{...base,id:'c',target:90,wins:9,losses:1469}];
    const send=()=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{channel:'slide-lab',type:'live-state',data:structuredClone(snapshot)}}));
    send();await flush();
    assert.deepEqual([...w.document.querySelectorAll('.progress-target')].map(n=>n.textContent),['x90','x113','x1,660']);
    assert.deepEqual([...w.document.querySelectorAll('.progress-rate')].map(n=>n.textContent),['1.814','0.027','—']);
    assert.equal(w.document.querySelector('.progress-wl').textContent,'W 9L 1469');
    const expanded=w.document.querySelectorAll('.progress-table-item')[1];expanded.open=true;
    snapshot.progress[1].target=80;send();await flush();
    assert.equal(w.document.querySelector('.progress-table-item'),expanded);assert.equal(expanded.open,true);
    assert.deepEqual(snapshot.progress.map(p=>p.id),['a','b','c']);
  }finally{dom.window.close()}
});

test('Live loss table updates after losses and wins, retains maximum and ignores WAIT rounds', async () => {
  const {dom,w,live}=liveFixture();
  try {
    w.eval(read('app.js'));await flush();
    const send=()=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{channel:'slide-lab',type:'live-state',data:structuredClone(live.snapshot())}}));
    live.engine.consume(round('loss1',1));live.engine.consume(round('loss2',1));send();await flush();
    assert.equal(w.document.querySelector('.loss-streak-current').textContent,'2');
    assert.equal(w.document.querySelector('.loss-streak-max').textContent,'2');
    live.engine.consume(round('win1',450));send();await flush();
    assert.equal(w.document.querySelector('.loss-streak-current').textContent,'0');
    assert.equal(w.document.querySelector('.loss-streak-max').textContent,'2');
    const config=structuredClone(live.engine.config);config.targets[0].steps[0].action='WAIT';live.engine.updateConfig(config);
    live.engine.consume(round('wait1',1));send();await flush();
    assert.equal(w.document.querySelector('.loss-streak-current').textContent,'0');
    assert.equal(w.document.querySelector('.loss-streak-max').textContent,'2');
    const sections=[...w.document.querySelectorAll('section')];
    assert.ok(sections.indexOf(w.document.querySelector('.live-loss-analysis'))>sections.indexOf(w.document.querySelector('.progress-table')));
  }finally{dom.window.close()}
});

test('Idle UI shows observed wallet without creating an Auto session', async () => {
  const {dom,w}=page();
  try {
    w.eval(read('app.js')); await flush();
    const send=(type,data)=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{channel:'slide-lab',type,data}}));
    send('auto-wallet',{verified:true,balance:134.58551021}); await flush();
    assert.match(w.document.body.textContent,/134\.58551021/);
    assert.match(w.document.body.textContent,/AUTO ĐÃ DỪNG/);
    send('auto-wallet',{verified:false,balance:null}); await flush();
    assert.match(w.document.body.textContent,/Chưa đọc/);
  } finally {dom.window.close();}
});


test('Dashboard tools panels survive tab changes while session progress stays intact', async () => {
 const {dom,w,live}=liveFixture();
 try {
  w.eval(read('app.js'));await flush();
  w.eval(read('tools-layout.js'));w.eval(read('wallet-status.js'));w.eval(read('recovery-view.js'));
  const state=live.snapshot();state.betRounds=1480;state.profit=-20.02;
  w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{channel:'slide-lab',type:'live-state',data:structuredClone(state)}}));await flush();
  assert.match(w.document.querySelector('.live-round-count').textContent,/1480/);
  const wallet=w.document.getElementById('slide-wallet-details'),recovery=w.document.getElementById('slide-recovery-details');
  assert.equal(wallet.parentElement.id,'slide-tools-parking');
  const nav=()=>[...w.document.querySelectorAll('.main-nav button')];
  assert.deepEqual(nav().map(n=>n.textContent),['Cược','Thống kê','Công cụ']);
  for(let i=0;i<3;i++) {
   nav()[2].click();await flush();
   assert.equal(wallet.parentElement.id,'slide-tools-overview');assert.equal(recovery.parentElement.id,'slide-tools-overview');assert.ok(!w.document.body.textContent.includes('Cài và sử dụng'));
   assert.equal(w.document.querySelector('.real-control'),null);
   nav()[1].click();await flush();assert.equal(wallet.parentElement.id,'slide-tools-parking');
   assert.ok([...w.document.querySelectorAll('.secondary-nav button')].some(n=>n.textContent==='Lịch sử'));
   nav()[0].click();await flush();
   assert.equal(w.document.querySelector('.live-round-count').textContent,'1480 vòng');
   assert.equal(w.document.querySelectorAll('#slide-wallet-details').length,1);
   assert.ok(w.document.querySelector('.progress-table'));
  }
 }finally{dom.window.close()}
});


test('Round archive keeps 50,000 unique rounds through worker restarts and marks feed gaps', async () => {
 const key='slide-lab-round-archive-v1';let storage={};
 const install=()=>{let listener;vm.runInNewContext(read('round-archive.js'),{URL,Date,Promise,Set,Number,Array,chrome:{runtime:{id:'test',onMessage:{addListener:fn=>listener=fn}},storage:{local:{get:async()=>structuredClone(storage),set:async data=>Object.assign(storage,structuredClone(data))}}}});return listener};
 let listener=install();const sender={id:'test',url:'https://mirror.example/vi/casino/games/slide'};
 const send=(rounds,gap=false)=>new Promise(resolve=>listener({type:'slide-archive-rounds',rounds,gap},sender,resolve));
 storage['slide-lab-durable-live-v1']={observed:[round('legacy',90)]};
 await send([round('first',2)]);assert.equal(storage[key].rows[0][0],'legacy');
 storage[key]={schema:1,segment:0,rows:Array.from({length:49995},(_,i)=>['r'+i,1,i])};
 await Promise.all([send(Array.from({length:10},(_,i)=>round('new'+i,2))),send([round('new9',2)])]);
 assert.equal(storage[key].rows.length,50000);assert.equal(storage[key].rows[0][0],'r5');
 assert.equal(new Set(storage[key].rows.map(r=>r[0])).size,50000);
 listener=install();await send([round('new9',2),round('after-restart',3)]);
 assert.equal(storage[key].rows.at(-1)[0],'after-restart');assert.equal(storage[key].rows.at(-1)[3],0);
 await send([round('gap-result',4)],true);assert.equal(storage[key].rows.at(-1)[3],1);
 const before=storage[key].rows.length;const rejected=await new Promise(resolve=>listener({type:'slide-archive-rounds',rounds:[round('bad',5)]},{id:'test',url:'https://example.com/'},resolve));
 assert.equal(rejected.ok,false);assert.equal(storage[key].rows.length,before);
});

test('History UI pages all 50,000 rounds without rendering the whole archive and survives tabs', async () => {
 const {dom,w}=page();
 try {
  const key='slide-lab-round-archive-v1',rows=Array.from({length:50000},(_,i)=>['r'+i,i%1000+1,i]);
  w.chrome.storage.local.get=async value=>value===key?{[key]:{rows}}:{};
  w.eval(read('app.js'));await flush();w.eval(read('round-history.js'));await flush();
  assert.equal(w.document.querySelectorAll('.recent-rounds>span').length,20);
  const section=w.document.querySelector('.round-history'),details=section.querySelector('details');details.open=true;details.dispatchEvent(new w.Event('toggle'));
  assert.equal(section.querySelectorAll('.archive-rounds>span').length,100);
  assert.match(section.querySelector('.history-pages').textContent,/500/);
  section.querySelector('[data-page="last"]').click();
  assert.equal(section.querySelector('.archive-rounds>span:last-child').title.split('\n')[0],'ID: r0');
  const filter=section.querySelector('[aria-label="Lọc hệ số tối thiểu"]');filter.value='900';filter.dispatchEvent(new w.Event('change'));
  assert.ok([...section.querySelectorAll('.archive-rounds>span')].every(el=>Number(el.textContent.replaceAll(',','').replace('×',''))>=900));
  w.document.querySelectorAll('.main-nav button')[2].click();await flush();
  w.document.querySelectorAll('.main-nav button')[0].click();await flush();
  assert.equal(w.document.querySelector('.round-history'),section);
  assert.match(section.querySelector('.archive-count').textContent,/50.000/);
 }finally{dom.window.close()}
});


test('Widget choices and order persist independently from live session progress', async () => {
 const {dom,w,live}=liveFixture();
 try {
  let stored;
  w.chrome.storage.local.set=async data=>{stored=data['slide-lab-widget-layout-v1']||stored};
  w.eval(read('app.js'));await flush();w.eval(read('dashboard-widgets.js'));await flush();
  assert.ok(w.document.querySelector('[aria-label="Tùy chỉnh widget"]'));
  // Settings controls are local presentation actions, never betting messages.
  let messages=0;w.parent.postMessage=()=>messages++;
  const check=w.document.querySelector('[data-widget="loss"]');
  // Populate the settings dialog using its native opening action.
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
  w.document.querySelector('.widget-customize').click();
  const loss=w.document.querySelector('[data-widget="loss"]');loss.checked=false;loss.dispatchEvent(new w.Event('change'));await flush();
  assert.ok(stored.hidden.includes('loss'));
  w.document.querySelector('[aria-label="Đưa lên: Kết quả & lịch sử"]').click();await flush();
  assert.deepEqual(Array.from(stored.order),['progress','history','loss']);
  assert.equal(live.betRounds,0);assert.equal(messages,0);
  const persisted=JSON.parse(w.localStorage.getItem('slide-lab-widget-layout-v1'));assert.deepEqual(persisted,JSON.parse(JSON.stringify(stored)));
  w.document.querySelector('.widget-default').click();await flush();
  assert.equal(stored.hidden.length,0);assert.deepEqual(Array.from(stored.order),['progress','loss','history']);
 }finally{dom.window.close()}
});


test('State icon colors follow idle, running, pausing, paused and connection recovery', async () => {
 const {dom,w}=page();
 try {
  w.eval(read('app.js'));await flush();w.eval(read('status-icons.js'));
  const send=(type,data)=>w.dispatchEvent(new w.MessageEvent('message',{source:w,origin:w.location.origin,data:{channel:'slide-lab',type,data}}));
  const status=()=>w.document.querySelector('.slide-mascot').dataset.status;
  assert.equal(status(),'idle');
  send('live-state',{running:true,progress:[]});await flush();assert.equal(status(),'running');
  send('live-state',{running:true,pausing:true,progress:[]});await flush();assert.equal(status(),'paused');
  send('live-state',{running:false,paused:true,progress:[]});await flush();assert.equal(status(),'paused');
  send('live-state',{running:false,message:'Error: Không đọc được số dư',progress:[]});await flush();assert.equal(status(),'error');
  send('live-state',{running:true,progress:[]});send('status',{ok:false});await flush();assert.equal(status(),'error');
  send('status',{ok:true});await flush();assert.equal(status(),'running');
  send('live-state',{running:false,message:'Đã dừng bởi người dùng',progress:[]});await flush();assert.equal(status(),'idle');
  assert.equal(w.SlideStatus.states.paused.color,'#f4c35b');
 }finally{dom.window.close()}
});


test('Chrome toolbar receives per-tab state icons and rejects unrelated senders', async () => {
 let listener;const icons=[];
 class Canvas {getContext(){let color,fill;return {set fillStyle(value){fill=value},beginPath(){},roundRect(){},fill(){color=fill},fillText(){},getImageData(){return {color}}}}}
 vm.runInNewContext(read('status-icons.js'),{OffscreenCanvas:Canvas,URL,Map,Number,chrome:{action:{setIcon:async info=>icons.push(info),setTitle:async()=>{}},runtime:{id:'test',onMessage:{addListener:fn=>listener=fn}}}});
 await flush();assert.equal(icons[0].imageData.color,'#8993a5');
 const sender={id:'test',url:'https://stake1073.com/vi/casino/games/slide',tab:{id:8}};
 const send=(kind,data)=>new Promise(resolve=>listener({type:'slide-icon-status',kind,data},sender,resolve));
 await send('live-state',{running:true});assert.equal(icons.at(-1).imageData.color,'#39d99b');
 await send('live-state',{running:true,pausing:true});assert.equal(icons.at(-1).imageData.color,'#f4c35b');
 await send('status',{ok:false});assert.equal(icons.at(-1).imageData.color,'#f06470');
 await send('status',{ok:true});assert.equal(icons.at(-1).imageData.color,'#f4c35b');
 await send('live-state',{running:true});assert.equal(icons.at(-1).imageData.color,'#39d99b');assert.equal(icons.at(-1).tabId,8);
 const count=icons.length;await send('live-state',{running:true});assert.equal(icons.length,count);
 const rejected=await new Promise(resolve=>listener({type:'slide-icon-status',kind:'status',data:{ok:false}},{...sender,url:'https://example.com/'},resolve));assert.equal(rejected.ok,false);assert.equal(icons.length,count);
});
