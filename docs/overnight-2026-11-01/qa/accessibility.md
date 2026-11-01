# QA accessibility ledger — Companion review build (issue #80)

Scope: a product audit against relevant WCAG 2.2 A/AA criteria, **not** a conformance certification. Product-specific rules (44px targets, no invented artist links) are labelled separately from standards findings.

**Environment for every row below:** headless Chromium (Playwright 1.63) on Linux, emulated viewports, sanitized preview built with `scripts/build_companion_preview.py` and served with the production `_headers`. No VoiceOver, TalkBack, NVDA/JAWS, real device, real browser zoom or WebKit/Firefox was available. **Those remain UNTESTED; nothing here is an assistive-technology pass.**

**Tested code:** PR #82 `42e20df` (frontend, code `ab9109c`). Control build: `db54e8b` (the head the PM reviewed and held). Helper PR #85 was not consumed (its own selfcheck is same-agent and Chromium-only); this audit uses `tests/qa/a11y_regression.js`.

## Findings

| ID | Sev | Finding | Route / state | Criterion | Owner | Status |
|---|---|---|---|---|---|---|
| A11Y-001 | P2 (P1 if keyboard efficiency on the 130-row list is treated as essential) | After browser **Back** or the in-page "← Back" link, keyboard focus ends on `<body>`. `popstate` correctly focuses `#stage-title` and announces, then the `hashchange` listener (`companion/app.js`, "rendering again is harmless") re-renders with `main.replaceChildren`, destroying the focused heading. A keyboard or screen-reader user returns to the top of the document and must re-tab through the bars (up to ~300 stops on `#/explore`). | `#/explore?day=2026-11-07&stage=circuit-grounds` → open any set → Back | 2.4.3 Focus Order (A) | frontend | **FIXED, retested at `6c217ec`** (frontend fix; QA verification with `STRICT=1`, see Retest log) |
| A11Y-005 | P2 | A successful **Try again** neither moves focus nor announces. `load()` calls `render({scroll})` with no `focus`; the retry button is removed so focus falls to `<body>`, and `#live` stays empty. A screen-reader user gets no confirmation that content is back. (Failure itself is good: `role=alert`, native `<button>`, keyboard-operable, retry works for 503 and malformed JSON.) | `#/explore?stage=circuit-grounds`, required `performances.json` 503 then OK | 4.1.3 Status Messages (AA), 2.4.3 | frontend | **FIXED, retested at `6c217ec`** (frontend fix; QA verification with `STRICT=1`, see Retest log) |
| A11Y-002 | P2 | Error views have weak headings/titles: `#/artist/nope` has **no `<h1>`** (only an `<h2>`) and title "Artist · …"; `#/bogus` title is "Explore · …" while the page says "Selection unavailable". | `#/artist/nope`, `#/bogus` | 1.3.1, 2.4.2, 2.4.6 | frontend | **FIXED, retested at `6c217ec`** (frontend fix; QA verification with `STRICT=1`, see Retest log) |
| A11Y-003 | P3 | Links with identical names reach different pages: an act playing on two days appears as "RAJE" twice in the all-days list (Fri vs Sat). Context is only the list's `aria-label` and a time column; the link name has no day. | `#/explore` | 2.4.4 Link Purpose (in context, A) | frontend | OPEN (nonblocking; consider `aria-label="RAJE, Friday"`) |
| A11Y-004 | P3 | Detail pages repeat the Listening Room action: header "Hear X in Listening Room →" and the row's "Hear X" go to the same URL under different names (two extra tab stops per artist). Informational. | `#/performance/*` | 2.4.4 / efficiency | frontend | OPEN (nonblocking) |
| A11Y-006 | P2 | In **forced-colors / Windows high-contrast** mode the selected day, stage and primary-nav item are indistinguishable from unselected ones. Selection is drawn with `background-color`, `box-shadow` and color only (UA overrides them) and the stylesheet has no `forced-colors` rules. Normal mode is fine (solid fill, leading/top bar). | `#/explore?day=2026-11-07&stage=circuit-grounds`, `forcedColors: active` | 1.4.1 Use of Color (A), 1.4.11 Non-text Contrast (AA) | frontend | **FIXED, retested at `6c217ec`** (frontend fix; QA verification with `STRICT=1`, see Retest log) |
| A11Y-007 | P3 (product convention, not a WCAG failure) | Short billing links render narrower than the project's 44px target convention: 31–41 px × 44 (e.g. "AAT", "RAJE", "2AR", "Benda"). All are ≥ 24 px, so WCAG 2.5.8 is met. "What do these mean?" is 135×19 px (standalone line; likely covered by the in-text exception). | 320 CSS px, `#/explore`, `#/unscheduled`, detail | project convention; 2.5.8 AA met | frontend | OPEN (nonblocking) |
| LR-001 | **P1** (AA failure on production; small CSS fix; workaround is one more Tab or scroll) | **Live Listening Room, pre-existing on `main`; not introduced by #82.** The fixed bottom tab bar fully covers the focused control: Tab scrolls a row to the viewport edge (`html{scroll-padding:auto}`) and it lands under the bar (e.g. row top 675–721 under bar 679–740). 6 of 60 stops fully hidden at 360 px; same at 390/412/320/280/768/200% text. | `/listening-room/#/lineup` (and `#/listen`), keyboard Tab | 2.4.11 Focus Not Obscured (Minimum) (AA, new in 2.2) | frontend / PM (production code) | **FIX PROPOSED (QA, same-agent):** two `scroll-padding` rules in `listening-room/styles.css`; QA retest PASS, independent verification by backend pending |
| LR-002 | P2 | **Live Listening Room, pre-existing.** In the "Hear Friday" rail, Tab lands on the third card with only a 28 px sliver (11%) visible and scrolls only on the next Tab, so the focus ring is mostly off-screen. Rail does scroll (`scrollLeft` 0 → 320), so this is a partial-visibility heuristic, not a trap. | `/listening-room/#/lineup`, 360 px | 2.4.7 Focus Visible (AA), 2.4.11 (met: not entirely hidden) | frontend | OPEN. Suggested: on `focusin` in `.rail-strip`, `scrollIntoView({inline:"nearest"})`/center the card. |
| LR-003 | P2 | **Live Listening Room, pre-existing.** `#/artist/nope` shows a `role=alert` message but no heading at all, a generic document title, and focus stays on `<body>`. | `/listening-room/#/artist/nope` | 1.3.1, 2.4.2, 2.4.6 | frontend | OPEN |


## Retest log

| Date (UTC) | Candidate | Result |
|---|---|---|
| 2026-11-01 06:00 | PR #82 `6c217ec` (code `f819924`; frontend fixes `e5d1854`, `f819924`) | `STRICT=1 tests/qa/a11y_regression.js`: **18 pass; A11Y-001/002/005/006 now PASS** (focus stays on `stage-title` after browser and in-page Back; retry announces "circuitGROUNDS, all days, 30 performances." and keeps focus in content; error views have an h1 and matching title; forced-colors selection differs by border width/style/color or underline). LR-001/002/003 still FAIL (Listening Room untouched). Sticky overlap 0 failures; keyboard journey, day/detail announcements, scroll restoration and Fold/orientation unchanged. Suites: Python 101 pass/1 skip, Node 31 pass, Chromium smoke 32 pass (WebKit not run here). Observation only: returning from the Listening Room via browser Back loads a fresh document, so focus starts at the top; no fix requested. Frontend's own smoke now has 3 more assertions; I did not review their wording. |

### LR-001 fix evidence (same-agent: QA wrote the fix and ran the retest; backend verification pending)

Change: `listening-room/styles.css` only. `html{scroll-padding-top:calc(var(--header) + 12px);scroll-padding-bottom:calc(var(--tabbar) + env(safe-area-inset-bottom) + 12px)}`, with `html{scroll-padding-top:81px;scroll-padding-bottom:12px}` at `min-width:900px` where the tab bar is static.
Method: Tab through 50 (`#/lineup`) / 70 (`#/listen`) non-rail stops; sample 45 points over each focused control with `elementFromPoint`; "fully hidden" = 0 sampled points reach the control. Chromium, `prefers-reduced-motion: reduce`. Before = build of PR #82 head `6c217ec` (Listening Room unchanged from `main`); after = this branch.

| Route / viewport | Before: fully hidden stops | After |
|---|---|---|
| `#/lineup` 360 / 390 / 412 / 320 / 280 | 8 / 6 / 4 / 7 / 7 | 0 / 0 / 0 / 0 / 0 |
| `#/lineup` 360 +200% text / 768 / 844x390 / 1280 | 2 / 4 / 9 / 0 | 0 / 0 / 0 / 0 |
| `#/listen` 360 / 390 / 412 / 320 / 280 | 9 / 11 / 9 / 15 / 16 | 0 / 0 / 0 / 0 / 0 |
| `#/listen` 360 +200% / 768 / 844x390 / 1280 | 6 / 10 / 17 / 0 | 0 / 0 / 0 / 0 |

The 93% "minimum unobscured" after the fix is the header's own round icon buttons clipping my corner samples, not obscuring. Regression: `tests/ui_smoke.js` 35/35 on three consecutive runs; Python 101 pass / 1 skip; Node 31 pass; `STRICT=1 tests/qa/a11y_regression.js` LR-001 PASS. LR-002 (rail sliver) is **not** resolved by this change and stays open; LR-003 stays open.

## Verified (PASS) at `42e20df`

| Check | Evidence |
|---|---|
| **#80/PM retest — sticky day controls vs wrapping app bar** (2.4.11 Focus Not Obscured, 2.5.8 target access) | `tests/qa/a11y_regression.js`: at 360/390/412/320/280 CSS px, 844×390 landscape, 200% text, text-spacing, wide font, scrolled 0/400/1200 px, pinned bars never overlap and every in-view day control is hit-testable. **Control:** the identical test fails on `db54e8b` (app-bar/day-strip overlap 33–61 px at 200% text, spacing and wide font), so the check can detect the defect. Exhaustive Tab-through of 70 stops (stage view) and 160 stops (all-days list) at 10 viewport/text configurations found no focused control hidden or off-screen. |
| Focus visible | 3px amber outline on every tabbed control, including the skip link. |
| Skip link, landmarks, language | Skip link first in order; one `<main>`, `banner`, `contentinfo`, labelled `nav`s; `lang="en"`; unique ids. |
| Names / semantics | No unnamed links or buttons on 13 route states; no `aria-pressed`/`radiogroup`; day switch is native links with `aria-current`; no nested interactives; program entry (Discovery Project) has no artist or Listening Room link. |
| Titles | Per-route `document.title` updates on all valid routes. |
| Day/stage/detail changes | Focus moves to the stage or detail heading; day change keeps focus on the day link; `#live` announces "circuitGROUNDS, Sunday, 10 performances." and the detail title. |
| Reflow / Fold / orientation | No horizontal scroll at 320 and 280 CSS px on 10 route states (400% zoom equivalent by viewport). Fold cover 280 → open 717 → cover keeps route, heading and focus (`detail-title`), no overflow. 360×740 → 740×360 with a focused day link keeps focus, selection and route. Emulated resize only. |
| Reduced motion | With `prefers-reduced-motion: reduce`, 0 elements run animations or transitions. |
| Listening Room search | `<label for=q>` present; results announced via a polite live region; `aria-pressed` is used only on real buttons in `role=group`. |
| Contrast (computed) | Minimum text contrast 8.0:1 across 11 route states (threshold 4.5:1). Caveat: body background is a gradient, estimated from the nearest solid color. |
| Failure handling | 503 and malformed JSON show a `role=alert` state with a keyboard-reachable "Try again" that restores content; optional-music failure leaves festival navigation intact; slow load shows a `role=status` loading state. |

## Not tested (explicit)

- Real screen readers (VoiceOver, TalkBack, NVDA, JAWS), real iOS/Android devices, Galaxy Z Fold, physical orientation changes, browser-native zoom (only CSS `font-size:200%` and narrow-viewport emulation were used), WebKit/Firefox, Windows high-contrast.
- Listening Room Listen (tracks) and artist pages were checked for structure only (no names/semantics defects found) but not exhaustively for focus order; cross-product Back was covered by the existing UI smoke (35/35) rather than re-audited by QA.
- Forced-colors was emulated in Chromium only (no real Windows high-contrast).
- No automated scanner (axe/Lighthouse) is installed in the repo or sandbox; none was added. This ledger is keyboard, DOM, computed-style and layout evidence only.

## Test changes

Added only: `tests/qa/a11y_regression.js` (new file; not wired into CI because workflows are PM-owned). No existing test, assertion, threshold or config was edited. Checks tagged KNOWN print KNOWN-OPEN until fixed; `STRICT=1` makes them hard failures, so a fix is retested rather than silently assumed.
