"""Deployment exclusion and pure application test entrypoints for ordinary CI."""
import json
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class CompanionApp(unittest.TestCase):
    @unittest.skipUnless(shutil.which('node'), 'node not installed')
    def test_queries_and_route_logic(self):
        result = subprocess.run(['node', '--test', 'tests/companion.test.js'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_review_build_is_explicit_and_excluded_from_default_production(self):
        result = subprocess.run(['python3', 'scripts/build_companion_preview.py'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        out = ROOT / 'companion-preview'
        for name in ('index.html', 'lib.js', 'components.js', 'app.js', 'styles.css'):
            self.assertTrue((out / 'companion' / name).is_file())
        html = (out / 'companion/index.html').read_text()
        self.assertIn('noindex,nofollow', html)
        self.assertIn('components.js?v=', html)
        self.assertEqual(len(json.loads((out / 'data/edco-2026/performances.json').read_text())['performances']), 130)
        result = subprocess.run(['python3', 'scripts/build_public_site.py'], cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse((ROOT / 'public-site/companion').exists())
        all_html = ''.join(p.read_text() for p in (ROOT / 'public-site').rglob('*.html'))
        self.assertNotIn('/companion/', all_html)
