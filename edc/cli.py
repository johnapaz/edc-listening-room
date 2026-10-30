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


def quota_count(text: str) -> int:
    """Whole number as typed from Cloud Console, which shows thousands separators ("8,978")."""
    cleaned = text.strip().replace(",", "").replace(" ", "")
    try:
        return int(cleaned)
    except ValueError:
        raise argparse.ArgumentTypeError(f"not a whole number: {text!r}") from None


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
    match.add_argument("--remaining-search", type=quota_count, default=0, help="Confirmed remaining daily search calls")
    publish = commands.add_parser("pilot-playlist", help="Dry-run or create/read-back private YouTube pilot")
    publish.add_argument("--manifest", required=True, help="JSON list of reviewed video IDs")
    publish.add_argument("--preview", action="store_true",
                         help="Unranked private preview manifest using explicit source_ref IDs")
    publish.add_argument("--apply", action="store_true", help="Allow authenticated API writes with env gates")
    publish.add_argument("--remaining-general", type=quota_count, default=0,
                         help="Confirmed remaining general daily quota from Google Cloud Console")
    disc = commands.add_parser("discovery", help="Private all-artist playlist: match, then publish breadth-first")
    disc.add_argument("--apply", action="store_true", help="Allow YouTube searches and private playlist writes")
    disc.add_argument("--remaining-general", type=quota_count, default=0,
                      help="Confirmed remaining daily quota from Google Cloud Console (never overstate)")
    disc.add_argument("--per-act", type=int, default=3, help="Songs per act (rounds); later passes raise it")
    disc.add_argument("--remaining-searches", type=quota_count, default=0,
                      help="Confirmed remaining 'Search Queries per day' from Google Cloud Console")
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
    elif args.command == "discovery":
        run_discovery(args)
    elif args.command == "pilot-playlist":
        rows = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
        rows = validated_manifest(rows, preview=args.preview)
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
        result = client.publish_private_pilot(rows, preview=args.preview)
        print(json.dumps(result, indent=2))


def run_discovery(args) -> None:
    from . import discovery as d
    acts = d.build_acts()
    state = d.load_matches()
    decisions = d.load_decisions()
    unsearched = [a for a in acts if a.act_id not in state["searched_acts"]
                  and any(s.known_video_id is None for s in a.songs)]
    desired = d.publish_list(acts, state, decisions, per_act=args.per_act)
    queue = d.review_queue(state, decisions)
    print("Acts:", len(acts), "| still to search:", len(unsearched),
          "| playable now:", len(desired), "| review queue:", len(queue))
    if not args.apply:
        print("DRY RUN: no API requests. Next run would search up to", len(unsearched),
              "acts (one search plus", d.VIDEOS_LIST_COST, "general unit each).")
        return
    if not 0 < args.remaining_general <= 10000:
        raise SystemExit("Declare today's remaining quota from Google Cloud Console (1-10000)")
    if not 0 <= args.remaining_searches <= 100:
        raise SystemExit("Declare today's remaining search queries from Google Cloud Console (0-100)")
    if os.getenv("EDC_ENABLE_WRITES") != "1" or os.getenv("EDC_PILOT_APPROVED") != "1":
        raise SystemExit("Write gate is closed")
    units = args.remaining_general - d.RESERVE
    if units <= 0:
        raise SystemExit("Not enough quota today")
    budget = Budget(remaining_general=args.remaining_general, remaining_search=args.remaining_searches,
                    maximum_general_per_run=args.remaining_general)
    result = {"status": "failed", "readback_verified": False}
    initial_searched = len(state["searched_acts"])
    state.pop("last_provider_error", None)
    state["writes_completed_last_run"] = {"inserted": 0, "deleted": 0}
    def checkpoint():
        d.atomic_json(d.MATCHES_FILE, state)

    try:
        yt = YouTube(access_token_from_secrets(), budget)
        d.match_acts(yt, acts, state, per_act=args.per_act, max_searches=args.remaining_searches,
                     unit_budget=units, checkpoint=checkpoint)
        desired = d.publish_list(acts, state, decisions, per_act=args.per_act)
        result = d.sync_playlist(yt, desired, unit_budget=units - budget.used_general,
                                 state=state, checkpoint=checkpoint)
        result["status"] = ("paused" if state.get("matching_paused") or result.get("still_to_add") or result.get("still_to_remove") or
                            any(a.songs and a.act_id not in state["searched_acts"] for a in acts)
                            else "complete")
        if not result.get("readback_verified", False):
            raise RuntimeError("Playlist read-back unverified; reconcile before continuing")
    except Exception as exc:
        from .youtube import YouTubeHTTPError
        result["status"] = "failed"
        result["error"] = exc.diagnostic() if isinstance(exc, YouTubeHTTPError) else {
            "type": type(exc).__name__, "stop_reason": getattr(exc, "stop_reason", None)}  # never serialize arbitrary exception text
        raise SystemExit("Discovery stopped; see safe run summary and saved checkpoint") from None
    finally:
        state["units_spent_last_run"] = budget.used_general
        state["searches_last_run"] = budget.used_search
        queue = d.review_queue(state, decisions)
        checkpoint()
        d.atomic_json(d.DATA / "review-queue.json", queue)
        result.update(acts_searched_this_run=len(state["searched_acts"]) - initial_searched,
                      acts_searched_total=len(state["searched_acts"]),
                      acts_remaining=sum(a.act_id not in state["searched_acts"] and bool(a.songs)
                                         for a in acts),
                      review_queue=len(queue), quota_used_general=budget.used_general,
                      searches_attempted=budget.used_search, attempted_requests=budget.attempts,
                      matching_paused=state.get("matching_paused"),
                      provider_error=state.get("last_provider_error"),
                      pending_write=state.get("pending_write"),
                      playlist_checkpoint_count=len(state.get("confirmed_playlist_videos", [])),
                      writes_completed=state.get("writes_completed_last_run", {}),
                      checkpoint_written=True)
        d.atomic_json(d.DATA / "discovery-run-summary.json", result)
        print(json.dumps(result, indent=2))
        summary = os.getenv("GITHUB_STEP_SUMMARY")
        if summary:
            with open(summary, "a", encoding="utf-8") as out:
                out.write("## Private discovery result\n\n```json\n" + json.dumps(result, indent=2) + "\n```\n")


if __name__ == "__main__":
    main()


