"""Quota-bounded, resumable YouTube playlist publishing.

Real writes require an explicit approved manifest, a one-time manual approval,
OAuth refresh credentials supplied via environment, and remaining quota declared
from Google Cloud Console. The pilot always uses a PRIVATE playlist first.
"""
from __future__ import annotations
import json
import os
import re
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from typing import Any

from .quota import Budget

YT_API = "https://www.googleapis.com/youtube/v3"
MARKER = "edc-listening-room:pilot-m1-v1"
TITLE = "EDC Orlando 2026 — Pilot M1 (Unofficial)"
PREVIEW_MARKER = "edc-listening-room:preview-v1"
PREVIEW_TITLE = "EDC Orlando 2026 — Private listening preview (unranked, unofficial)"
# A just-created playlist can briefly answer 404 (playlistNotFound). A 404 means
# nothing was applied, so it is safe to retry; other errors are not retried.
NOT_FOUND_DELAYS = (2, 4, 8, 16)
# Item listings lag behind inserts. Read-back is retried until it matches, and a
# resume only writes after two identical listings, so a stale prefix cannot cause duplicates.
READBACK_DELAYS = (5, 10, 15, 30)
STABLE_LISTING_GAP = 10
STABLE_LISTING_ATTEMPTS = 3
_MBID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


def validated_manifest(rows: list[dict[str, Any]], *, preview: bool = False) -> list[dict[str, Any]]:
    """Validate a reviewed manifest.

    M1 rows need a canonical recording_id. A separate unranked preview may instead
    carry an explicit provider-namespaced source_ref (never a fabricated MBID), a
    version note, and independent source_verified / human_verified flags. Preview
    rows may not carry rank or score fields.
    """
    if not isinstance(rows, list) or not 1 <= len(rows) <= 16:
        raise ValueError("Expected between one and 16 pilot tracks")
    seen: set[str] = set()
    for row in rows:
        video = str(row.get("video_id", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video) or video in seen:
            raise ValueError("Video IDs must be valid and unique")
        if not row.get("human_verified") is True:
            raise ValueError("All pilot playlist items require human_verified=true")
        if not row.get("artist") or not row.get("title"):
            raise ValueError("Each playlist item needs artist and title")
        if preview:
            ref = row.get("source_ref")
            if not isinstance(ref, dict) or ref.get("namespace") != "youtube-video" or ref.get("id") != video:
                raise ValueError("Preview items need source_ref {namespace: youtube-video, id: video_id}")
            if row.get("source_verified") is not True or not str(row.get("version_note", "")).strip():
                raise ValueError("Preview items need source_verified=true and a version_note")
            if row.get("recording_id") is not None and not _MBID.fullmatch(str(row["recording_id"])):
                raise ValueError("recording_id, when present, must be a real MusicBrainz UUID")
            if any(k in row for k in ("rank", "score")):
                raise ValueError("Preview is unranked: rank/score fields are not allowed")
        elif not row.get("recording_id"):
            raise ValueError("Each playlist item needs artist, title and recording_id")
        seen.add(video)
    return rows


def describe_mismatch(intended: list[str], actual: list[str]) -> str:
    """Public video IDs only; safe to print in workflow logs."""
    first = next((i for i, (a, b) in enumerate(zip(intended, actual)) if a != b),
                 min(len(intended), len(actual)))
    return ("expected " + str(len(intended)) + " items, found " + str(len(actual)) +
            "; first difference at position " + str(first) + "; found order: " + ",".join(actual))


def access_token_from_secrets() -> str:
    client_id = os.environ.get("GOOGLE_CLIENT_ID", "")
    client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "")
    refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "")
    if not all([client_id, client_secret, refresh_token]):
        raise RuntimeError("Missing OAuth credentials in secure environment; no requests made")
    data = urlencode({
        "client_id": client_id, "client_secret": client_secret,
        "refresh_token": refresh_token, "grant_type": "refresh_token",
    }).encode()
    req = Request("https://oauth2.googleapis.com/token", data=data, method="POST",
                  headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urlopen(req, timeout=20) as response:
            token = json.load(response)["access_token"]
    except (HTTPError, KeyError) as exc:
        raise RuntimeError("OAuth refresh failed. Check credentials and consent status.") from None
    return token


class YouTubeHTTPError(RuntimeError):
    def __init__(self, message: str, code: int):
        super().__init__(message)
        self.code = code


class YouTube:
    def __init__(self, token: str, quota: Budget):
        self.token, self.quota = token, quota

    def request(self, endpoint: str, params: dict[str, Any], *, method: str = "GET",
                body: dict | None = None) -> dict:
        operation = endpoint + (".insert" if method == "POST" else ".list")
        self.quota.spend(operation)
        url = YT_API + "/" + endpoint + "?" + urlencode(params)
        headers = {"Authorization": "Bearer " + self.token, "Accept": "application/json"}
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode()
        try:
            with urlopen(Request(url, data=data, headers=headers, method=method), timeout=25) as response:
                return json.load(response)
        except HTTPError as e:
            # Do not log response bodies: server data may contain sensitive information.
            raise YouTubeHTTPError("YouTube API request failed (HTTP " + str(e.code) +
                                   ", operation " + operation + "); reconcile state before retry.",
                                   e.code) from None

    def sleep(self, seconds: float) -> None:
        time.sleep(seconds)

    def retry_not_found(self, call):
        for delay in NOT_FOUND_DELAYS:
            try:
                return call()
            except YouTubeHTTPError as e:
                if e.code != 404:
                    raise
                self.sleep(delay)
        return call()

    def stable_playlist_items(self, playlist_id: str) -> list[str]:
        previous = self.retry_not_found(lambda: self.playlist_items(playlist_id))
        for _ in range(STABLE_LISTING_ATTEMPTS):
            self.sleep(STABLE_LISTING_GAP)
            current = self.retry_not_found(lambda: self.playlist_items(playlist_id))
            if current == previous:
                return current
            previous = current
        raise RuntimeError("Playlist listing did not settle; no writes made. Retry later.")

    def my_pilot_playlists(self, marker: str = MARKER) -> list[dict]:
        marker_matches: list[dict] = []
        token = None
        for _ in range(20):
            args = {"part": "snippet,status", "mine": "true", "maxResults": 50}
            if token:
                args["pageToken"] = token
            data = self.request("playlists", args)
            marker_matches.extend(x for x in data.get("items", [])
                                  if marker in x.get("snippet", {}).get("description", ""))
            token = data.get("nextPageToken")
            if not token:
                return marker_matches
        raise RuntimeError("Playlist search exceeded 20 pages; manual reconciliation required")

    def playlist_items(self, playlist_id: str) -> list[str]:
        items: list[str] = []
        token = None
        for _ in range(10):
            args = {"part": "snippet", "playlistId": playlist_id, "maxResults": 50}
            if token:
                args["pageToken"] = token
            data = self.request("playlistItems", args)
            ordered = sorted(data.get("items", []), key=lambda r: r["snippet"]["position"])
            items.extend(x["snippet"]["resourceId"]["videoId"] for x in ordered)
            token = data.get("nextPageToken")
            if not token:
                return items
        raise RuntimeError("Pilot playlist has too many items; manual reconciliation required")

    def publish_private_pilot(self, manifest: list[dict], *, preview: bool = False) -> dict:
        records = validated_manifest(manifest, preview=preview)
        marker, title = (PREVIEW_MARKER, PREVIEW_TITLE) if preview else (MARKER, TITLE)
        if os.getenv("EDC_ENABLE_WRITES") != "1" or os.getenv("EDC_PILOT_APPROVED") != "1":
            raise RuntimeError("Live writes require EDC_ENABLE_WRITES=1 and EDC_PILOT_APPROVED=1")
        self.quota.preflight_pilot(len(records), will_create=True)
        playlists = self.my_pilot_playlists(marker)
        if len(playlists) > 1:
            raise RuntimeError("Multiple matching pilot playlists; manual reconciliation required")
        if playlists:
            playlist_id = playlists[0]["id"]
            if playlists[0].get("status", {}).get("privacyStatus") != "private":
                raise RuntimeError("Pilot playlist is not private: refusing to modify it")
        else:
            created = self.request("playlists", {"part": "snippet,status"}, method="POST", body={
                "snippet": {"title": title,
                            "description": marker + " | Experimental playlist; unofficial festival guide"},
                "status": {"privacyStatus": "private"},
            })
            playlist_id = created["id"]
        intended = [row["video_id"] for row in records]
        # A playlist created in this run is empty; listing it can 404 until it propagates.
        existing = [] if not playlists else self.stable_playlist_items(playlist_id)
        print("Playlist", "found" if playlists else "created", "with", len(existing),
              "items; intended", len(intended), "; inserting", max(len(intended) - len(existing), 0))
        if existing != intended[:len(existing)]:
            print(describe_mismatch(intended, existing))
            raise RuntimeError("Existing playlist is not an exact intended prefix; no writes made")
        for video_id in intended[len(existing):]:
            self.retry_not_found(lambda: self.request("playlistItems", {"part": "snippet"}, method="POST", body={
                "snippet": {"playlistId": playlist_id,
                            "resourceId": {"kind": "youtube#video", "videoId": video_id}},
            }))
        readback = self.retry_not_found(lambda: self.playlist_items(playlist_id))
        for delay in READBACK_DELAYS:
            if readback == intended:
                break
            print("Read-back not yet complete:", describe_mismatch(intended, readback))
            self.sleep(delay)
            readback = self.retry_not_found(lambda: self.playlist_items(playlist_id))
        if readback != intended:
            print(describe_mismatch(intended, readback))
            raise RuntimeError("Playlist read-back mismatch. Do not publish; reconcile manually.")
        return {
            "playlist_id": playlist_id,
            "youtube_url": "https://www.youtube.com/playlist?list=" + playlist_id,
            "youtube_music_url": "https://music.youtube.com/playlist?list=" + playlist_id,
            "readback_verified": True,
            "playback_verified": False,
            "visibility": "private",
            "count": len(intended),
            "quota_used_general": self.quota.used_general,
        }
