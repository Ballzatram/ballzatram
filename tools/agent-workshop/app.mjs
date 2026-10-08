import { createWorkflow, initialState, DEFAULT_CONFIG, SOURCES, validateConfig } from './core.mjs';
import { LESSONS } from './lessons.mjs';

const $ = id => document.getElementById(id);
let graph, runConfig, state, next, events, started, busy, running, waiting, selected, eventIndex, epoch = 0;
const terminal = () => started && next.length === 0;
const readConfig = () => validateConfig({query: $('query').value, top_k: Number($('top-k').value), min_sources: Number($('min-sources').value), max_revisions: Number($('max-revisions').value), fault: $('fault').value});

function showDetail() {
  const lesson = LESSONS[selected];
  $('node-label').textContent = selected.toUpperCase();
  for (const [id, value] of Object.entries({'lesson-title': lesson.title, 'lesson-description': lesson.description, 'lesson-why': lesson.why, 'lesson-try': lesson.try, 'lesson-contract': lesson.contract, 'python-code': lesson.code})) $(id).textContent = value;
  const event = eventIndex >= 0 ? events[eventIndex] : [...events].reverse().find(item => item.node === selected);
  $('state-hint').textContent = event ? `Actual execution ${events.indexOf(event) + 1}. Select an earlier visit in the trail to compare repairs.` : 'This node has not completed yet. Run it to inspect its actual state.';
  $('state-json').textContent = event ? JSON.stringify(event[$('snapshot').value], null, 2) : 'No execution recorded.';
}

function selectNode(node, index = -1) {
  selected = node; eventIndex = index; renderGraph(); showDetail(); renderTrace();
}

function renderGraph() {
  document.querySelectorAll('[data-node]').forEach(button => {
    const node = button.dataset.node;
    const count = events.filter(event => event.node === node).length;
    button.setAttribute('aria-pressed', String(selected === node));
    button.classList.toggle('executed', count > 0);
    button.classList.toggle('next', next.includes(node) && !terminal());
    button.querySelector('.node-status').textContent = next.includes(node) ? (node === 'review' ? 'Awaiting your decision' : 'Next step') : count ? `Executed ${count > 1 ? `×${count}` : ''}` : '';
  });
}

function renderTrace() {
  const container = $('trace'); container.replaceChildren();
  if (!events.length) {
    const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Your first run starts here. Try Step once and watch the shared state change.'; container.append(p); return;
  }
  events.forEach((event, index) => {
    const button = document.createElement('button');
    button.textContent = `${String(index + 1).padStart(2, '0')} / ${event.node}`;
    const meta = document.createElement('small');
    meta.textContent = `${event.duration_ms} ms${event.node === 'check' ? (event.patch.issues.length ? ' · needs repair' : ' · checks passed') : ''}`;
    button.append(meta); button.classList.toggle('failed', event.node === 'check' && event.patch.issues.length > 0);
    button.setAttribute('aria-pressed', String(eventIndex === index));
    button.addEventListener('click', () => {selectNode(event.node, index); $('tab-state').click();}); container.append(button);
  });
}

function render() {
  const ended = terminal();
  $('run').disabled = busy || running || waiting || ended;
  $('step').disabled = busy || running || waiting || ended;
  $('reset').disabled = busy;
  $('pause').hidden = !running;
  $('pause').disabled = !running;
  $('approve').disabled = busy;
  $('reject').disabled = busy;
  $('decision-panel').hidden = !waiting;
  $('review-jump').hidden = !waiting;
  $('export-run').disabled = events.length === 0 || busy;
  $('export-config').disabled = busy;
  document.querySelectorAll('#settings input, #settings select, #settings textarea').forEach(input => {input.disabled = started || busy;});
  $('step-count').textContent = events.length;
  $('repair-count').textContent = state.revisions;
  $('result-status').textContent = waiting ? 'Human review' : ended ? state.status : started ? 'In progress' : 'Ready';
  $('run-status').textContent = state.status === 'error' ? state.reason : waiting ? 'Paused at review. Your decision is required below.' : ended ? `${state.status === 'blocked' ? 'Stopped' : 'Finished'} · ${state.status}` : busy ? 'Executing a node…' : started ? `Next: ${next.join(', ')} · checkpoint saved in page memory` : 'Ready · try the broken-citation scenario';
  $('result').hidden = !ended;
  $('result-title').textContent = state.status === 'approved' ? 'Approved practice draft' : state.status === 'rejected' ? 'Rejected by reviewer' : 'Run stopped';
  $('result-text').textContent = state.result || state.reason;
  if (waiting) {
    $('review-draft').replaceChildren();
    for (const claim of state.claims) {
      const card = document.createElement('div'); card.className = 'claim';
      const p = document.createElement('p'); p.textContent = claim.text;
      const source = document.createElement('small'); source.textContent = `Source: ${claim.source_id}`;
      card.append(p, source); $('review-draft').append(card);
    }
  }
  renderGraph(); renderTrace(); showDetail();
}

function reset() {
  epoch++; running = false; busy = false; waiting = false; started = false; graph = null;
  state = initialState(DEFAULT_CONFIG); next = ['intake']; events = []; selected = 'intake'; eventIndex = -1;
  render();
}

async function execute(inputOverride) {
  if (busy || waiting || terminal()) return;
  busy = true;
  try {
    if (!started) {
      state = initialState(readConfig());
      graph = createWorkflow(event => {events.push(event); selected = event.node; eventIndex = events.length - 1;});
      runConfig = {configurable: {thread_id: crypto.randomUUID()}, recursionLimit: 30};
      started = true; render();
      await graph.invoke(state, runConfig);
    } else {
      await graph.invoke(inputOverride ?? null, runConfig);
    }
    const snapshot = await graph.getState(runConfig);
    state = snapshot.values; next = snapshot.next; waiting = next.includes('review') && !state.decision;
    if (waiting) {running = false; selected = 'review'; eventIndex = -1;}
  } catch (error) {
    state = {...state, status: 'error', reason: error.message}; next = []; started = true; running = false;
  } finally {busy = false; render();}
}

async function runAll() {
  if (running || waiting || terminal()) return;
  running = true; const current = epoch; render();
  while (running && current === epoch && !waiting && !terminal()) {
    await execute();
    // This is a viewing pace, not a latency measurement. Node timings exclude it.
    if (running && !waiting && !terminal()) await new Promise(resolve => setTimeout(resolve, 280));
  }
  if (current === epoch) {running = false; render();}
}

async function decide(decision) {
  if (!waiting || busy) return;
  busy = true; render();
  try {
    await graph.updateState(runConfig, {decision});
    waiting = false;
  } catch (error) {
    state = {...state, status: 'error', reason: error.message}; next = []; waiting = false;
  } finally {busy = false; render();}
  await runAll();
}

function download(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], {type: 'application/json'}));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindTabs(selector, attr, panelPrefix = '') {
  const tabs = [...document.querySelectorAll(selector)];
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      for (const item of tabs) {
        const active = tab === item;
        item.setAttribute('aria-selected', String(active)); item.tabIndex = active ? 0 : -1;
        $(panelPrefix + item.dataset[attr]).hidden = !active;
      }
    });
    tab.addEventListener('keydown', event => {
      const offset = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (offset || ['Home', 'End'].includes(event.key)) {
        event.preventDefault(); const target = tabs[event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (i + offset + tabs.length) % tabs.length];
        target.click(); target.focus();
      }
    });
  });
}

$('settings').addEventListener('submit', event => event.preventDefault());
$('run').addEventListener('click', runAll);
$('step').addEventListener('click', () => execute());
$('pause').addEventListener('click', () => {running = false; render();});
$('reset').addEventListener('click', reset);
$('approve').addEventListener('click', () => decide('approve'));
$('reject').addEventListener('click', () => decide('reject'));
$('snapshot').addEventListener('change', showDetail);
$('export-config').addEventListener('click', () => {
  try {download('config.json', started ? state.config : readConfig());}
  catch (error) {$('run-status').textContent = error.message;}
});
$('export-run').addEventListener('click', () => download('agent-workshop-trace.json', {version: 1, engine: '@langchain/langgraph', mode: 'deterministic-practice', model_calls: 0, thread_id: runConfig.configurable.thread_id, config: state.config, next, state, events}));
document.querySelectorAll('[data-node]').forEach(button => button.addEventListener('click', () => {
  selectNode(button.dataset.node);
  if (matchMedia('(max-width:720px)').matches) document.querySelector('.inspector').scrollIntoView({block: 'start'});
}));
document.querySelectorAll('#settings input, #query, #fault').forEach(input => input.addEventListener('input', () => {$('scenario').value = 'custom';}));
$('scenario').addEventListener('change', () => {
  const scenario = $('scenario').value;
  if (scenario === 'custom') return;
  $('query').value = scenario === 'empty' ? 'Unicorn banana weather' : DEFAULT_CONFIG.query;
  $('top-k').value = 3; $('min-sources').value = 2; $('max-revisions').value = 2;
  $('fault').value = scenario === 'repair' ? 'once' : scenario === 'budget' ? 'always' : 'none';
});
bindTabs('[data-view]', 'view'); bindTabs('[data-detail]', 'detail', 'detail-');
for (const source of SOURCES) {
  const li = document.createElement('li'); const a = document.createElement('a');
  a.textContent = source.title; a.href = source.url; li.append(a); $('source-list').append(li);
}
let pythonLoaded = false;
$('full-python').parentElement.addEventListener('toggle', async event => {
  if (!event.target.open || pythonLoaded) return;
  try {
    const response = await fetch('reference/workflow.py');
    if (!response.ok) throw new Error('Source could not be loaded. Use the download link above.');
    $('full-python').textContent = await response.text(); pythonLoaded = true;
  } catch (error) {$('full-python').textContent = error.message;}
});
if (matchMedia('(max-width:720px)').matches) document.querySelector('.knobs').open = false;
reset();
