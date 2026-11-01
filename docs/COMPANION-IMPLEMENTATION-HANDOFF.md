# Event Day Companion — implementation handoff

Session 1 of 2 · October 31, 2026. Functional neutral preview; **no public release**.

> **Session 2 (November 1, 2026) update:** the corrected design is integrated; see [Session 2 notes](companion-session2/QA.md). Where this document still says presentation is temporary, routes are explore/performance/artist only, or the page is not yet styled, the Session 2 notes and the route list below win.

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

No framework or production dependencies. `companion/lib.js` is pure UMD logic; it reuses Listening Room's existing day keys, index/song grouping and route builder. `components.js` returns DOM Nodes/Fragments via safe text APIs. `app.js` owns async loading, history, focus, retry and composition. `styles.css` holds the sibling design tokens; the violet accent and wide layout are provisional review defaults. There are no copied wireframe scripts or positions.

| Interface | Inputs | Output / responsibility |
| --- | --- | --- |
| `createIndex(perf, artists, venues, songs)` | sanitized schema-2 shared documents; songs array may be empty | maps of artists/stages/performances/sources plus shared music index; rejects unsupported schema and invalid joins |
| `query(idx, state)` | `{day, stage}`; day `all` or ISO event date; stage stable ID, `unassigned`, or empty for all | copied performance array: grouped by event date, sourced timestamps ascending, unknown time last then alphabetical |
| `hasTime`, `coverage`, `timeLabel` | performance or performance rows | source-grounded schedule availability, truthful coverage, Orlando clock labels including next-day midnight |
| `parseHash`, `buildHash`, `transition` | route/state/actions | stable encoded identifiers and day/stage context; no name searches |
| `DayPicker({state})` | current route | navigable day links retaining selection; focused day is retained on filtering |
| `FestivalMap()` | no usable geometry yet | "Map coming later" state with organizer link; no map graphic or fake controls |
| `StageHotspot({stage,state})` | audited normalized point from `hotspots(venues)` | future positioned anchor; integration seam only, **not mounted** without supported geometry/representation |
| `StageList({idx,state})` | shared stages, day | five functional stage links, unassigned link and all-performance link; sourced-time counts |
| `StagePanel({idx,state})` | selection | heading, counts, schedule or an honest no-sourced-schedule state |
| `ScheduleList({rows,idx,state})` (alias `PerformanceSchedule`), `SetRow` (alias `PerformanceCard`) | queried rows | day groups, sourced times, separate unknown-time lists, set rows with status badge, Details and per-identity Hear links |
| `MapGatedView`, `StagesView`, `ExploreView`, `UnscheduledView`, `SourcesView`, `DetailView` | route state | the page for each view; `syncNav` keeps the primary navigation in step with the route |
| `ArtistEntry({artist,state,role})` | stable identity, optional DJ/MC role | clickable individual artist link |
| `DetailView({idx,state,musicAvailable})` | artist or performance route | real identity/billing information, related current appearances, project members, direct Listening Room link or honest no-track state |
| `StateBox({title,message,kind,retry})` | text, empty/loading/error kind, optional callback | semantic status/error with working retry |
| `SourceNotice({idx})` | coverage and source dates | global provisional/incomplete/freshness notice |

Performance shapes: see [data contract](COMPANION-DATA-CONTRACT.md). A B2B is one `performance_id` with separate `artist_ids`; Skull Machine project members do not become solo bookings. Source timestamps and publication eligibility are independent of current-listing inclusion. Music remains reviewed discovery recordings, **not** a live setlist.

## Routes / navigation

- `#/map` (also the bare URL): the S10 gated Map tab, the stage list under "Map coming later". `#/map?stage=…` redirects (replace) to the stage page; `?set=`/`?artist=` open the detail page; an unknown stage is ignored.
- `#/stages?day=…`: stage list. `#/unscheduled?day=…`: current appearances with no sourced stage or time. `#/sources` (alias `#/about`): labels, schedule sources and the map disposition.
- `#/explore?day=2026-11-07&stage=kinetic-field` (alias `#/stage/kinetic-field?day=…`): the stage or all-performances page. `stage=unassigned` exposes every current appearance without a sourced stage; empty stage means all performances. All days is the neutral default.
- `#/performance/{encoded performance_id}?day=…&stage=…` and `#/artist/{encoded artist_id}?day=…&stage=…`: detail pages (legacy links unchanged).
- Day changes replace the current history entry; other navigation pushes. History stores route and scroll; browser Back/Forward and logical Back links restore context. Selecting the already selected stage/day is a no-op. Primary navigation carries the day; Map carries the last selected stage. Same-tab Listening Room links use stable artist IDs only; there is no name-search fallback. Browser Back returns across products.
- Invalid stage/artist/route is a recoverable unavailable state. Missing music coverage does not prevent stage navigation. Required-data load/parse/schema/network errors have a bounded 15-second wait and retry; no offline guarantee.

## Claude integration: PR #73

Read `docs/companion-design/DESIGN-GUIDELINES.md` and `INTERACTION-CONTRACT.md` on `claude/eager-einstein-kkk330` / PR #73 (or main if later merged). Claude delivered design-only docs and wireframe. Session 2 integrated it (see the [Session 2 notes](companion-session2/QA.md)). The proposed violet accent is used as a **provisional review default**; the desktop 400px side panel was **not** built because there is no map to sit beside it (a stage rail plus schedule is used instead). Pure query and ID contracts are unchanged.

Integration review was posted on #73. Never port invented wireframe coordinates. Use **Time unknown / No sourced schedule**, because “not announced” would claim something the reference does not establish. Future authoritative status currently uses `verified`, not the proposal's `organizer_verified`. Inline public source metadata is available; do not fetch private source registry. Credited artist and project-member names stay clickable on detail pages; in set rows the billing is plain sourced text with a separate "Details" link, per the interaction contract (one-line change in `SetRow` if the owner prefers a linked billing).

Resolved in Session 2: the design routes (`map`, `stages`, `stage/{id}`, `unscheduled`, `sources`/`about`) exist beside the legacy `explore`/`performance`/`artist` routes through the pure router; details remain pages rather than sheet bodies (there is no sheet without a map); day links use native navigation semantics. Day changes replace the current history entry (as proposed in #73); selecting the already selected stage/day is a no-op. Do not remove working/deep-link behavior while restyling.

## Outstanding acceptance

- Geographic map/pan/zoom is **blocked** by missing independently supported positions and permitted original representation (#63). Five stages remain selectable in the fully functional list. StageHotspot is a tested future seam, not a completed map feature.
- Map-specific alignment, pinch/zoom, rotation and focus must be tested after real geometry is introduced.
- All 107 times remain poster transcriptions, not independently organizer-confirmed slots (#28). Source/freshness and qualifier changes must remain visible.
- Real-device Safari/Fold, VoiceOver and TalkBack still need human/device verification. Browser engine emulation and DOM/keyboard checks do not establish those passes.
- My Day (#66) remains deferred while P0 geometry/design/release acceptance are open. No user storage is created.
- Release remains separately authorized. No DNS, accounts, GPS, routing, walking metrics, notifications, API infrastructure, paid services or playlist changes.
