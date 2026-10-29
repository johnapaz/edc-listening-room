"""Pilot CLI, dry-run by default; no secrets or API writes in CI."""
from __future__ import annotations
import argparse
from datetime import date
import json
import os
from pathlib import Path

from .ranking import rank_tracks, balanced_discovery, top_100
from .quota import Budget
from .musicbrainz import MusicBrainz, PILOT_ARTISTS, research_artists
from .youtube import YouTube, access_token_from_secrets, validated_manifest
from .matching import search_suggestions


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m edc.cli")
    commands = parser.add_subparsers(dest="command", required=True)
    rank = commands.add_parser("rank", help="Calculate deterministic scores from a licensed metrics snapshot")
    rank.add_argument("--input", required=True)
    rank.add_argument("--output", required=True)
    rank.add_argument("--as-of", default="2026-10-29")
    discover = commands.add_parser("research", help="Find MusicBrainz identity candidates, never auto-approve")
    discover.add_argument("--execute", action="store_true", help="Read-only MusicBrainz requests")
    discover.add_argument("--output", default=".state/artist-candidates.json")
    match = commands.add_parser("match", help="Propose YouTube candidates without auto-approving")
    match.add_argument("--input", required=True)
    match.add_argument("--output", default=".state/youtube-suggestions.json")
    match.add_argument("--execute", action="store_true", help="Read-only YouTube searches")
    match.add_argument("--remaining-search", type=int, default=0, help="Confirmed remaining daily search calls")
    publish = commands.add_parser("pilot-playlist", help="Dry-run or create/read-back private YouTube pilot")
    publish.add_argument("--manifest", required=True, help="JSON list of reviewed video IDs")
    publish.add_argument("--apply", action="store_true", help="Allow authenticated API writes with env gates")
    publish.add_argument("--remaining-general", type=int, default=0,
                         help="Confirmed remaining general daily quota from Google Cloud Console")
    args = parser.parse_args()

    if args.command == "rank":
        data = json.loads(Path(args.input).read_text(encoding="utf-8"))
        ranked = rank_tracks(data, date.fromisoformat(args.as_of))
        ranked["top_100_recording_ids"] = [r["recording_id"] for r in top_100(ranked)]
        artist_ids = sorted({a for r in data for a in r.get("artist_ids", [])})
        discovery = balanced_discovery(ranked, artist_ids)
        ranked["balanced_recording_ids"] = [r["recording_id"] for r in discovery["tracks"]]
        ranked["uncovered_artist_ids"] = discovery["uncovered_artist_ids"]
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(ranked, indent=2, ensure_ascii=False), encoding="utf-8")
        print("Scored:", len(ranked["ranked"]), "Unscored:", len(ranked["unscored"]),
              "Missing artists:", len(ranked["uncovered_artist_ids"]))
    elif args.command == "research":
        if not args.execute:
            print("DRY RUN — would retrieve MusicBrainz candidates for:")
            print(", ".join(PILOT_ARTISTS))
            print("Requires EDC_CONTACT_EMAIL and --execute; no automatic ID selection.")
            return
        client = MusicBrainz(os.environ.get("EDC_CONTACT_EMAIL", ""))
        if not research_artists(client, args.output):
            raise SystemExit("Some artist lookups failed. Partial candidates and failure report saved; rerun to resume from cache.")
        print("Read-only candidates saved to", args.output)
    elif args.command == "match":
        rows = json.loads(Path(args.input).read_text(encoding="utf-8"))
        if not args.execute:
            print("DRY RUN: would search YouTube for", len(rows), "review candidates; no requests made")
            return
        if not 1 <= len(rows) <= 16 or args.remaining_search < len(rows):
            raise RuntimeError("Search list exceeds 16 tracks or confirmed remaining search quota")
        yt = YouTube(access_token_from_secrets(), Budget(remaining_general=50, remaining_search=args.remaining_search))
        matches = search_suggestions(yt, rows)
        out = Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(matches, indent=2, ensure_ascii=False), encoding="utf-8")
        print("Review candidates saved to", out, "YouTube searches:", yt.quota.used_search)
    elif args.command == "pilot-playlist":
        rows = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
        rows = validated_manifest(rows)
        if not args.apply:
            print("DRY RUN: validated", len(rows), "reviewed video IDs.")
            print("Estimated general quota:", 50 + 50 * len(rows) + 20, "units max")
            print("No API requests made. Google OAuth and additional gates required for --apply.")
            return
        if args.remaining_general < 1:
            raise RuntimeError("Declare daily remaining general quota from Google Cloud Console")
        # Validate authorization before requesting a token or calling YouTube.
        if os.getenv("EDC_ENABLE_WRITES") != "1" or os.getenv("EDC_PILOT_APPROVED") != "1":
            raise RuntimeError("Write gate is closed")
        budget = Budget(remaining_general=args.remaining_general)
        budget.preflight_pilot(len(rows), will_create=True)
        client = YouTube(access_token_from_secrets(), budget)
        result = client.publish_private_pilot(rows)
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()

