# Listening Room v0 — Session 3 design brief (REVISED after owner feedback; awaiting final sign-off)

**Status:** Updated after owner's Session 3 critique. Layout B and After Dark Radio color direction selected; playlist/artist-first interaction clarified. Final approval still pending. Review-only design document for [#35](https://github.com/johnapaz/edc-listening-room/issues/35). **No implementation, deployment, playlist publication or PR #33 merge authorization.** Design owner review is the remaining gate. Date: 2026-10-30.

## 1. Decision baseline (approved in Sessions 1–2)

- **Listening Room** is an independent music-discovery product; **Event Day Companion** is a separate event-planning product, potentially interoperable later with permission. Initial event: **EDC Orlando 2026**, not a limit on the product's future.
- **One** event-linked playlist in v0, presented simply as the **EDC Orlando 2026 playlist**. Its proposed **Round Robin ordering** gives each eligible matched artist a turn before a repeat. **Owner correction in Session 3 supersedes earlier prominence decisions: Round Robin is secondary ordering metadata, not the product's headline, a feature mode picker, or a prominent CTA.** “Everyone gets a spin” may explain the ordering inside an optional playlist detail.
- One **initial** separately approved unlisted/link-shareable event playlist remains the starting point, rather than changing the existing private pilot playlist. **Latest owner direction:** allow **day-specific curated playlist variants** (e.g. Friday/Saturday/Sunday) and explore genre/stage-specific sets, so **one total playlist is no longer a fixed product limitation**. Release sequencing and actual playlist counts remain subject to feasibility and final owner approval. Unlisted means accessible to people with the URL, *not private* or a substitute for authorization. **No account connection, API keys, native playback, live playback-state sync or personalized playlist editing for listeners**.
- Three supported journeys: (1) newcomer finds lineup search immediately, with a nearby straightforward link to the event playlist; (2) explorer searches/browses lineup, opens an artist, sees a deliberately limited set of *validated* tracks, and selects an **exact YouTube listening link** rather than facing generalized YouTube search results; (3) returner revisits the same playlist and catalog without an account.
- Shallow two-destination navigation: **Listen** and **Lineup**. Mobile-first; no required personalization survey. No functional Discovery Shuffle or Pure Shuffle, favorites, per-user synced picks, multi-event UI, itinerary builder or offline-first capability in v0.
- Content sources: checked-in EDCO 2026 reference pack, approved/validated song matches and current official source evidence. Day, stage and time must be distinguished; unspecified fields are unknown. Verify latest official published schedule through [#28](https://github.com/johnapaz/edc-listening-room/issues/28), not from hardcoded prior assumptions. Source order is not set order. Keep B2Bs/special billing intact.
- Independent/unofficial presentation; avoid organizer marks and misleading brand affiliation. $0 paid services without explicit approval.

## 2. Two LOW-FIDELITY mobile navigation treatments (not production UI)

Both retain two approved top-level destinations **Listen / Lineup**. The owner has explicitly **selected B — Lineup-first** and rejected A as too vague and oddly spaced. The visual mockups below show hierarchy, not literal styling.

### A — Listen-first hub (REJECTED in Session 3)

```text
LISTENING ROOM         EDCO '26
Your lineup, on repeat.
[Round Robin / Everyone gets a spin]
[Listen in YouTube Music]
[Explore full lineup]
    Listen  |  Lineup
```

The prior draft wrongly centered a *playlist ordering mechanic* and did not adequately explain either the playlist's contents or the broader music-discovery product. Excessive spacing and a narrow-fold-specific look further weakened it. Do not revive this layout as the default.

### B — Lineup-first music discovery (SELECTED)

```text
┌────────────────────────────────┐
│ LISTENING ROOM       ORLANDO 26│
│ Find your next favorite.       │
│ Explore artists at EDC Orlando │
│ [ Search the lineup...       ] │
│ [ All ] [ Fri ] [ Sat ] [ Sun ] │
│                                │
│ THE EVENT PLAYLIST             │
│ Songs from artists on this     │
│ lineup. [Open on YouTube Music]│
│ [About this playlist ▾]        │
│                                │
│ ARTISTS                        │
│ [Artist / verified day]      → │
│ [B2B billing / verified day] → │
│ [Artist / verified day]      → │
│                                │
│   ◉ Lineup       ♫ Listen      │
└────────────────────────────────┘
```

**Artist drill-down, key owner-requested flow:**

```text
← Lineup / search results
ARTIST NAME
Verified event date • stage/time if known
LISTEN TO THEIR MUSIC
[Song title — verified recording] [YouTube ↗]
[Song title — verified recording] [YouTube ↗]
[Song title — verified recording] [YouTube ↗]
No validated songs? Explain honestly.
```

Artist search stays constrained to **this event's verified lineup and billings**. Track listings are the project's small curated/validated choices, not YouTube's unrestricted search results. Each link targets a **specific validated YouTube recording/video**; it is not a new external YouTube search. Optional later enhancement: open at a specific entry *inside the shared playlist*, but this requires verification of playlist positions/deep-link behavior and is **not assumed for v0**. Preserve search text/day filter/back navigation on return.

**Layout guidance:** compact information density with comfortable spacing, not giant decorative gaps. Use responsive widths for narrow Fold front screen, ordinary 360–430px phones, Fold unfolded/tablets, zoom/reflow; do not optimize exclusively for one device. Keep playlist easy to find without giving its ordering a hero. Exact presentation remains subject to usability testing.

**Decision:** B selected, no further A/B poll needed.

## 3. Visual and voice direction options

| Option | Style | Strength | Concern |
|---|---|---|---|
| **After Dark Radio** (owner likes the colors) | Deep ink/navy, restrained mint + soft coral highlights, ample spacing, oversized expressive headings, highly legible body text | Distinct music atmosphere with calm controls; can reuse accessible parts of PR #33's styling | Check contrast on pastel text; keep glow/animations restrained |
| **Flyer Wall** | Hot neon, poster-like textures, loud typography | Festival energy | Information density, contrast, small-screen legibility, possible organizer-brand confusion |
| **Record Sleeve** | Warm paper/charcoal, editorial album-library look | Quiet credibility and readability | May undersell the festival/discovery energy |

**Owner-selected colors:** After Dark Radio's deep ink/navy with restrained mint and coral. Retain and refine the spacing/hierarchy for B; other stylistic implementation details remain draft. **Public-facing language:** lead with **“Listening Room”**, with “EDC Orlando 2026” strictly as the event being explored and an unobtrusive “Independent, unofficial; not affiliated with Insomniac or the event organizer” clarification. Don't position product acronym **EDC** alone as the Listening Room brand: here EDC may mean Event Day Companion, but in festival context it is easily confused with Electric Daisy Carnival. Do not reuse official EDC artwork or organizer logos. Names should be memorable but not overexposed: **“EDC Orlando 2026 playlist”** in the visible surface; explain “Round Robin — everyone gets a spin” in optional playlist details, including how one eligible artist gets a turn before repeats. Primary actions are **“Explore the lineup,” “Listen to the playlist,”** and **“Listen on YouTube”** for specific validated songs.

Tone: joyful, curious and concise; no pseudo-DJ claims, inflated completeness promises or confusing technical/API terms.

## 4. Screen and state contract

- **Landing / Lineup-first:** immediately visible event-scoped artist search and day filters, compact *EDC Orlando 2026 playlist* callout, accessible artist rows. Clarify that the playlist contains available, matched songs from lineup artists. Round Robin sequencing belongs in optional “About this playlist” copy, not the primary title. Show measured coverage when validated, including unrepresented acts. If playlist is not ready, explain “Playlist not available yet” instead of a dead play button.
- **Lineup:** all sourced billings discoverable even when no matched tracks. Search artist names and B2B punctuation; day filters if sourced. Avoid conflating source alphabetical order and time order. Show zero-results recovery and reset.
- **Artist details:** exact act/booking identity, confirmed day/stage/time as separately verified, truthful unknown states and conflict flags. **Curated artist song list** links to specific validated YouTube recordings (not generic YouTube search pages or unverified captured Spotify suggestions); no unsupported claims about song availability in YouTube Music. When no approved match exists, say so without hiding the lineup artist. Preserve browsing context on back.
- **Data and sources:** use current official event evidence linked via #28, stable IDs and correct US/Eastern timestamps. Do not hardcode “set times have not been published” or assume historical README status still current. Avoid reading private candidate records as public-approved matches.
- **Provider behavior:** playlist link is external; returning from YouTube Music is normal. No claim Listening Room can control live YouTube Music playback, update user playlists, or detect the listener's position.
- **Low-signal:** Not offline-first. Clearly distinguish loading, cached/stale if implemented, and unavailable-data errors. Never show invented set times or silently stale authoritative status. Keep official links as fallbacks when connection permits.
- **Privacy:** no login or cross-device sync; no silent tracking, provider authorization or personal music-profile collection.
- **Accessibility:** meaningful names on icons; text not color alone; keyboard and visible focus; screen reader and zoom/reflow; support reduced motion; target WCAG 2.2 AA text contrast; touch targets >=24x24 CSS px minimum with 44px preferred for primary taps; avoid auto-playing music, flashing effects, or inaccessible custom widgets.
- **Publication:** separate unlisted playlist may only be created/shared after explicit owner authorization; test from an unaffiliated browser/account, including actual YouTube Music access; do not change private pilot.

## 5. Five bounded usability acceptance tasks

1. **First listen:** new mobile visitor identifies the plain-language event playlist and opens a working shareable link without sign-in or a taste survey. The visitor does **not** need to understand the Round Robin ordering mechanism. Verify independent-account access before release.
2. **Find and hear an artist:** search a representative accented or B2B lineup name; open the correct billing; select a **specific vetted song** on that artist's page; reach that exact song on YouTube rather than an unfiltered search result. Return to the same search/filter context. Distinguish actual booked sets from related member identities.
3. **Schedule trust:** user determines a verified act's day/stage/start time, or recognizes when each is unknown; can see source freshness and does not mistake lineup order for set order. Re-test when #28 ingests the latest schedule.
4. **Trust and recovery:** listener recognizes that only matched/approved songs appear in the single mix; unavailable track link or failed fetch shows explanatory guidance without presenting a broken button. Return to listening after browsing.
5. **Accessible phone use:** keyboard + screen reader + large-text/reflow + reduced-motion smoke tests for Listen/Lineup, search, filters, links and errors; limited connectivity fails gracefully, without pretending offline operation.

Manual pass evidence should record platform/browser/device, date, scenario result, observed issues, and any external access limitations. No production publish until gates met.

## 6. Existing draft PR #33: assessment

Draft [#33](https://github.com/johnapaz/edc-listening-room/pull/33) is an **earlier local-preview-only prototype** created during the #29 workstream, not a released site or a previous owner-approved design. It already demonstrates a companion lineup browser and artist-candidate expansion, and the owner has asked to *see it* before deciding final disposition. It does **not** yet implement the refined B design. Reusable candidates: local EDCO data loader and stable IDs, search/day filters, conflict/TBA handling, native accessibility, safe text rendering and offline Python contract tests. **Not approved in current form:** its lineup-first emphasis is now useful, but it has no compact shared playlist callout or dedicated artist→validated YouTube song pathway; “My picks” and browser-local favorites are deferred; captured Spotify candidates are not validated YouTube links; the static “set times are not confirmed yet” text may become stale after official publication.

**Recommended disposition after sign-off:** show owner a preview (the PR is not deployed; local server setup is in companion/README.md), keep #33 unmerged until reviewed, then likely **revise/reuse** its lineup search and rendering rather than reflexively discard it. The revised B direction is more compatible with #33 than the previously rejected A direction. Explicit owner confirmation of #33 disposition is still pending. Do not merge #33 as-is.

## 7. Proposed bounded implementation handoff AFTER sign-off

1. **Data/release readiness:** #28 official schedule verification and conversion into sourced structured fields; confirm approved song/link coverage and Round Robin ordering; authorize and verify distinct unlisted shareable playlist without modifying private pilot. Stop at blockers rather than invent coverage.
2. **Minimal static Listening Room UI:** Lineup-first event entry, compact playlist callout and two-destination Listen/Lineup navigation; artist drill-down with **specific verified YouTube song links**, search/day filters, accurate responsive/error/freshness states. Reuse safe PR #33 utilities/tests where applicable. Avoid new backends, accounts, or third-party API integrations.
3. **Acceptance and access:** run the five tasks, verify multiple phone sizes/accessibility, independent listener access and provider playback; review rights, unofficial labeling, data recency, $0 operational ceiling and deployment approval. Release only after owner’s separate explicit authorization.

**Governance:** On final owner approval, update #35 with accepted direction; link this brief and update #29 to distinguish independently deferred Event Day Companion work from Listening Room v0 (use a dedicated new v0 implementation issue if appropriate), and decide/record #33 disposition. Existing #27 private-playlist work may continue under its own approvals. Design approval alone does not publish a playlist or deploy the UI.

## 8. Final sign-off checklist

- [x] Owner selects **B (lineup-first)** over A.
- [x] Owner endorses **After Dark Radio colors**; compact spacing refinements specified.
- [ ] Owner reviews prototype #33 and confirms remaining details/visual execution and final copy.
- [ ] Owner accepts revised usability criteria / guardrails and #33 reuse recommendation (or supplies revisions).
- [ ] #35 records final design approval and links this brief/PR; dependent implementation may then be planned without skipping release gates.

**Until then: Session 3 feedback integrated, final sign-off pending. Round Robin prominence is expressly superseded by owner's latest direction.**

## 9. Session 3 additional feedback: discovery facets and fast return to music (2026-10-30)

**Owner direction:** The product must be **lightweight: get in, discover, get back to listening quickly**. Its value is a *festival-scoped* path through music that generic YouTube does not make easy. Earlier recommendations that Round Robin should be the homepage hero are expressly withdrawn. The owner prefers the B (lineup-first) treatment and After Dark Radio colors.

### Discovery dimensions

1. **All artists / whole event** — the broad event playlist.
2. **Day** — filter to Friday, Saturday, or Sunday, as many attendees only go for one day. **Owner explicitly likes day-specific listening playlists** rather than merely changing visible artist cards.
3. **Genre** — browse a genre and its lineup artists; do not infer it blindly from a single track, and prefer multiple tags where substantiated. Existing Notion Genres database is a possible reference, **not proof every act has reviewed genre tags**.
4. **Stage** — filter artists booked on an actual stage and, where a compatible playlist exists, hear a stage-oriented mix. Owner-supplied schedule screenshots have been transcribed into **draft PR #36**: 107 scheduled slots across four pictured stages, *still pending review/merge*; fifth stage and unresolved entries must not be invented.

**Core interaction:** `Event → (optional day/genre/stage filter or artist search) → curated artists/songs → specific approved YouTube listening link`, with a *playlist link for a whole filter when actually built and verified*. Filters should be quick chips/dropdowns, remain optional, and combine for **browsing** wherever underlying metadata genuinely intersects. Do not promise an automatically generated YouTube playlist for every combination: YouTube has no generic external “play all items matching our filters” URL, and each actual shared playlist requires managed publication, quota, validation, access checking and ongoing updates. Never substitute an unfiltered YouTube search without explicitly labeling it.

### Implementation/release tiering proposal (NOT YET FINAL APPROVAL)

- **First slice / highest priority:** minimal lineup search, direct artist→vetted song links, **one event-wide YouTube Music playlist**, simple event browsing.
- **Next small extension if feasible for initial launch:** **three day playlists**, using the same approved matched-song catalog. If coverage is inadequate, don't expose empty/misleading “Listen to Friday” actions.
- **Genre + stage discovery:** artist filters as soon as tags/appearances are validated; **genre/stage mixes** are a separate bounded feature, not one playlist per combination. Curate only those with enough verified coverage and authorized API quota. Make the browse interface useful even when a mix does not exist.
- **No dynamic personal playlists, per-user OAuth, live YouTube queue control, silent account sync, or speculative backend**. The system may store filter criteria independently of providers, but should not build infrastructure purely for hypothetical combinations.

### Revised usability scenarios / acceptance

- Search one booked artist and reach one **exact reviewed YouTube recording** quickly.
- Filter for **Saturday-only** and get a plainly named Saturday mix **if approved and available**, or direct artist/song links otherwise.
- Filter to a **genre** and inspect why artists qualify; missing tags are not invented.
- Select a **stage**, recognize only confirmed stage assignments, and discover available tracks for those acts.
- Switch from a filtered list into a playlist or exact song link without having to fill a profile or configure a streaming account.

**Governance:** This is ongoing owner feedback, not final sign-off. Preserve previous Sessions 1–2 user research and scope history, but the **single-playlist ceiling and Round Robin prominence have been explicitly revised**. Update #35 and review PR #37 before closing the design gate. Do not create or publish additional playlists just because the idea is documented.
