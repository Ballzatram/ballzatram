export const WATCH_KEY = 'ballzatram:observatory:watchlist:v1';
export const CATALOGUE_KEY = 'ballzatram:observatory:catalogue:v1';
export const BILL_ID = /^\d{3}-(hr|s)-[1-9]\d{0,4}$/;
const validTime = value => typeof value === 'string' && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const string = (value, max=20000) => typeof value === 'string' && value.length <= max;
export function validateCatalogue(value) {
  if (!value || value.schemaVersion !== 1 || !Number.isInteger(value.congress) || !validTime(value.generatedAt) || !Array.isArray(value.bills) || !Array.isArray(value.failures)) throw new Error('Unsupported bill catalogue.');
  if (value.lastSuccessfulDiscoveryAt !== null && !validTime(value.lastSuccessfulDiscoveryAt)) throw new Error('Invalid source discovery time.');
  if (!Number.isInteger(value.discoveredCount) || value.discoveredCount < value.bills.length || value.bills.length > 30000) throw new Error('Invalid catalogue coverage counts.');
  const ids = new Set();
  for (const bill of value.bills) {
    if (!BILL_ID.test(bill.id) || ids.has(bill.id) || bill.congress !== value.congress || !string(bill.title,3000) || !bill.title || !['House','Senate'].includes(bill.chamber)) throw new Error('Invalid or duplicate bill.');
    ids.add(bill.id);
    for(const key of ['billLabel','topic','sponsor','status']) if(!string(bill[key],1000)) throw new Error('Invalid bill metadata.');
    if(bill.activityCheckedAt && !validTime(bill.activityCheckedAt)) throw new Error('Invalid activity check time.');
    if(!validTime(bill.checkedAt) || !validTime(bill.sourceUpdatedAt) || !validTime(bill.sourceModifiedAt)) throw new Error('Invalid bill timestamp.');
    if(!/^[a-f0-9]{64}$/.test(bill.fingerprint) || !/^[a-f0-9]{64}$/.test(bill.detailSha256)) throw new Error('Invalid record fingerprint.');
    if(bill.detailPath !== `bills/${bill.id}-${bill.fingerprint.slice(0,16)}.json`) throw new Error('Unsafe bill detail path.');
    const [congress,type,number]=bill.id.split('-');
    if(bill.sourceUrl !== `https://www.govinfo.gov/bulkdata/BILLSTATUS/${congress}/${type}/BILLSTATUS-${congress}${type}${number}.xml`) throw new Error('Unexpected bill source.');
    if(!['ok','refresh_failed'].includes(bill.health) || !bill.latestAction || !/^\d{4}-\d{2}-\d{2}$/.test(bill.latestAction.date) || !string(bill.latestAction.text)) throw new Error('Invalid activity record.');
    for(const key of ['actionCount','textVersionCount','parsedVersionCount'])if(!Number.isInteger(bill[key])||bill[key]<0)throw new Error('Invalid bill counts.');
  }
  return value;
}
export function baseline(bill) {
  return {fingerprint:bill.fingerprint,actionDate:bill.latestAction.date,actionText:bill.latestAction.text,actionCount:bill.actionCount,textVersionCount:bill.textVersionCount,status:bill.status};
}
export function validateWatchlist(value) {
  if(!value || value.schemaVersion!==1 || !Array.isArray(value.bills) || value.bills.length>100)throw new Error('Invalid watchlist.');
  const ids=new Set();
  for(const item of value.bills){
    if(!BILL_ID.test(item.id)||ids.has(item.id)||!validTime(item.followedAt)||!item.seen||!/^[a-f0-9]{64}$/.test(item.seen.fingerprint))throw new Error('Invalid followed bill.');
    ids.add(item.id);
  }
  return value;
}
export function followBill(list,bill,timestamp=new Date().toISOString()) {
  if(list.bills.some(x=>x.id===bill.id))return list;
  if(list.bills.length>=100)throw new Error('This browser can follow up to 100 bills.');
  return {...list,bills:[...list.bills,{id:bill.id,title:bill.title,followedAt:timestamp,seen:baseline(bill)}]};
}
export function markSeen(list,bill) {return {...list,bills:list.bills.map(x=>x.id===bill.id?{...x,seen:baseline(bill)}:x)};}
export function changesSince(bill,watch) {
  if(!watch || watch.seen.fingerprint===bill.fingerprint)return [];
  const before=watch.seen,changes=[];
  if(before.actionDate!==bill.latestAction.date || before.actionText!==bill.latestAction.text || before.actionCount!==bill.actionCount)changes.push('Legislative activity updated');
  if(before.textVersionCount!==bill.textVersionCount)changes.push('Text versions updated');
  if(before.status!==bill.status)changes.push('Stage updated');
  return changes.length?changes:['Official record updated'];
}
export function freshness(bill,time=Date.now()) {
  if(bill.health==='refresh_failed')return 'Refresh failed';
  if(time-Date.parse(bill.activityCheckedAt||bill.checkedAt)>12*3600000)return 'Check overdue';
  return 'Checked recently';
}
export function filterBills(bills,{query='',chamber='All chambers',status='All stages',followedOnly=false}={},watch={bills:[]}) {
  const ids=new Set(watch.bills.map(x=>x.id));
  const normalize=s=>s.toLowerCase().replace(/[.]/g,'').replace(/\s+/g,' ').trim();
  const terms=normalize(query).split(' ').filter(Boolean);
  return bills.filter(b=>{
    const search=normalize(`${b.title} ${b.billLabel} ${b.topic} ${b.sponsor} ${b.id}`);
    return terms.every(t=>search.includes(t))&&(chamber==='All chambers'||chamber===b.chamber)&&(status==='All stages'||status===b.status)&&(!followedOnly||ids.has(b.id));
  });
}
