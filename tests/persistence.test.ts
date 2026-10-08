import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../src/engine.ts';
import {defaults} from '../src/model.ts';
import {packEngine,unpackEngine,mergeRounds,stoppedSnapshot,writeStored,readStored} from '../src/persistence.ts';
test('extension storage survives remount, without using page localStorage',async()=>{
 const values:Record<string,unknown>={};
 (globalThis as any).chrome={runtime:{id:'test'},storage:{local:{async get(key:string){return {[key]:structuredClone(values[key])}},async set(data:any){Object.assign(values,structuredClone(data))}}}};
 try{await writeStored('settings',{amount:0.001});assert.deepEqual(await readStored('settings'),{amount:0.001})}finally{delete (globalThis as any).chrome}
});
test('paper engine restores exact money, positions and deduplication',()=>{
 const config=defaults();config.stopLoss=0;config.takeProfit=0;
 const engine=new Engine(config);engine.consume({id:'r1',value:1,time:1});
 const saved=packEngine(engine);const restored=unpackEngine(saved)!;
 assert.equal(restored.balanceUnits,engine.balanceUnits);assert.deepEqual(restored.positions,engine.positions);assert.deepEqual(restored.trades,engine.trades);assert.equal(restored.count,engine.count);
 assert.equal(typeof saved.balanceUnits,'string');assert.ok(restored.seen.has('r1'));
 const round={id:'r2',value:500,time:2};restored.consume(round);engine.consume(round);assert.deepEqual(packEngine(restored),packEngine(engine));
});
test('history merges reload snapshot without dropping archived rounds or duplicates',()=>{
 const old=[{id:'a'},{id:'b'}];assert.deepEqual(mergeRounds(old,[{id:'b'},{id:'c'}]),[{id:'a'},{id:'b'},{id:'c'}]);assert.equal(mergeRounds(Array.from({length:5000},(_,i)=>({id:String(i)})),[{id:'new'}]).length,5000);
});
test('saved live session retains results and never restores active betting',()=>{
 const restored=stoppedSnapshot({running:true,busy:true,pending:true,profit:42,trades:[{id:'t'}],progress:[{step:3,used:8,queuedStep:4}]});
 assert.equal(restored.running,false);assert.equal(restored.pending,false);assert.equal(restored.profit,42);assert.equal(restored.progress[0].step,3);assert.equal(restored.progress[0].queuedStep,null);
});
