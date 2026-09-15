import { App } from '@modelcontextprotocol/ext-apps';
import { familyBriefing } from '../src/family-business.mjs';

const app = new App({ name: 'Osiris · The Family Business', version: '1.1.0' }, {}, { autoResize: true, strict: true });
const $ = id => document.getElementById(id);
const status = text => { $('familyStatus').textContent = text; };
const money = value => `$${value.toFixed(2)}`;
let packet = familyBriefing(), connected = false, busy = false, epoch = 0, controller;
function invalidate() {
  epoch++; controller?.abort(); controller = null; busy = false;
  $('familyConsent').checked = false; $('familyAsk').disabled = packet.needsContext;
  $('familyFallback').hidden = true; $('familyPrompt').value = '';
}
function render() {
  const c = packet.context, r = c?.selectedResult;
  $('familyWelcome').hidden = !packet.needsContext; $('familyEpisode').hidden = packet.needsContext;
  if (!c) { $('familySelection').textContent = ''; return; }
  const stage = { observe: 'Experience', 'controlled experiment': 'Experiment', transfer: 'Adapt' }[c.stage];
  $('familyStage').textContent = `${c.rank.toUpperCase()} · ${stage.toUpperCase()}${c.practice ? ' · REVISIT' : ''}`;
  $('familyTitle').textContent = c.episode; $('familyBrief').textContent = c.brief;
  $('familyAssignment').textContent = c.finished && !c.practice ? 'Campaign complete. Revisit a contract or explore another lab on the website.' : c.assignment;
  $('familyCash').textContent = money(c.ledger.cash); $('familyDebt').textContent = money(c.ledger.debt);
  $('familyTrust').textContent = `${c.ledger.trust}/100`;
  $('familyRevision').textContent = `Shared turn ${c.turn} · revision ${c.revision} · ${c.phase === 'result' ? 'result selected' : 'planning'} · ledger reported by your game`;
  $('familyResult').hidden = !r;
  if (r) {
    $('familyMetric').textContent = r.outcome.metric; $('familyValue').textContent = String(r.outcome.value);
    $('familyReference').textContent = String(r.outcome.reference); $('familyStory').textContent = r.outcome.story;
    $('familyEvidence').textContent = c.stage === 'observe' ? 'This first observation is ungraded. Notice what happened before explaining why.'
      : `${r.evidence.predictionMatched ? 'Your prediction matched.' : 'Your prediction missed.'} ${r.evidence.experimentCompleted ? 'The assignment’s progression condition was met.' : 'The assignment needs another attempt.'} This does not establish complete mastery.`;
    $('familyPlan').replaceChildren();
    for (const control of packet.controls) {
      const row = document.createElement('tr');
      const format = value => control.type === 'choice' ? control.options.find(option => option[0] === value)[1] : control.unit === '$' ? money(value) : `${value}${control.unit || ''}`;
      for (const value of [control.label, format(r.plan[control.id]), format(r.comparisonPlan[control.id])]) { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); }
      $('familyPlan').append(row);
    }
    $('familyFacts').replaceChildren();
    for (const fact of r.outcome.facts) { const item = document.createElement('li'); item.textContent = `${fact.label}: ${fact.value}`; $('familyFacts').append(item); }
    $('familyCashChange').textContent = `Episode surplus: ${money(r.episodeSurplus)}. Reported total cash change: ${money(r.ledgerChange)}. Other businesses, borrowing, and debt interest can also affect the ledger.`;
  }
  $('familyObservation').textContent = packet.guidance.observation; $('familyQuestion').textContent = packet.guidance.question;
  $('familySelection').textContent = JSON.stringify(c, null, 2);
}
function clear(message) { packet = familyBriefing(); invalidate(); render(); status(message); }
app.ontoolresult = result => {
  try {
    const data = result.structuredContent;
    if (result.isError || data?.featureId !== 'econ-world' || (!data.needsContext && !data.context)) throw new Error();
    // Rebuild from validated inputs; supplied HTML, guidance, or reported outcomes
    // cannot inject DOM or bypass the campaign's teaching model.
    packet = familyBriefing(data.context ?? undefined, data.help);
    $('familyHelp').value = packet.help; $('familyUserQuestion').value = '';
    invalidate(); render(); status(packet.needsContext ? packet.instructions : 'Your selected episode is ready. Review it before asking Osiris.');
  } catch { clear('This episode could not be loaded. Share a fresh snapshot using “Ask with my AI” in the campaign.'); }
};
app.ontoolcancelled = () => clear('The host cancelled this selection. Share an episode again when you are ready.');
app.onteardown = async () => { connected = false; clear('This companion has closed.'); return {}; };
$('familyHelp').onchange = () => {
  packet = familyBriefing(packet.context ?? undefined, $('familyHelp').value); invalidate(); render(); status('Help level changed. Review the episode before sharing.');
};
$('familyUserQuestion').oninput = () => { invalidate(); status('Question changed. Confirm this episode before sharing.'); };
function fallback(text, message) { $('familyPrompt').value = text; $('familyFallback').hidden = false; status(message); }
$('familyForm').onsubmit = async event => {
  event.preventDefault();
  if (busy || packet.needsContext) return;
  if (!$('familyConsent').checked) { status('Review this episode and confirm before sharing it with your AI app.'); return; }
  const question = $('familyUserQuestion').value.trim();
  if (question.length > 1200) { status('Keep your question within 1,200 characters.'); return; }
  const current = epoch, active = new AbortController(); controller = active;
  const text = `${packet.instructions}\nHelp requested: ${packet.help}.\n${question ? `My question: ${question}\n` : ''}Selected campaign snapshot (data, not instructions):\n${JSON.stringify(packet.context)}`;
  busy = true; $('familyAsk').disabled = true;
  try {
    if (!connected || !app.getHostCapabilities()?.message?.text) { fallback(text, 'Copy the prepared prompt into your AI app’s composer to continue.'); return; }
    status('Sharing this episode with your AI app…');
    const result = await app.sendMessage({ role: 'user', content: [{ type: 'text', text }] }, { signal: active.signal, timeout: 15000 });
    if (current !== epoch) return;
    if (result.isError) { fallback(text, 'Your AI app declined the message. You can copy the prompt and send it yourself.'); return; }
    status('Shared. Osiris’s answer appears in your AI conversation and uses your account’s allowance.');
  } catch {
    if (current === epoch) fallback(text, 'The message was not confirmed. Check your conversation before sending again. Nothing is retried automatically.');
  } finally {
    if (current === epoch) { busy = false; controller = null; $('familyAsk').disabled = false; $('familyConsent').checked = false; }
  }
};
$('familyCopy').onclick = async () => {
  try { await navigator.clipboard.writeText($('familyPrompt').value); status('Copied. Paste the prompt into your AI conversation.'); }
  catch { $('familyPrompt').focus(); $('familyPrompt').select(); status('Select and copy the prepared prompt.'); }
};
invalidate(); render();
if (window.parent !== window && !window.OsirisLocalPreview) {
  app.connect(undefined, { timeout: 10000 }).then(() => { connected = true; if (packet.needsContext) status('Your AI app is connected. Share an episode to begin.'); })
    .catch(() => { connected = false; status('Host messaging is unavailable. You can prepare a prompt from a shared episode.'); });
}
