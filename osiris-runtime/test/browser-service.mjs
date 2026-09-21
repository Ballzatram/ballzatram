// Browser-test fixture only. Not copied into the runtime image or deployment bundle.
import { createRuntimeServer } from '../server.mjs';
if (process.env.OSIRIS_TEST_ONLY !== '1') throw new Error('This synthetic service is for tests only.');
const port = Number(process.env.OSIRIS_TEST_PORT);
const origin = process.env.OSIRIS_TEST_ORIGIN;
if (!Number.isInteger(port) || port < 1024 || port > 65535 || !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin || '')) throw new Error('Use loopback test endpoints.');
class SyntheticSession {
  closed = false;
  signedIn = false;
  async account() { return { account: this.signedIn ? { type: 'chatgpt', email: 'synthetic@example.test', planType: 'test-only' } : null }; }
  async startLogin() { this.signedIn = true; return { verificationUrl: 'https://auth.openai.com/codex/device', userCode: 'TEST-ONLY', expiresAt: Date.now() + 600000 }; }
  async models() { return [{ id: 'synthetic-model', name: 'Synthetic model (not a provider model)', isDefault: true }]; }
  async limits() { return { primary: null, secondary: null }; }
  async ask(request, emit, signal) {
    if (request.prompt === 'wait') {
      await new Promise(resolve => { if (signal.aborted) resolve(); else signal.addEventListener('abort', resolve, { once: true }); });
      throw new Error('Synthetic cancellation');
    }
    const answer = `<script>window.__osirisInjected=true</script> Synthetic response for ${request.tool}.`;
    emit('delta', { text: answer.slice(0, 30) });
    await new Promise(resolve => setTimeout(resolve, 100));
    emit('delta', { text: answer.slice(30) });
    return { kind: 'answer', answer, model: request.model, billing: 'chatgpt-subscription' };
  }
  async close() { this.closed = true; }
}
const app = createRuntimeServer({ origins: [origin], accessCodes: ['b'.repeat(43)], readinessProbe: async () => true, sessionFactory: async () => new SyntheticSession() });
app.server.listen(port, '127.0.0.1', () => console.log('Synthetic loopback browser fixture ready. No provider calls are possible.'));
for (const event of ['SIGINT', 'SIGTERM']) process.once(event, () => void app.shutdown().then(() => process.exit(0)));
