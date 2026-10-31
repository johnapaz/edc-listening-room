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

---

# Findings (Claude, 2026-10-31)

**Scope and method.** I reviewed `main` at `203c207`; WebFetch confirmed the live `listeningroom.app/listening-room/` serves the same build. I built `public-site/` locally, served it with its own `_headers` CSP, and drove Chromium (Playwright) at 280px (Fold cover), 320px (≈200% zoom on a 640px window), 360px, 768px and 1280px, with keyboard checks.

**Emulated, not real devices.** The sandbox cannot reach `listeningroom.app` or `img.youtube.com`. Where artwork matters, I substituted a *simulated* 480×360 `hqdefault`-style frame (16:9 picture with black bars, labeled "SIMULATED") to show how real 16:9 thumbnails render. Every other screenshot uses the app's real initials fallback.

Evidence images are in [`docs/design-review-2026-10-31/`](design-review-2026-10-31/).

## Lead with these (P1)

| # | Problem (observed) | Where | Fix | Acceptance check |
|---|---|---|---|---|
| 1 | **Shared root links lose the route.** `listeningroom.app/#/artist/edco26:2026-11-08:martin-garrix` lands on the plain lineup, because the root meta-refresh drops the fragment. | `/index.html` | Redirect with a same-origin `redirect.js`: `location.replace('/listening-room/' + location.hash)`. Keep a `<noscript>` meta refresh. | Opening `/#/artist/<id>` shows that artist, and `/` still opens the lineup. |
| 2 | **Link previews and icons are missing.** Neither the root nor the app has `og:*`, `twitter:*`, `icon` or `apple-touch-icon`, so a link pasted into iMessage or WhatsApp shows a bare URL, and `/favicon.ico` 404s. This matters for a soft launch shared by text. | `/index.html`, `/listening-room/index.html` | Add preview metadata pointing at `/og.png`, plus `/favicon.svg` and `/apple-touch-icon.png`. The assets ship in #48. | The tags are present, the three assets return 200, and a preview validator shows the card. |
| 3 | **YouTube thumbnails show baked-in black bars.** `hqdefault.jpg` is 4:3 with letterboxing for 16:9 videos. With `object-fit: contain` in 4:3 boxes, every featured card, artist hero and song row shows thick black bands top and bottom ([02](design-review-2026-10-31/02-artist-letterbox-sim-360.webp), [03](design-review-2026-10-31/03-featured-letterbox-sim-360.webp), [07](design-review-2026-10-31/07-desktop-1280.webp), [08](design-review-2026-10-31/08-tablet-768-b2b.webp), all simulated). This is the biggest "feels like a music app" gap. | `styles.css` artwork boxes | Make artwork boxes 16:9 and use `object-fit: cover`. This trims only the letterbox, so the full video frame stays and attribution is unchanged. Keep the fallback layer. | On a networked device at 360 and 1280, there are no black bands on reviewed thumbnails, and the fallback still shows initials when an image fails. |
| 4 | **The same row does two different things.** For acts with a song, the lineup row's artwork opens **YouTube in a new tab**, while the name and the ↗ open the artist page. Tapping the picture unexpectedly leaves the app. | `app.js` `rowFor` | Point lineup-row artwork at the artist page. Keep YouTube artwork links on song rows and discovery cards, where the song is the subject. | Every target in a lineup row except the day facet opens the artist page. |
| 5 | **Keyboard users face 459 tab stops on the lineup.** Each row has four links, and three of them (artwork, name, ↗) go to the same page. | `app.js` `rowFor`, `songRow` | Give the duplicate artwork and ↗ links `tabindex="-1"` and `aria-hidden="true"`. They stay tappable. | About 2 stops per row (name and day); total stops roughly halve. |
| 6 | **Ambiguous "YouTube" button names.** Each song's button announces only "YouTube (opens in a new tab)", identical for every song in a list (WCAG 2.4.4). | `app.js` `songRow` | Use `aria-label="Play <title> on YouTube (opens in a new tab)"`. | The screen-reader links list shows a distinct name per button. |
| 7 | **About is effectively hidden.** The only link is in the footer, which sits below 110 rows (~12,400px down at 1280px). | `index.html` header | Add an **About** link in the header bar, with a 44px target. | It is reachable within 3 Tab presses and visible without scrolling at 280px. |

## Next (P2)

| # | Problem | Fix |
|---|---|---|
| 8 | **Text under 12px.** Eyebrows render at 9.6px, "Coming soon" at 10.4px, song counts and the footer at 11.5px ([01](design-review-2026-10-31/01-lineup-360.webp)). Hard to read outdoors. | Floor of 12px for body and meta text; 11px minimum for uppercase eyebrows. |
| 9 | **"See you under the electric sky"** is Insomniac's signature EDC tagline. In an unofficial product it reads as affiliation. | Replace it with neutral copy, e.g. "Press play before you go." |
| 10 | **↗ means "external" everywhere except the lineup row**, where it opens an internal page. | Use → (or ›) for the internal row arrow. |
| 11 | **A disabled feature sits in prime position.** The "Event playlist · Coming soon" card sits between the discovery cards and the lineup, pushing the list below the fold at 360 and 1280 ([07](design-review-2026-10-31/07-desktop-1280.webp)). | Show the card on Listen only until the playlist is published. On Lineup, show it when it is live. |
| 12 | **An empty placeholder fills the first screen.** For acts without a song, the full-size initials hero takes ~260px at 280px wide and pushes day and time below the fold ([05](design-review-2026-10-31/05-fold-280-b2b.webp)). | Use a compact tile (about 96px) beside the name when there is no reviewed video. |

## Works well (keep)
- **Navigation and history.** Search, day, Back and Forward round-trip correctly, and **scroll position survives Back** (measured: 6,785px before and after). The skip link focuses `main` without touching the hash. Tab order runs skip → brand → search → day toggles.
- **Layout.** No horizontal overflow at 280, 320 or 360, including the longest billing (*Luke Dean B2B George Smeddles (Sunset Set)*, [05](design-review-2026-10-31/05-fold-280-b2b.webp)).
- **Honest states.** These are clear and correct: empty search ([06](design-review-2026-10-31/06-empty-360.webp)), data-load failure (error plus official-lineup link), "Songs on the way", poster-time caveats, "Billing differs between sources", and a playlist with no dead link.
- **Safety and policy.** No console errors under the production CSP. No nested interactive elements, no fake playback, no stage filter without verified data.

## Considered for v2, not now
- **Light or auto theme.** Daylight readability at an outdoor festival is a real argument. Tokens are already centralized, so following `prefers-color-scheme` is moderate work. Add an explicit toggle only if people ask. Shelved per John (2026-10-31).
- **Day section headers.** In the "All" view, sticky headers ("Friday · 37 acts") would make 110 rows scannable.
- **Desktop layout.** Top navigation instead of the phone-style bottom tab bar, and a two-column lineup at ≥1024px.
- **Times on the list.** Show caveated poster times and stages on lineup rows, so planning doesn't need a tap per act.
- **Search label.** A visible label instead of a placeholder-only search field.

## Not checked
- Real phones and Fold hardware, iOS Safari and VoiceOver/TalkBack: every check here used emulated viewports.
- Real YouTube thumbnails and the live domain's HTTPS/redirect behavior, which my sandbox can't reach.
- 200% zoom was approximated by a 320px viewport, not browser zoom.

## Notes compared with Codex's copy/UX pass (01:15 ET)

John asked both agents to compare notes. In the 05:13Z comment, Codex scoped its pass as plain task-focused copy, clearer available-song discovery, the applicable navigation and accessibility fixes above, a refresh to the current 130-entry organizer lineup, and the extensionless legacy About redirect. Here is how the pieces divide so nothing is done twice.

| Item | Status | Owner |
|---|---|---|
| Findings 1–12 above | Implemented and tested in **#49**, which touches `listening-room/*` and `index.html`. Offered to Codex to merge first or cherry-pick. | Codex decides |
| Copy rewrite (#9 tagline, eyebrows, empty states) | #49 only replaces the Insomniac tagline. The broader copy pass is Codex's. | Codex |
| Available-song discovery | Codex's. Today 6 of 110 entries have a song, so a "has songs" view or an earlier Listen entry point is the right lever. | Codex |
| Lineup refresh (110 → 130) | Codex's. `/about/` counts and day cards update automatically. | Codex |
| Help pages staying accurate after copy and lineup changes | **#50** fails tests if quoted UI copy or search examples go stale. Claude refreshes `/about/` copy and screenshots after Codex's pass merges. | Claude |
| Legacy `/listening-room/about.html` and extensionless `/listening-room/about` redirect | Codex is fixing it. The rule in #48 covers only the `.html` form. | Codex |

**Merge order that avoids conflicts:** #50 (help guards; touches no app files), then #49 (or its hunks), then Codex's copy/lineup pass. Claude then refreshes the docs and screenshots.
