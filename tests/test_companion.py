"""Static companion source-contract tests; no API calls or publishing."""
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "edco-2026"


def read(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


class CompanionContracts(unittest.TestCase):
    def test_static_entrypoint_and_no_external_script(self):
        html = (ROOT / "companion" / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "companion" / "app.js").read_text(encoding="utf-8")
        self.assertIn('src="app.js"', html)
        self.assertIn('href="styles.css"', html)
        self.assertNotIn("https://www.googletagmanager.com", html)
        self.assertNotIn("eval(", js)
        self.assertIn("Time TBA", js)
        self.assertIn("Stage TBA", js)

    def test_performance_and_artist_references(self):
        rows = read("performances.json")["performances"]
        artists = {r["artist_id"] for r in read("artists.json")["artists"]}
        stages = {r["stage_id"] for r in read("venues.json")["stages"]}
        self.assertEqual(len(rows), len({r["performance_id"] for r in rows}))
        self.assertEqual({r["event_date"] for r in rows},
                         {"2026-11-06", "2026-11-07", "2026-11-08"})
        self.assertTrue(rows)
        for row in rows:
            self.assertTrue(set(row["artist_ids"]).issubset(artists), row["performance_id"])
            self.assertTrue(row["stage_id"] is None or row["stage_id"] in stages)
            self.assertFalse(row["source_order_is_running_order"])
            self.assertEqual(bool(row["starts_at"]), bool(row["ends_at"]))

    def test_outbound_song_ids_are_stable_and_related(self):
        candidates = read("discovery-candidates.json")["rows"]
        artists = {r["artist_id"] for r in read("artists.json")["artists"]}
        ids = [r["spotify_track_id"] for r in candidates]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertTrue(ids)
        for row in candidates:
            self.assertEqual(len(row["spotify_track_id"]), 22)
            self.assertTrue(row["spotify_track_id"].isalnum())
            self.assertTrue(set(row["lineup_artist_ids"]).issubset(artists))


if __name__ == "__main__":
    unittest.main()
