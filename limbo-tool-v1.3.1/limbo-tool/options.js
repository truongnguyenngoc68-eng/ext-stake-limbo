const $=id=>document.getElementById(id);
chrome.storage.local.get(['telegram','telegramStatus']).then(({telegram:t,telegramStatus:s})=>{if(t){$('token').value=t.token||'';$('chat').value=t.chat||'';$('enabled').checked=!!t.enabled}$('status').textContent=s||''});
$('save').onclick=async()=>{const telegram={token:$('token').value.trim(),chat:$('chat').value.trim(),enabled:$('enabled').checked};
if(telegram.enabled&&(!/^\d+:[\w-]+$/.test(telegram.token)||! /^-?\d+$/.test(telegram.chat))){$('status').textContent='Kiểm tra Bot token và Chat ID.';return}
await chrome.storage.local.set({telegram});await chrome.runtime.sendMessage({type:'telegram-config'});$('status').textContent=telegram.enabled?'Đã lưu. Lần đầu sau 3 phút.':'Đã tắt gửi.'};
