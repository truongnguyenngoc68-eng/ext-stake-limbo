import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'limbo-tool'),manifest=path.join(source,'manifest.json');
const m=JSON.parse(await fs.readFile(manifest,'utf8'));
const parts=m.version.split('.').map(Number);parts[parts.length-1]++;m.version=parts.join('.');
await fs.writeFile(manifest,JSON.stringify(m,null,2)+'\n');
const release=path.join(root,'limbo-tool-v'+m.version);await fs.cp(source,release,{recursive:true});
const target=process.argv[2];if(target){const existing=JSON.parse(await fs.readFile(path.join(target,'manifest.json'),'utf8'));if(existing.name!==m.name)throw Error('Thư mục đích không phải Limbo Restart');await fs.cp(source,target,{recursive:true});}
console.log('Đã đóng gói Limbo '+m.version+(target?' và cập nhật '+target:''));
