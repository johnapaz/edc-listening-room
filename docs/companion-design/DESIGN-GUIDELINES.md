# Event Day Companion: design guidelines ("After Dark Atlas")

**Status:** design proposal for owner review, [#61](https://github.com/johnapaz/edc-listening-room/issues/61). **Not** an implementation, deployment or rights decision.
**Scope:** [Map explorer requirements](../COMPANION-MAP-EXPLORER-REQUIREMENTS.md). **Implementers:** [#64 map shell](https://github.com/johnapaz/edc-listening-room/issues/64) and [#65 stage/day/artist integration](https://github.com/johnapaz/edc-listening-room/issues/65). **Map art rights:** [#63](https://github.com/johnapaz/edc-listening-room/issues/63).
**Companion docs:** [Interaction contract](INTERACTION-CONTRACT.md) · [Wireframe](wireframe/index.html) · [Progress](PROGRESS.md)

## 1. Relationship to Listening Room

Event Day Companion and Listening Room are **sibling products**. A person who moves between them should feel they're in the same family. They should not feel they're on another tab of the same app.

| | Listening Room ("After Dark Radio", PR #70) | Event Day Companion ("After Dark Atlas") |
| --- | --- | --- |
| Job | Hear music from the lineup | Find **where and when** on festival days |
| Signature accent | Mint `#6ff0c4` | **Lantern violet `#b9a4ff`** |
| Mint means | Primary action | **Only "go to music"**: links into Listening Room |
| Base | Navy `#0b1020` and a glow at the top right | Slightly deeper ink `#0a1120`, a **dot-grid "night map" ground**, glow at the top left |
| Display type | Bricolage Grotesque 800 | Same face. Used **smaller and sparser**: screen titles and stage names only |
| Core shape | Rows, rails, rounded cards | **Map, bottom sheet, time column** |
| Wordmark | `Listening Room` with equalizer bars | `Event Day Companion` with a **pin and ring** glyph (original, not a festival mark) |

**Shared, don't diverge:** the navy family, system sans body text, the amber `#ffd98a` focus ring, 44px minimum targets, the 16px gutter, day buttons that show their date, "Independent and unofficial" footer wording, and the no-login/no-tracking promise.

**Must differ:** the accent colour, the wordmark, the page title, and the bottom navigation items. No one should mistake a Companion screen for a Listening Room screen in a screenshot.

## 2. Tokens

Implementers should copy these as CSS custom properties on `:root`. Names match Listening Room v2 wherever the meaning is the same, so a shared sheet stays possible later.

```css
:root{color-scheme:dark;
  /* ground */
  --bg:#0a1120; --bg-glow:#1c1f44; --map-ground:#0f1830; --map-dot:#ffffff0d;
  --panel:#131b2e; --sheet:#182238; --line:#33405f; --line-strong:#6b7ca6;
  /* text */
  --text:#f2f5ff; --muted:#b4bdd6;
  /* Companion accent */
  --violet:#b9a4ff; --violet-hover:#d6caff; --violet-ink:#140b2e; --violet-wash:#b9a4ff1f;
  /* shared meanings */
  --mint:#6ff0c4; --mint-ink:#04120d;      /* music / Listening Room only */
  --amber:#ffd98a;                          /* focus ring only */
  --coral:#ff8a78;                          /* disputed / error */
  /* map strokes */
  --path:#34436a; --zone:#16213b; --zone-edge:#2a3759;
  --sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --display:"Bricolage Grotesque",var(--sans);
  --gutter:16px; --target:44px; --header:56px; --tabbar:60px;
  --sheet-radius:20px; --peek:168px;
}
```

**Measured contrast** (WCAG 2.2): violet on bg 8.8:1, on the sheet 7.4:1. Violet-ink on violet 8.8:1. Muted on the sheet 8.5:1. Coral on the sheet 6.9:1. `--line-strong` against every ground is ≥3.8:1, which passes 1.4.11 for control borders and map hotspots. `--path` is decorative at 1.8:1 and **must never carry meaning on its own**.

## 3. Typography

- **Body/UI:** `--sans`, 15px base, line-height 1.45, the same as Listening Room.
- **Display:** `--display` 800, used for the screen title (`clamp(1.5rem,5vw,2rem)`) and the stage name in the sheet header (1.375rem). Nowhere else.
- **Times:** `font-variant-numeric: tabular-nums`, weight 650, 0.875rem. Times sit in a fixed column (`5.5ch`) so set lists line up.
- **Official names keep their casing:** kineticFIELD, circuitGROUNDS, neonGARDEN, stereoBLOOM, CASA BACARDÍ. Never set them uppercase or title case, and never use a festival font.
- Long billings wrap. They never truncate: the longest current billing is 51 characters.

## 4. Status language (truthfulness system)

Each schedule fact has exactly one status. Status is always shown as **icon + text**, never by colour alone.

| Status (data) | Badge text | Treatment |
| --- | --- | --- |
| `organizer_verified` | **Confirmed** | Violet solid dot ● and violet text |
| `poster_transcribed` | **Poster time** | Hollow dashed ring ◌ and muted text. Tooltip/legend: "Read from a published set-time poster on {date}; may change." |
| `set_times_unverified` (no stage/time) | **Time not announced** | Dotted rule and muted text. The row has no time column; it shows "—". |
| disputed / conflicting sources | **Sources disagree** | Coral `!` triangle and coral text, with a link to see both values |
| historical / unmatched | **Not on current lineup** | Strikethrough-free muted text with an info icon. Hidden from default lists; shown only under "Older poster entries" |

**Row-level rule:** a list header carries the full text badge for its common status, e.g. "◌ Poster times". Rows that share that status show only the glyph, with the status as visually hidden text. Any row whose status **differs** from the header shows the full text badge. Without that rule, a stage with ten poster times repeats "Poster time" ten times and pushes the "Hear" links onto a second line. If a list mixes statuses, the header says "Mixed sources" and every row shows its full badge.

Freshness is always visible next to the source label, e.g. "Poster times · checked Oct 30". The footer adds "Not affiliated with EDC or Insomniac. Map is an original sketch, not the official map."

## 5. The map (original schematic)

[#63](https://github.com/johnapaz/edc-listening-room/issues/63) rules out tracing or embedding the organizer map. So the Companion map is an **original schematic in our own visual language**:

- **Ground:** `--map-ground` with a 24px dot grid. Grids read as "schematic, not survey" and keep anyone from mistaking the map for satellite or GPS precision.
- **Zones:** large rounded shapes, `--zone` fill with a 1.5px `--zone-edge` stroke. No festival illustrations, icons, logos or themed art.
- **Paths:** 10px rounded strokes in `--path`, purely decorative. Path names are not shown (they aren't verified for public use).
- **Stage hotspots:** a 44px minimum tap circle. At rest: a 2px `--line-strong` ring, a violet inner dot and a label pill below (`--panel` with stage name in `--text` 0.8125rem). **Selected:** filled violet, violet-ink glyph, a 6px `--violet-wash` halo, and the label pill in violet with violet-ink text. A stage with no confirmed schedule (CASA BACARDÍ) uses a **dashed** ring at rest.
- **Hotspot positions** come only from #63's audited normalized coordinates (`x`,`y` in 0–1 of the schematic's viewBox). Until #63 delivers, the wireframe's positions are **placeholders**, marked as such on screen.
- **POIs** (water, restrooms, entrances) appear only when #63 verifies them. They are smaller (32px visible, 44px hit area), neutral grey, and use generic glyphs. Under-verified POIs are simply absent.
- **Chrome over the map:** zoom +/−, a "Reset view" button and a "List" toggle, stacked at the top right. These are 44px round `--panel` buttons with a `--line-strong` border.
- **Attribution chip** at the bottom left of the map, above the sheet peek: "Unofficial sketch · positions approximate · checked {date}". Tapping it opens the Sources sheet.
- **No** blue dot, compass, distance, scale bar or walking time.

## 6. Components

| Component | Spec |
| --- | --- |
| App bar | 56px. Pin-and-ring glyph + "Event Day Companion" (650 weight, 0.9375rem). Right side: "Listening Room" text link (mint) and an About icon button. |
| Day switch | Four segments: **All · Fri 6 · Sat 7 · Sun 8**. `role=radiogroup` semantics through `aria-pressed` buttons, the same as Listening Room. Selected: violet fill with violet-ink text. Sticky under the app bar. |
| Bottom sheet | Three states: **peek** (`--peek`, which shows the stage name and next set), **half** (55vh) and **full** (top at 56px). 20px top radius, `--sheet` fill, and a grab handle (36×4, `--line-strong`) that is also a button ("Expand stage details"). On desktop ≥1100px it becomes a fixed 400px **side panel** at the right and the map fills the remaining width. |
| Set row | A time column (start–end, tabular) · billing (650) · qualifier chip (for example "Sunset Set") · status badge · trailing mint "Listen" link when the artist has tracks. Min height 64px. B2B billings show every credited artist as its own link under the billing. |
| Stage list (list mode) | Five rows: stage name (display 800 1.0625rem), a set count for the current day, a status summary and a chevron. Equivalent to tapping the hotspots. |
| Artist preview | Inside the sheet, not a new page: billing, the sets for this artist across the selected day filter, credited identities, and a mint primary button **"Hear {artist} in Listening Room"**. |
| Empty / failure | A dashed `--line` box, a muted 0.9375rem message and one recovery action. The copy is in the [contract](INTERACTION-CONTRACT.md#7-states-and-copy). |
| Bottom nav | **Map · Stages · About**. Violet indicator bar on top, the same pattern as Listening Room tabs but in violet. |

## 7. Motion

- Sheet transitions: 220ms `cubic-bezier(.2,.8,.2,1)`. Map pan to a selected hotspot: 280ms.
- Under `prefers-reduced-motion: reduce`, everything is instant: no animated pan or zoom, and the sheet snaps.
- No pulsing or looping animation on hotspots.

## 8. Do / don't

- **Do** let mint mean "music". Every route out to Listening Room is mint; nothing else is.
- **Do** show a status badge on every time.
- **Don't** reuse the Listening Room equalizer mark, the page title or the bottom-tab labels.
- **Don't** use EDC/Insomniac logos, festival typefaces, owl or daisy imagery, or colours sampled from the official map.
- **Don't** call Listening Room tracks a setlist. The CTA says "Hear {artist}", never "Hear their set".
