# Listening Room — approved v0 design and staged roadmap

**Status:** **OWNER-APPROVED — DESIGN HANDOFF COMPLETE** (2026-10-30). Final product direction from three bounded sessions and subsequent owner corrections in [#35](https://github.com/johnapaz/edc-listening-room/issues/35). **This document approves UX scope and implementation planning, not playlist creation, playlist visibility changes, public deployment or merging prototype PR #33.**

**Implementation:** [#38 — Listening Room v0 MVP](https://github.com/johnapaz/edc-listening-room/issues/38). **Later progression:** [#39 — v0.1/v0.2/v1 roadmap](https://github.com/johnapaz/edc-listening-room/issues/39). **Separate product:** [#29 — Event Day Companion](https://github.com/johnapaz/edc-listening-room/issues/29).

## 1. Product promise and principles

**Listening Room** is an independent, lightweight music discovery experience that helps someone explore the booked artists for an event, reach a deliberately selected song, then return to the music. **Get in. Discover. Get back to listening.**

- First event is EDC Orlando 2026. Listening Room's eventual independent vision includes artists, genres, scenes and other events; no speculative broad discovery UI for v0.
- Event Day Companion is a **separately valuable festival planner**. Potential future interoperable sharing of listening preferences is permissioned, not a current dependency.
- **Listen where you already listen:** outbound exact recording links to YouTube; do not build a replacement player, impersonate the provider or promise control over an external playback queue.
- **Artist-first, not algorithm-first:** curated tracks and event context solve the overload of generic YouTube searching; retain discovery and serendipity.
- **No survey, account, OAuth or API key needed** by the listener for v0. **$0 paid services** unless owner separately approves.
- Publicly present **Listening Room** as the product, **EDC Orlando 2026** as the subject event, with clear **unofficial / unaffiliated** wording; no organizer logos/branding. "EDC" may expand to Event Day Companion in that separate product context; do not suggest that acronym means an organizer affiliation.

## 2. Selected mobile IA and wireframe treatment

**SELECTED: B — lineup-first music discovery.** The rejected **A — Listen-first/Round Robin hero** was too vague, spread out and overly focused on a playlist-ordering mechanism.

Two primary navigation destinations remain: **Lineup** and **Listen**. The initial event view emphasizes artist search and day browsing, with an easy-to-find *event playlist* shortcut. Avoid both a nested companion planner and a giant empty-space hero. Compact readable spacing must work at narrow Fold cover width, normal phone widths, larger Fold/tablet, 200% zoom/reflow and desktop.

### B: selected lineup-first landing (low-fidelity; not code)

```text
┌──────────────────────────────────────┐
│ LISTENING ROOM            ORLANDO 26 │
│ Find your next favorite.             │
│ Search artists at this event         │
│ [ Search the lineup...             ] │
│ [ All ]  [ Fri ]  [ Sat ]  [ Sun ]   │
│ [ Genre ▾ ] [ Stage ▾ ] *if verified*│
│                                      │
│ EDC ORLANDO 2026 PLAYLIST            │
│ Tracks from across the lineup.       │
│ [ Listen on YouTube Music ↗ ]        │
│ (About this playlist ▾)              │
│                                      │
│ ARTISTS                              │
│ [Artist — booked day]             →  │
│ [Artist B2B Artist — booked day]  →  │
│ [Artist — booked day]             →  │
│                                      │
│      ◉ Lineup        ♫ Listen        │
└──────────────────────────────────────┘
```

### Artist details, the crucial journey

```text
← Back to lineup (preserve query and filters)
ARTIST / EXACT PERFORMANCE BILLING
Day • verified stage/time, or "Stage/Time not verified"

LISTEN TO THEIR MUSIC
[Reviewed Song A]                  [YouTube ↗]
[Reviewed Song B]                  [YouTube ↗]
[Reviewed Song C]                  [YouTube ↗]

No vetted songs? State that plainly; keep artist discoverable.
```

The artist’s links must lead directly to a **specific independently reviewed recording/video**, **not generic YouTube search results**. A source-captured Spotify candidate alone does not pass YouTube verification. Never silently equate a search hit, playlist API readback, and confirmed YouTube Music playback.

### Rejected A for design history

```text
LISTENING ROOM
Your lineup, on repeat.
[ROUND ROBIN — Everyone gets a spin]
[YouTube Music]   [Explore lineup]
```

This made Round Robin more prominent than music discovery and failed to explain the product. **Do not reintroduce it as the homepage.**

## 3. Playlist framing

- **MVP:** **one event-wide shared playlist** labelled something plain like *EDC Orlando 2026 Playlist*. It must be **a separate unlisted link-shareable playlist**, created/published only after explicit authorization; **preserve the existing private owner pilot unchanged**.
- **Round Robin** is a quiet **playlist ordering policy**: give each eligible matched artist one song before repeating, continuing in rounds where available. Keep the tagline *"Everyone gets a spin"* only as supporting explanation inside optional "About this playlist", along with measured coverage and source limits. Round Robin is **not** a home hero, standalone required mode, or the product's name.
- **Playback reality:** a playlist is hosted by YouTube/YouTube Music, not the Listening Room interface. Link availability and playback on an unaffiliated listener's account must be verified before publishing a claim of functionality; unlisted does **not** mean private.
- A **day**, **genre** or **stage** browsing filter should operate on the available verified lineup metadata. **A filtered lineup is not automatically a filtered YouTube playlist.** Only show an actual playlist action when the corresponding managed playlist has been built, authorized, populated and independently tested.

## 4. Exactly what ships in the MVP

**MVP name:** **Find it. Hear it.** Track work in [#38](https://github.com/johnapaz/edc-listening-room/issues/38).

**Must work:**
1. Fast event-scoped artist search over the entire sourced lineup, including B2B billings, and **All/Fri/Sat/Sun** navigation.
2. Artist detail and small **vetted exact YouTube song links** so the listener gets to music without scrolling provider search results. Unmatched lineup acts remain visible with candid states.
3. **One shared event-wide playlist** and straightforward one/two-tap launch from landing, only once link/playback/access and publication gates are cleared.
4. **Genre and stage filters where independently verified tags and scheduled stage assignments exist**; do not block launch on speculative metadata. Provide honest partial/unavailable coverage, and never invent a schedule or stage.
5. Source freshness, unknown set times/stages, source conflict disclosure and robust errors; fast back to search/filters; no misleading "Now playing" or false "offline ready".
6. Accessible compact dark UI, external link labeling and independent unofficial presentation. No login/account connection.

**Not part of v0:** three day playlists, a playlist for arbitrary stage/genre/filter combinations, multi-select mix builder, OAuth, personalized provider playlists, favorites/user accounts, native background playback, full festival itinerary/route planning, or additional music services. Do not show fake future-state Generate or mode controls.

## 5. Approved progression (not an expanded MVP)

Full tracked scope: [#39](https://github.com/johnapaz/edc-listening-room/issues/39).

| Phase | Experience | Constraint |
|---|---|---|
| **v0 — Find it. Hear it.** | Event lineup and day browsing; artist → specific vetted YouTube songs; one event-wide shared playlist | No visitor account or playlist generation |
| **v0.1 — Listen Your Way** | Three verified **Fri/Sat/Sun** shared playlists; better reviewed genre/stage browsing; *select* curated genre/stage mixes if worthwhile | Each provider playlist must actually exist and pass independent-link testing |
| **v0.2 — Make Your Mix** | Select artists, configure number of songs, arrange/preview a deterministic mix, optionally save a **local** recipe | Preview is **not** a published/continuous YouTube playlist; never mislabel it |
| **v1 — Generate My Playlist** | Generate a real continuously playable playlist, ideally in the listener’s YouTube account through normal app-managed OAuth | Separate platform feasibility, Google permissions/compliance, quota, security, anti-abuse and publication gates |

**No arbitrary-combination playlist generation in MVP.** User-owned OAuth is a later decision, and regular users should **never be asked for API keys**. Project-account per-user playlist creation at scale cannot be assumed at the default YouTube write quota.

## 6. Sources, freshness, risks

- **Event:** the checked-in [EDCO reference pack](../data/edco-2026/README.md), updated from actual official sources via [#28](https://github.com/johnapaz/edc-listening-room/issues/28). Respect stable artist/performance IDs and **America/New_York** timestamps. Listing order does not mean set running order. B2Bs remain one exact booked performance even when artists have distinct catalogs.
- **Stage:** owner-supplied organizer-branded schedule screenshots are transcribed in **draft [PR #36](https://github.com/johnapaz/edc-listening-room/pull/36)** (107 pictured stage/time slots, four stages), **not yet fully verified/merged** in this design snapshot. Do not assume full schedule or missing stage coverage from them.
- **Genre:** Notion Genres entries/candidate tags do not mean every act is reviewed. Multiple substantiated tags permitted; source provenance and unknowns must be preserved. Do not label based solely on guessed track style.
- **Songs:** source-captured candidates are not public-approved recordings; use reviewed exact YouTube IDs and provider links, with explicit gaps. Existing private discovery work [#27](https://github.com/johnapaz/edc-listening-room/issues/27) proceeds under its own separate approvals.
- **Accessibility:** screen reader labels for icons, full keyboard access, visible focus, readable contrast, reduced motion, adequate touch targets and semantic states. Test narrow/wide phones, Fold cover/unfolded, zoom/reflow; avoid decorative whitespace dominating small screens.
- **Low connectivity:** no offline-first promise. Distinguish unavailable, loading and truly validated cached/stale states; provide official organizer fallback links where useful and online.
- **Privacy/permissions:** no visitor music accounts, analytics by default, secrets in repo or unapproved provider permissions. External provider ownership clearly labeled. Cross-account link sharing, provider policy, rights and public release independently reviewed.
- **Budget:** $0 paid services. Quota-aware and limited provider writes; no default public per-visitor playlist generator.

## 7. Five acceptance tasks

1. New listener can open the **event-wide playlist in 1–2 taps** from landing (once approved and publishable), without sign-in or survey; verify actual YouTube Music playback as a different user.
2. Find an artist (including accented name/B2B) and open **one vetted exact YouTube recording within 3 taps**, excluding typing; return with search/filter context intact.
3. Filter for the attendee's event day; results exclude unrelated bookings, and the user is not misled into believing a filtered playlist was generated.
4. Understand when act day, stage/time, genre and song matches are verified, incomplete, unknown or source-conflicted; no invented schedule or "official setlist" claim.
5. Complete tasks with keyboard/screen reader, small-screen and zoom/reflow, reduced motion and weak network; clear, actionable failure states. Record concise device/browser/observations.

**Launch/release is separately gated.** Tests and data validation are prerequisites, not approval to deploy.

## 8. Existing draft prototype #33 — deliberate disposition

[Draft PR #33](https://github.com/johnapaz/edc-listening-room/pull/33) is an **earlier local-preview-only Event Day Companion lineup browser**, never publicly deployed or previously approved as final design. Its static search/day filters, stable IDs, source conflict handling, accessible native elements and contract tests are valuable candidates for reuse in #38. Its browser-local “My picks,” unreviewed Spotify suggestions and hardcoded old schedule notice **do not define v0**.

**Decision:** **keep #33 draft and unmerged** for a bounded code-reuse/contrast review in the #38 implementation. Reuse/fork portions where safe; close or revise #33 **only after** a specific replacement/refactor plan exists, without merging it unchanged. This also preserves the owner’s ability to inspect the original prototype.

## 9. Implementation handoff and approval

1. Prepare vetted artist-song mappings and reconcile the official schedule (#28/#36) with source dates; isolate unverified items.
2. Build compact lineup-first UI and artist→exact-song journey, reuse selected #33 components/tests, support day browsing and verified optional genre/stage filtering. One distinct shared event playlist only after explicit permission.
3. Test the five acceptance tasks and verify cross-account provider playback/sharing, privacy/rights, source recency and $0 envelope. **Request separate owner approval before making any site or playlist public/unlisted.**
4. Follow the roadmap in #39 after MVP evidence; do not prematurely expand to visitor OAuth or arbitrary playlist combinations.

**Session status:** Sessions 1/3 and 2/3 are complete; **Session 3/3 and the #35 design gate are approved and complete**. Later owner corrections supersede earlier Round Robin prominence and single-playlist-as-permanent-limit language. **DESIGN HANDOFF COMPLETE — CLEAN BREAK.**
