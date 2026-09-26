import assert from 'node:assert/strict';
import { CodexSession } from '../codex.mjs';

const session = await CodexSession.create();
try {
  assert.equal((await session.account()).account, null, 'Smoke test must start signed out.');
  const login = await session.startLogin();
  assert.equal(login.status, 'pending');
  assert.ok(['https://auth.openai.com/codex/device', 'https://chatgpt.com/codex/device'].includes(login.verificationUrl));
  assert.match(login.userCode, /^[A-Za-z0-9-]{4,32}$/);
  assert.equal(typeof login.loginId, 'string');
  await session.rpc('account/login/cancel', { loginId: login.loginId });
  console.log('Codex device-code login start/cancel verified. No user code or credential was logged.');
} finally {
  await session.close();
}
