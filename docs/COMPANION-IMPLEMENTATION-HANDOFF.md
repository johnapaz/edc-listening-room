# Event Day Companion — implementation handoff

Session 1 of 2 · October 31, 2026. Functional neutral preview; **no public release**.

## Run and release boundary

```
python3 scripts/build_companion_preview.py
# Serve only companion-preview/, never the repository root.
# Open /companion/ within that local/review artifact.
python3 -m unittest discover -s tests
node --test tests/companion.test.js
python3 scripts/build_current_lineup.py --check
python3 scripts/validate_current_lineup.py
python3 scripts/validate_edco_reference.py
```

The production command `scripts/build_public_site.py` still excludes every Companion asset and navigation link. An automated test verifies this exclusion. The explicit review builder produces `companion-preview/` containing the same sanitized shared data, unchanged Listening Room and five Companion files. `.openai/hosting.json` is ignored local preview configuration, not a registered Site. No new hosting or deployment.

## Architecture and replaceable interfaces

No framework or production dependencies. `companion/lib.js` is pure UMD logic; it reuses Listening Room's existing day keys, index/song grouping and route builder. `components.js` returns DOM Nodes/Fragments via safe text APIs. `app.js` owns async loading, history, focus, retry and composition. `styles.css` is explicitly temporary. There are no copied wireframe scripts or positions.

| Interface | Inputs | Output / responsibility |
| --- | --- | --- |
| `createIndex(perf, artists, venues, songs)` | sanitized schema-2 shared documents; songs array may be empty | maps of artists/stages/performances/sources plus shared music index; rejects unsupported schema and invalid joins |
| `query(idx, state)` | `{day, stage}`; day `all` or ISO event date; stage stable ID, `unassigned`, or empty for all | copied performance array: grouped by event date, sourced timestamps ascending, unknown time last then alphabetical |
| `hasTime`, `coverage`, `timeLabel` | performance or performance rows | source-grounded schedule availability, truthful coverage, Orlando clock labels including next-day midnight |
| `parseHash`, `buildHash`, `transition` | route/state/actions | stable encoded identifiers and day/stage context; no name searches |
| `DayPicker({state})` | current route | navigable day links retaining selection; focused day is retained on filtering |
| `FestivalMap()` | no usable geometry yet | explicit unavailable state; no map graphic or fake controls |
| `StageHotspot({stage,state})` | audited normalized point from `hotspots(venues)` | future positioned anchor; integration seam only, **not mounted** without supported geometry/representation |
| `StageList({idx,state})` | shared stages, day | five functional stage links, unassigned link and all-performance link; sourced-time counts |
| `StagePanel({idx,state})` | selection | heading, counts, schedule or an honest no-sourced-schedule state |
| `PerformanceSchedule({rows,idx,state})` | queried rows | day groups, sourced times, separate unknown-time lists, performance cards |
| `ArtistEntry({artist,state,role})` | stable identity, optional DJ/MC role | clickable individual artist link |
| `DetailView({idx,state,musicAvailable})` | artist or performance route | real identity/billing information, related current appearances, project members, direct Listening Room link or honest no-track state |
| `StateBox({title,message,kind,retry})` | text, empty/loading/error kind, optional callback | semantic status/error with working retry |
| `SourceNotice({idx})` | coverage and source dates | global provisional/incomplete/freshness notice |

Performance shapes: see [data contract](COMPANION-DATA-CONTRACT.md). A B2B is one `performance_id` with separate `artist_ids`; Skull Machine project members do not become solo bookings. Source timestamps and publication eligibility are independent of current-listing inclusion. Music remains reviewed discovery recordings, **not** a live setlist.

## Routes / navigation

- `#/explore?day=2026-11-07&stage=kinetic-field`
- `#/performance/{encoded performance_id}?day=…&stage=…`
- `#/artist/{encoded artist_id}?day=…&stage=…`
- `stage=unassigned` exposes every current appearance without a sourced stage.
- Empty stage means all performances. All days is the current neutral default.
- Day changes retain the stage. History stores route and scroll; browser Back/Forward and logical Back links restore context. Same-tab Listening Room links use its existing artist/performance ID route. Browser Back returns across products. No Listening Room source edits or new search guesses.
- Invalid stage/artist/route is a recoverable unavailable state. Missing music coverage does not prevent stage navigation. Required-data load/parse/schema/network errors have a bounded 15-second wait and retry; no offline guarantee.

## Claude integration: PR #73

Read `docs/companion-design/DESIGN-GUIDELINES.md` and `INTERACTION-CONTRACT.md` on `claude/eager-einstein-kkk330` / PR #73 (or main if later merged). Claude delivered design-only docs and wireframe. Its proposed accent and desktop 400px panel have not been approved in this implementation. Incorporate approved presentation in Session 2; keep pure query and ID contracts.

Integration review was posted on #73. Never port invented wireframe coordinates. Use **Time unknown / No sourced schedule**, because “not announced” would claim something the reference does not establish. Future authoritative status currently uses `verified`, not the proposal's `organizer_verified`. Inline public source metadata is available; do not fetch private source registry. Keep names intended as navigation clickable.

Known deliberate differences to resolve during design integration: our functional routes use `explore`/`performance`/`artist` rather than map/sheet parameters; day changes currently push browser history; details are pages rather than sheet bodies; day links use native navigation semantics. These are isolated in the router/controller/components. Route aliases and replace-on-day are possible without rewriting data/query logic. Do not remove working/deep-link behavior while restyling.

## Outstanding acceptance

- Geographic map/pan/zoom is **blocked** by missing independently supported positions and permitted original representation (#63). Five stages remain selectable in the fully functional list. StageHotspot is a tested future seam, not a completed map feature.
- Map-specific alignment, pinch/zoom, rotation and focus must be tested after real geometry is introduced.
- All 107 times remain poster transcriptions, not independently organizer-confirmed slots (#28). Source/freshness and qualifier changes must remain visible.
- Real-device Safari/Fold, VoiceOver and TalkBack still need human/device verification. Browser engine emulation and DOM/keyboard checks do not establish those passes.
- My Day (#66) remains deferred while P0 geometry/design/release acceptance are open. No user storage is created.
- Release remains separately authorized. No DNS, accounts, GPS, routing, walking metrics, notifications, API infrastructure, paid services or playlist changes.
