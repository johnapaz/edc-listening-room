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

## Codex source verification — October 31, 2026

The official source is reachable in this session. The legacy brand-resource URL redirects to <https://brand.youtube/>. The icon page, <https://brand.youtube/youtube-icon/>, links this official archive:

<https://www.gstatic.com/marketing-cms/78/29/3e68a1414bb28d0b7e47b44c3c91/youtube-icon.zip>

The archive supplies PNG, EPS and AI digital assets; **it does not contain an SVG**. The full-color PNG is committed unchanged as `listening-room/youtube-icon.png`, extracted from `YouTube_Icon/Digital/01 Red/yt_icon_red_digital.png`. No conversion or redraw was performed.

SHA-256: `1027b1b0517727adb9697155a270744381c3ce9b047b1c8bd8a9389dc7d07a83`

### Integration hold

The current official icon page's Clear Space guidance states a digital minimum height of **100px** and requires clear space defined by the icon's triangle. The API branding guidelines also defer minimum size to the brand site: <https://developers.google.com/youtube/terms/branding-guidelines>. That conflicts with the requested 28–32px-wide icon inside a compact 44px target. Step 6 above explicitly prioritizes official minimum sizing. Do not claim that a 28–32px rendering passes the verified current guidance.

The asset is staged for the eventual implementation, but is deliberately not added to the public build or rendered yet. This PR remains open until the compact presentation can be reconciled with current official guidance, or the approved UI is revised to satisfy it. Do not substitute an unofficial SVG.

Dependency update: PR #70 supersedes #58 and includes its search-context fix. Integrate icon controls against the accepted final v2 UI and Spotify PR #68 so later changes cannot restore placeholder glyphs or overwrite provider actions.

## Integration closeout — October 31, 2026

The public build now ships the unchanged PNG. The artist primary YouTube link renders it at 100px high, with 32px clear space on a solid panel. Compact lineup and song links use visible YouTube text, and the rail uses its existing linked artwork and track title. All generic play glyphs have been removed. This deliberately supersedes the compact branded-icon acceptance criterion: a 28–32px mark cannot satisfy the source's stated minimum. Existing per-track accessible names and Spotify links are preserved. No Companion release is included.
