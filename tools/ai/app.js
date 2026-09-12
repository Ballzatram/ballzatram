(() => {
  'use strict';
  const AI = window.BallzatramAI;
  const $ = id => document.getElementById(id);
  const RUN_KEYS = { portfolio: 'ballzatram:portfolio-pages-last-run:v1', scenario: 'ballzatram:scenario-pages-last-run:v1', supplyDemand: 'ballzatram:supply-demand-last-run:v1', report: 'ballzatram:pages-report-draft:v1' };
  let settings = AI.getSettings(), catalogue = [], controller, activeRequest = 0;
  const staged = AI.preparedRequest();
  const status = message => { $('status').textContent = message; };
  function persist() { AI.saveSettings(settings); }
  function setMode(mode) {
    if (controller) controller.abort();
    settings.mode = mode; persist(); $('consent').checked = false; renderMode();
  }
  function renderMode() {
    document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === settings.mode)));
    for (const mode of ['handoff', 'openrouter', 'demo']) $(`${mode}Panel`).hidden = settings.mode !== mode;
    $('nativeDetails').open = settings.mode === 'native';
    const paid = ['native', 'openrouter'].includes(settings.mode);
    $('paidControls').hidden = !paid;
    $('askButton').textContent = AI.label();
    $('resultHint').textContent = settings.mode === 'handoff' ? 'Prepare a prompt, copy it, then open your chat app and paste it there.' : settings.mode === 'demo' ? 'A fixed local checklist. No model calls and no token charges.' : 'An answer appears here after you explicitly send a question using your own account.';
    $('consentText').textContent = settings.mode === 'native' ? `Send this question and context through ${settings.bridgeUrl || 'my relay'} to ${settings.provider}, using my API key.` : 'Send this question and context to OpenRouter and the selected model provider, using my credits.';
    const name = AI.chats[settings.chat].name;
    $('openChat').href = AI.chats[settings.chat].url; $('openChat').textContent = `Open ${name} ↗`;
    $('testConnection').disabled = !AI.isConnected();
    if (settings.mode === 'openrouter' && !AI.isConnected()) status('Connect your OpenRouter account to get in-site answers.');
    else if (settings.mode === 'native' && !AI.isConnected()) status('Enter a matching API key for this relay and provider.');
    else status(paid ? 'Connected for this tab. Each request uses your own account.' : settings.mode === 'demo' ? 'Local preview selected. No external requests.' : `Ready to prepare a question for ${name}.`);
  }
  function selectedRequest() {
    const kind = $('contextSelect').value;
    let context = {}, tool = 'general';
    if (kind === 'prepared') {
      if (!staged) throw new Error('No prepared question is available in this tab. Open the guide from a tool first.');
      context = staged.context; tool = staged.tool;
    } else if (Object.hasOwn(RUN_KEYS, kind)) {
      context = BallzatramStorage.read(RUN_KEYS[kind]); tool = kind;
      if (!context || typeof context !== 'object' || !Object.keys(context).length) throw new Error('No saved context found. Run that lab first, or select Just my question.');
    }
    return { tool, prompt: $('prompt').value, context };
  }
  function renderContext() {
    $('consent').checked = false;
    try {
      const request = selectedRequest();
      const safe = AI.prepare({ ...request, prompt: request.prompt.trim() || 'Context preview' });
      $('contextStatus').textContent = $('contextSelect').value === 'none' ? 'Only your question will be shared.' : 'Only this selected context will be shared. Review it below.';
      $('contextPreview').textContent = JSON.stringify(safe.context, null, 2);
    } catch (error) { $('contextStatus').textContent = error.message; $('contextPreview').textContent = 'No context available.'; }
  }
  function renderModels() {
    const free = $('freeOnly').checked;
    const rows = catalogue.filter(m => !free || (Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0 && Number(m.pricing.request || 0) === 0));
    $('model').replaceChildren(new Option(rows.length ? 'Choose a model…' : 'No matching models loaded', ''));
    rows.forEach(m => $('model').add(new Option(m.name, m.id)));
    if (rows.some(m => m.id === settings.model)) $('model').value = settings.model;
    else if (settings.model && !free) $('model').add(new Option(`${settings.model} (saved; availability not checked)`, settings.model, false, true));
    else if (free) { settings.model = ''; persist(); }
    pricing();
  }
  function pricing() {
    const m = catalogue.find(row => row.id === settings.model);
    if (!m) { $('modelPricing').textContent = 'Choose a model from the current catalogue. Model access depends on your provider account.'; return; }
    const input = Number(m.pricing.prompt), output = Number(m.pricing.completion), request = Number(m.pricing.request || 0);
    $('modelPricing').textContent = Number.isFinite(input) && Number.isFinite(output) && input >= 0 && output >= 0
      ? (input === 0 && output === 0 && request === 0 ? 'Listed as free. Provider limits and availability still apply.' : `Listed token rates per million: $${(input * 1e6).toFixed(2)} input · $${(output * 1e6).toFixed(2)} output${request ? ` · $${request} per request` : ''}. Your provider’s billing is authoritative.`)
      : 'Check this model’s current price in OpenRouter before sending.';
  }
  async function loadModels() {
    $('loadModels').disabled = true;
    try { catalogue = await AI.models(); renderModels(); status(`${catalogue.length} text models loaded. Choose one before sending.`); }
    catch (error) { status(error.message); }
    finally { $('loadModels').disabled = false; }
  }
  async function ask(event) {
    event.preventDefault();
    if (controller) return;
    $('handoffActions').hidden = true; $('usage').textContent = '';
    try {
      const request = AI.prepare(selectedRequest());
      if (['openrouter', 'native'].includes(settings.mode) && !$('consent').checked) throw new Error('Confirm the selected data and account before sending.');
      const mode = settings.mode, id = ++activeRequest;
      controller = new AbortController(); $('askButton').disabled = true;
      $('cancelButton').hidden = !['openrouter', 'native'].includes(mode);
      $('answer').textContent = mode === 'handoff' ? 'Preparing…' : mode === 'demo' ? 'Loading local preview…' : 'Waiting for your selected model…';
      const result = await AI.ask(request, { signal: controller.signal });
      if (id !== activeRequest) return;
      $('resultLabel').textContent = result.model;
      if (result.kind === 'handoff') {
        $('answer').textContent = `Ready for ${result.model}. Copy the prepared prompt, open your chat app, and paste it there. No data has been sent to the chat app.`;
        $('handoffText').value = result.answer; $('handoffActions').hidden = false;
      } else {
        $('answer').textContent = result.answer;
        if (result.kind === 'answer') {
          const u = result.usage || {};
          $('usage').textContent = `${result.truncated ? 'Response reached the length limit. ' : ''}Billed to your ${mode === 'native' ? 'API' : 'OpenRouter'} account.${Number.isFinite(u.total_tokens) ? ` Provider-reported tokens: ${u.total_tokens}.` : ''}${Number.isFinite(u.cost) ? ` Reported cost: $${u.cost.toFixed(6)}.` : ' Check provider activity for final usage.'}`;
        }
      }
    } catch (error) { $('answer').textContent = error.message; }
    finally { controller = null; $('askButton').disabled = false; $('cancelButton').hidden = true; }
  }
  $('chatProvider').value = settings.chat; $('nativeProvider').value = settings.provider;
  $('nativeModel').value = settings.nativeModel; $('bridgeUrl').value = settings.bridgeUrl; $('maxTokens').value = settings.maxTokens;
  const requested = new URLSearchParams(location.search).get('context');
  if (requested && ['none', 'prepared', ...Object.keys(RUN_KEYS)].includes(requested)) $('contextSelect').value = requested;
  if (staged && (requested === 'prepared' || new URLSearchParams(location.search).has('code'))) { $('contextSelect').value = 'prepared'; $('prompt').value = staged.prompt; }
  renderMode(); renderModels(); renderContext();
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('chatProvider').onchange = () => { settings.chat = $('chatProvider').value; persist(); renderMode(); };
  $('contextSelect').onchange = () => { if ($('contextSelect').value === 'prepared' && staged) $('prompt').value = staged.prompt; renderContext(); };
  $('prompt').oninput = () => { $('consent').checked = false; };
  $('model').onchange = () => { settings.model = $('model').value; persist(); $('consent').checked = false; pricing(); };
  $('freeOnly').onchange = () => { renderModels(); $('consent').checked = false; };
  $('maxTokens').onchange = () => { settings.maxTokens = Number($('maxTokens').value); persist(); $('consent').checked = false; };
  $('loadModels').onclick = loadModels;
  $('connectOpenRouter').onclick = async () => {
    $('connectOpenRouter').disabled = true;
    try {
      if ($('prompt').value.trim()) AI.stageRequest(selectedRequest());
      location.assign(await AI.authorizationUrl());
    } catch (error) { status(error.message); $('connectOpenRouter').disabled = false; }
  };
  $('saveKey').onclick = () => {
    try {
      settings.mode = 'openrouter';
      const stored = AI.connectKey($('apiKey').value, settings); $('apiKey').value = ''; persist(); renderMode();
      status(stored ? 'OpenRouter key connected for this tab. Use Check connection to verify it without generating text.' : 'Tab storage is blocked. Connected on this page only; navigation will disconnect it.');
    } catch (error) { status(error.message); }
  };
  $('saveNative').onclick = () => {
    try {
      const next = { ...settings, mode: 'native', provider: $('nativeProvider').value, nativeModel: $('nativeModel').value.trim(), bridgeUrl: AI.bridgeUrl($('bridgeUrl').value.trim()) };
      if (!next.nativeModel) throw new Error('Enter the exact model ID from your provider.');
      const stored = AI.connectKey($('nativeKey').value, next); $('nativeKey').value = ''; settings = next; persist(); renderMode();
      status(stored ? 'Your API key is ready for this tab. Only use a relay you operate or trust.' : 'Tab storage is blocked. Connected on this page only; navigation will disconnect it.');
    } catch (error) { status(error.message); }
  };
  for (const id of ['disconnect', 'disconnectNative']) $(id).onclick = () => { controller?.abort(); AI.disconnect(); renderMode(); status('Disconnected from this tab. You can also revoke the key in your provider account.'); };
  $('testConnection').onclick = async () => { $('testConnection').disabled = true; try { const result = await AI.checkConnection(); status(result.message); } catch (error) { status(error.message); } finally { $('testConnection').disabled = false; } };
  $('askForm').onsubmit = ask;
  $('cancelButton').onclick = () => controller?.abort();
  $('copyPrompt').onclick = async () => { try { await AI.copy($('handoffText').value); status('Copied. Open your chat app and paste the prompt.'); } catch (error) { $('handoffText').focus(); $('handoffText').select(); status(error.message); } };
  AI.finishAuthorization().then(async connected => {
    if (connected) { settings = AI.getSettings(); renderMode(); status('OpenRouter connected. Select a model to continue. No prompt was sent.'); await loadModels(); }
  }).catch(error => status(error.message));
})();
