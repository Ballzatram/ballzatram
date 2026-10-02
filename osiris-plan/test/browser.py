"""Real browser UI; synthetic hosted service. No provider login or inference."""
import json
import mimetypes
import os
import time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'test-results' / 'osiris-plan'
OUT.mkdir(parents=True, exist_ok=True)
SITE = 'https://dgallemore.com'
API = 'https://ai.dgallemore.com'

def run(engine, label):
    options = {'headless': True, 'args': ['--no-sandbox'] if label == 'chromium' else []}
    if label == 'chromium' and os.environ.get('CHROMIUM_PATH'):
        options['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = engine.launch(**options)
    context = browser.new_context(viewport={'width': 390, 'height': 844}, has_touch=True, reduced_motion='reduce')
    page = context.new_page()
    state = {'connected': False, 'sharing': True, 'calls': 0, 'failure': False}
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    headers = {'access-control-allow-origin': SITE, 'access-control-allow-credentials': 'true', 'access-control-allow-headers': 'Content-Type, X-Osiris-CSRF', 'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS'}
    def route(r):
        url = urlparse(r.request.url)
        if url.netloc == 'dgallemore.com':
            path = ROOT / url.path.lstrip('/')
            if url.path.endswith('/'): path = path / 'index.html'
            if not path.is_file(): r.fulfill(status=404); return
            if url.path == '/assets/ai-config.js':
                r.fulfill(content_type='application/javascript', body='window.BallzatramAIConfig = Object.freeze({subscriptionUrl:"",chatgptPlanUrl:' + json.dumps(API) + '});'); return
            r.fulfill(content_type=mimetypes.guess_type(str(path))[0] or 'application/octet-stream', body=path.read_bytes()); return
        if url.netloc == 'ai.dgallemore.com':
            if r.request.method == 'OPTIONS': r.fulfill(status=204, headers=headers); return
            payload, status = {}, 200
            if url.path == '/auth/start':
                assert state['calls'] == 0
                state['connected'] = True
                # A fresh navigation keeps Playwright's synthetic site route in use;
                # real 302/cookie behavior is covered by the workerd test.
                r.fulfill(content_type='text/html', body='<script>location.replace(' + json.dumps(SITE + '/tools/beckets-labyrinth/?osiris=connected') + ')</script>'); return
            if url.path == '/health': payload = {'service': 'osiris-chatgpt-plan', 'protocol': 4, 'billing': 'user-chatgpt-only', 'ready': True}
            elif url.path == '/v1/account':
                if not state['connected']: status, payload = 401, {'error': {'code': 'sign_in'}}
                else: payload = {'sessionId': 'a'*43, 'csrf': 'c'*43, 'expiresAt': int(time.time()*1000)+3600000, 'account': {'type':'chatgpt','email':'fixture@example.test','planType':'ChatGPT plan','planEnabled':state['sharing']}}
            elif url.path == '/v1/models': payload = {'models':[{'id':'fixture-model','name':'Fixture model','isDefault':True}]}
            elif url.path == '/v1/assist':
                state['calls'] += 1
                assert r.request.headers.get('x-osiris-csrf') == 'c'*43
                assert 'authorization' not in r.request.headers
                sent = r.request.post_data_json
                assert sent['tool'] == 'beckets-labyrinth' and sent['consent'] is True
                deck = page.evaluate('JSON.parse(JSON.stringify(BecketsSeeds[0]))')
                deck['title'] = 'Hosted ChatGPT countdown'; deck['sources'] = []
                packet = {'code':'usage_limit'} if state['failure'] else {'answer':json.dumps(deck),'model':'fixture-model','billing':'chatgpt-subscription'}
                r.fulfill(headers=headers, content_type='text/event-stream', body='event: ' + ('error' if state['failure'] else 'done') + '\ndata: ' + json.dumps(packet) + '\n\n'); return
            elif url.path == '/v1/session': state['connected'] = False; payload = {'disconnected':True,'revoked':True}
            else: status, payload = 404, {'error':{'code':'not_found'}}
            r.fulfill(status=status, headers=headers, content_type='application/json', body=json.dumps(payload)); return
        r.abort()
    page.route('**/*', route)
    page.goto(SITE + '/tools/beckets-labyrinth/')
    page.locator('#create-top').click()
    page.locator('#topic').fill('Strange imaginary worlds')
    page.locator('#consent').check()
    page.locator('#generate').click()
    panel = page.locator('dialog.osiris-dialog')
    expect(panel).to_be_visible()
    expect(panel.locator('[data-osiris=legacy-setup]')).to_be_hidden()
    expect(panel.locator('[data-osiris=connect]')).to_have_text('Continue with ChatGPT')
    page.screenshot(path=str(OUT / f'{label}-connect.png'), full_page=True)
    panel.locator('[data-osiris=connect]').click()
    expect(page.locator('#topic')).to_have_value('Strange imaginary worlds')
    try:
        expect(panel.locator('[data-osiris=model]')).to_have_value('fixture-model')
    except AssertionError:
        page.screenshot(path=str(OUT / f'{label}-failure.png'), full_page=True)
        print({'url': page.url, 'errors': errors, 'state': state, 'client': page.evaluate('({subscription:typeof BallzatramSubscription, panels:document.querySelectorAll("dialog.osiris-dialog").length})')})
        raise
    assert state['calls'] == 0
    expect(page.locator('#consent')).not_to_be_checked()
    panel.locator('[data-osiris=close]').click()
    page.locator('#consent').check(); page.locator('#generate').click()
    expect(page.locator('.deck-title').filter(has_text='Hosted ChatGPT countdown')).to_have_count(1)
    assert state['calls'] == 1
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert 'csrf' not in page.evaluate('JSON.stringify(sessionStorage)')
    page.screenshot(path=str(OUT / f'{label}-countdown.png'), full_page=True)
    state['failure'] = True
    page.locator('#create-top').click(); page.locator('#consent').check(); page.locator('#generate').click()
    expect(page.locator('#generation-status')).to_contain_text('limit')
    assert state['calls'] == 2
    expect(page.locator('.deck-title').filter(has_text='Hosted ChatGPT countdown')).to_have_count(1)
    state['sharing'] = False
    page.evaluate('BallzatramSubscription.status()')
    assert page.evaluate('BallzatramAI.isConnected()') is False
    assert not errors, errors
    context.close(); browser.close()
    print(f'PASS: {label} mobile sign-in, preserved topic, explicit generation, in-page countdown, limit error and denied plan permission')

with sync_playwright() as playwright:
    for name in os.environ.get('BROWSER_ENGINES', 'chromium,webkit').split(','):
        run(getattr(playwright, name), name)
