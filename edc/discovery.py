"""Private all-artist discovery playlist: match captured songs, then publish breadth-first.

Inputs are committed files: the lineup reference, the captured song candidates
(data/edco-2026/discovery-candidates.json), the approved preview videos and an
optional owner decisions file. Matching spends one search per act (this project
has a separate limit of 100 searches/day) plus one videos.list (1 general unit)
and matches that act's songs locally. Publishing
adds round 1 (one song per act) for every act before round 2, and so on.

Owner review never blocks anything: confident matches are added, uncertain ones
are queued with a short reason. "approve" adds a doubtful match, "reject"
excludes a song and removes it from the playlist if it was already added.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "edco-2026"
MATCHES_FILE = DATA / "youtube-matches.json"
DECISIONS_FILE = DATA / "match-decisions.json"

MARKER = "edc-listening-room:discovery-v1"
TITLE = "EDC Orlando 2026 — All artists (private, unranked, unofficial)"
VIDEOS_LIST_COST = 1
WRITE_COST = 50
RESERVE = 100           # left unspent for listing/read-back reads
MAX_VIDEO_SECONDS = 12 * 60  # longer uploads are treated as DJ sets, never songs
DEFAULT_INCLUDED = ("matched", "likely")
# Not songs from this act's own catalog: MC-only credit and a program slot.
NON_CATALOG_ARTISTS = {"artist:mc-dino"}

_VERSION_WORDS = {"extended", "remix", "vip", "edit", "live", "mix", "instrumental", "acoustic",
                  "sped", "slowed", "bootleg", "rework", "flip", "dub", "remastered", "cover"}
_NOISE_WORDS = {"official", "video", "audio", "lyric", "lyrics", "visualizer", "visualiser",
                "music", "hd", "hq", "4k", "out", "now", "premiere", "clip"}
_FEAT = re.compile(r"[\(\[]\s*(feat|ft|featuring|with)\b[^\)\]]*[\)\]]|\b(feat|ft|featuring)\b.*$", re.I)


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode().lower()
    text = text.replace("&", " and ")
    text = re.sub(r"[’'`]", "", text)
    text = re.sub(r"original mix", " ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def title_tokens(title: str) -> set[str]:
    return set(norm(_FEAT.sub(" ", title)).split())


def channel_name(channel: str) -> str:
    return norm(re.sub(r"\s*-\s*topic$", "", channel, flags=re.I).replace("VEVO", ""))


def iso_seconds(duration: str) -> int:
    m = re.fullmatch(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration or "")
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return ((d * 24 + h) * 60 + mi) * 60 + s


def load(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _rows(data: Any) -> list:
    return data if isinstance(data, list) else next(v for v in data.values() if isinstance(v, list))


@dataclass
class Song:
    key: str                    # "spotify:<id>" or "youtube:<video id>"
    act_id: str
    title: str
    credits: list[str]
    duration_s: int | None
    known_video_id: str | None = None


@dataclass
class Act:
    act_id: str
    name: str
    songs: list[Song] = field(default_factory=list)


def build_acts(root: Path = ROOT) -> list[Act]:
    """Acts in lineup order with their ordered, de-duplicated song queues."""
    data = root / "data" / "edco-2026"
    artists = {a["artist_id"]: a for a in _rows(load(data / "artists.json"))}
    performances = _rows(load(data / "performances.json"))
    order: list[str] = []
    for p in sorted(performances, key=lambda p: (p["event_date"], p["source_order"])):
        for credit in p.get("credits", []):
            aid = credit["artist_id"]
            if credit.get("role") == "mc" or aid in NON_CATALOG_ARTISTS or aid in order:
                continue
            order.append(aid)
    acts = {aid: Act(aid, artists[aid]["display_name"]) for aid in order}
    name_to_id = {a.name: a.act_id for a in acts.values()}

    for row in load(root / "pilot" / "preview-approved.json"):
        aid = name_to_id.get(row["artist"])
        if aid:
            acts[aid].songs.append(Song("youtube:" + row["video_id"], aid, row["title"], [row["artist"]],
                                        None, row["video_id"]))

    # Pilot source-listed candidates (no Spotify ID) come before newer captures.
    for row in _rows(load(root / "pilot" / "recording-candidates.json")):
        aid = name_to_id.get(row["pilot_artist"])
        if aid:
            acts[aid].songs.append(Song(row["candidate_id"], aid, row["title"], [row["pilot_artist"]], None))

    candidates = load(data / "discovery-candidates.json")["rows"]
    candidates.sort(key=lambda r: (r["discovery_pass"] or 0, r["batch"] != "2026-10-30-official-playlist",
                                   r["title"]))
    for r in candidates:
        for aid in r["lineup_artist_ids"]:
            if aid in acts:
                acts[aid].songs.append(Song("spotify:" + r["spotify_track_id"], aid, r["title"],
                                            [c.strip() for c in r["spotify_artist_credit"].split(",")],
                                            round(r["duration_ms"] / 1000) if r["duration_ms"] else None))
    for act in acts.values():
        seen: set[str] = set()
        unique = []
        for song in act.songs:
            core = " ".join(sorted(title_tokens(song.title)))
            if core not in seen:
                seen.add(core)
                unique.append(song)
        act.songs = unique
    return list(acts.values())


def classify(song: Song, act_name: str, videos: list[dict]) -> dict:
    """Pick the best video for a song from one act's search results and explain any doubt."""
    want = title_tokens(song.title) - _NOISE_WORDS
    artist_names = {norm(n) for n in song.credits + [act_name] if n}
    best: tuple | None = None
    for v in videos:
        seconds = iso_seconds(v.get("contentDetails", {}).get("duration", ""))
        if not seconds or seconds > MAX_VIDEO_SECONDS:
            continue
        snippet = v.get("snippet", {})
        have = set(norm(snippet.get("title", "")).split())
        if not want or not want <= have:
            continue
        channel = snippet.get("channelTitle", "")
        topic = channel.lower().endswith(" - topic")
        artist_channel = channel_name(channel) in artist_names
        artist_in_title = any(n and n in norm(snippet.get("title", "")) for n in artist_names)
        extra_versions = (have & _VERSION_WORDS) - want
        diff = abs(seconds - song.duration_s) if song.duration_s else None
        issues = []
        if extra_versions:
            issues.append("video looks like a different version (" + ", ".join(sorted(extra_versions)) + ")")
        if diff is not None and diff > 10:
            issues.append("duration differs by %d s" % diff)
        if not (artist_channel or artist_in_title):
            issues.append("uploaded by '%s', not the artist" % channel)
        if not issues and artist_channel and (diff is None or diff <= 3):
            status = "matched"
        elif not extra_versions and (diff is None or diff <= 10 or artist_channel) and \
                (artist_channel or artist_in_title):
            status = "likely"
            if not issues:
                issues.append("not an official artist/Topic channel" if not artist_channel
                              else "duration differs by %d s" % diff)
        else:
            status = "doubtful"
        rank = (DEFAULT_INCLUDED.index(status) if status in DEFAULT_INCLUDED else 2,
                0 if topic else 1, diff if diff is not None else 99)
        if best is None or rank < best[0]:
            best = (rank, status, v["id"], snippet.get("title", ""), channel, seconds, "; ".join(issues))
    record = {"song_key": song.key, "act_id": song.act_id, "title": song.title,
              "credits": song.credits, "spotify_duration_s": song.duration_s}
    if best is None:
        record.update(status="unmatched", video_id=None,
                      issue="no search result for this artist had this title")
    else:
        _, status, vid, vtitle, channel, seconds, issue = best
        record.update(status=status, video_id=vid, video_title=vtitle, channel=channel,
                      video_duration_s=seconds, issue=issue or None)
    return record


def load_matches(path: Path = MATCHES_FILE) -> dict:
    if path.exists():
        return load(path)
    return {"schema_version": 1, "searched_acts": [], "matches": {}}


def load_decisions(path: Path = DECISIONS_FILE) -> dict[str, str]:
    if not path.exists():
        return {}
    decisions = load(path).get("decisions", {})
    bad = {k: v for k, v in decisions.items() if v not in ("approve", "reject")}
    if bad:
        raise ValueError("Decisions must be 'approve' or 'reject': " + ", ".join(sorted(bad)))
    return decisions


def match_acts(yt, acts: list[Act], state: dict, *, per_act: int, max_searches: int, unit_budget: int) -> dict:
    """Search acts not yet searched, in lineup order, within today's search count and units."""
    searches = spent = 0
    for act in acts:
        if act.act_id in state["searched_acts"]:
            continue
        pending = [s for s in act.songs[:per_act] if s.known_video_id is None]
        if not pending:
            continue
        if searches >= max_searches or spent + VIDEOS_LIST_COST > unit_budget:
            break
        found = yt.request("search", {"part": "snippet", "q": act.name, "type": "video", "maxResults": 50})
        ids = [i["id"]["videoId"] for i in found.get("items", []) if i.get("id", {}).get("videoId")]
        videos = []
        if ids:
            videos = yt.request("videos", {"part": "snippet,contentDetails", "id": ",".join(ids)}).get("items", [])
            spent += VIDEOS_LIST_COST
        searches += 1
        # Match every captured song now so deeper rounds need no further search.
        for song in act.songs:
            if song.known_video_id is None:
                state["matches"][song.key + "@" + act.act_id] = classify(song, act.name, videos)
        state["searched_acts"].append(act.act_id)
    state["units_spent_last_run"] = spent
    state["searches_last_run"] = searches
    return state


def publish_list(acts: list[Act], state: dict, decisions: dict[str, str], *, per_act: int) -> list[dict]:
    """Breadth-first desired playlist: round 1 for every act, then round 2, ..."""
    queues = []
    for act in acts:
        chosen = []
        for song in act.songs:
            if len(chosen) >= per_act:
                break
            if decisions.get(song.key) == "reject":
                continue
            if song.known_video_id:
                chosen.append({"video_id": song.known_video_id, "song_key": song.key, "act_id": act.act_id,
                               "title": song.title, "status": "preview-approved"})
                continue
            m = state["matches"].get(song.key + "@" + act.act_id)
            if not m or not m.get("video_id"):
                continue
            if m["status"] in DEFAULT_INCLUDED or decisions.get(song.key) == "approve":
                chosen.append({"video_id": m["video_id"], "song_key": song.key, "act_id": act.act_id,
                               "title": song.title, "status": m["status"]})
        queues.append(chosen)
    desired, seen = [], set()
    for r in range(per_act):
        for chosen in queues:
            if r < len(chosen) and chosen[r]["video_id"] not in seen:
                seen.add(chosen[r]["video_id"])
                desired.append(chosen[r])
    return desired


def review_queue(state: dict, decisions: dict[str, str]) -> list[dict]:
    """Everything not confidently matched, with its reason and the current default."""
    rows = []
    for m in state["matches"].values():
        if m["status"] == "matched":
            continue
        default = "added" if m["status"] in DEFAULT_INCLUDED else "skipped"
        rows.append({**m, "default": default, "decision": decisions.get(m["song_key"])})
    return sorted(rows, key=lambda m: (["likely", "doubtful", "unmatched"].index(m["status"]), m["act_id"]))


def sync_playlist(yt, desired: list[dict], *, unit_budget: int, sleep=None) -> dict:
    """Make the private playlist contain the desired videos: remove rejected, append missing.

    Writes stop when the unit budget runs out; the next run continues. Existing
    order is preserved, so this is safe to rerun.
    """
    playlists = yt.my_pilot_playlists(MARKER)
    if len(playlists) > 1:
        raise RuntimeError("Multiple discovery playlists; manual reconciliation required")
    spent = 1
    if playlists:
        playlist_id = playlists[0]["id"]
        if playlists[0].get("status", {}).get("privacyStatus") != "private":
            raise RuntimeError("Discovery playlist is not private: refusing to modify it")
        entries = yt.stable_playlist_entries(playlist_id)
    else:
        if unit_budget < WRITE_COST * 2:
            return {"status": "insufficient_quota", "units_spent": spent}
        created = yt.request("playlists", {"part": "snippet,status"}, method="POST", body={
            "snippet": {"title": TITLE,
                        "description": MARKER + " | Experimental playlist; unofficial festival guide"},
            "status": {"privacyStatus": "private"}})
        playlist_id, entries, spent = created["id"], [], spent + WRITE_COST
    wanted = {d["video_id"] for d in desired}
    removed = added = 0
    kept = []
    for item_id, video_id in entries:
        if video_id in wanted and video_id not in kept:
            kept.append(video_id)
        elif spent + WRITE_COST <= unit_budget:
            yt.retry_not_found(lambda: yt.request("playlistItems", {"id": item_id}, method="DELETE"))
            spent += WRITE_COST
            removed += 1
        else:
            kept.append(video_id)
    expected = list(kept)
    for d in desired:
        if d["video_id"] in expected:
            continue
        if spent + WRITE_COST > unit_budget:
            break
        yt.retry_not_found(lambda: yt.request("playlistItems", {"part": "snippet"}, method="POST", body={
            "snippet": {"playlistId": playlist_id,
                        "resourceId": {"kind": "youtube#video", "videoId": d["video_id"]}}}))
        spent += WRITE_COST
        added += 1
        expected.append(d["video_id"])
    readback = yt.settled_readback(playlist_id, expected)
    remaining = sum(1 for d in desired if d["video_id"] not in expected)
    return {"playlist_id": playlist_id,
            "youtube_music_url": "https://music.youtube.com/playlist?list=" + playlist_id,
            "visibility": "private", "readback_verified": readback == expected,
            "count": len(expected), "added": added, "removed": removed,
            "still_to_add": remaining, "units_spent": spent}
