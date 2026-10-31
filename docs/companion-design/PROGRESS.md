# #61 design work: progress checklist

Work is chunked and pushed after each step so it can resume after a rate limit or session reset. Branch: `claude/eager-einstein-kkk330`.

- [x] 1. Design guidelines: sibling visual language and tokens ([DESIGN-GUIDELINES.md](DESIGN-GUIDELINES.md))
- [x] 2. Interaction contract: screens, states, URL, focus, keyboard and screen reader ([INTERACTION-CONTRACT.md](INTERACTION-CONTRACT.md))
- [x] 3. Static clickable wireframe with an original schematic map and placeholder hotspots (`wireframe/`)
- [x] 4. Screenshots at 280 / 360 / 768 / 1280 (`wireframe/shots/`)
- [ ] 5. Open the design PR, cross-link #61 #63 #64 #65 and comment on the issues
- [ ] 6. Answer Codex follow-ups (an hourly scheduled check runs in this session)

Re-capture: `node docs/companion-design/wireframe/capture.js docs/companion-design/wireframe <out-dir>` (uses the preinstalled Playwright and also checks the day-switch and Back flow). Wireframe-only failure states: append `?state=mapfail|datafail|offline|stale` before the hash.

## Open visual decisions for the owner

1. Is lantern violet right as the Companion accent? The alternative is a sodium orange `#ffb36b`, which is warmer and more "festival lights" but sits closer to the amber focus ring.
2. Desktop layout: a fixed side panel (proposed) or a bottom sheet at every size.
