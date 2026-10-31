# Listening Room v0 — Session 3 design brief (PROPOSED; awaiting owner sign-off)

**Status:** Review-only design document for [#35](https://github.com/johnapaz/edc-listening-room/issues/35). **No implementation, deployment, playlist publication or PR #33 merge authorization.** Design owner review is the remaining gate. Date: 2026-10-30.

## 1. Decision baseline (approved in Sessions 1–2)

- **Listening Room** is an independent music-discovery product; **Event Day Companion** is a separate event-planning product, potentially interoperable later with permission. Initial event: **EDC Orlando 2026**, not a limit on the product's future.
- **One** event-linked listening journey in v0: **Round Robin**, “Everyone gets a spin.” It rotates eligible available artists before repeating, with order shuffled between rounds; no invented or guaranteed complete lineup coverage.
- One **new, separately approved unlisted/link-shareable playlist**, rather than changing the existing private pilot playlist. Unlisted means accessible to people with the URL, *not private* or a substitute for authorization. **No account connection, API keys, native playback, live playback-state sync or personalized playlist editing for listeners**.
- Three supported journeys: (1) newcomer goes from event landing to playlist; (2) explorer searches/browses lineup, artist details, verified schedule and outbound track links; (3) returner revisits the same mix and catalog without an account.
- Shallow two-destination navigation: **Listen** and **Lineup**. Mobile-first; no required personalization survey. No functional Discovery Shuffle or Pure Shuffle, favorites, per-user synced picks, multi-event UI, itinerary builder or offline-first capability in v0.
- Content sources: checked-in EDCO 2026 reference pack, approved/validated song matches and current official source evidence. Day, stage and time must be distinguished; unspecified fields are unknown. Verify latest official published schedule through [#28](https://github.com/johnapaz/edc-listening-room/issues/28), not from hardcoded prior assumptions. Source order is not set order. Keep B2Bs/special billing intact.
- Independent/unofficial presentation; avoid organizer marks and misleading brand affiliation. $0 paid services without explicit approval.

## 2. Two LOW-FIDELITY mobile navigation treatments (not production UI)

Both keep the two approved top-level destinations. These are alternate **entry/visual emphasis patterns**, not proposals for extra functionality.

### A — Listen-first hub (RECOMMENDED)

Event landing immediately exposes the one playlist, with Lineup as the secondary next action.

```text
┌─────────────────────────────┐
│ LISTENING ROOM         ◉ '26│
│ EDC Orlando • Nov 6–8       │
├─────────────────────────────┤
│ YOUR LINEUP, ON REPEAT      │
│ Discover someone new.       │
│                             │
│ ┌─────────────────────────┐ │
│ │ ROUND ROBIN             │ │
│ │ Everyone gets a spin.   │ │
│ │ [Listen in YouTube Music↗]│
│ │ Coverage: [verified text]│ │
│ └─────────────────────────┘ │
│                             │
│ Explore the full lineup  →  │
│ [Source checked / caveat]   │
├─────────────────────────────┤
│   ◉ Listen    ♫ Lineup      │
└─────────────────────────────┘
```

Lineup destination:

```text
┌─────────────────────────────┐
│ ← LISTENING ROOM            │
│ Lineup                      │
│ [Search artists/sets...]    │
│ [All] [Fri] [Sat] [Sun]     │
│ [Artist or B2B]          →   │
│  Verified day • Stage TBA   │
│ [Artist]                 →   │
│  Sat • 8:30 PM • source     │
├─────────────────────────────┤
│   Listen       ◉ Lineup     │
└─────────────────────────────┘
```

Artist details (shared in A or B): preserve exact billing; show event appearance with separately sourced date, stage, time and last-checked context; optional *available, verified* track links; graceful “No verified listening link yet.” Back to lineup/search context. No “save” icon or fictitious "playing now."

**Advantages:** matches owner-approved Round Robin prominence; fastest zero-setup first listen; clear return path and honest one-mix model. **Tradeoff:** catalog browsing needs one deliberate navigation choice.

### B — Lineup-first switchboard (ALTERNATIVE)

```text
┌─────────────────────────────┐
│ LISTENING ROOM         ◉ '26│
│ EDC Orlando 2026            │
│ [Search artists/sets...]    │
│ [All] [Fri] [Sat] [Sun]     │
│                             │
│ ┌─────────────────────────┐ │
│ │ Round Robin mix →       │ │
│ │ Everyone gets a spin    │ │
│ └─────────────────────────┘ │
│ [Artist]                 →   │
│ [Artist]                 →   │
├─────────────────────────────┤
│   Listen       ◉ Lineup     │
└─────────────────────────────┘
```

**Advantages:** instantly useful for someone looking up one artist or set. **Tradeoff:** listening becomes a secondary banner, conflicts with Session 2 entry priority, and search/filter controls dominate first arrival.

**Recommendation:** A. Keep B as a rejected-but-documented comparison unless owner chooses otherwise. Shared details and search patterns apply whichever entry treatment wins. Do not build both.

## 3. Visual and voice direction options

| Option | Style | Strength | Concern |
|---|---|---|---|
| **After Dark Radio** (recommended) | Deep ink/navy, restrained mint + soft coral highlights, ample spacing, oversized expressive headings, highly legible body text | Distinct music atmosphere with calm controls; can reuse accessible parts of PR #33's styling | Check contrast on pastel text; keep glow/animations restrained |
| **Flyer Wall** | Hot neon, poster-like textures, loud typography | Festival energy | Information density, contrast, small-screen legibility, possible organizer-brand confusion |
| **Record Sleeve** | Warm paper/charcoal, editorial album-library look | Quiet credibility and readability | May undersell the festival/discovery energy |

**Recommended public-facing language:** lead with **“Listening Room”**, with “EDC Orlando 2026” strictly as the event being explored and an unobtrusive “Independent, unofficial; not affiliated with Insomniac or the event organizer” clarification. Don't position product acronym **EDC** alone as the Listening Room brand: here EDC may mean Event Day Companion, but in festival context it is easily confused with Electric Daisy Carnival. Do not reuse official EDC artwork or organizer logos. Names should be memorable and action labels self-explanatory: “Round Robin” + “Everyone gets a spin” and “Listen in YouTube Music.”

Tone: joyful, curious and concise; no pseudo-DJ claims, inflated completeness promises or confusing technical/API terms.

## 4. Screen and state contract

- **Listen landing:** event identity; Round Robin name and one-sentence mechanic; one clear outbound action; matched artist/track coverage measured from actual approved catalog; candid note that not every booked act may have a playable match; last-updated source timestamp only when tracked. On playlist not-ready state: “Playlist not available yet,” not a dead play button.
- **Lineup:** all sourced billings discoverable even when no matched tracks. Search artist names and B2B punctuation; day filters if sourced. Avoid conflating source alphabetical order and time order. Show zero-results recovery and reset.
- **Artist details:** exact act/booking identity, confirmed day/stage/time as separately verified, truthful unknown states and conflict flags, outbound verified recording links, label links as external destinations, and preserve browsing context on back.
- **Data and sources:** use current official event evidence linked via #28, stable IDs and correct US/Eastern timestamps. Do not hardcode “set times have not been published” or assume historical README status still current. Avoid reading private candidate records as public-approved matches.
- **Provider behavior:** playlist link is external; returning from YouTube Music is normal. No claim Listening Room can control live YouTube Music playback, update user playlists, or detect the listener's position.
- **Low-signal:** Not offline-first. Clearly distinguish loading, cached/stale if implemented, and unavailable-data errors. Never show invented set times or silently stale authoritative status. Keep official links as fallbacks when connection permits.
- **Privacy:** no login or cross-device sync; no silent tracking, provider authorization or personal music-profile collection.
- **Accessibility:** meaningful names on icons; text not color alone; keyboard and visible focus; screen reader and zoom/reflow; support reduced motion; target WCAG 2.2 AA text contrast; touch targets >=24x24 CSS px minimum with 44px preferred for primary taps; avoid auto-playing music, flashing effects, or inaccessible custom widgets.
- **Publication:** separate unlisted playlist may only be created/shared after explicit owner authorization; test from an unaffiliated browser/account, including actual YouTube Music access; do not change private pilot.

## 5. Five bounded usability acceptance tasks

1. **First listen:** new mobile visitor identifies Round Robin and reaches a working shareable playlist link with at most one primary action after event landing, without sign-in or a taste survey. Verify independent-account access separately before release.
2. **Find an artist:** search a representative accented or B2B name, open the correct billing, and return to the same search/filter context; distinguish linked member identities from actual booked set identity.
3. **Schedule trust:** user determines a verified act's day/stage/start time, or recognizes when each is unknown; can see source freshness and does not mistake lineup order for set order. Re-test when #28 ingests the latest schedule.
4. **Trust and recovery:** listener recognizes that only matched/approved songs appear in the single mix; unavailable track link or failed fetch shows explanatory guidance without presenting a broken button. Return to listening after browsing.
5. **Accessible phone use:** keyboard + screen reader + large-text/reflow + reduced-motion smoke tests for Listen/Lineup, search, filters, links and errors; limited connectivity fails gracefully, without pretending offline operation.

Manual pass evidence should record platform/browser/device, date, scenario result, observed issues, and any external access limitations. No production publish until gates met.

## 6. Existing draft PR #33: assessment

Draft [#33](https://github.com/johnapaz/edc-listening-room/pull/33) is a *companion lineup browser*, not the approved Listen-first v0. Reusable candidates: local EDCO data loader and stable IDs, search/day filters, conflict/TBA handling, native accessibility, safe text rendering and offline Python contract tests. **Not approved in current form:** homepage leads with lineup rather than shared playlist; “My picks” and browser-local favorites are deferred; captured Spotify candidates are not an approved YouTube Music mix; the static “set times are not confirmed yet” text may become stale after official publication.

**Recommended disposition after sign-off:** keep #33 unmerged; close as superseded once the approved Listening Room v0 implementation PR exists, with explicit links and preservation of reusable code/tests in the new work. Do not implement v0 by merging #33 as-is.

## 7. Proposed bounded implementation handoff AFTER sign-off

1. **Data/release readiness:** #28 official schedule verification and conversion into sourced structured fields; confirm approved song/link coverage and Round Robin ordering; authorize and verify distinct unlisted shareable playlist without modifying private pilot. Stop at blockers rather than invent coverage.
2. **Minimal static Listening Room UI:** Listen-first entry and two-destination Lineup navigation; detail/search/outbound links; accurate responsive/error/freshness states. Reuse safe PR #33 utilities/tests where applicable. Avoid new backends, accounts, or third-party API integrations.
3. **Acceptance and access:** run the five tasks, verify multiple phone sizes/accessibility, independent listener access and provider playback; review rights, unofficial labeling, data recency, $0 operational ceiling and deployment approval. Release only after owner’s separate explicit authorization.

**Governance:** On final owner approval, update #35 with accepted direction; link this brief and update #29 to distinguish independently deferred Event Day Companion work from Listening Room v0 (use a dedicated new v0 implementation issue if appropriate), and decide/record #33 disposition. Existing #27 private-playlist work may continue under its own approvals. Design approval alone does not publish a playlist or deploy the UI.

## 8. Final sign-off checklist

- [ ] Owner selects A vs B mobile treatment.
- [ ] Owner approves visual/voice direction and naming.
- [ ] Owner accepts usability criteria / guardrails and #33 recommendation (or supplies revisions).
- [ ] #35 records final design approval and links this brief/PR; dependent implementation may then be planned without skipping release gates.

**Until then: Session 3 proposed, not approved.**
