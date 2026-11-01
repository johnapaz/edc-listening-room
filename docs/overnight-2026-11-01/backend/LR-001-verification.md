# LR-001 independent verification (backend, #77/#79)

**Verified code: `79ab62c`.** Run on checkout `50de01a` (main), whose only differences from `79ab62c` are `.github/workflows/companion-checks.yml` and two release docs; no app, CSS, data or test change. Chromium only (WebKit not installed here). Same sandbox as the helper work; verifier is a different agent from the QA author of the fix (#88), but this is emulation, not hardware.

| Check | Result |
| --- | --- |
| `STRICT=1 node tests/qa/a11y_regression.js` | **LR-001 PASS** (0 of 60 stops hidden, 360px). 19 pass, 2 fail: **LR-002** (8 rail-card stops <25% visible, e.g. "Play Desire by Zack Martino" 11%) and **LR-003** (not-found artist view has no heading, generic title). Both are known-open findings, not regressions. |
| `STUB_THUMBS=1 node tests/ui_smoke.js` (public-site on :8765) | 35 checks passed, exit 0 |
| `node tests/support/rc_lr001_verify.js` (new, independent method) | **36 runs, 0 fully covered focus stops**: 122 Tab stops each at 360, 768 and 1280 px; configs default, 200% font, 300% font, text spacing, Verdana, 200% + spacing; reduced and smooth scrolling. |
| Negative control: same checker on `styles.css` from before the fix (`5d4060d^`) | **Detects the defect**: 360px 16 fully covered (default) / 4 (200% font); 768px 12 / 6; 1280px 0 (tab bar is static there). |

Notes:
- Method differs from QA's sampler: full ring, 9x5 hit-test grid per control, "fully covered" = zero visible points, covering element named; also counts off-screen stops (0 found).
- "Partial" counts (43-56 per run) are mostly in-header controls overlapped by sibling hit areas and inline links wrapped across lines, not bar occlusion; they are reported, not failed.
- Not covered: native browser zoom, OS text scaling, real devices/Fold, VoiceOver/TalkBack, WebKit. CSS-injected font-size/spacing is a proxy.
- Pre-fix counts differ from the principal review (22/109 at 360, 13/109 at 768) because the metric differs (this one needs zero visible points; the review counted any overlap).

Reproduce: `python3 scripts/build_public_site.py && node tests/support/rc_lr001_verify.js --out out.json` (add `--root <dir> --configs default --motion reduced` for a control).
