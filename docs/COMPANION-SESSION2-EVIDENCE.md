# Companion Session 2 — lane B evidence checkpoint

Checked October 31, 2026 (03:34 UTC November 1). Queue: #77; authorities: #28 / #63. Baseline: `aca385d6e22e45d7d46507fbfe27c9d42e3a2c51`.

## Supported finding

An [organizer-hosted favorites share](https://www.insomniac.com/s/jZZ09f2XbXVFlrViHG) exposes 27 selected day/billing/stage records, all matching existing IDs and stages (8 Friday, 9 Saturday, 10 Sunday). The [structured evidence](../data/edco-2026/evidence/companion-session2-source-check-2026-10-31.json) records only those observed fields, including the B2B and program slot.

This is a selected favorites page, not a complete editorial timetable. Hosting alone does not establish who selected it, editorial validation, or schedule revision. Direct retrieved page text has no clock times; search snippets expose clock times, but retrieval consistency and every end time remain unresolved. Do not use snippet times to upgrade slots. The app deep link resolves to an Open button only; no timetable was retrievable there. No app login or write attempted.

**Disposition:** evidence-only corroboration; no current/historical data, confidence, dates, public allowlist or production files changed. All 130 appearances remain, with 107 provisional poster slots and 23 unknown stage/time. No full slot independently verified by this check. Do not interpret this audit timestamp as a new timetable verification date.

## Bounded source attempts and map disposition

| First-party source | Retrieved result | Limitation / next trigger |
| --- | --- | --- |
| [Organizer lineup](https://orlando.edc.com/lineup/) | Current day-grouped billings | Retrieved text provides no complete stage/start/end timetable. Need directly inspectable current organizer timetable or app evidence. |
| [Favorites share](https://www.insomniac.com/s/jZZ09f2XbXVFlrViHG) | 27 day/stage matches; snippet/page time discrepancy | Partial corroboration only. Need stable primary field-level start/end evidence and revision provenance. |
| [App share destination](https://app.insomniac.com/0/S/jZZ09f2XbXVFlrViHG/) | App launch interstitial | No inspectable timetable in retrieved content; do not repeatedly retry unchanged interstitial. |
| [Organizer stage page](https://orlando.edc.com/experience/stages/) | Five stage identities | No supported coordinates. CASA remains selectable without sourced individual slots. |
| [Organizer map page](https://orlando.edc.com/guide/map/) | Image link | No independent stage geometry or reuse grant; map image was not downloaded, traced, embedded or served. |
| [Venue operator event guide](https://www.campingworldstadium.com/plan-your-visit/edc-orlando-event-guide) | Festival-map section remains pending; entrance/box-office street descriptions | General entrance facts do not establish a point or stage coordinate on an original canvas. |
| [Organizer terms](https://www.insomniac.com/terms-of-use/) | Prior restrictions remain present | Preserve #63 engineering disposition: artwork not cleared, homepage-only UI links. This checkpoint supplies no new permission or legal determination. |

Targeted first-party searches covered organizer set times, Insomniac Orlando 2026 schedule and venue-operator stage evidence. No complete field-level timetable or independent normalized positions was established. Stop identical retries unless a source changes or new evidence is supplied. Search discovery is not proof of absence elsewhere.

No permitted original spatial representation can be completed from these checks. All five coordinates remain null; geometry objects remain empty. Wireframe positions and synthetic test points are not evidence. No POIs were added. Stage-list fallback is useful, but does not satisfy map, pan/zoom or alignment acceptance.

## Validation performed

- Existing `python3 scripts/build_current_lineup.py --check`: PASS; 130 appearances, 23 added appearances, three historical-only billings retained.
- Existing `python3 scripts/validate_current_lineup.py`: PASS; 43/43/44 day coverage, 107 timed / 23 unknown.
- Offline audit: PASS; 27 unique stable-ID joins agree on day, billing and stage (8/9/10); observed times are null; Discovery Project has no artist identity; Deorro B2B DJ Diesel remains one set with two participants; all stage coordinates remain null.
- Evidence-only change. No application/browser tests were changed or claimed rerun; existing CI remains required on the PR head. No device or screen-reader pass is claimed.

Reproduce the additional audit after the two existing validators:

```python
import json
from collections import Counter
from pathlib import Path
data = Path("data/edco-2026")
audit = json.loads((data / "evidence/companion-session2-source-check-2026-10-31.json").read_text())
current = json.loads((data / "current-lineup.json").read_text())
rows = {p["performance_id"]: p for p in current["performances"]}
seen = set()
for observation in audit["observations"]:
    pid = observation["performance_id"]
    assert pid not in seen
    seen.add(pid)
    row = rows[pid]
    assert all(observation[k] == row[k] for k in ("event_date", "stage_id"))
    assert observation["billing"] == row["display_name"]
    assert observation["starts_at"] is None and observation["ends_at"] is None
    assert row["schedule_status"] == "poster_transcribed"
assert len(seen) == 27
assert Counter(o["event_date"] for o in audit["observations"]) == {
    "2026-11-06": 8, "2026-11-07": 9, "2026-11-08": 10}
assert rows["edco26:2026-11-08:discovery-project"]["artist_ids"] == []
assert len(rows["edco26:2026-11-08:deorro-b2b-dj-diesel"]["artist_ids"]) == 2
assert len(rows) == 130 and sum(p["stage_id"] is None for p in rows.values()) == 23
venues = json.loads((data / "venues.json").read_text())
assert all(s["coordinates"] is None for s in venues["stages"])
assert venues["map"]["geometry"]["objects"] == []
assert audit["disposition"]["confidence_upgrade"] is False
assert audit["disposition"]["public_export_approved"] is False
print("Evidence joins and conservative disposition pass")
```

## Resumable acceptance handoff

Claude owns active frontend lane A, branch `claude/great-mccarthy-0j5lpl`. The separate event watcher owns incoming Claude PR review/merge; this worker has not taken over or reviewed/merged his branch.

- #28 stays open: stable current primary start/end evidence, including missing coverage and qualifier conflicts.
- #63 stays open: independent positions and permitted original schematic; no copied art.
- #29 / #64 / #67 remain incomplete for the approved map-first P0. Do not turn a successful stage-list implementation into map acceptance.
- #61 / #65 await actual integrated frontend evidence and exact-head checks.
- #66 remains deferred until actual P0 acceptance, under the newer #77 staffing.
- Human checks remain: real phone/Fold/Safari, VoiceOver/TalkBack, actual zoom/reflow and touch. Emulation must be reported separately.
- Precise release decision remains owner authorization for a separately reviewed public Companion scope, after map/source and acceptance gates are resolved. No Companion deployment/DNS, playlist/OAuth writes, paid services, public API or Listening Room availability changes are authorized here.

Resume lane B only with materially new primary timetable/geometry evidence. Continue lane A and watcher review independently; reconcile issues against merged results rather than planned work.
