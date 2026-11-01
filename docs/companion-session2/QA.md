# Session 2 (lane A) implementation notes and evidence — November 1, 2026

**Disposition:** corrected design integrated into the functional `companion/` app as a **production-excluded review build**. This is **not** a completed geographic-map release and **not** release authorization. Implemented and tested by the same agent (Claude); this is not independent QA. Codex review of the exact head is requested in the PR.

Queue: [#77](https://github.com/johnapaz/edc-listening-room/issues/77) lane A · [#61](https://github.com/johnapaz/edc-listening-room/issues/61) · [#64](https://github.com/johnapaz/edc-listening-room/issues/64) · [#65](https://github.com/johnapaz/edc-listening-room/issues/65). Design inputs: [interaction contract](../companion-design/INTERACTION-CONTRACT.md), [design guidelines](../companion-design/DESIGN-GUIDELINES.md), [implementation handoff](../COMPANION-IMPLEMENTATION-HANDOFF.md).

## What changed

- **S10 gated Map tab.** The bare URL and `#/map` land on the stage list under "Map coming later" plus an organizer-homepage link. No map graphic, hotspot, map control, coordinate, copied artwork or GPS/route/offline claim is mounted. `StageHotspot`/`hotspots()` remain an unmounted seam that requires verified geometry.
- **Routes.** `#/map`, `#/stages`, `#/unscheduled`, `#/sources` (alias `#/about`) and `#/stage/{id}` (alias of `#/explore?stage=`) are new. Legacy `#/explore`, `#/artist/{id}` and `#/performance/{id}` links are unchanged. `#/map?stage=` redirects to the stage page, `?set=`/`?artist=` open the detail page, and an unknown stage on the map is ignored silently; all by **replacing** the history entry through the pure `resolveRoute()`.
- **Navigation.** Primary Map/Stages/About links (bottom tab bar on phones, header links ≥1100px) and the wordmark carry the day; Map returns to the last stage picked (in memory only). The skip link focuses `<main>` without changing the route.
- **Day switch** is four native links with `aria-current="true"`. There is no `aria-pressed` and no radiogroup anywhere (asserted by a browser test).
- **Set rows:** time column (next-day ends shown as "+1"), billing as plain sourced text, qualifier chip, status badge, a separate "Details" link and one mint "Hear {artist}" link per credited identity that has reviewed tracks. A shared status is spelled out once in the list header; rows whose status differs, or any row in a mixed list, spell out their own. Programs show "Program · no artist page" and never a link.
- **Detail (S5):** per-identity Listening Room links by stable ID only; "No reviewed tracks yet" plus a plain artist-page link; "Not on {day}" notice; a program explains why there is no artist page.
- **S6/S7/S8** (empty stage, unscheduled entries, Sources & About), a persistent live region for stage/day announcements, an honest offline status banner, and unchanged required-data failure with working retry.
- **Styling:** sibling tokens ("After Dark Atlas"), 44px targets, Fold-cover, phone, tablet, landscape and wide layouts, reduced motion. Measured contrast of every text and control-border token pair is ≥4.5:1 and ≥3:1 respectively.

## Provisional review defaults (not owner-approved)

1. **Violet accent** (`--violet` in `companion/styles.css`; the sodium-orange alternative is in the design notes). One token block to change.
2. **Wide layout.** No 400px side panel: a panel only makes sense beside a map. At ≥1100px a sticky 320px stage rail sits beside the schedule (`--rail-w`). Revisit when real geometry exists.

## Deliberate deviations from the design drafts (all reversible, isolated in components/CSS)

- The bare URL now lands on the Map tab (S1/S10). Full-lineup browser assertions moved to `#/explore`, unchanged.
- Billing text is no longer a link; "Details" is (with an `aria-label` naming the act). The contract specifies plain billing plus separate actions.
- B2B/alias performance pages offer one Hear link per credited identity instead of one link to the performance ID, per contract §2.
- Day links use `aria-current="true"` (previously `"date"`, which claims "today").
- No bottom sheet or map controls exist because there is no map.

## Evidence

Automated, on this branch's code: `python3 -m unittest discover -s tests` (101 pass, 1 existing live-integration skip, includes the production-exclusion test), Node tests (31 = 15 Companion + 16 Listening Room), `build_current_lineup.py --check`, `validate_current_lineup.py`.

Browser acceptance (`tests/companion_smoke.js`, Chromium locally; Chromium + WebKit in CI): all pre-existing assertions kept, with these selector changes only: full-lineup checks use `#/explore`; billing link `h3 a` → `.details-link`; unknown-stage row text now read from `.time`/`.set-stage`; the map-notice assertions run on `#/map`. New checks cover the gated landing, nav day/stage carry, route aliases and redirects, bad map stage, set deep link, S6/S7/S8, program slots, stable-ID-only Listening Room hrefs across views, per-identity Hear links, status vocabulary, no invalid pressed/radiogroup/nested-interactive semantics, live region, skip link, offline banner, and overflow plus 44px targets for every new view at 280, 320, 360, 844×390 and 1280.

Screenshots (Chromium emulation) are in [shots/](shots/); re-capture with `node docs/companion-session2/capture.js <dir>` after `python3 scripts/build_companion_preview.py`.

## Not verified / still open

- **WebKit was not run in the authoring environment** (only Chromium is installed there). WebKit results come from CI.
- **Real devices, VoiceOver/TalkBack, real browser zoom and landscape hardware** remain human checks (#67). Emulation and DOM/keyboard checks are not a screen-reader pass.
- **Map** (#63/#64): no verified positions or permitted representation, so map-specific acceptance (alignment, pinch/zoom, rotation, hotspot focus) is untested because nothing is built.
- **Schedule evidence** (#28): all 107 times are still poster transcriptions; nothing was upgraded.
- **My Day** (#66) not started; it must not delay P0.
- Public release, DNS and hosting are separately authorized and untouched.
