# Event Day Companion — review-only MVP

Status: proposed; **not deployed or approved for public release**. Agent: ChatGPT (Codex stand-in), 2026-10-30. This is issue #29's first working, static slice and does not satisfy its final acceptance until reviewed.

## Run locally

From **repository root** (Python 3.11+):

~~~sh
python -m http.server 8000
~~~

Open \`http://localhost:8000/companion/\`. Opening \`index.html\` directly via \`file://\` is not supported because browser fetch permissions differ. No build step, install, authentication, paid service or API token is needed.

## Scope and data contract

- Reads the existing checked-in \`data/edco-2026/{performances,artists,discovery-candidates,venues,event}.json\`; no parallel catalog, sync or public API.
- Mobile-first lineup by Friday/Saturday/Sunday/all; search by billing, artist or candidate song title; bookmarked **performances** using browser-local storage; up to five source-captured tracks per billing with outbound Spotify links; official organizer map/FAQ.
- All stage/time fields come only from verified schedule data. Missing values display \`Stage TBA\` and \`Time TBA\`. Listing order is **not** set order, and B2B billing stays intact. Source conflicts are flagged.
- Captured Spotify songs are discovery suggestions, **not** approved recordings, YouTube Music matches, confirmed festival setlists or playback guarantees. Do not expose the private playlist as public, and never treat this as a completed M1 acceptance.
- Browser-local picks have no cross-device sync and may be lost when site data is cleared; no login, tracking or user data sent to a backend. No offline caching or service worker. Fetch needs HTTP connectivity to the host.
- Preserve existing artist/performance IDs when schedule data is updated, so saved picks remain stable.
- Do **not** deploy or publicly publish this branch without explicit owner approval and a fresh data/rights/publication review. It is safe to preview locally or via a private review environment.

## Review/acceptance checklist

- [ ] Open via a local HTTP server at mobile viewport; Friday/Saturday/Sunday show 36 reference rows each, All shows 108 before filtering.
- [ ] Search names with accents, B2B billings, and captured song titles; no HTML injection, no misleading matching status.
- [ ] Save/unsave picks, filter My picks, reload, verify persistence; verify storage-disabled fallback.
- [ ] Verify TBA fields and lineup conflict flags; never imply an official ordered timetable.
- [ ] Check representative artist/song outbound links and the official map.
- [ ] Verify keyboard interactions, focus, empty state, offline/unavailable-file error and no unexpected external requests.
- [ ] Before public release: confirm current official timetable, legal/data-link posture, intended access and deployment approval.

## Workstream handoff

Issue #27 (private music discovery) can continue independently after rate-limit investigation and fresh owner quota/environment approvals. Issue #28 owns official stage/set-time verification; update the existing JSON as authoritative sources are released. Stretch API #16 is deliberately not part of this MVP.
