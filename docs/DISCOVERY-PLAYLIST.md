# Private all-artist discovery playlist

Status 2026-10-30. Owner direction (assistant session, 2026-10-30): cover every act first and deepen later; exact song versions matter less than complete playlists; uncertain matches must never wait on owner review. Builds on the Notion discovery pass ([handoff](NOTION-DISCOVERY-HANDOFF-2026-10-30.md)).

## Milestone: private Discovery release (proposed by this PR; merging approves it)

Separate from M1. It allows **bulk matching and adding for a private playlist only**.

| Must hold | Deferred to M1 / later |
|---|---|
| Playlist private; marker-identified; refuses to touch a non-private playlist | Recording MBID/ISRC review for every song |
| Ordered read-back verified on every run | Licensed Discovery Score, strict Top 100, genre Top 20 |
| Owner spot-check playback (non-blocking) | Notion projection idempotence checks |
| $0 paid services; declared-quota ceiling never exceeded | Public playlist or guide publication |

M1 is **not** passed by this. Public release stays gated.

## Selection policy

- Every musical act equally; no headliner tier. 113 acts from the lineup reference (MC-only credit and the Discovery Project program slot excluded). B2B members count as their own acts.
- Per act, songs in this order: approved preview videos, pilot source-listed candidates, official-playlist captures, then Notion discovery passes. Same-title duplicates are dropped.
- Round 1 adds every act's first playable song before any act gets a second (`--per-act` sets the depth; 3 now, 5 later). An unmatched song is backfilled from that act's next candidate.
- Collaborations are added once, even when credited to two acts.

### Gap rule (7 acts with no captured songs)

- **DJs without an established catalog** (Alves, Fury, Inbal, Matthias, Ultrathem): added only once a primary source confirms their own standalone release. Until then they stay visible in Notion with no playlist songs. Namesakes are never substituted; DJ mixes are never added.
- **Joint projects** (MADVKTM, Skull Machine): only releases credited to the project count (e.g. HANDS UP, Save Me). Members' solo catalogs are not inherited.

## Matching and the review queue

One YouTube search per act plus one `videos.list` (1 general unit). Cloud Console shows this project's searches under a **separate limit of 100 Search Queries per day**, not the 10,000-unit pool; that act's captured songs are matched locally, so deeper rounds need no new search. Uploads over 12 minutes are ignored as sets.

| Status | Meaning | Default |
|---|---|---|
| matched | title agrees, artist/Topic channel, duration within 3 s | added |
| likely | title agrees; one weaker signal (label upload naming the artist, or duration off) | added |
| doubtful | possible other version or other artist | skipped |
| unmatched | no result had the title | skipped (information only) |

`review-queue.json` lists every non-matched song with a one-line reason. Owner decisions are optional: **approve** adds a doubtful match; **reject** skips a song and removes it if already added (50 units). Decisions live in `match-decisions.json` (`{"decisions": {"spotify:<id>": "approve" | "reject"}}`) on the `discovery/state` branch; the assistant syncs them from Notion. Doing nothing has no negative effect.

## Remaining execution (2026-10-30 stabilization)

Agent: codex. See [investigation and recovery contract](DISCOVERY-RESILIENCE-2026-10-30.md).

The workflow stays **manual**, on main, behind the existing `youtube-pilot` environment approval and both Cloud Console quota confirmations. Nothing is scheduled. No model is required to match, apply the selection policy, publish, save checkpoints, or verify ordered API read-back.

The verified state is **33 searched acts**, **68 private playlist songs**, and **73 remaining searchable acts** (106 catalog-bearing acts; seven deferred gaps). The pending count now considers every captured candidate, fixing the earlier first-three-only search eligibility check. Reuse all 282 captured Spotify candidates and the saved matching branch; do not rediscover catalogs.

For the fewest expected owner interventions, wait for a fresh quota day, check actual remaining Search and general quota, dispatch once, approve the environment, and let the workflow finish. At most 318 unique desired videos at three per eligible act implies at most **250 additional insertions / 12,500 write units**. With near-full 10,000 general units and 100 search calls, plan **two batches on separate quota days**: first finishes up to 73 act searches and roughly 190–196 insertions; second adds the remainder (roughly 54–60 at the upper bound). Actual matching/deduplication may reduce this to one batch. Transient retries consume search allowance; repeated provider limits, unexpected mutations, or read-back failures can require more. This is an estimate, not a promise of successful live completion.

[Run workflow](https://github.com/johnapaz/edc-listening-room/actions/workflows/discovery-playlist.yml) on main. Enter the actual remaining general and search counts from [Cloud Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas) with the correct project selected; never enter the daily limit unless it really remains. Confirm the private run and approve `youtube-pilot` when prompted. For a second publish-only batch, the search count may be zero **only after the summary reports zero remaining acts**. Otherwise supply the newly verified search remainder. Daily quota resets at midnight Pacific, per the official quota calculator; consult Console instead of estimating from local midnight.

The run summary reports status, remaining acts/additions/removals, completed writes, attempted operations (including failures), metered usage, provider status/reason and local checkpoint status. The save step separately reports the Git commit or push failure. A checkpoint artifact is uploaded before branch checkout. A successful paused run is progress, not completion. Finish when remaining acts, additions and removals are all zero, read-back is verified, and the checkpoint push succeeded. Uncertain matches are skipped automatically; owner playback remains optional for this private discovery release.

## Run log
- 2026-10-30 [41082487864](https://github.com/johnapaz/edc-listening-room/actions/runs/41082487864), main `ec52346` (merged #24): succeeded, 2 completed act searches, 3 attempts including HTTP 429; 33 searched acts persisted in `discovery/state` `c6d6c18`. Added 63 songs to the existing private playlist, **68 total, ordered API read-back verified**. Meter: **3,209 general units**; old publisher estimate: 3,151. The estimate omitted real reads/retries and is replaced by meter deltas. Exact historical operation breakdown and provider reason were not recorded, so cannot be reconstructed reliably. Stabilization work made no live YouTube calls, dispatches or Notion access.
- 2026-10-30 [41078697428](https://github.com/johnapaz/edc-listening-room/actions/runs/41078697428): after #23 merged (48 CI tests passed), matching stopped on `search.list` HTTP 429. **31 completed act searches / 99 match records were saved** at `discovery/state` commit `ebf7c65`; unlike the earlier save failure, these results are reusable. The failing next search makes **32 attempted search calls**; up to 31 general units for metadata reads (the old failure path did not emit exact counters). **Zero songs added**: publishing was never reached. The status split is 33 matched, 28 likely, 6 doubtful, 32 unmatched. Offline reconstruction yields 68 desired videos and 66 review records across 65 songs; these are candidates, not published/playback-confirmed songs. HTTP 429 establishes a provider limit response, not proof of daily quota exhaustion. No new provider request was made during this recovery.
- Recovery (Agent: codex): pause matching on search HTTP 429 without automatic retry, leave the failed act unsearched, then publish available matches within the declared general budget. Save review queue and attempted-request counters even on matching exceptions; log metered quota on publishing exceptions. Other HTTP failures still stop. Regression tests cover partial matching, no retry, publishing cached matches, zero-search resume, and non-429 failure.
- Optional review setup (Agent: codex): Tracks now has `Owner Review` (Approve / Reject; blank keeps the default) and `Match Issue`. [Optional Match Review](https://app.notion.com/21ef5883a05345f997eaead4d1cc33e4?v=4090e646ca0d8117b7bb000c963f9b0f) shows the 65 existing song rows with issues/defaults and candidate listening links; no owner decision was invented. State review records preserve both act associations for a shared song. Notion decisions are synced by the assistant, not a background integration; explicit decisions update their existing song keys, and blank means no override. Preserve unrelated decisions and matches when committing to `discovery/state`.
- 2026-10-30 [41075654729](https://github.com/johnapaz/edc-listening-room/actions/runs/41075654729): stopped in the offline test step (write gates leaked into tests); no API use. Fixed in #20.
- 2026-10-30 [41076203061](https://github.com/johnapaz/edc-listening-room/actions/runs/41076203061): 52 act searches ran (52 of the day's 100 Search Queries; the general pool showed only 1,022 units used for the whole day), the private playlist was created, then the first insert got HTTP 409 and the run stopped. The save step's `git add` included a not-yet-existing decisions file, so **the search results were not saved** and must be repeated. Fixed: 409 is retried like 404, and only existing state files are staged (verified against a scratch remote, both first-run and update cases).
- 2026-10-30: the owner's Cloud Console reading showed searches are a separate 100/day limit. The workflow now takes the remaining search count as its own input instead of charging 100 general units per search.
- 2026-10-30 [41077969247](https://github.com/johnapaz/edc-listening-room/actions/runs/41077969247): rejected at input parsing before any network call (no quota used): `8,978` was typed with Cloud Console's thousands separator. The count inputs now accept commas.

