import argparse
import unittest

from edc import discovery as d
from edc.cli import quota_count
from edc.quota import Budget
from edc.youtube import YouTube, YouTubeHTTPError


def video(vid, title, channel, seconds):
    return {"id": vid, "snippet": {"title": title, "channelTitle": channel},
            "contentDetails": {"duration": "PT%dM%dS" % divmod(seconds, 60)}}


def song(key, title, credits, seconds, act="artist:x", known=None):
    return d.Song(key, act, title, credits, seconds, known)


class ClassifyTests(unittest.TestCase):
    def test_topic_channel_with_matching_duration_is_matched(self):
        m = d.classify(song("spotify:1", "Titanium (feat. Sia)", ["David Guetta", "Sia"], 245), "David Guetta",
                       [video("v1", "Titanium (feat. Sia)", "David Guetta - Topic", 245)])
        self.assertEqual((m["status"], m["video_id"], m["issue"]), ("matched", "v1", None))

    def test_extended_version_is_doubtful_and_explained(self):
        m = d.classify(song("spotify:1", "Gravity", ["Martin Garrix"], 180), "Martin Garrix",
                       [video("v1", "Gravity (Extended Mix)", "Martin Garrix - Topic", 300)])
        self.assertEqual(m["status"], "doubtful")
        self.assertIn("different version", m["issue"])

    def test_namesake_upload_is_doubtful(self):
        m = d.classify(song("spotify:1", "Bonito", ["Dennis Cruz"], 195), "Dennis Cruz",
                       [video("v1", "Bonito", "Some Other Singer", 200)])
        self.assertEqual(m["status"], "doubtful")
        self.assertIn("not the artist", m["issue"])

    def test_label_upload_naming_the_artist_is_likely(self):
        m = d.classify(song("spotify:1", "Bonito", ["Dennis Cruz"], 195), "Dennis Cruz",
                       [video("v1", "Dennis Cruz - Bonito (Official Audio)", "Label Records", 196)])
        self.assertEqual(m["status"], "likely")
        self.assertTrue(m["issue"])

    def test_prefers_matched_over_likely_and_skips_dj_sets(self):
        m = d.classify(song("spotify:1", "Bonito", ["Dennis Cruz"], 195), "Dennis Cruz",
                       [video("set", "Dennis Cruz Bonito live set", "Dennis Cruz", 3600),
                        video("v1", "Dennis Cruz - Bonito", "Label Records", 196),
                        video("v2", "Bonito", "Dennis Cruz - Topic", 195)])
        self.assertEqual((m["status"], m["video_id"]), ("matched", "v2"))

    def test_no_title_match_is_unmatched(self):
        m = d.classify(song("spotify:1", "Bonito", ["Dennis Cruz"], 195), "Dennis Cruz",
                       [video("v1", "Something Else", "Dennis Cruz - Topic", 195)])
        self.assertEqual((m["status"], m["video_id"]), ("unmatched", None))


def acts_fixture():
    a = d.Act("artist:a", "Alpha", [song("spotify:a1", "One", ["Alpha"], 200, "artist:a"),
                                    song("spotify:a2", "Two", ["Alpha"], 200, "artist:a"),
                                    song("spotify:a3", "Three", ["Alpha"], 200, "artist:a")])
    b = d.Act("artist:b", "Beta", [song("youtube:BBBBBBBBBB1", "Known", ["Beta"], None, "artist:b", "BBBBBBBBBB1"),
                                   song("spotify:b2", "Four", ["Beta"], 200, "artist:b")])
    return [a, b]


def state_with(statuses):
    return {"searched_acts": ["artist:a", "artist:b"], "matches": {
        key + "@" + act: {"song_key": key, "act_id": act, "title": key, "status": status,
                          "video_id": None if status == "unmatched" else "V" + key[-2:].upper().rjust(10, "0"),
                          "issue": None}
        for key, act, status in statuses}}


class PublishListTests(unittest.TestCase):
    def test_breadth_first_with_backfill_reject_and_approve(self):
        acts = acts_fixture()
        state = state_with([("spotify:a1", "artist:a", "unmatched"), ("spotify:a2", "artist:a", "matched"),
                            ("spotify:a3", "artist:a", "doubtful"), ("spotify:b2", "artist:b", "likely")])
        desired = d.publish_list(acts, state, {}, per_act=2)
        # Round 1: Alpha's first playable song, then Beta's known video; round 2: Beta's likely match.
        self.assertEqual([x["song_key"] for x in desired], ["spotify:a2", "youtube:BBBBBBBBBB1", "spotify:b2"])
        desired = d.publish_list(acts, state, {"spotify:a3": "approve", "spotify:b2": "reject"}, per_act=2)
        self.assertEqual([x["song_key"] for x in desired], ["spotify:a2", "youtube:BBBBBBBBBB1", "spotify:a3"])

    def test_review_queue_lists_only_uncertain_with_defaults(self):
        state = state_with([("spotify:a1", "artist:a", "matched"), ("spotify:a2", "artist:a", "likely"),
                            ("spotify:a3", "artist:a", "doubtful")])
        queue = d.review_queue(state, {"spotify:a3": "approve"})
        self.assertEqual([(q["song_key"], q["default"], q["decision"]) for q in queue],
                         [("spotify:a2", "added", None), ("spotify:a3", "skipped", "approve")])

    def test_invalid_decision_is_rejected(self):
        import json, tempfile, pathlib
        with tempfile.TemporaryDirectory() as tmp:
            path = pathlib.Path(tmp) / "decisions.json"
            path.write_text(json.dumps({"decisions": {"spotify:a1": "maybe"}}))
            with self.assertRaises(ValueError):
                d.load_decisions(path)


class FakeYT(YouTube):
    def __init__(self, units=10000, results=None):
        super().__init__("token", Budget(remaining_general=units, remaining_search=100,
                                         maximum_general_per_run=units))
        self.results = results or {}
        self.playlist = None
        self.items = []
        self.sleeps = []
        self.calls = []

    def sleep(self, seconds):
        self.sleeps.append(seconds)

    def request(self, endpoint, params, *, method="GET", body=None):
        self.quota.spend(endpoint + {"POST": ".insert", "DELETE": ".delete"}.get(method, ".list"))
        self.calls.append((endpoint, method))
        if endpoint == "search":
            return {"items": [{"id": {"videoId": v["id"]}} for v in self.results.get(params["q"], [])]}
        if endpoint == "videos":
            wanted = params["id"].split(",")
            return {"items": [v for vs in self.results.values() for v in vs if v["id"] in wanted]}
        if endpoint == "playlists":
            if method == "POST":
                self.playlist = "PL1"
                return {"id": "PL1"}
            return {"items": [{"id": "PL1", "snippet": {"description": d.MARKER},
                               "status": {"privacyStatus": "private"}}] if self.playlist else []}
        if endpoint == "playlistItems":
            if method == "POST":
                self.items.append(("item%d" % len(self.calls), body["snippet"]["resourceId"]["videoId"]))
                return {}
            if method == "DELETE":
                self.items = [i for i in self.items if i[0] != params["id"]]
                return {}
            return {"items": [{"id": i, "snippet": {"position": n, "resourceId": {"videoId": v}}}
                              for n, (i, v) in enumerate(self.items)]}
        raise AssertionError(endpoint)


class MatchAndSyncTests(unittest.TestCase):
    def test_search_429_preserves_matches_and_still_publishes(self):
        acts = acts_fixture()
        yt = FakeYT(results={"Alpha": [video("VA00000001A", "One", "Alpha - Topic", 200)]})
        original = yt.request

        def request(endpoint, params, **kwargs):
            if endpoint == "search" and params["q"] == "Beta":
                yt.quota.spend("search.list")
                yt.calls.append((endpoint, "GET"))
                raise YouTubeHTTPError("search throttled", 429)
            return original(endpoint, params, **kwargs)
        yt.request = request
        state = {"searched_acts": [], "matches": {}}
        d.match_acts(yt, acts, state, per_act=3, max_searches=48, unit_budget=7900)
        self.assertEqual(state["searched_acts"], ["artist:a"])
        self.assertEqual((state["searches_last_run"], state["units_spent_last_run"]), (2, 1))
        self.assertIn("429", state["matching_paused"])
        result = d.sync_playlist(yt, d.publish_list(acts, state, {}, per_act=3), unit_budget=7899)
        self.assertEqual((result["added"], result["readback_verified"]), (2, True))
        self.assertEqual(yt.calls.count(("search", "GET")), 2)
        # Cached Alpha must not be searched again, even with zero searches allowed.
        d.match_acts(yt, acts, state, per_act=3, max_searches=0, unit_budget=1000)
        self.assertNotIn("matching_paused", state)
        self.assertEqual(state["searches_last_run"], 0)

    def test_other_search_errors_still_fail_closed(self):
        yt = FakeYT()
        def request(*args, **kwargs):
            raise YouTubeHTTPError("forbidden", 403)
        yt.request = request
        with self.assertRaises(YouTubeHTTPError):
            d.match_acts(yt, acts_fixture(), {"searched_acts": [], "matches": {}},
                         per_act=3, max_searches=1, unit_budget=1000)

    def test_match_respects_budget_and_resumes(self):
        acts = acts_fixture()
        yt = FakeYT(results={"Alpha": [video("VA00000001A", "One", "Alpha - Topic", 200)]})
        state = {"searched_acts": [], "matches": {}}
        d.match_acts(yt, acts, state, per_act=3, max_searches=0, unit_budget=1000)  # no searches left today
        self.assertEqual((state["searched_acts"], yt.calls), ([], []))
        d.match_acts(yt, acts, state, per_act=3, max_searches=1, unit_budget=1000)
        self.assertEqual(state["searched_acts"], ["artist:a"])
        self.assertEqual(state["matches"]["spotify:a1@artist:a"]["status"], "matched")
        d.match_acts(yt, acts, state, per_act=3, max_searches=5, unit_budget=1000)
        # Beta's first song is known; its second still needs a search.
        self.assertEqual(state["searched_acts"], ["artist:a", "artist:b"])
        # Beta's search found nothing, so no videos.list call was spent.
        self.assertEqual((state["searches_last_run"], state["units_spent_last_run"]), (1, 0))
        self.assertEqual((yt.quota.used_search, yt.quota.used_general), (2, 1))
        d.match_acts(yt, acts, state, per_act=3, max_searches=5, unit_budget=1000)
        self.assertEqual(state["searches_last_run"], 0)

    def test_sync_adds_within_budget_resumes_and_removes_rejected(self):
        desired = [{"video_id": v} for v in ("V1", "V2", "V3")]
        yt = FakeYT()
        first = d.sync_playlist(yt, desired, unit_budget=1 + 50 + 100)  # create + two inserts
        self.assertEqual((first["added"], first["still_to_add"], first["readback_verified"]), (2, 1, True))
        second = d.sync_playlist(yt, desired, unit_budget=1000)
        self.assertEqual((second["added"], second["count"]), (1, 3))
        third = d.sync_playlist(yt, [{"video_id": "V1"}, {"video_id": "V3"}], unit_budget=1000)
        self.assertEqual((third["removed"], [v for _, v in yt.items]), (1, ["V1", "V3"]))
        self.assertTrue(third["readback_verified"])

    def test_refuses_public_playlist(self):
        yt = FakeYT()
        yt.playlist = "PL1"
        original = yt.request

        def request(endpoint, params, *, method="GET", body=None):
            result = original(endpoint, params, method=method, body=body)
            if endpoint == "playlists" and method == "GET":
                result["items"][0]["status"]["privacyStatus"] = "public"
            return result
        yt.request = request
        with self.assertRaises(RuntimeError):
            d.sync_playlist(yt, [{"video_id": "V1"}], unit_budget=1000)


class RealDataTests(unittest.TestCase):
    def test_lineup_queues(self):
        acts = d.build_acts()
        ids = [a.act_id for a in acts]
        self.assertEqual(len(acts), 113)
        self.assertNotIn("artist:mc-dino", ids)
        self.assertEqual(len(ids), len(set(ids)))
        empty = sorted(a.act_id for a in acts if not a.songs)
        self.assertEqual(empty, ["artist:alves", "artist:fury", "artist:inbal", "artist:madvktm",
                                 "artist:matthias", "artist:skull-machine", "artist:ultrathem"])
        benda = next(a for a in acts if a.act_id == "artist:benda")
        self.assertEqual(benda.songs[0].known_video_id, "oXhWSs0mRH4")


if __name__ == "__main__":
    unittest.main()


class QuotaInputTests(unittest.TestCase):
    def test_accepts_console_thousands_separators(self):
        self.assertEqual(quota_count("8,978"), 8978)
        self.assertEqual(quota_count(" 10,000 "), 10000)
        self.assertEqual(quota_count("48"), 48)

    def test_rejects_non_numbers(self):
        for bad in ("", "abc", "8.978", "-"):
            with self.assertRaises(argparse.ArgumentTypeError):
                quota_count(bad)

