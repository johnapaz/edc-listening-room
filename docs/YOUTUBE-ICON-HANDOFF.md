# Handoff: official YouTube icon on song buttons

**Owner decision (John, 2026-10-31):** always use official brand icons. Do not use look-alikes, redraws, icon-font versions (Bootstrap Icons, Font Awesome, Simple Icons and similar) or the generic play glyph as the final state.

## Why this is a handoff
Claude's cloud session could not reach the official source. `www.youtube.com`, `www.gstatic.com` and `upload.wikimedia.org` were all refused by the network policy, so it could not download the brand file. The Bootstrap Icons `youtube.svg` was reachable, but it is not the official asset, so Claude did not use it.

## Task
1. **Get the official asset.** Download the YouTube icon (the red rounded rectangle with the white play triangle) unmodified from YouTube's brand resources: <https://www.youtube.com/howyoutubeworks/resources/brand-resources/>. Prefer the SVG full-color icon. Record the exact download URL and date in the commit message and in `THIRD_PARTY_NOTICES.md`.
2. **Commit it unmodified** as `listening-room/youtube-icon.svg`. No recoloring, cropping, re-drawing or path edits. Optimizing whitespace or metadata is fine only if the rendered pixels are identical.
3. **Ship it to the public site.** Add `youtube-icon.svg` to the copy list in `scripts/build_public_site.py` (`for name in ['index.html', 'app.js', ...]`). The CSP `img-src 'self'` already allows it. Do not hotlink from YouTube or gstatic.
4. **Replace the placeholder** in `listening-room/app.js`. Swap `playIcon()` and the `"YouTube"` text in `songRow` for `<img src="youtube-icon.svg" alt="" width=… height=…>`. Keep the existing per-song `aria-label` ("Open <title> by <artist> on YouTube (opens in a new tab)"), and give the image an empty `alt` so the name is not doubled.
5. **Make the button compact, not a big mint pill.** This is what John asked for. The icon displays at about 28 to 32px wide on a transparent background. The tap target stays at least 44×44px through padding or `min-width`/`min-height`. Show a visible `:focus-visible` outline and a hover state, and do not recolor the icon. Remove the `.btn` mint fill from song buttons only. "Listen on YouTube Music" on the playlist card stays as it is.
6. **Follow the brand guidelines on the resources page:** minimum size, clear space, and no placement on busy backgrounds. If they require the icon to sit with the word "YouTube" or meet a minimum size, follow that over step 5, and say so in the PR.
7. **Credits.** Add a "YouTube icon" entry to `THIRD_PARTY_NOTICES.md` and `about-site/pages/08-credits.html`: trademark of Google LLC, used to indicate a link to YouTube, not an endorsement. Update any help-page copy or screenshot guard that quotes the old "YouTube" button text. The `tests/test_about_site.py` guards will flag it.

## Acceptance
- `listening-room/youtube-icon.svg` is byte-identical to the official download, or differs only in documented metadata.
- Song rows on the artist page and the Tracks page show the official icon. Nothing is mint-filled, and there are no other buttons with text.
- Screen-reader link names are still distinct per song.
- The tap target is at least 44×44 at 280, 360 and 1280px, with no horizontal overflow at 280px.
- No console errors under the production CSP. `tests/ui_smoke.js` and the Python tests pass.
- The public build includes the SVG and no file outside the allowlist.
