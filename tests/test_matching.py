import unittest
from edc.matching import similarity, search_suggestions
from edc.quota import Budget

class FakeSearch:
    def __init__(self):
        self.quota = Budget(remaining_general=1000, remaining_search=2)

    def request(self, endpoint, params):
        self.quota.spend(endpoint + ".list")
        return {"items": [{
            "id": {"videoId": "abcdefghijk"},
            "snippet": {"title": "Artist - Example Song (Official Audio)", "channelTitle": "Artist"}
        }]}

class MatchingTests(unittest.TestCase):
    def test_similarity_prioritizes_correct_song(self):
        right = similarity("Artist", "Example Song", "Artist - Example Song (Official Audio)", "Artist")
        wrong = similarity("Artist", "Example Song", "Different Song", "Other Channel")
        self.assertGreater(right, wrong)

    def test_suggestions_do_not_auto_approve(self):
        yt = FakeSearch()
        matches = search_suggestions(yt, [{
            "recording_id": "mbid", "artist": "Artist", "title": "Example Song"
        }])
        self.assertFalse(matches[0]["human_verified"])
        self.assertEqual(matches[0]["suggestions"][0]["video_id"], "abcdefghijk")
        self.assertEqual(yt.quota.used_search, 1)

if __name__ == "__main__":
    unittest.main()
