(() => {
 'use strict';
 if(globalThis.LimboLog)return;
 const session=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
 const recent=[],pending=[];let snapshot=()=>({}),sink=null,sending=false,retryTimer=null,dropped=0;
 const secret=/^(?:authorization|cookie|set-cookie|token|accessToken|refreshToken|password|secret|apiKey|chat_id|connectionParams|x-auth-token|x-access-token|access_token|refresh_token)$/i;
 function clean(value,seen=new WeakSet(),depth=0){
  if(value==null||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value==='string')return value.replace(/bot\d+:[\w-]+/g,'bot[REDACTED]').replace(/([?&](?:token|key|auth|access_token)=)[^&\s]+/gi,'$1[REDACTED]').replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi,'Bearer [REDACTED]').replace(/("(?:token|authorization|cookie|password|apiKey|access_token|refresh_token)"\s*:\s*")[^"]*(")/gi,'$1[REDACTED]$2').slice(0,100000)+(value.length>100000?'[Truncated]':'');
  if(typeof value!=='object')return String(value);
  if(seen.has(value))return '[Circular]';if(depth>12)return '[Depth limit]';seen.add(value);
  if(value instanceof Error||Object.prototype.toString.call(value)==='[object Error]')return {name:value.name,message:clean(value.message),stack:clean(value.stack),cause:clean(value.cause,seen,depth+1)};
  if(Array.isArray(value)){const out=value.slice(0,2000).map(v=>clean(v,seen,depth+1));if(value.length>2000)out.push('[Truncated '+(value.length-2000)+' items]');return out;}
  const out={};for(const [k,v]of Object.entries(value).slice(0,500))out[k]=secret.test(k)?'[REDACTED]':clean(v,seen,depth+1);if(Object.keys(value).length>500)out.__truncatedKeys=Object.keys(value).length-500;return out;
 }
 function emit(event,data={},level='info',trace){
  try{
   const entry={schema:1,time:new Date().toISOString(),epoch:Date.now(),session,source:typeof document==='undefined'?'background':location.protocol==='chrome-extension:'?location.pathname:'content',version:globalThis.chrome?.runtime?.getManifest?.().version,event,level,trace,data:clean(data)};
   if(level==='error'){entry.stack=new Error(event).stack;try{entry.snapshot=clean(snapshot());}catch(e){entry.snapshotError=clean(e)}entry.flow=recent.slice();}
   recent.push({time:entry.time,event,level,trace,data:entry.data});if(recent.length>80)recent.shift();
   if(pending.length>=2000){pending.shift();dropped++;failure('Log queue full: '+dropped+' records dropped');}
   pending.push(entry);void drain();
  }catch(e){failure(e)}
 }
 function failure(e){globalThis.__limboLogFailure=String(e?.message||e);try{globalThis.chrome?.storage?.local?.set({limboDebugHealth:{error:globalThis.__limboLogFailure,time:Date.now()}})?.catch(()=>{})}catch{}}
 async function drain(){
  if(sending||retryTimer||(!sink&&!globalThis.chrome?.runtime?.sendMessage))return;sending=true;let failed=false;
  try{while(pending.length){
   const entry=pending[0],result=sink?await sink(entry):await chrome.runtime.sendMessage({type:'limbo-debug-log',entry});
   if(!result?.ok)throw Error(result?.error||'Journal did not acknowledge record');
   if(pending[0]===entry)pending.shift();
  }
  if(dropped){const count=dropped;dropped=0;emit('logger.dropped',{count},'error');}
  }catch(e){failed=true;failure(e);if(typeof setTimeout==='function')retryTimer=setTimeout(()=>{retryTimer=null;void drain()},2000)}finally{sending=false;if(pending.length&&!retryTimer&&!failed)void drain()}
 }
 globalThis.LimboLog={emit,clean,setSnapshot:fn=>snapshot=fn,setSink:fn=>{sink=fn;void drain()},session};
 if(globalThis.addEventListener){
  addEventListener('error',e=>emit('uncaught.error',{error:e.error||{message:e.message,filename:e.filename,line:e.lineno,column:e.colno}},'error'));
  addEventListener('unhandledrejection',e=>emit('unhandled.rejection',{error:e.reason},'error'));
 }
 for(const method of ['log','info','warn','error','debug']){
  const original=console[method];console[method]=function(...args){emit('console.'+method,{args},method==='error'?'error':method==='warn'?'warn':'info');return Reflect.apply(original,this,args)};
 }
 emit('context.start',{url:typeof location==='undefined'?'service-worker':location.origin+location.pathname,userAgent:globalThis.navigator?.userAgent});
})();
