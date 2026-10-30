"""Offline fault injection, including the saved successful run's actual checkpoint."""
import argparse
import copy
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from edc import discovery as d
from edc import cli
from edc.quota import Budget
from edc.youtube import YouTube, YouTubeHTTPError
from test_discovery import FakeYT, acts_fixture, video


class RecoveryTests(unittest.TestCase):
    @unittest.skipUnless(os.getenv('EDC_OFFLINE_STATE'), 'Optional local saved-state replay; do not publish captured state')
    def test_saved_checkpoint_resume_never_repeats_33_completed_searches(self):
        state = json.loads(Path(os.environ['EDC_OFFLINE_STATE']).read_text())
        original = copy.deepcopy(state)
        acts = d.build_acts()
        self.assertEqual(len(state['searched_acts']), 33)
        yt = FakeYT()
        d.match_acts(yt, acts, state, per_act=3, max_searches=0, unit_budget=1000)
        self.assertEqual(yt.calls, [])
        self.assertEqual(state['matches'], original['matches'])
        self.assertEqual(len(d.publish_list(acts, state, {}, per_act=3)), 68)
        self.assertEqual(sum(bool(a.songs) and a.act_id not in state['searched_acts'] for a in acts), 73)

    def test_metadata_failure_keeps_search_result_and_resumes_without_search(self):
        yt = FakeYT(results={'Alpha': [video('V1', 'One', 'Alpha - Topic', 200)]})
        original = yt.request
        snapshots = []
        state = {'searched_acts': [], 'matches': {}}
        def fail(endpoint, params, **kw):
            if endpoint == 'videos':
                yt.quota.spend('videos.list')
                raise YouTubeHTTPError('unavailable', 503)
            return original(endpoint, params, **kw)
        yt.request = fail
        with self.assertRaises(YouTubeHTTPError):
            d.match_acts(yt, acts_fixture()[:1], state, per_act=3, max_searches=1,
                         unit_budget=100, checkpoint=lambda: snapshots.append(copy.deepcopy(state)))
        self.assertEqual(snapshots[0]['pending_search_results']['artist:a'], ['V1'])
        yt.request = original
        d.match_acts(yt, acts_fixture()[:1], state, per_act=3, max_searches=0, unit_budget=100)
        self.assertEqual(yt.quota.used_search, 1)
        self.assertEqual(state['searched_acts'], ['artist:a'])

    def test_ambiguous_insert_is_not_retried_and_resume_reconciles(self):
        yt = FakeYT()
        yt.playlist = 'PL1'
        original = yt.request
        state = {}
        def applied_then_failed(endpoint, params, **kw):
            result = original(endpoint, params, **kw)
            if endpoint == 'playlistItems' and kw.get('method') == 'POST':
                raise YouTubeHTTPError('conflict', 409)
            return result
        yt.request = applied_then_failed
        first = d.sync_playlist(yt, [{'video_id': 'V1'}], unit_budget=1000, state=state)
        self.assertEqual(first['added'], 1)
        self.assertNotIn('pending_write', state)
        self.assertEqual(yt.calls.count(('playlistItems', 'POST')), 1)
        yt.request = original
        result = d.sync_playlist(yt, [{'video_id': 'V1'}], unit_budget=1000, state=state)
        self.assertEqual((result['added'], result['count']), (0, 1))
        self.assertNotIn('pending_write', state)

    def test_unresolved_write_and_stale_success_listing_fail_closed(self):
        for state in ({'pending_write': {'operation': 'playlistItems.POST', 'video_id': 'V1'}},
                      {'confirmed_playlist_videos': ['V1']}):
            yt = FakeYT()
            yt.playlist = 'PL1'
            with self.assertRaises(RuntimeError):
                d.sync_playlist(yt, [{'video_id': 'V1'}], unit_budget=1000, state=state)
            self.assertNotIn(('playlistItems', 'POST'), yt.calls)

    def test_actual_read_cost_reduces_writes_and_report_is_exact(self):
        yt = FakeYT()
        yt.playlist = 'PL1'
        original = yt.my_pilot_playlists
        def paginated(marker):
            for _ in range(5):
                yt.quota.spend('playlists.list')
            return original(marker)
        yt.my_pilot_playlists = paginated
        result = d.sync_playlist(yt, [{'video_id': 'V1'}, {'video_id': 'V2'}], unit_budget=105)
        self.assertEqual(result['added'], 1)
        self.assertEqual(result['units_spent'], yt.quota.used_general)
        self.assertEqual(yt.quota.used_general, 59)

    def test_hard_budget_blocks_request_before_network(self):
        yt = YouTube('secret', Budget(49, maximum_general_per_run=49))
        with patch('edc.youtube.urlopen') as network:
            with self.assertRaises(RuntimeError):
                yt.request('playlistItems', {}, method='POST', body={})
            network.assert_not_called()
        self.assertEqual(yt.quota.attempts, {})

    def test_provider_diagnostics_are_allowlisted_and_body_is_never_printed(self):
        for reason, expected in [('rateLimitExceeded', 'rateLimitExceeded'), ('SECRET', 'unknown')]:
            body = json.dumps({'error': {'message': 'SECRET', 'errors': [{'reason': reason}]}}).encode()
            yt = YouTube('SECRET', Budget(1000))
            failure = HTTPError('https://example.invalid/SECRET', 429, 'SECRET', {}, io.BytesIO(body))
            with patch('edc.youtube.urlopen', side_effect=failure):
                with self.assertRaises(YouTubeHTTPError) as caught:
                    yt.request('search', {})
            self.assertEqual(caught.exception.diagnostic(), {'operation': 'search.list',
                                                            'http_status': 429, 'reason': expected})
            self.assertNotIn('SECRET', str(caught.exception))
            self.assertEqual(yt.quota.attempts, {'search.list': 1})

    def test_cli_failure_still_saves_safe_summary_and_checkpoint(self):
        with tempfile.TemporaryDirectory() as folder:
            data = Path(folder)
            state = {'searched_acts': [], 'matches': {}}
            args = argparse.Namespace(per_act=3, apply=True, remaining_general=1000, remaining_searches=10)
            with patch.object(d, 'DATA', data), patch.object(d, 'MATCHES_FILE', data / 'matches.json'), \
                 patch.object(d, 'build_acts', return_value=acts_fixture()), \
                 patch.object(d, 'load_matches', return_value=state), \
                 patch.object(d, 'load_decisions', return_value={}), \
                 patch('edc.cli.access_token_from_secrets', side_effect=RuntimeError('SECRET')), \
                 patch.dict('os.environ', {'EDC_ENABLE_WRITES': '1', 'EDC_PILOT_APPROVED': '1'}):
                with self.assertRaises(SystemExit):
                    cli.run_discovery(args)
            summary = json.loads((data / 'discovery-run-summary.json').read_text())
            self.assertEqual(summary['status'], 'failed')
            self.assertEqual(summary['attempted_requests'], {})
            self.assertTrue(summary['checkpoint_written'])
            self.assertNotIn('SECRET', json.dumps(summary))
            self.assertTrue((data / 'matches.json').exists())

    def test_atomic_checkpoint_replacement_preserves_valid_json(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'state.json'
            d.atomic_json(path, {'old': True})
            d.atomic_json(path, {'new': True})
            self.assertEqual(json.loads(path.read_text()), {'new': True})
            self.assertFalse(path.with_suffix('.json.tmp').exists())

    def test_known_transient_search_retries_are_bounded_and_metered(self):
        yt = FakeYT(results={'Alpha': [video('V1', 'One', 'Alpha - Topic', 200)]})
        original = yt.request
        state = {'searched_acts': [], 'matches': {}}
        def throttled(endpoint, params, **kw):
            if endpoint == 'search' and yt.quota.used_search < 2:
                yt.quota.spend('search.list')
                raise YouTubeHTTPError('throttled', 429, operation='search.list', reason='rateLimitExceeded')
            return original(endpoint, params, **kw)
        yt.request = throttled
        d.match_acts(yt, acts_fixture()[:1], state, per_act=3, max_searches=3, unit_budget=100)
        self.assertEqual(yt.quota.used_search, 3)
        self.assertEqual(yt.sleeps, [15, 30])
        self.assertEqual(state['searched_acts'], ['artist:a'])

    def test_known_transient_search_cannot_retry_past_declared_search_count(self):
        yt = FakeYT()
        state = {'searched_acts': [], 'matches': {}}
        def throttled(endpoint, params, **kw):
            yt.quota.spend('search.list')
            raise YouTubeHTTPError('throttled', 429, reason='rateLimitExceeded')
        yt.request = throttled
        d.match_acts(yt, acts_fixture(), state, per_act=3, max_searches=1, unit_budget=100)
        self.assertEqual(yt.quota.used_search, 1)
        self.assertEqual(yt.sleeps, [])
        self.assertEqual(state['searched_acts'], [])

    def test_insert_not_applied_keeps_journal_and_does_not_retry(self):
        yt = FakeYT()
        yt.playlist = 'PL1'
        original = yt.request
        state = {}
        def not_applied(endpoint, params, **kw):
            if endpoint == 'playlistItems' and kw.get('method') == 'POST':
                yt.quota.spend('playlistItems.insert')
                yt.calls.append((endpoint, 'POST'))
                raise YouTubeHTTPError('conflict', 409, operation='playlistItems.insert')
            return original(endpoint, params, **kw)
        yt.request = not_applied
        with self.assertRaises(YouTubeHTTPError):
            d.sync_playlist(yt, [{'video_id': 'V1'}], unit_budget=1000, state=state)
        self.assertIn('pending_write', state)
        self.assertEqual(yt.calls.count(('playlistItems', 'POST')), 1)
        self.assertEqual(state['last_provider_error']['http_status'], 409)
        self.assertEqual(state['writes_completed_last_run'], {'inserted': 0, 'deleted': 0})

    def test_budget_remainder_keeps_readback_verified_and_exposes_work_remaining(self):
        yt = FakeYT(units=160)
        result = d.sync_playlist(yt, [{'video_id': 'V1'}, {'video_id': 'V2'}], unit_budget=60)
        self.assertEqual(result['added'], 0)
        self.assertEqual(result['still_to_add'], 2)
        self.assertTrue(result['readback_verified'])
        self.assertLessEqual(yt.quota.used_general, 160)

    def test_creation_checkpoint_records_identity_before_intent_is_cleared(self):
        yt = FakeYT()
        state, snapshots = {}, []
        d.sync_playlist(yt, [], unit_budget=1000, state=state,
                        checkpoint=lambda: snapshots.append(copy.deepcopy(state)))
        first_cleared = next(s for s in snapshots if 'pending_write' not in s)
        self.assertEqual(first_cleared['playlist_id'], 'PL1')

    def test_non_json_provider_body_is_unknown_and_never_exposed(self):
        yt = YouTube('SECRET', Budget(1000))
        failure = HTTPError('https://example.invalid', 429, 'private message', {}, io.BytesIO(b'<html>SECRET</html>'))
        with patch('edc.youtube.urlopen', side_effect=failure):
            with self.assertRaises(YouTubeHTTPError) as caught:
                yt.request('search', {})
        self.assertEqual(caught.exception.reason, 'unknown')
        self.assertNotIn('SECRET', str(caught.exception))
