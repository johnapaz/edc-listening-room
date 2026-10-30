# EDC Orlando 2026 reference pack

Checked **2026-10-30** against organizer pages and the six owner-supplied screenshots. Independent, unofficial reference; lineup and event information can change.

Start here when building the Event Day Companion or resolving a lineup name. Read local files before repeating web, MusicBrainz or YouTube searches. This pack adds reference data; it does not change the pilot, its approvals, or live playlists.

| File | Use |
|---|---|
| [LINEUP.md](LINEUP.md) | Complete, readable lineup by day, with conflicts flagged |
| [performances.json](performances.json) | 108 performance/program rows: 36 per day; includes 8 B2Bs |
| [artists.json](artists.json) | 116 named act/participant entities, including the two explicitly named Skull Machine members; **not 116 verified legal identities or independent bookings** |
| [schedule.csv](schedule.csv) | Flat companion seed, one row per performance; times/stages currently empty |
| [event.json](event.json) | Dates, timezone, venue, daily opening/closing, last entry and box-office hours |
| [venues.json](venues.json) | Five organizer-listed stages, official map asset, legend and visible zone labels |
| [sources.json](sources.json) | Attribution, screenshot hashes, source conflict and normalization decisions |
| [sources/](sources/) | Separate lineup text extraction and poster transcription, preserving the discrepancy |
| [music-lookup-index.json](music-lookup-index.json) | Searchable pointers to 8 pilot identities, 41 song candidates and 12 known videos; 12 are in the approved preview manifest (11 published; Poison Control appended 2026-10-30, not yet published) |
| [evidence/](evidence/) | Recovered final 3 MusicBrainz searches and Benda video metadata from completed Actions artifacts; **unapproved evidence** |
| [Claude handoff](../../docs/EDCO-2026-HANDOFF.md) | Current project assessment, remaining gates and the next bounded work |

## Lineup conflict that text-only readers miss

The official poster in both supplied lineup screenshots lists **Josh Baker**, **Prospa**, and **Prospa B2B Josh Baker** on Friday. The live page's text list repeats Josh Baker and omits both Prospa entries. The live page links the same poster asset. Preserve the union with an explicit conflict; do not silently decide the poster or text is newer. There are **108 distinct rows in this reconciled reference**, not a claim of 108 independently scheduled sets.

`lineup_status=official_sources_conflict` and `issue_ids=["lineup-prospa-josh-baker"]` mark these three rows. The duplicated HTML Josh Baker is recorded in the raw text snapshot, not modeled as a second solo set. Resolve all three against the official timetable or a newer organizer announcement.

## Schedule contract

Only **day assignments** are verified. No artist start/end times or stage assignments were verified in the checked sources. The organizer FAQ says timetables appear on the site, official social channels, app and email in the days before the festival. This is a dated observation, not proof the app has no timetable.

- `starts_at`, `ends_at`, `stage_id`, and `schedule_source_id` stay JSON `null` until sourced. CSV represents null as an empty cell.
- `source_order` preserves the lineup listing order, **not performance order, popularity or a timetable**.
- Sunset/Wholesome Riddim labels are qualifiers. A sunset label never supplies a clock time.
- Use `America/New_York`. All three festival dates are UTC−05:00. Event closing midnight belongs to the **following calendar date**; Sunday closes `2026-11-09T00:00:00-05:00`.
- When official times appear, match the full billing (including B2B/project/qualifier), preserve `performance_id`, populate offset-aware ISO timestamps and `stage_id`, add the dated official source, then change the row's schedule status. If evidence establishes a second appearance, create a separate performance ID.
- Show “Time TBA”/“Stage TBA” when unknown. Do not offer “playing now,” clash detection or walking-time guidance from this seed.
- Keep the three source-conflict rows visibly flagged until resolved. Do not infer artist-stage assignments from genre or map position.

## Artist and performance identity

`artist:*` and `edco26:*` are stable **local** identifiers, not provider IDs. Keep punctuation and accents in `display_name`; slug IDs are just join keys. Existing identity reviews are linked rather than copied or reapproved.

B2Bs are one performance with two artists. Skull Machine stays a project with Black Tiger Sex Machine and Kai Wachi as members; that does not make their complete solo catalogs eligible. Fury and MC Dino have DJ/MC credit roles. AR/CO and Miguelle & Tons remain named acts; ampersands/slashes do not justify splitting. Discovery Project is a program slot, with no fabricated catalog artist. Promotional “YOU” is excluded.

## Reuse song work before searching

1. Search `music-lookup-index.json` by exact artist/title or video ID. Follow its repo-relative JSON references (paths are relative to repository root).
2. Read **current** `pilot/preview-approved.json` for preview authorization and `pilot/preview-tracks.json` for version/playback caveats. The index itself grants no approval and is not accepted by a publisher.
3. Read `pilot/identity-review.json`, `pilot/recording-candidates.json`, `pilot/evidence-reviewed.json`, then the recovered evidence in this pack. Existing `pilot/evidence-checkpoint.json` holds 38 recording searches; the recovered delta supplies the final three. Together they cover the completed 41 searches without contacting MusicBrainz again. A completed search can have **zero** results and is not a verified recording.
4. Review the recovered **Poison Control** metadata before considering another YouTube lookup. That completed metadata run returned the exact video; it is absent from the approved preview manifest pending review, not absent from the provider response.
5. Only enqueue genuinely missing work. When known video IDs need current metadata, use a bounded `videos.list` batch rather than rediscovering IDs through search. API metadata does not establish YouTube Music playback.

No whole-lineup catalog ingestion is authorized by this pack. Existing $0 and M1 gates remain. The Notion Artists database was queried on this date and contains **only eight pilot rows**, not the full roster. Its five missing MBIDs are projection lag; consult repo reviews first.

The index records source-file hashes so drift is detectable. If a source changes, follow the current source row; do not treat an old index's manifest pointer as current approval. Recovered YouTube metadata is dated **2026-10-29**, not a fresh provider request on the recovery date. Refresh/delete it by **2026-11-28** under the applicable [YouTube storage policy](https://developers.google.com/youtube/terms/developer-policies#e.-handling-youtube-data-and-content). This pack does not establish indefinite API-data retention.

## Offline validation

From repository root:

```sh
python scripts/validate_edco_reference.py
```

Checks lineup coverage against both source snapshots, identity/credit references, the CSV projection, null schedule fields, timezone/midnight handling, indexed references, and recovered request identities. It makes no network requests or external changes.

The official map remains linked to the organizer-hosted asset. Labels are transcribed for lookup; no coordinates, routes, walking durations, accessibility claims or live amenities status have been invented. Check organizer updates before relying on dated event information.
