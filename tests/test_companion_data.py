"""Current projection contract and deliberate corruption checks, all offline."""
import copy
import importlib.util
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
import build_current_lineup as pipeline
import validate_current_lineup as validator
import build_public_site as public


class CompanionData(unittest.TestCase):
    def setUp(self):
        self.doc = validator.read('current-lineup.json')

    def test_complete_current_projection_with_explicit_coverage(self):
        coverage = validator.validate(self.doc)
        self.assertEqual((coverage['appearances'], coverage['distinct_billings'], coverage['timed'], coverage['unknown_time']), (130, 127, 107, 23))
        self.assertEqual(coverage['by_day'], {'Friday': 43, 'Saturday': 43, 'Sunday': 44})
        self.assertEqual(len(coverage['historical_only_ids']), 3)

    def test_invalid_joins_and_timestamps_are_rejected(self):
        index = next(i for i, p in enumerate(self.doc['performances']) if p['starts_at'])
        mutations = [
            ('stage_id', 'made-up-stage'), ('starts_at', '2026-11-06T14:15:00+00:00'),
            ('ends_at', '2026-11-06T00:00:00-05:00'), ('artist_ids', ['artist:fake']),
            ('schedule_source_id', 'invented'), ('issue_ids', []),
        ]
        for field, value in mutations[:-1]:
            with self.subTest(field=field):
                doc = copy.deepcopy(self.doc); doc['performances'][index][field] = value
                with self.assertRaises(ValueError):
                    validator.validate(doc)
        doc = copy.deepcopy(self.doc); doc['performances'][0]['stage_id'] = 'casa-bacardi'
        with self.assertRaisesRegex(ValueError, 'Unknown schedule'):
            validator.validate(doc)
        doc = copy.deepcopy(self.doc); doc['coverage']['timed'] = 130
        with self.assertRaisesRegex(ValueError, 'coverage'):
            validator.validate(doc)

    def test_ambiguous_normalized_billings_and_artist_aliases_fail_closed(self):
        original = pipeline.read
        def ambiguous(name):
            doc = original(name)
            if name == 'performances.json':
                doc['performances'].append(dict(doc['performances'][0], performance_id='different-id'))
            return doc
        with patch.object(pipeline, 'read', side_effect=ambiguous):
            with self.assertRaisesRegex(ValueError, 'Ambiguous historical billing'):
                pipeline.project()

        def alias_collision(name):
            doc = original(name)
            if name == 'artists.json':
                doc['artists'][1]['aliases'].append(doc['artists'][0]['display_name'])
            return doc
        with patch.object(pipeline, 'read', side_effect=alias_collision):
            with self.assertRaisesRegex(ValueError, 'Ambiguous artist alias'):
                pipeline.project()


    def test_current_event_dates_and_credit_roles_cannot_drift(self):
        doc = copy.deepcopy(self.doc)
        row = doc['performances'][0]
        row['event_date'] = '2026-11-13'
        row['performance_id'] = row['performance_id'].replace('2026-11-06', row['event_date'])
        with self.assertRaisesRegex(ValueError, 'outside festival'):
            validator.validate(doc)
        doc = copy.deepcopy(self.doc)
        row = next(p for p in doc['performances'] if 'MC Dino' in p['display_name'])
        row['credits'][0]['role'] = 'performer'
        with self.assertRaisesRegex(ValueError, 'roles changed'):
            validator.validate(doc)

    def test_qualifier_changes_and_previous_conflicts_are_not_erased(self):
        changed = [p for p in self.doc['performances'] if p['reconciliation']['status'] == 'qualifier_changed']
        self.assertEqual({p['display_name'] for p in changed}, {'Brunello', 'Obskûr (Sunset Set)', 'Rossi.'})
        for p in changed:
            self.assertIn('current-vs-poster-qualifier', p['issue_ids'])
            self.assertNotEqual(p['reconciliation']['historical_billing'], p['display_name'])
        josh = next(p for p in self.doc['performances'] if p['display_name'] == 'Josh Baker')
        self.assertIn('lineup-prospa-josh-baker', josh['issue_ids'])

    def test_midnight_is_next_day_and_b2b_is_one_performance(self):
        midnight = [p for p in self.doc['performances'] if p['ends_at'] and 'T00:00:' in p['ends_at']]
        self.assertTrue(midnight)
        for p in midnight:
            self.assertGreater(p['ends_at'][:10], p['event_date'])
        b2b = next(p for p in self.doc['performances'] if p['display_name'] == 'ACRAZE B2B CID')
        self.assertEqual(b2b['artist_ids'], ['artist:acraze', 'artist:cid'])
        skull = next(a for a in validator.read('artists.json')['artists'] if a['artist_id'] == 'artist:skull-machine')
        self.assertEqual(set(skull['member_artist_ids']), {'artist:black-tiger-sex-machine', 'artist:kai-wachi'})
        fury = next(p for p in self.doc['performances'] if 'MC Dino' in p['display_name'])
        self.assertEqual({c['role'] for c in fury['credits']}, {'dj', 'mc'})

    def test_public_field_eligibility_and_source_art_exclusion(self):
        p = next(p for p in self.doc['performances'] if p['starts_at'])
        p['public_eligibility']['stage'] = p['public_eligibility']['times'] = False
        p['reconciliation']['notion_page_url'] = 'private'
        self.doc['sources'][0]['private_note'] = 'private'
        p['credits'][0]['identity_evidence_ref'] = 'private'
        exported = public.public_lineup(self.doc)
        self.assertNotIn('notion_page_url', json.dumps(exported))
        self.assertNotIn('private_note', json.dumps(exported))
        self.assertNotIn('identity_evidence_ref', json.dumps(exported))
        row = next(r for r in exported['performances'] if r['performance_id'] == p['performance_id'])
        self.assertIsNone(row['stage_id']); self.assertIsNone(row['starts_at']); self.assertIsNone(row['ends_at'])
        self.assertEqual(exported['coverage']['timed'], 106)
        p['public_eligibility']['lineup'] = False
        with self.assertRaisesRegex(ValueError, 'silently drop'):
            public.public_lineup(self.doc)
        venues = public.public_venues(validator.read('venues.json'))
        self.assertNotIn('asset_url', json.dumps(venues))
        self.assertTrue(all(s['coordinates'] is None for s in venues['stages']))
        self.assertEqual(venues['map']['geometry']['objects'], [])
        self.assertFalse(venues['map']['rights']['artwork_public_export'])


if __name__ == '__main__':
    unittest.main()
