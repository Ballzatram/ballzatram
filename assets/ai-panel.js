(function (root, factory) {
  const value = factory(root,
    typeof module === 'object' && module.exports ? require('./ai-client.js') : root.BallzatramAI,
    typeof module === 'object' && module.exports ? require('./subscription-client.js') : root.BallzatramSubscription,
    typeof module === 'object' && module.exports ? require('./ai-features.js') : root.BallzatramAIFeatures);
  if (typeof module === 'object' && module.exports) module.exports = value;
  else root.OsirisPanel = value;
})(typeof window === 'undefined' ? globalThis : window, function (root, AI, Subscription, Features) {
  'use strict';
  let dialog, request, controller, pollTimer, loginDeadline = 0, generation = 0, previouslyFocused;
  const $ = name => dialog.querySelector(`[data-osiris="${name}"]`);
  function message(text) { $('status').textContent = text; }
  function stopPolling() { clearTimeout(pollTimer); pollTimer = null; }
  function close() { generation++; stopPolling(); controller?.abort(); controller = null; dialog.close(); previouslyFocused?.focus?.(); }
  function create() {
    if (dialog) return;
    const link = root.document.createElement('link'); link.rel = 'stylesheet'; link.href = '/assets/ai-panel.css?v=subscription-1'; root.document.head.append(link);
    dialog = root.document.createElement('dialog'); dialog.className = 'osiris-dialog'; dialog.setAttribute('aria-label', 'Osiris assistant');
    dialog.innerHTML = `<div class="osiris-head"><div><p>OSIRIS / YOUR AI</p><h2 data-osiris="title">Your companion in this project</h2></div><button type="button" data-osiris="close" aria-label="Close Osiris">Close ×</button></div>
      <div class="osiris-body"><p class="osiris-description">Connect your ChatGPT account and get help here. This private pilot uses Codex access included in your plan.</p>
      <details data-osiris="connection" class="osiris-connection" open><summary data-osiris="account-label">Connect ChatGPT</summary>
      <div data-osiris="setup"><p>The pilot needs an Osiris connection service. Its operator provides the address and access code.</p>
      <label>Connection service<input data-osiris="endpoint" type="url" placeholder="https://your-osiris-service.example" autocomplete="off"></label>
      <label>Pilot access code<input data-osiris="access-code" type="password" autocomplete="off" spellcheck="false" placeholder="Provided by the service operator"></label>
      <p class="osiris-fine">This access code is for the pilot. Enter your ChatGPT credentials only on OpenAI’s sign-in page.</p>
      <button type="button" data-osiris="connect" class="osiris-primary">Connect ChatGPT</button>
      <a href="https://github.com/Ballzatram/ballzatram/blob/master/osiris-runtime/README.md" target="_blank" rel="noopener noreferrer">Service setup guide ↗</a></div>
      <div data-osiris="login" hidden><p>Open OpenAI’s sign-in page and enter this one-time code:</p><p class="osiris-code" data-osiris="code"></p><a data-osiris="sign-in" class="osiris-primary osiris-button" target="_blank" rel="noopener noreferrer">Sign in at OpenAI ↗</a><p class="osiris-fine">Return here after signing in. No question is sent during connection. Device-code login must be enabled in your ChatGPT security settings or allowed by your workspace.</p></div>
      <div data-osiris="connected" hidden><p data-osiris="account"></p><label>Model<select data-osiris="model"><option value="">Load your available models…</option></select></label><div class="osiris-actions"><button type="button" data-osiris="models">Reload models</button><button type="button" data-osiris="limits">Check plan limits</button></div><p class="osiris-fine">Each request uses your ChatGPT plan’s Codex allowance. Signing in does not import your ChatGPT chat history or automatically configure every project.</p></div>
      <button type="button" data-osiris="disconnect" hidden>Disconnect this session</button></details>
      <p data-osiris="status" class="osiris-status" role="status" aria-live="polite"></p>
      <form data-osiris="form"><p data-osiris="scope" class="osiris-fine"></p><details class="osiris-context"><summary>Review the context to share</summary><pre data-osiris="context"></pre></details>
      <label>Your question<textarea data-osiris="question" rows="3" maxlength="4000" placeholder="What should I notice or challenge here?"></textarea></label>
      <label>Response length<select data-osiris="length"><option value="short">Short</option><option value="standard" selected>Standard</option></select></label>
      <label class="osiris-check"><input data-osiris="consent" type="checkbox"><span data-osiris="consent-label">Send this question and selected context using my ChatGPT plan.</span></label>
      <div class="osiris-actions"><button type="submit" data-osiris="ask" class="osiris-primary">Ask Osiris</button><button type="button" data-osiris="cancel" hidden>Stop</button></div>
      <p class="osiris-fine">Response length is a preference. Provider usage limits apply; stopping may still consume allowance for work already started.</p></form>
      <section data-osiris="result"><h3>Osiris’s response</h3><article data-osiris="answer" aria-live="polite">Your answer will appear here.</article><p data-osiris="usage" class="osiris-fine"></p></section>
      <p class="osiris-fine"><a href="/tools/ai/projects.html" target="_blank" rel="noopener">Project AI setup</a> · <a href="/privacy.html" target="_blank" rel="noopener">Privacy</a></p></div>`;
    root.document.body.append(dialog);
    $('close').onclick = close; dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    $('connect').onclick = connect;
    $('models').onclick = () => loadModels().catch(error => message(error.message));
    $('limits').onclick = async () => {
      try { const limits = await Subscription.limits(); const used = [limits.primary, limits.secondary].filter(Boolean).map((b, i) => `${i ? 'Longer' : 'Primary'} window: ${Math.round(b.usedPercent)}% used${b.resetsAt ? `, resets ${new Date(b.resetsAt * 1000).toLocaleString()}` : ''}`); message(used.join(' · ') || 'The provider did not report usage windows. Check your ChatGPT account.'); }
      catch (error) { message(error.message); }
    };
    $('model').onchange = () => { Subscription.configure({ ...Subscription.settings(), model: $('model').value }); $('consent').checked = false; };
    $('question').oninput = () => { $('consent').checked = false; };
    $('length').onchange = () => { $('consent').checked = false; };
    $('disconnect').onclick = async () => {
      generation++; stopPolling(); controller?.abort(); controller = null;
      $('ask').disabled = Features?.get(request?.tool)?.enabled === false; $('cancel').hidden = true;
      $('connect').disabled = false; $('login').hidden = true; $('consent').checked = false;
      const removed = await Subscription.disconnect(); renderAccount();
      message(removed ? 'Disconnected. The service ended this session and cleared its temporary credentials.' : 'Disconnected in this tab. The service could not be reached; its session will expire after inactivity or its four-hour limit.');
    };
    $('cancel').onclick = () => controller?.abort(); $('form').onsubmit = ask;
  }
  function renderAccount() {
    const c = Subscription.connection(), account = c?.account;
    $('connected').hidden = !account; $('setup').hidden = !!account; $('disconnect').hidden = !c;
    $('account-label').textContent = account ? `ChatGPT connected · ${account.planType}` : 'Connect ChatGPT';
    $('account').textContent = account ? `${account.email || 'Your ChatGPT account'} · ${account.planType}` : '';
    if (account) $('login').hidden = true;
    $('consent-label').textContent = `Send this question and selected context through ${Subscription.settings().endpoint || 'my connection service'} to OpenAI, using my ChatGPT plan.`;
  }
  async function loadModels() {
    const current = generation, rows = await Subscription.models();
    if (current !== generation || !dialog.open) return;
    const select = $('model'); select.replaceChildren(new Option('Choose a model…', ''));
    rows.forEach(row => { if (typeof row.id === 'string' && typeof row.name === 'string') select.add(new Option(row.name, row.id)); });
    const saved = Subscription.settings().model;
    const selected = rows.find(row => row.id === saved) || rows.find(row => row.isDefault);
    select.value = selected?.id || '';
    Subscription.configure({ ...Subscription.settings(), model: select.value });
    $('consent').checked = false;
  }
  async function poll(current) {
    if (current !== generation || !dialog.open) return;
    if (Date.now() >= loginDeadline) { $('login').hidden = true; message('Sign-in timed out. Select Connect ChatGPT to start again.'); return; }
    try {
      const result = await Subscription.status();
      if (current !== generation || !dialog.open) return;
      renderAccount();
      if (result.account) { $('connection').open = false; message('ChatGPT connected. Review your context and send when ready.'); await loadModels(); return; }
      if (result.loginStatus === 'failed') { $('login').hidden = true; message('OpenAI sign-in did not complete. Check device-code access in ChatGPT settings and try again.'); return; }
      pollTimer = setTimeout(() => void poll(current), 2500);
    } catch (error) { if (current === generation) message(error.message); }
  }
  async function connect() {
    stopPolling(); const current = ++generation; $('connect').disabled = true; $('consent').checked = false;
    try {
      message('Opening a private session. No model request is being made.');
      const accessCode = $('access-code').value.trim(), nextEndpoint = Subscription.endpoint($('endpoint').value.trim());
      if (Subscription.connection()) await Subscription.disconnect();
      Subscription.configure({ endpoint: nextEndpoint, model: '' });
      const login = await Subscription.connect(accessCode); $('access-code').value = '';
      if (current !== generation || !dialog.open) { await Subscription.disconnect(); return; }
      AI.saveSettings({ ...AI.getSettings(), mode: 'subscription' });
      $('code').textContent = login.userCode; $('sign-in').href = login.verificationUrl; $('login').hidden = false; $('disconnect').hidden = false;
      loginDeadline = login.expiresAt; message('Finish signing in on OpenAI’s page, then return here.');
      void poll(current);
    } catch (error) { if (current === generation) message(error.message); }
    finally { if (current === generation) { $('access-code').value = ''; $('connect').disabled = false; } }
  }
  async function ask(event) {
    event.preventDefault(); if (controller) return;
    const current = generation;
    let activeController;
    try {
      const payload = AI.prepare({ ...request, prompt: $('question').value });
      if (!$('consent').checked) throw new Error('Review the selected context and confirm before sending.');
      AI.saveSettings({ ...AI.getSettings(), mode: 'subscription' });
      activeController = new AbortController(); controller = activeController; $('ask').disabled = true; $('cancel').hidden = false; $('answer').textContent = ''; $('usage').textContent = '';
      message('Osiris is using your ChatGPT connection.');
      const result = await AI.ask(payload, { signal: activeController.signal, consent: true, responseLength: $('length').value, onDelta: delta => { if (current === generation) $('answer').textContent += delta; } });
      if (current !== generation) return;
      $('answer').textContent = result.answer;
      $('usage').textContent = `Model: ${result.model}. Uses your ChatGPT plan.${Number.isFinite(result.usage?.total_tokens) ? ` Reported tokens: ${result.usage.total_tokens}.` : ''} Draft response; no project records were changed.`;
      message('Answer ready.');
    } catch (error) { if (current === generation) message(error.message); }
    finally {
      if (controller === activeController) controller = null;
      if (current === generation) { $('ask').disabled = false; $('cancel').hidden = true; $('consent').checked = false; }
    }
  }
  function open(payload, options = {}) {
    create(); controller?.abort(); controller = null; stopPolling(); generation++; previouslyFocused = root.document.activeElement;
    request = AI.prepare({ ...payload, prompt: payload.prompt || 'Help me understand this project.' });
    const profile = Features?.get(request.tool);
    $('title').textContent = profile?.name || 'Osiris'; $('scope').textContent = profile?.context || 'Only the context shown below is included.';
    $('question').value = payload.prompt || ''; $('context').textContent = JSON.stringify(request.context, null, 2);
    $('form').hidden = !!options.connectionOnly; $('result').hidden = !!options.connectionOnly;
    $('answer').textContent = 'Your answer will appear here.'; $('usage').textContent = ''; $('consent').checked = false; $('cancel').hidden = true; $('connect').disabled = false;
    $('endpoint').value = Subscription.settings().endpoint; $('access-code').value = ''; $('login').hidden = true;
    $('connection').open = !Subscription.connection()?.account || !!options.connectionOnly;
    if (!dialog.open) dialog.showModal(); renderAccount();
    message(profile && !profile.enabled ? 'This project needs its own AI workflow design before connection.' : Subscription.connection()?.account ? 'Review the selected context before sending.' : 'Connect your ChatGPT account to continue.');
    $('ask').disabled = !!profile && !profile.enabled;
    const current = generation;
    if (Subscription.connection()) Subscription.status().then(async () => { if (current !== generation || !dialog.open) return; renderAccount(); if (Subscription.connection()?.account) await loadModels(); }).catch(error => { if (current === generation) { renderAccount(); message(error.message); } });
    if (!options.connectionOnly) $('question').focus();
  }
  function attach() {
    root.document.querySelectorAll('[data-osiris-feature]').forEach(button => {
      button.addEventListener('click', () => {
        try {
          const key = button.dataset.osirisContextKey;
          let context = {};
          if (key) { try { context = JSON.parse(root.localStorage.getItem(key) || 'null'); } catch { context = null; } if (!context) throw new Error('Run this lab and save a result before asking about it.'); }
          open({ tool: button.dataset.osirisFeature, prompt: button.dataset.osirisPrompt || 'Help me understand this result. What assumptions should I challenge?', context });
        } catch (error) { const output = button.parentElement.querySelector('[data-osiris-launch-status]'); if (output) output.textContent = error.message; }
      });
    });
  }
  if (root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', attach, { once: true }); else attach(); }
  return Object.freeze({ open });
});
