import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const context={Date};vm.runInNewContext(readFileSync(new URL('../limbo-tool/daily-history.js',import.meta.url),'utf8'),context);const daily=context.LimboDaily;
test('Vietnam day changes at 17:00 UTC regardless of execution host timezone',()=>{
 assert.equal(daily.date(Date.parse('2026-10-17T16:59:59Z')),'2026-10-17');assert.equal(daily.date(Date.parse('2026-10-17T17:00:00Z')),'2026-10-18');
});
test('Many tabs and reloads share a daily total; currencies and per-tab detail stay separate',()=>{
 const time=Date.parse('2026-10-17T10:00:00Z');let row;
 for(const [id,tab,currency,amount,payout]of [['bet-one',1,'usdt',.001,0],['bet-two',2,'usdt',.002,.7],['bet-three',1,'btc',.00000001,0]])row=daily.apply(row,{kind:'bet',id,tab,currency,amount,payout,time});
 assert.equal(row.currencies.USDT.volume,.003);assert.equal(row.currencies.USDT.profit,.697);assert.equal(row.currencies.USDT.bets,2);assert.equal(row.tabs[1].currencies.USDT.volume,.001);assert.equal(row.currencies.BTC.volume,.00000001);
 row=daily.apply(row,{kind:'event',tab:1,name:'F5',time:time+1000,issue:true});assert.equal(row.issues,1);assert.equal(row.events,1);assert.equal(row.currencies.USDT.bets,2);
});
test('Invalid and truncated monetary records cannot be counted as confirmed bets',()=>{
 for(const changes of [{id:'bad'},{amount:0},{amount:NaN},{payout:-1},{currency:'USD T'}])assert.equal(daily.valid({kind:'bet',id:'valid-id',currency:'usdt',amount:.001,payout:0,...changes}),false);
});
test('Balance candles retain observed OHLC without summing wallet amounts across tabs',()=>{
 const time=Date.parse('2026-10-17T10:00:00Z');let candle;
 for(const [amount,offset]of [[250,0],[250,1000],[245,2000],[255,3000],[251,4000]])candle=daily.candle(candle,{time:time+offset,amount,host:'stake.example',currency:'USDT'});
 assert.equal(candle.open,250);assert.equal(candle.low,245);assert.equal(candle.high,255);assert.equal(candle.close,251);assert.equal(candle.samples,5);
 candle=daily.candle(candle,{time:time-1,amount:249,host:'stake.example',currency:'USDT'});assert.equal(candle.open,249);assert.equal(candle.close,251);
});
