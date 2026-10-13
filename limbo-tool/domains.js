globalThis.LimboDomains={
normalize(value){const u=new URL(value.includes('://')?value:'https://'+value.trim());if(u.protocol!=='https:'||u.username||u.password||u.port||!/^(?:www\.)?(?:stake\d+\.com|stakeru\d+\.com|staketr\.com|stkmirror\.com|stake\.(?:com|jp|bet|ceo|games|mba|krd|bz|ac|pet))$/.test(u.hostname))throw Error('Nhập tên miền Stake hợp lệ hoặc URL HTTPS.');return u.hostname;},
async host(){return (await chrome.storage.local.get('stakeDomain')).stakeDomain||'stake1022.com';},
async patterns(){return ['https://'+await this.host()+'/*'];},
validUrl(value){try{const u=new URL(value);this.normalize(u.origin);return /\/casino\/games\/limbo\/?$/.test(u.pathname);}catch{return false;}}
};
