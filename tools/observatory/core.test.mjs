import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateDossier,validateResearch,emptyResearch,parseImport,compareVersions,wordDiff,exportWorkspace,safeUrl,evidenceContext} from './core.mjs';
const fixture=JSON.parse(readFileSync(new URL('./data/dossier.json',import.meta.url),'utf8'));
const copy=()=>structuredClone(fixture);
test('real case parses and official snapshots match their fingerprints',()=>{
  validateDossier(copy());
  for(const source of fixture.sources)assert.equal(createHash('sha256').update(readFileSync(new URL(source.path,import.meta.url))).digest('hex'),source.sha256);
  assert.equal(fixture.rollcall.members.length,432);
  assert.deepEqual(fixture.rollcall.totals,{Yea:315,Nay:109,'Not Voting':8});
});
test('genuine version changes are detected; unchanged sections stay visible',()=>{
  const rows=compareVersions(...fixture.versions);
  assert.deepEqual(rows.filter(r=>r.status==='Changed').map(r=>r.after.number),['2','3','4']);
  assert.equal(rows.filter(r=>r.status==='Unchanged').length,2);
});
test('diff can reproduce both original token streams',()=>{
  const before='the dispute arises after the agreement',after='the claim is filed after the agreement';
  const diff=wordDiff(before,after);
  assert.equal(diff.filter(x=>x.kind!=='add').map(x=>x.text).join(' '),before);
  assert.equal(diff.filter(x=>x.kind!=='remove').map(x=>x.text).join(' '),after);
  assert.equal(wordDiff('x '.repeat(600),'y '.repeat(600)),null);
});
test('removed, added and duplicate-number sections do not silently reconcile',()=>{
  const before=structuredClone(fixture.versions[0]),after=structuredClone(fixture.versions[1]);
  after.sections[0].number='9';
  assert.equal(compareVersions(before,after).filter(x=>x.status.includes('unmatched')).length,2);
  before.sections[1].number='3';
  assert.equal(compareVersions(before,after).filter(x=>x.before?.number==='3'&&x.after).length,0);
});
for(const [label,mutate] of [
  ['orphan source',d=>d.versions[0].sections[0].sourceId='absent'],
  ['duplicate source',d=>d.sources.push(d.sources[0])],
  ['duplicate member',d=>d.rollcall.members.push(d.rollcall.members[0])],
  ['incorrect totals',d=>d.rollcall.totals.Yea=300],
  ['silent section loss',d=>d.versions[0].sections.pop()],
  ['script URL',d=>d.sources[0].url='javascript:alert(1)'],
  ['fake publication',d=>d.mode='publication'],
  ['real source labeled demo',d=>d.mode='demo'],
  ['malformed hash',d=>d.sources[0].sha256='123'],
  ['orphan action',d=>d.actions[0].sourceId='absent']
])test(`reject ${label}`,()=>{const d=copy();mutate(d);assert.throws(()=>validateDossier(d));});
const promise=()=>({id:'synthetic-promise',person:'Synthetic test person',quote:'Synthetic pledge for testing only.',context:'Synthetic transcript context.',date:'2022-08-01',url:'https://example.org/fixture',interpretation:'Synthetic measurable criterion.',opportunity:'Synthetic opportunity note.',explanation:'Synthetic contrary-evidence note.',conduct:'Pending',outcome:'Unknown',actionIds:[],memberId:''});
test('promise conduct and policy outcome remain independent on export/import',()=>{
  const research=emptyResearch();const p=promise();p.conduct='Contrary action';p.outcome='Achieved';p.memberId=fixture.rollcall.members[0].id;research.promises.push(p);research.notes='Preserve gaps.';
  const loaded=parseImport(exportWorkspace(fixture,research));assert.deepEqual(loaded.research,research);
});
test('an action assessment needs evidence, and missing opportunity context fails',()=>{
  const r=emptyResearch(),p=promise();r.promises.push(p);p.conduct='Aligned action';assert.throws(()=>validateResearch(r,fixture));
  p.actionIds=[fixture.actions[0].id];validateResearch(r,fixture);p.opportunity='';assert.throws(()=>validateResearch(r,fixture));
});
test('a vote is never promoted into an automatic promise assessment',()=>{
  const r=emptyResearch(),p=promise();p.memberId=fixture.rollcall.members[0].id;r.promises.push(p);validateResearch(r,fixture);assert.equal(p.conduct,'Pending');assert.equal(p.outcome,'Unknown');
});
test('coverage references exact version sections; unknown mappings fail',()=>{
  const r=emptyResearch();r.coverage.push({id:'test',title:'Synthetic fixture',url:'https://example.org/fixture',date:'2022-11-16',kind:'Headline',note:'Synthetic mapping.',sectionKeys:['enr:section-4']});
  validateResearch(r,fixture);r.coverage[0].sectionKeys=['enr:missing'];assert.throws(()=>validateResearch(r,fixture));
});
test('import bounds and links fail closed',()=>{
  assert.throws(()=>parseImport('x'.repeat(4_000_001)));assert.throws(()=>parseImport('{'));
  for(const url of ['javascript:alert(1)','data:text/html,hi','https://user:secret@example.org','http://example.org'])assert.equal(safeUrl(url),'');
});
test('Osiris only receives selected evidence, bounded text, and no workspace credentials',()=>{
  const v=fixture.versions[1],s=structuredClone(v.sections[0]);s.text='x'.repeat(18000);
  const context=evidenceContext(fixture,v,s);assert.equal(context.section.text.length,15000);assert.match(context.scope,/truncated/);assert.ok(!('research' in context));assert.ok(!('token' in context));
});
