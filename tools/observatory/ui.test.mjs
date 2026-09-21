import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { normalizeBillDetail, searchCatalog } from './live.mjs';

const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/synthetic-training.json',import.meta.url),'utf8'));
const metadata={ congress:119,number:12,type:'HR',title:'Synthetic live fixture title',updateDate:'2026-08-01',introducedDate:'2025-01-01',sponsors:[{bioguideId:'T000000',fullName:'Synthetic Test Sponsor',party:'I',state:'ZZ'}],cosponsors:{count:1},actions:{actions:[{actionDate:'2026-08-01',text:'Synthetic introduction'}]},textVersions:{textVersions:[{type:'Introduced in House',date:'2026-08-01',formats:[{url:'https://www.congress.gov/119/bills/hr12/BILLS-119hr12ih.htm',type:'Formatted Text'}]}]}};
const detail=normalizeBillDetail(metadata,{}, {fetchedAt:'2026-08-02T00:00:00Z',retrievedFrom:'https://api.congress.gov/v3/bill/119/hr/12'});
const catalog=searchCatalog([{congress:119,type:'HR',number:12,title:metadata.title,updateDate:'2026-08-01',latestAction:{actionDate:'2026-08-01',text:'Synthetic introduction'}}]);

function setup({failRefresh=false,storage=null}={}){
  const dom=new JSDOM(fs.readFileSync(new URL('./index.html',import.meta.url),'utf8'),{url:'https://dgallemore.com/tools/observatory/index.html',runScripts:'outside-only',pretendToBeVisual:true});
  const {window}=dom;const errors=[],requests=[];
  window.addEventListener('error',event=>errors.push(event.error));
  window.HTMLElement.prototype.scrollIntoView=function(){};
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(storage)window.localStorage.setItem('ballzatram:observatory-workbench:v1',storage);
  window.fetch=async(url,options={})=>{
    requests.push([url,options]);
    const path=String(url);
    if(path.endsWith('synthetic-training.json'))return{ok:true,json:async()=>structuredClone(fixture)};
    if(path==='./data/catalog.json')return{ok:true,json:async()=>({ ...catalog, provenance:{...catalog.provenance,sourceLabel:'Bundled snapshot; API not configured'} })};
    if(path==='./data/119-hr-12.json')return{ok:true,json:async()=>structuredClone(detail)};
    if(path==='https://api.example/catalog')return{ok:!failRefresh,json:async()=>structuredClone(catalog)};
    if(path==='https://api.example/bill/119/hr/12')return{ok:!failRefresh,json:async()=>structuredClone(detail)};
    if(path==='https://text.example/bill')return{ok:true,text:async()=>'<h1>SEC. 7. LIVE FETCH TEST</h1><p>Arbitration is required unless parties opt out.</p>'};
    return{ok:false,json:async()=>({})};
  };
  const context=dom.getInternalVMContext();
  vm.runInContext(fs.readFileSync(new URL('./core.js',import.meta.url),'utf8'),context);
  vm.runInContext(fs.readFileSync(new URL('./adapters.js',import.meta.url),'utf8'),context);
  for(const name of ['ai-features.js','subscription-client.js','ai-client.js','ai-panel.js'])vm.runInContext(fs.readFileSync(new URL('../../assets/'+name,import.meta.url),'utf8'),context);
  vm.runInContext(fs.readFileSync(new URL('./app.js',import.meta.url),'utf8'),context);
  return{dom,window,requests,errors};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));

// The training workspace must never imply that synthetic people are real records.
test('full workbench navigation, evidence drafts, selected-context AI and local privacy',async()=>{
  const {dom,window,requests,errors}=setup();const{document,Event,location}=window;const click=s=>document.querySelector(s).click();const nav=id=>click(`[data-view="${id}"]`);
  assert.match(document.querySelector('#view').textContent,/Find a real bill/);
  click('[data-action="load-demo"]');await flush();
  assert.equal(document.querySelectorAll('.section-row').length,6);
  assert.match(document.querySelector('#view').textContent,/SYNTHETIC TRAINING BILL/);
  assert.match(document.querySelector('#view').textContent,/SYNTHETIC TRAINING DATA/);
  assert.doesNotMatch(document.querySelector('#view').textContent,/hr_4321/i);
  click('[data-section="section-3"]');assert.match(document.querySelector('.source-excerpt').textContent,/data retention exceeding six years/);
  click('[data-section="section-4"]');assert.match(document.querySelector('.source-excerpt').textContent,/pre-dispute arbitration/);
  click('[data-action="save-section-draft"]');assert.match(document.querySelector('#section-draft-note').textContent,/unreviewed/);
  nav('compare');assert.match(document.querySelector('#view').textContent,/No comparable version/);
  nav('claims');document.querySelector('#claim-title').value='SYNTHETIC test headline';document.querySelector('#claim-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));assert.match(document.querySelector('#view').textContent,/SYNTHETIC test headline/);
  nav('coverage');document.querySelector('#article-title').value='SYNTHETIC test article';document.querySelector('#article-outlet').value='SYNTHETIC Research Desk';document.querySelector('#article-section').value='section-3';document.querySelector('#article-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));assert.match(document.querySelector('#view').textContent,/SYNTHETIC Research Desk/);
  nav('promises');assert.match(document.querySelector('#view').textContent,/SYNTHETIC TEST OFFICEHOLDER/);assert.match(document.querySelector('#view').textContent,/Contradicting record/);
  nav('report');document.querySelector('#note-input').value='SYNTHETIC test notebook';click('#save-note');assert.match(document.querySelector('#local-note').textContent,/SYNTHETIC test notebook/);
  nav('sources');assert.match(document.querySelector('#view').textContent,/SYNTHETIC EXAMPLE/);nav('methods');assert.match(document.querySelector('#view').textContent,/prohibited interpretations/);
  nav('watch');document.querySelector('#url-input').value='https://text.example/bill';click('#fetch-url');await flush();nav('bill');assert.match(document.querySelector('.source-excerpt').textContent,/Arbitration is required/);
  nav('watch');click('[data-action="load-demo"]');await flush();assert.equal(document.querySelectorAll('.section-row').length,6);
  nav('bill');click('[data-section="section-4"]');document.querySelector('.osiris').open=true;
  const requestCount=requests.length,workbenchUrl=location.href;
  click('#ask-osiris');await flush();assert.match(document.querySelector('#osiris-answer').textContent,/Nothing has been sent/);
  assert.equal(document.querySelector('.osiris-dialog').open,true);
  assert.match(document.querySelector('[data-osiris="context"]').textContent,/before the dispute arises/);
  assert.doesNotMatch(document.querySelector('[data-osiris="context"]').textContent,/SYNTHETIC test notebook|SYNTHETIC test headline/);
  assert.equal(document.querySelector('[data-app="form"]'),null);
  assert.equal(location.href,workbenchUrl);assert.equal(requests.length,requestCount);
  click('[data-osiris="handoff"]');
  document.querySelector('[data-app="form"]').requestSubmit();
  const prepared=document.querySelector('[data-app="text"]').value;
  assert.match(prepared,/before the dispute arises/);
  assert.doesNotMatch(prepared,/SYNTHETIC test notebook|SYNTHETIC test headline/);
  assert.equal(document.querySelector('[data-app="launch"]').href,'https://chatgpt.com/');
  assert.equal(location.href,workbenchUrl);assert.equal(requests.length,requestCount);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('browse, track, refresh, compare snapshots and persist live watchlist without relabeling historical votes',async()=>{
  const {dom,window,requests,errors}=setup();const d=window.document;const click=s=>d.querySelector(s).click();
  click('[data-action="browse-live"]');await flush();
  assert.match(d.querySelector('#view').textContent,/Synthetic live fixture title/);
  assert.equal(d.querySelectorAll('[data-action="track-bill"]').length,1);
  click('[data-action="track-bill"]');await flush();
  assert.match(d.querySelector('#view').textContent,/Live official metadata/);
  assert.match(d.querySelector('#view').textContent,/Live bill text has not been retrieved/);
  assert.match(d.querySelector('#view').textContent,/No accountability verdict/);
  click('[data-view="sources"]');assert.match(d.querySelector('#view').textContent,/Congress.gov API bill detail/);
  click('[data-view="compare"]');assert.match(d.querySelector('#view').textContent,/No comparable version/);
  click('[data-view="watch"]');d.querySelector('#live-api-base').value='https://api.example';click('[data-action="save-api-base"]');
  click('[data-action="refresh-live"]');await flush();assert.match(d.querySelector('#view').textContent,/No material official metadata changes/);
  assert.ok(requests.some(([url])=>url==='https://api.example/bill/119/hr/12'));
  const saved=JSON.parse(window.localStorage.getItem('ballzatram:observatory-workbench:v1'));assert.equal(saved.live.tracked.length,1);assert.equal(saved.live.snapshots['119-hr-12'].length,2);
  assert.ok(!saved.live.snapshots['119-hr-12'][0].text.includes('vote'));
  assert.deepEqual(errors,[]);dom.window.close();
});

test('failed live refresh keeps the previous snapshot and shows a source problem',async()=>{
  const state={live:{tracked:[{id:'119-hr-12',congress:119,type:'hr',number:12,title:'Synthetic live fixture title'}],snapshots:{'119-hr-12':[detail]},catalog,apiBase:'https://api.example'}};
  const {dom,window}=setup({failRefresh:true,storage:JSON.stringify(state)});const d=window.document;
  d.querySelector('[data-action="refresh-live"]').click();await flush();
  assert.match(d.querySelector('#view').textContent,/previous snapshot was kept/);
  assert.match(d.querySelector('#view').textContent,/1 snapshot saved/);dom.window.close();
});

test('untrusted HTML and invalid imports never execute or become links',async()=>{
  const {dom,window,errors}=setup();const{document,Event}=window;
  const click=s=>document.querySelector(s).click();
  const imported=JSON.stringify({source_label:'<img src=x onerror=alert(1)>',bills:[{id:'safe-id',title:'<script>alert(1)</script>',text:'SECTION 1. TEST\nOpt-out rights expire after 30 days.',sources:[{id:'source-1',url:'javascript:alert(1)',excerpt:'<b>not markup</b>'}]}]});
  document.querySelector('#bill-input').value=imported;click('#load-paste');
  assert.equal(document.querySelectorAll('#view script,#view img').length,0);assert.match(document.querySelector('#view').textContent,/<script>/);
  click('[data-view="sources"]');assert.equal(document.querySelectorAll('[href^="javascript:"]').length,0);
  assert.match(document.querySelector('#view').textContent,/<b>not markup<\/b>/);
  click('[data-view="watch"]');document.querySelector('#bill-input').value='{ invalid';click('#load-paste');assert.match(document.querySelector('#source-status').textContent,/could not be parsed/);
  document.querySelector('#bill-input').value='SECTION 1. TEXT\n<svg onload=alert(1)>Arbitration is required.';click('#load-paste');assert.equal(document.querySelectorAll('#view svg,#view script').length,0);
  click('[data-view="claims"]');document.querySelector('#claim-title').value='Claim';document.querySelector('#claim-url').value='https://example.test/';document.querySelector('#claim-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  assert.deepEqual(errors,[]);dom.window.close();
});

test('corrupt local saves recover visibly without inventing fixtures',()=>{
  const {dom,window,errors}=setup({storage:'{broken'});assert.match(window.document.querySelector('#source-status').textContent,/could not be read/);assert.match(window.document.querySelector('#view').textContent,/Find a real bill/);assert.deepEqual(errors,[]);dom.window.close();
});
