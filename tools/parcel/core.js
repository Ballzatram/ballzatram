/* Shared, deterministic research model. A listing claim is evidence to investigate, not ground truth. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ParcelCore = factory();
})(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const VERSION = 1;
  const STORAGE_KEY = 'ballzatram:parcel:workspace:v1';
  const DEFAULT_BRIEF = Object.freeze({
    name: 'New land search', use: 'Equestrian or event site', region: '', origin: '',
    corridor: '', corridorMode: 'off', searchAreas: '',
    minAcres: 1, maxAcres: null, minFlatAcres: null, targetFlatAcres: null,
    preferredDrive: null, maxDrive: 60, purchaseBudget: null, annualLeaseBudget: null,
    tenure: 'either', requireFlat: false, maxSlope: null, requireExpansion: false,
    requireField: false, requireEvents: false, eventGuests: null, notes: ''
  });
  const FACTS = Object.freeze([
    { key: 'region', label: 'Inside the target region', question: 'Check the actual parcel location against the geographic brief.' },
    { key: 'acres', label: 'Total property acres', type: 'number', unit: 'acres', question: 'Obtain parcel IDs, survey boundaries, and total acreage.' },
    { key: 'usableAcres', label: 'Usable acres after exclusions', type: 'number', unit: 'acres', question: 'Subtract wetlands, floodway, easements, steep areas, and other exclusions; do not add this to total acres.' },
    { key: 'flatAcres', label: 'Contiguous usable arena area', type: 'number', unit: 'acres', question: 'Identify one contiguous flat, buildable arena area, including its supporting space.' },
    { key: 'terrain', label: 'Terrain of the usable site', options: [['flat', 'Flat'], ['rolling', 'Rolling / hilly'], ['mixed', 'Mixed terrain']], question: 'Check contours or LiDAR, then a topographic survey. Pasture and a single elevation do not establish flatness.' },
    { key: 'slope', label: 'Maximum slope on proposed footprint', type: 'number', unit: '%', question: 'Document slope across the intended footprint, not average slope over the whole parcel.' },
    { key: 'driveMinutes', label: 'Drive from the brief’s origin', type: 'number', unit: 'minutes', question: 'Record a mapped route from the exact origin at the intended event time, including date and traffic conditions.' },
    { key: 'corridor', label: 'In the preferred corridor', question: 'Check the location relative to the named corridor and distance from its interchange.' },
    { key: 'price', label: 'Purchase asking price', type: 'number', unit: 'USD', question: 'Confirm current asking price and included parcels with the source.' },
    { key: 'annualRent', label: 'Annual ground rent', type: 'number', unit: 'USD/year', question: 'Confirm annual rent, term, renewal, permitted improvements, and expansion rights.' },
    { key: 'expansion', label: 'Expansion area available', question: 'Map usable expansion space or documented adjacent-land rights. Extra gross acreage alone is not proof.' },
    { key: 'field', label: 'Future grass field fits', question: 'Test the field dimensions, runoffs, drainage, and access against the actual parcel shape.' },
    { key: 'events', label: 'Event footprint fits', question: 'Confirm the intended attendance, parking, spectator setbacks, sanitation, and emergency access in a site plan.' },
    { key: 'eventCapacity', label: 'Supported event attendance', type: 'number', unit: 'guests', question: 'Document the site-plan attendance capacity, including parking, sanitation, and emergency access.' },
    { key: 'access', label: 'Legal road and trailer access', question: 'Confirm recorded access and a suitable entrance, turnaround, and emergency route.' },
    { key: 'zoning', label: 'Polo and proposed events permitted', question: 'Obtain written confirmation from the governing jurisdiction for the specific arena, club, and public-event uses.' },
    { key: 'floodClear', label: 'Usable footprint clears flood / wetland constraints', question: 'Overlay the proposed footprint with flood and wetland records; resolve drainage and field conditions on site.' },
    { key: 'water', label: 'Water and servicing feasible', question: 'Check irrigation supply, water, wastewater, power, and site servicing for the proposed use.' }
  ]);
  const YES_NO = [['yes', 'Yes'], ['no', 'No']];
  const STATUS = Object.freeze({ pass: 'Reported fit', fail: 'Conflict', unknown: 'Unresolved' });
  const text = (v, max = 2000) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  function number(v) {
    if (v === '' || v == null) return null;
    if (!['number', 'string'].includes(typeof v) || !Number.isFinite(Number(v)) || Number(v) < 0) throw new Error('Numbers must be finite and zero or greater.');
    return Number(v);
  }
  function url(v) {
    if (!v) return '';
    try { const u = new URL(v); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
  }
  function date(v) {
    const s = text(v, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s ? s : '';
  }
  function age(value, now = new Date()) { return value ? (new Date(now).getTime() - Date.parse(value)) / 86400000 : Infinity; }
  function normalizeBrief(raw = {}) {
    const b = { ...DEFAULT_BRIEF };
    for (const key of ['name', 'use', 'region', 'origin', 'corridor', 'searchAreas', 'notes']) if (raw[key] !== undefined) b[key] = text(raw[key], key === 'notes' ? 4000 : key === 'searchAreas' ? 1000 : 500);
    for (const key of ['minAcres', 'maxAcres', 'minFlatAcres', 'targetFlatAcres', 'preferredDrive', 'maxDrive', 'purchaseBudget', 'annualLeaseBudget', 'maxSlope', 'eventGuests']) if (raw[key] !== undefined) b[key] = number(raw[key]);
    for (const key of ['requireFlat', 'requireExpansion', 'requireField', 'requireEvents']) if (raw[key] !== undefined) { if (typeof raw[key] !== 'boolean') throw new Error('Requirement switches must be true or false.'); b[key] = raw[key]; }
    if (raw.corridorMode !== undefined) b.corridorMode = raw.corridorMode;
    if (raw.tenure !== undefined) b.tenure = raw.tenure;
    if (!['preferred', 'required', 'off'].includes(b.corridorMode) || !['sale', 'lease', 'either'].includes(b.tenure)) throw new Error('Choose a valid corridor or tenure option.');
    if (!b.name || !b.use || !b.region || !b.origin) throw new Error('Add a project name, intended use, target region, and drive origin.');
    if (b.corridorMode !== 'off' && !b.corridor) throw new Error('Name the preferred corridor or turn the corridor preference off.');
    if (!(b.minAcres > 0) || !(b.maxDrive > 0)) throw new Error('Minimum property acreage and maximum drive time must be greater than zero.');
    if (b.maxAcres !== null && b.maxAcres < b.minAcres) throw new Error('Maximum acres must be at least the minimum acres.');
    if (b.preferredDrive !== null && b.preferredDrive > b.maxDrive) throw new Error('Preferred drive time cannot exceed the maximum.');
    if (b.targetFlatAcres !== null && b.minFlatAcres !== null && b.targetFlatAcres < b.minFlatAcres) throw new Error('Target arena area cannot be smaller than its minimum.');
    if (b.maxSlope !== null && b.maxSlope > 100) throw new Error('Slope must be between 0 and 100 percent.');
    if (b.eventGuests !== null && !Number.isInteger(b.eventGuests)) throw new Error('Event attendance must be a whole number.');
    return b;
  }
  function blankFact() { return { value: null, level: 'reported', sourceUrl: '', checkedAt: '', detail: '' }; }
  function normalizeCandidate(raw, { imported = false } = {}) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Each candidate must be an object.');
    const c = {};
    for (const key of ['id', 'title', 'location', 'county', 'parcelId', 'notes', 'routeOrigin', 'routeWhen', 'corridorName', 'regionName', 'assessedUse']) c[key] = text(raw[key], key === 'notes' ? 4000 : 500);
    if (!c.title || !c.location) throw new Error('Each candidate needs a title and an actual location.');
    c.listingUrl = url(raw.listingUrl);
    if (raw.listingUrl && !c.listingUrl) throw new Error('Listing links must be full HTTP or HTTPS URLs.');
    c.capturedAt = date(raw.capturedAt);
    c.listingStatus = ['reported-active', 'under-contract', 'unavailable', 'off-market', 'unknown'].includes(raw.listingStatus) ? raw.listingStatus : 'unknown';
    c.tenure = ['sale', 'lease', 'unknown'].includes(raw.tenure) ? raw.tenure : 'unknown';
    c.shortlisted = !imported && raw.shortlisted === true;
    c.facts = {};
    for (const descriptor of FACTS) {
      const f = raw.facts?.[descriptor.key] || {};
      const value = descriptor.type === 'number' ? number(f.value) : ((descriptor.options || YES_NO).some(([v]) => v === f.value) ? f.value : null);
      const sourceUrl = url(f.sourceUrl);
      if (f.sourceUrl && !sourceUrl) throw new Error(`Invalid source link for ${descriptor.label}.`);
      const checkedAt = date(f.checkedAt);
      const level = !imported && f.level === 'documented' ? 'documented' : 'reported';
      if (level === 'documented' && value !== null && (!sourceUrl || !checkedAt)) throw new Error(`Attach a source URL and date before marking ${descriptor.label} documented.`);
      c.facts[descriptor.key] = { value, level, sourceUrl, checkedAt, detail: text(f.detail, 1000) };
    }
    const v = key => c.facts[key].value;
    if (v('usableAcres') !== null && v('acres') !== null && v('usableAcres') > v('acres')) throw new Error('Usable acres cannot exceed total acres.');
    if (v('flatAcres') !== null && v('acres') !== null && v('flatAcres') > v('acres')) throw new Error('The arena area cannot exceed total acres.');
    if (v('flatAcres') !== null && v('usableAcres') !== null && v('flatAcres') > v('usableAcres')) throw new Error('The arena area cannot exceed usable acres.');
    if (v('slope') !== null && v('slope') > 100) throw new Error('Slope must be between 0 and 100 percent.');
    if (v('eventCapacity') !== null && !Number.isInteger(v('eventCapacity'))) throw new Error('Event capacity must be a whole number.');
    c.id = c.id || `candidate-${Math.random().toString(36).slice(2, 12)}`;
    return c;
  }
  function canonicalUrl(value) {
    const safe = url(value); if (!safe) return '';
    const u = new URL(safe); u.hash = '';
    for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
    return u.href.replace(/\/$/, '');
  }
  function sameCandidate(a, b) {
    return !!(a.listingUrl && b.listingUrl && canonicalUrl(a.listingUrl) === canonicalUrl(b.listingUrl)) ||
      !!(a.parcelId && a.county && b.parcelId && b.county && a.parcelId.toLowerCase() === b.parcelId.toLowerCase() && a.county.toLowerCase() === b.county.toLowerCase());
  }
  function evaluate(c, brief, now = new Date()) {
    const b = normalizeBrief(brief), checks = [];
    function check(key, label, condition, required = true, explicitUnknown = false) {
      const f = c.facts[key] || blankFact();
      const stale = f.value !== null && age(f.checkedAt, now) > (['driveMinutes', 'price', 'annualRent'].includes(key) ? 30 : 180);
      const future = f.checkedAt && age(f.checkedAt, now) < -1;
      let state = f.value === null || explicitUnknown ? 'unknown' : condition(f.value) ? 'pass' : 'fail';
      // A known conflict is retained until corrected. Old positive claims need rechecking.
      if (state === 'pass' && (stale || future || !f.sourceUrl)) state = 'unknown';
      checks.push({ key, label, state, required, documented: state !== 'unknown' && f.level === 'documented', stale,
        detail: f.value === null ? 'No evidence entered.' : explicitUnknown ? 'The recorded region, use, or travel context does not match this brief.' : !f.sourceUrl ? 'Source link needed.' : !f.checkedAt ? 'Source date needed.' : future ? 'Source date is in the future.' : stale ? 'Source needs rechecking.' : f.level === 'documented' ? 'User documented; independent approval still required.' : 'Source-reported; not independently verified.',
        question: FACTS.find(x => x.key === key)?.question || '' });
    }
    check('region', `Inside ${b.region}`, v => v === 'yes', true, c.regionName.toLowerCase() !== b.region.toLowerCase());
    check('acres', `At least ${b.minAcres} total acres${b.maxAcres !== null ? `; no more than ${b.maxAcres}` : ''}`, v => v >= b.minAcres && (b.maxAcres === null || v <= b.maxAcres));
    if (b.minFlatAcres > 0) check('flatAcres', `At least ${b.minFlatAcres} contiguous usable arena acres`, v => v >= b.minFlatAcres);
    if (b.requireFlat) check('terrain', 'Flat usable site; no rolling hills', v => v === 'flat');
    if (b.maxSlope !== null) check('slope', `Footprint slope ≤ ${b.maxSlope}% (your screening threshold)`, v => v <= b.maxSlope);
    check('driveMinutes', `Drive ≤ ${b.maxDrive} minutes from ${b.origin}`, v => v <= b.maxDrive, true,
      c.routeOrigin.toLowerCase() !== b.origin.toLowerCase() || !c.routeWhen);
    if (b.corridorMode !== 'off') check('corridor', `${b.corridorMode === 'required' ? 'Required' : 'Preferred'}: ${b.corridor}`, v => v === 'yes', b.corridorMode === 'required', c.corridorName.toLowerCase() !== b.corridor.toLowerCase());
    if (c.tenure === 'sale' && b.purchaseBudget !== null) check('price', `Purchase asking ≤ ${money(b.purchaseBudget)}`, v => v <= b.purchaseBudget);
    if (c.tenure === 'lease' && b.annualLeaseBudget !== null) check('annualRent', `Annual rent ≤ ${money(b.annualLeaseBudget)}`, v => v <= b.annualLeaseBudget);
    if (c.tenure === 'unknown' && (b.purchaseBudget !== null || b.annualLeaseBudget !== null)) checks.push({ key: 'budget', label: 'Transaction type and applicable budget', state: 'unknown', required: true, question: 'Confirm sale or lease terms before comparing cost.' });
    if (b.requireExpansion) check('expansion', 'Room for expansion', v => v === 'yes');
    if (b.requireField) check('field', 'Future grass polo field and runoffs fit', v => v === 'yes');
    if (b.requireEvents) {
      check('events', `Event layout${b.eventGuests ? ` for ${b.eventGuests} guests` : ' (capacity to define)'}`, v => v === 'yes', true, c.assessedUse.toLowerCase() !== b.use.toLowerCase());
      if (b.eventGuests !== null) check('eventCapacity', `Capacity for ${b.eventGuests} guests`, v => v >= b.eventGuests);
      else checks.push({ key: 'eventCapacity', label: 'Define event attendance in the brief', state: 'unknown', required: true, question: 'Agree the expected attendance before confirming event-site fit.' });
    }
    for (const key of ['access', 'zoning', 'floodClear', 'water']) check(key, FACTS.find(f => f.key === key).label, v => v === 'yes', true, ['zoning', 'water'].includes(key) && c.assessedUse.toLowerCase() !== b.use.toLowerCase());
    if (b.tenure !== 'either') checks.push({ key: 'tenure', label: b.tenure === 'sale' ? 'Available to purchase' : 'Available to lease', state: c.tenure === 'unknown' ? 'unknown' : c.tenure === b.tenure ? 'pass' : 'fail', required: true, question: 'Confirm the offered transaction type.' });
    const freshListing = age(c.capturedAt, now) <= 30 && age(c.capturedAt, now) >= -1;
    checks.push({ key: 'availability', label: 'Availability reconfirmed within 30 days', state: c.listingStatus === 'unavailable' ? 'fail' : c.listingStatus === 'reported-active' && freshListing && c.listingUrl ? 'pass' : 'unknown', required: true, question: 'Ask the broker or owner whether this exact property is available; a working link does not prove availability.' });
    const required = checks.filter(x => x.required), failed = required.filter(x => x.state === 'fail'), unresolved = required.filter(x => x.state === 'unknown');
    const passed = required.filter(x => x.state === 'pass').length;
    const verdict = failed.length ? 'conflict' : unresolved.length ? 'research' : 'promising';
    return { checks, failed, unresolved, passed, total: required.length, verdict,
      label: { conflict: 'Conflicts with brief', research: 'Needs research', promising: 'Promising · verify on site' }[verdict],
      evidenceCount: required.filter(x => x.documented).length,
      nextQuestions: [...failed, ...unresolved].map(x => x.question).filter(Boolean) };
  }
  function money(n) { return n === null || n === undefined ? 'Not set' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n); }
  function factText(c, key) {
    const f = c.facts[key]; if (!f || f.value === null) return 'Unknown';
    const d = FACTS.find(x => x.key === key);
    if (['price', 'annualRent'].includes(key)) return money(f.value) + (key === 'annualRent' ? '/year' : '');
    return d.type === 'number' ? `${f.value} ${d.unit}` : (d.options || YES_NO).find(([v]) => v === f.value)?.[1] || String(f.value);
  }
  function researchPlan(brief) {
    if (!brief.region || !brief.origin) return [];
    const b = normalizeBrief(brief);
    const areas = b.searchAreas.split(/[\n;]/).map(x => x.trim()).filter(Boolean).slice(0, 12);
    return (areas.length ? areas : [b.region]).map(area => {
      const query = `${area} ${b.minAcres}+ acres ${b.tenure === 'lease' ? 'land for lease' : b.tenure === 'sale' ? 'land for sale' : 'land for sale or lease'} ${b.requireFlat ? 'level pasture flat' : ''} ${b.use}`.trim();
      const search = q => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
      return { area, query, search: search(query), listings: search(`${query} (site:landsearch.com OR site:land.com OR site:landwatch.com)`),
        records: search(`${area} county GIS parcel zoning map`), map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(area)}`,
        note: 'Search area only. Acreage, terrain, and drive time still need property-level evidence.' };
    });
  }
  function routeUrl(c, b) { return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(b.origin)}&destination=${encodeURIComponent(c.location)}&travelmode=driving`; }
  function workspace(brief, candidates = []) { return { kind: 'parcel-workspace', schemaVersion: VERSION, brief: brief ? normalizeBrief(brief) : { ...DEFAULT_BRIEF }, candidates, draft: !brief }; }
  function parseImport(value) {
    if (!value || typeof value !== 'object' || value.schemaVersion !== VERSION || !['parcel-workspace', 'parcel-research'].includes(value.kind)) throw new Error('Use a Parcel workspace or research JSON file with schemaVersion 1.');
    if (!Array.isArray(value.candidates) || value.candidates.length > 100) throw new Error('Import up to 100 candidates at a time.');
    const isWorkspace = value.kind === 'parcel-workspace';
    if (isWorkspace && (!value.brief || typeof value.brief !== 'object')) throw new Error('Workspace brief is missing.');
    const candidates = value.candidates.map(c => normalizeCandidate(c, { imported: !isWorkspace }));
    if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw new Error('Candidate IDs must be unique within a file.');
    return { kind: value.kind, schemaVersion: VERSION, brief: isWorkspace ? normalizeBrief(value.brief) : undefined, candidates };
  }
  function mergeCandidates(existing, incoming) {
    const candidates = [...existing]; let added = 0;
    for (const c of incoming) if (!candidates.some(item => sameCandidate(item, c))) {
      if (candidates.length >= 100) throw new Error('This workspace holds up to 100 candidates. Export a backup and start another workspace.');
      // Imported IDs are never allowed to shadow an existing record.
      candidates.push({ ...c, id: `candidate-${Math.random().toString(36).slice(2, 12)}` }); added++;
    }
    return { candidates, added, skipped: incoming.length - added };
  }
  function memo(state, now = new Date()) {
    const b = state.brief, selected = state.candidates.filter(c => c.shortlisted), candidates = selected.length ? selected : state.candidates;
    const lines = [`# ${b.name}`, '', `Research memo · ${new Date(now).toISOString().slice(0, 10)}`, '',
      `Use: ${b.use}. Region: ${b.region}.`, `Property: ${b.minAcres}+ acres${b.maxAcres !== null ? `, maximum ${b.maxAcres}` : ''}. Arena area: ${b.minFlatAcres ?? 'unset'} acres minimum; ${b.targetFlatAcres ?? 'unset'} acres target within the property.`,
      `Terrain: ${b.requireFlat ? 'flat, without rolling hills' : 'flexible'}${b.maxSlope !== null ? `; maximum footprint slope ${b.maxSlope}% (user threshold, not an engineering standard)` : ''}.`,
      `Drive: preferred ${b.preferredDrive ?? 'unset'} minutes; maximum ${b.maxDrive} minutes from ${b.origin}.`,
      `Corridor: ${b.corridor} (${b.corridorMode}). Purchase budget: ${money(b.purchaseBudget)}. Annual lease budget: ${money(b.annualLeaseBudget)}. Tenure: ${b.tenure}.`,
      `Expansion: ${b.requireExpansion ? 'required' : 'optional'}. Future grass field: ${b.requireField ? 'required' : 'optional'}. Events: ${b.requireEvents ? 'required' : 'optional'}; guests: ${b.eventGuests ?? 'to define'}.`, b.notes, '',
      '## Land-use fit', 'USPA playing dimensions: arena 300 × 150 ft (about 1.03 acres); outdoor grass field 300 × 160 yd (about 9.92 acres). Playing dimensions exclude runoffs, servicing, parking, stabling, and setbacks. An arena area alone does not establish that a full venue fits.', 'Source: https://www.uspolo.org/sport/rules', '',
      `## ${selected.length ? 'Shortlist' : 'Research leads'} (${candidates.length})`,
      'Source snapshots and user entries are not independent verification. No property is an approved acquisition. Unknown evidence is never treated as a pass.'];
    if (!candidates.length) lines.push('', 'No candidate properties saved yet.');
    for (const c of candidates) {
      const a = evaluate(c, b, now);
      lines.push('', `### ${c.title}`, c.location, `Disposition: ${a.label}; ${a.passed}/${a.total} required checks have a current reported fit.`, `Listing: ${c.listingUrl || 'Unknown'} · ${c.listingStatus} · captured ${c.capturedAt || 'undated'}.`, `Parcel: ${c.parcelId || 'Unknown'} · County: ${c.county || 'Unknown'}.`, `Route origin: ${c.routeOrigin || 'Unknown'}; travel context: ${c.routeWhen || 'Unknown'}.`, `Corridor assessed: ${c.corridorName || 'Unknown'}.`, c.notes, '', 'Evidence:');
      for (const d of FACTS) { const f = c.facts[d.key]; lines.push(`- ${d.label}: ${factText(c, d.key)}. ${f.level}; ${f.checkedAt || 'undated'}; ${f.sourceUrl || 'source missing'}. ${f.detail}`); }
      lines.push('', 'Screening:');
      for (const x of a.checks) lines.push(`- ${STATUS[x.state]}: ${x.label}${x.required ? '' : ' (preference)'}. ${x.detail || ''}`);
      lines.push('', 'Next diligence:', ...a.nextQuestions.map(q => `- ${q}`));
    }
    return lines.join('\n');
  }
  function aiContext(state) {
    const selected = state.candidates.filter(c => c.shortlisted);
    // One explicitly chosen shortlist, otherwise the brief alone; never all browser storage.
    const context = { schemaVersion: VERSION, brief: state.brief, searchPlan: researchPlan(state.brief), selectedCandidates: selected,
      limitations: 'Source claims are unverified. Do not infer terrain, usable acreage, zoning, or drive time from a title. Do not contact owners or change records.',
      returnFormat: { kind: 'parcel-research', schemaVersion: VERSION, candidates: [{ title: 'Property name', location: 'Actual address / town / state', listingUrl: 'https://source.example/property', capturedAt: 'YYYY-MM-DD', listingStatus: 'unknown', tenure: 'unknown', county: '', parcelId: '', routeOrigin: '', routeWhen: '', corridorName: '', regionName: '', assessedUse: '', notes: 'What the source says and what is missing', facts: Object.fromEntries(FACTS.map(f => [f.key, blankFact()])) }] },
      factValues: { numbers: 'Number or null; never an estimated value without labeling and sourcing it.', terrain: 'flat, rolling, mixed, or null', otherFacts: 'yes, no, or null', level: 'reported', checkedAt: 'YYYY-MM-DD when you read the source; describe cached or older source data in detail.' } };
    if (JSON.stringify(context).length > 23000) throw new Error('This shortlist is too large for one AI handoff. Select fewer properties or export the full workspace.');
    return context;
  }
  return Object.freeze({ VERSION, STORAGE_KEY, DEFAULT_BRIEF, FACTS, YES_NO, STATUS, normalizeBrief, normalizeCandidate, blankFact, url, date, age, evaluate, money, factText, researchPlan, routeUrl, workspace, parseImport, mergeCandidates, sameCandidate, memo, aiContext });
});
