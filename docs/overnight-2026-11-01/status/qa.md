# QA status — issues #80 / #77 / #67

**Checkpoint:** 2026-11-01 ~05:25 UTC · branch `claude/gracious-newton-3s6ivf` (QA session's assigned branch; not `claude/rc-qa-2026-11-01`) · role: QA, independent of frontend (#82) and backend (#85). Same-agent evidence is labelled; WebKit, real devices and assistive tech are untested.

## Completed
- **Baseline on `main` @ `aca385d` and PR #82 @ `42e20df`** (Chromium only): Python 101 pass / 1 existing skip; Node 31 pass (#82; main 26); both lineup validators and EDCO reference validator clean; Companion smoke 29/29 (#82; main 12/12); Listening Room UI smoke 35/35 (main). Production exclusion test is in the Python suite. No config or assertion was changed to obtain these.
- **Sticky-occlusion retest (PM request, #80 comment 6553142656): PASS at `42e20df`**, FAIL at the held head `db54e8b` with the same test. See ledger.
- **Accessibility audit, priorities 1-3 and 5 (Companion):** keyboard journey, names/structure, announcements, failure/retry. Findings A11Y-001..005 in `qa/accessibility.md`.
- New file `tests/qa/a11y_regression.js` (14 PASS, 3 KNOWN-OPEN on `42e20df`; 5 FAIL on `db54e8b`).

## Findings routed (details and repro in the ledger)
| ID | Sev | Owner | One line |
|---|---|---|---|
| A11Y-001 | P2 | frontend | Focus falls to `<body>` after Back; `hashchange` re-render destroys the heading `popstate` just focused. |
| A11Y-005 | P2 | frontend | Successful "Try again" neither focuses nor announces. |
| A11Y-002 | P2 | frontend | `#/artist/nope` has no h1; error views have non-matching titles. |
| A11Y-003/004 | P3 | frontend | Same-name links to different days; duplicate Hear links on detail. |

No P0 and no P1 found. No finding blocks the day → stage → artist → Listening Room → Back journey; A11Y-001 raises its keyboard cost.

## Next ready task
1. Priority 4 remainder: forced-colors, reduced motion, 320 px reflow, Fold cover→open with selection preserved.
2. Priority 6: Listening Room Lineup/Listen/artist/search and cross-product Back regression.
3. Retest A11Y-001/002/005 and everything else on the final candidate SHA (no sign-off carries over from `42e20df`).

## Blocked input / untested
- **Real VoiceOver, TalkBack, NVDA/JAWS, real devices, real browser zoom, WebKit:** unavailable in this cloud sandbox. Needs owner/device check; will not be reported as passed.
- **No automated a11y scanner** installed (no axe/Lighthouse); none added.
- **Helper PR #85:** head mismatch (PR head `a5a31bc` vs handoff comment `8fb2207`). Not consumed; no dependency.

## Ready for reassignment
Small, bounded fixes for A11Y-001 and A11Y-005 are ~2-line changes in `companion/app.js`. QA will implement **only if PM transfers that path** after frontend's #82 checkpoint, and the retest will then be labelled same-agent unless another worker verifies.
