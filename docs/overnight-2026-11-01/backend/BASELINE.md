# Backend baseline and QA helper handoff (issue #79)

Baseline SHA `9340bea` (main after #78). Helper commit `02da45c`. Same-agent evidence, Chromium only.

## For QA #80: run it

```bash
python3 scripts/build_companion_preview.py     # also writes the public build under companion-preview/
node tests/support/rc_selfcheck.js              # proves the helper itself (13 checks)
node tests/support/rc_scenarios.js --manifest out.json
```

```js
const rc = require("./tests/support/rc_scenarios");
const server = await rc.startServer("companion-preview");           // read-only static server, production _headers/CSP
const s = await rc.openScenario({ engine: "chromium", profile: "fold-cover-280",
  scenario: "required-503", time: "stale-boundary-at", base: server.base, path: "/companion/" });
// QA assertions on s.page; then:
await s.restore();   // lift the failure, click the app's retry
console.log(s.record) // profile, time, scenario params, injected/blocked requests, console and page errors
await s.close(); await server.close();
```

`rc-manifest.json` lists 13 profiles, 12 failure scenarios, 9 time fixtures, transitions (`rotate`, `foldCycle`, `resizeSweep`, `setReducedMotion`, `tabTrace`, `goBack`) and the unsupported simulations. Each `openScenario` uses a new browser context, so nothing leaks between tests. All traffic outside the local origin is aborted (or a 1x1 PNG for `thumbnails-stub`) and recorded. The served tree is hashed before and after the self-check.

Behaviours QA should know:
- `required-503-then-ok` counts every required request (three files per load). `fail_count: 3` = one failed page load, then recovery.
- Time fixtures use `page.clock.install`, so time keeps flowing from the instant. `timezoneId` is America/New_York.
- Profiles are emulated viewports only. `basis: trusted` = already in `tests/device_matrix.js`; `generic` = a layout class. No Galaxy Z Fold 6 size is asserted; measure `innerWidth x innerHeight` on the device.
- Not simulated: real Safari/Android, screen readers, fold posture APIs, OS text size, real network.

## Measured baseline (median of 21 runs, Node/V8 on this sandbox; sizes exact)

| Artifact | Files | Raw | gzip-9 | brotli-11 |
| --- | --- | --- | --- | --- |
| `public-site/` | 33 | 789,911 | 325,895 | 305,083 |
| `companion-preview/` | 38 | 819,262 | 336,561 | 313,939 |

Companion first load: 10 requests (1 document, 1 CSS, 4 JS, 4 JSON), no repeated URLs. Listening Room first load: 53 requests (6 JSON, 2 JS, 1 font, 42 thumbnail images, which are external and were stubbed). Companion adds 4 scripts plus a stylesheet over the public build.

| JSON | Raw | gzip | Parse median |
| --- | --- | --- | --- |
| `performances.json` | 95,155 | 6,848 | 0.30 ms |
| `songs.json` | 96,303 | 15,872 | 0.23 ms |
| `artists.json` | 20,436 | 2,392 | 0.06 ms |

`createIndex` ~0.6 ms; a query for every day and stage ~2.9 ms. Full figures: `baseline.json`.

## Findings (evidence, not recommendations to ship)

1. **Parse and index cost is negligible** (<1 ms total). Nothing to optimize there.
2. **JSON is already minified** by the build (pretty-print overhead 1 byte per file). No saving available.
3. **No duplicated transfers**: no byte-identical served files, no URL fetched twice on either first load.
4. **Companion loads `songs.json` (96 KB raw, 15.9 KB gzip) only to link reviewed tracks.** A small derived artist-to-track index could cut that by an estimated ~80%, about 13 KB gzip. It needs a frontend contract change and a build step, so it is a PM/frontend call after the RC freeze. Not proposed for this RC.
5. **Largest assets are off the critical path**: `og.png` 127 KB, `about/songs/index.html` 107 KB, `about/search.json` 62 KB, `john-paz.webp` 54 KB (already compressed).
6. **Listening Room thumbnails**: 42 requests at 390 px and at 1280 px, rendered 64-208 CSS px wide from 320x180 sources. Real thumbnail bytes cannot be measured without provider traffic, so no claim is made.

No code change is proposed. No Core Web Vitals were measured or are claimed.

## Data audit (item 2 of #79)

Run only: `validate_edco_reference.py` and `validate_current_lineup.py` pass (130 appearances, 107 timed, 23 unknown stage/time; 3 historical-only IDs), and the public builder passes. The self-check confirms the served `performances.json` has 130 rows. A field-by-field audit of withheld fields and source freshness against raw records is NOT done in this pass and remains open.
