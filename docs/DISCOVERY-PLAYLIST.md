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

One YouTube search per act (100 units) plus one `videos.list` (1 unit); that act's captured songs are matched locally, so deeper rounds need no new search. Uploads over 12 minutes are ignored as sets.

| Status | Meaning | Default |
|---|---|---|
| matched | title agrees, artist/Topic channel, duration within 3 s | added |
| likely | title agrees; one weaker signal (label upload naming the artist, or duration off) | added |
| doubtful | possible other version or other artist | skipped |
| unmatched | no result had the title | skipped (information only) |

`review-queue.json` lists every non-matched song with a one-line reason. Owner decisions are optional: **approve** adds a doubtful match; **reject** skips a song and removes it if already added (50 units). Decisions live in `match-decisions.json` (`{"decisions": {"spotify:<id>": "approve" | "reject"}}`) on the `discovery/state` branch; the assistant syncs them from Notion. Doing nothing has no negative effect.

## Daily run

[All-artist discovery playlist](../.github/workflows/discovery-playlist.yml) on `main`, environment-approved, once per quota day: today's remaining quota (never overstate) and `YES`. While unsearched acts remain, about 60% of the day goes to searches and the rest to adding songs; afterwards everything goes to adding. Matching state is committed to `discovery/state` even if publishing fails. Reruns resume safely.

Projected: ~105 searches (~10,600 units) and ~318 songs at 3 per act (~15,900 units), about three quota days.

## Run log
- 2026-10-30 [41075654729](https://github.com/johnapaz/edc-listening-room/actions/runs/41075654729): stopped in the offline test step (write gates leaked into tests); no API use. Fixed in #20.
- 2026-10-30 [41076203061](https://github.com/johnapaz/edc-listening-room/actions/runs/41076203061): about 52 act searches ran (~5,300 units), the private playlist was created, then the first insert got HTTP 409 and the run stopped. The save step's `git add` included a not-yet-existing decisions file, so **the search results were not saved** and must be repeated. Fixed: 409 is retried like 404, and only existing state files are staged (verified against a scratch remote, both first-run and update cases).
