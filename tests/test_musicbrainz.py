import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from edc.musicbrainz import MusicBrainz, research_artists


class MusicBrainzTests(unittest.TestCase):
    def test_503_backoff_and_success_cached_on_resume(self):
        with tempfile.TemporaryDirectory() as directory:
            client = MusicBrainz("test@example.org", directory)
            error = HTTPError("https://musicbrainz.org", 503, "busy", {"Retry-After": "5"}, None)
            with patch("edc.musicbrainz.urlopen", side_effect=[error, io.BytesIO(b'{"artists": []}')]) as request, patch("edc.musicbrainz.time.sleep") as sleep, patch('edc.musicbrainz.random.uniform', return_value=0):
                self.assertEqual(client.artist_candidates("KI/KI"), [])
                self.assertEqual(request.call_count, 2)
                sleep.assert_any_call(5)
            with patch("edc.musicbrainz.urlopen") as request:
                self.assertEqual(MusicBrainz("test@example.org", directory).artist_candidates("KI/KI"), [])
                request.assert_not_called()

    def test_long_retry_after_defers_without_early_retry(self):
        with tempfile.TemporaryDirectory() as directory:
            error = HTTPError('url', 503, 'busy', {'Retry-After': '120'}, None)
            with patch('edc.musicbrainz.urlopen', side_effect=error) as request:
                with self.assertRaisesRegex(RuntimeError, 'deferred'):
                    MusicBrainz('test@example.org', directory).artist_candidates('CID')
                self.assertEqual(request.call_count, 1)

    def test_timeout_retries_are_bounded(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("edc.musicbrainz.urlopen", side_effect=URLError("timeout")) as request, patch("edc.musicbrainz.time.sleep"):
                with self.assertRaisesRegex(RuntimeError, "3 attempts"):
                    MusicBrainz("test@example.org", directory).artist_candidates("CID")
                self.assertEqual(request.call_count, 3)

    def test_partial_checkpoint_continues_and_rerun_recovers(self):
        with tempfile.TemporaryDirectory() as directory:
            output = str(Path(directory) / "artists.json")
            class Client:
                def artist_candidates(self, name):
                    if name == "bad":
                        raise RuntimeError("MusicBrainz returned HTTP 503")
                    # The earlier artist is on disk before the next request.
                    if name == "last":
                        self_test.assertIn("first", json.loads(Path(output).read_text()))
                    return [{"id": name}]
            self_test = self
            with patch("edc.musicbrainz.PILOT_ARTISTS", ["first", "bad", "last"]):
                self.assertFalse(research_artists(Client(), output))
                self.assertEqual(set(json.loads(Path(output).read_text())), {"first", "last"})
                report = json.loads(Path(output).with_suffix(".report.json").read_text())
                self.assertEqual(report["artists"]["bad"]["status"], "failed")
                self.assertFalse(report["complete"])
            with patch("edc.musicbrainz.PILOT_ARTISTS", ["first", "last"]):
                self.assertTrue(research_artists(Client(), output))

    def test_nonretryable_http_error_stops_after_one_attempt(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch("edc.musicbrainz.urlopen", side_effect=HTTPError("url", 400, "bad", {}, None)) as request:
                with self.assertRaisesRegex(RuntimeError, "HTTP 400"):
                    MusicBrainz("test@example.org", directory).artist_candidates("CID")
                self.assertEqual(request.call_count, 1)
