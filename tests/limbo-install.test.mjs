import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {installLimbo} from '../scripts/install-limbo.mjs';
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'limbo-install-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const source=path.join(root,'source'),target=path.join(root,'installed');for(const dir of [source,target]){await fs.mkdir(dir);await fs.writeFile(path.join(dir,'manifest.json'),JSON.stringify({name:'Limbo Restart',version:dir===source?'1.5.3':'1.5.2'}))}return {source,target};}
test('Install backs up old code, updates nested assets, preserves local files and creates unique backups',async t=>{
 const {source,target}=await fixture(t);await fs.writeFile(path.join(target,'content.js'),'old');await fs.writeFile(path.join(target,'local-data.json'),'keep');await fs.mkdir(path.join(source,'assets'));await fs.writeFile(path.join(source,'assets','style.css'),'new style');await fs.writeFile(path.join(source,'content.js'),'new');
 const result=await installLimbo(source,target);
 assert.equal(await fs.readFile(path.join(result.backup,'content.js'),'utf8'),'old');
 assert.equal(JSON.parse(await fs.readFile(path.join(result.backup,'manifest.json'),'utf8')).version,'1.5.2');
 assert.equal(await fs.readFile(path.join(target,'content.js'),'utf8'),'new');assert.equal(await fs.readFile(path.join(target,'local-data.json'),'utf8'),'keep');assert.equal(await fs.readFile(path.join(target,'assets','style.css'),'utf8'),'new style');
 const second=await installLimbo(source,target);assert.notEqual(second.backup,result.backup);
});
test('Wrong extension and overlapping paths are rejected before overwriting',async t=>{
 const {source,target}=await fixture(t);await fs.writeFile(path.join(target,'manifest.json'),' {"name":"Other extension"}');
 await assert.rejects(installLimbo(source,target),/không phải Limbo/);
 assert.equal(JSON.parse(await fs.readFile(path.join(target,'manifest.json'),'utf8')).name,'Other extension');
 await assert.rejects(installLimbo(source,source),/separate directories/);
});
