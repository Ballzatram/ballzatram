"""Browser regressions against real shared AI clients; provider HTTP is synthetic.

Run from the repo root after installing playwright==1.55.0 and its Chromium:
    python tools/beckets-labyrinth/browser_test.py
No real provider credentials, live model calls, or paid services are used.
"""
import functools
import json
import os
from pathlib import Path
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS = Path(os.environ.get('LABYRINTH_SCREENSHOTS', '/tmp/beckets-labyrinth-tests'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}/tools/beckets-labyrinth/'
HEADERS = {'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS'}
errors = []
count = 0

def passed(message):
    global count
    count += 1
    print(f'PASS {count}: {message}')

def configured_page(browser, mode='handoff', width=390, height=844):
    context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', has_touch=True)
    page = context.new_page()
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script('''(mode => {
      // No executionRevision: exercise the old public default saved on returning users' phones.
      const settings = {mode,chat:'chatgpt',model:'fixture/model',provider:'openai',nativeModel:'fixture-model',bridgeUrl:'https://relay.example.test',maxTokens:2400};
      localStorage.setItem('ballzatram:ai-preferences:v2', JSON.stringify(settings));
      if(mode==='openrouter'||mode==='native') sessionStorage.setItem('ballzatram:ai-connection:v2', JSON.stringify({kind:mode,key:'sk-or-fixture-not-a-real-key',provider:mode==='native'?'openai':'openrouter',endpoint:mode==='native'?'https://relay.example.test':'https://openrouter.ai/api/v1',expiresAt:Date.now()+3600000}));
      if(mode==='subscription') {
        localStorage.setItem('ballzatram:subscription-settings:v1',JSON.stringify({endpoint:'https://runtime.example.test',model:'fixture-model'}));
        sessionStorage.setItem('ballzatram:subscription-session:v1',JSON.stringify({token:'a'.repeat(43),expiresAt:Date.now()+3600000,endpoint:'https://runtime.example.test',account:{type:'chatgpt',planType:'fixture'}}));
      }
    })(''' + json.dumps(mode) + ');')
    page.goto(BASE)
    expect(page.locator('.deck')).to_have_count(5)
    return context, page

def fixture(page, title='Your AI test countdown'):
    deck = page.evaluate('JSON.parse(JSON.stringify(BecketsSeeds[0]))')
    deck['title'] = title
    deck['sources'] = []
    return deck

def submit(page, topic='Original imaginary worlds'):
    page.locator('#create-top').click()
    page.locator('#topic').fill(topic)
    page.locator('#consent').check()
    page.locator('#generate').click()

try:
    with sync_playwright() as p:
        launch = {'headless': True, 'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            launch['executable_path'] = os.environ['CHROMIUM_PATH']
        browser = p.chromium.launch(**launch)
        context, page = configured_page(browser)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(ARTIFACTS / 'mobile-intro.png'), full_page=True)
        card = page.locator('.deck').first
        card.locator('.predict').click()
        page.locator('#prediction-input').fill('The Lord of the Rings')
        page.locator('#prediction-form button[type=submit]').click()
        card.locator('.advance').click()
        expect(card.locator('.deck-title')).to_have_text('The Grand Budapest Hotel')
        page.dispatch_event('.deck .deck-copy', 'pointerdown', {'isPrimary': True, 'pointerType': 'touch', 'clientX': 310, 'clientY': 320})
        page.dispatch_event('.deck .deck-copy', 'pointerup', {'isPrimary': True, 'pointerType': 'touch', 'clientX': 120, 'clientY': 322})
        expect(card.locator('.deck-title')).to_have_text('Ghostbusters')
        card.locator('.progress button').last.click()
        expect(card.locator('.prediction-result')).to_contain_text('agree')
        card.locator('[data-vote=agree]').click()
        card.locator('.save').click()
        page.locator('[data-filter=Saved]').click()
        expect(page.locator('.deck')).to_have_count(1)
        page.reload()
        expect(page.locator('#saved-count')).to_have_text('1')
        passed('mobile countdown, horizontal swipe, prediction, reaction, save and reload')
        page.locator('[data-filter=AI]').click()
        expect(page.locator('.deck')).to_have_count(1)
        page.locator('#mobile-surprise').click()
        expect(page.locator('.deck')).to_have_count(5)
        page.locator('.deck').first.locator('.share').click()
        assert 'list=seed-' in page.locator('#share-link').input_value()
        page.locator('#share-dialog .close-dialog').click()
        sent = []
        page.on('request', lambda request: sent.append(request.url) if '/v1/' in request.url or '/v2/' in request.url else None)
        submit(page)
        expect(page.locator('dialog[aria-label="Osiris assistant"]')).to_be_visible()
        expect(page.locator('[data-osiris="status"]')).to_contain_text('Connect your ChatGPT account')
        expect(page.locator('[data-osiris="endpoint"]')).to_have_value('https://osiris-subscription-pilot.onrender.com')
        assert page.evaluate('BallzatramAI.getSettings().mode') == 'subscription'
        assert page.locator('#handoff-prompt, #copy-prompt').count() == 0
        assert page.url == BASE and len(context.pages) == 1 and not sent
        page.locator('[data-osiris="close"]').click()
        expect(page.locator('#topic')).to_have_value('Original imaginary worlds')
        expect(page.locator('#consent')).not_to_be_checked()
        expect(page.locator('.deck')).to_have_count(5)
        page.locator('#import-panel summary').click()
        malicious = fixture(page, '<img src=x onerror="window.pwned=1">')
        malicious['sources'] = [{'label': 'bad', 'url': 'javascript:alert(1)'}]
        page.locator('#import-json').fill(json.dumps(malicious))
        page.locator('#import-countdown').click()
        expect(page.locator('.deck')).to_have_count(6)
        assert page.evaluate('window.pwned === undefined')
        assert page.locator('.deck img').count() == 0
        assert page.locator('.deck a[href^="javascript:"]').count() == 0
        passed('legacy handoff migrates to same-page setup; no prompt export, navigation or inference; saved import remains safe')
        context.close()

        # Start disconnected, authorize through synthetic HTTP, then explicitly generate
        # in the original composer. This checks the complete UI flow, NOT real entitlement.
        context, page = configured_page(browser)
        response = fixture(page, 'Connected without leaving the Labyrinth')
        state = {'signed_in': False, 'generations': [], 'deleted': 0}
        def native_flow(route):
            if route.request.method == 'OPTIONS':
                route.fulfill(status=204, headers=HEADERS)
                return
            path = route.request.url.removeprefix('https://runtime.example.test')
            identity = {'service':'osiris-subscription','protocol':3,'billing':'user-chatgpt-only','capabilities':['runtime-readiness-v1']}
            expires = page.evaluate('Date.now() + 3600000')
            body, status_code = {}, 200
            if path == '/health':
                body = identity
            elif path == '/ready':
                body = {**identity, 'runtimeReady':True, 'inferenceVerified':False}
            elif path == '/v1/session' and route.request.method == 'DELETE':
                state['signed_in'] = False
                state['deleted'] += 1
                body = {'disconnected':True}
            elif path == '/v1/session':
                body, status_code = {'token':'b'*43,'expiresAt':expires}, 201
            elif path == '/v1/login':
                state['signed_in'] = True
                body = {'verificationUrl':'https://auth.openai.com/codex/device','userCode':'TEST-ONLY','expiresAt':page.evaluate('Date.now() + 600000')}
            elif path == '/v1/account':
                body = {'account':{'type':'chatgpt','planType':'synthetic','email':'test@example.test'} if state['signed_in'] else None, 'loginStatus':'completed'}
            elif path == '/v1/models':
                body = {'models':[{'id':'fixture-model','name':'Synthetic model','isDefault':True}]}
            elif path == '/v1/assist':
                assert state['signed_in']
                state['generations'].append(route.request.post_data_json)
                done = {'answer':json.dumps(response),'model':'fixture-model','billing':'chatgpt-subscription'}
                route.fulfill(status=200, headers={**HEADERS,'content-type':'text/event-stream'}, body='event: done\ndata: '+json.dumps(done)+'\n\n')
                return
            else:
                raise AssertionError('Unexpected runtime path: ' + path)
            route.fulfill(status=status_code, headers=HEADERS, json=body)
        page.route('https://runtime.example.test/**', native_flow)
        submit(page, 'Original imaginary worlds')
        q = lambda name: page.locator(f'[data-osiris="{name}"]')
        q('endpoint').fill('https://runtime.example.test')
        q('access-code').fill('b' * 43)
        q('connect').click()
        expect(page.locator('dialog[aria-label="Osiris assistant"]')).to_have_attribute('data-connection-state', 'connected', timeout=15000)
        expect(q('model')).to_have_value('fixture-model')
        assert not state['generations'] and len(context.pages) == 1 and page.url == BASE
        q('close').click()
        expect(page.locator('#composer')).to_be_visible()
        expect(page.locator('#topic')).to_have_value('Original imaginary worlds')
        expect(page.locator('#consent')).not_to_be_checked()
        page.locator('#consent').check()
        page.locator('#generate').click()
        expect(page.locator('.deck')).to_have_count(6)
        expect(page.locator('.deck').first.locator('.deck-title')).to_have_text('Connected without leaving the Labyrinth')
        assert len(state['generations']) == 1 and state['generations'][0]['consent'] is True
        assert state['generations'][0]['context']['topic'] == 'Original imaginary worlds'
        assert page.url == BASE and len(context.pages) == 1
        page.screenshot(path=str(ARTIFACTS / 'mobile-native-countdown.png'), full_page=True)
        page.locator('#create-top').click()
        page.locator('#connect-subscription').click()
        q('disconnect').click()
        expect(q('status')).to_contain_text('Disconnected')
        assert page.evaluate('BallzatramSubscription.connection()') is None
        assert state['deleted'] == 1 and len(state['generations']) == 1
        passed('disconnected → same-page synthetic sign-in → explicit generation → feed update → disconnect; no copying or navigation')
        context.close()

        for mode in ['openrouter', 'native', 'subscription']:
            context, page = configured_page(browser, mode)
            response = fixture(page)
            calls = []
            endpoint = {'openrouter':'https://openrouter.ai/api/v1/chat/completions','native':'https://relay.example.test/v2/assist','subscription':'https://runtime.example.test/v1/assist'}[mode]
            def respond(route, _request, mode=mode):
                if route.request.method == 'OPTIONS':
                    route.fulfill(status=204, headers=HEADERS)
                    return
                payload = route.request.post_data_json
                calls.append(payload)
                if mode == 'openrouter':
                    body = {'model':'fixture/model','choices':[{'message':{'content':json.dumps(response)},'finish_reason':'stop'}]}
                    assert 'Beckets Labyrinth' in payload['messages'][0]['content']
                    route.fulfill(status=200, headers=HEADERS, json=body)
                elif mode == 'native':
                    assert payload['tool'] == 'beckets-labyrinth'
                    route.fulfill(status=200, headers=HEADERS, json={'answer':json.dumps(response),'model':'fixture-model'})
                else:
                    assert payload['tool'] == 'beckets-labyrinth' and payload['consent'] is True
                    done = {'answer':json.dumps(response),'model':'fixture-model','billing':'chatgpt-subscription'}
                    route.fulfill(status=200, headers={**HEADERS,'content-type':'text/event-stream'}, body='event: done\ndata: '+json.dumps(done)+'\n\n')
            page.route(endpoint, respond)
            page.locator('#mobile-surprise').click()
            assert not calls
            page.locator('#create-top').click()
            page.locator('#topic').fill('Original imaginary worlds')
            page.locator('#generate').click()
            expect(page.locator('#generation-status')).to_contain_text('Confirm')
            assert not calls
            page.locator('#consent').check()
            page.locator('#generate').click()
            expect(page.locator('.deck')).to_have_count(6)
            expect(page.locator('.deck').first.locator('.edition')).to_contain_text('YOUR AI')
            assert len(calls) == 1 and page.url == BASE and len(context.pages) == 1
            page.locator('.deck').first.locator('.advance').click()
            assert len(calls) == 1
            page.locator('.deck').first.locator('.share').click()
            assert 'topic=' in page.locator('#share-link').input_value()
            passed(f'{mode}: actual shared client, explicit consent, one request, in-page rendering, no scroll billing')
            context.close()

        context, page = configured_page(browser, 'openrouter')
        response = fixture(page)
        calls = []
        def truncated(route):
            if route.request.method == 'OPTIONS':
                route.fulfill(status=204, headers=HEADERS)
                return
            calls.append(route)
            route.fulfill(status=200, headers=HEADERS, json={'choices':[{'message':{'content':json.dumps(response)},'finish_reason':'length'}]})
        page.route('https://openrouter.ai/api/v1/chat/completions', truncated)
        submit(page)
        expect(page.locator('#generation-status')).to_contain_text('response limit')
        expect(page.locator('.deck')).to_have_count(5)
        assert len(calls) == 1
        passed('truncated responses never create partial lists or retry')
        context.close()

        context, page = configured_page(browser, 'openrouter')
        pending = []
        def hold(route):
            if route.request.method == 'OPTIONS':
                route.fulfill(status=204, headers=HEADERS)
            else:
                pending.append(route)
        page.route('https://openrouter.ai/api/v1/chat/completions', hold)
        submit(page)
        expect(page.locator('#cancel-generation')).to_be_visible()
        expect(page.locator('#generate')).to_be_disabled()
        page.locator('#cancel-generation').click()
        expect(page.locator('#generation-status')).to_contain_text('Stopped')
        expect(page.locator('#generate')).to_be_enabled()
        expect(page.locator('.deck')).to_have_count(5)
        passed('cancellation restores controls without adding a list')
        context.close()

        for width, height in [(375,667),(390,844),(1440,1000)]:
            context, page = configured_page(browser, width=width, height=height)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            card = page.locator('.deck').first
            card.locator('.advance').click()
            expect(card.locator('.deck-title')).to_have_text('The Grand Budapest Hotel')
            page.screenshot(path=str(ARTIFACTS / f'layout-{width}.png'), full_page=True)
            context.close()
        passed('small phone, modern phone and desktop layouts have no horizontal overflow')
        context = browser.new_context(viewport={'width':390,'height':844})
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}); Object.defineProperty(window,'sessionStorage',{get(){throw new Error('blocked')}});")
        page.goto(BASE + '?topic=Fictional%20worlds')
        expect(page.locator('.deck')).to_have_count(5)
        expect(page.locator('#composer')).to_be_visible()
        expect(page.locator('#consent')).not_to_be_checked()
        expect(page.locator('#topic')).to_have_value('Fictional worlds')
        context.close()
        passed('blocked storage and shared topic links remain usable without auto-generation')
        assert not errors, errors
        browser.close()
        print(f'{count} browser scenarios passed; zero page errors. Provider responses were synthetic, not real subscription acceptance.')
finally:
    server.shutdown()
    server.server_close()
