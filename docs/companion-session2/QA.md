# Session 2 (lane A) implementation notes and evidence — November 1, 2026

**Design review R1 update (PD-2/3/4), code `cb8947d`:** the Map tab is removed and the landing is Stages with the first stage card above the fold at 360×740 and 280×653 (PD-3, PD-4); the caveat is a collapsed "Schedule status" disclosure with the counts one tap away and in About → Coverage; stage cards use "28 sets · poster times" (PD-4); and the Listening Room "Hear <day>" rail scrolls keyboard-focused cards into view (PD-2, `listening-room/app.js`). **All screenshots below were recaptured at `cb8947d`.** Earlier statements here about a gated Map tab are superseded.

**320×640 at 200% text (backend report on #93).** The day strip wraps to two rows, and at scroll top Sat 7 / Sun 8 rest at y≈596–640 under the fixed tab bar (y≈579–640). That is an *initial-view overlap*: content in the bottom strip of the viewport before any scrolling, at the most extreme width/text-size combination. It is **not a proven focus failure**: a real Tab traversal (39 stops at 320×640 and at 360×740, both at 200% text) leaves every focused control clear of the pinned app bar and the fixed tab bar, because the root `scroll-padding-bottom` scrolls the day controls clear when they take focus. The only flagged stop is the skip link, which intentionally overlays the header. A first-line hit test also rules out the wrapped inline "organizer homepage" link (whose bounding box spans two lines) as an occlusion. A regression in `tests/companion_smoke.js` now guards this (it fails when the bottom scroll-padding is removed). The layout itself is unchanged: stage-first order, the collapsed Schedule status disclosure and reduced motion are preserved.

**Earlier evidence head:** code `ab9109c`. All screenshots in [shots/](shots/) were captured from the review build of that code SHA (earlier captures predated the linked-billing, detail-page and sticky-offset fixes and were replaced). This is review-build evidence, **not** final designer sign-off.

**Later code head `e5d1854`** adds the QA accessibility fixes (A11Y-001 focus after Back, A11Y-005 retry recovery focus and announcement, A11Y-002 unavailable-view heading and title). Those change focus handling, one heading and document titles only; they do not change layout, so the screenshots below remain representative. They are not recaptured. A11Y-003/004 (P3 polish) are deferred.

**Forced colors (A11Y-006), code `f819924`:** selected day, stage and nav states now also differ by a double border and/or underline under `forced-colors: active`. The new screenshot `16-forced-colors-360` was captured at this SHA (Chromium emulation, not Windows High Contrast hardware); the other screenshots are unaffected because the rules apply only in that mode.

**Disposition:** corrected design integrated into the functional `companion/` app as a **production-excluded review build**. This is **not** a completed geographic-map release and **not** release authorization. Implemented and tested by the same agent (Claude); this is not independent QA. Codex review of the exact head is requested in the PR.

Queue: [#77](https://github.com/johnapaz/edc-listening-room/issues/77) lane A · [#61](https://github.com/johnapaz/edc-listening-room/issues/61) · [#64](https://github.com/johnapaz/edc-listening-room/issues/64) · [#65](https://github.com/johnapaz/edc-listening-room/issues/65). Design inputs: [interaction contract](../companion-design/INTERACTION-CONTRACT.md), [design guidelines](../companion-design/DESIGN-GUIDELINES.md), [implementation handoff](../COMPANION-IMPLEMENTATION-HANDOFF.md).

## What changed

- **No Map tab (PD-3, superseding the S10 Map tab).** Tabs are Stages and About and the bare URL lands on Stages. `#/map` is only a legacy alias: it always redirects by replacing the history entry (a stage to its page, `?set=`/`?artist=` to the detail page, anything else to Stages). No map graphic, hotspot, map control, coordinate, copied artwork or GPS/route/offline claim is mounted, and no visible navigation item says "Map". The organizer-homepage link stays as a one-line note under the stage list and in About. `StageHotspot`/`hotspots()` remain an unmounted seam that requires verified geometry.
- **Routes.** `#/map`, `#/stages`, `#/unscheduled`, `#/sources` (alias `#/about`) and `#/stage/{id}` (alias of `#/explore?stage=`) are new. Legacy `#/explore`, `#/artist/{id}` and `#/performance/{id}` links are unchanged. `#/map?stage=` redirects to the stage page, `?set=`/`?artist=` open the detail page, and an unknown stage on the map is ignored silently; all by **replacing** the history entry through the pure `resolveRoute()`.
- **Sticky layout.** The app bar can wrap (wide system fonts, text zoom) and the day strip can wrap on narrow screens, so `app.js` measures the real pinned heights into `--bar-h`/`--strip-h` (zero when a bar is not pinned: landscape, Fold cover); CSS offsets and scroll margins use them. Sticky bars are opaque.
- **Navigation.** Primary Stages/About links (bottom tab bar on phones, header links ≥1100px) and the wordmark carry the day. The skip link focuses `<main>` without changing the route.
- **Day switch** is four native links with `aria-current="true"`. There is no `aria-pressed` and no radiogroup anywhere (asserted by a browser test).
- **Set rows:** time column (next-day ends shown as "+1"), billing as a native link to the performance details (context preserved), qualifier chip, status badge, separate artist links for multi-artist billings, and one mint "Hear {artist}" link per credited identity that has reviewed tracks. A shared status is spelled out once in the list header; rows whose status differs, or any row in a mixed list, spell out their own. Programs show "Program · no artist page" and never a link.
- **Detail (S5):** per-identity Listening Room links by stable ID only; "No reviewed tracks yet" plus a plain artist-page link; "Not on {day}" notice; a program explains why there is no artist page.
- **S6/S7/S8** (empty stage, unscheduled entries, Sources & About), a persistent live region for stage/day announcements, an honest offline status banner, and unchanged required-data failure with working retry.
- **Styling:** sibling tokens ("After Dark Atlas"), 44px targets, Fold-cover, phone, tablet, landscape and wide layouts, reduced motion. Measured contrast of every text and control-border token pair is ≥4.5:1 and ≥3:1 respectively.

## Provisional review defaults (not owner-approved)

1. **Violet accent** (`--violet` in `companion/styles.css`; the sodium-orange alternative is in the design notes). One token block to change.
2. **Wide layout.** No 400px side panel: a panel only makes sense beside a map. At ≥1100px a sticky 320px stage rail sits beside the schedule (`--rail-w`). Revisit when real geometry exists.

## Deliberate deviations from the design drafts (all reversible, isolated in components/CSS)

- The bare URL lands on the stage list (PD-3; it previously landed on a gated Map tab). Full-lineup browser assertions moved to `#/explore`, unchanged.
- The contract specifies plain billing plus a Details link; per the owner's preference (PR comment, "artist names clickable wherever they appear") the billing is the native details link and there is no separate Details link. Multi-artist billings also list each artist as a link; programs link to their details only.
- B2B/alias performance pages offer one Hear link per credited identity instead of one link to the performance ID, per contract §2.
- Day links use `aria-current="true"` (previously `"date"`, which claims "today").
- No bottom sheet or map controls exist because there is no map.

## Evidence

Automated, on this branch's code: `python3 -m unittest discover -s tests` (101 pass, 1 existing live-integration skip, includes the production-exclusion test), Node tests (31 = 15 Companion + 16 Listening Room), `build_current_lineup.py --check`, `validate_current_lineup.py`.

Browser acceptance (`tests/companion_smoke.js`, Chromium locally; Chromium + WebKit in CI): all pre-existing assertions kept, with these selector changes only: full-lineup checks use `#/explore`; billing link `h3 a` → `.billing-link` (billing is a native link again, per owner preference); unknown-stage row text now read from `.time`/`.set-stage`; the map-notice assertions run on `#/map`. New checks cover the gated landing, nav day/stage carry, route aliases and redirects, bad map stage, set deep link, S6/S7/S8, program slots, stable-ID-only Listening Room hrefs across views, per-identity Hear links, status vocabulary, no invalid pressed/radiogroup/nested-interactive semantics, live region, skip link, offline banner, and overflow plus 44px targets for every new view at 280, 320, 360, 844×390 and 1280.

The sticky-layout regression hit-tests every day link under a scrolled page at 320×640, 360×740, 390×844, 412×915 and 844×390, each at normal, wide-monospace-font and 200% text (which force the app bar to wrap), checks the measured offsets and sticky day headings, and was confirmed to fail when the measurement is disabled. Sources & About asserts homepage-only outbound hrefs (`https://orlando.edc.com/`); the audited source URLs stay in the data and are not rendered.

Screenshots (Chromium emulation, code `ab9109c`) are in [shots/](shots/), including scrolled and wrapped-header-at-200%-text states; re-capture with `node docs/companion-session2/capture.js <dir>` after `python3 scripts/build_companion_preview.py`.

## Not verified / still open

- **WebKit was not run in the authoring environment** (only Chromium is installed there). WebKit results come from CI.
- **Real devices, VoiceOver/TalkBack, real browser zoom and landscape hardware** remain human checks (#67). Emulation and DOM/keyboard checks are not a screen-reader pass.
- **Map** (#63/#64): no verified positions or permitted representation, so map-specific acceptance (alignment, pinch/zoom, rotation, hotspot focus) is untested because nothing is built.
- **Schedule evidence** (#28): all 107 times are still poster transcriptions; nothing was upgraded.
- **My Day** (#66) not started; it must not delay P0.
- Public release, DNS and hosting are separately authorized and untouched.
