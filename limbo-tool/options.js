const $=id=>document.getElementById(id);
const flags=['balance','tabs','volume','breakdown','profit','time','currency','stopAlerts'];
const sample={balance:{amount:55.94296881,currency:'usdt',time:Date.now()},read:5,count:5,totals:new Map([['USDT',{volume:32.52859372,profit:8.21187508,volumes:[10.60798626,4.73778197,4.2099868,6.55331384,6.41952485],profits:[-.08523485,1.90669619,2.58236136,.21866732,3.58938506]}]])};
function preferences(){return {interval:Number($('interval').value),decimals:Number($('decimals').value),...Object.fromEntries(flags.map(k=>[k,$(k).checked]))};}
function preview(){$('preview').textContent=LimboTelegram.format(sample,preferences())||'Chọn nội dung muốn gửi';}
for(const id of ['interval','decimals',...flags])$(id).addEventListener('input',preview);
chrome.storage.local.get(['telegram','telegramStatus']).then(({telegram:t,telegramStatus:s})=>{t??={};$('token').value=t.token||'';$('chat').value=t.chat||'';$('enabled').checked=!!t.enabled;const p=LimboTelegram.settings(t);for(const k of flags)$(k).checked=p[k];$('interval').value=p.interval;$('decimals').value=p.decimals;$('status').textContent=s||'';preview();}).catch(()=>{$('status').textContent='Không đọc được cấu hình.'});
$('save').onclick=async()=>{const p=preferences();if(!Number.isInteger(p.interval)||p.interval<1||p.interval>1440){$('status').textContent='Chu kỳ từ 1 đến 1440 phút.';return}if(!['balance','tabs','volume','profit','time','stopAlerts'].some(k=>p[k])){$('status').textContent='Chọn ít nhất một nội dung.';return}
const telegram={...p,token:$('token').value.trim(),chat:$('chat').value.trim(),enabled:$('enabled').checked};if(telegram.enabled&&(!/^\d+:[\w-]+$/.test(telegram.token)||! /^-?\d+$/.test(telegram.chat))){$('status').textContent='Kiểm tra token và Chat ID.';return}
try{await chrome.storage.local.set({telegram});await chrome.runtime.sendMessage({type:'telegram-config'});$('status').textContent=telegram.enabled?'Đã lưu · gửi sau '+p.interval+' phút.':'Đã lưu · thông báo tắt.';}catch{$('status').textContent='Lưu chưa hoàn tất. Thử lại.'}};
let historyRows=[],shown=50;
function element(tag,text,cls){const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;}
const date=t=>new Date(t).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
function renderHistory(){const list=$('historyList');list.replaceChildren();const filter=$('filter').value;const rows=historyRows.filter(r=>filter==='all'||r.status===filter).sort((a,b)=>b.started-a.started);if(!rows.length){list.append(element('div','Chưa có phiên ghi nhận','empty'));return}
for(const r of rows.slice(0,shown)){const card=element('article','','session'),head=element('div','','session-head');head.append(element('h3','Tab '+r.tab),element('span',r.status==='open'?'Đang mở':'Đã đóng','badge '+r.status));card.append(head,element('p',date(r.started)+' → '+(r.closed?date(r.closed):'Hiện tại'),'hint'));const metrics=element('div','','metrics');for(const [label,n]of [['Vol',r.volume],['Lãi/lỗ',r.profit]]){const box=element('div','');box.append(element('span',label+(r.currency?' · '+r.currency:'')));const val=element('strong',r.last?Number(n).toFixed(8):'—',label==='Lãi/lỗ'?(n<0?'negative':'positive'):'');box.append(val);metrics.append(box)}card.append(metrics);card.append(element('p',r.last?'Đo gần nhất '+date(r.last.time):'Chưa đọc được bảng thống kê','hint'));if(r.missing||r.resets)card.append(element('p',[r.missing?'Có khoảng thiếu dữ liệu':'',r.resets?r.resets+' lần đặt lại thống kê':''].filter(Boolean).join(' · '),'hint'));list.append(card);}
if(rows.length>shown){const more=element('button','Xem thêm','more');more.onclick=()=>{shown+=50;renderHistory()};list.append(more)}}
async function loadHistory(){try{const {limboHistory}=await chrome.storage.local.get('limboHistory');historyRows=limboHistory?.sessions||[];renderHistory();$('historyStatus').textContent='Lưu trên máy · số liệu từ lúc bắt đầu ghi nhận đến lần đo cuối.';}catch{$('historyStatus').textContent='Không đọc được lịch sử.'}}
function showPage(page){
 for(const key of ['monitor','configs','settings','history']){$(key).hidden=key!==page;$(key+'Tab').classList.toggle('selected',key===page)}
 if(page==='configs'&&globalThis.LimboConfigHistory)void LimboConfigHistory.refresh();
 if(page==='history'){void loadHistory();if(globalThis.LimboDailyUI)void LimboDailyUI.refresh();}
 if(page==='monitor'&&typeof updateMonitor==='function')void updateMonitor();
}
function route(){showPage(location.hash==='#configs'?'configs':location.hash==='#history'?'history':location.hash==='#settings'?'settings':'monitor')}

$('configsTab').onclick=()=>{location.hash='configs';showPage('configs')};
$('settingsTab').onclick=()=>{location.hash='settings';showPage('settings')};
$('historyTab').onclick=()=>{location.hash='history';showPage('history')};
$('monitorTab').onclick=()=>{location.hash='monitor';showPage('monitor')};
$('refresh').onclick=loadHistory;$('filter').onchange=()=>{shown=50;renderHistory()};
for(const id of ['legacyOpen','legacyClosed'])$(id).onchange=()=>{const open=$('legacyOpen').checked,closed=$('legacyClosed').checked;$('filter').value=open&&closed?'all':open?'open':closed?'closed':'none';shown=50;renderHistory();};
window.addEventListener('hashchange',route);route();

LimboDomains.host().then(h=>{$('stakeDomain').value=h;});
$('saveDomain').onclick=async()=>{try{
const host=LimboDomains.normalize($('stakeDomain').value);
if(!await chrome.permissions.request({origins:['https://'+host+'/*']}))throw Error('Bạn chưa cấp quyền cho tên miền này.');
const previous=await LimboDomains.host();await chrome.storage.local.set({stakeDomain:host});
const result=await chrome.runtime.sendMessage({type:'stake-domain-config'});
if(!result?.ok){await chrome.storage.local.set({stakeDomain:previous});await chrome.runtime.sendMessage({type:'stake-domain-config'});throw Error(result?.error||'Chưa đăng ký được tên miền.');}
$('stakeDomain').value=host;$('domainStatus').textContent='Đã lưu '+host+' · F5 tab Stake rồi chọn tab trong panel.';
}catch(e){$('domainStatus').textContent=e.message;}};

$('extensionVersion').textContent='v'+(chrome.runtime.getManifest?.().version||'Không xác định');

document.getElementById('debugLogs').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('debug.html')});
