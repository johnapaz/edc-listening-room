# M1 — EDC Orlando 2026 pilot specification

Status: IMPLEMENTATION PR ONLY. No live source catalog calls, Notion ingestion or playlist publishing have occurred.

[Listening Room](https://app.notion.com/p/4080e646ca0d814287d0c3579187c102) · [Private Notion acceptance plan](https://app.notion.com/p/4080e646ca0d81399702c8990cd1d8d8) · [Official lineup](https://orlando.edc.com/lineup/)

## Locked scope

Primary releases (albums, EPs, singles), official artist remixes and credited collaborations; exclude unofficial bootlegs and full DJ mixes. Two global lists: strict score-based Top 100 without artist quotas, plus a balanced lineup-wide discovery list. A top 20 for each verified genre. All playlists and the guide ultimately public, subject to tested publication gates. No bulk catalog ingestion before the eight-artist pilot passes.

## Eight pilot artists and their challenges

Martin Garrix (major artist, prolific collaborations), I Hate Models (techno identities), A Little Sound (featured vocal credits), KI/KI (punctuation and name matching), ACRAZE and CID (two distinct members of a B2B appearance), Benda and Vastive (another B2B appearance). The performers are individuals; a B2B set is a performance relation.

## Pilot work packages and commands

1. Run standard-library, zero-network tests: `python -m unittest discover -s tests -v`.
2. Inspect a no-network research plan: `python -m edc.cli research`.
3. With a meaningful contact address configured securely as EDC_CONTACT_EMAIL, run `python -m edc.cli research --execute` to obtain up to five MusicBrainz artist identity candidates per pilot name. **Do not auto-select identities.** Cache responses and respect <=1 MusicBrainz request/sec.
   The research workflow checkpoints each artist and uploads both candidate JSON and a `.report.json` completion report even after partial failure. Failed artists remain explicitly unresolved and the job exits unsuccessfully. Successful API responses are cached across manual runs; rerunning retries unresolved requests without re-fetching cached successes. Requests use at most three attempts with bounded backoff for HTTP 429/503 and connection failures. A complete report means lookups finished, not that identities have been approved. To refresh stale successful responses, increment the workflow cache prefix or clear its cache before a new research run.
4. After every MBID is reviewed, query release groups via the MusicBrainz helper, retaining source references and differentiating official releases, remixes and credited performances. Canonicalize recording/version IDs. Track scope exclusions.
5. Obtain licensed, attributed source metrics with track listeners and plays (see license gate below). A normalized snapshot can be ranked with `python -m edc.cli rank --input licensed-snapshot.json --output .state/ranking.json`. Fields per row: recording_id, title, artist_ids (list), primary_genre, genres (list), listeners (integer), plays (integer), release_date (ISO), eligible (boolean).
6. From verified MusicBrainz recordings, prepare up to sixteen candidate rows with recording_id, title, artist. Run `python -m edc.cli match --input candidate-tracks.json` for a **no-network** plan. For live searches, add `--execute --remaining-search N` after confirming the actual remaining YouTube search quota. The output is a review-required suggestion list, never automatically approved.
7. Human-review the suggested title, channel, artist, edition/version and YouTube Music availability. Create pilot/approved-tracks.json with each recording_id, artist, title, 11-character video_id and human_verified=true. Do not place synthetic test IDs there.
8. Dry-run the writer using `python -m edc.cli pilot-playlist --manifest pilot/approved-tracks.json`. Once all gates and review are satisfied, use the guarded GitHub workflow on main. It creates/reuses a **private** playlist and verifies the ordered readback.
9. Manually open the returned Music playlist URL and test true playback and availability. Only after sign-off can a later PR enable public publication or broader ingestion.

## Scoring contract

Score = 0.55 P + 0.25 G + 0.15 E + 0.05 R, on 0..100:
- P: percentile of log(1 + unique track listeners) globally.
- G: within-primary-genre listener percentile shrunk toward P using n/(n+20).
- E: percentile of log(1 + capped plays/listener), cap=1000 plays/listener.
- R: bounded linear release recency from 100 to 0 across ten years.

Missing mandatory listeners/plays/genre means "unscored," not a score of zero. Equal scores are deterministically tied by listeners, earlier release date, then stable recording ID. No YouTube video-view statistics enter this score. Any popularity data provider must be evaluated for appropriate rights; Last.fm use is not automatically licensed for commercial publication.

## Explicit quotas and money

- Google YouTube Search: no more than 50 searches/day in pilot; 100/day is the current default project allocation.
- Google YouTube general: no more than 1,000 units **per pilot run**, plus an independently verified daily-remaining number from Cloud Console. Playlist create and each insert cost 50 units, 16 records + create = 850 units before list checks.
- MusicBrainz: <=1 request/sec per client with meaningful User-Agent and cache.
- Notion projection: target <=60 calls/min, change-only upserts and stable external IDs, once implemented.
- Cost ceiling: $0 paid services and $0 paid LLM calls without separate authorization. Unbounded retries, external data scraping and unreviewed live writes are prohibited.

## M1 acceptance

- Eight verified artist identities; both B2B pairings mapped accurately.
- At least 40 eligible candidate recordings inspected if sufficient source records exist.
- >=95% source identity correctness in sampled candidates; every inserted recording manually approved for correct title, artist and version.
- Demonstrate at least two ambiguous/invalid release exclusions.
- Deterministic ranking snapshot, visible missing-data coverage, source attribution and licensing decision.
- Notion relations and idempotent projection verified after sync is implemented.
- Live YouTube playlist contains all selected IDs in exact order after readback; no duplicates.
- Confirm real playback in YouTube Music; document regional/account playback gaps and do not claim success merely from API acceptance.
- Provide a go/no-go report containing external IDs, quota used, run ID, costs and unresolved blockers before any bulk ingestion.

## Current implementation boundary

This PR implements deterministic ranking, MusicBrainz candidate lookup and limited release-group helper, read-only YouTube candidate suggestions, test suites, and a guarded private YouTube pilot writer.

Not yet implemented: full recording ingestion, licensed popularity-data collection, Notion write sync, expanded genres, automatically approved matches, full lineup crawling, public playlist release or a live companion site. In particular, **real playable playlists do not yet exist**.

## Sources

- https://developers.google.com/youtube/data/determine_quota_cost
- https://developers.google.com/youtube/data/reference/rest/v3/playlists/insert
- https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/insert
- https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list
- https://musicbrainz.org/doc/MusicBrainz_API
- https://www.last.fm/api/tos

