(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const configured = window.BallzatramAIConfig?.mcpUrl;
  if (!configured) return;
  let endpoint;
  try {
    endpoint = new URL(configured);
    if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || endpoint.pathname !== '/mcp') return;
  } catch { return; }
  $('connectorReady').hidden = false;
  $('connectorUrl').value = endpoint.href;
  $('connectorStatus').textContent = 'The tool service has an address. Add it in your AI app to try the Supply & Demand pilot. Host sign-in and mobile behavior still depend on your app.';
  $('copyConnector').onclick = async () => {
    try { await navigator.clipboard.writeText(endpoint.href); $('serviceStatus').textContent = 'Copied. Add this address in your AI app’s connector settings.'; }
    catch { $('connectorUrl').focus(); $('connectorUrl').select(); $('serviceStatus').textContent = 'Select and copy the address above.'; }
  };
  $('checkConnector').onclick = async () => {
    $('checkConnector').disabled = true;
    $('serviceStatus').textContent = 'Checking the tool service…';
    try {
      const response = await fetch(new URL('/health', endpoint), { credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      if (!response.ok || data.service !== 'ballzatram-osiris-tools' || data.modelCalls !== false) throw new Error();
      $('serviceStatus').textContent = 'Tool service reachable. No model call was made. This does not verify your AI app’s connection.';
    } catch { $('serviceStatus').textContent = 'The tool service could not be verified. You can still use the website lab and share context.'; }
    finally { $('checkConnector').disabled = false; }
  };
})();
