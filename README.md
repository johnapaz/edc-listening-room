# EDC Orlando 2026 — The Listening Room

Independent, unofficial festival music discovery. **Not affiliated with EDC or Insomniac.**

This repository implements a staged pipeline for official EDC Orlando artist identities, relational Notion exploration, deterministic track discovery scores, and real YouTube Music playlists. It uses the [official lineup](https://orlando.edc.com/lineup/) as source of truth.

**Naming convention:** **Listening Room** is the product. **Listening Room v0 (MVP)** is the first release (tracked in [#38](https://github.com/johnapaz/edc-listening-room/issues/38)). *“Find it. Hear it.”* is optional shorthand for finding a lineup artist and listening to a vetted recording—not an app name or version title. The approved [design brief](docs/ISSUE-35-LISTENING-ROOM-V0-DESIGN.md) defines the MVP and [#39](https://github.com/johnapaz/edc-listening-room/issues/39) tracks later releases.

## Ownership and credits

**Created and curated by John A. Paz.** © 2026 John A. Paz. Original work: all rights reserved. The publicly readable source is **not open-sourced under a permissive or other open-source license**; see [LICENSE.md](LICENSE.md) and [third-party notices](THIRD_PARTY_NOTICES.md). External music, imagery, festival source materials and trademarks remain with their respective rights holders. Public [Credits & licensing](https://listeningroom.app/about/credits/) includes creator profiles.

## Public app

**[Open Listening Room](https://listeningroom.app)** — no login. Browse the event lineup and open reviewed YouTube recordings. The shared event playlist is still pending; private pilot and Discovery playlists are not exposed. [App and hosting notes](listening-room/README.md).

## Catalog pipeline status (October 30, 2026)

- Seven connected Notion databases exist: Artists, Releases, Tracks, Genres, Playlists, Performances and Playlist Entries.
- The eight-person pilot group and two B2B performances are registered as provisional Notion records.
- An **11-track private, unranked listening preview exists** with exact ordered API readback ([latest result](docs/M1-PREVIEW.md#result-private-preview-published-and-read-back-2026-10-30)). Owner playback of the full playlist remains open in the committed record. This is **not an M1 pass**; public ranked releases remain blocked; private Discovery is separately authorized.
- A separate, approved **private all-artist Discovery release** is underway. Latest saved checkpoint (run 41087502389, state c344c82): **84 songs** in a private playlist, ordered YouTube Data API read-back verified, **41 of 106 catalog-bearing acts** searched, 65 remaining. A search-rate 429 paused further matching safely; this does **not** pass M1 or authorize public release. See [Discovery runbook](docs/DISCOVERY-PLAYLIST.md).
- [EDCO 2026 reference pack](data/edco-2026/README.md): complete lineup transcription, day-based companion seed, hours/map/stages, source conflicts, and an index of existing music evidence. **107 source-transcribed poster times now available (35 Friday, 36 Saturday, 36 Sunday); live organizer re-verification pending.** Three earlier lineup entries remain unscheduled; see the reference pack for differences.
- [Current agent handoff](docs/EDCO-2026-HANDOFF.md) includes the three recovered MusicBrainz searches and already-fetched Benda metadata, avoiding repeat requests. Older pilot documents retain historical status text; consult their latest dated updates.

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

The present code is the **pilot foundation**, not an end-to-end production ingestion system. OAuth and a live private preview run now work. Completing M1 still requires full recording/version review, permitted listening metrics and licensing, deterministic ranking evidence, Notion projection/idempotence, and owner playback sign-off. Ranked and public ingestion remain blocked until M1 passes; the separate private Discovery release may continue under its own approved gates.
