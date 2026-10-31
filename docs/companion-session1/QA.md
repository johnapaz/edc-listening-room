# Session 1 acceptance evidence — October 31, 2026

**Disposition:** usable functional review preview, production-excluded. Not a completed geographic-map release. Implementation and verification performed by the same agent; no independent-agent review claim.

## Verified result

- Data foundation merged in PR #72, main commit `bd97e0ea317a46bbe30d7f0ef19655b7ce5162cf`.
- Functional app and test work in PR #74, tested code head `64d239a81feabced916ef290769d3393cae49c5e` (later evidence-only commits do not change that code).
- 101 Python tests pass, one existing live-integration skip. Tests invoke both app logic suites. Separately confirmed 24 Node tests pass: 10 Companion + 14 Listening Room.
- Current projection `--check`, current validator and historical reference validator pass. 130 current appearances, 127 billings, 107 provisional poster times / 23 unknown stage/time, 43/43/44 by day. No current entries lost; historical-only evidence retained.
- [Final browser run](https://github.com/johnapaz/edc-listening-room/actions/runs/41235927853) passed. [Screenshots and results artifact](https://github.com/johnapaz/edc-listening-room/actions/runs/41235927853/artifacts/13055785465): 24 passing checks, 12 each in Chromium and WebKit, 16 viewport screenshots plus machine-readable results.
- Eight emulated viewport sizes per engine: 280×653 (Fold cover), 360×740, 412×915, 768×1024 (tablet/Fold open), 844×390 landscape, 1280×800, 320×640 and extreme 180×740. No horizontal overflow; tested day/stage controls have targets ≥44px. Reduced-motion browser preference used. 320 CSS px reflow is tested; actual browser 200% zoom remains a human/device check.
- Browser checks cover all four day filters; selected-stage persistence; time order; day history replacement; repeated-stage no-op; B2B and separate participant links; existing reviewed YouTube link; cross-product and logical Back; focus; keyboard activation/tab navigation; CASA no-schedule state; unassigned appearances; malformed stage/artist links; optional music failure; required-data failure and working retry; CSP/script errors; absence of fake map controls.
- The test server applies the production CSP/security headers and blocks provider traffic. No provider/playlist writes, credentials, analytics or deployment. Thumbnail fetching/playback is not part of this acceptance claim.
- Cloud Browser manually verified Friday kineticFIELD → Saturday retains stage → CID individual artist → existing Listening Room artist page and exact reviewed YouTube link → Back → same Companion day/stage. Also verified keyboard activation of CASA BACARDÍ and truthful empty copy. [Captured review screenshot](preview.jpg).

## Failures found and fixed

1. First browser run found an overflowing stage heading at 180px. Fixed by allowing text wrapping, without clipping/hiding overflow. Both engines now pass all sizes.
2. Failure-simulation test initially changed only the hash, reusing in-memory data instead of requesting mocked failures. Corrected to reload before those scenarios; required/optional failures and retry now pass.

## Live in the review artifact versus placeholders

Functional: five-stage list, unassigned/all-performance views, day filters, real schedules with caveats, performance details, individual artist details/project members, shared Listening Room links, history/focus, loading/error/retry, responsive neutral presentation. No login. No My Day storage.

Temporary: visual styling, page-oriented detail containers and `FestivalMap` unavailable presentation. `StageHotspot`/normalized geometry utilities are a future integration seam; no hotspot is mounted and no geographic map/pan/zoom is implemented. The explicit lack of geometry is visible, not a fake map.

## Open release risks and Session 2

- #63: independently supported positions and a permitted original representation are still missing. No organizer artwork copied/hotlinked/traced. All five source coordinates remain null. Do not port the invented PR #73 wireframe positions.
- #28: no slot-by-slot live organizer confirmation of the 107 poster transcriptions. Qualifier changes and earlier disagreements remain visible. This is an incomplete dated reference, not a complete/confirmed timetable.
- #61 / PR #73: design exists; proposed violet accent and 400px desktop panel are awaiting owner review. Status/source corrections are posted on that PR. Implement approved presentation through documented component interfaces; do not depend on further Claude coding or continued quota.
- #67: real devices, VoiceOver/TalkBack, real browser zoom and final approved-design/map acceptance remain outstanding. WebKit tests are not an iPhone or screen-reader sign-off.
- #66: My Day remains P1/deferred; preserve P0 quality.
- Production builder still excludes Companion assets/links, verified by automated tests. Public release needs separate authorization, and any source/rights limitations must be resolved or explicitly accepted for the release scope.

Two sessions remain realistic for a polished functional stage/day/artist Companion using the supported list fallback. A geographic map is conditional on obtaining auditable positions and a permitted representation, not engineering effort alone. If those stay unavailable, document the blocked map scope rather than claiming full map P0 completion.
