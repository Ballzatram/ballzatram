/* Browser presentation only. The campaign engine owns all outcomes and promotions. */
(() => {
  'use strict';
  const E = window.FamilyBusiness, D = window.FamilyBusinessData;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let state = E.initial(), events = [], lastSaved = null, saving = true, storageBroken = false, conflict = false;
  let view = ['desk', 'ledger', 'path', 'library'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'desk';
  let hintLevel = 0, draft = null, draftKey = '', selectedBackup = null, damagedSave = null;
  const metric = (m, value) => m.unit === '$' ? E.money(value) : `${E.round(value)} ${m.unit}`;
  const signed = value => `${value < 0 ? '−' : '+'}${E.money(Math.abs(value))}`;
  const currentKey = () => `${state.cursor}:${state.stage}:${state.turn}`;
  function announce(message, error = false) {
    $('message').textContent = message; $('message').hidden = !message; $('message').classList.toggle('warning', error);
  }
  function warning(message, actions = '') {
    $('storage-warning').innerHTML = `${esc(message)}${actions}`; $('storage-warning').hidden = false;
  }
  function storageFailure() {
    storageBroken = true;
    warning('This browser could not save the latest decision. You can keep playing in this tab; export a backup from the Ledger before leaving.', '<div><button data-action="export">Export current backup</button></div>');
    $('save-status').textContent = 'Not saved · export a backup';
  }
  try {
    lastSaved = localStorage.getItem(E.KEY);
    if (lastSaved) {
      try { ({ state, events } = E.restore(lastSaved)); }
      catch (error) { saving = false; damagedSave = lastSaved; warning('The existing save could not be read. It has been preserved. Play temporarily, restore a backup, or start a new family after downloading the old save.', '<div><button data-action="damaged">Download existing save</button><button data-action="reset">Start a new family</button></div>'); }
    }
  } catch { storageFailure(); }
  function ensureFresh() {
    if (!saving || storageBroken) return;
    let current;
    try { current = localStorage.getItem(E.KEY); } catch { storageFailure(); return; }
    if (current !== lastSaved) {
      conflict = true;
      warning('Another tab changed this family’s save. Reload this tab to continue from the latest decision. Your current view has not overwritten it.', '<div><button data-action="reload">Reload latest save</button><button data-action="export">Export this tab’s backup</button></div>');
      throw new Error('A newer save is open in another tab. Reload before making another decision.');
    }
  }
  function persist() {
    if (!saving) { $('save-status').textContent = 'Temporary play · existing save preserved'; return; }
    const raw = E.serialize(events);
    try { localStorage.setItem(E.KEY, raw); lastSaved = raw; $('save-status').textContent = `Saved · turn ${state.turn} · this device`; }
    catch { storageFailure(); }
  }
  function dispatch(command, rerender = true) {
    try {
      ensureFresh();
      if (conflict) throw new Error('Reload the latest save before continuing.');
      const nextEvents = [...events, command]; E.serialize(nextEvents);
      const nextState = E.reduce(state, command);
      state = nextState; events = nextEvents;
      persist();
      if (command.type !== 'note') { draft = null; hintLevel = 0; }
      announce(state.announcement);
      if (rerender) render();
      return true;
    } catch (error) { announce(error.message, true); return false; }
  }
  function exportFile(name, body, type = 'application/json') {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function goto(next, focus = true) {
    view = next; history.replaceState(null, '', `#${next}`); render();
    if (focus) { $('main').focus({ preventScroll: true }); window.scrollTo?.({ top: 0, behavior: 'instant' }); }
  }
  function stats() {
    return `<div class="stats" aria-label="Family ledger"><div class="stat"><small>Working cash</small><strong>${E.money(state.cash)}</strong></div><div class="stat"><small>Family debt</small><strong>${E.money(state.debt)}</strong></div><div class="stat"><small>Neighborhood trust</small><strong>${state.trust}<span class="fine"> / 100</span></strong></div></div>`;
  }
  function guide(m) {
    if (hintLevel) return m.hints[Math.min(hintLevel - 1, m.hints.length - 1)];
    if (state.latest) {
      if (state.latest.qualifies && state.stage === 2) return m.takeaway;
      if (!state.latest.correct) return `You expected ${state.latest.forecast === 'up' ? 'more' : state.latest.forecast === 'down' ? 'less' : 'no change'}. Look at what actually moved. Which part of your plan might explain the difference?`;
      return 'Keep the result, even if it surprised you. What would you change next time, and what would you leave alone?';
    }
    return state.stage === 0 ? 'First, make a call. Then look at what the street tells you. We can put a name to it afterward.' : state.stage === 1 ? 'Change one thing from the standing order. If you move every dial, you will not know which one mattered.' : 'You have seen this pattern before. The circumstances changed. Tell me what that changes about your plan.';
  }
  function osiris(m) {
    return `<section class="osiris" aria-label="Osiris, your consigliere"><img class="portrait" src="../../assets/family-business/osiris.svg" alt="Osiris in a dark suit and hat" width="64" height="77"><div><h3>OSIRIS <span aria-hidden="true">/</span> CONSIGLIERE</h3><p id="guide-line">${esc(guide(m))}</p><p class="fine">Built-in story guidance · ${hintLevel ? `hint ${hintLevel} of 3` : 'no AI account needed'}</p><div class="guide-actions"><button class="quiet" data-action="hint" ${hintLevel >= 3 ? 'disabled' : ''}>${hintLevel ? 'A little more help' : 'Give me a nudge'}</button><button class="quiet" data-action="ai">Ask with my AI</button></div><label class="include-note"><input id="include-note" type="checkbox"> Include this episode’s saved field note</label></div></section>`;
  }
  function stepper() {
    return `<div class="steps" aria-label="Episode progress">${['Experience', 'Experiment', 'Adapt'].map((label, i) => `<span class="${i === state.stage ? 'current' : i < state.stage ? 'done' : ''}" ${i === state.stage ? 'aria-current="step"' : ''}>0${i + 1} · ${label}</span>`).join('')}</div>`;
  }
  function fields(m) {
    if (draftKey !== currentKey() || !draft) { draft = E.defaults(m); draftKey = currentKey(); }
    return `<div class="control-row ${m.controls.length === 1 ? 'single' : ''}">${m.controls.map(c => `<label class="field" for="control-${c.id}">${esc(c.label)}${c.unit ? ` (${esc(c.unit)})` : ''}${c.type === 'choice' ? `<select id="control-${c.id}" name="${c.id}">${c.options.map(([value, label]) => `<option value="${value}" ${draft[c.id] === value ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>` : `<input id="control-${c.id}" name="${c.id}" type="number" value="${draft[c.id]}" min="${c.min}" max="${c.max}" step="${c.step}" required inputmode="decimal">`}<small>Standing order: ${esc(c.type === 'choice' ? c.options.find(option => option[0] === c.value)[1] : `${c.value}${c.unit === '%' ? '%' : ''}`)}</small></label>`).join('')}</div>`;
  }
  function readPlan(form, m) {
    const data = new FormData(form);
    return Object.fromEntries(m.controls.map(c => [c.id, c.type === 'number' ? Number(data.get(c.id)) : data.get(c.id)]));
  }
  function plan(m) {
    const ref = E.evaluate(state, E.defaults(m));
    const assignment = state.stage === 0 ? 'Set a plan. Predict the difference. Open the shutters.' : state.stage === 1 ? `Change exactly one control from the standing order. Predict a real change in ${m.metric.toLowerCase()}.` : `${m.target} Predict the direction before you commit.`;
    return `<p class="assignment">${esc(assignment)}</p><div class="reference"><div>Standing order today<small>${esc(m.metric)}</small></div><strong>${esc(metric(m, ref.value))}</strong></div><form id="decision-form">${fields(m)}<fieldset class="forecast"><legend>${esc(m.metric)} — compared with the standing order?</legend><div class="forecast-options">${[['down', '↓', 'Less'], ['same', '↔', 'Same'], ['up', '↑', 'More']].map(([value, icon, label]) => `<label><input type="radio" name="forecast" value="${value}" aria-label="${label}" required><span aria-hidden="true">${icon} ${label}</span><span class="sr-only" hidden>${label}</span></label>`).join('')}</div></fieldset><p id="plan-cost" class="cost-hint">The plan settles once. Other family businesses report alongside it.</p><button class="primary" type="submit">${state.turn === 0 ? 'Open the deli' : 'Put the plan to work'} <span aria-hidden="true">→</span></button></form><p class="fine">${state.stage === 0 ? 'Your first shift is for noticing. Later steps ask you to predict a controlled change and adapt to new conditions.' : 'Profit affects the books. Promotions follow observed experiments and adaptation; a profitable guess alone does not earn a promotion.'}</p>`;
  }
  function facts(rows) { return `<div class="facts">${rows.map(row => `<div class="fact-row"><span>${esc(row.label)}</span><strong>${esc(row.value)}</strong></div>`).join('')}</div>`; }
  function outcome(m) {
    const r = state.latest;
    let feedback;
    if (state.stage === 0) feedback = 'First shift observed. The next step isolates one change so you can test what caused the difference.';
    else if (r.qualifies) feedback = state.stage === 1 ? 'Your controlled prediction matched. Now try the idea under changed conditions.' : 'You anticipated the result and adapted the plan. This episode’s evidence is complete.';
    else if (!r.correct) feedback = `Your prediction was ${r.forecast === 'same' ? 'no change' : r.forecast === 'up' ? 'more' : 'less'}; the result was ${r.expected === 'same' ? 'unchanged' : r.expected === 'up' ? 'higher' : 'lower'}. Inspect the result, then try another plan. Earlier evidence is safe.`;
    else if (state.stage === 1) feedback = 'Prediction matched. For this experiment, change exactly one control and produce a different result from the standing order.';
    else feedback = `Prediction matched. The changed situation still needs you to ${m.goal === 'up' ? 'increase' : 'decrease'} ${m.metric.toLowerCase()} compared with the standing order.`;
    return `<p class="eyebrow">THE SHUTTERS COME DOWN · TURN ${r.turn}</p><div class="outcome-number">${esc(metric(m, r.actual.value))}</div><p>${esc(m.metric)}</p><p>${esc(r.actual.story)}</p><div class="comparison"><div><small>Standing order · same conditions</small><strong>${esc(metric(m, r.reference.value))}</strong></div><div><small>Your plan · actual result</small><strong>${esc(metric(m, r.actual.value))}</strong></div></div><div class="evidence ${r.qualifies ? '' : 'retry'}">${esc(feedback)}</div><details ${!r.qualifies ? 'open' : ''}><summary>Follow the consequences</summary>${facts(r.actual.facts)}${facts([{ label: 'This episode’s surplus', value: signed(r.actual.profit) }, { label: 'Other family businesses', value: signed(r.operatingProfit) }, { label: 'New borrowing', value: E.money(r.actual.borrowing) }, { label: 'Existing debt interest paid', value: E.money(r.interestPaid) }, { label: 'Unpaid interest added to debt', value: E.money(r.capitalized) }, { label: 'Total cash change', value: signed(r.cashChange) }])}<p class="fine">The standing order is a comparison only. Only your chosen plan enters the ledger.</p></details><details><summary>Leave a field note for Osiris</summary><label class="field">What would you tell the next person running this shift?<textarea id="field-note" rows="3" maxlength="600" placeholder="What surprised you? What would you do differently?">${esc(state.notes[m.id] || '')}</textarea></label><button class="quiet" data-action="note">Save field note</button><p class="fine">Your words are yours. Notes are not scored and are shared with your AI only when you select them.</p></details><button class="primary" data-action="continue">${r.qualifies ? state.stage === 0 ? 'Try a controlled experiment' : state.stage === 1 ? 'A different day' : state.practice ? 'Back to the family' : (state.cursor + 1) % 3 === 0 && state.cursor < 17 ? 'Take on more responsibility' : state.cursor === 17 ? 'Take your seat at the table' : 'The next piece of business' : 'Rework the plan'} <span aria-hidden="true">→</span></button>`;
  }
  function desk() {
    const m = E.mission(state), rank = D.ranks[state.rank];
    if (state.finished && !state.practice) return `<section class="finished"><p class="eyebrow">THE COMMISSION · THE STORY CONTINUES</p><h1>You know what the family is built on.</h1><p>The deli is still open. The bread still has to arrive. Your responsibilities grew, and the early decisions became part of a larger world.</p>${stats()}<p>All 18 episodes have an observed result, a controlled prediction, and an adaptation to changed conditions. There is more to explore: revisit a contract with your current family, or take a deeper question into the Econ library.</p><div class="actions"><button class="primary" data-open="path">Revisit a contract</button><button data-open="library">Explore the library</button><button data-action="export">Keep a backup</button></div></section>${ledgerSummary()}`;
    const streetMessage = state.latest ? state.latest.actual.story : state.turn === 0 ? 'Rosa has the keys. You have the first shift.' : rank.responsibility;
    const headings = ['A little business.<br>A bigger world.', 'The block is<br>counting on you.', 'A handshake has<br>a long memory.', 'Every dollar has<br>another job.', 'Your decisions<br>reach the street.', 'The whole world<br>comes through here.'];
    return `<div class="desk-grid"><div class="world-column"><div class="intro"><div><div class="chapter-tag">Little Meridian / Chapter ${String(state.rank + 1).padStart(2, '0')}</div><h1>${headings[state.rank]}</h1><p class="muted">Earn your place. Keep what you learn.</p></div></div><div class="scene"><img src="../../assets/family-business/meridian.svg" width="768" height="416" alt="A pixel-art neighborhood at dusk: Bellafiore Deli, Rosa’s Bakery, and the Social Club, with the family car outside."><span class="scene-caption">${esc(rank.place)} · evening edition</span><div class="scene-live"><span class="live-dot" aria-hidden="true"></span><span>${state.latest ? 'The day’s reports are in.' : esc(streetMessage)}</span><b>TURN ${String(state.turn + (state.phase === 'plan' ? 1 : 0)).padStart(2, '0')}</b></div></div>${stats()}${osiris(m)}<section class="street-notes"><h3>THE FAMILY NEVER STOPS WORKING</h3>${D.assets.filter(a => a.rank <= state.rank).map(a => `<div class="business-preview"><span>${esc(a.name)}</span><span>${state.rank === 0 ? 'Your responsibility' : `${esc(a.manager)} · ${state.policies[a.id] === 'careful' ? 'Keep a cushion' : state.policies[a.id] === 'grow' ? 'Chase demand' : 'Steady trade'}`}</span></div>`).join('')}<button class="link-button" data-open="ledger">Open the books →</button></section></div><article class="episode" aria-labelledby="episode-title"><div class="episode-head"><span>${state.practice ? 'RETURNING BUSINESS' : 'TONIGHT’S BUSINESS'}</span><span>${String(m.number).padStart(2, '0')} / 18</span></div><div class="episode-body">${stepper()}<p class="eyebrow">${esc(m.place)}</p><h2 id="episode-title" tabindex="-1">${esc(m.title)}</h2>${state.phase === 'plan' ? `<div class="character-line">“${esc(m.line)}”<small>${esc(m.character)}</small></div><p>${esc(m.brief)}</p>${state.stage === 2 ? `<div class="transfer"><strong>A DIFFERENT DAY</strong><p>${esc(m.shift)}</p></div>` : ''}${plan(m)}` : outcome(m)}${state.practice && state.phase === 'plan' ? '<button class="link-button" data-action="leave">Return to the current story</button>' : ''}</div></article></div>`;
  }
  function ledgerSummary() {
    const last = state.journal.at(-1);
    if (!last) return '<section class="panel"><h2>The first entry is yours.</h2><p class="muted">Open the deli to see the consequences here: what it earned, what it cost, and what changed.</p></section>';
    return `<section class="panel"><p class="eyebrow">LATEST FAMILY REPORT · TURN ${last.turn}</p><h2>${esc(last.title)}</h2><div class="table-wrap"><table><thead><tr><th scope="col">Operation</th><th scope="col">What happened</th><th scope="col">Surplus</th></tr></thead><tbody><tr><td>Your active episode</td><td>${esc(last.actual.story)}</td><td>${signed(last.actual.profit)}</td></tr>${last.ongoing.map(a => `<tr><td>${esc(a.name)}</td><td>${esc(a.detail)}</td><td>${signed(a.profit)}</td></tr>`).join('')}<tr><td>Interest on existing debt</td><td>${E.money(last.capitalized)} unpaid interest added to debt</td><td>−${E.money(last.interestPaid)}</td></tr><tr><td>New borrowing</td><td>Cash and debt both increase</td><td>+${E.money(last.actual.borrowing)}</td></tr><tr><th scope="row">Cash movement this turn</th><td>Promotion equity and later advances are separate ledger entries.</td><td>${signed(last.cashChange)}</td></tr></tbody></table></div></section>`;
  }
  function ledger() {
    return `<header class="view-heading"><div><p class="eyebrow">THE FAMILY BOOKS</p><h1>Nothing disappears.</h1><p class="muted">Your first counter is still part of every bigger decision.</p></div><button class="quiet" data-open="desk">Back to the neighborhood</button></header>${stats()}${ledgerSummary()}<section class="panel"><h2>${state.rank ? 'Leave good instructions.' : 'Soon, you will have people for this.'}</h2><p class="muted">${state.rank ? 'Managers run these businesses on every campaign turn. Set a policy and watch their reports. Active deli episodes replace that turn’s delegated deli shift.' : 'After the Associate episodes, Rosa can handle the deli while you run the supply route. Each promotion adds responsibility and a manager to help carry it.'}</p><div class="cards">${D.assets.filter(a => a.rank <= state.rank).map(a => `<article><p class="eyebrow">${esc(a.manager)} · MANAGER</p><h2>${esc(a.name)}</h2><p>${esc(a.description)}</p><label class="manager-policy">Standing instructions<select data-policy="${a.id}" ${state.rank === 0 || state.phase !== 'plan' ? 'disabled' : ''}>${[['careful', 'Keep a cushion · smaller shifts'], ['steady', 'Steady trade · normal capacity'], ['grow', 'Chase demand · larger shifts']].map(([id, label]) => `<option value="${id}" ${state.policies[a.id] === id ? 'selected' : ''}>${label}</option>`).join('')}</select></label></article>`).join('')}</div><p class="fine">Larger shifts cost more and can leave unused capacity. Managers pause a shift if supplies cannot be funded. Review an open result before changing their instructions.</p></section><section class="panel"><h2>Keep the books in your hands.</h2><p class="muted">Decisions are saved in this browser. A backup can move the family to another device. Other games and the older playtest keep their own saves.</p><div class="actions"><button data-action="export">Export backup</button><label class="import-label">Restore backup<input id="import-file" type="file" accept="application/json,.json" aria-label="Choose a Family Business backup"></label><button data-action="journal">Export field journal</button><button class="quiet" data-action="reset">Start a new family</button></div><p class="fine">${events.length} of ${E.MAX_EVENTS} supported save events used. Restoring checks every decision by replaying the campaign rules.</p></section><section class="panel"><h2>A little breathing room.</h2><p class="muted">Need working cash? A $500 advance increases cash and debt together. Existing debt costs 0.5% each campaign turn. Unpaid interest joins the debt. Borrowing earns no promotion credit.</p><button data-action="loan" ${state.phase !== 'plan' ? 'disabled' : ''}>Borrow $500 in working capital</button></section><section class="panel journal"><h2>The field journal</h2><p class="fine">The most recent 80 shifts are shown here. Your backup contains the full decision history.</p>${state.journal.length ? [...state.journal].reverse().map(r => `<details><summary>Turn ${r.turn} · ${esc(r.title)} · ${signed(r.cashChange)} cash</summary><p>${esc(r.actual.story)}</p><p>Prediction: ${esc(r.forecast)}. Observed direction: ${esc(r.expected)}. ${r.qualifies ? 'This step’s evidence is complete.' : 'More experimenting needed.'}</p>${facts(r.actual.facts)}${state.notes[r.mission] ? `<p>Latest field note for this episode: ${esc(state.notes[r.mission])}</p>` : ''}</details>`).join('') : '<p class="muted">The ledger is waiting for the first shift.</p>'}</section><p class="legacy-note"><a href="legacy.html">Open the earlier three-district playtest</a> · its progress remains separate.</p>`;
  }
  function path() {
    return `<header class="view-heading"><div><p class="eyebrow">RESPONSIBILITY, EARNED</p><h1>A seat at the table.</h1><p class="muted">Every promotion adds a layer. The lessons underneath keep doing their work.</p></div><span class="rank-seal">${state.completed.length} / 18 episodes</span></header><div class="cards">${D.ranks.map((rank, index) => {
      const episodes = D.missions.filter(m => m.rank === index), count = episodes.filter(m => state.completed.includes(m.id)).length;
      return `<article class="rank-card ${index === state.rank ? 'current' : ''} ${index > state.rank ? 'locked' : ''}"><span class="rank-number">0${index + 1}</span><p class="eyebrow">${index < state.rank ? 'TRUST EARNED' : index === state.rank ? 'YOUR RESPONSIBILITY' : 'AHEAD OF YOU'}</p><h2>${rank.name}</h2><p>${esc(rank.responsibility)} ${esc(rank.unlock)}</p><div class="progress" role="progressbar" aria-label="${rank.name} episodes" aria-valuemin="0" aria-valuemax="3" aria-valuenow="${count}"><span style="width:${count / 3 * 100}%"></span></div><p class="fine">${count} of 3 episodes complete</p><ol>${episodes.map(m => `<li><span aria-label="${state.completed.includes(m.id) ? 'Complete' : 'Not complete'}">${state.completed.includes(m.id) ? '◆' : '◇'}</span>${esc(m.title)}${state.completed.includes(m.id) ? `<button data-replay="${m.id}" ${state.phase !== 'plan' ? 'disabled' : ''}>Revisit</button>` : m.number - 1 === state.cursor ? '<button data-open="desk">Continue</button>' : ''}</li>`).join('')}</ol><p class="fine">${episodes.map(m => m.concepts[0]).join(' · ')}</p></article>`;
    }).join('')}</div><section class="panel" style="margin-top:24px"><h2>What earns the next responsibility?</h2><p class="muted">In each episode, experience a result, predict the effect of changing one thing, then improve the specified outcome under different conditions. Complete all three episodes at your rank to earn the next responsibility.</p><p class="muted">These are visible pieces of evidence, not a claim that you have mastered an entire field. Notes are never keyword-scored. A missed prediction keeps earlier evidence, and a good profit does not skip the experiment.</p></section>`;
  }
  function library() {
    return `<header class="view-heading"><div><p class="eyebrow">THE WHOLE ECON LIBRARY</p><h1>There is more behind every door.</h1><p class="muted">Take a question from the story into a deeper experiment, then come back to the family.</p></div><button class="quiet" data-open="desk">Return to the story</button></header><div class="cards">${D.labs.map(lab => `<article><span class="tag">${D.ranks[lab.rank].name}${lab.rank <= state.rank ? ' · relevant now' : ' · explore anytime'}</span><h2>${esc(lab.title)}</h2><p class="eyebrow">${esc(lab.name)}</p><p>${esc(lab.text)}</p><p class="fine">${esc(lab.concepts)}</p><a href="${lab.href}?family=1${location.pathname.includes('/legacy-econ-arcade/') ? '&amp;familyOrigin=legacy' : ''}">Open ${esc(lab.name)} →</a></article>`).join('')}</div><p class="old-lab-note">These deeper labs retain their own simulations and saves. They open with a route back to your family. Lab scores do not automatically become campaign mastery, and their finances do not silently change your ledger.</p>`;
  }
  function render() {
    $('rank-label').textContent = D.ranks[state.rank].name;
    document.querySelectorAll('[data-view]').forEach(button => { if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
    $('app').innerHTML = ({ desk, ledger, path, library })[view]();
    if (!storageBroken && saving && !conflict) $('save-status').textContent = state.turn ? `Saved · turn ${state.turn} · this device` : 'Decisions save on this device';
    const form = $('decision-form');
    if (form) {
      const updateCost = () => {
        try {
          draft = readPlan(form, E.mission(state));
          const result = E.evaluate(state, draft), enough = result.cost <= state.cash + result.borrowing;
          $('plan-cost').textContent = `${E.money(result.cost)} working cash required. ${E.money(state.cash)} available${result.borrowing ? `, plus ${E.money(result.borrowing)} new borrowing` : ''}.${enough ? '' : ' Reduce the plan or use the Ledger’s working-capital advance.'}`;
          $('plan-cost').classList.toggle('inline-error', !enough);
        } catch { $('plan-cost').textContent = 'Keep the plan inside the limits shown on each control.'; }
      };
      form.addEventListener('input', updateCost); updateCost();
      form.addEventListener('submit', event => {
        event.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const input = readPlan(form, E.mission(state)), forecast = new FormData(form).get('forecast');
        if (dispatch({ type: 'play', input, forecast })) $('episode-title')?.focus({ preventScroll: false });
      });
    }
    document.querySelectorAll('[data-policy]').forEach(select => select.addEventListener('change', () => dispatch({ type: 'policy', asset: select.dataset.policy, value: select.value })));
    $('import-file')?.addEventListener('change', async event => {
      const file = event.target.files?.[0]; if (!file) return;
      try {
        if (file.size > 2000000) throw new Error('Choose a Family Business backup smaller than 2 MB.');
        const raw = await file.text(), restored = E.restore(raw);
        selectedBackup = { ...restored, raw: E.serialize(restored.events) };
        $('import-summary').textContent = `${D.ranks[restored.state.rank].name} · turn ${restored.state.turn} · ${E.money(restored.state.cash)} cash · ${restored.state.completed.length} episodes complete.`;
        $('import-dialog').showModal();
      } catch (error) { announce(error.message, true); }
      event.target.value = '';
    });
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.view || button.dataset.open) return goto(button.dataset.view || button.dataset.open);
    if (button.dataset.replay) { if (dispatch({ type: 'replay', id: button.dataset.replay })) goto('desk'); return; }
    const action = button.dataset.action;
    if (action === 'continue') {
      const note = $('field-note');
      if (note && note.value !== (state.notes[E.mission(state).id] || '') && !dispatch({ type: 'note', text: note.value }, false)) return;
      if (dispatch({ type: 'continue' })) { $('episode-title')?.focus({ preventScroll: false }); if (state.announcement) $('message').scrollIntoView?.({ block: 'nearest' }); }
    }
    if (action === 'note') { if (dispatch({ type: 'note', text: $('field-note').value }, false)) announce('Field note saved. It does not change the evidence score.'); }
    if (action === 'hint') { hintLevel = Math.min(3, hintLevel + 1); const m = E.mission(state); $('guide-line').textContent = guide(m); button.textContent = hintLevel === 3 ? 'All three hints shown' : 'A little more help'; button.disabled = hintLevel === 3; }
    if (action === 'ai') {
      try {
        if (!window.OsirisPanel) throw new Error('The AI handoff did not load. Built-in hints still work; try again when online.');
        window.OsirisPanel.open({ tool: 'econ-world', prompt: 'Stay in character as Osiris, my calm, dryly funny consigliere. Help me notice one consequence of my decision. Ask one guiding question before giving a solution. Keep the explanation inside this episode.', context: E.selectedContext(state, $('include-note')?.checked === true) });
      } catch (error) { announce(error.message, true); }
    }
    if (action === 'export') exportFile(`family-business-turn-${state.turn}.json`, E.serialize(events));
    if (action === 'damaged') exportFile('family-business-preserved-save.json', damagedSave || '');
    if (action === 'journal') {
      const body = ['# The Family Business — field journal', '', `${D.ranks[state.rank].name} · ${state.turn} turns · ${state.completed.length}/18 episodes`, '', ...state.journal.flatMap(r => [`## Turn ${r.turn}: ${r.title}`, '', r.actual.story, '', `Prediction: ${r.forecast}. Observed: ${r.expected}. Cash change: ${signed(r.cashChange)}.`, '', ...r.actual.facts.map(f => `- ${f.label}: ${f.value}`), '', state.notes[r.mission] ? `Latest field note: ${state.notes[r.mission]}` : '', ''])].join('\n');
      exportFile('family-business-field-journal.md', body, 'text/markdown');
    }
    if (action === 'loan') dispatch({ type: 'loan' });
    if (action === 'leave') dispatch({ type: 'leave' });
    if (action === 'reload') location.reload();
    if (action === 'reset') $('reset-dialog').showModal();
  });
  $('confirm-reset').addEventListener('click', event => {
    try {
      ensureFresh();
      state = E.initial(); events = []; saving = true; storageBroken = false; conflict = false; damagedSave = null;
      $('storage-warning').hidden = true; persist(); announce('New books, same neighborhood. Your other games’ saves are intact.'); draft = null; goto('desk');
    } catch (error) { event.preventDefault(); announce(error.message, true); }
  });
  $('confirm-import').addEventListener('click', event => {
    if (!selectedBackup) { event.preventDefault(); return; }
    try {
      ensureFresh(); state = selectedBackup.state; events = selectedBackup.events;
      saving = true; storageBroken = false; conflict = false; damagedSave = null; selectedBackup = null; draft = null;
      $('storage-warning').hidden = true; persist(); announce('Backup restored. Every decision was replayed and checked.'); goto('desk');
    } catch (error) { event.preventDefault(); announce(error.message, true); }
  });
  window.addEventListener('storage', event => {
    if ((event.key === E.KEY || event.key === null) && event.newValue !== lastSaved) {
      conflict = true; warning('This family changed in another tab. Reload before making a new decision.', '<div><button data-action="reload">Reload latest save</button><button data-action="export">Export this tab’s backup</button></div>');
    }
  });
  window.addEventListener('hashchange', () => { const next = location.hash.slice(1); if (['desk', 'ledger', 'path', 'library'].includes(next)) { view = next; render(); } });
  render(); if (state.announcement) announce(state.announcement);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
