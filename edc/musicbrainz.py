"""Read-only MusicBrainz pilot discovery with an on-disk cache.

Artist search returns candidate identities for human confirmation. Never silently
select the top result. Scoped release-group browsing only after IDs are approved.
"""
from __future__ import annotations
import json
import os
import re
import time
import random
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

API = "https://musicbrainz.org/ws/2"


class MusicBrainz:
    def __init__(self, contact: str, cache_dir: str = ".cache/musicbrainz",
                 throttle_seconds: float = 1.1):
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", contact):
            raise ValueError("Set EDC_CONTACT_EMAIL to a real contact email for MusicBrainz User-Agent")
        if throttle_seconds < 1:
            raise ValueError("Rate limit must be at most one request per second")
        self.user_agent = "edc-listening-room/0.1 (" + contact + ")"
        self.cache = Path(cache_dir)
        self.throttle = throttle_seconds
        self._last = 0.0

    def get(self, path: str, params: dict[str, str]) -> dict:
        query = urlencode({**params, "fmt": "json"})
        url = API + "/" + path + "?" + query
        import hashlib
        key = hashlib.sha256(url.encode()).hexdigest()
        filename = self.cache / (key + ".json")
        if filename.is_file():
            return json.loads(filename.read_text(encoding="utf-8"))
        self.cache.mkdir(parents=True, exist_ok=True)
        wait = self.throttle - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()
        req = Request(url, headers={"User-Agent": self.user_agent, "Accept": "application/json"})
        # At most 3 attempts. No parallel requests and no quota evasion.
        for retry in range(3):
            try:
                with urlopen(req, timeout=20) as response:
                    result = json.load(response)
                filename.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
                return result
            except HTTPError as exc:
                if exc.code not in (429, 503) or retry == 2:
                    raise RuntimeError("MusicBrainz returned HTTP " + str(exc.code)) from None
                requested = self._retry_after(exc)
                if requested > 30:
                    raise RuntimeError('MusicBrainz deferred by Retry-After; retry no earlier than '
                                       + str(requested) + ' seconds from this response') from None
                delay = max(3 * 2 ** retry + random.uniform(0, 1), requested)
                time.sleep(delay)
                self._last = time.monotonic()
            except (URLError, TimeoutError):
                if retry == 2:
                    raise RuntimeError("MusicBrainz connection failed after 3 attempts") from None
                time.sleep(3 * 2 ** retry)
                self._last = time.monotonic()
        raise RuntimeError("MusicBrainz request failed")

    @staticmethod
    def _retry_after(exc: HTTPError) -> float:
        try:
            return max(0, float(exc.headers.get("Retry-After", "0")))
        except (TypeError, ValueError, AttributeError):
            try:
                return max(0, (parsedate_to_datetime(exc.headers['Retry-After'])
                               - datetime.now(timezone.utc)).total_seconds())
            except (TypeError, ValueError, AttributeError, KeyError):
                return 0

    def artist_candidates(self, name: str, limit: int = 5) -> list[dict]:
        # MusicBrainz Lucene exact name field. Candidate list is never an auto-match.
        quoted = name.replace('"', r'\"')
        result = self.get("artist", {"query": 'artist:"' + quoted + '"', "limit": str(limit)})
        return [{
            "id": x.get("id"),
            "name": x.get("name"),
            "sort_name": x.get("sort-name"),
            "country": x.get("country"),
            "type": x.get("type"),
            "disambiguation": x.get("disambiguation", ""),
            "source_url": "https://musicbrainz.org/artist/" + x["id"],
            "status": "needs_human_review",
        } for x in result.get("artists", []) if x.get("id")]

    def release_groups(self, mbid: str, maximum: int = 100) -> list[dict]:
        if not re.fullmatch(r"[a-fA-F0-9-]{36}", mbid):
            raise ValueError("Invalid MusicBrainz artist ID")
        offset = 0
        items: list[dict] = []
        while len(items) < maximum:
            chunk = min(100, maximum - len(items))
            data = self.get("release-group", {"artist": mbid, "limit": str(chunk), "offset": str(offset)})
            batch = data.get("release-groups", [])
            if not batch:
                break
            for item in batch:
                items.append({
                    "id": item["id"],
                    "title": item.get("title"),
                    "primary_type": item.get("primary-type"),
                    "secondary_types": item.get("secondary-types", []),
                    "first_release_date": item.get("first-release-date"),
                    "source_url": "https://musicbrainz.org/release-group/" + item["id"],
                    "status": "unverified_scope",
                })
            offset += len(batch)
            if len(batch) < chunk:
                break
        return items


PILOT_ARTISTS = [
    "Martin Garrix", "I Hate Models", "A Little Sound", "KI/KI",
    "ACRAZE", "CID", "Benda", "Vastive",
]


def research_artists(client: MusicBrainz, output: str) -> bool:
    """Checkpoint each artist; cached successes resume without network calls.

    Keep the candidate file compatible with existing human review. The separate
    report distinguishes empty successful results from failed lookups.
    """
    out = Path(output)
    out.parent.mkdir(parents=True, exist_ok=True)
    results: dict = {}
    report: dict = {"complete": False, "artists": {}}

    def checkpoint() -> None:
        for path, data in ((out, results), (out.with_suffix(".report.json"), report)):
            temporary = path.with_suffix(path.suffix + ".tmp")
            temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            temporary.replace(path)

    checkpoint()
    for name in PILOT_ARTISTS:
        try:
            results[name] = client.artist_candidates(name)
            report["artists"][name] = {"status": "needs_human_review", "count": len(results[name])}
            print(name + ": " + str(len(results[name])) + " candidates; review required")
        except RuntimeError as exc:
            report["artists"][name] = {"status": "failed", "error": str(exc)}
            print(name + ": lookup failed; see report and retry after service recovery")
        checkpoint()
    report["complete"] = all(x["status"] != "failed" for x in report["artists"].values())
    checkpoint()
    return report["complete"]

