import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
from import_observatory_bill import parse_xml,parse_bill,parse_votes,parse_status
from build_observatory_reference import build

class ImportTests(unittest.TestCase):
    def test_reproducible_case(self):
        self.assertEqual(build(),json.loads((ROOT/'tools/observatory/data/dossier.json').read_text()))

    def test_all_sections_and_inline_words(self):
        raw=(ROOT/'tools/observatory/data/sources/enrolled.xml').read_bytes()
        v=parse_bill(raw,'enr','source')
        self.assertEqual(len(v['sections']),5)
        self.assertIn('the Speak Out Act.',v['sections'][0]['text'])
        self.assertIn('before the dispute arises',v['sections'][3]['text'])
        self.assertEqual(v['manifest']['unaccountedBlocks'],[])
        for s in v['sections']:
            self.assertIn(s['text'],v['fullText'])

    def test_reject_entities_and_unsupported_structures(self):
        for raw in [b'<!DOCTYPE bill [<!ENTITY e SYSTEM "file:///etc/passwd">]><bill>&e;</bill>', b'<html>Not bill XML</html>',b'<bill><legis-body/></bill>']:
            with self.assertRaises(ValueError):parse_bill(raw,'enr','source')

    def test_do_not_hide_unparsed_content(self):
        v=parse_bill(b'<bill><legis-body><weird>Unparsed material</weird><section><enum>1.</enum><text>Hello</text></section></legis-body></bill>','enr','s')
        self.assertEqual(v['manifest']['unaccountedBlocks'],['Unparsed material'])
        self.assertIn('Unparsed material',v['fullText'])

    def test_official_vote_totals_and_identity(self):
        raw=(ROOT/'tools/observatory/data/sources/house-vote.xml').read_bytes()
        roll=parse_votes(raw)
        self.assertEqual(roll['totals'],{'Yea':315,'Nay':109,'Not Voting':8})
        self.assertEqual(len({x['id'] for x in roll['members']}),432)
        with self.assertRaises(ValueError):parse_votes(raw.replace(b'<yea-total>315</yea-total>',b'<yea-total>314</yea-total>'))

    def test_enactment_and_chamber_actions_are_separate(self):
        status=parse_status((ROOT/'tools/observatory/data/sources/status.xml').read_bytes())
        self.assertEqual(status['publicLaws'],['117-224'])
        self.assertTrue(any('Unanimous Consent' in x['text'] for x in status['actions']))
        self.assertEqual(status['sponsors'][0]['id'],'G000555')

if __name__=='__main__':unittest.main()
