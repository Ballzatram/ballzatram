// Validate the whole generated publication before a Pages deployment.
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {validateCatalogue} from './tracker-core.mjs';
import {validateDossier} from './core.mjs';
const root=path.resolve(process.argv[2]||'tools/observatory/live');
const index=validateCatalogue(JSON.parse(readFileSync(path.join(root,'index.json'),'utf8')));
for(const bill of index.bills){
  const raw=readFileSync(path.join(root,bill.detailPath));
  if(createHash('sha256').update(raw).digest('hex')!==bill.detailSha256)throw Error(`Detail fingerprint mismatch: ${bill.id}`);
  const detail=validateDossier(JSON.parse(raw));
  if(detail.tracker.billId!==bill.id||detail.id!==`${bill.id}@${bill.fingerprint.slice(0,16)}`||detail.tracker.status!==bill.status)throw Error(`Bill identity or stage mismatch: ${bill.id}`);
  if(bill.parserRevision===2){
    const identity=['evidence-v2',...detail.sources.map(s=>[s.id,s.sha256]).sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0)];
    if(createHash('sha256').update(JSON.stringify(identity)).digest('hex')!==bill.fingerprint)throw Error(`Evidence identity mismatch: ${bill.id}`);
  }
  for(const source of detail.sources){
    if(!/^live\/snapshots\/[a-f0-9]{64}\.xml$/.test(source.path))throw Error('Unsafe snapshot path');
    const bytes=readFileSync(path.join(root,source.path.slice(5)));
    if(createHash('sha256').update(bytes).digest('hex')!==source.sha256)throw Error(`Snapshot fingerprint mismatch: ${bill.id}`);
  }
}
console.log(`Validated ${index.bills.length} automatically indexed bills and source snapshots.`);
