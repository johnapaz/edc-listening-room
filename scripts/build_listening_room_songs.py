"""Build curated songs from the approved preview and explicitly published source reviews.

Source review is separate from human playback. Unapproved candidates and private
discovery state are never exported. Run with --check to detect stale output.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "listening-room" / "songs.json"


def build():
    approved = json.loads((ROOT / "pilot" / "preview-approved.json").read_text(encoding="utf-8"))
    artists = json.loads((ROOT / "data" / "edco-2026" / "artists.json").read_text(encoding="utf-8"))["artists"]
    by_name = {a["display_name"].casefold(): a["artist_id"] for a in artists}
    active = {aid for p in json.loads((ROOT / "data/edco-2026/current-lineup.json").read_text())["performances"] for aid in p["artist_ids"]}
    songs = []
    for row in approved:
        if not (row.get("human_verified") and row.get("source_verified")):
            continue
        songs.append({
            "artist_id": by_name[row["artist"].casefold()],
            "artist_ids": [by_name[row["artist"].casefold()]],
            "title": row["title"],
            "video_id": row["video_id"],
            "url": "https://www.youtube.com/watch?v=" + row["video_id"],
            "review_status": row["review_status"],
            "version_note": row.get("version_note"),
            "verification": "owner_playback",
        })
    reviewed = json.loads((ROOT / "data/listening-room/import-review-2026-10-31.json").read_text(encoding="utf-8"))
    if reviewed.get("publication_authorization", {}).get("approved") is True:
        for row in reviewed["songs"]:
            if row.get("public_export_approved") is not True:
                continue
            ids = list(dict.fromkeys(row["artist_ids"]))
            video = row["video_id"]
            if (not ids or not set(ids) <= active or not re.fullmatch(r"[A-Za-z0-9_-]{11}", video)
                    or row.get("review_status") != "source_metadata_checked"
                    or row.get("url") != "https://www.youtube.com/watch?v=" + video
                    or row.get("artwork_url") != "https://img.youtube.com/vi/" + video + "/mqdefault.jpg"
                    or row.get("artwork_check", {}).get("http_status") != 200):
                raise ValueError("Invalid published source review: " + row.get("title", video))
            songs.append({
                "artist_id": ids[0], "artist_ids": ids, "title": row["title"],
                "video_id": video, "url": row["url"], "review_status": row["review_status"],
                "version_note": None, "verification": "source_reviewed",
            })
    if len({s["video_id"] for s in songs}) != len(songs):
        raise ValueError("Duplicate curated recording")
    return {
        "schema_version": 2,
        "source": "Approved preview plus owner-authorized source-reviewed links; playback states remain distinct.",
        "songs": songs,
    }


if __name__ == "__main__":
    text = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        sys.exit(0 if OUT.read_text(encoding="utf-8") == text else "songs.json is stale")
    OUT.write_text(text, encoding="utf-8")
