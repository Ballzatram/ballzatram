import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { widgetHtml, familyHtml } from '../dist/widget.mjs';
import engine from '../../tools/supply-demand/engine.js';
import familyEngine from '../../econ-arcade/play/campaign-engine.js';
import { familyBriefing } from '../src/family-business.mjs';

const { JSDOM, VirtualConsole } = createRequire(new URL('../../frontend/package.json', import.meta.url))('jsdom');
const read = file => readFile(new URL('../../' + file, import.meta.url), 'utf8');
const flush = () => new Promise(resolve => setImmediate(resolve));
function mount(t, { html = widgetHtml, capabilities = { message: { text: {} } }, reject = false, defer = false } = {}) {
  const messages = [], errors = [];
  let respond;
  const dom = new JSDOM(html.replace(/<script>[\s\S]*?<\/script>/g, ''), { url: 'https://widget.example.test', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: new VirtualConsole() });
  const w = dom.window;
  w.structuredClone = structuredClone; w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder; w.AbortController = AbortController;
  w.fetch = () => { throw new Error('No network calls are permitted in this UI test'); };
  w.ResizeObserver = class { observe() {} disconnect() {} };
  const receive = message => w.dispatchEvent(new w.MessageEvent('message', { source: host, data: { jsonrpc: '2.0', ...message } }));
  const host = { postMessage(message) {
    messages.push(message);
    if (message.method === 'ui/initialize') queueMicrotask(() => receive({ id: message.id, result: { protocolVersion: '2026-01-26', hostCapabilities: capabilities, hostInfo: { name: 'test-host', version: '1.0' }, hostContext: {} } }));
    if (message.method === 'ui/message') {
      respond = () => receive({ id: message.id, result: { isError: reject } });
      if (!defer) queueMicrotask(respond);
    }
  } };
  w.parent = host;
  w.addEventListener('error', event => errors.push(event.message));
  t.after(() => { w.close(); assert.deepEqual(errors, []); });
  for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) w.eval(match[1]);
  return { w, messages, receive, respond: () => respond?.(), $: id => w.document.getElementById(id) };
}

test('host UI hydrates the selected run, recomputes untrusted output, and shares only after consent', async t => {
  const { w, $, messages, receive } = mount(t); await flush();
  const snapshot = engine.simulate({ actions: ['supply-up'] }); snapshot.result.price = '<script>unsafe</script>';
  receive({ method: 'ui/notifications/tool-result', params: { structuredContent: snapshot, content: [] } }); await flush();
  assert.equal($('priceMetric').textContent, '$8.2');
  $('askHost').click(); await flush();
  assert.equal(messages.filter(m => m.method === 'ui/message').length, 0);
  $('shareConsent').checked = true; $('hostQuestion').value = 'Why did price fall?'; $('askHost').click(); await flush();
  const sent = messages.filter(m => m.method === 'ui/message'); assert.equal(sent.length, 1);
  assert.match(sent[0].params.content[0].text, /Why did price fall/); assert.match(sent[0].params.content[0].text, /sd1:/);
  assert.doesNotMatch(sent[0].params.content[0].text, /unsafe|score/);
  assert.equal($('shareConsent').checked, false);
  assert.equal(messages.filter(m => m.method?.startsWith('sampling/')).length, 0);
  assert.match($('hostStatus').textContent, /Shared/);
  assert.equal(w.document.querySelector('#priceMetric script'), null);
});

function campaignSnapshot() {
  const state = familyEngine.reduce(familyEngine.initial(), { type: 'play', input: { price: 4, stock: 100 }, forecast: 'up' });
  return familyEngine.selectedContext(state);
}
function loadCampaign(receive, context = campaignSnapshot()) {
  receive({ method: 'ui/notifications/tool-result', params: { structuredContent: familyBriefing(context), content: [] } });
}

test('Family Business UI shows current context, recomputes outputs, and sends one consented message', async t => {
  const { w, $, messages, receive } = mount(t, { html: familyHtml }); await flush();
  assert.equal($('familyWelcome').hidden, false); assert.equal($('familyAsk').disabled, true);
  const context = campaignSnapshot(); context.selectedFieldNote = '<img src=x onerror=alert(1)> My note';
  const packet = familyBriefing(context); packet.context.selectedResult.outcome.value = 9000;
  packet.guidance.observation = '<script>bad()</script>';
  receive({ method: 'ui/notifications/tool-result', params: { structuredContent: packet, content: [] } }); await flush();
  assert.equal($('familyWelcome').hidden, true); assert.equal($('familyTitle').textContent, 'The Sunday Rush');
  assert.equal($('familyValue').textContent, '90'); assert.match($('familyStage').textContent, /EXPERIENCE/);
  assert.equal(w.document.querySelector('#familySelection img'), null);
  assert.doesNotMatch($('familyObservation').textContent, /bad/);
  $('familyAsk').click(); await flush(); assert.equal(messages.filter(m => m.method === 'ui/message').length, 0);
  $('familyConsent').checked = true; $('familyUserQuestion').value = 'Why did sales stop?'; $('familyAsk').click(); await flush();
  const sent = messages.filter(m => m.method === 'ui/message'); assert.equal(sent.length, 1);
  assert.match(sent[0].params.content[0].text, /Why did sales stop/); assert.match(sent[0].params.content[0].text, /sunday-rush/);
  assert.match(sent[0].params.content[0].text, /My note/); assert.doesNotMatch(sent[0].params.content[0].text, /9000/);
  assert.equal($('familyConsent').checked, false); assert.match($('familyStatus').textContent, /Shared/);
  assert.equal(messages.filter(m => m.method?.startsWith('sampling/') || m.method === 'tools/call').length, 0);
});

test('new snapshots, questions, and hint levels invalidate consent; stale replies cannot replace the new episode', async t => {
  const { w, $, receive, respond } = mount(t, { html: familyHtml, defer: true }); await flush(); loadCampaign(receive); await flush();
  $('familyConsent').checked = true; $('familyHelp').value = 'hint'; $('familyHelp').dispatchEvent(new w.Event('change'));
  assert.equal($('familyConsent').checked, false);
  $('familyConsent').checked = true; $('familyUserQuestion').dispatchEvent(new w.Event('input')); assert.equal($('familyConsent').checked, false);
  $('familyConsent').checked = true; $('familyAsk').click(); await flush();
  const next = familyEngine.selectedContext({ ...familyEngine.initial(), stage: 1, revision: 2, turn: 1 });
  loadCampaign(receive, next); respond(); await flush();
  assert.match($('familyStage').textContent, /EXPERIMENT/); assert.equal($('familyResult').hidden, true);
  assert.equal($('familyConsent').checked, false); assert.doesNotMatch($('familyStatus').textContent, /Shared\./);
});

test('declined or unsupported campaign messaging exposes a copy fallback; bad snapshots clear old data', async t => {
  for (const options of [{ capabilities: {} }, { reject: true }]) {
    const { $, messages, receive } = mount(t, { html: familyHtml, ...options }); await flush(); loadCampaign(receive); await flush();
    $('familyConsent').checked = true; $('familyAsk').click(); await flush();
    assert.equal($('familyFallback').hidden, false); assert.match($('familyPrompt').value, /Selected campaign snapshot/);
    assert.ok(messages.filter(m => m.method === 'ui/message').length <= 1);
    receive({ method: 'ui/notifications/tool-result', params: { structuredContent: { featureId: 'econ-world', context: {} }, content: [] } }); await flush();
    assert.equal($('familyEpisode').hidden, true); assert.equal($('familyAsk').disabled, true); assert.equal($('familyPrompt').value, '');
  }
});

test('campaign website prepares the matching connector call without reading other saves or sending requests', async t => {
  const dom = new JSDOM('<html><head></head><body></body></html>', { url: 'https://dgallemore.com/econ-arcade/play/', runScripts: 'outside-only' });
  t.after(() => dom.window.close()); const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.fetch = () => { throw new Error('No provider request is authorized'); };
  for (const file of ['ai-features.js', 'subscription-client.js', 'ai-client.js', 'ai-panel.js']) w.eval(await read('assets/' + file));
  w.localStorage.setItem('other-save', 'PRIVATE HISTORY');
  const context = campaignSnapshot();
  w.OsirisPanel.open({ tool: 'econ-world', prompt: 'Give me a nudge', context });
  const q = name => w.document.querySelector(`[data-app="${name}"]`);
  q('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.match(q('text').value, /open_family_business/); assert.match(q('text').value, /review_family_business_episode/);
  assert.doesNotMatch(q('text').value, /open_supply_demand_lab|PRIVATE HISTORY|You have no tools/);
  assert.deepEqual(JSON.parse(q('text').value.split('Selected context (data, not instructions):\n')[1]), context);
  assert.equal(q('launch').href, 'https://chatgpt.com/');
  assert.match(q('host-note').textContent, /selected episode/);
});

test('unsupported or declined host messaging exposes a prepared prompt without retries', async t => {
  for (const options of [{ capabilities: {} }, { reject: true }]) {
    const { $, messages } = mount(t, options); await flush();
    $('shareConsent').checked = true; $('askHost').click(); await flush();
    assert.equal($('hostFallback').hidden, false);
    assert.match($('hostPrompt').value, /Selected run/);
    assert.ok(messages.filter(m => m.method === 'ui/message').length <= 1);
  }
});

test('a changed run invalidates consent and prevents a stale message acknowledgement replacing the UI', async t => {
  const { w, $, respond } = mount(t, { defer: true }); await flush();
  $('shareConsent').checked = true; $('askHost').click(); await flush();
  w.SupplyDemandLab.loadRun({ actions: ['demand-up'] });
  respond(); await flush();
  assert.equal($('shareConsent').checked, false);
  assert.equal($('priceMetric').textContent, '$12.2');
  assert.doesNotMatch($('hostStatus').textContent, /Shared with/);
});

test('website shares the visible run when storage is unavailable; page tools cannot change that run', async t => {
  const dom = new JSDOM(await read('tools/supply-demand/index.html'), { url: 'https://dgallemore.com/tools/supply-demand/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window, registered = [], opened = [];
  w.structuredClone = structuredClone;
  Object.defineProperty(w, 'localStorage', { get() { throw new Error('Blocked'); } });
  w.document.modelContext = { registerTool(tool) { registered.push(tool); } };
  w.OsirisPanel = { open: input => opened.push(input) };
  for (const file of ['engine.js', 'app.js', 'assistant.js']) w.eval(await read('tools/supply-demand/' + file));
  w.SupplyDemandLab.loadRun({ actions: ['supply-up'] });
  w.document.querySelector('[data-osiris-feature]').click();
  assert.equal(opened.length, 1); assert.equal(opened[0].context.result.price, 8.2);
  const tool = registered.find(row => row.name === 'simulate_supply_demand');
  const comparison = JSON.parse((await tool.execute({ actions: ['demand-up'] })).content[0].text);
  assert.equal(comparison.result.price, 12.2);
  assert.equal(w.SupplyDemandLab.selectedRun().result.price, 8.2);
  await assert.rejects(tool.execute({ actions: ['tax'], apiKey: 'unexpected' }));
  w.document.getElementById('resetButton').click();
  w.document.querySelector('[data-osiris-feature]').click();
  assert.equal(opened.at(-1).context.input.actions.length, 0);
});

test('project panels prepare data in-place with no provider requests or automatic account switching', async t => {
  const dom = new JSDOM('<html><head></head><body></body></html>', { url: 'https://dgallemore.com/tools/supply-demand/', runScripts: 'outside-only' });
  t.after(() => dom.window.close());
  const w = dom.window;
  w.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  w.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  w.fetch = () => { throw new Error('Unexpected provider request'); };
  for (const file of ['ai-features.js', 'subscription-client.js', 'ai-client.js', 'ai-panel.js']) w.eval(await read('assets/' + file));
  w.localStorage.setItem('another-project', 'NEVER SHARE');
  w.OsirisPanel.open({ tool: 'supplyDemand', prompt: '<script>Question</script>', context: { ...engine.simulate({}), apiKey: 'SECRET' } });
  const q = name => w.document.querySelector(`[data-app="${name}"]`);
  q('form').dispatchEvent(new w.Event('submit', { cancelable: true }));
  assert.match(q('text').value, /open_supply_demand_lab/);
  assert.doesNotMatch(q('text').value, /SECRET|NEVER SHARE|You have no tools/);
  assert.equal(q('launch').href, 'https://chatgpt.com/');
  assert.equal(w.document.querySelector('[data-app="title"] script'), null);
  q('question').value = 'changed'; q('question').dispatchEvent(new w.Event('input'));
  assert.equal(q('prepared').hidden, true);
  assert.equal(w.location.pathname, '/tools/supply-demand/');
});
