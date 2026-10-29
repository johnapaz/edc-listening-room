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

if __name__ == "__main__":
    unittest.main()
