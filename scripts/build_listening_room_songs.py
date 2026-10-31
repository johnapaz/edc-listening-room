"""Derive the Listening Room curated-song file from the human-reviewed preview manifest.

Only rows from pilot/preview-approved.json (human_verified and source_verified) are
used. Discovery-playlist matches and Spotify candidates are deliberately excluded.
Run with --check to fail if the committed file is stale.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "listening-room" / "songs.json"


def build():
    approved = json.loads((ROOT / "pilot" / "preview-approved.json").read_text(encoding="utf-8"))
    artists = json.loads((ROOT / "data" / "edco-2026" / "artists.json").read_text(encoding="utf-8"))["artists"]
    by_name = {a["display_name"].casefold(): a["artist_id"] for a in artists}
    songs = []
    for row in approved:
        if not (row.get("human_verified") and row.get("source_verified")):
            continue
        songs.append({
            "artist_id": by_name[row["artist"].casefold()],
            "title": row["title"],
            "video_id": row["video_id"],
            "url": "https://www.youtube.com/watch?v=" + row["video_id"],
            "review_status": row["review_status"],
            "version_note": row.get("version_note"),
        })
    return {
        "schema_version": 1,
        "source": "pilot/preview-approved.json (human-reviewed; owner-confirmed playback of the private preview)",
        "songs": songs,
    }


if __name__ == "__main__":
    text = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        sys.exit(0 if OUT.read_text(encoding="utf-8") == text else "songs.json is stale")
    OUT.write_text(text, encoding="utf-8")
