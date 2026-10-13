import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const defaultInstallDir = String.raw`C:\Users\truon\Downloads\limbo-tool-v1.3.0\limbo-tool`;
export async function validateInstallation(source, target) {
  const [sourceReal,targetReal] = await Promise.all([fs.realpath(source),fs.realpath(target)]);
  const nested = (a,b) => { const rel=path.relative(a,b); return rel==='' || (!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel)); };
  if(nested(sourceReal,targetReal)||nested(targetReal,sourceReal))throw Error('Source and installation must be separate directories');
  const [a,b]=await Promise.all([sourceReal,targetReal].map(dir=>fs.readFile(path.join(dir,'manifest.json'),'utf8').then(JSON.parse)));
  if(a.name!=='Limbo Restart'||b.name!==a.name)throw Error('Thư mục đích không phải Limbo Restart');
  return {source:sourceReal,target:targetReal};
}
async function files(dir,prefix='') {
  const result=[];
  for(const entry of await fs.readdir(path.join(dir,prefix),{withFileTypes:true})){
    const rel=path.join(prefix,entry.name);
    if(entry.isSymbolicLink())throw Error('Unexpected symlink in extension: '+rel);
    if(entry.isDirectory())result.push(...await files(dir,rel));
    else if(entry.isFile())result.push(rel);
  }
  return result;
}
export async function installLimbo(source,target) {
  ({source,target}=await validateInstallation(source,target));
  const list=await files(source);
  const backup=await fs.mkdtemp(path.join(path.dirname(target),path.basename(target)+'-backup-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'));
  // Complete backup before writing any installation files. Never remove local data.
  await fs.cp(target,backup,{recursive:true,errorOnExist:false});
  for(const rel of list){
    const dest=path.join(target,rel);await fs.mkdir(path.dirname(dest),{recursive:true});
    await fs.copyFile(path.join(source,rel),dest);
  }
  for(const rel of list){
    const hash=async dir=>createHash('sha256').update(await fs.readFile(path.join(dir,rel))).digest('hex');
    if(await hash(source)!==await hash(target))throw Error('Verification failed: '+rel+'; backup: '+backup);
  }
  return {target,backup,files:list.length};
}
