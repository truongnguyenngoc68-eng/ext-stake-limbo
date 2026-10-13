import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../limbo-tool/'+name,import.meta.url),'utf8');
function model(){const context={Date,structuredClone};vm.runInNewContext(read('stats.js'),context);return context.LimboStats;}
const start=(id,currency='usdt')=>({kind:'start',id,currency,tp:1,sl:1});
function bet(model,state,{id='bet-123',cycle='cycle-1',amount=.5,payout=0,currency='usdt'}={}){
 state=model.apply(state,{kind:'request',cycle});return model.apply(state,{kind:'bet',id,cycle,amount,payout,currency});
}
test('Volume is sum of confirmed stakes, not payouts, and TP volume is per complete cycle',()=>{
 const m=model();let s=m.apply(m.fresh(),start('cycle-1'));s=bet(m,s,{amount:.5,payout:1.7});s=m.apply(s,{kind:'end',id:'cycle-1',reason:'complete'});
 const t=m.summary(s).totals.usdt;assert.equal(t.volume,.5);assert.equal(t.profit,1.2);assert.equal(t.tp,1);assert.equal(t.sl,0);assert.equal(t.tpVolume,.5);assert.equal(t.last.outcome,'tp');
});
test('Two loss bets classify SL once despite repeated cycle-end messages',()=>{
 const m=model();let s=m.apply(m.fresh(),start('cycle-1'));s=bet(m,s,{id:'loss-001',amount:.6});s=bet(m,s,{id:'loss-002',amount:.5});
 for(let i=0;i<3;i++)s=m.apply(s,{kind:'end',id:'cycle-1',reason:'complete'});
 const t=m.summary(s).totals.usdt;assert.equal(t.volume,1.1);assert.equal(t.sl,1);assert.equal(t.slVolume,1.1);assert.equal(t.profit,-1.1);
});
test('Duplicate bet IDs across tabs never double count volume',()=>{
 const m=model();let s=bet(m,m.fresh(),{id:'shared-001',cycle:''});s=m.apply(s,{kind:'bet',id:'shared-001',amount:.5,payout:0,currency:'usdt',cycle:''});assert.equal(m.summary(s).totals.usdt.volume,.5);assert.equal(m.summary(s).totals.usdt.bets,1);
});
test('Currencies are separate, state survives serialization, and active cycles are not TP/SL',()=>{
 const m=model();let s=m.apply(m.fresh(),start('cycle-1'));s=bet(m,s);s=bet(m,s,{id:'btc-001',currency:'btc',cycle:'',amount:.00001});s=JSON.parse(JSON.stringify(s));const t=m.summary(s).totals;assert.equal(t.usdt.volume,.5);assert.equal(t.usdt.tp,0);assert.equal(t.usdt.sl,0);assert.equal(t.btc.volume,.00001);
});
test('Manual stop, missing responses and errors never invent TP classification',()=>{
 for(const reason of ['manual','missing','issue']){const m=model();let s=m.apply(m.fresh(),start('cycle-1'));s=bet(m,s,{payout:2});if(reason==='missing')s=m.apply(s,{kind:'request',cycle:'cycle-1'});if(reason==='issue')s=m.apply(s,{kind:'issue',cycle:'cycle-1'});s=m.apply(s,{kind:'end',id:'cycle-1',reason:reason==='manual'?'other':'complete'});const t=m.summary(s).totals.usdt;assert.equal(t.tp,0);assert.equal(t.other,1)}
});
test('Late confirmed response after end is included and can resolve a pending classification',()=>{
 const m=model();let s=m.apply(m.fresh(),start('cycle-1'));s=m.apply(s,{kind:'request',cycle:'cycle-1'});s=m.apply(s,{kind:'end',id:'cycle-1',reason:'complete'});assert.equal(m.summary(s).totals.usdt.other,1);s=m.apply(s,{kind:'bet',id:'late-123',cycle:'cycle-1',amount:.5,payout:2,currency:'usdt'});assert.equal(m.summary(s).totals.usdt.tp,1);
});
test('Invalid financial payloads are rejected without changing volume',()=>{
 for(const data of [{amount:-1,payout:0},{amount:NaN,payout:0},{amount:1,payout:Infinity},{amount:1,payout:-1},{amount:'1',payout:0}]){const m=model(),s=m.apply(m.fresh(),{kind:'bet',id:'invalid-123',currency:'usdt',...data});assert.equal(Object.keys(m.summary(s).totals).length,0)}
});
function observer(data){
 const messages=[];let calls=0;const response={clone:()=>({json:async()=>data})},returned=Promise.resolve(response);
 const window={postMessage:m=>messages.push(m),fetch:()=>{calls++;return returned}};
 const context={window,location:{origin:'https://stake1022.com',href:'https://stake1022.com/vi/casino/games/limbo'},document:{documentElement:{getAttribute:()=> 'cycle-1'}},URL,Reflect,JSON,Number};
 vm.runInNewContext(read('bet-observer.js'),context);return {window,messages,returned,calls:()=>calls};
}
const mutation={query:'mutation Test { limboBet { id amount payout currency } }'};
test('Observer preserves original fetch result, reads only Limbo mutation, and issues no additional requests',async()=>{
 const f=observer({data:{limboBet:{id:'actual-123',amount:.001,payout:.09,currency:'usdt'}}});const returned=f.window.fetch('/_api/graphql',{body:JSON.stringify(mutation)});assert.equal(returned,f.returned);await returned;await new Promise(r=>setImmediate(r));assert.equal(f.calls(),1);assert.equal(f.messages.length,2);assert.equal(f.messages[0].event.kind,'request');assert.equal(f.messages[1].event.amount,.001);assert.equal(f.messages[1].event.payout,.09);
});
test('Observer ignores other games, non-mutations and another origin',async()=>{
 const f=observer({});f.window.fetch('/_api/graphql',{body:JSON.stringify({query:'query { limboBet { id } }'})});f.window.fetch('/_api/graphql',{body:JSON.stringify({query:'mutation { diceBet { id } }'})});f.window.fetch('https://other.example/graphql',{body:JSON.stringify(mutation)});await new Promise(r=>setImmediate(r));assert.equal(f.messages.length,0);
});
test('Unsupported response shape is visibly marked as incomplete rather than estimated',async()=>{
 const f=observer({data:{limboBet:{id:'partial-123',amount:.001,currency:'usdt'}}});await f.window.fetch('/_api/graphql',{body:JSON.stringify(mutation)});await new Promise(r=>setImmediate(r));assert.equal(f.messages.at(-1).event.kind,'issue');
});
