"""Data-integrity and contract tests for the static Listening Room v0 app."""
import json
import re
import shutil
import subprocess
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


class ListeningRoomData(unittest.TestCase):
    def test_songs_file_is_in_sync_with_reviewed_manifest(self):
        result = subprocess.run(["python3", str(ROOT / "scripts" / "build_listening_room_songs.py"), "--check"],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_songs_are_reviewed_exact_youtube_videos_for_lineup_artists(self):
        artists = {a["artist_id"] for a in read("data/edco-2026/artists.json")["artists"]}
        approved = {r["video_id"]: r for r in read("pilot/preview-approved.json")}
        songs = read("data/listening-room/songs.json")["songs"]
        self.assertTrue(songs)
        seen = set()
        for s in songs:
            self.assertIn(s["artist_id"], artists)
            self.assertRegex(s["video_id"], r"^[A-Za-z0-9_-]{11}$")
            self.assertEqual(s["url"], "https://www.youtube.com/watch?v=" + s["video_id"])
            self.assertNotIn("search", s["url"])
            self.assertTrue(approved[s["video_id"]]["human_verified"])
            self.assertNotIn(s["video_id"], seen)
            seen.add(s["video_id"])
            self.assertNotIn("spotify", json.dumps(s).lower())

    def test_playlist_is_not_claimed_available_without_verification(self):
        pl = read("data/listening-room/playlist.json")
        if pl["status"] == "published":
            self.assertTrue(pl["verified_cross_account"])
            self.assertRegex(pl["url"], r"^https://(www|music)\.youtube\.com/playlist\?list=")
        else:
            self.assertIsNone(pl["url"])

    def test_lineup_preserves_poster_and_prior_entries_without_inventing_schedule(self):
        rows = read("data/edco-2026/performances.json")["performances"]
        for day in ("2026-11-06", "2026-11-07", "2026-11-08"):
            self.assertEqual(sum(r["event_date"] == day for r in rows), 36 if day == "2026-11-08" else 37)
        for r in rows:
            if r["schedule_status"] != "verified":
                self.assertTrue(r["stage_id"] is None or r["schedule_status"] == "poster_transcribed")

    def test_b2b_billings_are_intact_and_reference_both_artists(self):
        rows = [r for r in read("data/edco-2026/performances.json")["performances"] if " B2B " in r["display_name"]]
        self.assertTrue(rows)
        for r in rows:
            self.assertGreaterEqual(len(r["artist_ids"]), 2, r["display_name"])


class AppContract(unittest.TestCase):
    def test_static_entrypoint_has_no_external_scripts_or_unsafe_code(self):
        html = (ROOT / "listening-room" / "index.html").read_text(encoding="utf-8")
        for src in re.findall(r'src="([^"]+)"', html):
            self.assertFalse(src.startswith("http"), src)
        js = (ROOT / "listening-room" / "app.js").read_text(encoding="utf-8")
        self.assertNotIn("innerHTML", js)
        self.assertNotIn("eval(", js)
        self.assertNotIn("youtube.com/results", js)
        for banned in ("Generate", "Shuffle", "Save to YouTube", "Now playing"):
            self.assertNotIn(banned, html + js)
        self.assertIn("Not affiliated", html)

    @unittest.skipUnless(shutil.which("node"), "node not installed")
    def test_node_logic_suite(self):
        result = subprocess.run(["node", "--test", str(ROOT / "tests" / "listening_room.test.js")],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

class PublicBuild(unittest.TestCase):
    def test_public_artifact_excludes_private_sources_and_metadata(self):
        result = subprocess.run(["python3", str(ROOT / "scripts/build_public_site.py")], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        out = ROOT / "public-site"
        expected = {"index.html", "404.html", "_headers", "_redirects", "listening-room/index.html", "listening-room/app.js", "listening-room/lib.js", "listening-room/styles.css", "data/edco-2026/artists.json", "data/edco-2026/performances.json", "data/edco-2026/venues.json", "data/edco-2026/event.json", "data/listening-room/songs.json", "data/listening-room/playlist.json"}
        self.assertEqual({str(p.relative_to(out)) for p in out.rglob("*") if p.is_file()}, expected)
        for path in out.rglob("*.json"):
            text = path.read_text()
            self.assertNotIn("notion", text.lower())
            self.assertNotIn("identity_evidence_ref", text)


if __name__ == "__main__":
    unittest.main()
