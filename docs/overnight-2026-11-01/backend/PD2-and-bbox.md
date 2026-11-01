# PD-2 independent verification and boundingBox-null investigation (backend, #77/#79)

Chromium emulation only, same sandbox as the other backend work. WebKit not installed; no hardware, screen reader or native zoom.

## 1. PD-2 on PR #93 (head `a668119`, code `cb8947d`)
| Check | Result |
| --- | --- |
| `tests/ui_smoke.js` as submitted | 36 pass |
| `STRICT=1 tests/qa/a11y_regression.js` | **LR-002 now PASSES** (rail cards >=25% visible; 8 stops on main). LR-001 still passes. 18 pass / 3 fail (below) |
| Handler removed (negative control) | frontend's containment assertion fails at 360 (`card [332,480] outside strip [0,360]`) |

**New assertion (my addition, not pushed to #93):** `docs/overnight-2026-11-01/backend/pd2-ui_smoke-scrollLeft.patch`, against #93's `tests/ui_smoke.js`. For 360 and 1280, reduced and normal motion, it tabs the rail forward to the last card and back, waits for scrollLeft to settle at each stop, and asserts: the rail overflows; start is 0; scrollLeft never moves backwards going forward; it advances; the last card ends at the strip's end; Shift+Tab returns it to 0; and at every stop scrollLeft lies in the range that puts the whole focused card in view. Result: 37 pass with the handler; **fails without it** (isolated from frontend's assertion: `scrollLeft puts the whole focused card in view tabbing forward at 360 (reduce): {"left":0,"max":1252,"card":2,"lo":120,"hi":332}`). Chrome natively scrolls just enough to reveal the focused link, which is why the whole-card range check, not just "scrollLeft changed", is the discriminating part. Held until #93 merges because it edits the same file.

**Findings on #93 for frontend/QA (not caused by PD-2):**
1. **SC2.4.11 regression at 320x640 + 200% text** (deterministic, 3 of 3 runs; passes on main): after PD-4 moved the day strip up, `Sat 7` and `Sun 8` sit at y=578-622 at scroll top, under the fixed tab bar (579-640). On main they were below the fold. Controls are reachable by scrolling; they are covered in the first view. Suggested owner: frontend (Companion CSS/layout).
2. **A11Y-002 `#/map`**: QA's check expects a `Map…` title; PD-3 makes `#/map` redirect to Stages (title "Stages · Event Day Companion"). That is an intended contract change, so QA's expectation needs updating. Owner: QA. I did not edit `tests/qa/`.
3. LR-003 unchanged (known open).

## 2. boundingBox-null in the YouTube-mark block of `tests/ui_smoke.js`
**Cause not proven.** I could not reproduce a failure: 0 of 90 runs of the same steps (30 idle, 60 with 8 busy-loop processes on 4 CPUs) using `tests/support/rc_bbox_repro.js`.

**Evidence of a race window.** A timeline from a passing run shows that at the 1280 step the `(min-width: 1100px)` listener fires and `.youtube-icon` is removed and added twice (app.js `wide.addEventListener("change", …route())` -> panel view):
```
 0 icon-added | 118 test-resize-start | 166 icon-removed, icon-added x2 | 167 wide-change | 178 test-resize-done (1280)
```
The node swap lands about 12 ms before `setViewportSize` resolves here. If the listener fires later, it can land between the test's `waitFor`, `decode` and `boundingBox`, which re-resolve a replaced node. That matches "null after resize, passes on rerun", but a hidden or not-yet-laid-out replacement node is an inference I did not observe.

**Proposed fix, no assertion weakened:** `docs/overnight-2026-11-01/backend/ui_smoke-resize-settle.patch` (against main) waits for the breakpoint state and the replaced node, then two animation frames, before locating the mark. The 187 px, 100 px and no-overflow assertions are untouched. `ui_smoke.js` passes with it (35). Its effect on the flake is unproven for the reason above. Run `node tests/support/rc_bbox_repro.js --iterations 60 --load 8 [--show]` to hunt for the failure.
