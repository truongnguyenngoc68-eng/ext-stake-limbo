import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
const code=readFileSync(new URL('../limbo-tool/config-library.js',import.meta.url),'utf8');
function fixture(db={}){const context={crypto:webcrypto,chrome:{storage:{local:{get:async k=>({[k]:structuredClone(db[k])}),set:async data=>Object.assign(db,structuredClone(data))}}}};vm.runInNewContext(code,context);return {lib:context.LimboConfigs,db};}
test('Saved configurations survive reopen, serialize writes, rename, update and delete',async()=>{
 const {lib,db}=fixture();await Promise.all([lib.save('325x',lib.defaults),lib.save('400x',{...lib.defaults,target:400})]);
 let rows=await lib.list();assert.equal(rows.length,2);const id=rows[0].id;
 const reopened=fixture(db).lib;await reopened.rename(id,'Mẫu của tôi');await reopened.save('Đã sửa',{...lib.defaults,amount:.0008},id);
 rows=await reopened.list();assert.equal(rows[0].config.amount,.0008);assert.equal(rows[0].name,'Đã sửa');await reopened.remove(id);assert.equal((await reopened.list()).length,1);
});
test('Decimal commas work; invalid financial settings and corrupt saved data are rejected',async()=>{
 const {lib}=fixture({limboSavedConfigsV1:[{id:'bad',name:'bad',config:{}}]});assert.equal((await lib.list()).length,0);
 const config=lib.parse({...lib.defaults,amount:'0,0008',loss:'0,29'});assert.equal(config.loss,.29);assert.equal(lib.valid(config),true);
 for(const invalid of [{amount:'1e-3'},{amount:'0.000000001'},{amount:''},{sl:0},{limit:1.5},{reload:-1},{target:1},{loss:-1}])assert.equal(lib.valid(lib.parse({...lib.defaults,...invalid})),false);
 await assert.rejects(lib.save('',config));await assert.rejects(lib.save('bad',{...config,sl:0}));
});
