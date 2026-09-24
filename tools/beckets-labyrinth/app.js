/* Beckets Labyrinth: native scrolling, explicit AI requests, browser-local shelf. */
(() => {
  'use strict';
  const C = window.BecketsCore, seeds = window.BecketsSeeds, AI = window.BallzatramAI;
  const $ = id => document.getElementById(id);
  const feed = $('feed'), composer = $('composer');
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let state = C.readStore(storage), filter = 'All', order = [], visible = [], activeId = '', observer;
  let activeTask = null, taskSerial = 0, predictionId = '', toastTimer, previousFocus, lastConnectionStamp;
  const cards = new Map(), reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const allDecks = () => [...state.custom, ...seeds];
  const findDeck = id => allDecks().find(d => d.id === id);
  const position = id => state.progress[id] ?? -1;
  const say = message => {
    $('toast').textContent = message; $('toast').classList.add('visible');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 4200);
  };
  function save() {
    if (!C.writeStore(storage, state)) say('Storage is unavailable or full. This session still works, but new changes may not survive a reload.');
    $('saved-count').textContent = state.saved.length;
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function button(text, className, action) {
    const node = el('button', className, text); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function scrollToDeck(id, smooth = true) {
    const card = cards.get(id);
    if (!card) return;
    activeId = id;
    feed.scrollTo({ top: card.offsetTop - feed.offsetTop, behavior: smooth && !reducedMotion.matches ? 'smooth' : 'instant' });
  }
  function moveList(id, direction) {
    const index = visible.findIndex(d => d.id === id), next = visible[index + direction];
    if (next) scrollToDeck(next.id);
    else if (direction > 0) feed.scrollTo({ top: feed.scrollHeight, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  }
  function changeRank(id, value) {
    if (!findDeck(id)) return;
    state.progress[id] = Math.max(-1, Math.min(9, value));
    activeId = id; save(); renderCard(id);
    const title = cards.get(id)?.querySelector('.deck-title');
    if (title) { title.setAttribute('tabindex', '-1'); title.focus({ preventScroll: true }); }
  }
  function advance(id) {
    if (position(id) < 9) changeRank(id, position(id) + 1); else moveList(id, 1);
  }
  function toggleSaved(id) {
    if (state.saved.includes(id)) state.saved = state.saved.filter(value => value !== id);
    else state.saved.push(id);
    save(); renderCard(id);
    say(state.saved.includes(id) ? 'Saved to your shelf on this device.' : 'Removed from your shelf.');
    if (filter === 'Saved') renderFeed();
  }
  function renderCard(id) {
    const deck = findDeck(id), card = cards.get(id);
    if (!deck || !card) return;
    const q = selector => card.querySelector(selector), index = position(id), cover = index === -1, final = index === 9;
    const item = cover ? null : deck.items[index];
    card.dataset.stage = cover ? 'cover' : final ? 'finale' : 'entry';
    card.setAttribute('aria-label', `${deck.title}${cover ? ', introduction' : `, rank ${item.rank}`}`);
    q('.category').textContent = deck.category;
    q('.edition').textContent = deck.origin === 'starter' ? 'STARTER · EDITORIAL' : deck.origin === 'ai' ? 'YOUR AI · UNVERIFIED' : 'IMPORTED · UNVERIFIED';
    const saved = state.saved.includes(id);
    q('.save').textContent = saved ? '♥' : '♡'; q('.save').setAttribute('aria-pressed', String(saved));
    q('.save').setAttribute('aria-label', `${saved ? 'Unsave' : 'Save'} ${deck.title}`);
    q('.rank-number').textContent = cover ? '10' : String(item.rank).padStart(2, '0');
    q('.rank-label').textContent = cover ? 'FOLLOW YOUR CURIOSITY' : final ? 'THE FINAL REVEAL' : index >= 5 ? 'DEEPER DOWN THE RABBIT HOLE' : 'ONE DOOR LEADS TO ANOTHER';
    q('.series').textContent = cover ? 'TEN DISCOVERIES. ONE MORE RABBIT HOLE.' : deck.title;
    q('.deck-title').textContent = cover ? deck.title : item.title;
    q('.deck-detail').textContent = cover ? deck.hook : item.detail;
    q('.why summary').textContent = cover ? 'What makes the cut?' : 'Why this spot?';
    q('.why-copy').textContent = cover ? deck.rankingBasis : `${item.why} Ranking basis: ${deck.rankingBasis}`;
    q('.source-note').textContent = deck.origin === 'starter' ? 'An original starter edition, not a live AI response. Rankings are editorial.' : `Model: ${deck.model || 'not provided'}. General-knowledge or imported content, not independently verified or live researched. Sources, when supplied, are unverified.`;
    const links = q('.source-links'); links.replaceChildren();
    deck.sources.forEach(source => {
      const link = el('a', '', source.label); link.href = source.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
    });
    if (!cover) {
      const link = el('a', '', 'Explore this topic (web search, not a citation)');
      link.href = `https://www.google.com/search?q=${encodeURIComponent(item.title)}`; link.target = '_blank'; link.rel = 'noopener noreferrer'; links.append(link);
    }
    q('.finale').hidden = !final;
    const pick = state.picks[id];
    q('.prediction-result').textContent = pick ? `Your #1: ${pick}. ${C.canonical(pick) === C.canonical(deck.items[9].title) ? 'You and this edition agree.' : 'Different pick? That is half the fun.'}` : 'A ranking is the start of a conversation, not the last word.';
    q('.votes').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(state.votes[id] === b.dataset.vote)));
    const rabbits = q('.rabbit-holes'); rabbits.replaceChildren();
    if (final) deck.nextTopics.forEach(topic => rabbits.append(button(`${topic} ↗`, '', () => openComposer(topic))));
    q('.progress').querySelectorAll('button').forEach((b, i) => {
      b.classList.toggle('seen', i <= index); b.classList.toggle('current', i === index); b.setAttribute('aria-pressed', String(i === index));
    });
    q('.back').hidden = cover;
    q('.predict').hidden = !cover;
    q('.predict').textContent = pick ? 'Edit your #1' : 'Call your #1';
    q('.advance').textContent = cover ? 'Enter the countdown →' : final ? 'Next rabbit hole ↓' : `Reveal #${item.rank - 1} →`;
    q('.gesture-hint').textContent = final ? 'More like this? Pick a rabbit hole above.' : 'Scroll for another list · swipe left to reveal';
  }
  function makeCard(deck) {
    const card = $('deck-template').content.firstElementChild.cloneNode(true);
    card.dataset.id = deck.id; card.dataset.category = deck.category; cards.set(deck.id, card);
    card.querySelector('.save').onclick = () => toggleSaved(deck.id);
    card.querySelector('.advance').onclick = () => advance(deck.id);
    card.querySelector('.back').onclick = () => changeRank(deck.id, position(deck.id) - 1);
    card.querySelector('.predict').onclick = () => openPrediction(deck.id);
    card.querySelector('.share').onclick = () => share(deck);
    card.querySelector('.export').onclick = () => exportDeck(deck);
    card.querySelectorAll('.vote').forEach(b => b.onclick = () => {
      if (state.votes[deck.id] === b.dataset.vote) delete state.votes[deck.id]; else state.votes[deck.id] = b.dataset.vote;
      save(); renderCard(deck.id);
    });
    for (let index = 0; index < 10; index++) {
      const b = button('', '', () => changeRank(deck.id, index));
      b.setAttribute('aria-label', `Reveal rank ${10 - index} (spoiler)`); b.title = `Rank ${10 - index}`;
      card.querySelector('.progress').append(b);
    }
    let start;
    const ignored = target => target.closest('button,a,input,textarea,select,summary,details');
    card.addEventListener('pointerdown', e => { if (!ignored(e.target) && e.isPrimary !== false) start = { x: e.clientX, y: e.clientY }; });
    card.addEventListener('pointercancel', () => { start = null; });
    card.addEventListener('pointerup', e => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y; start = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) advance(deck.id); else changeRank(deck.id, position(deck.id) - 1);
      }
    });
    card.addEventListener('focusin', () => { activeId = deck.id; });
    renderCard(deck.id);
    return card;
  }
  function renderFeed(preferredId) {
    observer?.disconnect(); cards.clear(); feed.replaceChildren();
    const decks = allDecks();
    visible = decks.filter(d => filter === 'All' || (filter === 'Saved' ? state.saved.includes(d.id) : d.category === filter));
    if (order.length) visible.sort((a, b) => {
      const ai = order.indexOf(a.id), bi = order.indexOf(b.id);
      return (ai === -1 ? -1 : ai) - (bi === -1 ? -1 : bi);
    });
    visible.forEach(deck => feed.append(makeCard(deck)));
    const end = el('section', `end-card${visible.length ? '' : ' empty'}`);
    end.append(el('p', 'eyebrow', visible.length ? 'YOU FOUND THE END OF THIS PATH' : 'A NEW SHELF. A BLANK PAGE.'), el('h2', '', visible.length ? 'Curiosity does not end here.' : filter === 'Saved' ? 'Keep the good rabbit holes.' : 'Make the first countdown.'), el('p', '', visible.length ? `${seeds.length} original starter editions are included. Create something new with your AI, or shuffle the starters for another pass.` : filter === 'Saved' ? 'Tap the heart on a countdown to keep it here. Your saves stay on this browser, not a public account.' : 'Try another category or create a top ten about this one.'));
    end.append(button('Create a top 10 ＋', 'primary', () => openComposer('')), button('Shuffle the starters ↝', 'secondary', shuffleFeed));
    feed.append(end);
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
    $('feed-count').textContent = `${visible.length} ${visible.length === 1 ? 'DOOR' : 'DOORS'}`;
    $('feed-label').textContent = filter === 'Saved' ? 'YOUR PRIVATE SHELF' : 'CHOOSE A DOOR';
    $('saved-count').textContent = state.saved.length;
    activeId = visible.some(d => d.id === preferredId) ? preferredId : visible[0]?.id || '';
    feed.scrollTop = 0;
    if (activeId) requestAnimationFrame(() => scrollToDeck(activeId, false));
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const current = entries.filter(e => e.isIntersecting && e.intersectionRatio >= .45).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) activeId = current.target.dataset.id;
      }, { root: feed, threshold: [.45, .6, .85] });
      cards.forEach(card => observer.observe(card));
    }
  }
  function shuffleFeed() {
    filter = 'All'; order = C.shuffle(seeds.map(d => d.id));
    if (order[0] === activeId) order.push(order.shift());
    seeds.forEach(d => { state.progress[d.id] = -1; }); save(); renderFeed(order[0]);
    say('Starter editions reshuffled. No AI request was made.');
  }
  function openDialog(dialog) {
    previousFocus = document.activeElement;
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog(dialog) {
    if (dialog === composer) stopGeneration();
    dialog.close(); previousFocus?.focus?.({ preventScroll: true });
  }
  function openPrediction(id) {
    predictionId = id;
    $('prediction-topic').textContent = findDeck(id).title;
    $('prediction-input').value = state.picks[id] || '';
    openDialog($('prediction')); $('prediction-input').focus();
  }
  function connectionStamp() {
    const s = AI?.getSettings?.() || {}, sub = window.BallzatramSubscription;
    return JSON.stringify([s.mode, s.model, s.nativeModel, s.bridgeUrl, s.provider, sub?.settings?.().endpoint, sub?.settings?.().model, sub?.connection?.()?.token]);
  }
  function refreshConnection() {
    const s = AI?.getSettings?.() || { mode: 'demo' }, connected = AI?.isConnected?.() || false;
    const subscription = s.mode === 'subscription', paid = ['openrouter', 'native'].includes(s.mode);
    const configured = !!window.BallzatramSubscription?.settings?.().endpoint;
    $('connection-label').textContent = connected ? `Your AI is connected · ${subscription ? 'ChatGPT subscription' : s.mode === 'openrouter' ? 'OpenRouter' : 'API account'}` : 'Connect your AI to generate here';
    $('connection-detail').textContent = connected
      ? subscription ? 'Your selected model uses your ChatGPT plan’s Codex allowance. The countdown returns directly to this feed.' : 'Your explicitly selected API account runs this countdown here. Separate API charges apply.'
      : subscription && !configured ? 'Subscription generation is awaiting the site’s runtime activation. Your topic stays here; the separate MCP connector does not run this page.'
      : paid ? 'Your selected API connection is not ready. Reconnect it in AI settings, or explicitly connect ChatGPT below.'
      : 'Connect ChatGPT below. After the initial provider sign-in, generate without leaving this page. Manual export and local preview are not AI connections.';
    $('generate').textContent = connected ? 'Generate with my AI →' : 'Connect AI to generate →';
    $('consent-copy').textContent = paid ? 'Use my selected API account for this one countdown. Separate API charges apply.' : 'Use my connected ChatGPT subscription for this one countdown. My plan’s Codex usage limits apply.';
    const stamp = connectionStamp();
    if (lastConnectionStamp !== undefined && lastConnectionStamp !== stamp) $('consent').checked = false;
    lastConnectionStamp = stamp;
    if (activeTask && activeTask.stamp !== stamp) {
      stopGeneration(); status('Your AI connection changed. Review it before sending another request.', true);
    }
  }
  function draft() {
    try { sessionStorage.setItem('beckets-labyrinth:draft', JSON.stringify({ topic: $('topic').value, vibe: $('vibe').value })); } catch { /* Optional. */ }
  }
  function openComposer(topic) {
    if (activeTask) return;
    if (typeof topic === 'string') $('topic').value = topic.slice(0, 240);
    $('consent').checked = false; status('');
    $('import-status').textContent = ''; refreshConnection(); openDialog(composer); $('topic').focus();
  }
  function status(message, error = false) {
    $('generation-status').textContent = message; $('generation-status').classList.toggle('error', error);
  }
  function busy(value) {
    $('compose-fields').disabled = value; $('cancel-generation').hidden = !value;
    $('import-countdown').disabled = value; $('free-edition').disabled = value; $('clear-local').disabled = value;
    composer.setAttribute('aria-busy', String(value));
  }
  function stopGeneration() {
    if (!activeTask) return;
    const task = activeTask; activeTask = null; taskSerial++; clearTimeout(task.timer); task.controller.abort(); busy(false);
    status('Stopped. Work already started may still count against your provider’s limits. No retry was made.');
  }
  function ensureSpace() {
    if (state.custom.length >= 30 && state.custom.every(d => state.saved.includes(d.id))) throw new Error('Your 30-edition local shelf is full. Unsave an edition or export and clear this device before making another.');
  }
  function addCustom(deck, origin, model = '') {
    ensureSpace();
    if (state.custom.length >= 30) {
      const discard = [...state.custom].reverse().find(d => !state.saved.includes(d.id));
      state.custom = state.custom.filter(d => d.id !== discard.id);
      delete state.progress[discard.id]; delete state.picks[discard.id]; delete state.votes[discard.id];
    }
    const id = `local-${crypto.randomUUID()}`;
    state.custom.unshift({ ...C.validateDeck(deck), id, origin, model, createdAt: new Date().toISOString() });
    state.progress[id] = -1; filter = 'All'; order = []; save(); renderFeed(id);
    return id;
  }
  function connectSubscription() {
    try {
      if (!window.OsirisPanel) throw new Error('Connection settings did not load. Reload this page.');
      draft(); $('consent').checked = false;
      window.OsirisPanel.open({ tool: 'beckets-labyrinth', prompt: 'Connect my AI for countdowns.', context: { topic: $('topic').value } }, { connectionOnly: true });
    } catch (error) { status(error.message, true); }
  }
  async function generate(event) {
    event.preventDefault(); if (activeTask) return;
    let task;
    try {
      if (!$('consent').checked) throw new Error('Confirm the topic and style before using your AI.');
      const payload = C.request($('topic').value, $('vibe').value); ensureSpace();
      const settings = AI?.getSettings?.();
      if (!settings) throw new Error('The shared AI client did not load. Reload or use a free starter.');
      if (!AI.isConnected()) {
        connectSubscription();
        status('Connect your AI here, then review and generate your countdown. Your topic is preserved; nothing has been sent.');
        return;
      }
      if (['native', 'openrouter'].includes(settings.mode) && settings.maxTokens < 1200) throw new Error('Ten entries need more room. Choose a 1,200 or 2,400 output-token limit in AI settings first. Nothing was sent.');
      draft();
      const serial = ++taskSerial, controller = new AbortController();
      task = { serial, controller, stamp: connectionStamp(), timer: null }; activeTask = task;
      task.timer = setTimeout(() => { if (activeTask === task) { stopGeneration(); status('The request timed out. No retry was made; review your provider’s activity before trying again.', true); } }, 180000);
      busy(true); status('Your AI is building ten doors. You can stop this request below.');
      const result = await C.generate(AI, payload, { signal: controller.signal, consent: true, onStatus: () => { if (activeTask === task) status('Your connected AI is working on this countdown…'); } });
      if (activeTask !== task || serial !== taskSerial || controller.signal.aborted) return;
      if (task.stamp !== connectionStamp()) throw new Error('Your AI connection changed before the answer finished. No countdown was added.');
      if (result.kind !== 'deck') throw new Error('The AI did not return a complete countdown. Nothing was added.');
      addCustom(result.deck, 'ai', result.model);
      clearTimeout(task.timer); activeTask = null; busy(false); composer.close();
      say('Your AI countdown is ready. Ten new doors to open.');
    } catch (error) { if (!task || activeTask === task) status(error.message || 'The countdown could not be generated. No retry was made.', true); }
    finally {
      if (task) clearTimeout(task.timer);
      if (activeTask === task) { activeTask = null; busy(false); }
      $('consent').checked = false;
    }
  }
  async function copyField(field, output) {
    try { await navigator.clipboard.writeText(field.value); output.textContent = 'Copied.'; }
    catch { field.focus(); field.select(); output.textContent = 'Clipboard unavailable. Select and copy the text above.'; }
  }
  function share(deck) {
    const url = new URL(location.pathname, location.origin);
    if (deck.origin === 'starter') url.searchParams.set('list', deck.id); else url.searchParams.set('topic', deck.title);
    $('share-link').value = url.href; $('share-status').textContent = '';
    $('share-note').textContent = deck.origin === 'starter' ? 'This link opens the same starter countdown. Their picks and progress stay on their own device.' : 'This link shares the topic, not your locally generated result. The recipient chooses whether to generate it with their own AI. Export JSON to share this exact edition.';
    openDialog($('share-dialog'));
  }
  function exportDeck(deck) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(C.validateDeck(deck), null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'beckets-labyrinth-countdown.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); say('Exported this edition without your picks, account, or AI credentials.');
  }

  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter = b.dataset.filter; renderFeed(); });
  document.querySelectorAll('dialog:not(.osiris-dialog)').forEach(dialog => {
    dialog.querySelector('.close-dialog')?.addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('cancel', e => { e.preventDefault(); closeDialog(dialog); });
  });
  $('create-top').onclick = () => openComposer(); $('surprise-feed').onclick = shuffleFeed; $('mobile-surprise').onclick = shuffleFeed;
  $('prediction-form').onsubmit = e => {
    e.preventDefault(); state.picks[predictionId] = $('prediction-input').value.trim().slice(0, 100); save(); renderCard(predictionId); closeDialog($('prediction')); say('Your #1 is locked in. Let the countdown begin.');
  };
  $('random-topic').onclick = () => { $('topic').value = C.surprise($('topic').value); $('consent').checked = false; draft(); };
  [$('topic'), $('vibe')].forEach(input => input.addEventListener('input', () => { $('consent').checked = false; draft(); }));
  $('generate-form').onsubmit = generate; $('cancel-generation').onclick = stopGeneration;
  $('connect-subscription').onclick = connectSubscription;
  $('other-ai').onclick = draft;
  $('free-edition').onclick = () => { closeDialog(composer); shuffleFeed(); };
  $('copy-link').onclick = () => copyField($('share-link'), $('share-status'));
  $('import-countdown').onclick = () => {
    if (activeTask) return;
    try {
      const deck = C.parseDeck($('import-json').value); addCustom(deck, 'import'); $('import-json').value = ''; composer.close(); say('Imported a complete top ten. Its claims are not independently verified.');
    } catch (error) { $('import-status').textContent = error.message; }
  };
  $('clear-local').onclick = () => {
    if (!confirm('Clear only this browser’s Beckets Labyrinth editions, picks, progress, and saved shelf? Export editions you want to keep first. Your other site data and AI connection will not be touched.')) return;
    state = C.emptyStore(); save(); filter = 'All'; order = []; renderFeed();
    try { sessionStorage.removeItem('beckets-labyrinth:draft'); } catch { /* Optional. */ }
    $('topic').value = ''; $('consent').checked = false; status('This device’s Labyrinth activity has been cleared.');
  };
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,summary,button,a')) return;
    if (!activeId || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'ArrowRight') advance(activeId);
    if (e.key === 'ArrowLeft') changeRank(activeId, position(activeId) - 1);
    if (e.key === 'ArrowDown') moveList(activeId, 1);
    if (e.key === 'ArrowUp') moveList(activeId, -1);
  });
  window.addEventListener('ballzatram:ai-connection-change', refreshConnection);
  window.addEventListener('focus', refreshConnection);
  window.addEventListener('pageshow', refreshConnection);
  window.addEventListener('pagehide', () => { stopGeneration(); observer?.disconnect(); });
  try {
    const savedDraft = JSON.parse(sessionStorage.getItem('beckets-labyrinth:draft') || 'null');
    if (typeof savedDraft?.topic === 'string') $('topic').value = savedDraft.topic.slice(0, 240);
    if (C.VIBES.includes(savedDraft?.vibe)) $('vibe').value = savedDraft.vibe;
  } catch { /* A missing draft does not block exploration. */ }
  state.saved = state.saved.filter(id => allDecks().some(d => d.id === id));
  const params = new URLSearchParams(location.search), selected = params.get('list');
  renderFeed(selected); refreshConnection();
  const sharedTopic = params.get('topic');
  if (sharedTopic && sharedTopic.length <= 240) openComposer(sharedTopic);
})();