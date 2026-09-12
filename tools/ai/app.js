(() => {
  const SETTINGS_KEY = 'ballzatram:ai-bridge-settings:v1';
  const RUN_KEYS = {
    portfolio: 'ballzatram:portfolio-pages-last-run:v1',
    scenario: 'ballzatram:scenario-pages-last-run:v1',
    supplyDemand: 'ballzatram:supply-demand-last-run:v1',
    report: 'ballzatram:pages-report-draft:v1'
  };
  const $ = id => document.getElementById(id);
  const stored = BallzatramStorage.read(SETTINGS_KEY);
  let settings = stored && typeof stored === 'object' ? stored : {};
  $('bridgeUrl').value = typeof settings.url === 'string' ? settings.url : '';
  $('accessToken').value = typeof settings.token === 'string' ? settings.token : '';

  function bridgeUrl(value) {
    const url = new URL(value);
    const local = ['localhost', '127.0.0.1'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash) {
      throw new Error('Use an HTTPS bridge URL without credentials, a query, or a fragment.');
    }
    return url.href.replace(/\/$/, '');
  }

  function saveSettings() {
    try {
      const url = bridgeUrl($('bridgeUrl').value.trim());
      const token = $('accessToken').value.trim();
      if (!token) throw new Error('Enter your personal access token.');
      settings = { url, token };
      $('status').textContent = BallzatramStorage.write(SETTINGS_KEY, settings)
        ? 'Saved in this browser.' : 'Storage is unavailable. Settings will work for this session only.';
    } catch (error) { $('status').textContent = error.message; }
  }

  function selectedContext() {
    const kind = $('contextSelect').value;
    if (kind === 'all') return Object.fromEntries(Object.entries(RUN_KEYS)
      .map(([name, key]) => [name, BallzatramStorage.read(key)]).filter(([, value]) => value));
    return Object.hasOwn(RUN_KEYS, kind) ? BallzatramStorage.read(RUN_KEYS[kind]) : null;
  }
  const hasContext = value => value && typeof value === 'object' && Object.keys(value).length > 0;
  function renderContextStatus() {
    $('contextStatus').textContent = hasContext(selectedContext()) ? 'Saved context found in this browser.' : 'No saved context found. Run that lab first.';
  }

  async function request(path, options = {}) {
    const base = bridgeUrl(settings.url);
    const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(30000), redirect: 'error' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Bridge error ${response.status}`);
    return payload;
  }

  async function testBridge() {
    if (!settings.url) { $('status').textContent = 'Save a bridge URL first.'; return; }
    $('testBridge').disabled = true;
    $('status').textContent = 'Connecting…';
    try { const result = await request('/health'); $('status').textContent = `Bridge online · ${result.model || 'model configured'}`; }
    catch (error) { $('status').textContent = `Could not reach bridge: ${error.message}`; }
    finally { $('testBridge').disabled = false; }
  }

  async function ask() {
    const prompt = $('prompt').value.trim();
    const context = selectedContext();
    if (!settings.url || !settings.token) { $('answer').textContent = 'Configure and save the bridge first.'; return; }
    if (!prompt) { $('answer').textContent = 'Enter a question.'; return; }
    if (!hasContext(context)) { $('answer').textContent = 'No saved context is available. Run a lab first.'; return; }
    $('askButton').disabled = true;
    $('answer').textContent = 'Thinking…';
    try {
      const result = await request('/v1/assist', {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${settings.token}` },
        body: JSON.stringify({ tool: $('contextSelect').value, prompt, context })
      });
      $('answer').textContent = result.answer || 'The bridge returned no answer. Try again.';
    } catch (error) { $('answer').textContent = `Request failed: ${error.message}`; }
    finally { $('askButton').disabled = false; }
  }

  const requested = new URLSearchParams(location.search).get('context');
  if (requested && Object.hasOwn(RUN_KEYS, requested)) $('contextSelect').value = requested;
  renderContextStatus();
  $('saveSettings').addEventListener('click', saveSettings);
  $('testBridge').addEventListener('click', testBridge);
  $('askButton').addEventListener('click', ask);
  $('contextSelect').addEventListener('change', renderContextStatus);
})();
