"""Real browser graph checks against the built Pages artifact; no provider calls."""
import functools
import json
import os
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading

from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = Path(os.environ.get("WORKSHOP_SCREENSHOTS", "/tmp/agent-workshop-tests"))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT / "_site")))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f"http://127.0.0.1:{server.server_port}/tools/agent-workshop/"
errors, external = [], []

try:
    with sync_playwright() as p:
        browser_type = os.environ.get("WORKSHOP_BROWSER", "chromium")
        browser = getattr(p, browser_type).launch(headless=True, **({"args": ["--no-sandbox"]} if browser_type == "chromium" else {}))
        page = browser.new_page(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on("request", lambda request: external.append(request.url) if request.url.startswith("https://") else None)
        page.goto(url)
        expect(page.locator("#step")).to_be_enabled()
        page.locator("#step").click()
        expect(page.locator("#step-count")).to_have_text("1")
        expect(page.locator("#query")).to_be_disabled()
        page.locator("#tab-state").click()
        expect(page.locator("#state-json")).to_contain_text('"plan"')
        page.locator("#run").click()
        expect(page.locator("#decision-panel")).to_be_visible(timeout=15000)
        expect(page.locator("#repair-count")).to_have_text("1")
        expect(page.locator("#run")).to_be_disabled()
        page.locator("#approve").click()
        expect(page.locator("#result-status")).to_have_text("approved")
        expect(page.locator("#step-count")).to_have_text("8")
        with page.expect_download() as trace_download:
            page.locator("#export-run").click()
        trace = json.loads(Path(trace_download.value.path()).read_text())
        assert trace["model_calls"] == 0
        assert trace["state"]["approved"] is True
        assert trace["events"][3]["patch"]["issues"]
        assert not trace["events"][5]["patch"]["issues"]
        print("PASS: real graph, single-step, repair, checkpoint review, approval and exported state")

        for scenario, expected_status in [("happy", "rejected"), ("empty", "blocked"), ("budget", "blocked")]:
            page.locator("#reset").click()
            page.locator("#scenario").select_option(scenario)
            page.locator("#run").click()
            if scenario == "happy":
                expect(page.locator("#decision-panel")).to_be_visible()
                page.locator("#reject").click()
            expect(page.locator("#result-status")).to_have_text(expected_status, timeout=15000)
            if scenario == "budget":
                expect(page.locator("#repair-count")).to_have_text("2")
            if scenario == "empty":
                expect(page.locator("#step-count")).to_have_text("3")
        print("PASS: rejection, empty retrieval and bounded repair failure")

        page.locator("#reset").click()
        page.locator("#query").fill('<img src=x onerror="window.pwned=1">')
        with page.expect_download() as config_download:
            page.locator("#export-config").click()
        assert json.loads(Path(config_download.value.path()).read_text())["query"].startswith("<img")
        page.locator("#step").click()
        page.locator("#snapshot").select_option("before")
        expect(page.locator("#state-json")).to_contain_text("<img")
        assert page.evaluate("window.pwned === undefined")
        page.locator("#run").click()
        page.locator("#pause").click()
        expect(page.locator("#step")).to_be_enabled()
        before = page.locator("#step-count").inner_text()
        page.wait_for_timeout(700)
        assert page.locator("#step-count").inner_text() == before
        print("PASS: safe user text, config export, and pause at a node boundary")

        page.locator("#tab-experiment").focus()
        page.keyboard.press("ArrowRight")
        expect(page.locator("#build")).to_be_visible()
        page.locator("#build details summary").click()
        expect(page.locator("#full-python")).to_contain_text("def build_graph")
        with page.expect_download() as starter_download:
            page.get_by_role("link", name="Download Python starter").click()
        import zipfile
        with zipfile.ZipFile(starter_download.value.path()) as archive:
            assert {"workflow.py", "requirements.txt", "tests/test_workflow.py"}.issubset(archive.namelist())
        print("PASS: keyboard tabs, source loading and runnable starter download")

        page.locator("#tab-experiment").click()
        page.locator("#reset").click()
        page.locator("#scenario").select_option("repair")
        page.locator("#query").fill("Explain agent orchestration")
        page.locator("#run").click()
        expect(page.locator("#decision-panel")).to_be_visible()
        page.locator("[data-node=check]").click()
        page.locator("#tab-explain").click()
        page.screenshot(path=str(ARTIFACTS / "desktop.png"), full_page=True)
        for width in [390, 320]:
            mobile = browser.new_page(viewport={"width": width, "height": 844}, reduced_motion="reduce", has_touch=True)
            mobile.on("pageerror", lambda error: errors.append(str(error)))
            mobile.goto(url)
            expect(mobile.locator("#run")).to_be_enabled()
            assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"overflow at {width}"
            mobile.locator("#run").click()
            expect(mobile.locator("#decision-panel")).to_be_visible()
            mobile.locator("#approve").click()
            expect(mobile.locator("#result-status")).to_have_text("approved")
            assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth")
            if width == 390:
                mobile.screenshot(path=str(ARTIFACTS / "mobile.png"), full_page=True)
            mobile.locator("#tab-blueprint").click()
            assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth")
            mobile.locator("#tab-experiment").click()
            mobile.evaluate("document.documentElement.style.fontSize='200%'")
            assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"large text overflow at {width}"
            assert mobile.locator('.node').evaluate_all('(nodes) => nodes.every(n => n.scrollHeight <= n.clientHeight + 1)'), f"clipped node text at {width}"
            mobile.close()
        page.evaluate("document.documentElement.style.fontSize='200%'")
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
        print("PASS: desktop, 390px/320px mobile, 200% text enlargement; no horizontal overflow")
        assert not errors, errors
        assert not external, external
        browser.close()
finally:
    server.shutdown()
print("Browser checks passed with zero external requests or JavaScript errors.")
