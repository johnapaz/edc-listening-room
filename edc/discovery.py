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
from .youtube import YouTubeHTTPError

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


def atomic_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    temporary.replace(path)


def match_acts(yt, acts: list[Act], state: dict, *, per_act: int, max_searches: int,
               unit_budget: int, checkpoint=lambda: None) -> dict:
    """Checkpoint search IDs before metadata reads; never repeat a saved search."""
    start_general, start_search = yt.quota.used_general, yt.quota.used_search
    state.pop("matching_paused", None)
    state.pop("last_provider_error", None)
    pending_ids = state.setdefault("pending_search_results", {})
    try:
        for act in acts:
            if act.act_id in state["searched_acts"] or not any(
                    s.known_video_id is None for s in act.songs):
                continue
            if yt.quota.used_general - start_general + 1 > unit_budget:
                break
            if act.act_id not in pending_ids:
                if yt.quota.used_search - start_search >= max_searches:
                    break
                if yt.quota.used_search > start_search:
                    yt.sleep(2)  # conservative pacing, not a claimed cure for unknown 429s
                found = None
                for attempt in range(3):
                    try:
                        found = yt.request("search", {"part": "snippet", "q": act.name,
                                                    "type": "video", "maxResults": 50})
                        break
                    except YouTubeHTTPError as exc:
                        state["last_provider_error"] = exc.diagnostic()
                        checkpoint()
                        if exc.code != 429:
                            raise
                        # Only an explicit transient reason permits bounded read retries.
                        if (exc.reason in {"rateLimitExceeded", "userRateLimitExceeded"}
                                and attempt < 2 and yt.quota.remaining_search > 0
                                and yt.quota.used_search - start_search < max_searches):
                            yt.sleep((15, 30)[attempt])
                            continue
                        state["matching_paused"] = "search.list HTTP 429; retry allowance exhausted or reason unknown"
                        break
                if found is None:
                    break
                pending_ids[act.act_id] = [i["id"]["videoId"] for i in found.get("items", [])
                                          if i.get("id", {}).get("videoId")]
                checkpoint()
            ids = pending_ids[act.act_id]
            videos = yt.request("videos", {"part": "snippet,contentDetails", "id": ",".join(ids)}).get(
                "items", []) if ids else []
            for song in act.songs:
                if song.known_video_id is None:
                    state["matches"][song.key + "@" + act.act_id] = classify(song, act.name, videos)
            state["searched_acts"].append(act.act_id)
            del pending_ids[act.act_id]
            checkpoint()
    finally:
        state["units_spent_last_run"] = yt.quota.used_general - start_general
        state["searches_last_run"] = yt.quota.used_search - start_search
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


class DiscoveryStop(RuntimeError):
    def __init__(self, reason):
        super().__init__(reason)
        self.stop_reason = reason


def sync_playlist(yt, desired: list[dict], *, unit_budget: int, sleep=None, state=None, checkpoint=lambda: None) -> dict:
    """Make the private playlist contain the desired videos: remove rejected, append missing.

    Writes stop when the unit budget runs out; the next run continues. Existing
    order is preserved, so this is safe to rerun.
    """
    state = state if state is not None else {}
    start = yt.quota.used_general
    state["writes_completed_last_run"] = {"inserted": 0, "deleted": 0}
    # All reads, failed requests and writes share the authoritative Budget meter.
    # Leave RESERVE for paginated/settled read-back; the outer meter is the hard cap.
    def can_write():
        return yt.quota.used_general - start + WRITE_COST <= unit_budget

    def mutate(endpoint, params, *, method, body=None, video_id=None):
        state["pending_write"] = {"operation": endpoint + "." + method,
                                  "video_id": video_id, "item_id": params.get("id")}
        checkpoint()
        # No blind retries of non-idempotent writes, including 409 responses.
        try:
            result = yt.request(endpoint, params, method=method, body=body)
        except YouTubeHTTPError as exc:
            state["last_provider_error"] = exc.diagnostic()
            checkpoint()
            if endpoint != "playlistItems":
                raise
            # A failed response may follow an applied write. Reconcile reads only;
            # never issue the mutation a second time on an uncertain outcome.
            observed = yt.stable_playlist_entries(playlist_id)
            applied = (video_id in [v for _, v in observed] if method == "POST"
                       else params["id"] not in [i for i, _ in observed])
            if not applied:
                raise
            result = {}

        if endpoint == "playlists" and method == "POST":
            state["playlist_id"] = result["id"]
        confirmed = state.setdefault("confirmed_playlist_videos", [])
        if endpoint == "playlistItems" and method == "POST":
            confirmed.append(video_id)
        elif endpoint == "playlistItems" and method == "DELETE":
            # Duplicates may be deleted while one occurrence remains.
            if video_id in confirmed:
                confirmed.remove(video_id)
        if endpoint == "playlistItems":
            state["writes_completed_last_run"]["inserted" if method == "POST" else "deleted"] += 1
        state.pop("pending_write", None)
        checkpoint()
        return result

    playlists = yt.my_pilot_playlists(MARKER)
    if len(playlists) > 1:
        raise DiscoveryStop("multiple_discovery_playlists")
    if playlists:
        playlist_id = playlists[0]["id"]
        if state.get("playlist_id", playlist_id) != playlist_id:
            raise DiscoveryStop("playlist_identity_changed")
        if playlists[0].get("status", {}).get("privacyStatus") != "private":
            raise DiscoveryStop("playlist_not_private")
        entries = yt.stable_playlist_entries(playlist_id)
    else:
        if state.get("pending_write") or state.get("playlist_id"):
            raise DiscoveryStop("playlist_not_visible_with_existing_checkpoint")
        if not can_write():
            return {"status": "insufficient_quota", "units_spent": yt.quota.used_general - start}
        created = mutate("playlists", {"part": "snippet,status"}, method="POST", body={
            "snippet": {"title": TITLE,
                        "description": MARKER + " | Experimental playlist; unofficial festival guide"},
            "status": {"privacyStatus": "private"}})
        playlist_id, entries = created["id"], []
    state["playlist_id"] = playlist_id
    checkpoint()
    pending = state.get("pending_write")
    if pending:
        op, vid = pending["operation"], pending.get("video_id")
        resolved = (op == "playlists.POST" or
                    op == "playlistItems.POST" and vid in [v for _, v in entries] or
                    op == "playlistItems.DELETE" and pending["item_id"] not in [i for i, _ in entries])
        if not resolved:
            raise DiscoveryStop("prior_write_unresolved_no_repeat")
        confirmed = state.setdefault("confirmed_playlist_videos", [])
        if op == "playlistItems.POST" and vid not in confirmed:
            confirmed.append(vid)
        elif op == "playlistItems.DELETE" and vid in confirmed:
            confirmed.remove(vid)
        state.pop("pending_write")
        checkpoint()
    if not set(state.get("confirmed_playlist_videos", [])) <= {v for _, v in entries}:
        raise DiscoveryStop("listing_omits_checkpointed_additions")
    state["confirmed_playlist_videos"] = [v for _, v in entries]
    checkpoint()
    wanted = {d["video_id"] for d in desired}
    removed = added = 0
    kept = []
    for item_id, video_id in entries:
        if video_id in wanted and video_id not in kept:
            kept.append(video_id)
        elif can_write():
            mutate("playlistItems", {"id": item_id}, method="DELETE", video_id=video_id)
            removed += 1
        else:
            kept.append(video_id)
    expected = list(kept)
    for d in desired:
        if d["video_id"] in expected:
            continue
        if not can_write():
            break
        mutate("playlistItems", {"part": "snippet"}, method="POST", video_id=d["video_id"], body={
            "snippet": {"playlistId": playlist_id,
                        "resourceId": {"kind": "youtube#video", "videoId": d["video_id"]}}})
        added += 1
        expected.append(d["video_id"])
    readback = yt.settled_readback(playlist_id, expected)
    remaining = sum(1 for d in desired if d["video_id"] not in expected)
    return {"playlist_id": playlist_id,
            "youtube_music_url": "https://music.youtube.com/playlist?list=" + playlist_id,
            "visibility": "private", "readback_verified": readback == expected,
            "count": len(expected), "added": added, "removed": removed,
            "still_to_add": remaining,
            "still_to_remove": len(expected) - len(set(expected) & wanted), "units_spent": yt.quota.used_general - start}

