import type {Round} from './model.ts';
// Observed on stake1022.com on 2026-10-08. No class hashes / animation cards.
export const SELECTOR='button[data-past-game-id][data-last-game-index]';
export function multiplier(text:string){
 const s=text.trim().replace(/[×x]$/i,'').replace(/\s/g,'');
 if(!/^\d[\d.,]*$/.test(s))return NaN;
 const dot=s.lastIndexOf('.'),comma=s.lastIndexOf(',');
 if(dot>=0&&comma>=0){
  const decimal=dot>comma?'.':',',group=decimal==='.'?',':'.';const split=s.lastIndexOf(decimal);
  const integer=s.slice(0,split),fraction=s.slice(split+1);const groups=integer.split(group);
  if(!/^\d+$/.test(fraction)||groups.length<2||!/^\d{1,3}$/.test(groups[0])||!groups.slice(1).every(g=>/^\d{3}$/.test(g)))return NaN;
  return Number(groups.join('')+'.'+fraction);
 }
 const sep=dot>=0?'.':comma>=0?',':'';
 if(!sep)return Number(s);
 const parts=s.split(sep);
 if(parts.length===2)return /^\d+$/.test(parts[1])?Number(parts[0]+'.'+parts[1]):NaN;
 if(!/^\d{1,3}$/.test(parts[0])||!parts.slice(1).every(g=>/^\d{3}$/.test(g)))return NaN;
 return Number(parts.join(''));
}
export function readRounds(root:ParentNode=document):Round[]{
 const seen=new Set<string>();
 return Array.from(root.querySelectorAll(SELECTOR)).filter(el=>el.getClientRects().length>0).map(el=>({id:el.getAttribute('data-past-game-id')||'',value:multiplier(el.textContent||''),time:Date.now(),index:Number(el.getAttribute('data-last-game-index'))})).filter(r=>{if(!r.id||seen.has(r.id)||!Number.isFinite(r.value)||r.value<1||!Number.isInteger(r.index)||r.index<0)return false;seen.add(r.id);return true}).sort((a,b)=>b.index-a.index).map(({index,...r})=>r);
}
export function afterSnapshot(previous:Round[],current:Round[]){
 if(!previous.length)return {kind:'seed' as const,rounds:current};
 if(!current.length)return {kind:'empty' as const,rounds:[]};
 const newest=previous[previous.length-1].id;const index=current.findIndex(r=>r.id===newest);
 if(index<0)return {kind:'gap' as const,rounds:current};
 return {kind:'new' as const,rounds:current.slice(index+1)};
}
