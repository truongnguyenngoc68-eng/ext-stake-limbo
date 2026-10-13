(() => {
 'use strict';
 if(window.__limboBetObserver)return;window.__limboBetObserver=true;
 const post=event=>window.postMessage({type:'limbo-confirmed-bet-v1',event},location.origin);
 function request(raw,url){
  try{if(new URL(url,location.href).origin!==location.origin)return null;
   const body=JSON.parse(raw);if(typeof body.query!=='string'||! /\bmutation\b/.test(body.query)||! /\blimboBet\b/.test(body.query))return null;
   const context={cycle:document.documentElement?.getAttribute('data-limbo-stat-cycle')||''};post({kind:'request',cycle:context.cycle});return context;
  }catch{return null}
 }
 function response(context,data){
  if(!context)return;
  const bet=data?.data?.limboBet;
  if(!bet||typeof bet.id!=='string'||!Number.isFinite(bet.amount)||bet.amount<=0||!Number.isFinite(bet.payout)||bet.payout<0||typeof bet.currency!=='string'){
   post({kind:'issue',cycle:context.cycle});return;
  }
  post({kind:'bet',id:bet.id,amount:bet.amount,payout:bet.payout,currency:bet.currency,cycle:context.cycle});
 }
 const original=window.fetch;
 if(original)window.fetch=function(...args){
  const [input,init]=args,url=typeof input==='string'?input:input?.url;
  const context=typeof init?.body==='string'?request(init.body,url):null;
  const result=Reflect.apply(original,this,args);
  if(context)result.then(r=>r.clone().json()).then(data=>response(context,data)).catch(()=>post({kind:'issue',cycle:context.cycle}));
  return result;
 };
 const XHR=window.XMLHttpRequest;
 if(XHR){const open=XHR.prototype.open,send=XHR.prototype.send,urls=new WeakMap();
  XHR.prototype.open=function(method,url,...rest){urls.set(this,url);return Reflect.apply(open,this,[method,url,...rest])};
  XHR.prototype.send=function(body){const context=typeof body==='string'?request(body,urls.get(this)):null;
   if(context)this.addEventListener('loadend',()=>{try{response(context,this.responseType==='json'?this.response:JSON.parse(this.responseText))}catch{post({kind:'issue',cycle:context.cycle})}},{once:true});
   return Reflect.apply(send,this,[body]);
  };
 }
})();
