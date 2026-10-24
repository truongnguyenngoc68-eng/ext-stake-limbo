import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../limbo-tool/health-monitor.js',import.meta.url),'utf8');
function fixture(){
 let now=100000,fail=false,response;
 const db={telegram:{enabled:true,stopAlerts:true,token:'test',chat:'1'}},sent=[],listeners={};
 const event=k=>({addListener:fn=>listeners[k]=fn});
 class Clock extends Date{static now(){return now;}}
 const chrome={runtime:{id:'ext',onInstalled:event('install'),onStartup:event('startup'),onMessage:event('message')},alarms:{create:async()=>{},onAlarm:event('alarm')},tabs:{onRemoved:event('removed'),onUpdated:event('updated'),sendMessage:async()=>{if(!response)throw Error('no connection');return response;}},storage:{local:{get:async k=>({[k]:structuredClone(db[k])}),set:async o=>Object.assign(db,structuredClone(o))}}};
 vm.runInNewContext(source,{chrome,URL,Date:Clock,AbortSignal,Promise,setTimeout:()=>0,LimboDomains:{validUrl:()=>true},LimboTelegram:{settings:t=>t},LimboLog:{emit(){}},fetch:async(_url,opts)=>{if(fail)throw Error('offline');sent.push(JSON.parse(opts.body).text);return {ok:true,json:async()=>({ok:true})};}});
 const sender={id:'ext',frameId:0,url:'https://stake1022.com/casino/games/limbo',tab:{id:7,url:'https://stake1022.com/casino/games/limbo'}};
 return {db,sent,listeners,advance:ms=>now+=ms,fail:v=>fail=v,response:v=>response=v,health:(s,from=sender)=>new Promise(resolve=>{const accepted=listeners.message({type:'limbo-health',health:{active:true,state:'RUNNING',online:true,lastProgress:now,...s}},from,resolve);if(!accepted)resolve();})};
}
test('Stop reports exact reason once and persists across worker state',async()=>{
 const f=fixture();await f.health({});await f.health({active:false,reason:'Không đủ số dư'});await f.health({active:false,reason:'Không đủ số dư'});
 assert.equal(f.sent.length,1);assert.match(f.sent[0],/Tab 7/);assert.match(f.sent[0],/Không đủ số dư/);
});
test('Offline warning is queued, deduplicated and sent after network recovery',async()=>{
 const f=fixture();await f.health({});f.fail(true);await f.health({online:false});await f.health({online:false});
 assert.equal(f.db.limboTabHealth.queue.length,1);f.fail(false);f.advance(60000);await f.health({online:true});assert.equal(f.sent.length,1);assert.match(f.sent[0],/mất kết nối mạng/);assert.equal(f.db.limboTabHealth.queue.length,0);
});
test('Unresponsive tab requires 90 seconds; polling never controls game',async()=>{
 const f=fixture();await f.health({});f.advance(60000);await f.listeners.alarm({name:'limbo-health-1m'});assert.equal(f.sent.length,0);
 f.advance(60000);await f.listeners.alarm({name:'limbo-health-1m'});await f.listeners.alarm({name:'limbo-health-1m'});assert.equal(f.sent.length,1);assert.match(f.sent[0],/Chưa xác định/);
});
test('Running UI without bet progress warns; real progress permits a new incident',async()=>{
 const f=fixture();await f.health({});f.advance(100000);await f.health({lastProgress:100000});await f.health({lastProgress:100000});assert.equal(f.sent.length,1);
 await f.health({});f.advance(100000);await f.health({lastProgress:200000});assert.equal(f.sent.length,2);
});
test('Tab close and navigation report specific causes only for active tabs',async()=>{
 const f=fixture();await f.health({});await f.listeners.updated(7,{url:'https://stake1022.com/settings'});assert.match(f.sent[0],/chuyển khỏi/);await f.listeners.removed(7);assert.equal(f.sent.length,1);
 await f.health({});await f.listeners.removed(7);assert.match(f.sent[1],/bị đóng/);
});
test('Disabled alerts and untrusted frames cannot send notifications',async()=>{
 const f=fixture();f.db.telegram.stopAlerts=false;await f.health({});await f.health({active:false});assert.equal(f.sent.length,0);
 await f.health({}, {id:'other',tab:{id:8},frameId:0});assert.equal(f.db.limboTabHealth.tabs[8],undefined);
});
