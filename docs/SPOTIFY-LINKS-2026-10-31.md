# Spotify links — scope and decision (2026-10-31)

Owner-approved: John, 2026-10-31.

## Decision
Listening Room adds **plain outbound "Spotify ↗" links** beside the YouTube links, plus an **Event playlists** card that links Insomniac's official EDC Orlando 2026 Spotify playlist. YouTube stays the primary, reviewed action.

## What gets a link
- A track gets `spotify_url` only when its published source-review row's `song_key` is that exact Spotify track ID, and the same URL is in its `source_urls`. The YouTube match was reviewed against that ID, so both buttons point to the same song. The build fails on a malformed ID.
- Coverage at merge: **255 of 295** public tracks. The 12 pilot tracks and 28 other rows have no Spotify source and get no link. Nothing is guessed.
- The official playlist is linked as-is, labelled as curated by Insomniac and not made or checked by Listening Room.

## Verification
- Offline (always): 218 of the 255 IDs cross-check against `data/edco-2026/discovery-candidates.json` with identical normalized titles and overlapping credited artists. The other 37 came from later Notion captures that are not in the repo snapshot. Tests enforce URL shape and source provenance.
- Online (CI, `.github/workflows/spotify-links.yml`): `scripts/check_spotify_links.py` calls Spotify's public oEmbed endpoint for every link (no credentials) and fails on any missing or renamed track. It runs on PRs that touch song or playlist data, and on manual dispatch.
- Spotify playback is **not** separately reviewed, and the help pages say so.

## Explicitly out of scope
- **Spotify Web API / OAuth / "save to my Spotify".** Since March 2026, Development Mode requires Premium and is capped at five users and one Client ID, so a public feature would need extended quota approval. This is not realistic for v0, and it conflicts with the $0 / no-secrets rule.
- **Embedded Spotify players.** They load third-party scripts and cookies; the site currently loads only YouTube thumbnails.
- **Spotify-only tracks** for acts without a YouTube match (4 acts), and **artist-profile links** (15 of 98 derivable artist IDs are ambiguous). Revisit after v0.

## Guardrails kept
- The privacy page says Spotify sees nothing until a visitor taps a Spotify link. The CSP is unchanged, and no Spotify assets or logos are loaded.
- The former blanket "no Spotify in public songs" test now allows only `spotify_url`, with an exact shape and provenance.
