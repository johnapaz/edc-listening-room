# About & Help pages

Source for `https://listeningroom.app/about/`. `scripts/build_about.py` renders it into `public-site/about/` as part of `scripts/build_public_site.py`, so the Cloudflare Pages build needs no extra step. Stdlib Python only; no client framework.

| Path | What it is |
|---|---|
| `pages/NN-slug.html` | One page each, in nav order. A header comment sets `slug`, `title`, `nav`, `description`, and optionally `summary` (guide card) and `lede`. The body is an HTML fragment. Every `<h2>`/`<h3>` needs an `id`; those become the "On this page" list, section links and search results. |
| `assets/` | `about.css` (same tokens as the app) and `about.js` (help search, copy-a-section-link, current-section marker). Pages work without JS. No inline scripts or `data:` URIs: the site CSP blocks both. |
| `img/` | App screenshots plus `shots.json` (file, width, height), and the first-party creator portrait `john-paz.webp` (always copied). |
| `brand/` | `favicon.svg`, `apple-touch-icon.png`, `og.png` (link preview). Copied to the site root. |

## Directives

Resolved at build time against the same public data the app loads, so numbers and lists never go stale. Unknown directives, links to missing pages or anchors, unknown app artists and missing screenshots fail the build.

- `{{stat lineup_entries}}`: a live number or date; see `Data.stats()` for names.
- `{{app artist/<performance_id> | text}}`, `{{app lineup?day=2026-11-06 | text}}`, `{{app listen | text}}`: deep link into the app.
- `{{page schedule#set-times | text}}`: link to another help page, optional anchor.
- `{{ext https://… | text}}`: external link, new tab, announced to screen readers.
- `{{shot name | alt text | caption | wide}}`: screenshot from `img/shots.json`.
- `{{list songs|days|stages|b2b|guides|playlist}}`: generated lists. `playlist` switches copy when `data/listening-room/playlist.json` is published and cross-account verified.

The creator portrait is copied from John A. Paz’s own published portfolio image to <code>img/john-paz.webp</code> and is **not** subject to screenshot freshness checks. Social icons use Bootstrap Icons (MIT); see [third-party notices](../THIRD_PARTY_NOTICES.md).

## Refreshing screenshots

When the app's look changes:

~~~sh
python3 scripts/build_public_site.py
(cd public-site && python3 -m http.server 8766) &
NODE_PATH=$(npm root -g) node scripts/about_screenshots.js http://localhost:8766 about-site/img
~~~

Song artwork loads from `img.youtube.com`. Run the capture with network access to show real thumbnails; without it the app's initials fallback appears. The brand images are rendered by `scripts/render_brand_assets.js`.

## Tests

`tests/test_about_site.py` builds the section into a temp directory and checks titles, descriptions, scripts, every internal link and anchor, app deep links, image alt text and sizes, live numbers, playlist copy, the search index and the absence of private data.
