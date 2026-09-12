"""Refresh a bounded, growing GPO bill catalogue for the public static site.

No keys or client uploads. Source discovery is a current-Congress GPO sitemap;
old records survive failed requests, with their previous successful timestamps.
"""
from __future__ import annotations
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
import hashlib
import json
from pathlib import Path
import re
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit
from import_observatory_bill import parse_xml, parse_bill, parse_status, source_record, VERSIONS

SOURCE_ROOT = 'https://www.govinfo.gov'
NS = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
ID_PATTERN = re.compile(r'^(\d{3})-(hr|s)-(\d{1,5})$')
MAX_BYTES = 8_000_000

def now():
    return datetime.now(timezone.utc).isoformat()


def current_congress(year):
    return (year - 1789) // 2 + 1


def read_json(path, default=None):
    return json.loads(path.read_text()) if path.exists() else default


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
    temp.replace(path)


def official_fetch(url):
    if urlsplit(url).netloc != 'www.govinfo.gov' or urlsplit(url).scheme != 'https':
        raise ValueError('Only HTTPS GPO source URLs are allowed')
    class GpoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if urlsplit(newurl).netloc != 'www.govinfo.gov' or urlsplit(newurl).scheme != 'https':
                raise ValueError('Source redirected outside GPO')
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    opener = urllib.request.build_opener(GpoRedirect)
    for attempt in range(2):
        try:
            with opener.open(urllib.request.Request(url, headers={'User-Agent': 'Ballzatram-Observatory/1.0 (public legislative research)'}), timeout=20) as response:
                raw = response.read(MAX_BYTES + 1)
            parse_xml(raw)
            return raw
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt:
                raise
            time.sleep(2)
        except (TimeoutError, urllib.error.URLError):
            if attempt:
                raise
            time.sleep(1)
    raise RuntimeError('Source request failed')


def discover(congress, fetch=official_fetch):
    found, failures, source_urls = {}, [], []
    for kind in ('hr', 's'):
        url = f'{SOURCE_ROOT}/sitemap/bulkdata/BILLSTATUS/{congress}{kind}/sitemap.xml'
        source_urls.append(url)
        try:
            root = parse_xml(fetch(url))
            if root.tag != '{http://www.sitemaps.org/schemas/sitemap/0.9}urlset':
                raise ValueError('Expected a GPO sitemap, not an error page')
            pattern = re.compile(rf'^https://www\.govinfo\.gov/bulkdata/BILLSTATUS/{congress}/{kind}/BILLSTATUS-{congress}{kind}([1-9][0-9]{{0,4}})\.xml$')
            for entry in root.findall('s:url', NS):
                location, modified = entry.findtext('s:loc', namespaces=NS), entry.findtext('s:lastmod', namespaces=NS)
                match = pattern.fullmatch(location or '')
                if match and modified:
                    datetime.fromisoformat(modified.replace('Z', '+00:00'))
                    identifier = f'{congress}-{kind}-{match.group(1)}'
                    found[identifier] = {'id': identifier, 'url': location, 'modified': modified}
        except Exception as exc:
            failures.append({'source': url, 'error': str(exc)[:200]})
    return found, failures, source_urls


def select_records(found, previous, budget, timestamp):
    # Reserve work for existing records so continued monitoring cannot be starved
    # by a flood of new introductions. Backfill uses the remaining request budget.
    due, unseen = [], []
    cutoff = datetime.fromisoformat(timestamp) - timedelta(hours=24)
    for key, candidate in found.items():
        old = previous.get(key)
        if not old:
            unseen.append(candidate)
        elif old.get('sourceModifiedAt') != candidate['modified'] or old.get('health') != 'ok' or datetime.fromisoformat(old['checkedAt']) < cutoff:
            due.append(candidate)
    due.sort(key=lambda x: previous[x['id']]['checkedAt'])
    unseen.sort(key=lambda x: (x['modified'], x['id']), reverse=True)
    first = due[:max(1, budget // 2)]
    rest = unseen + due[len(first):]
    return (first + rest)[:budget]


def bill_stage(bill, metadata):
    if metadata['publicLaws']:
        return 'Became law'
    actions = [a['text'].lower() for a in metadata['actions']]
    if any(a.strip().rstrip('.') == 'signed by president' for a in actions):
        return 'Signed by President'
    if any('vetoed by president' in a for a in actions):
        return 'Vetoed'
    if any('presented to president' in a for a in actions):
        return 'To President'
    passed_house = any('passed house' in a or 'passed/agreed to in house' in a for a in actions)
    passed_senate = any('passed senate' in a or 'passed/agreed to in senate' in a for a in actions)
    if passed_house and passed_senate:
        return 'Passed both chambers'
    if passed_house:
        return 'Passed House'
    if passed_senate:
        return 'Passed Senate'
    return 'Introduced / in Congress'


def build_record(candidate, output, fetch=official_fetch):
    identifier = candidate['id']
    match = ID_PATTERN.fullmatch(identifier)
    if not match:
        raise ValueError('Invalid bill identifier')
    congress, kind, number = match.groups()
    raw = fetch(candidate['url'])
    bill = parse_xml(raw).find('bill')
    if bill is None or bill.findtext('congress') != congress or bill.findtext('type', '').lower() != kind or bill.findtext('number') != number:
        raise ValueError('Source bill identity does not match the requested bill')
    metadata = parse_status(raw)
    timestamp = now()
    fingerprint = hashlib.sha256(raw).hexdigest()
    snapshot_id = f'{identifier}@{fingerprint[:16]}'
    snapshots = output / 'snapshots'
    snapshots.mkdir(parents=True, exist_ok=True)
    def snapshot(content, source_id, url):
        digest = hashlib.sha256(content).hexdigest()
        path = snapshots / f'{digest}.xml'
        if not path.exists():
            path.write_bytes(content)
        return source_record(content, source_id, url, f'live/snapshots/{digest}.xml', now())
    sources = [snapshot(raw, 'status', candidate['url'])]
    # Stable IDs allow independent comparison despite upstream action insertion/reordering.
    for action in metadata['actions']:
        action['id'] = 'action-' + hashlib.sha256((action['date'] + '\n' + action['text']).encode()).hexdigest()[:20]
    text_items = []
    for item in bill.findall('textVersions/item'):
        for fmt in item.findall('formats/item'):
            url = fmt.findtext('url', '')
            found = re.fullmatch(rf'https://www.govinfo.gov/content/pkg/(BILLS-{congress}{kind}{number}([a-z]+))/xml/\1\.xml', url)
            if found:
                text_items.append({'code': found.group(2), 'url': url, 'date': item.findtext('date', '')})
    text_items = sorted({x['url']: x for x in text_items}.values(), key=lambda x: (x['date'], x['code']))
    # Latest two exact artifacts keep the build bounded. All known versions are linked.
    versions, text_failures = [], []
    for item in text_items[-2:]:
        try:
            content = fetch(item['url'])
            parsed = parse_bill(content, item['code'], item['code'])
            if len(json.dumps(parsed)) > 1_500_000 or any(len(s['text']) > 100000 for s in parsed['sections']):
                raise ValueError('Section exceeds interactive reading limit; original text remains linked')
            parsed['date'] = item['date']
            versions.append(parsed)
            sources.append(snapshot(content, item['code'], item['url']))
        except Exception as exc:
            text_failures.append({'url': item['url'], 'error': str(exc)[:200]})
    latest = bill.find('latestAction')
    latest_action = {'date': latest.findtext('actionDate', '') if latest is not None else '',
                     'text': latest.findtext('text', '') if latest is not None else ''}
    stage = bill_stage(bill, metadata)
    tracker = {'billId': identifier, 'checkedAt': timestamp, 'sourceUpdatedAt': bill.findtext('updateDateIncludingText') or bill.findtext('updateDate'),
               'latestAction': latest_action, 'status': stage, 'textFailures': text_failures, 'textVersions': text_items}
    dossier = {'schemaVersion': 1, 'id': snapshot_id, 'mode': 'draft', 'billLabel': f'{"H.R." if kind == "hr" else "S."} {number} · {congress}th Congress',
               'description': 'Automatically retrieved official bill record. Interpretations and promise mappings remain research drafts.',
               'selectionNote': 'Discovered through the current-Congress GPO sitemap. Catalogue coverage grows through bounded refreshes; this is not an exhaustive or politically representative sample. Latest two supported XML text versions are parsed where available. Missing text is not an empty bill.',
               'sources': sources, 'versions': versions, 'rollcall': None, 'tracker': tracker, **metadata}
    detail_path = f'bills/{snapshot_id.replace("@", "-")}.json'
    write_json(output / detail_path, dossier)
    record = {'id': identifier, 'title': metadata['title'], 'billLabel': dossier['billLabel'], 'congress': int(congress), 'number': int(number),
              'chamber': 'House' if kind == 'hr' else 'Senate', 'topic': bill.findtext('policyArea/name') or 'Not classified',
              'sponsor': metadata['sponsors'][0]['name'] if metadata['sponsors'] else 'Not listed',
              'status': stage, 'latestAction': latest_action, 'sourceUrl': candidate['url'], 'sourceModifiedAt': candidate['modified'],
              'sourceUpdatedAt': tracker['sourceUpdatedAt'], 'checkedAt': timestamp, 'activityCheckedAt': timestamp, 'fingerprint': fingerprint,
              'detailPath': detail_path, 'detailSha256': hashlib.sha256((output/detail_path).read_bytes()).hexdigest(),
              'actionCount': len(metadata['actions']), 'textVersionCount': len(text_items), 'parsedVersionCount': len(versions), 'health': 'ok'}
    return record


def refresh(output, congress, budget=120, workers=6, fetch=official_fetch):
    timestamp = now()
    prior = read_json(output / 'index.json', {})
    previous = {x['id']: x for x in prior.get('bills', []) if x['congress'] == congress}
    found, failures, urls = discover(congress, fetch)
    chosen = select_records(found, previous, budget, timestamp)
    # A successfully read sitemap can confirm the stored record's modification
    # timestamp without downloading identical XML. Byte retrieval time stays intact.
    for key, old in list(previous.items()):
        if key in found and old.get('health') == 'ok' and old.get('sourceModifiedAt') == found[key]['modified']:
            previous[key] = {**old, 'activityCheckedAt': timestamp}
    updated = 0
    deadline = time.monotonic() + 7 * 60
    def bounded_fetch(url):
        if time.monotonic() >= deadline:
            raise TimeoutError('Refresh time budget reached; retain the previous record')
        return fetch(url)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        jobs = {pool.submit(build_record, item, output, bounded_fetch): item for item in chosen}
        for job in as_completed(jobs):
            item = jobs[job]
            try:
                previous[item['id']] = job.result()
                updated += 1
            except Exception as exc:
                failures.append({'billId': item['id'], 'source': item['url'], 'error': str(exc)[:200]})
                if item['id'] in previous:
                    previous[item['id']] = {**previous[item['id']], 'health': 'refresh_failed'}
    # Do not reset old successful times on either a source failure or a skipped record.
    index = {'schemaVersion': 1, 'congress': congress, 'generatedAt': now(), 'lastSuccessfulDiscoveryAt': timestamp if found and not any('billId' not in x for x in failures) else prior.get('lastSuccessfulDiscoveryAt'),
             'refreshHours': 4, 'sourceUrls': urls, 'discoveredCount': max(len(found), len(previous), prior.get('discoveredCount', 0) if failures else 0),
             'attemptedCount': len(chosen), 'updatedCount': updated, 'failures': failures,
             'scope': 'House and Senate bills in this Congress. Resolutions are not included. A bounded, growing catalogue; not all discovered bills have been indexed yet.',
             'bills': sorted(previous.values(), key=lambda x: (x['latestAction']['date'], x['sourceUpdatedAt'] or ''), reverse=True)}
    write_json(output/'index.json', index)
    # Retain earlier snapshots in the build cache so existing research links stay usable.
    return index


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--congress', type=int, default=current_congress(datetime.now(timezone.utc).year))
    parser.add_argument('--budget', type=int, default=120)
    args = parser.parse_args()
    if not 108 <= args.congress <= 200 or not 1 <= args.budget <= 500:
        parser.error('Congress or request budget out of range')
    result = refresh(args.output, args.congress, args.budget)
    print(json.dumps({key: result[key] for key in ['congress','discoveredCount','updatedCount','attemptedCount']}))
    print(f'Available bills: {len(result["bills"])}; source failures: {len(result["failures"])}')
