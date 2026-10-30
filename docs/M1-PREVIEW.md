# Private listening preview (unranked) — NOT an M1 pass

Status 2026-10-29. Separate deliverable from M1 acceptance (see PILOT-RESILIENCE-PLAN.md). No ranking, public release, bulk ingestion or Notion projection. Quota use this session: **0 new YouTube units**; paid services $0.

## Contract
`pilot/preview-tracks.json` is the review list (all `source_verified`/`human_verified` = false until reviewed). The workflow **Private listening preview** reads only `pilot/preview-approved.json` (does not exist yet), validated with `python -m edc.cli pilot-playlist --preview`:
- `source_ref {namespace: youtube-video, id}` must equal `video_id`; `version_note` and `source_verified=true` required; `human_verified=true` = owner inclusion approval; no rank/score; `recording_id`, if present, must be a real MusicBrainz UUID (never invented). Fields `source_verified`, `human_verified` and `owner_playback_confirmed` stay separate.
- A separate marker/title means the M1 playlist is never touched. Private only, ordered readback, writes gated as for M1.

## Shortlist (12 rows, all 8 artists)
| Artist | Track | Video | MB recording | State |
|---|---|---|---|---|
| Martin Garrix | Carry You | bz6taI5pDl0 | 269d5524 / NLM5S2402145 | strong, owner-played |
| I Hate Models | Daydream | U6EjUIefwiw | 913efff7 / ITDY21600111 | strong, owner-played |
| A Little Sound | Back To Back (B2B) | HYCG79PxgFc | a03b6af0 / GBCEN2300173 | strong; duplicate 487aebf5 unresolved |
| A Little Sound | Breathe | Rv550gn6y8k | none | **version unresolved** (213 s vs 217–218 s) |
| A Little Sound | Weed & Wine | _M5O_ED_1aI | de589bdc / GBPWR2200076 | needs owner playback |
| A Little Sound | Confide | WimivlmnA9I | 41296eed | needs owner playback |
| A Little Sound | Overload | 8I-QJlFSJdM | 13d4b9db | needs owner playback |
| KI/KI | 5 Mins Of Acid | wtnrLTqmUKI | f68a2298 / NLF712404789 (300 s) | strong, owner-played; 190 s edit 4659a2bc and dup 0da85e26 distinct |
| ACRAZE | Do It To It | bnA7yJkAG30 | 3fc73c64 / QZFPL2100100 | strong, owner-played |
| CID | Night Service Only | Scc4CRVroPo | none | source-ID only; extended mix d43a90a2 and radio episode NOT substituted |
| Vastive | Slaughter | Ve_LOVTzbxM | 4965aa1b / CA6D22400407 | strong; 3:09 vs 3:08 rounding noted, not audio proof |
| Benda | Poison Control | oXhWSs0mRH4 | a85eff19 / QM24S2203642 | video metadata + owner playback pending |

Other reviewed results: Die By My Hand original 4cc038db (CA6D22300080, 192 s) and LOUIEJAYXX remix 2e56736e are distinct; no video yet. Most of the other 38 searches yielded candidates without an inspected official video; they remain held for the full M1 review.

## I Hate Models identity
EXIT (organizer) identifies the artist as Guillaume Labadie; MB f9a4de7f has a Legal-name alias of that name. exitfest.org was unreachable from the assistant session, so that quote came from the handoff and is flagged for owner spot-check; the ihatemodelsmusic.com source is no longer relied on.

## Update after owner response
- MB-only recovery run [40966874986](https://github.com/johnapaz/edc-listening-room/actions/runs/40966874986): COLLECTION_COMPLETE, 41/41 recording searches, no provider errors, YouTube 0/0, writes 0, $0. The three Vastive results are in the run artifact; they do not affect the preview and are not yet reviewed.
- Owner played and approved inclusion of Weed & Wine, Confide, Overload and Poison Control. Poison Control still lacks fetched video metadata, so `source_verified` stays false for it. The other eight rows are not yet approved for inclusion (the eight played tracks and Breathe await an explicit answer).

## Update: inclusion approvals complete
Owner approved the eight already-played tracks plus Breathe (message: "Include all eight and Breathe; quota is 9,000 remaining"). All 12 rows now have `human_verified=true`; 11 have `source_verified=true`. Poison Control awaits exact video metadata (YouTube-only evidence run, 0 searches, ≤1 general unit, against the declared 9,000 remaining). Breathe and Night Service Only keep their version caveats; Breathe has no recording_id.

## Update: approved preview manifest
`pilot/preview-approved.json` now holds the 11 rows that are both `source_verified` and owner-approved, in lineup order. Validated offline by the CLI dry run (11 IDs, at most 620 general units) and by a test requiring every row to equal its `preview-tracks.json` entry. Poison Control (oXhWSs0mRH4) is held back until its exact `videos.list` metadata is reviewed; it is last in the review list, so it can be appended later without breaking the exact-prefix resume.

The approval commit (8186f9d, re-opened as PR #10 at 564f0d4) is merged into this branch, so either PR can merge first.

Nothing has been written to YouTube. Publishing still needs: this PR merged, a dispatch of **Private listening preview** on main with a fresh quota reading and `YES`, and owner environment approval. Readback is automatic; actual YouTube Music playback is a separate owner check afterwards.

## Update: first publish run failed after creating the playlist
Run [40969909301](https://github.com/johnapaz/edc-listening-room/actions/runs/40969909301) on ab723f2 created the private preview playlist, then stopped on `HTTP 404, playlistItems.list` when listing the brand-new playlist (YouTube propagation delay). No items were added. Estimated spend: about 52 general units (one playlists.list, one playlists.insert, one failed playlistItems.list); no searches, $0. The earlier run 40969382173 on ee3430a stopped before OAuth because that commit had no manifest.

Fix: a playlist created in the same run is treated as empty instead of listed, and only HTTP 404 on item inserts and read-back is retried after 2, 4, 8 and 16 s (a 404 applies nothing, so retrying cannot duplicate). Other errors still stop immediately. The next run should find the existing private playlist by its marker and resume from an empty prefix; if two marked playlists appear, the writer refuses and asks for manual reconciliation.

## Update: second publish run failed its read-back check
Run [41056777624](https://github.com/johnapaz/edc-listening-room/actions/runs/41056777624) on 7ba2f73 (owner quota reading 9,000) finished its inserts in about 7 s and then failed `Playlist read-back mismatch`. The log did not record the listing, so the playlist's actual contents are unconfirmed; the likely cause is the item listing lagging behind the inserts. Up to about 600 general units may have been spent; no searches, $0.

Fix: the read-back is retried after 5, 10, 15 and 30 s; resuming an existing playlist writes nothing unless two listings 10 s apart agree (so a stale listing cannot cause duplicates); counts and the first differing position are logged. Any unexpected state (duplicates, wrong order, two marked playlists) still stops with no writes.
