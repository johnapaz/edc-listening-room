# Listening Room v0

Public, no-login music discovery at https://listeningroom.app. Independent and unofficial.

- Source: `listening-room/`; 12 reviewed direct YouTube recordings across 9 artists. Other artists stay discoverable with intentional artwork fallbacks and honest empty states.
- Images: unchanged, provider-hosted YouTube thumbnails for those exact reviewed videos, labeled as YouTube artwork and linked to the original video. No generated or scraped artist portraits. Image failure preserves layout and initials. See https://developers.google.com/youtube/data/reference/rest/v3/thumbnails and https://developers.google.com/youtube/terms/developer-policies.
- Artist names, individual B2B credits, exact song titles and day facets are links. Browser history retains the original search/filter context. Stage filters remain hidden until independently verified; poster-transcribed times are caveated.
- Shared event playlist remains unavailable. No private playlist or Notion data is published.

## Build and deploy

Cloudflare Pages project `listening-room` builds `main` using `python3 -m unittest discover -s tests && python3 scripts/validate_edco_reference.py && python3 scripts/build_public_site.py`, output `public-site/`.

The build also renders the About & Help pages at `/about/` from `about-site/` (see `about-site/README.md`), plus the site favicon, home-screen icon and link-preview image at the root.

The build uses an explicit file and field allowlist. Never deploy or serve the repository root: artist source records include internal Notion links. Public output strips those and source-review metadata. Top-level `404.html` prevents SPA fallthrough from exposing misleading responses for private paths.

DNS is hosted by Cloudflare, registration by Hover. Apex and www attach to Pages; www redirects to the apex. No Cloudflare Access policy or visitor authentication. No paid services or new runtime secrets.

For local QA, build then serve `public-site/`. Tests: `python3 -m unittest discover -s tests`, `node --test tests/listening_room.test.js`, `python3 scripts/validate_edco_reference.py`.
