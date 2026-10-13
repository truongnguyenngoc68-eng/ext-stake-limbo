(() => {
 'use strict';
 if(window.__limboBetObserver)return;window.__limboBetObserver=true;
 const redact=(value,depth=0)=>{
  if(depth>12)return '[Depth limit]';
  if(typeof value==='string')return value.replace(/bot\d+:[\w-]+/g,'bot[REDACTED]').replace(/([?&](?:token|key|auth|access_token)=)[^&\s]+/gi,'$1[REDACTED]').replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi,'Bearer [REDACTED]').replace(/("(?:token|authorization|cookie|password|apiKey|access_token|refresh_token)"\s*:\s*")[^"]*(")/gi,'$1[REDACTED]$2').slice(0,100000)+(value.length>100000?'[Truncated]':'');
  if(Array.isArray(value))return value.slice(0,2000).map(v=>redact(v,depth+1));
  if(value&&typeof value==='object'){const out={};for(const [k,v]of Object.entries(value).slice(0,500))out[k]=/^(?:authorization|cookie|set-cookie|token|accessToken|refreshToken|password|secret|apiKey|connectionParams|x-auth-token|access_token|refresh_token)$/i.test(k)?'[REDACTED]':redact(v,depth+1);return out}
  return value;
 };
 const payload=raw=>{if(typeof raw==='string'){try{return redact(JSON.parse(raw))}catch{return {text:redact(raw),truncated:raw.length>100000}}}return {type:raw?.constructor?.name||typeof raw,bytes:raw?.size??raw?.byteLength,unreadBinary:true}};
 let connected=false,dropped=0;const pending=[];
 const log=(event,data={},level='info',trace)=>{try{const message={type:'limbo-debug-observer-v1',entry:{event,data:redact(data),level,trace,pageTime:new Date().toISOString()}};if(connected)window.postMessage(message,location.origin);else{pending.push(message);if(pending.length>2000){pending.shift();dropped++}}}catch{}};
 window.addEventListener('message',e=>{if(e.source!==window||e.origin!==location.origin||e.data?.type!=='limbo-debug-ready-v1')return;connected=true;for(const m of pending.splice(0))window.postMessage(m,location.origin);if(dropped)log('buffer.dropped',{count:dropped},'error');dropped=0;});
 const failure=e=>({name:e?.name,message:e?.message||String(e),stack:e?.stack});
 window.addEventListener('error',e=>log('error',{error:failure(e.error),message:e.message,file:e.filename,line:e.lineno,column:e.colno},'error'));
 window.addEventListener('unhandledrejection',e=>log('rejection',{error:failure(e.reason)},'error'));
 const post=event=>window.postMessage({type:'limbo-confirmed-bet-v1',event},location.origin);
 function request(raw,url){
  try{if(new URL(url,location.href).origin!==location.origin)return null;
   const body=JSON.parse(raw);if(typeof body.query!=='string'||! /\bmutation\b/.test(body.query)||! /\blimboBet\b/.test(body.query))return null;
   const context={cycle:document.documentElement?.getAttribute('data-limbo-stat-cycle')||'',trace:crypto.randomUUID()};log('bet.request',{url:new URL(url,location.href).pathname,input:body,stack:new Error('bet.request').stack},'info',context.trace);post({kind:'request',cycle:context.cycle,trace:context.trace});return context;
  }catch{return null}
 }
 function response(context,data){
  if(!context)return;
  log('bet.response',{output:data},data?.errors?'error':'info',context.trace);
  const bet=data?.data?.limboBet;
  if(!bet||typeof bet.id!=='string'||!Number.isFinite(bet.amount)||bet.amount<=0||!Number.isFinite(bet.payout)||bet.payout<0||typeof bet.currency!=='string'){
   post({kind:'issue',cycle:context.cycle,trace:context.trace});return;
  }
  post({kind:'bet',id:bet.id,amount:bet.amount,payout:bet.payout,currency:bet.currency,cycle:context.cycle,trace:context.trace});
 }
 const original=window.fetch;
 if(original)window.fetch=function(...args){
  const [input,init]=args,url=typeof input==='string'?input:input?.url;
  const context=typeof init?.body==='string'?request(init.body,url):null;
  const seedRequest=typeof init?.body==='string'&&/seed|fairness/i.test(init.body)&&(()=>{try{return new URL(url,location.href).origin===location.origin}catch{return false}})();
  const seedTrace=seedRequest?crypto.randomUUID():null;
  if(seedRequest)log('seed.request',{input:payload(init.body)},'info',seedTrace);
  let result;try{result=Reflect.apply(original,this,args)}catch(error){log('fetch.error',{error:failure(error)},'error',context?.trace||seedTrace);throw error}
  if(seedRequest)result.then(r=>r.clone().json()).then(output=>log('seed.response',{output},output?.errors?'error':'info',seedTrace)).catch(error=>log('seed.error',{error:failure(error)},'error',seedTrace));
  if(context)result.then(r=>r.clone().json()).then(data=>response(context,data)).catch(error=>{log('bet.network.error',{error:failure(error)},'error',context.trace);post({kind:'issue',cycle:context.cycle,trace:context.trace})});
  return result;
 };
 const XHR=window.XMLHttpRequest;
 if(XHR){const open=XHR.prototype.open,send=XHR.prototype.send,urls=new WeakMap();
  XHR.prototype.open=function(method,url,...rest){urls.set(this,url);return Reflect.apply(open,this,[method,url,...rest])};
  XHR.prototype.send=function(body){const context=typeof body==='string'?request(body,urls.get(this)):null;
   let seedTrace;try{if(new URL(urls.get(this),location.href).origin===location.origin&&/seed|fairness/i.test(String(body)||String(urls.get(this))))seedTrace=crypto.randomUUID()}catch{}
   if(seedTrace){log('seed.request',{input:payload(body)},'info',seedTrace);this.addEventListener('loadend',()=>{try{const output=this.responseType==='json'?this.response:JSON.parse(this.responseText);log('seed.response',{output,status:this.status},this.status>=400||output?.errors?'error':'info',seedTrace)}catch(error){log('seed.error',{error:failure(error),status:this.status},'error',seedTrace)}},{once:true})}

   if(context)this.addEventListener('loadend',()=>{try{response(context,this.responseType==='json'?this.response:JSON.parse(this.responseText))}catch(error){log('xhr.response.error',{error:failure(error),status:this.status},'error',context.trace);post({kind:'issue',cycle:context.cycle,trace:context.trace})}},{once:true});
   return Reflect.apply(send,this,[body]);
  };
 }
 for(const method of ['log','info','warn','error','debug']){
  const original=window.console?.[method];if(!original)continue;
  window.console[method]=function(...args){log('console.'+method,{args:args.map(a=>a instanceof Error?failure(a):a)},method==='error'?'error':method==='warn'?'warn':'info');return Reflect.apply(original,this,args)};
 }
 const NativeSocket=window.WebSocket;
 if(NativeSocket){
  const wrapped=new Proxy(NativeSocket,{construct(Target,args,newTarget){
   const socket=Reflect.construct(Target,args,newTarget),trace=crypto.randomUUID();
   let url;try{const u=new URL(String(args[0]),location.href);url=u.origin+u.pathname}catch{url='[invalid URL]'}
   log('socket.create',{url},'info',trace);
   socket.addEventListener('open',()=>log('socket.open',{url},'info',trace));
   socket.addEventListener('message',e=>log('socket.receive',{url,payload:payload(e.data)},'info',trace));
   socket.addEventListener('close',e=>log('socket.close',{url,code:e.code,reason:e.reason,wasClean:e.wasClean},e.wasClean?'info':'error',trace));
   socket.addEventListener('error',()=>log('socket.error',{url,readyState:socket.readyState,error:{message:'WebSocket error; browser does not expose network stack'}},'error',trace));
   const send=socket.send;socket.send=function(data){log('socket.send',{url,payload:payload(data)},'info',trace);try{return Reflect.apply(send,this,[data])}catch(error){log('socket.send.error',{error:failure(error)},'error',trace);throw error}};
   return socket;
  }});
  window.WebSocket=wrapped;
 }
})();
