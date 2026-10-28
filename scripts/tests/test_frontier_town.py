"""Dependency-free regression checks for the Gallemore Gulch homepage."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.buildings = []
        self.signs = 0

    def handle_starttag(self, tag, attrs):
        attributes = dict(attrs)
        classes = attributes.get('class', '').split()
        if tag == 'a' and 'town-building' in classes:
            self.buildings.append(attributes)
        if 'ride-sign' in classes:
            self.signs += 1


class FrontierTownTests(unittest.TestCase):
    def test_generated_front_page_contains_source_town(self):
        html = (ROOT / 'index.html').read_text(encoding='utf-8')
        town = (ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8')
        self.assertIn(town, html, 'Run python scripts/build_frontier.py after editing town.html')
        self.assertIn('assets/frontier/town.css', html)
        self.assertIn('assets/frontier/ride.js', html)
        self.assertIn('id="programs"', html, 'The full project directory must remain available')

    def test_buildings_and_signs_point_to_real_destinations(self):
        parser = Links()
        parser.feed((ROOT / 'assets/frontier/town.partial').read_text(encoding='utf-8'))
        self.assertEqual(6, len(parser.buildings))
        self.assertEqual(3, parser.signs)
        self.assertEqual(6, len({a['href'] for a in parser.buildings}))
        for building in parser.buildings:
            self.assertTrue(building.get('aria-label'), building)
            target = ROOT / building['href']
            if target.is_dir():
                target /= 'index.html'
            self.assertTrue(target.is_file(), f"Broken building destination: {building['href']}")

    def test_progressive_enhancement_remains_accessible(self):
        script = (ROOT / 'assets/frontier/ride.js').read_text(encoding='utf-8')
        css = (ROOT / 'assets/frontier/town.css').read_text(encoding='utf-8')
        self.assertIn('prefers-reduced-motion', script)
        self.assertIn('sign.inert = !visible', script)
        self.assertIn(':focus-visible', css)
        self.assertIn('overflow-x:auto', css, 'The town must be pannable on narrow screens')
        self.assertIn(':not(.has-ride-motion)', css, 'Signs must remain visible without JavaScript')


if __name__ == '__main__':
    unittest.main()
