(() => {
  const script = document.currentScript;
  const tool = script?.dataset?.tool || "general";
  const contextKey = script?.dataset?.contextKey || "";
  const label = script?.dataset?.label || "this run";
  const SETTINGS_KEY = "ballzatram:ai-bridge-settings:v1";
  const DEFAULT_WORKER_URL = "https://ballzatram-ai-bridge.charlottepolo-refresh.workers.dev";

  const parse = (raw) => {
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  };

  const settings = () => {
    const saved = parse(localStorage.getItem(SETTINGS_KEY)) || {};
    return {
      url: (saved.url || DEFAULT_WORKER_URL).replace(/\/$/, ""),
      token: saved.token || "",
    };
  };

  const host = document.createElement("div");
  host.setAttribute("aria-live", "polite");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      :host{all:initial}
      .wrap{position:fixed;right:18px;bottom:18px;z-index:9999;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#111827}
      .toggle{border:2px solid #111827;border-radius:999px;background:#f8c64b;color:#111827;font-weight:800;padding:12px 16px;box-shadow:0 5px 0 #111827;cursor:pointer}
      .panel{display:none;width:min(390px,calc(100vw - 28px));max-height:min(620px,calc(100vh - 90px));overflow:auto;margin-bottom:12px;background:#fff8e7;border:2px solid #111827;border-radius:18px;box-shadow:7px 7px 0 #111827;padding:16px;box-sizing:border-box}
      .panel.open{display:block}.head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.head h2{font-size:18px;margin:0}.head p{font-size:12px;margin:4px 0 0;color:#4b5563}.close{border:0;background:transparent;font-size:22px;cursor:pointer}
      textarea{width:100%;min-height:105px;resize:vertical;margin-top:14px;border:2px solid #111827;border-radius:12px;padding:10px;font:inherit;box-sizing:border-box;background:white;color:#111827}
      .actions{display:flex;gap:8px;align-items:center;margin-top:10px}.ask{border:2px solid #111827;border-radius:10px;background:#f8c64b;font-weight:800;padding:9px 13px;cursor:pointer}.ask:disabled{opacity:.55;cursor:wait}.status{font-size:12px;color:#4b5563}
      .answer{white-space:pre-wrap;font-size:14px;line-height:1.5;margin-top:12px;padding-top:12px;border-top:1px solid #d1d5db}.setup{font-size:13px;line-height:1.45}.setup a{color:#2563eb;font-weight:700}
      @media(max-width:600px){.wrap{right:12px;bottom:12px}.panel{width:calc(100vw - 24px)}}
    </style>
    <div class="wrap">
      <section class="panel" id="panel">
        <div class="head"><div><h2>Ask Ballzatram AI</h2><p>Uses the latest saved ${label} as context.</p></div><button class="close" id="close" aria-label="Close">×</button></div>
        <div id="body"></div>
      </section>
      <button class="toggle" id="toggle">Ask AI</button>
    </div>`;

  document.body.appendChild(host);

  const panel = root.getElementById("panel");
  const toggle = root.getElementById("toggle");
  const close = root.getElementById("close");
  const body = root.getElementById("body");

  const render = () => {
    const { token } = settings();
    const context = contextKey ? parse(localStorage.getItem(contextKey)) : null;
    if (!token) {
      body.innerHTML = `<p class="setup">AI is connected, but this browser needs your personal access token once. <a href="../ai/index.html">Open AI settings</a>.</p>`;
      return;
    }
    if (!context) {
      body.innerHTML = `<p class="setup">Run this lab once first. The assistant reads the latest saved result from this browser.</p>`;
      return;
    }
    body.innerHTML = `<textarea id="prompt" placeholder="Ask about this result…"></textarea><div class="actions"><button class="ask" id="ask">Ask AI</button><span class="status" id="status">Ready</span></div><div class="answer" id="answer"></div>`;
    root.getElementById("ask").addEventListener("click", ask);
  };

  async function ask() {
    const { url, token } = settings();
    const prompt = root.getElementById("prompt")?.value.trim();
    const context = parse(localStorage.getItem(contextKey));
    const button = root.getElementById("ask");
    const status = root.getElementById("status");
    const answer = root.getElementById("answer");
    if (!prompt) { status.textContent = "Enter a question."; return; }
    if (!context) { status.textContent = "Run the lab again first."; return; }
    button.disabled = true;
    status.textContent = "Thinking…";
    answer.textContent = "";
    try {
      const response = await fetch(`${url}/v1/assist`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tool, prompt, context }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || `Bridge error ${response.status}`);
      answer.textContent = payload.answer || "No answer returned.";
      status.textContent = payload.model ? `Answered by ${payload.model}` : "Answered";
    } catch (error) {
      answer.textContent = error.message;
      status.textContent = "Request failed";
    } finally {
      button.disabled = false;
    }
  }

  toggle.addEventListener("click", () => {
    panel.classList.toggle("open");
    if (panel.classList.contains("open")) render();
  });
  close.addEventListener("click", () => panel.classList.remove("open"));
})();
