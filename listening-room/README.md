# Listening Room v0 (MVP)

Static, zero-dependency app (issue #38). Independent and unofficial. **Not deployed; not approved for public release.**

Run: `python3 -m http.server 8765` from the repo root, open `http://localhost:8765/listening-room/`.

## Data (no new sources)
- `data/edco-2026/{performances,artists,venues,event}.json`: lineup and day assignments, unchanged from `main`.
- `data/listening-room/songs.json`: derived by `scripts/build_listening_room_songs.py` from `pilot/preview-approved.json` (human-reviewed exact YouTube IDs). 12 songs, 9 artists. Discovery-playlist matches and Spotify candidates are **not** used.
- `data/listening-room/playlist.json`: `pending_authorization`, no URL. The UI shows an honest unavailable state until an owner-authorized, cross-account-tested playlist is recorded here (`status: published`, `verified_cross_account: true`).

## Behavior
Hash routes `#/lineup?day=&q=&stage=`, `#/artist/<performance_id>`, `#/listen`. Back restores search and day. Stage/time text appears only from performance data: `verified` is shown as fact, `poster_transcribed` (draft #36) with a "not yet cross-checked" caveat, everything else as unknown. The stage filter appears only when verified stage data exists; genre filtering is absent because no genre data is verified.

## Tests
`python3 -m unittest discover -s tests` (includes node logic tests), and the browser smoke test `NODE_PATH=$(npm root -g) node tests/ui_smoke.js [screenshotDir]` with the server running.
