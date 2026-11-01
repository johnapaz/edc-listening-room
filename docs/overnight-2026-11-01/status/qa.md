# QA status — issues #80 / #77 / #67

**Checkpoint 2:** 2026-11-01 05:00 UTC (sandbox clock; the earlier checkpoint's "~05:25" label was an estimate written ahead of the clock and is wrong, it was pushed at ~04:55 UTC) · branch `claude/gracious-newton-3s6ivf` (QA session's assigned branch; not `claude/rc-qa-2026-11-01`) · role: QA, independent of frontend (#82) and backend (#85). Same-agent evidence is labelled; WebKit, real devices and assistive tech are untested.

## RC stability analysis for PM — 2026-11-01 ~10:30 UTC

**Tested:** `main` @ `62c7151` (R1 baseline: merged #82 `affa1b9` + packaging). App code is byte-identical to the #82 head `6c217ec` I retested; the only differences are `tests/support/rc_*` helpers and release docs. I rebuilt the sanitized preview from that exact checkout; I did not download the CI artifact 13077233599 or compare its hash. Chromium emulation only. **Not a candidate sign-off:** PM records NOT READY and I do not contradict that.

| Area | Disposition at `62c7151` | Evidence |
|---|---|---|
| Existing suites | **PASS** | Python 101 pass / 1 existing skip; Node 31 pass; Companion browser smoke 32/32 Chromium; Listening Room UI smoke 35/35 (run on the LR-fix branch, three consecutive runs). WebKit: **UNTESTED here** (CI only). |
| Data integrity | **PASS** | Current-lineup `--check` and validators, EDCO reference validator: 130 appearances (Fri 43 / Sat 43 / Sun 44), 127 distinct billings. Provisional-time and null-geometry gates unchanged (not re-argued here). |
| Production exclusion | **PASS** | `build_public_site.py` builds 33 files, no `companion/`, no private paths. |
| Sticky bars vs day controls (2.4.11 / PM retest) | **PASS** | 12 viewport/text configs, 0 overlap or hit-test failures; fails on held head `db54e8b`. |
| Back/retry focus, announcements (2.4.3, 4.1.3) A11Y-001/005 | **PASS** | Focus stays on `stage-title` after Back; retry announces and keeps focus. |
| Error views (1.3.1, 2.4.2) A11Y-002 | **PASS** | h1 and matching titles. |
| Forced-colors selection (1.4.1, 1.4.11) A11Y-006 | **PASS** (Chromium emulation) | Selected day/stage/nav differ by border/underline. |
| Listening Room focus obscured (2.4.11) LR-001, P1 | **FAIL on `main`; fix proposed in PR #88, same-agent PASS** | Before: 2–17 fully hidden stops per config below 1280px; after: 0 in all 18 configs. Independent verification by backend pending. **Needs merge to count.** |
| LR-002 (rail sliver), LR-003 (not-found heading/title) | **FAIL, open, P2** | Live Listening Room, pre-existing. |
| A11Y-003/004/007 | **FAIL, open, P3** | Deferred polish. |
| Real screen readers, real devices/Fold, browser-native zoom, WebKit/Firefox, real Windows high contrast | **UNTESTED** | Not available in this sandbox; not claimed. |
| Map-specific P0 | **BLOCKED** (not QA-testable) | No geometry or permitted representation; the stage-list fallback is not map acceptance. |

**Stability view.** Companion code is stable under everything I could emulate: no P0, no Companion P1, no flaky result in my runs, and every finding the audit raised against it has either been fixed and independently retested or is P3. The one release-relevant defect (LR-001) was in the *live Listening Room*, not the new surface; a small CSS fix is in PR #88. Largest remaining risks are unverified rather than known-bad: real assistive technology and devices, WebKit locally unreproduced, and the intermittent `ui_smoke.js` `boundingBox()` null that frontend saw once (I could not reproduce it in 3 runs and make no claim about its cause).

**What invalidates this:** any change to `companion/`, `listening-room/` or data. PR #88 changes `listening-room/styles.css`; if it merges, the Listening Room checks need one rerun on the new SHA (cheap: `STRICT=1 node tests/qa/a11y_regression.js` and `tests/ui_smoke.js`).

**Process correction.** My 06:00 UTC report asked for the LR-001 path decision that PM had already granted at 05:02 UTC; I had read the wrong comment page. The LR-001 work started only at ~10:10 UTC as a result. Late by about five hours; no other effect found.

## Update 06:00 UTC: retest of #82 `6c217ec`
A11Y-001, 002, 005 and 006 are **fixed and independently retested (PASS)**; sticky occlusion still passes; no regressions found in keyboard, announcements or Back/scroll. **Open:** A11Y-003/004/007 (P3, Companion), **LR-001 (P1), LR-002, LR-003 (live Listening Room, pre-existing; `listening-room/` unchanged by #82 and main)**. Tested head `6c217ec` is a candidate-in-progress; final sign-off still requires the exact candidate SHA recorded by PM.

## Completed
- **Baseline on `main` @ `aca385d` and PR #82 @ `42e20df`** (Chromium only): Python 101 pass / 1 existing skip; Node 31 pass (#82; main 26); both lineup validators and EDCO reference validator clean; Companion smoke 29/29 (#82; main 12/12); Listening Room UI smoke 35/35 (main). Production exclusion test is in the Python suite. No config or assertion was changed to obtain these.
- **Sticky-occlusion retest (PM request, #80 comment 6553142656): PASS at `42e20df`**, FAIL at the held head `db54e8b` with the same test. See ledger.
- **Accessibility audit, priorities 1-3 and 5 (Companion):** keyboard journey, names/structure, announcements, failure/retry. Findings A11Y-001..005 in `qa/accessibility.md`.
- Priority 4 (reflow 320/280, forced-colors, reduced motion, Fold cover→open→cover, orientation) and priority 6 (Listening Room structure, search, keyboard focus-obscuring) done.
- New file `tests/qa/a11y_regression.js`: 14 PASS, 7 KNOWN-OPEN, 0 FAIL on `42e20df`; 5 FAIL on the held head `db54e8b`. LR-001/002 also reproduced on the unmodified main build (`public-site`).

## Findings routed (details and repro in the ledger)
| ID | Sev | Owner | One line |
|---|---|---|---|
| A11Y-001 | P2 | frontend | Focus falls to `<body>` after Back; `hashchange` re-render destroys the heading `popstate` just focused. |
| A11Y-005 | P2 | frontend | Successful "Try again" neither focuses nor announces. |
| A11Y-002 | P2 | frontend | `#/artist/nope` has no h1; error views have non-matching titles. |
| A11Y-006 | P2 | frontend | Forced-colors mode: selected day/stage/nav indistinguishable. |
| A11Y-003/004/007 | P3 | frontend | Same-name links to different days; duplicate Hear links; short billing links under the 44px convention. |
| **LR-001** | **P1** | frontend/PM | **Live Listening Room, pre-existing on main:** sticky bottom tab bar fully covers focused rows (WCAG 2.4.11 AA). |
| LR-002 | P2 | frontend | Live Listening Room rail: focus lands on a 28 px sliver of the 3rd card. |
| LR-003 | P2 | frontend | Live Listening Room `#/artist/nope`: no heading, generic title. |

No P0. **One P1 (LR-001), in the live Listening Room, not in the Companion RC.** No finding blocks the day → stage → artist → Listening Room → Back journey; A11Y-001 raises its keyboard cost. Whether LR-001 is in RC scope is a PM decision.

## Next ready task
1. Retest any landed fix (A11Y-001/005/006, LR-001) on the new SHA with `STRICT=1`.
2. Final-candidate pass after 10:00 UTC (no sign-off carries over from `42e20df`).
3. Retest A11Y-001/002/005 and everything else on the final candidate SHA (no sign-off carries over from `42e20df`).

## Blocked input / untested
- **Real VoiceOver, TalkBack, NVDA/JAWS, real devices, real browser zoom, WebKit:** unavailable in this cloud sandbox. Needs owner/device check; will not be reported as passed.
- **No automated a11y scanner** installed (no axe/Lighthouse); none added.
- **Helper PR #85:** head mismatch (PR head `a5a31bc` vs handoff comment `8fb2207`). Not consumed; no dependency.

## Ready for reassignment
Small, bounded fixes for A11Y-001 and A11Y-005 are ~2-line changes in `companion/app.js`. QA will implement **only if PM transfers that path** after frontend's #82 checkpoint, and the retest will then be labelled same-agent unless another worker verifies.
