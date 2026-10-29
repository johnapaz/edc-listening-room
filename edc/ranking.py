"""Deterministic editorial music ranking. Never use YouTube API statistics here."""
from __future__ import annotations

from bisect import bisect_left, bisect_right
from datetime import date, datetime
from math import log1p
from typing import Any


def _percentiles(values: dict[str, float]) -> dict[str, float]:
    ordered = sorted(values.values())
    if not ordered:
        return {}
    if len(ordered) == 1:
        return {key: 50.0 for key in values}
    result = {}
    for key, value in values.items():
        lo = bisect_left(ordered, value)
        hi = bisect_right(ordered, value)
        result[key] = 100 * ((lo + hi - 1) / 2) / (len(ordered) - 1)
    return result


def _release_date(value: str) -> date:
    return date.fromisoformat(value[:10])


def rank_tracks(tracks: list[dict[str, Any]], as_of: date) -> dict[str, Any]:
    """Return scored tracks, unscored reasons, and a frozen method snapshot.

    Requires unique stable recording IDs, verified primary genre, independent
    unique listeners and total plays. Missing fields are never scored as zero.
    """
    ids: set[str] = set()
    valid: list[dict[str, Any]] = []
    unscored: list[dict[str, str]] = []
    for row in tracks:
        key = str(row.get("recording_id", "")).strip()
        if not key or key in ids:
            raise ValueError("Recording IDs must be present and unique")
        ids.add(key)
        if row.get("eligible") is False:
            unscored.append({"recording_id": key, "reason": "excluded_by_scope"})
            continue
        required = ["artist_ids", "primary_genre", "listeners", "plays", "release_date"]
        missing = [field for field in required if row.get(field) in (None, "", [])]
        if missing:
            unscored.append({"recording_id": key, "reason": "missing_" + ",".join(missing)})
            continue
        if not isinstance(row["artist_ids"], list) or not all(
            isinstance(x, str) and x.strip() for x in row["artist_ids"]
        ):
            unscored.append({"recording_id": key, "reason": "invalid_artist_ids"})
            continue
        listeners, plays = row["listeners"], row["plays"]
        if not isinstance(listeners, int) or not isinstance(plays, int) or listeners <= 0 or plays < 0:
            unscored.append({"recording_id": key, "reason": "invalid_listener_metrics"})
            continue
        try:
            released = _release_date(str(row["release_date"]))
        except ValueError:
            unscored.append({"recording_id": key, "reason": "invalid_release_date"})
            continue
        if released > as_of:
            unscored.append({"recording_id": key, "reason": "future_release"})
            continue
        valid.append({**row, "recording_id": key, "_released": released})

    popularity = _percentiles({r["recording_id"]: log1p(r["listeners"]) for r in valid})
    engagement = _percentiles({
        r["recording_id"]: log1p(min(r["plays"] / r["listeners"], 1000))
        for r in valid
    })
    genres: dict[str, list[dict[str, Any]]] = {}
    for r in valid:
        genres.setdefault(str(r["primary_genre"]), []).append(r)
    genre_pct: dict[str, float] = {}
    genre_n: dict[str, int] = {}
    for _, members in genres.items():
        p = _percentiles({r["recording_id"]: log1p(r["listeners"]) for r in members})
        genre_pct.update(p)
        for r in members:
            genre_n[r["recording_id"]] = len(members)

    ranked = []
    for r in valid:
        key = r["recording_id"]
        p = popularity[key]
        n = genre_n[key]
        g = n / (n + 20) * genre_pct[key] + 20 / (n + 20) * p
        e = engagement[key]
        age_days = (as_of - r["_released"]).days
        recent = max(0.0, 100.0 * (1 - age_days / 3650))
        score = round(0.55 * p + 0.25 * g + 0.15 * e + 0.05 * recent, 1)
        cleaned = {k: v for k, v in r.items() if not k.startswith("_")}
        ranked.append({
            **cleaned,
            "score": score,
            "global_percentile": round(p, 2),
            "genre_percentile": round(g, 2),
            "engagement_percentile": round(e, 2),
            "recency": round(recent, 2),
        })
    ranked.sort(key=lambda r: (-r["score"], -r["listeners"], r["release_date"], r["recording_id"]))
    return {
        "as_of": as_of.isoformat(),
        "method": "edc-discovery-v0.1",
        "weights": {"global": .55, "genre": .25, "engagement": .15, "recency": .05},
        "ranked": ranked,
        "unscored": unscored,
    }


def top_100(ranking: dict[str, Any]) -> list[dict[str, Any]]:
    """A strict global ordering. No artist quotas."""
    return ranking["ranked"][:100]


def genre_top_20(ranking: dict[str, Any], genre: str) -> list[dict[str, Any]]:
    return [r for r in ranking["ranked"] if genre in r.get("genres", [r["primary_genre"]])][:20]


def balanced_discovery(ranking: dict[str, Any], artist_ids: list[str]) -> dict[str, Any]:
    """Prioritize covering every artist, then fill to at least 100 ranked tracks.

    One collaboration can introduce more than one artist, reducing duplicates.
    Report uncovered artists rather than inventing songs or claiming success.
    """
    available = ranking["ranked"]
    uncovered = set(artist_ids)
    selected: list[dict[str, Any]] = []
    chosen: set[str] = set()
    while uncovered:
        candidates = [r for r in available if r["recording_id"] not in chosen and
                      (set(r["artist_ids"]) & uncovered)]
        if not candidates:
            break
        best = max(candidates, key=lambda r: (len(set(r["artist_ids"]) & uncovered),
                                              r["score"], r["recording_id"]))
        selected.append(best)
        chosen.add(best["recording_id"])
        uncovered -= set(best["artist_ids"])
    target = max(100, len(artist_ids))
    for r in available:
        if len(selected) >= target:
            break
        if r["recording_id"] not in chosen:
            selected.append(r)
            chosen.add(r["recording_id"])
    return {"tracks": selected, "uncovered_artist_ids": sorted(uncovered)}
