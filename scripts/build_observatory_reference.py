"""Rebuild the selected research case from pinned official snapshots (offline)."""
import json
from pathlib import Path
from import_observatory_bill import parse_bill, parse_status, parse_votes, source_record

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'tools/observatory/data'
# Retrieval times are recorded from the original completed snapshot writes.
RETRIEVAL = json.loads((DATA / 'sources/retrieval.json').read_text())
URLS = {
    'introduced': 'https://www.govinfo.gov/content/pkg/BILLS-117s4524is/xml/BILLS-117s4524is.xml',
    'enrolled': 'https://www.govinfo.gov/content/pkg/BILLS-117s4524enr/xml/BILLS-117s4524enr.xml',
    'status': 'https://www.govinfo.gov/bulkdata/BILLSTATUS/117/s/BILLSTATUS-117s4524.xml',
    'house-vote': 'https://clerk.house.gov/evs/2022/roll480.xml',
}


def build():
    raw = {key: (DATA / 'sources' / f'{key}.xml').read_bytes() for key in URLS}
    sources = [source_record(raw[key], key, url, f'data/sources/{key}.xml', RETRIEVAL[key]['retrievedAt']) for key, url in URLS.items()]
    versions = [parse_bill(raw['introduced'], 'is', 'introduced'), parse_bill(raw['enrolled'], 'enr', 'enrolled')]
    # These are clearly marked draft reading notes, never automatically reviewed claims.
    notes = {
        '1': ('Names the measure the Speak Out Act.', ['Title']),
        '2': ('Records Congress’s findings and policy rationale. Statistics here are statements in the bill, not independently validated measurements by this workbench.', ['Findings']),
        '3': ('Defines the covered clauses and disputes. Sexual assault refers to federal criminal definitions or similar Tribal or State law; sexual harassment depends on applicable law.', ['Definitions', 'Cross-references']),
        '4': ('Addresses judicial enforceability of covered clauses agreed to before a dispute arises. Preserves at-least-as-protective State or local rules, pseudonym provisions, and protection of trade secrets or proprietary information. This is not a blanket ban on every confidentiality agreement.', ['Enforceability', 'Exceptions']),
        '5': ('Applies to claims filed under Federal, State, or Tribal law on or after enactment. The filing date and the timing of the agreement are different questions.', ['Timing']),
    }
    for sec in versions[1]['sections']:
        sec['analysis'], sec['tags'] = notes[sec['number']]
    return {'schemaVersion': 1, 'id': '117-s-4524', 'mode': 'draft', 'billLabel': 'S. 4524 · 117th Congress',
            'description': 'Follow one bill from its original language to the enrolled text and the recorded congressional decisions.',
            'selectionNote': 'Selected for manageable length, two accessible official versions, and a complete House roll call. This single historical case is not a representative sample of Congress. Interpretive notes are drafts. Enrolled text is not the signed public-law artifact; enactment is recorded separately in BILLSTATUS.',
            'sources': sources, 'versions': versions, 'rollcall': parse_votes(raw['house-vote']), **parse_status(raw['status'])}


if __name__ == '__main__':
    (DATA / 'dossier.json').write_text(json.dumps(build(), ensure_ascii=False, indent=2) + '\n')
