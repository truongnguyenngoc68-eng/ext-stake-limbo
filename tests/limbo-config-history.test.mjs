import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=n=>readFileSync(new URL('../limbo-tool/'+n,import.meta.url),'utf8');
const wait=()=>new Promise(r=>setTimeout(r,20));
function fixture(db={}){
 const dom=new JSDOM(read('options.html'),{runScripts:'outside-only',url:'https://extension.test/options.html#configs'}),w=dom.window,calls=[];
 w.confirm=()=>true;w.chrome={storage:{local:{get:async k=>({[k]:structuredClone(db[k])}),set:async data=>Object.assign(db,structuredClone(data))},onChanged:{addListener(){}}},tabs:{query:async()=>[],sendMessage:async()=>calls.push('message')}};
 w.LimboDomains={patterns:async()=>[]};w.eval(read('config-library.js'));w.eval(read('config-history.js'));
 const field=k=>w.document.querySelector('#configFormPanel [name="'+k+'"]');
 const submit=()=>w.document.querySelector('#configFormPanel form').dispatchEvent(new w.Event('submit',{cancelable:true}));
 return {dom,w,db,calls,field,submit};
}
test('Create and edit saved configuration without game tabs; reopen preserves it and saving updates same item',async()=>{
 const f=fixture();try{await wait();assert.match(f.w.document.querySelector('#configList').textContent,/Chưa có cấu hình/);f.w.document.querySelector('#configNew').click();f.field('configName').value='375x của tôi';f.field('amount').value='0,0008';f.field('loss').value='0,29';f.field('target').value='375';f.submit();await wait();assert.equal(f.db.limboSavedConfigsV1.length,1);assert.equal(f.calls.length,0);assert.match(f.w.document.querySelector('#configList').textContent,/375x của tôi/);
 f.w.document.querySelector('[data-config-edit]').click();f.field('tp').value='8';f.field('sl').value='8';f.submit();await wait();assert.equal(f.db.limboSavedConfigsV1.length,1);assert.equal(f.db.limboSavedConfigsV1[0].config.tp,8);
 const reopened=fixture(f.db);try{await wait();reopened.w.document.querySelector('[data-config-edit]').click();assert.equal(reopened.field('amount').value,'0.00080000');assert.equal(reopened.field('loss').value,'0.29');assert.equal(reopened.field('tp').value,'8');}finally{reopened.dom.window.close();}
 }finally{f.dom.window.close();}
});
test('Invalid settings stay unsaved; refresh does not overwrite draft; cancel switching preserves unsaved edits',async()=>{
 const f=fixture();try{await wait();f.w.document.querySelector('#configNew').click();f.field('configName').value='Nháp';f.field('sl').value='0';f.field('sl').dispatchEvent(new f.w.Event('input',{bubbles:true}));f.submit();await wait();assert.equal(f.db.limboSavedConfigsV1,undefined);await f.w.LimboConfigHistory.refresh();assert.equal(f.field('sl').value,'0');f.w.confirm=()=>false;f.w.document.querySelector('#configNew').click();assert.equal(f.field('configName').value,'Nháp');assert.equal(f.calls.length,0);
 }finally{f.dom.window.close();}
});
