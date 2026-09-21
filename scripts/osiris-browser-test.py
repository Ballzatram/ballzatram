"""Real browser + real HTTP runtime; provider account and inference are synthetic.

Never logs into a provider or calls a model. External network is blocked in-browser.
Install the pinned browser test dependency in CI; no production dependency is added.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import socket
import subprocess
import threading
import time
import urllib.request

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "test-results" / "osiris-browser"


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def scenario(browser, base, runtime, mobile):
    label = "mobile-webkit" if mobile else "desktop-chromium"
    context = browser.new_context(viewport={"width": 390 if mobile else 1280, "height": 844 if mobile else 900}, is_mobile=mobile, has_touch=mobile, service_workers="block")
    page = context.new_page()
    errors, sent = [], []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: sent.append(request.post_data_json) if request.url == runtime + "/v1/assist" else None)
    context.route("**/*", lambda route: route.continue_() if route.request.url.startswith((base + "/", runtime + "/")) else route.abort())
    target = base + "/econ-arcade/play/index.html"
    page.goto(target)
    page.locator('[data-action="ai"]').click()
    dialog = page.locator('dialog[aria-label="Osiris assistant"]')
    q = lambda name: page.locator(f'[data-osiris="{name}"]')
    expect(dialog).to_have_attribute("data-connection-state", "unconfigured")
    expect(q("status")).to_contain_text("awaiting runtime activation")
    assert not sent and len(context.pages) == 1
    original_save = page.evaluate("localStorage.getItem(window.FamilyBusiness.KEY)")
    page.evaluate("localStorage.setItem('unselected-private-record', 'NEVER-SHARE-THIS')")
    page.screenshot(path=str(OUTPUT / f"{label}-setup.png"), full_page=False)
    q("question").fill("Explain this consequence")
    q("endpoint").fill(runtime)
    q("check-service").click()
    expect(q("status")).to_contain_text("signed-out runtime are ready", timeout=15000)
    assert not sent
    q("access-code").fill("b" * 43)
    q("connect").click()
    expect(dialog).to_have_attribute("data-connection-state", "connected", timeout=15000)
    expect(q("model")).to_have_value("synthetic-model")
    assert not sent and page.url == target and len(context.pages) == 1
    q("ask").click()
    expect(q("status")).to_contain_text("confirm")
    assert not sent
    q("consent").check()
    q("ask").click()
    expect(q("status")).to_have_text("Answer ready.")
    expect(q("answer")).to_contain_text("Synthetic response for econ-world")
    assert q("answer").locator("script").count() == 0
    assert page.evaluate("window.__osirisInjected") is None
    assert len(sent) == 1 and sent[0]["tool"] == "econ-world" and "NEVER-SHARE-THIS" not in str(sent[0])
    assert page.evaluate("localStorage.getItem(window.FamilyBusiness.KEY)") == original_save
    assert not q("consent").is_checked() and page.url == target and len(context.pages) == 1
    bounds = dialog.bounding_box()
    assert bounds["x"] >= -1 and bounds["x"] + bounds["width"] <= page.viewport_size["width"] + 1
    assert q("length").evaluate("el => getComputedStyle(el).colorScheme") == "light"
    q("answer").scroll_into_view_if_needed()
    close_bounds = q("close").bounding_box()
    assert close_bounds["y"] >= -1 and close_bounds["y"] + close_bounds["height"] <= page.viewport_size["height"] + 1
    page.screenshot(path=str(OUTPUT / f"{label}-answer.png"), full_page=False)
    q("question").fill("wait")
    q("consent").check()
    q("ask").click()
    expect(q("cancel")).to_be_visible()
    q("cancel").click()
    expect(q("status")).to_contain_text("stopped")
    expect(q("ask")).to_be_enabled()
    # A new request is a separate explicit decision, not a retry after Stop.
    q("question").fill("A new explicit question")
    q("consent").check()
    q("ask").click()
    expect(q("status")).to_have_text("Answer ready.")
    q("account-label").click()
    q("disconnect").click()
    expect(q("status")).to_contain_text("Disconnected")
    assert page.evaluate("window.BallzatramSubscription.connection()") is None
    q("close").click()
    expect(dialog).not_to_be_visible()
    assert not errors, errors
    context.close()
    print(f"PASS {label}: native setup, synthetic sign-in, consent, same-page SSE, XSS handling, unchanged save, Stop, new turn, disconnect. No provider requests.")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    web = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=web.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{web.server_port}"
    port = free_port()
    runtime = f"http://127.0.0.1:{port}"
    env = {**os.environ, "OSIRIS_TEST_ONLY": "1", "OSIRIS_TEST_PORT": str(port), "OSIRIS_TEST_ORIGIN": base}
    process = subprocess.Popen(["node", str(ROOT / "osiris-runtime/test/browser-service.mjs")], env=env, stdout=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                with urllib.request.urlopen(runtime + "/health", timeout=1) as response:
                    if response.status == 200:
                        break
            except OSError:
                if process.poll() is not None:
                    raise RuntimeError("Synthetic HTTP fixture exited")
                time.sleep(0.05)
        else:
            raise RuntimeError("Synthetic HTTP fixture did not start")
        with sync_playwright() as playwright:
            for engine, mobile in [(playwright.chromium, False), (playwright.webkit, True)]:
                browser = engine.launch()
                try:
                    scenario(browser, base, runtime, mobile)
                finally:
                    browser.close()
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        web.shutdown()
        web.server_close()


if __name__ == "__main__":
    main()
