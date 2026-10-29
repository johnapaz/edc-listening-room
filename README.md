# EDC Orlando 2026 — The Listening Room

Independent, unofficial festival music discovery. **Not affiliated with EDC or Insomniac.**

This repository implements a staged pipeline for official EDC Orlando artist identities, relational Notion exploration, deterministic track discovery scores, and real YouTube Music playlists. It uses the [official lineup](https://orlando.edc.com/lineup/) as source of truth.

## Status (October 29, 2026)

- Seven connected Notion databases exist: Artists, Releases, Tracks, Genres, Playlists, Performances and Playlist Entries.
- The eight-person pilot group and two B2B performances are registered as provisional Notion records.
- This feature branch contains read-only MusicBrainz artist candidate search and release-group browsing, quota-bounded YouTube candidate suggestions, pure scoring, a private-playlist writer with resume and readback, and automated no-network tests.
- **No catalog bulk import, live API pilot execution, OAuth authorization, actual playlist, or public guide publication has occurred.** The playlist writer cannot be used without human-approved IDs, OAuth credentials, explicit user confirmation and quota headroom.

[Notion Listening Room](https://app.notion.com/p/4080e646ca0d814287d0c3579187c102) · [Notion Pilot Contract](https://app.notion.com/p/4080e646ca0d81399702c8990cd1d8d8)

## Quick start (zero dependencies, zero network)

Requires Python 3.11+.

~~~sh
python -m unittest discover -s tests -v
python -m edc.cli research
~~~

Read the [pilot acceptance and implementation plan](docs/M1-PILOT.md) and [browser-only Google OAuth setup](docs/OAUTH-BROWSER-SETUP.md) before enabling a live API request.

## Design decisions

- Catalog scope: primary releases and credited official remixes/collaborations, not full DJ mixes or unofficial bootlegs.
- Ranking: globally strict top 100 plus a separate balanced all-artist playlist, and top 20 per verified genre.
- Costs: $0 paid services unless expressly approved; conservative, separately metered YouTube Search and general quota budgets.
- Public releases: desired from the start, but behind a private human-verified pilot and explicit publishing review.
- State and secrets: no secrets in source, Notion, or logs. Resume existing pilot playlists rather than blindly recreating them.
- Git strategy: feature branch → reviewed PR into main; only an explicitly approved workflow on main may write to YouTube.

## Important implementation boundaries

The music metadata source and popularity metrics have distinct licensing terms. YouTube search results must be reviewed for the correct recording and availability in YouTube Music. Being present in YouTube's Data API does not prove a song can be played in YouTube Music.

The present code is the **pilot foundation**, not an end-to-end production ingestion system. Completing M1 requires MusicBrainz ID review, recording candidate collection, permitted listening metrics, actual YouTube match approval, Google OAuth, a live private playlist run and a human playback test. Bulk ingestion remains blocked until this pilot passes.
