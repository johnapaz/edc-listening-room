# Claude: review the live Listening Room design

John explicitly requested this review after approving the demos and authorizing the public launch. Review the working product at **https://listeningroom.app** and the current `main` implementation. Keep this PR open while the review is in progress; append findings and evidence here, then open a bounded implementation PR for justified fixes. This is a review request, not an unreviewed redesign or a reason to take the live app down.

## Preserve the approved direction

Listening Room is the locked product name. Use the lineup-first Layout B, After Dark Radio palette, Lineup/Listen navigation, fast artist-to-reviewed-recording path, and public no-login experience. Real music imagery and clickable artist names/credits/song titles are owner requirements. Use the existing app, not a new scaffold. Do not expand into playlist generation, accounts, OAuth, a festival planner or new paid services. Keep private pilot/Discovery playlists, Notion links and source files out of `public-site/`.

Read `docs/ISSUE-35-LISTENING-ROOM-V0-DESIGN.md`, launch #44, MVP #38, merged #43/#46 and About/FAQ #45, plus `listening-room/README.md`. Current song coverage is deliberately limited to 12 reviewed recordings across 9 artist identities; the full lineup remains browsable and the shared playlist is not published. Review the empty states without inventing missing catalog data.

## Review the actual experience

1. Open the apex with no account/session. Inspect 360px phone, 280px Fold cover, tablet/unfolded and desktop; check 200% zoom/reflow, reduced motion and keyboard use. Distinguish an emulated viewport from a real-device test.
2. Judge visual hierarchy, compactness, typography, spacing, balance, imagery and whether it feels like a music app. Artwork must load from the reviewed YouTube video, remain correctly attributed, and fall back without a broken box. Do not substitute fabricated artist portraits or scrape arbitrary promotional photos.
3. Complete search → performance → exact song, B2B → individual artist, day browsing, Lineup ↔ Listen, About ↔ app, direct-link sharing, and browser Back/Forward. Check that context survives and that every displayed artist name, song title and supported day/stage facet has the right destination. No nested links or dead affordances.
4. Check hover/focus/active/touch states, target sizes, heading/focus order, external-link naming, contrast, long billings, empty searches, absent songs and image/data-loading failures. The skip link must focus content without resetting the hash route.
5. Verify copy matches current behavior: poster-transcribed times are caveated, no implied stage/genre verification, no fake playback or offline promise, and privacy reflects YouTube-hosted artwork.

## Deliver a useful result

Post a concise prioritized review on this PR: severity, observed problem, screenshot/viewport, affected path, practical fix and acceptance check. Lead with the few changes that matter most. Include what already works and any checks you could not run. Avoid a speculative feature backlog.

Implement clear, bounded improvements in a separate PR if appropriate under John's authorization; run the repository tests, reference validator and public-build contract. Record real browser evidence. Public changes ship through the existing Cloudflare Pages project `listening-room`, output `public-site/`. Codex owns domain/DNS/HTTPS support and is watching incoming Claude PRs; flag any hosting integration needed in the PR. Preserve the explicit public allowlist when adding pages/assets.
