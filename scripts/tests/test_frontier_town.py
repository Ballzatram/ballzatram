"""Dependency-free regression checks for the Digital Frontier journey homepage."""
from html.parser import HTMLParser
from pathlib import Path
import json
import re
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
        self.assertIn('The road gets quieter.', html)
        self.assertIn('PULL UP', html)
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

    def test_roadside_encounters_leave_long_empty_miles(self):
        town = (ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8')
        journey = (ROOT / 'assets/frontier/journey.css').read_text(encoding='utf-8')
        windows = [(float(a), float(b)) for a, b in re.findall(
            r'data-start="([0-9.]+)" data-end="([0-9.]+)"', town
        )]
        self.assertEqual(len(windows), 3)
        for start, end in windows:
            self.assertGreater(end, start)
            self.assertLessEqual(end - start, .19, 'Signs should last less than one fifth of the ride')
        for (_, prior_end), (next_start, _) in zip(windows, windows[1:]):
            self.assertGreaterEqual(round(next_start - prior_end, 2), .17)
        self.assertIn('height:680svh', journey)
        self.assertIn('height:640svh', journey)
        self.assertIn('--sign-shift', journey)
        self.assertIn('--sign-opacity', journey)

    def test_cowboy_has_separate_street_below_all_building_labels(self):
        town_css = (ROOT / 'assets/frontier/town.css').read_text(encoding='utf-8')
        journey = (ROOT / 'assets/frontier/journey.css').read_text(encoding='utf-8')
        town = (ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8')
        self.assertIn('town-building--homestead', town)
        # Mobile world grows by exactly the amount used to extend the street.
        # This keeps the interactive storefronts at their original positions.
        self.assertIn('.town-world{height:510px;min-width:940px}', journey)
        self.assertIn('.town-street{height:174px}', journey)
        self.assertIn('.town-buildings{bottom:174px}', journey)
        self.assertIn('z-index:11;bottom:12px;left:11%;right:auto;', journey)
        self.assertIn('.town-horse{bottom:12px;left:11%;right:auto;width:82px;height:82px}', journey)
        self.assertIn('bottom:-37px;', town_css)
        self.assertIn('pointer-events:none', journey)
        # The last two quick-fix layouts were wrong: no right edge rider or
        # hidden rider behind the Sheriff.
        self.assertNotIn('z-index:5;bottom:55px;left:4%', journey)
        self.assertNotIn('.town-horse{bottom:51px;left:4%', journey)

    def test_yuma_landscape_and_legible_ride_heading(self):
        town = (ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8')
        journey = (ROOT / 'assets/frontier/journey.css').read_text(encoding='utf-8')
        for token in ('YUMA, ARIZONA', 'ride-yuma-ranges', 'ride-yuma-wash',
                      'ride-ocotillo', 'ride-sun'):
            self.assertIn(token, town)
        self.assertIn('background:linear-gradient(90deg,#252439e6,#30273dca)', journey)
        self.assertIn('@media(max-width:360px)', journey)
        self.assertIn('ride-sun{width:78px;height:78px;right:1%}', journey)

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
