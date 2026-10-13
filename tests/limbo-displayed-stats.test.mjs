import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('../limbo-tool/content.js',import.meta.url),'utf8');
const start=src.indexOf("  function walletSnapshot(){");
const unused=src.indexOf("  if(typeof chrome!=='undefined'&&chrome.runtime?.onMessage)");
const end=src.indexOf('  const defaults=',start);
function read(volume,profit){const d=new JSDOM('<div data-testid="coin-toggle" data-active-currency="usdt">42,81580545</div><div data-testid="bets-stats-wagered">'+volume+'</div><div data-testid="bets-stats-profit">'+profit+'</div>',{runScripts:'outside-only'});const w=d.window;let fn,result;w.chrome={runtime:{onMessage:{addListener:f=>fn=f}}};w.one=id=>w.document.querySelector('[data-testid="'+id+'"]');w.isLimbo=()=>true;w.setInterval=()=>0;w.eval(src.slice(start,end));fn({type:'limbo-wallet'},null,r=>result=r);d.window.close();return result;}
test('Displayed decimal comma volume and signed profit are read exactly',()=>{const r=read('0,30242226','-0,07194174');assert.equal(r.displayedStats.volume,0.30242226);assert.equal(r.displayedStats.profit,-0.07194174);});
test('Truncated or missing statistics are unavailable, never guessed',()=>{for(const v of ['0,3024…','','NaN'])assert.equal(read(v,'1').displayedStats,null);});
