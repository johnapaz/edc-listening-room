# EDC Orlando 2026 reference pack

Checked **2026-10-30** against organizer pages and the six owner-supplied screenshots. Independent, unofficial reference; lineup and event information can change.

Start here when building the Event Day Companion or resolving a lineup name. Read local files before repeating web, MusicBrainz or YouTube searches. This pack adds reference data; it does not change the pilot, its approvals, or live playlists.

| File | Use |
|---|---|
| [LINEUP.md](LINEUP.md) | Complete, readable lineup by day, with conflicts flagged |
| [performances.json](performances.json) | 110 preserved performance/program rows; 107 assigned times from newly supplied posters and 3 unresolved older lineup entries |
| [artists.json](artists.json) | 116 named act/participant entities, including the two explicitly named Skull Machine members; **not 116 verified legal identities or independent bookings** |
| [schedule.csv](schedule.csv) | Flat companion seed, one row per performance; stage/time transcriptions for 107 pictured performances; 3 older entries stay blank |
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

**Dated update (October 30, 2026):** Owner supplied three organizer-branded daily set-time posters after the earlier day-only audit. We transcribed 107 pictured performances (35 Friday, 36 Saturday, 36 Sunday) at four stages into the same stable-ID dataset, with `schedule_status=poster_transcribed`, `schedule_source_id=set-times-posters-2026-10-30`, and timezone-aware start/end values. These screenshots are direct provided evidence; they have **not** been independently verified from the organizer's live site/app. Recheck for changes. The organizer FAQ says timetables appear on the site, official social channels, app and email in the days before the festival. This is a dated observation, not proof the app has no timetable.

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

## October 30 set-time poster reconciliation (provisional source)

- **Friday:** poster adds Obskür (neonGARDEN 18:00–19:30). Neither Prospa nor Prospa B2B Josh Baker appears in the four-stage timetable; both older lineup entries are retained without a time. Solo Josh Baker appears at neonGARDEN 22:30–00:00.
- **Saturday:** newer poster has **Luke Dean B2B George Smeddles (Sunset Set)** at neonGARDEN 17:30–19:00 rather than earlier **Max Dean B2B Luke Dean**. New ID and artist relation created; older billing is retained, unscheduled and flagged. No cancellation inferred.
- **Sunday:** all 36 original performance/program rows have poster times.
- **Scope:** four pictured stages only; no CASA BACARDÍ or other unpictured-area timetable. The image does not establish whether these schedules are final. Source image SHA-256 digests are in `sources.json`; branded artwork is not redistributed.
- **Validity:** CSV and JSON are a synchronized projection. 00:00 is the next date at UTC−05:00. Sunset titles are set qualifiers, **not** astronomical assertions. Keep the three unresolved old lineup entries visibly unassigned until confirmation.
- **Downstream:** Companion issue #29 may consume these sourced times; no UI implementation is authorized by this data-only change. Notion Performances projection remains a follow-on and must upsert by stable performance ID, without inventing a different source of truth.
