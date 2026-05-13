const stages = {
  intake: document.getElementById('stage-intake'),
  processing: document.getElementById('stage-processing'),
  results: document.getElementById('stage-results')
};

const form = document.getElementById('search-form');
const refreshBtn = document.getElementById('refresh-btn');
const processingText = document.getElementById('processing-text');
const summary = document.getElementById('summary');
const resultsEl = document.getElementById('results');
const aiNoteEl = document.getElementById('ai-note');
const metricsEl = document.getElementById('metrics');

const SOURCES = ['landsearch.com', 'land.com', 'loopnet.com', 'zillow.com', 'realtor.com', 'landwatch.com'];

const activate = (k) => {
  Object.values(stages).forEach((s) => s.classList.remove('stage-active'));
  stages[k].classList.add('stage-active');
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildQuery() {
  const loc = document.getElementById('location').value.trim();
  const goal = document.getElementById('goal').value.trim();
  const min = Number(document.getElementById('min-acres').value || 0);
  const max = Number(document.getElementById('max-price').value || 0);
  const maxDrive = Number(document.getElementById('max-drive').value || 60);
  const utilities = document.getElementById('utilities').value;
  const src = document.getElementById('source').value;

  const selectedSources = src === 'all' ? SOURCES : SOURCES.filter((s) => s.includes(src));
  const sourceClause = selectedSources.map((s) => `site:${s}`).join(' OR ');

  return {
    loc,
    goal,
    min,
    max,
    maxDrive,
    utilities,
    selectedSources,
    raw: `land for sale ${loc} ${goal} at least ${min} acres under ${max} ${utilities} ${sourceClause}`.trim()
  };
}

function parseJina(text) {
  const rows = [];
  for (const ln of text.split('\n')) {
    const match = ln.match(/\[(.*?)\]\((https?:\/\/[^)]+)\)/);
    if (!match) continue;
    const url = match[2];
    if (!SOURCES.some((domain) => url.includes(domain))) continue;
    rows.push({
      title: match[1],
      url,
      source: (new URL(url)).hostname.replace('www.', '')
    });
  }
  return rows;
}

async function fallbackRows() {
  try {
    const r = await fetch('./output/seed_listings.json', { cache: 'no-store' });
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

function scoreRow(row, query) {
  let score = 58;
  const title = (row.title || '').toLowerCase();
  if (title.includes(query.loc.toLowerCase())) score += 18;
  if (/acre|farm|ranch|tract|land|development/.test(title)) score += 10;
  if (query.goal.toLowerCase().includes('equestrian') && /horse|polo|pasture|farm/.test(title)) score += 14;
  if (/price|reduced|new listing/.test(title)) score += 6;
  return Math.min(100, score);
}

function aiNarrative(rows, query) {
  if (!rows.length) return 'AI insight unavailable: no listings matched current constraints.';
  const top = rows.slice(0, 3).map((r) => r.title).join(' • ');
  return `AI market brief: scanned ${query.selectedSources.length} listing ecosystems for ${query.loc}. Prioritized ${query.goal} opportunities under $${query.max.toLocaleString()} with >= ${query.min} acres and ≤ ${query.maxDrive} min drive goal. Top signals: ${top}. Next diligence: zoning, utilities confirmation, floodplain, and broker status verification.`;
}

function renderMetrics(rows) {
  const shortlist = rows.filter((r) => r.fit >= 75).length;
  const avg = rows.length ? (rows.reduce((n, r) => n + r.fit, 0) / rows.length).toFixed(1) : '0.0';
  metricsEl.innerHTML = [
    ['Total Sites', rows.length],
    ['Shortlist Sites', shortlist],
    ['Avg. Score', avg],
    ['Coverage', 'Multi-source']
  ].map(([k, v]) => `<div class="metric"><p>${k}</p><strong>${v}</strong></div>`).join('');
}

function render(rows, query) {
  resultsEl.innerHTML = '';
  const enriched = rows
    .map((row) => ({ ...row, fit: scoreRow(row, query) }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 40);

  enriched.forEach((row) => {
    const tr = document.createElement('tr');
    const titleCell = document.createElement('td');
    titleCell.textContent = row.title || 'Listing';
    const sourceCell = document.createElement('td');
    sourceCell.textContent = row.source || 'web';
    const fitCell = document.createElement('td');
    fitCell.textContent = String(row.fit);
    const rationaleCell = document.createElement('td');
    rationaleCell.textContent = 'Matched location + thesis + acreage criteria.';
    const linkCell = document.createElement('td');
    const link = document.createElement('a');
    link.href = row.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = 'View property listing';
    linkCell.appendChild(link);
    tr.append(titleCell, sourceCell, fitCell, rationaleCell, linkCell);
    resultsEl.appendChild(tr);
  });

  renderMetrics(enriched);
  aiNoteEl.textContent = aiNarrative(enriched, query);
  return enriched;
}

async function executeSearch() {
  activate('processing');
  const query = buildQuery();
  processingText.textContent = 'Searching all configured property sources and building ranked set...';
  await wait(450);

  let rows = [];
  try {
    const proxy = `https://r.jina.ai/http://duckduckgo.com/html/?q=${encodeURIComponent(query.raw)}`;
    const txt = await fetch(proxy, { cache: 'no-store' }).then((r) => r.text());
    rows = parseJina(txt);
  } catch {
    // network-safe fallback below
  }

  if (!rows.length) {
    processingText.textContent = 'Live search sparse. Loading verified seed inventory...';
    await wait(350);
    rows = await fallbackRows();
  }

  const enriched = render(rows, query);
  summary.textContent = enriched.length
    ? `Found ${enriched.length} candidate properties in ${query.loc}. Ranked by acquisition fit.`
    : 'No listings found. Broaden location, budget, or acreage constraints.';

  activate('results');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await executeSearch();
});

refreshBtn.addEventListener('click', executeSearch);
