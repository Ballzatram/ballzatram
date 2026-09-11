"""Import official GPO bill XML into the Pages workbench; no API key required.

Run --help. Fetches only constructed govinfo.gov URLs. Raw snapshots are retained.
This parses text, not legal effects; analysis remains draft and review is external.
"""
from __future__ import annotations
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

MAX_BYTES = 8_000_000
VERSIONS = {'ih': 'Introduced in House', 'is': 'Introduced in Senate', 'rh': 'Reported in House', 'rs': 'Reported in Senate', 'eh': 'Engrossed in House', 'es': 'Engrossed in Senate', 'enr': 'Enrolled'}


def parse_xml(raw):
    if len(raw) > MAX_BYTES or re.search(br'<!ENTITY|<!DOCTYPE[^>]*\[', raw, re.I):
        raise ValueError('Oversized XML or internal entity declarations are not supported')
    return ET.fromstring(raw)


def plain(node):
    if node is None:
        return ''
    # Preserve inline word boundaries; add newlines only around structural blocks.
    blocks = {'section', 'subsection', 'paragraph', 'subparagraph', 'enum', 'header', 'text'}
    def walk(el):
        out = el.text or ''
        for child in el:
            chunk = walk(child)
            out += ('\n' if child.tag in blocks else '') + chunk
            out += ('\n' if child.tag in blocks else '') + (child.tail or '')
        return out
    return '\n'.join(' '.join(line.split()) for line in walk(node).splitlines() if line.strip())


def parse_bill(raw, code, source_id):
    root = parse_xml(raw)
    body = root.find('legis-body')
    if root.tag != 'bill' or body is None:
        raise ValueError('Expected Congress bill XML with a legis-body')
    sections = []
    for i, sec in enumerate(body.findall('.//section')):
        number = (sec.findtext('enum') or str(i + 1)).rstrip('.')
        sections.append({'id': f'section-{i+1}', 'number': number, 'title': plain(sec.find('header')) or 'Untitled section',
                         'locator': sec.get('id') or f'section[{i+1}]', 'text': plain(sec),
                         'sourceId': source_id, 'analysis': '', 'tags': [], 'references': [plain(x) for x in sec.findall('.//external-xref')]})
    if not sections:
        raise ValueError('No sections found; unsupported structure is not silently treated as complete')
    # Groupings are preserved through paths; unknown body content is explicitly reported.
    uncovered = []
    def account(node):
        for child in node:
            if child.tag == 'section':
                continue
            if child.tag in {'title', 'division', 'subtitle', 'chapter', 'subchapter', 'part', 'subpart'}:
                account(child)
            elif child.tag not in {'enum', 'header'}:
                uncovered.append(plain(child))
    account(body)
    # All original body text remains available even when structural accounting is incomplete.
    return {'id': code, 'label': VERSIONS[code], 'sourceId': source_id, 'sections': sections,
            'manifest': {'sectionCount': len(sections), 'unaccountedBlocks': uncovered,
                         'scope': 'All XML section nodes; headings and incorporated laws are not legal-effect analysis.'},
            'fullText': plain(body)}


def source_record(raw, identifier, url, path, retrieved):
    return {'id': identifier, 'url': url, 'path': path, 'retrievedAt': retrieved,
            'sha256': hashlib.sha256(raw).hexdigest(), 'kind': 'official_record',
            'rights': 'US federal government record; source attribution retained. No third-party reporting included.'}


def parse_status(raw):
    bill = parse_xml(raw).find('bill')
    if bill is None:
        raise ValueError('Expected BILLSTATUS XML')
    actions = []
    seen = set()
    for i, item in enumerate(bill.findall('actions/item')):
        key = (item.findtext('actionDate'), item.findtext('text'))
        if key in seen:
            continue
        seen.add(key)
        actions.append({'id': f'action-{i+1}', 'date': key[0], 'text': key[1], 'type': item.findtext('type') or 'Action',
                        'sourceId': 'status', 'locator': f'bill/actions/item[{i+1}]'})
    sponsors = [{'id': x.findtext('bioguideId'), 'name': x.findtext('fullName'), 'party': x.findtext('party'), 'state': x.findtext('state')} for x in bill.findall('sponsors/item')]
    return {'title': bill.findtext('title'), 'actions': sorted(actions, key=lambda x: x['date']), 'sponsors': sponsors,
            'publicLaws': [x.findtext('number') for x in bill.findall('laws/item')]}


def parse_votes(raw):
    root = parse_xml(raw)
    if root.tag != 'rollcall-vote':
        raise ValueError('Expected House Clerk roll call XML')
    votes = []
    for row in root.findall('vote-data/recorded-vote'):
        person = row.find('legislator')
        votes.append({'id': person.get('name-id'), 'name': person.text, 'party': person.get('party'),
                      'state': person.get('state'), 'vote': row.findtext('vote'), 'sourceId': 'house-vote'})
    counts = Counter(x['vote'] for x in votes)
    totals = root.find('vote-metadata/vote-totals/totals-by-vote')
    for name, tag in [('Yea', 'yea-total'), ('Nay', 'nay-total'), ('Present', 'present-total'), ('Not Voting', 'not-voting-total')]:
        if counts[name] != int(totals.findtext(tag)):
            raise ValueError('Vote totals do not reconcile with individual records')
    return {'question': root.findtext('vote-metadata/vote-question'), 'result': root.findtext('vote-metadata/vote-result'),
            'date': root.findtext('vote-metadata/action-date'), 'roll': root.findtext('vote-metadata/rollcall-num'),
            'sourceId': 'house-vote', 'members': votes, 'totals': dict(counts)}


def fetch(url):
    # Redirects must stay on the allowlisted source host before any request is made.
    class SameHost(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            if urllib.parse.urlsplit(newurl).hostname != 'www.govinfo.gov':
                raise ValueError('Unexpected source redirect')
            return super().redirect_request(req, fp, code, msg, headers, newurl)
    opener = urllib.request.build_opener(SameHost)
    with opener.open(url, timeout=30) as response:
        raw = response.read(MAX_BYTES + 1)
    parse_xml(raw)
    return raw


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--congress', type=int, required=True)
    parser.add_argument('--type', choices=['hr', 's'], required=True)
    parser.add_argument('--number', type=int, required=True)
    parser.add_argument('--versions', nargs='+', choices=VERSIONS, required=True)
    parser.add_argument('--output', type=Path, required=True, help='New directory for dossier.json and sources/')
    args = parser.parse_args()
    if not 103 <= args.congress <= 200 or not 1 <= args.number <= 99999:
        parser.error('Congress or bill number outside supported bounds')
    if args.output.exists():
        parser.error('Output already exists; choose a new directory to preserve snapshots')
    identifier = f'{args.congress}-{args.type}-{args.number}'
    fetched = datetime.now(timezone.utc).isoformat()
    sources, versions, blobs = [], [], {}
    for code in dict.fromkeys(args.versions):
        pkg = f'BILLS-{args.congress}{args.type}{args.number}{code}'
        url = f'https://www.govinfo.gov/content/pkg/{pkg}/xml/{pkg}.xml'
        raw = fetch(url)
        blobs[f'{code}.xml'] = raw
        sources.append(source_record(raw, code, url, f'sources/{code}.xml', fetched))
        versions.append(parse_bill(raw, code, code))
    status_url = f'https://www.govinfo.gov/bulkdata/BILLSTATUS/{args.congress}/{args.type}/BILLSTATUS-{args.congress}{args.type}{args.number}.xml'
    status_raw = fetch(status_url)
    blobs['status.xml'] = status_raw
    sources.append(source_record(status_raw, 'status', status_url, 'sources/status.xml', fetched))
    metadata = parse_status(status_raw)
    dossier = {'schemaVersion': 1, 'id': identifier, 'mode': 'draft', 'billLabel': f'{args.type.upper()} {args.number} · {args.congress}th Congress',
               'description': 'Official text import. Interpretations and promise mappings require research.',
               'selectionNote': 'User-selected bill; not a representative congressional sample.',
               'sources': sources, 'versions': versions, 'rollcall': None, **metadata}
    args.output.mkdir(parents=True)
    (args.output / 'sources').mkdir()
    for name, raw in blobs.items():
        (args.output / 'sources' / name).write_bytes(raw)
    (args.output / 'dossier.json').write_text(json.dumps(dossier, indent=2) + '\n')
    print(args.output / 'dossier.json')


if __name__ == '__main__':
    main()
