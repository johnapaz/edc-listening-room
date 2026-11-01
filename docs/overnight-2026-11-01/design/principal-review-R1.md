# Principal design review: R1 (preliminary), 2026-11-01 05:10 EST

**Reviewed:** `main` @ `62c7151` (app baseline `affa1b9`, #82 merged; #86/#87 are docs and CI only). I built locally with `build_public_site.py` and `build_companion_preview.py` and served `companion-preview/` only.
**Method:** Playwright Chromium, emulated at 280, 360, 768 and 1280px, with keyboard traversal and fixed-bar overlap measurement. External requests were blocked and thumbnails stubbed.
**Not covered:** real devices, WebKit (not installed here; CI covers it), VoiceOver/TalkBack, browser-native zoom.
**Suites at this SHA:** pytest 100 pass / 1 skip · node 31/31 · `ui_smoke.js` 35/35 · `companion_smoke.js` Chromium all pass.

## Disposition
- **Listening Room (live):** stays live. **Two P1 accessibility fixes should ship today** (PD-1, PD-2). Nothing found warrants rollback.
- **Event Day Companion:** **NO-GO.** I concur with PM. Beyond the open map/source gates, it has two design P1s (PD-3, PD-4) that must be fixed before any candidate.
- **PD-1 update, 05:35 EST:** QA PR #88 (`b487476`) resolves PD-1 in my check. Built from that head, the same traversal leaves **0 of 109** focused controls under the fixed bars at 360 and 768; only the skip link overlaps the header, which is intended. **Design approves #88 for PD-1.** It does not fix PD-2: the rail `scrollLeft` still stays 0 on focus at that head.
- This is not a blanket sign-off. Any app or data change needs R2 and a re-review of the affected surfaces.

## Findings (ranked)

| ID | Sev | Product | Observed (evidence) | Fix | Acceptance |
|---|---|---|---|---|---|
| PD-1 (= LR-001) | P1 | Listening Room | Keyboard focus lands under the fixed bottom tab bar (61px). **22 of 109 Tab stops at 360px** and **13 of 109 at 768px** sit behind it, e.g. "Sloth · circuitGROUNDS" row at y=675–721 under the bar at 679. Companion handles this correctly (0, excluding the skip link). | `html{scroll-padding-top:<header h>;scroll-padding-bottom:calc(<tabbar h> + env(safe-area-inset-bottom))}` in `listening-room/styles.css`. This is the QA lane per #80; no competing edits. | Tabbing the full lineup at 360, 768 and 1280 leaves 0 focused elements overlapping the sticky header or fixed tab bar. Add it as a `ui_smoke.js` assertion. |
| PD-2 | P1 | Listening Room | **The "Hear <day>" rail does not scroll to keyboard focus.** Focus moves through cards at x=332, 492, 652, 812… while `.rail-strip.scrollLeft` stays 0. Focus is invisible off-canvas at 360, and at 1280 the cards sit under the side panel. Fails WCAG 2.4.7 / 2.4.11. | In `app.js`, add a `focusin` handler on `.rail-strip` that calls `card.scrollIntoView({inline:'nearest',block:'nearest'})` (respect reduced motion). If the root cause is the snap container, fix it there. Avoid `styles.css` to keep clear of the PD-1 lane. | Tabbing through every rail card keeps the focused card fully within the strip's visible box at 360 and 1280. Verify on WebKit CI. |
| PD-3 | P1 | Companion | **The primary tab "Map" opens a screen with no map.** "Map coming later" sits under it, and the content duplicates "Stages". The nav promises a feature that doesn't exist and gives two tabs for one destination. | Until map P0 clears: either drop the Map tab (two tabs: Stages, About; landing = Stages) or label it truthfully. Keep the `#/map` alias redirecting. Preserve the existing alias and deep-link tests. | No visible nav item says "Map" while no map renders. Old `#/map` links still resolve. |
| PD-4 | P1 | Companion | **The landing leads with internal QA stats.** The first screen at 360px is a caveat block ("130 current appearances · 107 provisional poster times · 23 time unknown · 23 stage unknown…"), then day chips, then the "Map coming later" box. **No stage is visible above the fold.** "28 with sourced times" on stage cards also contradicts "provisional". | Collapse the caveat to one line, e.g. "Times are from organizer posters and may change · Orlando time (EST) · [About these times]", and move the counts into About/Sources. Remove the map box from the landing. Use one vocabulary on cards: "28 sets · poster times". | At 360×740 the first stage card is visible without scrolling. No count string appears on the landing. Status words match About. |
| PD-5 | P2 | Companion | Stage set rows are about 110px tall with a lone dashed-circle glyph and "♫Hear X" (no space). Scanning 28 sets takes a lot of scrolling outdoors. | Put the status glyph inline with a text label ("Poster time"), add a space after ♫, and tighten rows to 72px or less while keeping 44px targets. | 28-set stage fits in ≤ 3.5 screens at 360. Each glyph has visible text. |
| PD-6 | P2 | Listening Room | Text under 12px: **41 visible elements, minimum 10px**. Row "YouTube" provider labels are 10px inside a 44px circle and barely legible at arm's length. | Raise `.provider-label` and meta text to at least 12px and make provider buttons pills (`YouTube`, `Spotify`) instead of circles. This keeps the established text-not-icon decision for compact rows (YOUTUBE-ICON-HANDOFF §brand minimum). | 0 visible text nodes under 12px (11px uppercase eyebrows allowed). No horizontal overflow at 280. |
| PD-7 | P3 | Listening Room | On the artist page, the full-size official YouTube mark (about 220px card) outranks the artist name and pushes "6 tracks" below the fold at 360. The brand minimum decision is respected; this is layout only. | After freeze: place the card beside the facts at ≥768 and make it a full-width shorter panel on phones, keeping the mark at its minimum height. | Deferred, not for tonight. |

## Verified fixed since the 2026-10-31 review
Shared root links keep the route (`redirect.js`). OG tags, favicon and apple-touch-icon ship. Artwork is 16:9 (`mqdefault`), so there are no letterbox bands. Lineup tab stops dropped from 459 to 122. Per-song accessible names are distinct. About is in the header. The EDC tagline is removed. The playlist card moved below the lineup. No horizontal overflow on any reviewed screen at 280–1280.

## Routing (freeze-compliant: only PD-1 to PD-4 tonight)
- **QA (#80 lane):** PD-1 in `listening-room/styles.css`.
- **Frontend:** PD-2 (`listening-room/app.js`), then PD-3 and PD-4 (Companion), then PD-5 and PD-6 only if PM lifts the freeze for P2.
- **Backend:** independent verification of PD-1 and PD-2, plus regression assertions. Continue the #79 geometry investigation.
- **PD-7:** deferred to v2.
