import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=n=>readFileSync(new URL('../limbo-tool/'+n,import.meta.url),'utf8');
test('Monitor reads all tabs, isolates disconnected tabs and selecting a card sends no action',async()=>{
 const dom=new JSDOM(read('panel.html'),{runScripts:'outside-only'}),w=dom.window,calls=[];
 w.setInterval=()=>0;
 const event={addListener(){}};
 w.LimboDomains={patterns:async()=>['https://stake1022.com/*']};
 w.chrome={tabs:{query:async()=>[1,2,3].map(id=>({id,active:id===1,url:'https://stake1022.com/casino/games/limbo'})),onRemoved:event,onUpdated:event,sendMessage:async(id,m)=>{
  calls.push({id,...m});
  if(m.type==='limbo-monitor'){
   if(id===2)throw Error('Disconnected');
   return {state:id===1?'RUNNING':'OFF',cycles:4,config:{target:250},amount:.0004,status:'<b>status</b>',wallet:{currency:'usdt',displayedStats:{profit:-.1,volume:2}}};
  }
  return {html:'<section><input id="amount"><output></output><button id="toggle"></button></section>',config:{amount:.0004},ready:true,status:'Ready',toggle:'Stop'};
 }},storage:{onChanged:event},runtime:{getManifest:()=>({version:'1.5.2'}),openOptionsPage(){}}};
 w.eval(read('panel.js'));await new Promise(r=>setTimeout(r,30));
 assert.equal(w.document.querySelectorAll('.tab-card').length,3);
 assert.match(w.document.getElementById('monitorCount').textContent,/3 tab · 1 đang chạy/);
 assert.match(w.document.querySelectorAll('.tab-card')[1].textContent,/Mất kết nối/);
 assert.equal(w.document.querySelector('.card-status b'),null);
 w.document.querySelectorAll('.card-head button')[2].click();await new Promise(r=>setTimeout(r,30));
 assert.equal(w.document.getElementById('tabs').value,'3');
 assert.ok(calls.every(m=>!m.action));
 dom.window.close();
});
