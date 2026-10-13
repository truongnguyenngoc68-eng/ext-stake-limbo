import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {defaultInstallDir,validateInstallation,installLimbo} from './install-limbo.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const source=path.join(root,'limbo-tool'),manifest=path.join(source,'manifest.json');
const args=process.argv.slice(2);
if(args.some(a=>a.startsWith('--')&&a!=='--no-bump'))throw Error('Unknown build option');
const target=args.find(a=>!a.startsWith('--'))||process.env.LIMBO_INSTALL_DIR||defaultInstallDir;
await validateInstallation(source,target);
const tests=(await fs.readdir(path.join(root,'tests'))).filter(n=>/^limbo-.*\.test\.mjs$/.test(n)).map(n=>path.join(root,'tests',n));
execFileSync(process.execPath,['--test',...tests],{cwd:root,stdio:'inherit'});
const m=JSON.parse(await fs.readFile(manifest,'utf8'));
if(!args.includes('--no-bump')){
 const parts=m.version.split('.').map(Number);parts[parts.length-1]++;m.version=parts.join('.');
 await fs.writeFile(manifest,JSON.stringify(m,null,2)+'\n');
}
const release=path.join(root,'outputs','limbo-tool-v'+m.version);await fs.cp(source,release,{recursive:true});
const result=await installLimbo(release,target);
console.log('Đã build Limbo '+m.version+'; xác minh '+result.files+' file.');
console.log('Backup: '+result.backup);
console.log('Đã cập nhật: '+result.target);
console.log('Reload extension khi sẵn sàng để Chrome nạp bản mới.');
