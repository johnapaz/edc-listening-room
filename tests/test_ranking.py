import unittest
from datetime import date
from edc.ranking import rank_tracks, top_100, genre_top_20, balanced_discovery
from edc.quota import Budget

DATE = date(2026, 10, 29)

def song(key, artist, listeners, genre="house", plays=None):
    return {"recording_id": key, "title": key, "artist_ids": [artist],
            "primary_genre": genre, "genres": [genre],
            "listeners": listeners, "plays": plays if plays is not None else listeners * 3,
            "release_date": "2023-01-01", "eligible": True}

class RankingTests(unittest.TestCase):
    def test_score_is_stable_and_artist_agnostic(self):
        data = [song("a", "big", 100000), song("b", "big", 90000),
                song("c", "tiny", 100), song("d", "tiny", 200)]
        first = rank_tracks(data, DATE)
        self.assertEqual(first, rank_tracks(list(reversed(data)), DATE))
        self.assertEqual(len(top_100(first)), 4)
        self.assertTrue(all(0 <= r["score"] <= 100 for r in first["ranked"]))
        self.assertEqual(len(genre_top_20(first, "house")), 4)

    def test_missing_values_not_zero(self):
        x = song("a", "one", 42)
        x["listeners"] = None
        result = rank_tracks([x], DATE)
        self.assertEqual(result["ranked"], [])
        self.assertEqual(result["unscored"][0]["reason"], "missing_listeners")

    def test_duplicate_ids_abort(self):
        with self.assertRaises(ValueError):
            rank_tracks([song("x", "a", 4), song("x", "b", 5)], DATE)

    def test_balanced_covers_small_artists(self):
        rank = rank_tracks([song("a", "big", 100000), song("b", "big", 90000),
                            song("c", "small", 100)], DATE)
        balanced = balanced_discovery(rank, ["big", "small", "missing"])
        self.assertEqual(balanced["uncovered_artist_ids"], ["missing"])
        self.assertIn("c", [r["recording_id"] for r in balanced["tracks"]])

    def test_budget_fail_closed(self):
        budget = Budget(remaining_general=849)
        with self.assertRaises(RuntimeError):
            budget.preflight_pilot(16)
        budget = Budget(remaining_general=1000)
        budget.preflight_pilot(16)
        for _ in range(16):
            budget.spend("playlistItems.insert")
        self.assertEqual(budget.used_general, 800)

if __name__ == "__main__":
    unittest.main()
