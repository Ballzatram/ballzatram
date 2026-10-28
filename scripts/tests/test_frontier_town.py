"""Dependency-free regression checks for the Digital Frontier journey homepage."""
from html.parser import HTMLParser
from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[2]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.buildings = []
        self.signs = 0
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = attributes.get('class', '').split()
        if tag == 'a':
            self.hrefs.append(attributes.get('href'))
            if 'town-building' in classes:
                self.buildings.append(attributes)
        if 'ride-sign' in classes:
            self.signs += 1


class FrontierTownTests(unittest.TestCase):
    def test_home_is_only_the_western_journey(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        town = (ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8')
        camp = (ROOT / 'assets/frontier/camp.partial').read_text(encoding='utf-8')
        self.assertIn(town, html, 'Regenerate with python scripts/build_frontier.py')
        self.assertIn('assets/frontier/town.css', html)
        self.assertIn('assets/frontier/journey.css', html)
        self.assertIn('assets/frontier/ride.js', html)
        self.assertIn('id="trail-map"', html)
        self.assertIn('id="programs"', html, 'Retain existing deep-link fragment')
        self.assertIn('THE ROAD', html)
        self.assertIn('THE TOWN NOTICEBOARD', camp)
        self.assertIn('HOWDY,', html)
        self.assertIn("I'M DEVIN.", html)
        self.assertNotIn('GALLEMORE GULCH', html)
        self.assertNotIn('frontier-directory', html)
        self.assertNotIn('frontier-trails', html)
        self.assertNotIn('program-search', html)
        self.assertNotIn('frontier-header', html)

    def test_every_public_project_is_in_the_hidden_trail_map(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        parser = Links()
        parser.feed(html)
        items = json.loads((ROOT / 'data/public-programs.json').read_text(encoding='utf-8'))
        for item in items:
            self.assertIn(item['href'], parser.hrefs, item['title'])
        self.assertEqual(6, len(parser.buildings))
        self.assertEqual(3, parser.signs)
        self.assertEqual(6, len({a['href'] for a in parser.buildings}))
        for building in parser.buildings:
            self.assertTrue(building.get('aria-label'), building)
            target = ROOT / building['href']
            if target.is_dir():
                target /= 'index.html'
            self.assertTrue(target.is_file(), f"Broken building destination: {building['href']}")

    def test_progressive_enhancement_and_input_remain_accessible(self):
        script = (ROOT / 'assets/frontier/ride.js').read_text(encoding='utf-8')
        town_css = (ROOT / 'assets/frontier/town.css').read_text(encoding='utf-8')
        journey_css = (ROOT / 'assets/frontier/journey.css').read_text(encoding='utf-8')
        self.assertIn('prefers-reduced-motion', script)
        self.assertIn('sign.inert = !visible', script)
        self.assertIn(':focus-visible', town_css)
        self.assertIn('overflow-x:auto', town_css, 'The town must be pannable on narrow screens')
        self.assertIn(':not(.has-ride-motion)', town_css, 'No-script signs must be visible')
        self.assertIn('@media(hover:none)', journey_css)
        self.assertIn('@media(prefers-reduced-motion:reduce)', journey_css)
        self.assertIn('<details class="trail-ledger"', (ROOT / 'assets/frontier/camp.partial').read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
