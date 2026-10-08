import test from 'node:test';
import assert from 'node:assert/strict';
import {roundSignals,telegramDefaults,validateTelegram} from '../src/signals.ts';
const r=(id:string,value:number)=>({id,value,time:1});
test('Big hit is compact and gap counts from last matching round',()=>{const c=telegramDefaults();const events=roundSignals(r('now',500),[r('old',100),r('a',1),r('b',1)],c.rules);const hit=events.find(e=>e.kind==='hit')!;assert.equal(hit.text,'🔔 [STAKE] BIG HIT\nx500 · sau 3 vòng · ngưỡng ≥x90');assert.ok(events.every(e=>e.text.length<300))});
test('Initial observed gap is marked as a lower bound',()=>{const event=roundSignals(r('now',500),[r('a',1)],telegramDefaults().rules)[0];assert.ok(event.text.includes('≥2 vòng'))});
test('Entry signal fires once on false to true transition',()=>{const c=telegramDefaults();c.rules.entry={enabled:true,count:2,op:'<',value:2};assert.equal(roundSignals(r('b',1),[r('a',1)],c.rules).filter(s=>s.kind==='entry').length,1);assert.equal(roundSignals(r('c',1),[r('a',1),r('b',1)],c.rules).filter(s=>s.kind==='entry').length,0)});
test('Enabled Telegram requires valid credentials and recipient; defaults contain no secrets',()=>{const c=telegramDefaults();assert.equal(c.token,'');assert.equal(c.chatId,'');validateTelegram(c);c.enabled=true;assert.throws(()=>validateTelegram(c));c.token='123456:'+ 'A'.repeat(30);c.chatId='-100123456789';validateTelegram(c)});
