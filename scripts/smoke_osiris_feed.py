"""Browser smoke tests for the static feed. pip install playwright; playwright install chromium."""
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json, os, shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Quiet, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
URL = BASE + '/internal/reading-room/feed/'
KEY = 'osiris-learning-feed-v1'
checks = []
def check(name, condition):
    assert condition, name
    checks.append(name)
    print('PASS', name)
def ready(page):
    page.goto(URL)
    page.wait_for_selector('[data-card]')
def state(page):
    return page.evaluate('(k)=>JSON.parse(localStorage.getItem(k))', KEY)
try:
    with sync_playwright() as p:
        executable = os.environ.get('CHROMIUM_EXECUTABLE') or shutil.which('chromium')
        browser = p.chromium.launch(headless=True, **({'executable_path':executable} if executable else {}))
        context = browser.new_context(viewport={'width':1440,'height':1000})
        page = context.new_page(); errors=[]; external=[]
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('request', lambda r: external.append(r.url) if not r.url.startswith(BASE) else None)
        ready(page)
        check('initial collection renders eight cards', page.locator('[data-card]').count()==8)
        check('default page makes no external requests', not external)
        check('unlisted and privacy disclosure visible in document', 'not an authenticated private vault' in page.locator('.page-note').inner_text())
        article=page.locator('[data-card="attention-lookup"]')
        article.locator('[data-save]').click()
        check('save updates aria and local storage', article.locator('[data-save]').get_attribute('aria-pressed')=='true' and 'attention-lookup' in state(page)['saved'])
        article.locator('summary').first.click()
        article.locator('[data-check]').click()
        check('no practice recorded without an answer', 'attention-lookup' not in state(page)['answers'])
        article.locator('input[type=radio]').nth(0).check()
        article.locator('[data-check]').click()
        check('wrong answer receives feedback, not mastery', 'Not quite.' in article.locator('[data-feedback]').inner_text())
        article.locator('input[type=radio]').nth(1).check()
        article.locator('[data-check]').click()
        check('retry and correct answer persist', state(page)['answers']['attention-lookup']=={'choice':1,'attempts':2})
        article.locator('[data-demo]').evaluate('(el)=>el.value=3')
        article.locator('[data-demo]').dispatch_event('input')
        check('attention slider updates output', '10.95' in article.locator('output').inner_text())
        page.reload(); page.wait_for_selector('[data-card]')
        check('saved state survives reload', 'attention-lookup' in state(page)['saved'])
        page.locator('[data-view=saved]').click()
        check('saved tab contains only saved card', page.locator('[data-card]').count()==1)
        page.locator('[data-save]').click()
        check('removing last saved card yields useful empty state', 'Nothing saved' in page.locator('#stream').inner_text())
        page.locator('[data-view=paths]').click()
        check('three paths available', page.locator('[data-path]').count()==3)
        page.locator('[data-path]').first.click()
        check('starter path has eight cards', page.locator('[data-card]').count()==8)
        page.locator('[data-view=sources]').click()
        page.locator('#search').fill('Karpathy'); page.wait_for_timeout(250)
        check('source search by author works', 'Karpathy' in page.locator('#stream').inner_text() and page.locator('.source-card').count()>=1)
        page.locator('[data-view=feed]').click()
        page.locator('[data-topic=history]').click()
        check('topic filtering works', all(t=='History & evidence' for t in page.locator('.topic-tag').all_text_contents()))
        page.locator('#search').fill('xyzimpossible'); page.wait_for_timeout(250)
        check('no-results state is recoverable', page.locator('[data-reset-filters]').count()==1)
        page.locator('[data-reset-filters]').click()
        page.locator('#settings-open').click()
        page.locator('#mix').select_option('balanced')
        check('explicit mix control saves', state(page)['mix']=='balanced')
        with page.expect_download() as dl: page.locator('#export').click()
        check('progress export downloads JSON', dl.value.suggested_filename=='osiris-feed-progress.json')
        page.locator('#import').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"version":99}'})
        page.wait_for_timeout(150)
        check('invalid import rejected', 'version 1' in page.locator('#settings-status').inner_text())
        imported={'version':1,'saved':['attention-lookup'],'seen':[],'answers':{},'mix':'ai-first','lastCard':None}
        page.on('dialog', lambda d:d.accept())
        page.locator('#import').set_input_files({'name':'good.json','mimeType':'application/json','buffer':json.dumps(imported).encode()})
        page.wait_for_timeout(200)
        check('valid import replaces progress after confirmation', state(page)['saved']==['attention-lookup'])
        page.evaluate("localStorage.setItem('ballzatram-reading-room','preserve-me')")
        page.locator('#reset').click()
        check('reset preserves Reading Room history', page.evaluate("localStorage.getItem('ballzatram-reading-room')")=='preserve-me' and not state(page)['saved'])
        page.locator('#settings-close').click()
        for _ in range(5):
            page.locator('#sentinel').scroll_into_view_if_needed();page.wait_for_timeout(300)
        check('automatic scroll pauses at 24 cards', page.locator('[data-card]').count()==24)
        page.locator('#more').click();page.wait_for_timeout(200)
        check('user can explicitly continue past pause', page.locator('[data-card]').count()>=32)
        # Video calls must be opt-in. Block external player so tests do not depend on YouTube uptime.
        page.route('https://www.youtube-nocookie.com/**', lambda r:r.fulfill(status=200,body='<html><body>Player boundary</body></html>',content_type='text/html'))
        page.goto(URL+'#card=watch-gpt');page.wait_for_selector('#card-watch-gpt')
        vid=page.locator('#card-watch-gpt');vid.locator('summary').first.click()
        check('no embedded video before explicit load', vid.locator('iframe').count()==0)
        vid.locator('[data-video]').click()
        check('video embeds in place without autoplay', 'youtube-nocookie.com/embed/' in vid.locator('iframe').get_attribute('src') and 'autoplay' not in vid.locator('iframe').get_attribute('src'))
        check('video supplies origin referrer without private path', vid.locator('iframe').get_attribute('referrerpolicy')=='strict-origin-when-cross-origin')
        check('no uncaught browser errors', not errors)
        page.goto(URL);page.wait_for_selector('[data-card]')
        screenshots=Path(os.environ.get('SCREENSHOT_DIR',str(ROOT/'test-results')));screenshots.mkdir(parents=True,exist_ok=True)
        page.screenshot(path=str(screenshots/'osiris-feed-desktop.png'),full_page=False)
        for width in (390,320):
            page.set_viewport_size({'width':width,'height':844});page.goto(URL);page.wait_for_selector('[data-card]')
            check(f'no horizontal overflow at {width}px',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
            check(f'navigation visible at {width}px',page.locator('.dock').is_visible())
            if width==390:page.screenshot(path=str(screenshots/'osiris-feed-mobile.png'),full_page=False)
        context.close()
        corrupt=browser.new_context();cp=corrupt.new_page()
        cp.add_init_script(f"localStorage.setItem('{KEY}','broken-json')")
        ready(cp);cp.locator('[data-save]').first.click()
        check('corrupt storage preserved rather than overwritten',cp.evaluate('(k)=>localStorage.getItem(k)',KEY)=='broken-json')
        check('corrupt storage warning shown',cp.locator('#storage-warning').is_visible())
        corrupt.close()
        blocked=browser.new_context();bp=blocked.new_page()
        bp.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('Blocked')}})")
        ready(bp);bp.locator('[data-save]').first.click()
        check('blocked storage still supports in-memory saves',bp.locator('[data-save]').first.get_attribute('aria-pressed')=='true' and bp.locator('#storage-warning').is_visible())
        blocked.close()
        failed=browser.new_context();fp=failed.new_page()
        fp.route('**/feed/content.json',lambda r:r.fulfill(status=500,body='Unavailable'))
        fp.goto(URL);fp.wait_for_selector('#retry')
        check('content failure is explained', 'could not load' in fp.locator('#stream').inner_text())
        fp.unroute('**/feed/content.json');fp.locator('#retry').click();fp.wait_for_selector('[data-card]')
        check('retry recovers feed',fp.locator('[data-card]').count()==8)
        failed.close();browser.close()
    print(f'\n{len(checks)} browser checks passed.')
finally: server.shutdown()
