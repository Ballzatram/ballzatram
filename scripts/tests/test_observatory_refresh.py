import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from refresh_observatory import discover, refresh, select_records, build_record, current_congress, bill_stage

XML_URL='https://www.govinfo.gov/bulkdata/BILLSTATUS/119/hr/BILLSTATUS-119hr7.xml'
TEXT_URL='https://www.govinfo.gov/content/pkg/BILLS-119hr7ih/xml/BILLS-119hr7ih.xml'
MODIFIED='2026-09-11T08:00:00Z'
STATUS=b'''<billStatus><bill><congress>119</congress><type>HR</type><number>7</number><title>Synthetic fixture bill</title><updateDate>2026-09-11T08:00:00Z</updateDate><actions><item><actionDate>2026-09-10</actionDate><text>Introduced in House.</text><type>IntroReferral</type></item></actions><latestAction><actionDate>2026-09-10</actionDate><text>Introduced in House.</text></latestAction><textVersions><item><date>2026-09-10T12:00:00Z</date><formats><item><url>https://www.govinfo.gov/content/pkg/BILLS-119hr7ih/xml/BILLS-119hr7ih.xml</url></item></formats></item></textVersions></bill></billStatus>'''
BILL=b'<bill><legis-body><section id="synthetic-sec-1"><enum>1.</enum><header>Synthetic provision</header><text>Synthetic fixture, no real law.</text></section></legis-body></bill>'
def sitemap(url=None,modified=MODIFIED):
    item=f'<url><loc>{url}</loc><lastmod>{modified}</lastmod></url>' if url else ''
    return f'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{item}</urlset>'.encode()

def fake_fetch(url):
    if url.endswith('119hr/sitemap.xml'):return sitemap(XML_URL)
    if url.endswith('119s/sitemap.xml'):return sitemap()
    if url==XML_URL:return STATUS
    if url==TEXT_URL:return BILL
    raise AssertionError('Unexpected request: '+url)

class RefreshTests(unittest.TestCase):
    def test_new_text_changes_identity_and_preserves_existing_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp); candidate={'id':'119-hr-7','url':XML_URL,'modified':MODIFIED}
            first=build_record(candidate,path,fake_fetch);before=(path/first['detailPath']).read_bytes()
            second=build_record(candidate,path,fake_fetch)
            self.assertEqual(first['fingerprint'],second['fingerprint'])
            self.assertEqual(before,(path/second['detailPath']).read_bytes())
            def amended(url):
                return BILL.replace(b'no real law',b'changed synthetic words') if url==TEXT_URL else fake_fetch(url)
            third=build_record(candidate,path,amended)
            self.assertNotEqual(first['fingerprint'],third['fingerprint'])
            self.assertEqual(before,(path/first['detailPath']).read_bytes())

    def test_presidential_signature_precedes_pending_public_law_number(self):
        metadata={'publicLaws':[], 'actions':[{'text':'Presented to President.'},{'text':'Signed by President.'}]}
        self.assertEqual(bill_stage(None,metadata),'Signed by President')
        metadata['publicLaws']=['119-123']
        self.assertEqual(bill_stage(None,metadata),'Became law')

    def test_discovery_allowlist_and_no_arbitrary_url_fetch(self):
        found,errors,_=discover(119,fake_fetch)
        self.assertEqual(list(found),['119-hr-7'])
        self.assertEqual(errors,[])
        unsafe=lambda url:sitemap('https://attacker.invalid/private.xml')
        self.assertEqual(discover(119,unsafe)[0],{})

    def test_scan_writes_actual_record_versions_and_stable_ids(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)
            index=refresh(path,119,3,1,fake_fetch)
            self.assertEqual(index['updatedCount'],1)
            row=index['bills'][0]
            self.assertEqual(row['parsedVersionCount'],1)
            detail=json.loads((path/row['detailPath']).read_text())
            self.assertEqual(detail['tracker']['billId'],'119-hr-7')
            self.assertTrue(detail['actions'][0]['id'].startswith('action-'))
            self.assertEqual(detail['versions'][0]['sections'][0]['text'],'1.\nSynthetic provision\nSynthetic fixture, no real law.')
            first=row['checkedAt']
            with patch('refresh_observatory.now',return_value='2026-09-12T09:00:00+00:00'):
                second=refresh(path,119,3,1,fake_fetch)
            self.assertEqual(second['bills'][0]['checkedAt'],first)
            self.assertEqual(second['bills'][0]['activityCheckedAt'],'2026-09-12T09:00:00+00:00')

    def test_failed_refresh_retains_previous_success_and_file(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp);initial=refresh(path,119,3,1,fake_fetch);old=initial['bills'][0]
            def failure(url):
                if url.endswith('119hr/sitemap.xml'):return sitemap(XML_URL,'2026-09-12T10:00:00Z')
                if url==XML_URL:raise TimeoutError('Synthetic source outage')
                return fake_fetch(url)
            current=refresh(path,119,3,1,failure)
            row=current['bills'][0]
            self.assertEqual(row['health'],'refresh_failed')
            self.assertEqual(row['checkedAt'],old['checkedAt'])
            self.assertEqual(row['detailSha256'],old['detailSha256'])
            self.assertTrue((path/row['detailPath']).is_file())
            self.assertEqual(len(current['failures']),1)

    def test_total_source_failure_does_not_claim_a_new_success(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp);old=refresh(path,119,3,1,fake_fetch)
            def failure(url):raise TimeoutError('Synthetic outage')
            current=refresh(path,119,3,1,failure)
            self.assertEqual(current['lastSuccessfulDiscoveryAt'],old['lastSuccessfulDiscoveryAt'])
            self.assertEqual(current['bills'],old['bills'])
            self.assertEqual(len(current['failures']),2)

    def test_missing_text_is_explicit_not_a_fake_section(self):
        with tempfile.TemporaryDirectory() as temp:
            def no_text(url):
                if url==TEXT_URL:raise TimeoutError('Synthetic missing artifact')
                return fake_fetch(url)
            row=build_record({'id':'119-hr-7','url':XML_URL,'modified':MODIFIED},Path(temp),no_text)
            detail=json.loads((Path(temp)/row['detailPath']).read_text())
            self.assertEqual(detail['versions'],[])
            self.assertEqual(len(detail['tracker']['textFailures']),1)
            self.assertEqual(len(detail['actions']),1)

    def test_mismatched_bill_identity_is_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError,'identity'):
                build_record({'id':'119-hr-8','url':XML_URL,'modified':MODIFIED},Path(temp),fake_fetch)

    def test_existing_monitoring_cannot_be_starved_by_new_records(self):
        previous={'119-hr-1':{'parserRevision':2,'checkedAt':'2026-09-01T00:00:00+00:00','sourceModifiedAt':'old'}}
        found={f'119-hr-{n}':{'id':f'119-hr-{n}','url':'unused','modified':MODIFIED} for n in range(1,100)}
        selected=select_records(found,previous,4,'2026-09-12T00:00:00+00:00')
        self.assertEqual(len(selected),4);self.assertIn('119-hr-1',[x['id'] for x in selected])
        self.assertEqual(current_congress(2026),119)

if __name__=='__main__':unittest.main()
