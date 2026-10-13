(() => {
 const defaults={interval:3,decimals:2,balance:true,tabs:true,volume:true,breakdown:true,profit:false,time:true,currency:false};
 function settings(raw={}){const s={...defaults};for(const key of ['balance','tabs','volume','breakdown','profit','time','currency'])if(typeof raw[key]==='boolean')s[key]=raw[key];if(Number.isInteger(raw.interval)&&raw.interval>=1&&raw.interval<=1440)s.interval=raw.interval;if(Number.isInteger(raw.decimals)&&raw.decimals>=0&&raw.decimals<=8)s.decimals=raw.decimals;return s;}
 function format({balance,totals,read,count},raw){const s=settings(raw),lines=[],f=n=>{const text=n.toFixed(s.decimals);return Number(text)===0?(0).toFixed(s.decimals):text;};
  if(s.balance)lines.push('💰 '+f(balance.amount)+(s.currency?' '+balance.currency.toUpperCase():''));
  if(s.tabs)lines.push('📊 '+read+'/'+count);
  for(const [currency,t]of totals){const suffix=s.currency||totals.size>1?' '+currency:'';
   const line=(label,values,total)=>label+': '+(s.breakdown?'('+values.map(n=>n<0?'('+f(n)+')':f(n)).join(' + ')+') = ':'')+f(total)+suffix;
   if(s.volume)lines.push(line('Vol',t.volumes,t.volume));if(s.profit)lines.push(line('Lãi/lỗ',t.profits,t.profit));
  }
  if(read<count)lines.push('⚠ Thiếu '+(count-read)+' tab');
  if(s.time)lines.push(new Date(balance.time).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}));
  return lines.join('\n');
 }
 globalThis.LimboTelegram={defaults,settings,format};
})();
