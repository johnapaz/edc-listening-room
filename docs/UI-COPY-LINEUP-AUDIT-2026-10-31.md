# Listening Room UI and lineup audit — October 31, 2026

Owner requested a practical copy/UX revision and a fresh verification of the artist lineup. This pass uses Claude’s findings in PR #47 and the current organizer page at https://orlando.edc.com/lineup/.

## Lineup result

The current official day lists contain **130 appearances: 43 Friday, 43 Saturday, 44 Sunday**, representing **127 distinct billings**. The old public artifact contained 110 rows. This projection adds 23 missing day-specific appearances and stops presenting 3 historical-only billings as current. No cancellation is inferred.

- Current source snapshot: `data/edco-2026/sources/lineup-text-2026-10-31.json`.
- Current projection: `data/edco-2026/current-lineup.json`; reproduce with `python3 scripts/build_current_lineup.py --check`.
- Historical snapshots and `performances.json` remain unchanged. Their 110 rows are archival evidence, not the public lineup.
- Stable IDs and same-day poster times survive matched billings. New appearances have no invented stage or time. Poster-derived times remain explicitly provisional; this review does not independently verify the festival’s live timetable.
- Public build and About pages use the same current projection. Raw source snapshots, historical records and private Notion fields remain outside the public artifact.

### Missing appearances added
- Friday: 2AR
- Friday: Chantel Jeffries
- Friday: Crespo
- Friday: Eve Lauren
- Friday: Kashovski
- Friday: Me n ü
- Friday: Night Tales
- Friday: Seeing Double
- Saturday: Allnightkev
- Saturday: CC Love
- Saturday: JFUSE
- Saturday: Juos
- Saturday: Landis
- Saturday: RAJE
- Saturday: Rommii
- Sunday: Alves
- Sunday: Andrea Quintero
- Sunday: BROSA
- Sunday: Bryan Softwell B2B Chini
- Sunday: Joe Vanditti
- Sunday: Kofla
- Sunday: Marian (BR)
- Sunday: William Kiss

### Historical-only billings excluded from the current app
- Friday: Prospa
- Friday: Prospa B2B Josh Baker
- Saturday: Max Dean B2B Luke Dean

### Current billing wording
- Brunello (Sunset Set) → Brunello
- Obskür → Obskûr (Sunset Set)
- Rossi. (Sunset Set) → Rossi.

## Copy and interaction changes

Replace promotional slogans with the event, date and direct instructions. Search has a visible label; a shareable With tracks filter exposes the available music without opening empty artist pages. Default lineup has day headings, source check date and caveated poster times. Search results do not repeat featured cards. No unpublished-playlist card interrupts the lineup.

Artist-row images and arrows consistently open the act; duplicate decorative links leave the keyboard tab sequence. YouTube buttons name the exact track and artist for screen readers. Missing-track pages use a compact image and link to available tracks. Native 16:9 YouTube medium thumbnails avoid adding letterboxing or cropping the original image. Header help, root-fragment forwarding and social metadata address Claude’s launch findings.

The help guide now links directly into current app views rather than showing stale UI screenshots. Its historical screenshot source files are retained for recapture, not presented as current evidence. Counts are generated from data. The actual track coverage is 12 recordings across **8** artist identities; the previous README count of 9 was incorrect.

## Verification

88 Python tests (1 pre-existing skip), 12 Node checks, the historical reference validator, the current source projection check, and the public file/field allowlist pass locally. Live UI verification and final deployment commit are recorded in the implementation PR after deployment. Real-device and screen-reader testing are not claimed.
