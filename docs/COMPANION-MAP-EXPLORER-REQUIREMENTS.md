# Event Day Companion — Map Explorer requirements

**Owner approval:** October 31, 2026. **Status:** scope approved; design details and implementation not yet complete.  
**Parent:** [#29](https://github.com/johnapaz/edc-listening-room/issues/29). **Milestone:** D2 — Festival companion ready.  
**Product boundary:** Event Day Companion is the separate festival navigation/planning product. **Listening Room** remains the named music-discovery product. Neither is being renamed. This approval does not authorize public Companion deployment, playlist changes, new paid services or bypassing release gates.

## 1. Job and deliverable

An attendee can explore a graphical festival map, tap a stage to reveal its participating artists and scheduled sets, filter by All / Fri / Sat / Sun, follow any artist to Listening Room, and return without losing context. Other sourced points of interest (water, restrooms, entrances) may reveal useful location-specific information where verified. Every critical function also works without interacting with a graphical map.

**Primary journey:** Open without login → choose Friday → select kineticFIELD on map or accessible stage list → see only sourced Friday sets in time order, with confidence labels → select an artist → open their existing Listening Room page and verified listening links → Back restores day/stage. Switching to Saturday does not clear the selected stage.

## 2. P0 — must-have Companion experience

- **Map:** Mobile-first pan/zoom, reset and accessible named hotspots on verified stages; selectable stage persists across day changes. Geometry must scale correctly at phone, Fold, desktop and rotation/zoom sizes. Other map objects are interactive only when their location and content are verified. Display unofficial attribution, map provenance and source checked date. Link to the organizer homepage; only deep-link to the official map if permitted by applicable terms.
- **Stage detail:** Stage name, day filter (All/Fri/Sat/Sun), real chronological set order *only when sourced*, displayed start/end times and source status. Preserve B2B billings, special-set qualifiers and project/performer distinction. One set may relate to multiple artist identities.
- **Truthfulness:** Distinguish organizer-verified, poster-transcribed/provisional, missing, disputed and historical/unmatched records; don't invent stage, times, schedule order, walking distances or availability. Even stages without assigned sets (including CASA BACARDÍ if still unscheduled) remain selectable with an explicit no-confirmed-schedule state.
- **Discovery links:** Artist names/images where applicable open meaningful artist info and the existing Listening Room artist view. Reuse stable IDs/validated songs; listening tracks are *not* the expected live setlist. No second artist/music catalog, OAuth or sign-in.
- **Navigation:** Map ↔ stage sheet ↔ artist ↔ Listening Room; preserve day, selection and Back/deep-link context. Include an accessible stage/schedule list with equivalent behavior for keyboard, screen reader and people who cannot navigate a map.
- **Quality:** Good touch targets, focus management, reflow/contrast/reduced motion; readable empty/loading/failure/weak-signal states. Never claim offline functionality without offline cache testing.
- **Budget:** Reuse static site + shared JSON records, no paid services. The first Companion release is not a native app.

## 3. Source-of-truth reconciliation — P0 dependency

Current project sources as checked October 31, 2026 are distinct, **not directly comparable**:

| Reference | Meaning |
| --- | --- |
| data/edco-2026/current-lineup.json | **130 current day-list appearances** (43 Friday, 43 Saturday, 44 Sunday) and **127 distinct billings**, from freshly checked organizer lineup text |
| data/edco-2026/performances.json and schedule.csv | **110 historical/reconciled performance rows**, with **107 poster-transcribed slots** (35/36/36) across four pictured stages; three older disputed entries unscheduled |
| data/edco-2026/venues.json | Five stage IDs including CASA BACARDÍ; **no established map hotspot coordinates** |

Follow [#28 — schedule data](https://github.com/johnapaz/edc-listening-room/issues/28) and [#62 — Companion projection](https://github.com/johnapaz/edc-listening-room/issues/62) to join these into **one validated, public-safe Companion projection**. Preserve both source histories, stable performance/artist/stage IDs, source URLs and verification dates, field-level confidence/publication eligibility and explicit unmatched current entries. A poster transcription is provisional until organizer confirmation. Never discard an updated current billing because an older poster lacks it, or infer that an old slot belongs to a new billing.

Use festival-local America/New_York date/time, which is UTC−05:00 over November 6–8, 2026. End-of-night midnight belongs to the next calendar date. Leave unknown times null. Ensure automated checks cover B2B identity, source corrections, status labels, day/stage/time boundaries and missing data.

## 4. Artwork rights and map geometry — P0 gate

The official map URL stored in venues.json is a reference, **not a grant to reproduce, hotlink or adapt copyrighted artwork**. [#63](https://github.com/johnapaz/edc-listening-room/issues/63) must establish allowed use with evidence. If rights are unclear, create an **original, independently styled schematic** from verified locations, attribute sources and link to the organizer homepage (or deeper official map only with permission) instead; no copied art/logos or implied organizer affiliation.

**Initial rights check (2026-10-31):** [Insomniac Terms of Use](https://www.insomniac.com/terms-of-use/) restrict reproducing/adapting/displaying site artwork, framing/mirroring and deep links. As a conservative engineering baseline, do not embed/hotlink/trace official map art or deep-link to the map without permission. Work from independently supported geographic facts in an original visual treatment; #63 records the evidence.\n\nProvide auditable normalized hotspot coordinates keyed to stable stage IDs. Test spatial alignment during pan/zoom/reflow. Do not claim GPS precision, accessible routes, walking times, or that amenities are open or operational. If geometry cannot be verified, use an accessible stage list plus a permitted organizer-homepage link and mark the interactive map release blocker rather than guessing.

## 5. P1 — approved direction, not a blocker for first map release

**My Day:** save/unsave a specific performance, see picked sets grouped by day/time, return to its stage, and detect real time overlaps when schedule evidence supports them. Browser-local only; explain that clearing browser data may erase picks, and no device sync exists. Unsourced/uncertain time produces an explicit limitation rather than a fabricated clash. Track separately in [#66](https://github.com/johnapaz/edc-listening-room/issues/66).

Do **not** delay P0 to add My Day.

## 6. Deferred

GPS positioning and blue dot, route optimization, walking-time estimates, crowd density, real-time facilities/occupancy, push reminders/geofencing, native apps, shared itineraries, authenticated accounts, public API, write access to playlist services, paid map services, and organizer affiliation/trademark usage. Later work needs its own decision.

## 7. P0 acceptance checklist

- [ ] No-login phone user sees a workable festival map and clear official/unofficial distinction.
- [ ] Stage click → Friday sets in sourced time order; switch to Saturday with stage selection intact; All/Fri/Sat/Sun filters and Back work.
- [ ] B2B/special-set credit and artist IDs survive. Artist opens Listening Room and vetted tracks without calling them a festival setlist.
- [ ] All five sourced stages are exposed, including unscheduled stages with honest empty states.
- [ ] Current-lineup entries not on historical posters remain discoverable and **not falsely scheduled**.
- [ ] Provisional and conflicting schedule sources are visibly identified, with source freshness.
- [ ] Stage/list alternative accomplishes the same flows by keyboard and screen reader. Test phone, Fold, wide view, zoom, rotation, reduced motion and touch.
- [ ] Source unavailable, map failure, bad network, missing artist/track and stale records fail gracefully; no fictional offline guarantee.
- [ ] Map rights/geometry verification and public-data allowlist pass. No login, tracking, paid API, unauthorized playlist write or Listening Room regression.
- [ ] Reviewable implementation and QA evidence exist. **Separate owner authorization is required for public Companion release.**

## 8. Division of work, start order and clean breaks

| Sequence | Issue | Work owner | Deliverable / dependency |
| --- | --- | --- | --- |
| Start now, parallel | [#61 — interaction wireframe](https://github.com/johnapaz/edc-listening-room/issues/61) | Claude / design | Map, stage sheet, day filter, link and accessible-list interaction contract; design closeout |
| Start now, parallel | [#62 — current schedule reconciliation](https://github.com/johnapaz/edc-listening-room/issues/62), alongside [#28](https://github.com/johnapaz/edc-listening-room/issues/28) | Codex / data | Validated current appearances and provisional timed sets joined by stable IDs |
| Start now, parallel | [#63 — artwork/geometry rights](https://github.com/johnapaz/edc-listening-room/issues/63) | Codex / evidence; Claude / original map asset as needed | Publishable map representation, verified hotspots |
| After design/geometry contract | [#64 — clickable map UI](https://github.com/johnapaz/edc-listening-room/issues/64) | Claude / implementation | Responsive map shell, selection/navigation/accessibility |
| After design/data contract | [#65 — stage/day/artist integration](https://github.com/johnapaz/edc-listening-room/issues/65) | Claude / implementation | Stage/day schedules, confidence, music deep links |
| Plan alongside, execute after P0 | [#67 — independent acceptance](https://github.com/johnapaz/edc-listening-room/issues/67) | Codex / QA; Claude fixes | Device, source, rights, accessibility and deployment gates |
| P1, optional after P0 | [#66 — My Day](https://github.com/johnapaz/edc-listening-room/issues/66) | Claude / implementation | Locally saved performance plan, overlap warnings |

**Working limit:** One design thread plus data/rights verification at first; coordinate frontend integration instead of running competing implementations. Each implementation issue produces a reviewable PR and tests. Claude implements, Codex maintains evidence/governance/independent QA. The approved scope is not carte blanche to deploy or modify unrelated Listening Room functionality.

**Clean break:** #61 ends with a reviewable UX contract; #62/#63 establish data/rights gates; #64/#65 end with integrated preview evidence; #67 records acceptance and release blockers. The user already approved the described P0/P1 split; significant additional product choices still need explicit review.
