import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('pilot', Path(__file__).with_name('deploy-pilot.py'))
pilot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pilot)


class CatalogueGateTests(unittest.TestCase):
    def verify(self, enabled, page):
        calls = []

        def fetch(path):
            calls.append(path)
            return {'terrainsActifs': enabled} if path == '/api/fonctionnalites' else page

        pilot.verify_catalogue(fetch)
        return calls

    def test_empty_is_valid_and_hidden_land_is_not_requested(self):
        calls = self.verify(False, {'items': [], 'total': 0, 'page': 1, 'pageSize': 6})
        self.assertEqual(calls, ['/api/fonctionnalites', '/api/villas?page=1&pageSize=6',
                                 '/api/locations?page=1&pageSize=6'])

    def test_enabled_land_is_checked(self):
        calls = self.verify(True, {'items': [{'id': '1', 'titre': 'Exemple'}], 'total': 1, 'page': 1, 'pageSize': 6})
        self.assertEqual(calls[-1], '/api/terrains?page=1&pageSize=6')

    def test_malformed_or_missing_results_fail_the_gate(self):
        for rows in ([], [{}], 'not a list'):
            with self.subTest(rows=rows), self.assertRaises(ValueError):
                self.verify(True, {'items': rows, 'total': 1, 'page': 1, 'pageSize': 6})


if __name__ == '__main__':
    unittest.main()
