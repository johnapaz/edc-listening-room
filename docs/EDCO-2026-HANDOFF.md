# Claude handoff — lineup, companion seed and lookup reuse

As of **2026-10-30**. Baseline reviewed: main `af92be853f4fddf12b442798b3dded9e40f7cd46` (PR #14 merged). Reference-pack work is isolated from the pilot publisher, workflow configuration, approvals and Notion records.

## Begin here

Read [data/edco-2026/README.md](../data/edco-2026/README.md), then use the JSON/CSV directly. This resolves the image-only lineup lookup problem and preserves a real organizer-source conflict: Friday's poster includes Prospa and Prospa B2B Josh Baker; the HTML text omits them and duplicates Josh Baker. Three rows remain flagged. Do not silently publish them as a finalized timetable.

There are 108 distinct lineup reference entries, 36 per day, with B2B/project/MC credits and source attribution. Stage/time fields are deliberately unknown. Five stage records and the official 2026 map link/legend are ready for companion use. The festival runs November 6–8, 13:00 through next-day midnight in America/New_York.

## Project assessment

| Area | Observed state | Implication |
|---|---|---|
| Private listening preview | PR #14 records 11 videos, exact ordered readback, private; Actions run 41056777624 attempt 2 is successful | Real output exists. Do not recreate the playlist. Full-playlist owner playback remains open in the committed record. |
| Full M1 | Preview docs explicitly say it is not an M1 pass | Ranking/licensing, complete recording/version review, Notion projection/idempotence and owner playback remain gates. No bulk ingestion/public release unlocked. |
| Existing music work | 8 identity reviews, 41 source-listed recording candidates, 12 known video IDs, 11 approved preview rows | Reuse the new lookup index and original evidence. Do not redo first-pass searches or repeat recorded owner approvals. |
| Evidence recovery | Final MB run 40966874986 completed all 41 searches; committed checkpoint still has 38 | Three exact request/response entries are now saved under `data/edco-2026/evidence/`, including an empty result. They are evidence, not match approval. |
| Benda | Run 40968098075 already returned metadata for oXhWSs0mRH4 | “Needs fetched metadata” is stale. Recovered row shows Poison Control, Benda - Topic, 2:39, Stem distribution, processed/public/embeddable; review exact version/credits before changing the manifest. |
| Notion | Artists database currently returns 8 rows, has_more=false; 5 lack MBIDs | The database exists but full-roster import never happened. Repo reviews are ahead of the projection. Read repo evidence before researching identities again. |
| Companion | No companion application found in baseline tree | This pack is a data foundation, not a deployed app. No verified set times were found in checked official web sources. |
| Verification | All 32 existing offline tests pass | No application/workflow changes in this pack. This was a bounded status/data review, not a full code audit. |
| Status documents | README/M1 and older appended updates contain historical “not created yet” statements | README corrected; use the latest dated result in M1-PREVIEW plus this evidence handoff, rather than rerunning work from obsolete status text. |

## Recovered evidence and why it matters

- [MusicBrainz delta](../data/edco-2026/evidence/musicbrainz-delta-40966874986.json): the three missing request hashes from completed run 40966874986. **Under My Skin** has two candidate MBIDs with matching duration/credits (SLANDER, Spiritbox, Vastive), **Barking At Thunder** returns zero recordings, and **Cut** returns a Vastive/FelMax candidate. Review duplicates/credits; never call an empty search a successful match.
- [Benda metadata](../data/edco-2026/evidence/benda-video-metadata-40968098075.json): selected exact fields from `/youtube/existing_videos/items/11` in run 40968098075's report. The report is COLLECTION_PARTIAL because it is YouTube-only and inherits the old 38-search MB checkpoint; that does not erase its successful 12-video metadata response. US and PR appear in the allowed-region list; this still does not prove owner/account playback.
- Both artifact ZIP SHA-256 digests were checked against GitHub's artifact metadata before extraction. Files record run/artifact/member provenance and the original member checksum. No OAuth, MusicBrainz or YouTube request was made during recovery; no new quota spent. Artifacts expire November 5, so keeping the relevant delta locally removes another time-dependent lookup.

## Next bounded work, in order

1. Read current main/open PRs before editing; preserve Claude's active work and the existing preview playlist. Use feature branch → reviewed PR; owner merges under current project policy.
2. Review the recovered Benda response against its existing recording evidence and recorded owner approval. If justified, prepare the single append to the preview as a separate ordinary reviewed change; do not repeat the metadata workflow just because older prose says it is pending. Any live write still needs the existing protected-main workflow and current quota/owner approval.
3. Record the owner's full-playlist playback result when provided. A generated playlist and API readback are not a playback test.
4. For M1 recording review, consume the recovered MB delta alongside the existing checkpoint. Only if a later approved collector change is necessary, merge requests by their existing `edc.evidence.request_key` hash and preserve provenance; do not replace or reset the checkpoint blindly.
5. Build the companion's day browsing/favorites against the seed if that feature is authorized. Timed views must wait for actual official timetable evidence. When a timetable arrives, update existing performance IDs, record source/timestamp, resolve the three conflict rows and validate midnight/timezone handling.
6. Close the remaining M1 gates before catalog expansion. For later artist research, work once per stable artist ID, then reuse identity and exact recording/version evidence across playlists and B2Bs. A reviewable missing-work queue is the useful next improvement; expanding full catalogs is not this reference task.

## Session boundaries

This session made reference/documentation additions plus a README status correction. No new catalog ingestion, Notion write, playlist change, paid service, OAuth change, API workflow dispatch, auto-merge, companion deployment or altered acceptance gate. No secrets were read. Original screenshot binaries and private credential records were not added to the public repository.
