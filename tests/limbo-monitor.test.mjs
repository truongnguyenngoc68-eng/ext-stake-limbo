import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=n=>readFileSync(new URL('../limbo-tool/'+n,import.meta.url),'utf8');
test('Monitor reads all tabs, isolates disconnected tabs and opening a card sends no betting action',async()=>{
 const dom=new JSDOM(read('options.html'),{runScripts:'outside-only'}),w=dom.window,calls=[];
 w.setInterval=()=>0;
 const event={addListener(){}};
 w.LimboDomains={patterns:async()=>['https://stake1022.com/*']};
 let opened,focused;w.chrome={windows:{update:async id=>focused=id},tabs:{update:async id=>opened=id,query:async()=>[1,2,3].map(id=>({id,windowId:9,active:id===1,url:'https://stake1022.com/casino/games/limbo'})),onRemoved:event,onUpdated:event,sendMessage:async(id,m)=>{
  calls.push({id,...m});
  if(m.type==='limbo-monitor'){
   if(id===2)throw Error('Disconnected');
   return {state:id===1?'RUNNING':'OFF',cycles:4,config:{target:250},amount:.0004,status:'<b>status</b>',wallet:{currency:'usdt',displayedStats:{profit:-.1,volume:2}}};
  }
  return {html:'<section><input id="amount"><output></output><button id="toggle"></button></section>',config:{amount:.0004},ready:true,status:'Ready',toggle:'Stop'};
 }},storage:{onChanged:event},runtime:{getManifest:()=>({version:'1.5.2'}),openOptionsPage(){}}};
 w.eval(read('options-monitor.js'));w.eval('void updateMonitor()');await new Promise(r=>setTimeout(r,30));
 assert.equal(w.document.querySelectorAll('.tab-card').length,3);
 assert.match(w.document.getElementById('monitorCount').textContent,/3 tab · 1 đang chạy/);
 assert.match(w.document.querySelectorAll('.tab-card')[1].textContent,/Mất kết nối/);
 assert.equal(w.document.querySelector('.card-status b'),null);
 w.document.querySelectorAll('.card-head button')[2].click();await new Promise(r=>setTimeout(r,30));
 assert.equal(opened,3);assert.equal(focused,9);assert.equal(w.document.querySelector('#app'),null);
 assert.ok(calls.every(m=>!m.action));
 dom.window.close();
});

test('Monitor is the default white-page view and navigation preserves Telegram/history',async()=>{
 const dom=new JSDOM(read('options.html'),{runScripts:'outside-only',url:'https://extension.test/options.html'}),w=dom.window;
 w.setInterval=()=>0;
 w.chrome={storage:{local:{get:async()=>({})}},runtime:{getManifest:()=>({version:'1.5.3'})}};
 w.eval(read('domains.js'));w.eval(read('telegram-format.js'));w.eval(read('options.js'));
 assert.equal(w.document.getElementById('monitor').hidden,false);
 assert.equal(w.document.getElementById('settings').hidden,true);
 w.document.getElementById('settingsTab').click();
 assert.equal(w.document.getElementById('settings').hidden,false);
 assert.equal(w.document.getElementById('monitor').hidden,true);
 w.document.getElementById('historyTab').click();
 assert.equal(w.document.getElementById('history').hidden,false);
 w.document.getElementById('monitorTab').click();
 assert.equal(w.document.getElementById('monitor').hidden,false);
 assert.equal(w.document.getElementById('history').hidden,true);
 assert.ok(!read('panel.html').includes('id="monitorCards"'));
 await new Promise(r=>setImmediate(r));dom.window.close();
});
