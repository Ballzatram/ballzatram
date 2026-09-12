import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {validateCatalogue,validateWatchlist,followBill,markSeen,changesSince,freshness,filterBills,WATCH_KEY} from './tracker-core.mjs';
import {createTracker} from './tracker.mjs';
const catalogue=JSON.parse(readFileSync(new URL('./live/index.json',import.meta.url),'utf8'));
const bill=catalogue.bills[0];
const empty=()=>({schemaVersion:1,bills:[]});

test('published catalogue has supported identities, safe paths and source metadata',()=>{
  validateCatalogue(catalogue);assert.equal(catalogue.bills.length,24);
  const changed=structuredClone(catalogue);changed.bills[0].detailPath='../private.json';assert.throws(()=>validateCatalogue(changed));
  changed.bills[0]=structuredClone(bill);changed.bills[0].sourceUrl='https://attacker.invalid/file';assert.throws(()=>validateCatalogue(changed));
});
test('following is idempotent and checking timestamps alone does not create activity',()=>{
  const list=followBill(empty(),bill);assert.equal(followBill(list,bill).bills.length,1);validateWatchlist(list);
  assert.deepEqual(changesSince({...bill,checkedAt:new Date().toISOString()},list.bills[0]),[]);
  const updated={...bill,fingerprint:'f'.repeat(64),actionCount:bill.actionCount+1};
  assert.deepEqual(changesSince(updated,list.bills[0]),['Legislative activity updated']);
  assert.deepEqual(changesSince(updated,markSeen(list,updated).bills[0]),[]);
});
test('metadata corrections are distinguished from legislative changes',()=>{
  const list=followBill(empty(),bill);
  assert.deepEqual(changesSince({...bill,fingerprint:'e'.repeat(64)},list.bills[0]),['Official record updated']);
});
test('stale and failed sources remain visible',()=>{
  assert.equal(freshness({...bill,health:'refresh_failed'}),'Refresh failed');
  assert.equal(freshness({...bill,checkedAt:'2020-01-01T00:00:00Z',activityCheckedAt:null}),'Check overdue');
  assert.equal(freshness({...bill,checkedAt:'2020-01-01T00:00:00Z',activityCheckedAt:new Date().toISOString()}),'Checked recently');
});
test('search and watchlist filters work together',()=>{
  const list=followBill(empty(),bill);
  assert.equal(filterBills(catalogue.bills,{followedOnly:true},list).length,1);
  assert.ok(filterBills(catalogue.bills,{query:bill.billLabel.split(' · ')[0]}).some(x=>x.id===bill.id));
  assert.equal(filterBills(catalogue.bills,{chamber:bill.chamber==='House'?'Senate':'House',followedOnly:true},list).length,0);
});

test('live UI discovers, searches, follows, reloads and opens a verified bill without uploads',async t=>{
  const dom=new JSDOM('<main><section id="panel"></section></main>',{url:'https://example.org/tools/observatory/index.html'});
  t.after(()=>dom.window.close());
  for(const key of ['window','document','localStorage'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  let data=structuredClone(catalogue),fail=false,corrupt=false,opened=null;const notices=[];
  globalThis.fetch=async url=>{
    if(fail)throw Error('Synthetic network outage');
    if(url==='./live/index.json')return {ok:true,json:async()=>data};
    const record=data.bills.find(x=>'./live/'+x.detailPath===url);assert.ok(record);
    const bytes=readFileSync(new URL('./live/'+record.detailPath,import.meta.url));
    return {ok:true,arrayBuffer:async()=>corrupt?new TextEncoder().encode('{}').buffer:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
  };
  const controller=createTracker({panel:document.querySelector('#panel'),onOpen:d=>{opened=d;},onNotice:m=>notices.push(m),isActive:()=>true});
  t.after(()=>controller.destroy());
  await controller.refresh();assert.equal(document.querySelectorAll('.tracker-bill').length,24);
  document.querySelector(`[data-follow-bill="${bill.id}"]`).click();
  assert.equal(JSON.parse(localStorage.getItem(WATCH_KEY)).bills.length,1);
  document.querySelector('#watch-bills').click();assert.equal(document.querySelectorAll('.tracker-bill').length,1);
  const input=document.querySelector('#bill-query');input.value='impossible-matching-phrase';input.dispatchEvent(new dom.window.Event('input'));assert.equal(document.querySelectorAll('.tracker-bill').length,0);
  input.value='';input.dispatchEvent(new dom.window.Event('input'));await controller.openBill(bill.id);assert.equal(opened.tracker.billId,bill.id);assert.equal(notices.length,0);
  const old=opened;corrupt=true;await controller.openBill(bill.id);assert.equal(opened,old);assert.match(notices.at(-1),/fingerprint/);corrupt=false;
  data=structuredClone(catalogue);data.bills[0].fingerprint='e'.repeat(64);data.bills[0].detailPath=`bills/${bill.id}-${'e'.repeat(16)}.json`;data.bills[0].actionCount++;
  await controller.refresh();assert.match(document.body.textContent,/New since viewed/);
  fail=true;await controller.refresh();assert.match(document.body.textContent,/last available catalogue/);assert.equal(document.querySelectorAll('.tracker-bill').length,1);
  controller.destroy();
  const second=createTracker({panel:document.querySelector('#panel'),onOpen:()=>{},onNotice:()=>{},isActive:()=>true});t.after(()=>second.destroy());assert.equal(second.isFollowed(bill.id),true);
});
