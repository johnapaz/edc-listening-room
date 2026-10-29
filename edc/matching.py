"""Generate reviewable YouTube candidates; never silently certify a match."""
from __future__ import annotations
from difflib import SequenceMatcher
import re
from typing import Any

from .youtube import YouTube

def _normalized(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))

def similarity(artist: str, title: str, candidate_title: str, channel: str) -> float:
    title_norm = _normalized(title)
    candidate_norm = _normalized(candidate_title)
    artist_norm = _normalized(artist)
    if not title_norm or not candidate_norm:
        return 0.0
    title_match = SequenceMatcher(None, title_norm, candidate_norm).ratio()
    token_title = set(title_norm.split())
    token_candidate = set(candidate_norm.split())
    coverage = len(token_title & token_candidate) / max(len(token_title), 1)
    artist_seen = artist_norm in _normalized(candidate_title + " " + channel)
    return round(min(1.0, 0.45 * title_match + 0.4 * coverage + 0.15 * artist_seen), 3)

def search_suggestions(yt: YouTube, tracks: list[dict[str, Any]]) -> list[dict]:
    if not 1 <= len(tracks) <= 16:
        raise ValueError("Matching is limited to 1–16 pilot tracks")
    output = []
    for track in tracks:
        if not all(track.get(k) for k in ("recording_id", "title", "artist")):
            raise ValueError("Every candidate needs recording_id, title, and artist")
        data = yt.request("search", {
            "part": "snippet", "q": track["artist"] + " " + track["title"] + " official audio",
            "type": "video", "maxResults": 5, "order": "relevance"
        })
        candidates = []
        for item in data.get("items", []):
            video_id = item.get("id", {}).get("videoId", "")
            if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
                continue
            snippet = item.get("snippet", {})
            title, channel = snippet.get("title", ""), snippet.get("channelTitle", "")
            candidates.append({
                "video_id": video_id, "youtube_title": title, "channel": channel,
                "estimated_text_similarity": similarity(track["artist"], track["title"], title, channel),
                "url": "https://www.youtube.com/watch?v=" + video_id,
                "music_url": "https://music.youtube.com/watch?v=" + video_id,
                "status": "review_required"
            })
        candidates.sort(key=lambda x: (-x["estimated_text_similarity"], x["video_id"]))
        output.append({**track, "suggestions": candidates, "human_verified": False})
    return output
