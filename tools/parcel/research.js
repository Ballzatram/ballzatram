/* Parcel's in-page subscription workflow. No handoff or paid API fallback. */
(function (root) {
  'use strict';
  function mount({ getState, requireSavedBrief, applyCandidates }) {
    const C = root.ParcelCore, S = root.BallzatramSubscription, AI = root.BallzatramAI;
    const $ = id => root.document.getElementById(id);
    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let controller = null, runId = 0, connectionId = 0, pollTimer, runTimer, loginDeadline = 0, pending = null, busy = false, connecting = false;
    const say = text => { $('research-status').textContent = text; };
    const showError = error => { $('research-error').textContent = error.message; };
    function accountUI() {
      const account = S?.connection()?.account, endpoint = S?.settings().endpoint;
      $('research-account').textContent = account ? `Connected · ${account.email || 'your ChatGPT account'}` : endpoint ? 'ChatGPT not connected' : 'AI service not connected';
      $('research-availability').textContent = account ? 'Research and results stay here in Parcel.' : endpoint ? 'Connect your ChatGPT account once for this session. Research runs here after sign-in.' : 'In-page AI needs a running subscription service. The site owner still needs to connect it. Your brief and saved properties are ready when it is available.';
      $('research-connect-form').hidden = !!account;
      $('research-account-controls').hidden = !account;
      $('research-disconnect').hidden = !S?.connection();
      $('research-run').disabled = busy || connecting || !account;
      $('research-connect').disabled = connecting || busy || !S;
      $('research-model').disabled = busy;
      $('research-models').disabled = busy || connecting;
      $('research-question').disabled = busy;
      if (account) $('research-login').hidden = true;
      $('research-share').textContent = account ? `Run research sends your saved brief, shortlisted properties, and request through ${endpoint} to OpenAI. Public web search uses your ChatGPT plan’s Codex allowance.` : 'Run research shares only your saved brief, shortlisted properties, and this request. It uses your own ChatGPT subscription.';
    }
    async function models(current = connectionId) {
      const rows = await S.models();
      if (current !== connectionId) return;
      const select = $('research-model'); select.replaceChildren();
      for (const row of rows) if (typeof row.id === 'string' && typeof row.name === 'string') {
        const option = root.document.createElement('option'); option.value = row.id; option.textContent = row.name; select.append(option);
      }
      if (!select.options.length) throw new Error('No models are available to this account. Check your ChatGPT access.');
      select.value = rows.find(row => row.id === S.settings().model)?.id || rows.find(row => row.isDefault)?.id || select.options[0].value;
      S.configure({ ...S.settings(), model: select.value });
    }
    async function poll(current) {
      if (current !== connectionId) return;
      if (Date.now() >= loginDeadline) { $('research-login').hidden = true; say('Sign-in expired. Connect again to get a new code.'); return; }
      try {
        const result = await S.status();
        if (current !== connectionId) return;
        accountUI();
        if (result.account) { await models(current); if (current !== connectionId) return; $('research-connection').open = false; say('Connected. Select Run research to use your saved brief.'); return; }
        if (result.loginStatus === 'failed') { $('research-login').hidden = true; say('OpenAI sign-in did not finish. Connect again when ready.'); return; }
        pollTimer = root.setTimeout(() => void poll(current), 2500);
      } catch (error) { if (current === connectionId) showError(error); }
    }
    $('research-connect-form').addEventListener('submit', async event => {
      event.preventDefault(); if (connecting || busy || !S) return;
      const current = ++connectionId; root.clearTimeout(pollTimer); connecting = true; $('research-error').textContent = ''; accountUI();
      try {
        const endpoint = S.endpoint($('research-endpoint').value.trim()), code = $('research-access').value.trim();
        if (S.connection()) await S.disconnect();
        S.configure({ endpoint, model: '' });
        say('Connecting to the subscription service…');
        const login = await S.connect(code);
        if (current !== connectionId) return;
        AI.saveSettings({ ...AI.getSettings(), mode: 'subscription' });
        $('research-code').textContent = login.userCode; $('research-sign-in').href = login.verificationUrl;
        $('research-login').hidden = false; loginDeadline = login.expiresAt;
        say('Complete OpenAI’s sign-in, then return here. Research will stay in Parcel.');
        void poll(current);
      } catch (error) { if (current === connectionId) showError(error); }
      finally { if (current === connectionId) { connecting = false; $('research-access').value = ''; accountUI(); } }
    });
    $('research-disconnect').addEventListener('click', async () => {
      const current = ++connectionId; root.clearTimeout(pollTimer); stop(); connecting = true; $('research-login').hidden = true; $('research-access').value = ''; accountUI();
      const removed = await S.disconnect();
      if (current !== connectionId) return;
      connecting = false; accountUI();
      say(removed ? 'Disconnected. Your workspace is still here.' : 'Disconnected in this tab. The service was unreachable; its session will expire.');
    });
    $('research-models').addEventListener('click', () => models().catch(showError));
    $('research-model').addEventListener('change', () => S.configure({ ...S.settings(), model: $('research-model').value }));
    function stop() {
      runId++; root.clearTimeout(runTimer); controller?.abort(); controller = null; busy = false; $('research-stop').hidden = true; accountUI();
    }
    $('research-stop').addEventListener('click', () => { stop(); say('Research stopped. Work already started may count against your plan.'); });
    function showResult(result, brief) {
      pending = { result, brief: JSON.stringify(brief) };
      $('research-summary').textContent = result.summary || 'Review the source-linked findings below.';
      const state = getState();
      $('research-findings').innerHTML = result.candidates.map((c, i) => {
        const a = C.evaluate(c, brief), exists = state.candidates.some(item => C.sameCandidate(item, c));
        const evidence = C.FACTS.filter(f => c.facts[f.key].value !== null).map(f => {
          const fact = c.facts[f.key];
          return `<p><b>${escape(f.label)}:</b> ${escape(C.factText(c, f.key))}<br>${fact.sourceUrl ? `<a href="${escape(fact.sourceUrl)}" target="_blank" rel="noopener noreferrer">Source</a>` : 'Source missing'} · ${escape(fact.checkedAt || 'Undated')}<br>${escape(fact.detail)}</p>`;
        }).join('');
        return `<article class="research-finding"><span class="badge ${a.verdict}">${escape(a.label)}</span><label class="check"><input type="checkbox" data-research-pick="${i}" ${exists ? 'disabled' : 'checked'}><b>${escape(c.title)}</b></label><p>${escape(c.location)}</p><p>${escape(C.factText(c, 'acres'))} · ${escape(C.factText(c, 'price'))} · ${escape(C.factText(c, 'terrain'))}</p><p>${escape(a.failed.map(x => x.label).join('; ') || a.nextQuestions[0] || 'Review all supporting evidence.')}</p><a href="${escape(c.listingUrl)}" target="_blank" rel="noopener noreferrer">Property source ↗</a>${exists ? '<p class="muted">Already saved. Existing evidence is preserved; review new findings here and edit the saved property if needed.</p>' : ''}<details><summary>Evidence and open questions</summary><div class="evidence-detail">${evidence}<p>${escape(c.notes)}</p></div></details></article>`;
      }).join('');
      $('research-results').hidden = false;
      $('research-apply').hidden = !result.candidates.length;
      $('research-apply').disabled = !result.candidates.some(c => !state.candidates.some(item => C.sameCandidate(item, c)));
      say(result.candidates.length ? 'Research ready. Review the findings and add the properties you want to keep.' : 'Research finished without new property leads. See the summary for what remains unresolved.');
    }
    $('research-form').addEventListener('submit', async event => {
      event.preventDefault(); if (busy) return;
      let current, active;
      try {
        requireSavedBrief();
        if (!S?.connection()?.account) throw new Error('Connect your ChatGPT account before running research.');
        const context = C.aiContext(getState()), brief = context.brief, connection = S.connection();
        const payload = AI.prepare({ tool: 'parcel', context, prompt: $('research-question').value });
        $('research-error').textContent = ''; pending = null; $('research-results').hidden = true;
        current = ++runId; active = new AbortController(); controller = active; busy = true; accountUI(); $('research-stop').hidden = false;
        runTimer = root.setTimeout(() => active.abort(), 180000);
        say('Checking the research connection…');
        await S.researchReady({ signal: active.signal });
        if (current !== runId) return;
        if (S.connection()?.token !== connection.token || S.settings().endpoint !== connection.endpoint) throw new Error('The AI connection changed. Review the connected account before running research again.');
        say('Researching your brief. This can take a couple of minutes…');
        const response = await S.ask(payload, { signal: active.signal, consent: true, responseLength: 'standard', onStatus: message => { if (current === runId) say(message); } });
        if (current !== runId) return;
        const result = C.parseAIResearch(response.answer);
        $('research-usage').textContent = `Model: ${response.model}. Uses your ChatGPT plan. Findings remain reported claims until you verify their sources.`;
        showResult(result, brief);
      } catch (error) { if (current === undefined || current === runId) { showError(error); say('Research did not complete. No properties were changed.'); } }
      finally { if (controller === active) { root.clearTimeout(runTimer); controller = null; busy = false; $('research-stop').hidden = true; accountUI(); } }
    });
    $('research-apply').addEventListener('click', () => {
      try {
        requireSavedBrief();
        if (!pending) throw new Error('Run research and review the results first.');
        if (JSON.stringify(getState().brief) !== pending.brief) throw new Error('The brief changed after this research started. Run research again with the current requirements before adding these findings.');
        const chosen = Array.from($('research-findings').querySelectorAll('[data-research-pick]:checked:not(:disabled)')).map(input => pending.result.candidates[Number(input.dataset.researchPick)]);
        if (!chosen.length) throw new Error('Select at least one property to add.');
        const merged = applyCandidates(chosen);
        $('research-apply').disabled = true; pending = null; $('research-error').textContent = '';
        say(`Added ${merged.added} properties. ${merged.skipped ? `${merged.skipped} already saved; existing evidence was preserved. ` : ''}They are ready in your research file below.`);
      } catch (error) { showError(error); }
    });
    $('research-ai').addEventListener('click', () => {
      $('research-workbench').scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (S?.connection()?.account) $('research-question').focus();
      else { $('research-connection').open = true; $('research-connection').querySelector('summary').focus(); }
    });
    root.addEventListener('ballzatram:ai-connection-change', accountUI);
    root.addEventListener('pagehide', () => { connectionId++; root.clearTimeout(pollTimer); stop(); });
    if (S) $('research-endpoint').value = S.settings().endpoint;
    accountUI();
    if (S?.connection()) {
      const current = connectionId;
      S.status().then(async () => { if (current !== connectionId) return; accountUI(); if (S.connection()?.account) await models(current); }).catch(showError);
    }
  }
  root.ParcelResearch = Object.freeze({ mount });
})(window);
