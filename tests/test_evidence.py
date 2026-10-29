import json
import tempfile
import unittest
from pathlib import Path
from edc.evidence import collect, require_complete
from edc.quota import Budget


class FakeMB:
    def __init__(self, fail=False):
        self.calls = []
        self.fail = fail

    def get(self, path, params):
        self.calls.append((path, params))
        if self.fail:
            raise RuntimeError('MusicBrainz returned HTTP 429')
        return {'candidate_evidence': True}


class FakeYT:
    def __init__(self):
        self.quota = Budget(1, 2, maximum_general_per_run=1)
        self.calls = []

    def request(self, endpoint, params):
        self.calls.append(endpoint)
        self.quota.spend(endpoint + '.list')
        return {'items': []}


class EvidenceTests(unittest.TestCase):
    def run_collection(self, fail):
        mb, yt = FakeMB(fail), FakeYT()
        artists = [{'name': str(i), 'musicbrainz_candidate_id': str(i)} for i in range(8)]
        tracks = [{'candidate_id': str(i), 'title': 'Song' + str(i), 'pilot_artist': 'Artist'} for i in range(41)]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'report.json'
            result = collect(mb, yt, artists, tracks, [{'video_id': 'example'}], output)
            self.assertEqual(json.loads(output.read_text()), result)
        self.assertEqual(yt.calls, ['videos'])
        self.assertEqual(result['youtube_general_used'], 1)
        self.assertEqual(result['youtube_search_used'], 0)
        self.assertFalse(result['human_approval'])
        return mb, result

    def test_fixed_pool_is_read_only_and_bounded(self):
        mb, result = self.run_collection(False)
        self.assertEqual(len(mb.calls), 49)
        self.assertTrue(result['complete'])

    def test_provider_failure_stops_mb_and_preserves_youtube(self):
        mb, result = self.run_collection(True)
        self.assertEqual(len(mb.calls), 1)
        self.assertFalse(result['complete'])
        self.assertIn('musicbrainz', result['errors'])
        self.assertEqual(result['failed_lookup']['key'], '0')
        self.assertEqual(len(result['pending_recordings']), 41)

    def test_recovery_reuses_completed_youtube_requests(self):
        artists = [{'name': str(i), 'musicbrainz_candidate_id': str(i)} for i in range(8)]
        tracks = [{'candidate_id': str(i), 'title': 'Song' + str(i), 'pilot_artist': 'Artist'} for i in range(41)]
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            collect(FakeMB(True), FakeYT(), artists, tracks, [{'video_id': 'example'}],
                    folder / 'first.json', folder / 'cache')
            yt = FakeYT()
            result = collect(FakeMB(), yt, artists, tracks, [{'video_id': 'example'}],
                             folder / 'second.json', folder / 'cache')
            self.assertEqual(yt.calls, [])
            self.assertEqual(result['youtube_general_used'], 0)
            self.assertEqual(result['youtube_search_used'], 0)
            self.assertEqual(len(result['youtube_cache_hits']), 1)
            self.assertTrue(result['complete'])

    def test_durable_seed_resumes_without_any_cache_or_youtube(self):
        artists = [{'name': str(i), 'musicbrainz_candidate_id': str(i)} for i in range(8)]
        tracks = [{'candidate_id': str(i), 'title': 'Song' + str(i), 'pilot_artist': 'Artist'} for i in range(41)]
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'report.json'
            first = collect(FakeMB(), FakeYT(), artists, tracks, [], output, provider='musicbrainz')
            seed = {'requests': dict(list(first['requests'].items())[:-3])}
            mb, yt = FakeMB(), FakeYT()
            result = collect(mb, yt, artists, tracks, [], output, provider='musicbrainz', checkpoint=seed)
            self.assertEqual(len(mb.calls), 3)
            self.assertEqual(yt.calls, [])
            self.assertTrue(result['complete'])
            failed = collect(FakeMB(True), FakeYT(), artists, tracks, [], output, provider='musicbrainz', checkpoint=seed)
            with self.assertRaises(ValueError):
                require_complete(failed)
            self.assertFalse(failed['human_approval'])

    def test_youtube_only_never_calls_musicbrainz(self):
        artists = [{'name': str(i), 'musicbrainz_candidate_id': str(i)} for i in range(8)]
        tracks = [{'candidate_id': str(i), 'title': 'Song' + str(i), 'pilot_artist': 'Artist'} for i in range(41)]
        mb, yt = FakeMB(True), FakeYT()
        with tempfile.TemporaryDirectory() as directory:
            collect(mb, yt, artists, tracks, [{'video_id': 'example'}], Path(directory)/'report.json', provider='youtube')
        self.assertEqual(mb.calls, [])
        self.assertEqual(yt.calls, ['videos'])
