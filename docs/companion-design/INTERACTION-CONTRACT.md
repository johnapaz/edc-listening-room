# Event Day Companion: map explorer interaction contract

**For:** [#64 map shell](https://github.com/johnapaz/edc-listening-room/issues/64) and [#65 stage/day/artist integration](https://github.com/johnapaz/edc-listening-room/issues/65) (ChatGPT/Codex implementation). **From:** [#61](https://github.com/johnapaz/edc-listening-room/issues/61) (Claude design).
**Visuals:** [DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md). **Clickable wireframe:** [wireframe/index.html](wireframe/index.html). This is a design artifact, not app code.
**Scope:** [requirements](../COMPANION-MAP-EXPLORER-REQUIREMENTS.md). Where this contract and the requirements disagree, the requirements win; flag it on #61.

## 1. Screens and regions

```text
 phone (360)                                desktop (≥1100)
┌────────────────────────────┐              ┌──────────────────────────────────┬──────────────┐
│ ◎ Event Day Companion  ♫ ⓘ │ app bar      │ app bar                          │              │
│ [All][Fri 6][Sat 7][Sun 8] │ day switch   │ day switch                       │  side panel  │
│┌──────────────────────────┐│              │                                  │  (= sheet)   │
││   · · ·  MAP  · · ·   [+]││ map          │             MAP                  │  stage /     │
││  ◉ kineticFIELD       [−]││              │                                  │  artist /    │
││        ◯ neonGARDEN  [⟲]││              │                                  │  sources     │
││ ◯ stereoBLOOM        [≡]││              │                                  │              │
││ [Unofficial sketch · …]  ││ attribution  │ [Unofficial sketch · …]          │              │
│╞══════════════════════════╡│              └──────────────────────────────────┴──────────────┘
││ ▬  kineticFIELD          ││ sheet (peek)
││ Next Fri · 8:00 Afrojack ││
│└──────────────────────────┘│
│   Map    Stages    About   │ bottom nav
└────────────────────────────┘
```

| ID | Screen / state | Reached by |
| --- | --- | --- |
| S1 | **Map landing**: no stage selected, the sheet peeks with "Pick a stage" and a "Show stage list" button | `/companion/` or `#/map` |
| S2 | **Stage selected**: hotspot selected, sheet at half showing the stage's sets for the current day | tap a hotspot, or open `#/map?stage=…` |
| S3 | **Stage list**: an accessible list of the five stages with per-day counts | the **Stages** tab, the `≡` map button, or `#/stages` |
| S4 | **Stage detail (list mode)**: the same content as the S2 sheet, as a full page | a stage-list row, or `#/stage/{stage_id}` |
| S5 | **Artist preview**: sets for one billing, credited identities, and the mint CTA to Listening Room | a set row, or `&artist=` / `&set=` |
| S6 | **No confirmed schedule**: a selected stage with zero sourced sets for the day (CASA BACARDÍ) | any selection |
| S7 | **Unscheduled lineup entries**: "Stage or time unknown", a per-day list of current billings with no slot | the link at the foot of each day in S3/S4 |
| S8 | **Sources & attribution**: the map provenance, schedule sources, checked dates and the organizer homepage link | the attribution chip, footer or About |
| S9 | **Map failed / data failed / offline**: see §7 | errors |
| S10 | **Map gated**: the Map tab shows the stage list (S3) under a "Map coming later" notice and an organizer-homepage link. A `stage` param redirects (replace) to S4; a `set` or `artist` param without a stage opens S5 as a page. **This is the current state of real data.** | `map.geometry.status` isn't `verified`, or any stage lacks approved coordinates |

## 2. URL and deep-link state

The Companion uses its **own hash router**, built the same way as Listening Room's: the `#/view/id?params` shape and the same `day` keys, so the two can share helpers later.

```text
/companion/#/map?day=2026-11-06&stage=kinetic-field&set=edco26:2026-11-06:afrojack
/companion/#/stages?day=2026-11-07
/companion/#/stage/casa-bacardi?day=all
/companion/#/unscheduled?day=2026-11-08
```

| Param | Values | Rule |
| --- | --- | --- |
| `day` | `all`, `2026-11-06`, `2026-11-07`, `2026-11-08` | The same keys as Listening Room `DAYS`. Invalid values become `all`. If absent: during the festival, use **today in America/New_York**; otherwise `all`. |
| `stage` | a `stage_id` from `venues.json` | Invalid values are ignored silently and the map stays unselected. |
| `set` | a `performance_id` | Opens S5 for that set. If the set isn't on the current `day`, keep it open and show "Not on {day}"; do not change the day. |
| `artist` | an `artist_id` | Opens S5 for an identity: all of that identity's billings for `day`. |
| `sheet` | `peek` / `half` / `full` | Optional. Restores the sheet height on Back. |

**History rules.** Selecting a stage, opening an artist or switching views each **pushes** a history entry. Changing the day, the sheet height or the map pan/zoom **replaces** the current entry, so Back is never a pile of day toggles. Browser Back steps out in this order: artist → stage → nothing selected → previous page.

**Primary navigation keeps context.** Map / Stages / About links and the wordmark are built from the current route. They always carry `day`, and **Map** returns to the last selected `stage` (taken from either the map or a stage page). The skip link focuses `<main>` programmatically; it never changes the hash.

**Day change keeps the stage selected** (acceptance #1). Only the sheet's set list re-filters. If the stage has nothing that day, show S6; never deselect.

**To Listening Room**, always by stable ID with no search fallback:

```text
/listening-room/#/artist/{encodeURIComponent(artist_id)}?day={day}
```

- Open it in the **same tab**. Browser Back then returns to the exact Companion URL, which restores the day, stage, set and sheet state.
- For a B2B or alias billing, the CTA uses the **performance's** `artist_ids`. With one credited identity, show one CTA. With several, show one mint link per identity ("Hear Benda", "Hear Vastive"). Never search by display name.
- **No credited identity:** for a `performance_type: "program"` entry, or any entry with empty `artist_ids` (today: Discovery Project), render **no** artist link or CTA. Show "Program · no artist page", and in S5: "This is a festival program, not a single artist, so there is no Listening Room page for it." Never build `#/artist/` from a missing or unknown ID. `capture.js` asserts this across every stage × day, every unscheduled view and every `set` deep link.
- An unknown `artist` param shows "That artist isn't in the current lineup."
- Hide the CTA when the identity has no reviewed track. Show "No reviewed tracks yet" in muted text and still offer a plain "Artist page" link, because Listening Room shows bookings.
- *Optional, coordinate with Listening Room:* append `&from=companion`. Listening Room currently ignores unknown params, so this is safe now. A later Listening Room change may show "← Back to map".

## 3. Map interaction

| Input | Behaviour |
| --- | --- |
| Tap / click a hotspot | Selects that stage, animates the pan so the hotspot sits in the visible area above the sheet, and opens the sheet at half. Tapping the selected hotspot again does nothing; it does **not** toggle off. |
| Tap empty map | Nothing. It never deselects, which prevents losing context by accident. Deselecting uses the sheet's ✕ ("Close stage"). |
| Pinch / wheel / +/− | Zoom between 1× and 4×. Hotspots and labels stay **constant screen size** and are positioned from normalized coordinates × the current transform. |
| Drag | Pan, clamped so at least 25% of the schematic stays visible. |
| Reset view (⟲) | Back to 1× with the whole schematic in view. Keeps the selection. |
| Rotate / resize | Recompute fit. The selected hotspot stays in view. No transform state is stored in the URL. |
| Labels | Stage labels are always visible at ≥1×. If two labels would collide, the unselected one moves below its hotspot; if it still collides, it is hidden while the dot stays visible. The selected label is never hidden. |

The map is an **enhancement**. Every map action has a list equivalent (S3/S4), and the app works fully with the map region failed or skipped.

## 4. Keyboard, focus and screen reader

**Tab order (S1/S2):** skip link → app bar (home, Listening Room, About) → day switch (4 buttons) → map region → map controls (+, −, ⟲, ≡) → attribution chip → sheet → bottom nav.

- **Map region** is a `<div role="group" aria-label="Festival map, unofficial sketch. 5 stages.">`. Hotspots are real `<button>`s **inside** the map's SVG/HTML overlay, in fixed order: kineticFIELD, circuitGROUNDS, neonGARDEN, stereoBLOOM, CASA BACARDÍ. Each one's accessible name is `"{stage}, {n} sets {day label}"`, or `"{stage}, no confirmed schedule {day label}"`. The selected one has `aria-pressed="true"`.
- **Arrow keys** inside the map move focus between hotspots in that same order. They do not pan, which keeps the map out of the way for keyboard users. Panning by keyboard uses the +/− buttons and the list.
- **Selecting a stage** moves focus to the sheet heading (`h2`, `tabindex=-1`), and a polite live region announces "kineticFIELD, Friday, 7 sets."
- **The sheet is not modal** at peek or half; the map stays operable. At **full** it acts like a dialog: `aria-modal` stays false, but the map is set `inert` and Escape or ✕ returns it to half.
- **Escape:** closes the artist preview, then collapses the sheet to half, then nothing (it never deselects). **✕ Close stage** deselects and returns focus to that stage's hotspot.
- **Day switch:** a group of 4 `aria-pressed` buttons, the same as Listening Room. Changing the day keeps focus on the pressed button, and the live region announces "Saturday: kineticFIELD, 6 sets."
- **Set rows** are `<li>`s. The billing is plain text (not a link), and the row's actions are separate links: "Details" opens S5 and "Hear {artist}" goes to Listening Room. There are no nested interactive elements and no whole-row links that swallow the CTA.
- **Status badges** have visible text, so no extra aria is needed. The ◌/●/! glyphs are `aria-hidden`.
- **Grab handle** is a `<button aria-expanded>` labelled "Expand stage details" or "Collapse stage details". Dragging is an enhancement only.

## 5. Stage sheet content

```text
▬
kineticFIELD                         ✕
Fri 6 · 7 sets · ◌ Poster times · checked Oct 30
──────────────────────────────────────────
 5:28–6:44  Alesso  [Sunset Set]
            ◌ Poster time        Details  ♫ Hear Alesso
 8:00–9:10  Afrojack
            ◌ Poster time        Details  ♫ Hear Afrojack
 …
──────────────────────────────────────────
3 Friday acts have an unknown stage or time in this reference → (S7)
```

- Sort by `starts_at` ascending. Midnight and later belongs to the night it continues (the requirements' rule), so 12:30 AM sits after 11:45 PM within the same festival day.
- **All days:** group by day under sticky subheads ("Friday · Nov 6"), sorted by time within each group.
- **Qualifiers** (Sunset Set, B2B, "with MC …") stay in the billing exactly as sourced. `set_qualifier` also renders as a chip.
- A row with only one of start/end shows what exists ("from 8:00 PM"). It never estimates the other.
- The source line in the sheet header summarizes statuses: if any are mixed, show "Mixed sources" plus a "What do these mean?" link to the legend in S8.

## 6. Layout breakpoints

| Width | Layout |
| --- | --- |
| ≤320 (Fold cover 280) | Day switch becomes a 2×2 grid. The map is 46vh tall, and the sheet's peek drops to 132px. Stage labels are hidden at 1× and shown only for the selected stage; the other hotspots still have accessible names. The bottom nav uses text only. |
| 321–767 | The default phone layout above. |
| 768–1099 (tablet, Fold open) | Map and sheet as on phone, but the sheet's max width is 560px and it is centred. The time column stays fixed. |
| ≥1100 | Side panel at 400px and the map fills the rest. The bottom nav becomes header links. The sheet states collapse into a single panel scroll. |
| 200% zoom / 320 CSS px reflow | The map stays usable through the list fallback. No horizontal scroll, and the sheet's full state becomes the default. |
| Landscape phone (height < 480) | The sheet becomes a 50%-width side panel, the same as desktop but narrower. |

## 7. States and copy

| State | Copy | Action |
| --- | --- | --- |
| Loading | "Loading stages…" (skeleton hotspots, no spinner on the map) | – |
| Stage has no sets on day (S6) | "No sourced schedule for **CASA BACARDÍ** on Friday in this reference." | "See Friday acts with unknown stage or time" (S7) |
| Stage has no sets on any day | "No sourced schedule for this stage in this reference." | link to the sources (S8) |
| Day has unscheduled acts | "{n} Friday acts have an unknown stage or time in this reference." | S7 |
| Artist has no reviewed tracks | "No reviewed tracks yet." | "Artist page" (plain link) |
| Map art failed to load | "The map didn't load. Every stage is still in the list." | "Show stage list" (S3). The map region collapses. |
| Schedule data failed | "Couldn't load set times. Check your connection and try again." | "Try again". The stage list still renders from `venues.json` if that one loaded. |
| Offline / weak signal | Show whatever is in memory, plus a banner: "You're offline. Showing what was already loaded; times may be out of date." Never claim offline support. | – |
| Unknown `stage`/`set`/`artist` in the URL | "That stage or set isn't in the current schedule." | "Show all stages" |
| Stale data (checked_on > 3 days before today) | Footer freshness turns amber-text with "Check the official lineup ↗" (homepage link) | – |

Voice: plain, second person, no exclamation marks, and no organizer branding. Copy describes **our evidence**, not the organizer's actions: say "Time unknown" or "No sourced schedule in this reference", never "not announced" or "not published", because the organizer may have published data we haven't verified. Avoid "TBA". Never describe intentional gating (S10) as a load failure; "The map didn't load" is only for a real asset failure (S9) once a verified map exists.

## 8. Data the design assumes (for #62 / #65)

The design reads only the canonical projection defined in [`COMPANION-DATA-CONTRACT.md`](../COMPANION-DATA-CONTRACT.md) (`current-lineup.json` schema 2, exported as `data/edco-2026/performances.json`) plus `venues.json`. **No new catalog and no renamed fields.**

| Design concept | Canonical field |
| --- | --- |
| Set identity / billing / type | `performance_id`, `display_name`, `performance_type` (`act`, `b2b`, `dj_with_mc`, `project`, `program`) |
| Credited identities (CTAs) | `artist_ids`; roles in `credits[]` |
| Day / stage / time | `event_date`, `day`, `stage_id`, `starts_at`, `ends_at` (UTC−05:00; null = unknown) |
| Time badge | `schedule_status` ∈ `verified` / `poster_transcribed` / `set_times_unverified` |
| Qualifier chip | `set_qualifier` |
| Sources disagree | `issue_ids`, `reconciliation.status`, `reconciliation.historical_billing` |
| Source line and freshness | `source_ids` / `schedule_source_id` → top-level `sources[]` (`source_id`, `kind`, `checked_on`, `url`, `independently_verified`) |
| Field withheld from public | `public_eligibility` (stage/time denied → null → treated as unknown) |
| Day totals / unscheduled count | `coverage` |
| Stage list | `venues.json` → `stages[]` (`stage_id`, `display_name`) |
| Hotspot position | `venues.json` → `stages[].coordinates` `{x, y}` plus verification source IDs, checked date and `public_export_approved` |
| Map on/off | `venues.json` → `map.geometry` (`status`, `coordinate_space: normalized-top-left`, `objects`, `checked_on`, `reason`) |

There is no `schematic_version` or `hotspot` field. Earlier drafts of this contract used those names; the canonical names above replace them. Pan/zoom transforms the canvas and the hotspots together, placed at (100·x %, 100·y %) of the common canvas, per the data contract. The reviewed-track count per artist comes from `data/listening-room/songs.json`, as Listening Room computes it.

## 9. Acceptance mapping (#61)

| #61 acceptance | Where it is satisfied |
| --- | --- |
| Stage stays selected across All/Fri/Sat/Sun | §2 "Day change keeps the stage selected", §3 tap rules, wireframe flow 2 |
| Artist → Listening Room by stable ID | §2 "To Listening Room" |
| No map-only navigation | §1 S3/S4, §3 last line, §4, §7 map failure |
| Owner can review as PR/artifact | this PR, plus screenshots in `wireframe/shots/` |
