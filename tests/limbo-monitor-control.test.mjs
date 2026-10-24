import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=n=>readFileSync(new URL('../limbo-tool/'+n,import.meta.url),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,20));
function fixture(){
 const dom=new JSDOM(read('options.html'),{runScripts:'outside-only'}),w=dom.window,calls=[],db={},states=new Map();
 const defaults={amount:.001,tp:10,sl:10,target:325,limit:0,winMode:'reset',win:0,lossMode:'increase',loss:.34,reload:0};
 for(const id of [1,2])states.set(id,{ready:true,state:'OFF',native:{state:'IDLE'},observerVersion:'1.6.0',config:{...defaults},wallet:{currency:'usdt',displayedStats:{volume:1,profit:2}}});
 w.setInterval=()=>0;w.confirm=()=>true;w.alert=()=>{};
 w.LimboDomains={patterns:async()=>['https://stake1022.com/*']};
 w.chrome={runtime:{getManifest:()=>({version:'1.6.0'})},storage:{local:{get:async k=>({[k]:db[k]}),set:async data=>Object.assign(db,structuredClone(data))},onChanged:{addListener(){}}},tabs:{query:async()=>[1,2].map(id=>({id,url:'https://stake1022.com/casino/games/limbo'})),sendMessage:async(id,m)=>{calls.push({id,...m});const data=states.get(id);if(m.type==='limbo-control'){if(m.action==='save')data.config={...m.config};if(m.action==='start')data.state='PREPARE';if(m.action==='stop')data.state='OFF';return {ok:true,config:data.config};}return data;}}};
 w.eval(read('config-library.js'));w.eval(read('options-monitor.js'));
 return {dom,w,states,calls,db,refresh:()=>w.eval('updateMonitor()'),edit:id=>w.document.querySelector(`[data-tab-id="${id}"] [data-control="edit"]`).click(),field:k=>w.document.querySelector(`[name="${k}"]`)};
}
test('Refresh preserves focused draft and separate tab drafts; saving targets the selected tab only',async()=>{
 const f=fixture();try{await f.refresh();f.edit(1);f.field('amount').value='0,0008';f.field('amount').dispatchEvent(new f.w.Event('input',{bubbles:true}));f.field('amount').focus();await f.refresh();assert.equal(f.field('amount').value,'0,0008');assert.equal(f.w.document.activeElement,f.field('amount'));
 f.edit(2);assert.equal(f.field('amount').value,'0.00100000');f.edit(1);assert.equal(f.field('amount').value,'0,0008');
 f.w.document.querySelector('.monitor-editor form').dispatchEvent(new f.w.Event('submit',{cancelable:true}));await wait();const writes=f.calls.filter(c=>c.type==='limbo-control');assert.equal(writes.length,1);assert.equal(writes[0].id,1);assert.equal(writes[0].config.amount,.0008);assert.equal(f.states.get(2).config.amount,.001);
 }finally{f.dom.window.close();}
});
test('Unsaved drafts block start; running and disconnected tabs lock editing; presets never send game commands',async()=>{
 const f=fixture();try{await f.refresh();f.edit(1);f.field('loss').value='0,29';f.field('loss').dispatchEvent(new f.w.Event('input',{bubbles:true}));f.w.document.querySelector('[data-tab-id="1"] [data-control="toggle"]').click();await wait();assert.equal(f.calls.filter(c=>c.type==='limbo-control').length,0);
 await f.w.eval('LimboConfigs.save("Mẫu mới",LimboConfigs.defaults)');await f.w.eval('loadPresets()');assert.equal(f.db.limboSavedConfigsV1.length,1);assert.equal(f.calls.filter(c=>c.type==='limbo-control').length,0);
 f.states.get(1).state='RUNNING';f.states.get(1).native.state='RUNNING';await f.refresh();assert.equal(f.field('amount').disabled,true);
 f.states.set(1,null);await f.refresh();assert.equal(f.field('amount').disabled,true);assert.equal(f.field('loss').value,'0,29');
 }finally{f.dom.window.close();}
});
