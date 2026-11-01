# Overnight release control — November 1, 2026

PM-owned record for #83 / canonical dispatch #77. Checkpoint: 2026-11-01 04:00 UTC. This is a **pre-candidate work record**, not a release or sign-off.

## Disposition

**NOT READY. Candidate generation: none.** Main baseline: `9340beabce9957b1afc700d7a352314ebdcca1a1`. Evidence-only #78 is merged; frontend #82 is not merged at this checkpoint. No production deployment was performed by this coordination pass. Existing Listening Room availability and production Companion exclusion must remain.

## Current integration gate

Frontend branch `claude/great-mccarthy-0j5lpl`, reviewed head `db54e8b6606b1a54305259d50678bc958ff8f580`.

- Exact-head test and browser checks: SUCCESS. Browser run: https://github.com/johnapaz/edc-listening-room/actions/runs/41270473624 ; artifact ID 13069321505 has 56 PASS entries, no failures.
- PM inspected complete changed text files, 13 committed screenshots and exact-head Chromium phone/WebKit desktop screenshots. Older committed screenshots predate billing/date/source fixes; they do not establish final-head visual acceptance.
- **P1 open:** wrapping app bar obscures sticky day controls at 360px because actual header height exceeds the fixed 56px offset. Frontend owns fix and existing smoke regression; independent QA owns retest. Repro/evidence: https://github.com/johnapaz/edc-listening-room/pull/82#issuecomment-6553142509 .
- Preserve homepage-only rendered organizer links; original source URLs remain audit metadata. Refresh affected screenshots and their capture SHA.
- PM review is BLOCKED; its claim is released for implementation. The event reviewer may claim the corrected head after a fresh discussion check. Green checks alone are insufficient.

## Role handoff

All branches were paginated completely; five `claude/*` branches were found. Only frontend acknowledgment/current implementation activity was observed. No overnight role status file was present on those branches at this checkpoint. Do not equate failed comments or unpublished local work with inactivity.

| Role | Work ready / ownership | Observed state |
| --- | --- | --- |
| Frontend #64/#65 | P1 header/day occlusion fix, source-link disposition, evidence refresh in #82 | Acknowledged on actual active branch; fix assignment posted |
| Backend #79 | NEW tests/support/rc_* scenarios and measured payload/build/parse baseline | Assignment published; no acknowledgment/report observed |
| QA #80 | Independent keyboard/focus/accessibility audit; phone occlusion retest; failure and sibling regression coverage | Assignment published; no acknowledgment/report observed; can progress without helper |
| Principal designer #81 | Prepare checklist; review actual candidate only at/after 10:00 UTC | No acknowledgment/report observed; candidate input unavailable |
| PM #83 | Integration, shared release/security/build records, final review and report | Full #82 review blocked; no competing implementation |

## Clock and candidate sequence

America/New_York repeats 01:00 tonight. Use UTC instants:

- **09:00 UTC / 04:00 EST:** freeze features; only release-blocking fixes.
- **10:00 UTC / 05:00 EST:** target actual candidate or explicit NOT READY.
- At/after candidate: principal design → routed P0/P1 fixes → independent QA retest of final surfaces/SHA → PM final acceptance.
- **13:00 UTC / 08:00 EST:** coffee one-pager; if review incomplete label provisional / NO-GO, then update on completion.

For each candidate generation record exact code/data/test commit(s), sanitized artifact and reproduction command, merged PRs, exact-head checks, outstanding finding IDs, QA/design/PM dispositions and limitations. A changed affected surface invalidates the relevant earlier sign-off.

## Build, verify and rollback plan

1. Pin the selected reviewed SHA in an isolated checkout. Run existing projection/reference validators, Python/Node suites and the established browser workflows without changing their configuration or skipping checks.
2. Build the review artifact with `python3 scripts/build_companion_preview.py`. Serve **only companion-preview/**. Never serve repository root, private pilot/Discovery/Notion inputs or source evidence as the preview root. Preserve the sanitized allowlist.
3. Record the actual artifact URL/ID and exact-head CI before assigning final design. No candidate artifact is recorded yet. Emulation is not real device, Safari hardware or VoiceOver/TalkBack evidence.
4. Independently build `python3 scripts/build_public_site.py` and run existing exclusion/security checks. The production artifact must still exclude Companion. No release action may change that exclusion without specific scope authorization and acceptance.
5. Existing hosting is Cloudflare Pages under #44, with apex HTTPS and deliberate www redirect reported there. Before any authorized Listening Room deployment, fetch **current** deployment/project metadata and save the last successful deployment ID and source SHA; historical #44 IDs are not assumed current rollback targets. No hosting/DNS mutation in this plan.
6. For an authorized Listening Room-only deployment, use the existing main-branch hosting flow and sanitized production builder; verify no-login apex and www routing, artist/song links, search/day/Back, headers/CSP, absence of private paths and continued Companion exclusion. Capture actual deployment ID and SHA.
7. If authorized deployment regresses those checks, restore the captured last successful deployment through the existing Pages rollback mechanism, or redeploy its exact sanitized known-good SHA if rollback is unavailable. Re-run the same live verification and record the result. Do not guess a deployment ID or change DNS as rollback.
8. Public Companion release remains separately gated. No playlist/OAuth/provider writes, new paid service, API or copied map artwork is authorized.

## Fixed unresolved scope

130 current appearances; 107 provisional poster times / 23 unknown stage/time. #78's 27 day/stage matches do not verify full slots. Stable B2B/program/credit IDs and source-specific dates remain mandatory. Five stage coordinates stay null, no geometry objects/POIs, artwork not cleared. A working stage list is **not** completed map P0; #28/#63/#64/#67 remain open where blocked. #66 remains deferred.

Final owner decision will be stated only after actual design, QA and PM review. No public Companion GO is implied by this record.
