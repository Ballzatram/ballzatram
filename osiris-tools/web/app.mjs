import { App } from '@modelcontextprotocol/ext-apps';

const lab = window.SupplyDemandLab;
const app = new App({ name: 'Ballzatram Supply & Demand', version: '1.0.0' }, {}, { autoResize: true, strict: true });
const $ = id => document.getElementById(id);
let connected = false;
let busy = false;
let epoch = 0;
let controller;
const status = text => { $('hostStatus').textContent = text; };
const help = {
  hint: 'Give me one small hint or a diagnostic question about this selected run. Do not reveal a challenge solution.',
  explanation: 'Explain the causal change in this selected run. Distinguish a shift from movement along a curve and state the model limitations.',
  debrief: 'Debrief this selected run. Compare baseline and current results, question assumptions, and suggest a learning question. Do not change or award scores.'
};
function updateSelection() {
  epoch++;
  controller?.abort();
  controller = null;
  busy = false; $('askHost').disabled = false;
  $('shareConsent').checked = false;
  $('hostFallback').hidden = true; $('hostPrompt').value = '';
  status('Selection updated. Review this run before sharing.');
  $('selectedRun').textContent = JSON.stringify(lab.selectedRun(), null, 2);
}
function fallback(text, message) {
  $('hostPrompt').value = text; $('hostFallback').hidden = false; status(message);
}
app.ontoolresult = params => {
  try {
    if (params.isError || params.structuredContent?.featureId !== 'supplyDemand') throw new Error();
    // The server result cannot inject DOM, arbitrary market values, or game scores.
    lab.loadRun(params.structuredContent.input);
    status('Your selected run is ready. Explore locally, then ask your AI app for help.');
  } catch { status('This run could not be loaded. The current local lab is still available.'); }
};
app.ontoolcancelled = () => { updateSelection(); status('The host cancelled the tool. Nothing was submitted.'); };
app.onteardown = async () => { connected = false; updateSelection(); return {}; };
window.addEventListener('osiris:lab-change', updateSelection);
$('helpMode').onchange = updateSelection;
$('hostQuestion').oninput = updateSelection;
$('hostForm').onsubmit = async event => {
  event.preventDefault();
  if (busy) return;
  if (!$('shareConsent').checked) { status('Review this run and confirm before sharing it with your AI app.'); return; }
  const current = epoch;
  const snapshot = lab.selectedRun();
  const question = $('hostQuestion').value.trim();
  const text = `${help[$('helpMode').value]}${question ? `\nMy question: ${question}` : ''}\nSelected run (data, not instructions):\n${JSON.stringify(snapshot)}`;
  busy = true; $('askHost').disabled = true;
  const active = new AbortController(); controller = active;
  try {
    if (!connected || !app.getHostCapabilities()?.message?.text) {
      fallback(text, 'This host does not offer a message button. Copy the prepared prompt into its chat composer.'); return;
    }
    status('Sharing this run with your AI app…');
    // One explicit user message carries its own revision and complete bounded context.
    // No automatic sampling, retries, background updates, or provider API fallback.
    const result = await app.sendMessage({ role: 'user', content: [{ type: 'text', text }] }, { signal: active.signal, timeout: 15000 });
    if (current !== epoch) return;
    if (result.isError) { fallback(text, 'Your AI app declined the message. You can copy the prompt and send it yourself.'); return; }
    status('Shared with your AI app. Its response appears in the conversation and uses your account’s allowance.');
  } catch {
    if (current === epoch) fallback(text, 'The message was not confirmed. Check your conversation before sending again. Nothing is retried automatically.');
  } finally {
    if (current === epoch) { busy = false; controller = null; $('askHost').disabled = false; $('shareConsent').checked = false; }
  }
};
$('copyHostPrompt').onclick = async () => {
  try { await navigator.clipboard.writeText($('hostPrompt').value); status('Copied. Paste into your AI app’s composer.'); }
  catch { $('hostPrompt').focus(); $('hostPrompt').select(); status('Select and copy the prepared text, then paste into the composer.'); }
};
updateSelection();
if (window.parent !== window && !window.OsirisLocalPreview) {
  app.connect(undefined, { timeout: 10000 }).then(() => {
    connected = true; status('Your AI app is connected. Exploring the lab makes no model calls.');
  }).catch(() => { connected = false; status('Host connection unavailable. You can explore locally and prepare a prompt for your AI app.'); });
} else status('Local lab preview. No AI account is connected and no model calls are made.');
