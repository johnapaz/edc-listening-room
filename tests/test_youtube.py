import unittest
from edc.youtube import YouTube, validated_manifest
from edc.quota import Budget

def track(i):
    return {
        "recording_id": str(i), "title": "Song " + str(i),
        "artist": "Pilot Artist", "video_id": "A" * 10 + str(i),
        "human_verified": True,
    }

class FakeYouTube(YouTube):
    def __init__(self, present=False):
        super().__init__("test-token", Budget(remaining_general=1000))
        self.present = present
        self.remote = []
        self.calls = []
        self.sleeps = []

    def sleep(self, seconds):
        self.sleeps.append(seconds)

    def request(self, endpoint, params, *, method="GET", body=None):
        self.quota.spend(endpoint + (".insert" if method == "POST" else ".list"))
        self.calls.append((endpoint, method))
        if endpoint == "playlists":
            if method == "POST":
                self.present = True
                return {"id": "pilot123"}
            return {"items": [
                {"id": "pilot123", "snippet": {"description": "edc-listening-room:pilot-m1-v1"},
                 "status": {"privacyStatus": "private"}}] if self.present else []}
        if endpoint == "playlistItems":
            if method == "POST":
                self.remote.append(body["snippet"]["resourceId"]["videoId"])
                return {"id": "item" + str(len(self.remote))}
            return {"items": [
                {"snippet": {"position": i, "resourceId": {"videoId": v}}}
                for i, v in enumerate(self.remote)]}
        raise AssertionError("Unexpected operation")

class YouTubeTests(unittest.TestCase):
    def test_unreviewed_and_duplicate_ids_rejected(self):
        bad = track(1)
        bad["human_verified"] = False
        with self.assertRaises(ValueError):
            validated_manifest([bad])
        with self.assertRaises(ValueError):
            validated_manifest([track(1), track(1)])

    def test_writes_are_closed_by_default(self):
        import os, unittest.mock
        closed = {k: v for k, v in os.environ.items() if k not in ("EDC_ENABLE_WRITES", "EDC_PILOT_APPROVED")}
        with unittest.mock.patch.dict("os.environ", closed, clear=True):
            c = FakeYouTube()
            with self.assertRaises(RuntimeError):
                c.publish_private_pilot([track(1)])
        self.assertEqual(c.calls, [])

    def test_private_publish_then_resume_without_duplicates(self):
        import unittest.mock
        with unittest.mock.patch.dict("os.environ", {
            "EDC_ENABLE_WRITES": "1", "EDC_PILOT_APPROVED": "1"
        }):
            c = FakeYouTube()
            result = c.publish_private_pilot([track(1), track(2)])
            self.assertTrue(result["readback_verified"])
            self.assertFalse(result["playback_verified"])
            self.assertEqual(result["visibility"], "private")
            self.assertEqual(c.remote, [track(1)["video_id"], track(2)["video_id"]])
            c.publish_private_pilot([track(1), track(2)])
            self.assertEqual(len(c.remote), 2)

    def test_prefix_mismatch_blocks_new_writes(self):
        import unittest.mock
        with unittest.mock.patch.dict("os.environ", {
            "EDC_ENABLE_WRITES": "1", "EDC_PILOT_APPROVED": "1"
        }):
            c = FakeYouTube(present=True)
            c.remote = ["Z" * 11]
            with self.assertRaises(RuntimeError):
                c.publish_private_pilot([track(1)])
            self.assertEqual(c.remote, ["Z" * 11])

def preview_track(i, **kw):
    row = track(i)
    row.pop("recording_id")
    row.update({"source_ref": {"namespace": "youtube-video", "id": row["video_id"]},
                "source_verified": True, "version_note": "official video edit"})
    row.update(kw)
    return row

class PreviewContractTests(unittest.TestCase):
    def test_preview_accepts_source_ref_without_mbid_but_m1_does_not(self):
        validated_manifest([preview_track(1)], preview=True)
        with self.assertRaises(ValueError):
            validated_manifest([preview_track(1)])

    def test_preview_rejects_fake_ids_rank_and_missing_gates(self):
        for bad in (preview_track(1, recording_id="N L Z"), preview_track(1, rank=1),
                    preview_track(1, source_verified=False), preview_track(1, version_note=""),
                    preview_track(1, human_verified=False),
                    preview_track(1, source_ref={"namespace": "youtube-video", "id": "B" * 11})):
            with self.assertRaises(ValueError):
                validated_manifest([bad], preview=True)

    def test_preview_uses_separate_private_playlist(self):
        import unittest.mock
        with unittest.mock.patch.dict("os.environ", {
            "EDC_ENABLE_WRITES": "1", "EDC_PILOT_APPROVED": "1"
        }):
            c = FakeYouTube()
            c.my_pilot_playlists = lambda marker="": (
                self.assertEqual(marker, "edc-listening-room:preview-v1") or [])
            result = c.publish_private_pilot([preview_track(1), preview_track(2)], preview=True)
            self.assertTrue(result["readback_verified"])
            self.assertEqual(result["visibility"], "private")

if __name__ == "__main__":
    unittest.main()

class CommittedPreviewManifestTests(unittest.TestCase):
    def test_approved_manifest_is_gated_subset_of_review_list(self):
        import json
        from pathlib import Path
        root = Path(__file__).resolve().parent.parent / "pilot"
        approved = json.loads((root / "preview-approved.json").read_text(encoding="utf-8"))
        review = {r["video_id"]: r for r in json.loads((root / "preview-tracks.json").read_text(encoding="utf-8"))}
        validated_manifest(approved, preview=True)
        for row in approved:
            self.assertEqual(row, review[row["video_id"]])
        held = [v for v, r in review.items() if not (r["source_verified"] and r["human_verified"])]
        self.assertFalse(set(held) & {r["video_id"] for r in approved})
        # Rows held back may only be appended later, so the manifest stays an exact prefix.
        order = list(review)
        self.assertEqual([r["video_id"] for r in approved], order[:len(approved)])

class NewPlaylistPropagationTests(unittest.TestCase):
    """A just-created playlist can answer 404 to playlistItems for a short time."""

    def fake(self, not_found, code=404):
        from edc.youtube import YouTubeHTTPError
        c = FakeYouTube()
        c.sleeps = []
        c.sleep = c.sleeps.append
        base = c.request

        def request(endpoint, params, *, method="GET", body=None):
            if endpoint == "playlistItems" and c.pending[0] > 0:
                c.pending[0] -= 1
                c.quota.spend(endpoint + (".insert" if method == "POST" else ".list"))
                raise YouTubeHTTPError("failed", code)
            return base(endpoint, params, method=method, body=body)
        c.pending = [not_found]
        c.request = request
        return c

    def publish(self, c, rows):
        import unittest.mock
        with unittest.mock.patch.dict("os.environ", {"EDC_ENABLE_WRITES": "1", "EDC_PILOT_APPROVED": "1"}):
            return c.publish_private_pilot(rows)

    def test_new_playlist_is_not_listed_and_transient_404_is_retried(self):
        c = self.fake(not_found=2)
        result = self.publish(c, [track(1), track(2)])
        self.assertTrue(result["readback_verified"])
        self.assertEqual(c.remote, [track(1)["video_id"], track(2)["video_id"]])
        self.assertEqual(c.sleeps, [2, 4])
        self.assertNotIn(("playlistItems", "GET"), c.calls[:2])

    def test_persistent_404_stops_after_bounded_retries(self):
        c = self.fake(not_found=99)
        with self.assertRaises(RuntimeError):
            self.publish(c, [track(1)])
        self.assertEqual(c.remote, [])
        self.assertEqual(c.sleeps, [2, 4, 8, 16])

    def test_other_errors_are_not_retried(self):
        c = self.fake(not_found=1, code=500)
        with self.assertRaises(RuntimeError):
            self.publish(c, [track(1)])
        self.assertEqual(c.sleeps, [])


class ListingLagTests(unittest.TestCase):
    """playlistItems.list can lag behind inserts; a stale listing must never cause duplicates."""

    def lagging(self, stale_reads):
        c = FakeYouTube()
        base = c.request
        c.stale = [stale_reads]

        def request(endpoint, params, *, method="GET", body=None):
            result = base(endpoint, params, method=method, body=body)
            if endpoint == "playlistItems" and method == "GET" and c.stale[0] > 0:
                c.stale[0] -= 1
                result = {"items": result["items"][:-1]}
            return result
        c.request = request
        return c

    def publish(self, c, rows):
        import io, contextlib, unittest.mock
        with unittest.mock.patch.dict("os.environ", {"EDC_ENABLE_WRITES": "1", "EDC_PILOT_APPROVED": "1"}), \
                contextlib.redirect_stdout(io.StringIO()) as out:
            try:
                return c.publish_private_pilot(rows), out.getvalue()
            finally:
                c.log = out.getvalue()

    def test_lagging_readback_is_retried_until_complete(self):
        c = self.lagging(stale_reads=2)
        result, log = self.publish(c, [track(1), track(2), track(3)])
        self.assertTrue(result["readback_verified"])
        self.assertEqual(c.sleeps, [5, 10])
        self.assertIn("Read-back not yet complete", log)

    def test_persistent_readback_mismatch_fails_with_diagnostic(self):
        c = self.lagging(stale_reads=99)
        with self.assertRaises(RuntimeError):
            self.publish(c, [track(1), track(2)])
        self.assertIn("expected 2 items, found 1", c.log)

    def test_resume_waits_for_stable_listing_and_never_duplicates(self):
        c = self.lagging(stale_reads=1)
        c.present = True
        c.remote = [track(1)["video_id"], track(2)["video_id"]]
        result, log = self.publish(c, [track(1), track(2), track(3)])
        self.assertTrue(result["readback_verified"])
        self.assertEqual(c.remote, [track(i)["video_id"] for i in (1, 2, 3)])
        self.assertIn("found with 2 items", log)

    def test_resume_refuses_when_listing_never_settles(self):
        c = FakeYouTube(present=True)
        c.remote = [track(1)["video_id"]]
        reads = iter(range(100))
        base = c.request

        def request(endpoint, params, *, method="GET", body=None):
            result = base(endpoint, params, method=method, body=body)
            if endpoint == "playlistItems" and method == "GET" and next(reads) % 2:
                result = {"items": []}
            return result
        c.request = request
        with self.assertRaises(RuntimeError):
            self.publish(c, [track(1), track(2)])
        self.assertEqual(c.remote, [track(1)["video_id"]])
