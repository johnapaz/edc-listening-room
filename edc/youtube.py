"""Quota-bounded, resumable YouTube playlist publishing.

Real writes require an explicit approved manifest, a one-time manual approval,
OAuth refresh credentials supplied via environment, and remaining quota declared
from Google Cloud Console. The pilot always uses a PRIVATE playlist first.
"""
from __future__ import annotations
import json
import os
import re
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from typing import Any

from .quota import Budget

YT_API = "https://www.googleapis.com/youtube/v3"
MARKER = "edc-listening-room:pilot-m1-v1"
TITLE = "EDC Orlando 2026 — Pilot M1 (Unofficial)"


def validated_manifest(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not isinstance(rows, list) or not 1 <= len(rows) <= 16:
        raise ValueError("Expected between one and 16 pilot tracks")
    seen: set[str] = set()
    for row in rows:
        video = str(row.get("video_id", ""))
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video) or video in seen:
            raise ValueError("Video IDs must be valid and unique")
        if not row.get("human_verified") is True:
            raise ValueError("All pilot playlist items require human_verified=true")
        if not row.get("artist") or not row.get("title") or not row.get("recording_id"):
            raise ValueError("Each playlist item needs artist, title and recording_id")
        seen.add(video)
    return rows


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
            raise RuntimeError("YouTube API request failed (HTTP " + str(e.code) +
                               ", operation " + operation + "); reconcile state before retry.") from None

    def my_pilot_playlists(self) -> list[dict]:
        marker_matches: list[dict] = []
        token = None
        for _ in range(20):
            args = {"part": "snippet,status", "mine": "true", "maxResults": 50}
            if token:
                args["pageToken"] = token
            data = self.request("playlists", args)
            marker_matches.extend(x for x in data.get("items", [])
                                  if MARKER in x.get("snippet", {}).get("description", ""))
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

    def publish_private_pilot(self, manifest: list[dict]) -> dict:
        records = validated_manifest(manifest)
        if os.getenv("EDC_ENABLE_WRITES") != "1" or os.getenv("EDC_PILOT_APPROVED") != "1":
            raise RuntimeError("Live writes require EDC_ENABLE_WRITES=1 and EDC_PILOT_APPROVED=1")
        self.quota.preflight_pilot(len(records), will_create=True)
        playlists = self.my_pilot_playlists()
        if len(playlists) > 1:
            raise RuntimeError("Multiple matching pilot playlists; manual reconciliation required")
        if playlists:
            playlist_id = playlists[0]["id"]
            if playlists[0].get("status", {}).get("privacyStatus") != "private":
                raise RuntimeError("Pilot playlist is not private: refusing to modify it")
        else:
            created = self.request("playlists", {"part": "snippet,status"}, method="POST", body={
                "snippet": {"title": TITLE,
                            "description": MARKER + " | Experimental playlist; unofficial festival guide"},
                "status": {"privacyStatus": "private"},
            })
            playlist_id = created["id"]
        intended = [row["video_id"] for row in records]
        existing = self.playlist_items(playlist_id)
        if existing != intended[:len(existing)]:
            raise RuntimeError("Existing playlist is not an exact intended prefix; no writes made")
        for video_id in intended[len(existing):]:
            self.request("playlistItems", {"part": "snippet"}, method="POST", body={
                "snippet": {"playlistId": playlist_id,
                            "resourceId": {"kind": "youtube#video", "videoId": video_id}},
            })
        readback = self.playlist_items(playlist_id)
        if readback != intended:
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
