import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,validate,parseHistory,demo,episodes,gaps,wilson,simulate,analyze} from '../research-preview/model.mjs';
const history=values=>values.map((value,i)=>({id:String(i),value,time:i,gapBefore:false}));
test('Research data validates chronology, duplicate IDs, gaps and the exported archive formats',()=>{
 assert.equal(parseHistory({rounds:history([1,90])}).length,2);
 assert.equal(parseHistory({rows:[['a',1,1,0],['b',90,2,1]]})[1].gapBefore,true);
 assert.throws(()=>parseHistory([{id:'a',value:1,time:2},{id:'a',value:2,time:3}]));
 assert.throws(()=>parseHistory([{id:'a',value:1,time:2},{id:'b',value:2,time:1}]));
 assert.throws(()=>parseHistory([{id:'a',value:NaN,time:2}]));
});
test('Signals use only past rounds and never bridge discontinuities or overlap',()=>{
 const c=defaults();c.gap=2;c.horizon=2;
 const r=history([90,1,1,1,90,1,1,90,1]);
 const e=episodes(r,c,90);assert.equal(e.length,2);assert.equal(e[0].from,3);assert.equal(e[0].hit,true);assert.equal(e[1].from,7);
 r[4].gapBefore=true;assert.equal(episodes(r,c,90).length,1);
 assert.equal(episodes(history([1,1,1,1,1]),c,90).length,0);
});
test('Current GAP is censored after missing data; completed GAP excludes the unfinished tail',()=>{
 const r=history([90,1,1,90,1,1,1]);const g=gaps(r,90);assert.deepEqual(g.completed,[2]);assert.equal(g.current,3);
 r[5].gapBefore=true;const partial=gaps(r,90);assert.equal(partial.known,false);assert.equal(partial.current,2);
});
test('Simulation keeps simultaneous target correlation, WAIT semantics and capital accounting',()=>{
 const c=defaults();c.condition='always';c.bankroll=1;c.targets=[{id:'a',enabled:true,target:90,steps:[{amount:.002,rounds:100,action:'BET'}]},{id:'b',enabled:true,target:150,steps:[{amount:.001,rounds:100,action:'BET'}]}];
 const result=simulate(history([1,150]),c);assert.equal(result.bets,4);assert.equal(result.wins,2);assert.ok(Math.abs(result.profit-.324)<1e-8);
 c.targets=c.targets.slice(0,1);c.targets[0].steps=[{amount:.002,rounds:1,action:'WAIT'},{amount:.002,rounds:100,action:'BET'}];
 const wait=simulate(history([90,1]),c);assert.equal(wait.bets,1);assert.equal(wait.wins,0);assert.ok(Math.abs(wait.profit+.002)<1e-8);
 c.bankroll=.001;assert.equal(simulate(history([1,1]),c).halt,'Không đủ vốn cho lượt kế tiếp');
});
test('Wilson example, reproducible 50k model, chronological split and config validation',()=>{
 const ci=wilson(5,12);assert.ok(Math.abs(ci[0]-.1933)<.001);assert.ok(Math.abs(ci[1]-.6805)<.001);
 assert.equal(wilson(0,0),null);const c=defaults(),r=demo();assert.equal(r.length,50000);assert.deepEqual(demo(5),r.slice(0,5));
 assert.deepEqual(analyze(r,c,90).parts,[30000,10000,10000]);c.targets[0].steps[0].rounds=0;assert.throws(()=>validate(c));
});
