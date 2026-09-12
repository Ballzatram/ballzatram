import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {STORAGE_KEY,parseImport} from './core.mjs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const catalogue=JSON.parse(readFileSync(new URL('./live/index.json',import.meta.url),'utf8'));
const fixture=JSON.parse(readFileSync(new URL('./data/dossier.json',import.meta.url),'utf8'));
let dom,downloads=[],errors=[],mountNumber=0,requests=[];
test.afterEach(()=>dom?.window.close());
const flush=()=>new Promise(resolve=>setImmediate(resolve));
async function mount(saved=null,{storageFailure=false,sourceFailure=false,live=false,hash=''}={}){
  if(dom)dom.window.close();
  errors=[];requests=[];
  const vc=new VirtualConsole();vc.on('jsdomError',error=>errors.push(error.message));
  dom=new JSDOM(html,{url:'https://local.test/tools/observatory/index.html'+hash,runScripts:'outside-only',virtualConsole:vc});
  for(const key of ['window','document','localStorage','history','location','FormData'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  if(saved)localStorage.setItem(STORAGE_KEY,saved);
  if(storageFailure)dom.window.Storage.prototype.setItem=()=>{throw new Error('Quota exceeded');};
  dom.window.HTMLElement.prototype.scrollIntoView=()=>{};dom.window.scrollTo=()=>{};
  dom.window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  globalThis.fetch=async url=>{
    requests.push(url);
    if(url==='./live/index.json')return {ok:live,status:live?200:503,json:async()=>structuredClone(catalogue)};
    if(url.startsWith('./live/bills/')){const raw=readFileSync(new URL(url,import.meta.url));return {ok:true,arrayBuffer:async()=>raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)};}
    assert.equal(url,'./data/dossier.json');return {ok:!sourceFailure,status:sourceFailure?503:200,json:async()=>structuredClone(fixture)};
  };
  URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:testing';};URL.revokeObjectURL=()=>{};
  dom.window.HTMLAnchorElement.prototype.click=function(){};
  await import(`./app.mjs?test=${++mountNumber}`);await flush();
}
const click=selector=>{const el=document.querySelector(selector);assert.ok(el,`Missing ${selector}`);el.click();};
const input=(selector,value)=>{const el=document.querySelector(selector);assert.ok(el,`Missing ${selector}`);el.value=value;el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
const field=(form,key,value)=>{const el=form.elements.namedItem(key);if(el.type==='checkbox')el.checked=Boolean(value);else el.value=value;};
const nav=tab=>{if(tab==='coverage'&&!document.querySelector('[data-tab="coverage"]'))click('[data-tab="dossier"]');click(`[data-tab="${tab}"]`);};
const text=()=>document.body.textContent;
async function importCase(content){const el=document.querySelector('#import-file');Object.defineProperty(el,'files',{value:[{size:content.length,text:async()=>content}],configurable:true});el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await flush();}

test('workbench interactions, drafts, import/export and reload',async()=>{
  await mount();nav('guide');click('#load-example');await flush();nav('bill');assert.match(text(),/Speak Out Act/);assert.equal(document.querySelectorAll('[data-section]').length,5);
  click('[data-section="section-4"]');assert.match(document.querySelector('.original').textContent,/before the dispute arises/);
  click('[data-evidence]');assert.ok(document.querySelector('#evidence-dialog').hasAttribute('open'));assert.match(document.querySelector('#evidence-body').textContent,/SHA-256/);
  click('#compare-section');assert.equal(document.querySelectorAll('ins').length>0,true);assert.equal(document.querySelectorAll('.diff-row').length,5);
  nav('congress');assert.equal(document.querySelectorAll('#member-rows tr').length,432);
  input('#state-filter','NC');assert.equal(document.querySelectorAll('#member-rows tr').length,13);
  input('#member-query','A000370');assert.equal(document.querySelectorAll('#member-rows tr').length,1);assert.match(document.querySelector('#member-rows').textContent,/Adams/);
  nav('promises');assert.match(text(),/site has not collected campaign promises/);
  let form=document.querySelector('#promise-form');
  for(const [key,value] of Object.entries({person:'SYNTHETIC Test Member <img src=x onerror=alert(1)>',date:'2022-07-01',url:'https://example.org/test-promise',quote:'Synthetic test pledge.',context:'Synthetic context.',interpretation:'Synthetic criterion.',opportunity:'Synthetic observed opportunity.',explanation:'Synthetic evidence limits.',memberId:'A000370',identityConfirmed:true,conduct:'Aligned action',outcome:'Unknown'}))field(form,key,value);
  form.requestSubmit();assert.equal(document.querySelectorAll('.promise').length,1);assert.match(text(),/Aligned action/);assert.equal(document.querySelector('.promise img'),null);
  click('[data-edit-promise]');form=document.querySelector('#promise-form');assert.equal(form.elements.namedItem('quote').value,'Synthetic test pledge.');field(form,'conduct','Mixed record');form.requestSubmit();assert.match(document.querySelector('.promise').textContent,/Mixed record/);
  nav('coverage');form=document.querySelector('#coverage-form');
  for(const [key,value] of Object.entries({title:'SYNTHETIC test headline',date:'2022-11-16',url:'https://example.org/coverage',note:'Synthetic mapping, not a real article.',sectionKeys:'enr:section-4'}))field(form,key,value);
  form.requestSubmit();assert.match(text(),/SYNTHETIC test headline/);assert.match(text(),/ENR § 4/);
  nav('dossier');input('#case-notes','SYNTHETIC test notebook. Keep uncertainty visible.');click('#save-case');
  const saved=localStorage.getItem(STORAGE_KEY);assert.ok(saved);
  click('#export-button');const exported=await downloads.at(-1).text();const packet=parseImport(exported);assert.equal(packet.research.promises[0].conduct,'Mixed record');assert.equal(packet.research.coverage[0].sectionKeys[0],'enr:section-4');
  await mount(saved);nav('saved');click('[data-open-case]');nav('promises');assert.equal(document.querySelectorAll('.promise').length,1);nav('dossier');assert.equal(document.querySelector('#case-notes').value,'SYNTHETIC test notebook. Keep uncertainty visible.');
  await importCase(exported);assert.match(text(),/Imported file · sources not verified here/);nav('coverage');assert.match(text(),/SYNTHETIC test headline/);
  const oldTitle=document.querySelector('#case-title').textContent;await importCase('{broken');assert.match(document.querySelector('#notice').textContent,/Import failed/);assert.equal(document.querySelector('#case-title').textContent,oldTitle);
  nav('bill');click('[data-section="section-4"]');document.querySelector('.osiris').open=true;click('#ask-osiris');await flush();assert.match(document.querySelector('#osiris-answer').textContent,/Configure an HTTPS bridge/);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('storage failure is visible and does not prevent export',async()=>{
  await mount(null,{storageFailure:true});nav('guide');click('#load-example');await flush();click('#save-case');nav('dossier');assert.match(document.querySelector('#notice').textContent,/could not save/);click('#export-button');assert.equal(parseImport(await downloads.at(-1).text()).dossier.id,fixture.id);dom.window.close();
});

test('source failure stays explicit and a valid import recovers the workbench',async()=>{
  await mount(null,{sourceFailure:true});nav('guide');click('#load-example');await flush();assert.match(text(),/historical example could not be loaded/);await importCase(JSON.stringify(fixture));assert.match(document.querySelector('#case-title').textContent,/Speak Out Act/);nav('bill');assert.equal(document.querySelectorAll('[data-section]').length,5);dom.window.close();
});

async function until(check){for(let i=0;i<100;i++){if(check())return;await new Promise(r=>setTimeout(r,5));}assert.ok(check(),'UI did not reach the expected state');}
test('citizen landing shows real coverage and never automatically opens the historical case',async()=>{
  await mount(null,{live:true});assert.match(text(),/Congressional Accountability/);assert.equal(requests.includes('./data/dossier.json'),false);
  assert.equal(document.querySelector('#case-nav').hidden,true);assert.equal(document.querySelector('#export-button'),null);
  assert.doesNotMatch(document.querySelector('#panel').textContent,/Speak Out Act|Synthetic test/);
  click('[data-open-bill]');await until(()=>document.querySelector('.lead-record'));
  assert.match(text(),/Official source record/);assert.match(text(),/No sourced comparisons supplied/);assert.match(location.hash,/bill=119-/);
  nav('promises');assert.match(text(),/Personal research/);assert.equal(document.querySelectorAll('.promise').length,0);
  assert.match(location.hash,/view=promises/);input('[name="quote"]','SYNTHETIC unfinished quote');nav('congress');nav('promises');assert.equal(document.querySelector('[name="quote"]').value,'SYNTHETIC unfinished quote');assert.deepEqual(errors,[]);
});
test('shared bill URL opens the requested bill without loading any example',async()=>{
  const row=catalogue.bills[0];await mount(null,{live:true,hash:`#bill=${row.id}&view=congress`});
  await until(()=>document.querySelector('.timeline'));
  assert.equal(document.querySelector('#case-title').textContent,row.title);
  assert.equal(requests.includes('./data/dossier.json'),false);assert.match(text(),/Individual votes are not collected/);
  assert.deepEqual(errors,[]);
});
test('a stale or malformed bill link does not substitute a different bill',async()=>{
  await mount(null,{live:true,hash:'#bill=119-hr-99999&view=overview'});await until(()=>document.querySelector('#notice').textContent.includes('not in the current catalogue'));
  assert.equal(document.querySelector('#case-title').textContent,'');assert.equal(requests.includes('./data/dossier.json'),false);
});

test('back navigation returns to the previous view of the selected live bill',async()=>{
  await mount(null,{live:true});click('[data-open-bill]');await until(()=>document.querySelector('.lead-record'));
  const id=document.querySelector('#case-title').textContent;
  nav('promises');assert.match(location.hash,/view=promises/);
  history.back();await until(()=>Boolean(document.querySelector('.lead-record')));
  assert.equal(document.querySelector('#case-title').textContent,id);
});
