import {Engine} from './engine.ts';
export const SETTINGS='slide-settings-v1', SESSION='slide-session-v1', OBSERVED='slide-observed-v1';
const extension=()=>typeof chrome!=='undefined'&&!!chrome.runtime?.id;
export async function readStored(key:string):Promise<any>{
 if(extension())return (await chrome.storage.local.get(key))[key];
 const text=localStorage.getItem(key);return text?JSON.parse(text):undefined;
}
export async function writeStored(key:string,value:unknown){
 const copy=JSON.parse(JSON.stringify(value));
 if(extension())await chrome.storage.local.set({[key]:copy});else localStorage.setItem(key,JSON.stringify(copy));
}
export function packEngine(engine:Engine|null){
 if(!engine)return null;
 return JSON.parse(JSON.stringify({...engine,seen:[...engine.seen]},(_key,value)=>typeof value==='bigint'?value.toString():value));
}
export function unpackEngine(data:any):Engine|null{
 if(!data)return null;
 data=structuredClone(data);
 const engine=new Engine(data.config);
 for(const key of ['balanceUnits','peakUnits','drawdownUnits','turnoverUnits'] as const){if(typeof data[key]!=='string'||!/^[-]?\d+$/.test(data[key]))throw Error('Dữ liệu phiên không hợp lệ');data[key]=BigInt(data[key])}
 Object.assign(engine,data,{seen:new Set<string>(data.seen)});
 return engine;
}
export function mergeRounds(old:any[],fresh:any[]){const ids=new Set(old.map(r=>r.id));return [...old,...fresh.filter(r=>!ids.has(r.id))].slice(-5000)}
export function stoppedSnapshot(data:any){return data?{...data,running:false,busy:false,pending:false,configUpdatePending:false,message:'Phiên đã lưu — bấm Bắt đầu để tạo phiên mới',progress:data.progress?.map((p:any)=>({...p,reason:'Phiên đã lưu',queuedStep:null}))}:null}
