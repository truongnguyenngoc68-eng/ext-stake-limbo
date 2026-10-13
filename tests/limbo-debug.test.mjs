import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const read=n=>readFileSync(new URL('../limbo-tool/'+n,import.meta.url),'utf8');
test('Errors include original stack, snapshot, prior flow and nested credentials are redacted',async()=>{
 const entries=[],ctx={console:Object.fromEntries(['log','info','warn','error','debug'].map(k=>[k,()=>{}])),Date,crypto:globalThis.crypto};
 vm.runInNewContext(read('debug-log.js'),ctx);ctx.LimboLog.setSink(e=>{entries.push(e);return {ok:true}});ctx.LimboLog.setSnapshot(()=>({state:'RUNNING',serverSeed:'public-seed'}));
 ctx.LimboLog.emit('input',{token:'hidden',nested:{authorization:'hidden',amount:.001}});
 ctx.LimboLog.emit('failure',{error:new Error('actual failure'),url:'https://api.telegram.org/bot123:secret/sendMessage'},'error','trace-1');
 await new Promise(r=>setImmediate(r));
 const e=entries.at(-1);assert.match(e.data.error.stack,/actual failure/);assert.equal(e.snapshot.state,'RUNNING');assert.equal(e.snapshot.serverSeed,'public-seed');assert.equal(e.flow.at(-1).data.token,'[REDACTED]');assert.equal(e.flow.at(-1).data.nested.authorization,'[REDACTED]');assert.ok(!JSON.stringify(e).includes('123:secret'));assert.equal(e.trace,'trace-1');
 const cycle={};cycle.self=cycle;assert.equal(ctx.LimboLog.clean(cycle).self,'[Circular]');assert.match(ctx.LimboLog.clean('x'.repeat(100001)),/Truncated/);
});
test('Observer buffers early rounds, preserves fetch and socket semantics, joins traces and masks socket auth',async()=>{
 const listeners={},messages=[];let fetchCalls=0;
 class Socket{static OPEN=1;constructor(url){this.url=url;this.events={};this.sent=[]}addEventListener(k,fn){this.events[k]=fn}send(data){this.sent.push(data);return 'sent'}}
 const response={data:{limboBet:{id:'round-1',amount:.001,payout:0,currency:'usdt',seed:{clientSeed:'client',serverSeedHash:'hash',nonce:7}}}};
 const original=Promise.resolve({clone:()=>({json:async()=>response})});
 const window={addEventListener:(k,fn)=>listeners[k]=fn,postMessage:m=>messages.push(m),WebSocket:Socket,fetch:()=>{fetchCalls++;return original}};
 const location={origin:'https://stake1022.com',href:'https://stake1022.com/casino/games/limbo'};
 vm.runInNewContext(read('bet-observer.js'),{window,location,document:{documentElement:{getAttribute:()=> 'cycle'}},URL,crypto:globalThis.crypto,Date});
 const returned=window.fetch('/_api/graphql',{body:JSON.stringify({query:'mutation { limboBet { id } }',variables:{amount:.001}})});
 assert.equal(returned,original);await new Promise(r=>setImmediate(r));
 assert.equal(messages.filter(m=>m.entry).length,0);
 listeners.message({source:window,origin:location.origin,data:{type:'limbo-debug-ready-v1'}});
 const input=messages.find(m=>m.entry?.event==='bet.request').entry,output=messages.find(m=>m.entry?.event==='bet.response').entry;
 assert.equal(input.trace,output.trace);assert.equal(output.data.output.data.limboBet.seed.nonce,7);assert.equal(fetchCalls,1);
 const socket=new window.WebSocket('wss://stake1022.com/socket?token=secret');assert.ok(socket instanceof Socket);assert.equal(window.WebSocket.OPEN,1);
 assert.equal(socket.send(JSON.stringify({type:'connection_init',payload:{token:'secret',authorization:'secret'}})),'sent');
 socket.events.message({data:JSON.stringify({round:42,seed:'revealed'})});
 assert.equal(messages.find(m=>m.entry?.event==='socket.send').entry.data.payload.payload.token,'[REDACTED]');
 assert.equal(messages.find(m=>m.entry?.event==='socket.receive').entry.data.payload.seed,'revealed');
});
async function writer({fail=false}={}){
 const dom=new JSDOM(read('debug.html'),{runScripts:'outside-only'}),w=dom.window;w.setInterval=()=>0;
 let cursor=0,text='',abort=0;const events=[{id:1,event:'input'},{id:2,event:'error'}];
 const file={name:'debug.jsonl',requestPermission:async()=> 'granted',isSameEntry:async f=>f===file,getFile:async()=>({size:text.length}),createWritable:async()=>({seek:async()=>{},write:async chunk=>{if(fail)throw Error('Disk full');text+=chunk},close:async()=>{},abort:async()=>{abort++}})};
 w.LimboJournal={get:async key=>key==='file'?file:cursor,set:async(k,v)=>{if(k==='cursor')cursor=v},batch:async after=>events.filter(e=>e.id>after)};
 Object.defineProperty(w.navigator,'locks',{value:{request:async(_name,fn)=>fn()}});
 const errors=[];w.LimboLog={emit:(...args)=>errors.push(args)};w.chrome={storage:{local:{get:async()=>({})},onChanged:{addListener(){}}}};
 w.eval(read('debug-page.js'));await w.document.getElementById('resume').onclick();
 return {dom,cursor,text,abort,errors};
}
test('File writer commits cursor only after append closes',async()=>{const f=await writer();assert.equal(f.cursor,2);assert.deepEqual(f.text.trim().split('\n').map(s=>JSON.parse(s).id),[1,2]);assert.equal(f.abort,0);f.dom.window.close()});
test('Disk error stops stream, aborts write and retains journal cursor for retry',async()=>{const f=await writer({fail:true});assert.equal(f.cursor,0);assert.equal(f.abort,1);assert.match(f.dom.window.document.getElementById('status').textContent,/Disk full/);assert.equal(f.errors[0][0],'file.write.error');f.dom.window.close()});

test('Logger retries unacknowledged events in order without letting transport failure escape',async()=>{
 const entries=[],timers=[];let down=true;
 const ctx={console:Object.fromEntries(['log','info','warn','error','debug'].map(k=>[k,()=>{}])),Date,crypto:globalThis.crypto,setTimeout:fn=>{timers.push(fn);return 1},chrome:{runtime:{sendMessage:async m=>{if(down)throw Error('Worker unavailable');entries.push(m.entry);return {ok:true}}}}};
 vm.runInNewContext(read('debug-log.js'),ctx);ctx.LimboLog.emit('action.input',{amount:1});
 await new Promise(r=>setImmediate(r));assert.match(ctx.__limboLogFailure,/Worker unavailable/);assert.equal(entries.length,0);
 down=false;timers.shift()();await new Promise(r=>setImmediate(r));assert.deepEqual(entries.map(e=>e.event),['context.start','action.input']);
});
