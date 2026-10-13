import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const script=readFileSync(new URL('../limbo-tool/domains.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../limbo-tool/telegram-format.js',import.meta.url),'utf8')+'\n'+readFileSync(new URL('../limbo-tool/background.js',import.meta.url),'utf8').replace(/^importScripts[^\n]+/,'');
function fixture({enabled=true,wallet=true,fail=false,stats=true,interval=3}={}){
 const listeners={},sent=[],alarms=[],stored=[];const event=name=>({addListener:fn=>listeners[name]=fn});
 const chrome={runtime:{getManifest:()=>({version:'test'}),onInstalled:event('install'),onStartup:event('startup'),onMessage:event('message'),openOptionsPage(){}},action:{onClicked:event('action')},alarms:{onAlarm:event('alarm'),create:async(...a)=>alarms.push(a),clear:async()=>{}},storage:{local:{get:async()=>({telegram:{interval,enabled,token:'123:test',chat:'456'}}),set:async s=>stored.push(s)}},tabs:{onRemoved:event('removed'),onUpdated:event('updated'),query:async()=>[1,2,3].map(id=>({id,url:'https://stake1022.com/vi/casino/games/limbo'})),sendMessage:async()=>({ok:wallet,amount:56.09855855,currency:'usdt',displayedStats:stats?{volume:0.30242226,profit:0.07194174}:null,time:Date.now()})}};
 vm.runInNewContext(script,{LimboLog:{emit(){},setSink(){}},chrome,Date,AbortSignal,structuredClone,LimboStatsStore:{read:async()=>({totals:{usdt:{volume:12.5,bets:30,tp:2,sl:1,other:0,last:{outcome:'sl',volume:3}}},issues:0})},fetch:async(url,opts)=>{sent.push(JSON.parse(opts.body));if(fail)throw Error('network');return {ok:true,json:async()=>({ok:true})}}});
 return {listeners,sent,alarms,stored};
}
test('Telegram 3-minute schedule and multi-tab deduplication',async()=>{const f=fixture();await f.listeners.install();assert.equal(f.alarms[0][1].periodInMinutes,3);assert.equal(f.alarms[0][1].delayInMinutes,3);await f.listeners.alarm({name:'limbo-balance-3m'});assert.equal(f.sent.length,1);assert.match(f.sent[0].text,/💰 56.10/);assert.match(f.sent[0].text,/Vol: \(0\.30 \+ 0\.30 \+ 0\.30\) = 0\.91/);assert.match(f.sent[0].text,/📊 3\/3/)});
test('Disabled or missing wallet prevents sending',async()=>{for(const config of [{enabled:false},{wallet:false}]){const f=fixture(config);await f.listeners.alarm({name:'limbo-balance-3m'});assert.equal(f.sent.length,0)}});
test('Network failure records status without retrying',async()=>{const f=fixture({fail:true});await f.listeners.alarm({name:'limbo-balance-3m'});assert.equal(f.sent.length,1);assert.match(f.stored.at(-1).telegramStatus,/timeout/)});

test('Missing statistics never appear as zero volume',async()=>{const f=fixture({stats:false});await f.listeners.alarm({name:'limbo-balance-3m'});assert.match(f.sent[0].text,/📊 0\/3/);assert.match(f.sent[0].text,/Thiếu 3 tab/);assert.doesNotMatch(f.sent[0].text,/Vol: 0/)});

test('Custom schedule is applied to initial delay and subsequent messages',async()=>{for(const interval of [1,5,15,60,1440]){const f=fixture({interval});await f.listeners.install();assert.equal(f.alarms[0][1].periodInMinutes,interval);assert.equal(f.alarms[0][1].delayInMinutes,interval);}});
