"""Data-integrity and contract tests for the static Listening Room v0 app."""
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"


def read(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


class ListeningRoomData(unittest.TestCase):
    def test_public_lineup_matches_current_official_day_lists(self):
        snapshot = read("data/edco-2026/sources/lineup-text-2026-10-31.json")
        current = read("data/edco-2026/current-lineup.json")
        rows = current["performances"]
        self.assertEqual(current["checked_on"], "2026-10-31")
        self.assertEqual(len(rows), 130)
        self.assertEqual(len({r["performance_id"] for r in rows}), 130)
        for day, names in snapshot["by_day"].items():
            self.assertEqual([r["display_name"] for r in rows if r["day"] == day], names)
        self.assertNotIn("Prospa", [r["display_name"] for r in rows])
        self.assertEqual(sum(r["display_name"] == "Alves" for r in rows), 2)
        self.assertEqual(sum(r["display_name"] == "Me n ü" for r in rows), 2)
        self.assertEqual(sum(r["display_name"] == "RAJE" for r in rows), 2)
        prior = {r["performance_id"] for r in read("data/edco-2026/performances.json")["performances"]}
        for row in rows:
            if row["performance_id"] not in prior:
                self.assertIsNone(row["starts_at"])
                self.assertIsNone(row["stage_id"])

    def test_current_lineup_projection_is_reproducible(self):
        result = subprocess.run(["python3", str(ROOT / "scripts/build_current_lineup.py"), "--check"],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_songs_file_is_in_sync_with_reviewed_manifest(self):
        result = subprocess.run(["python3", str(ROOT / "scripts" / "build_listening_room_songs.py"), "--check"],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_songs_are_reviewed_exact_youtube_videos_for_lineup_artists(self):
        artists = {a["artist_id"] for a in read("data/edco-2026/artists.json")["artists"]}
        approved = {r["video_id"]: r for r in read("pilot/preview-approved.json")}
        source_doc = read("data/listening-room/import-review-2026-10-31.json")
        self.assertTrue(source_doc["publication_authorization"]["approved"])
        source_rows = {r["video_id"]: r for r in source_doc["songs"]}
        songs = read("data/listening-room/songs.json")["songs"]
        self.assertTrue(songs)
        seen = set()
        for s in songs:
            self.assertIn(s["artist_id"], artists)
            self.assertRegex(s["video_id"], r"^[A-Za-z0-9_-]{11}$")
            self.assertEqual(s["url"], "https://www.youtube.com/watch?v=" + s["video_id"])
            self.assertNotIn("search", s["url"])
            if s["video_id"] in approved:
                self.assertTrue(approved[s["video_id"]]["human_verified"])
                self.assertEqual(s["verification"], "owner_playback")
            else:
                source = source_rows[s["video_id"]]
                self.assertTrue(source["public_export_approved"])
                self.assertFalse(source["human_verified"])
                self.assertFalse(source["owner_playback_confirmed"])
                self.assertEqual(s["verification"], "source_reviewed")
                self.assertEqual(s["artist_ids"], source["artist_ids"])
                self.assertEqual(source["artwork_check"]["http_status"], 200)
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
        self.assertEqual(read("public-site/data/edco-2026/performances.json")["performances"][0]["display_name"], "2AR")
        self.assertEqual(len(read("public-site/data/edco-2026/performances.json")["performances"]), 130)
        app_html = (out / "listening-room/index.html").read_text()
        self.assertRegex(app_html, r'app\.js\?v=[a-f0-9]{12}')
        self.assertRegex(app_html, r'lib\.js\?v=[a-f0-9]{12}')
        self.assertRegex(app_html, r'styles\.css\?v=[a-f0-9]{12}')
        expected = {"listening-room/redirect.js", "index.html", "404.html", "_headers", "_redirects", "listening-room/index.html", "listening-room/app.js", "listening-room/lib.js", "listening-room/styles.css", "listening-room/fonts/bricolage-grotesque-latin-800.woff2", "data/edco-2026/artists.json", "data/edco-2026/performances.json", "data/edco-2026/venues.json", "data/edco-2026/event.json", "data/listening-room/songs.json", "data/listening-room/playlist.json"}
        # About & Help (scripts/build_about.py): pages, assets and screenshots enumerated from their sources.
        src = ROOT / "about-site"
        slugs = [re.search(r"^slug:(.*)$", p.read_text(encoding="utf-8"), re.M).group(1).strip() for p in (src / "pages").glob("*.html")]
        expected |= {f"about/{s}/index.html" if s else "about/index.html" for s in slugs}
        expected |= {"about/search.json", "about/assets/about.css", "about/assets/about.js", "about/img/john-paz.webp"}
        shots = json.loads((src / "img" / "shots.json").read_text())
        sys.path.insert(0, str(ROOT / "scripts"))
        import build_about
        if shots.get("_app") == build_about.app_fingerprint():  # screenshots ship only while they match the app
            expected |= {"about/img/" + m["file"] for k, m in shots.items() if not k.startswith("_")}
        expected |= {"favicon.svg", "apple-touch-icon.png", "og.png"}
        self.assertEqual({str(p.relative_to(out)) for p in out.rglob("*") if p.is_file()}, expected)
        # The first About page lived at /listening-room/about.html; keep old shared links working.
        self.assertIn("/listening-room/about.html /about/ 301", (out / "_redirects").read_text())
        self.assertIn("/listening-room/about /about/ 301", (out / "_redirects").read_text())
        for path in out.rglob("*.json"):
            text = path.read_text()
            self.assertNotIn("notion", text.lower())
            self.assertNotIn("identity_evidence_ref", text)


if __name__ == "__main__":
    unittest.main()
