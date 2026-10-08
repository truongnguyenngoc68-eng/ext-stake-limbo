import test from 'node:test';
import assert from 'node:assert/strict';
import {Engine} from '../src/engine.ts';
import {defaults,validate} from '../src/model.ts';
import {multiplier,afterSnapshot} from '../src/adapter.ts';
const round=(id:string,value:number)=>({id,value,time:0});
function config(){const c=defaults();c.targets=c.targets.filter(t=>t.enabled);c.targets[0].target=2;c.targets[0].steps=[{amount:1,rounds:2,action:'BET'},{amount:3,rounds:1,action:'BET'}];c.bankroll=100;c.stopLoss=0;c.takeProfit=0;return c}
test('Repeat count, advance, equality win, reset after win',()=>{const e=new Engine(config());e.consume(round('1',1));assert.equal(e.next()[0].step,1);e.consume(round('2',1));assert.equal(e.next()[0].step,2);e.consume(round('3',2));assert.equal(e.profit,1);assert.equal(e.balance,101);assert.equal(e.next()[0].step,1);assert.equal(e.drawdown,2)});
test('Condition uses previous outcomes; trigger round never gets a bet',()=>{const c=config();c.targets[0].entry={enabled:true,count:2,op:'<',value:2};const e=new Engine(c);assert.equal(e.consume(round('1',1.1)).length,0);assert.equal(e.consume(round('2',1.2)).length,0);assert.equal(e.consume(round('3',3))[0].outcome,'WIN');assert.equal(e.next().length,0)});
test('Duplicate id ignored but repeated values with new ids are retained',()=>{const e=new Engine(config());e.consume(round('a',1));e.consume(round('a',5));e.consume(round('b',1));assert.equal(e.count,2);assert.equal(e.losses,2);assert.equal(e.profit,-2)});
test('Per step multiplier controls result and payout',()=>{const c=config();c.targets[0].steps[0].multiplier=10;const e=new Engine(c);assert.equal(e.consume(round('a',3))[0].outcome,'LOSS');assert.equal(e.consume(round('b',10))[0].profit,9);assert.equal(e.profit,8)});
test('WAIT advances without spending',()=>{const c=config();c.targets[0].steps[0].action='WAIT';const e=new Engine(c);e.consume(round('a',1));e.consume(round('b',5));assert.equal(e.turnover,0);assert.equal(e.next()[0].step,2)});
test('Insufficient combined funds aborts whole round',()=>{const c=config();c.bankroll=1;c.targets.push({...structuredClone(c.targets[0]),id:'second'});const e=new Engine(c);assert.equal(e.consume(round('a',5)).length,0);assert.equal(e.balance,1);assert.ok(e.halted)});
test('Fixed precision and stop loss checked at settled round',()=>{const c=config();c.stopLoss=0.03;c.targets[0].steps=[{amount:0.01,rounds:20,action:'BET'}];const e=new Engine(c);e.consume(round('a',1));e.consume(round('b',1));e.consume(round('c',1));assert.equal(e.profit,-0.03);assert.equal(e.halted,'Đạt stop loss')});
test('Only executed targets advance in live settlement',()=>{const e=new Engine(config());e.consume(round('a',1),new Set());assert.equal(e.profit,0);assert.equal(e.positions['450'].used,0);e.consume(round('b',2),new Set(['450']));assert.equal(e.profit,1)});
test('Reject bad configuration',()=>{const c=config();c.targets[0].steps[0].rounds=1.5;assert.throws(()=>validate(c))});
test('Localized multipliers and gap detection',()=>{assert.equal(multiplier('1,45×'),1.45);assert.equal(multiplier('450.00x'),450);assert.ok(Number.isNaN(multiplier('foo')));const a=round('a',1);const b=round('b',1);assert.equal(afterSnapshot([a],[a,b]).rounds[0].id,'b');assert.equal(afterSnapshot([a],[b]).kind,'gap')});

test('Four million target pays at fixed precision',()=>{const c=defaults();c.targets=c.targets.filter(t=>t.enabled);c.targets[0].target=4000000;c.targets[0].steps=[{amount:.001,rounds:100,action:'BET'}];c.stopLoss=0;c.takeProfit=0;const e=new Engine(c);e.consume({id:'four-million',value:4000000,time:1});assert.equal(e.profit,3999.999);assert.equal(e.wins,1)});

test('Duplicating a ladder keeps independent nested state and leaves the new copy disabled',async()=>{
 const {duplicateTarget}=await import('../src/model.ts');const c=defaults();const source=c.targets[1];source.steps[0].amount=.00100001;source.steps[0].multiplier=4000000;source.entry.enabled=true;
 const copy=duplicateTarget(source,'copy');assert.equal(copy.enabled,false);assert.equal(copy.steps[0].amount,.00100001);assert.equal(copy.steps[0].multiplier,4000000);assert.equal(copy.entry.enabled,true);
 copy.steps[0].amount=.003;copy.entry.count=42;assert.equal(source.steps[0].amount,.00100001);assert.notEqual(source.entry.count,42);c.targets.push(copy);validate(c);
});
