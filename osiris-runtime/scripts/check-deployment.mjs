import { pathToFileURL } from 'node:url';

function origin(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Provide an absolute service/website origin.'); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('Use HTTPS origins without paths, query strings, or credentials; loopback HTTP is allowed for development.');
  return url.origin;
}
function requireCondition(value, message) { if (!value) throw new Error(message); }
async function body(response) {
  const reader = response.body?.getReader();
  requireCondition(reader, 'The service returned no response body.');
  const decoder = new TextDecoder('utf-8', { fatal: true }); let text = '', bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); bytes += value?.byteLength || 0;
      requireCondition(bytes <= 64000, 'The service returned oversized metadata.');
      text += decoder.decode(value, { stream: !done }); if (done) return JSON.parse(text);
    }
  } finally { await reader.cancel().catch(() => {}); }
}

/** Non-generating check. No admission code, account token, login, or model turn is sent. */
export async function checkDeployment(serviceValue, websiteValue = 'https://dgallemore.com') {
  const service = origin(serviceValue), website = origin(websiteValue);
  const call = (route, options = {}) => fetch(service + route, { method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(45000), ...options, headers: { Origin: website, ...options.headers } });
  const identity = data => data?.service === 'osiris-subscription' && data.protocol === 3 && data.billing === 'user-chatgpt-only';
  const headers = response => {
    requireCondition(response.headers.get('Access-Control-Allow-Origin') === website, 'The service does not allow this exact website origin.');
    requireCondition(response.headers.get('Cache-Control')?.includes('no-store'), 'The service must disable response caching.');
    requireCondition(response.headers.get('X-Content-Type-Options') === 'nosniff', 'The service is missing the content-type security header.');
  };
  const healthResponse = await call('/health'); headers(healthResponse);
  requireCondition(healthResponse.ok, `Service health failed (HTTP ${healthResponse.status}).`);
  const health = await body(healthResponse);
  requireCondition(identity(health), 'This is not the Osiris subscription service. The MCP Worker is a different service.');
  requireCondition(health.capabilities?.includes('runtime-readiness-v1'), 'Update the runtime to include signed-out readiness checks.');
  const readyResponse = await call('/ready'); headers(readyResponse);
  requireCondition(readyResponse.ok, `Signed-out runtime readiness failed (HTTP ${readyResponse.status}).`);
  const ready = await body(readyResponse);
  requireCondition(identity(ready) && ready.runtimeReady === true && ready.inferenceVerified === false, 'The runtime has not passed the signed-out readiness check.');
  const preflight = await call('/v1/assist', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } });
  headers(preflight);
  requireCondition(preflight.status === 204, 'Browser request preflight failed.');
  const methods = (preflight.headers.get('Access-Control-Allow-Methods') || '').toUpperCase().split(',').map(s => s.trim());
  const allowedHeaders = (preflight.headers.get('Access-Control-Allow-Headers') || '').toLowerCase().split(',').map(s => s.trim());
  requireCondition(methods.includes('POST') && methods.includes('DELETE') && allowedHeaders.includes('authorization') && allowedHeaders.includes('content-type'), 'Browser authorization or disconnect headers/methods are not allowed.');
  const unauthorized = await call('/v1/account');
  requireCondition(unauthorized.status === 401, 'The service did not reject an unauthenticated account request.');
  await unauthorized.body?.cancel();
  const blocked = await call('/health', { headers: { Origin: 'https://osiris-origin-check.invalid' } });
  requireCondition(blocked.status === 403 && !blocked.headers.get('Access-Control-Allow-Origin'), 'The service did not reject the unapproved browser origin.');
  await blocked.body?.cancel();
  return { service, website, runtimeReady: true, authenticated: false, inferenceVerified: false, checks: ['HTTPS/origin format', 'service identity', 'signed-out native runtime', 'no-store/security headers', 'browser preflight', 'authentication required', 'unapproved origin rejected'], next: 'An invited user must sign in directly with OpenAI and explicitly send one reviewed question, then test Stop and Disconnect. No inference was performed by this check.' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (!process.argv[2]) throw new Error('Usage: npm run check:deployment -- https://YOUR_RUNTIME_ORIGIN https://dgallemore.com');
    console.log(JSON.stringify(await checkDeployment(process.argv[2], process.argv[3]), null, 2));
  } catch (error) { console.error(`Deployment acceptance failed: ${error.message}`); process.exitCode = 1; }
}
