# Overnight release control — November 1, 2026

PM-owned record for #83 / canonical dispatch #77. This is a **pre-candidate work record**, not a release or sign-off.

## R2 preliminary build pinned - November 1, 2026, 13:00 EST
**PROVISIONAL / NO-GO. R2 is an inspected review build, not a certified release candidate or deployment.** It incorporates LR-001 (#88) and #91's browser-trigger coverage. PD-2/3/4 and source/map/device/final-review gates remain open.

| Provenance | Exact value |
| --- | --- |
| Merged integration | `c05bf2bbc6515cccc364d0dca9f63ae7774e6e99` (#91); LR fix `79ab62c9830715cdb0829d5eaba465f3da20398d` (#88) |
| Tested PR head | `1700ddd6740c1b092b11c21995d319c7116e25e5` |
| Actual tested checkout | `7f0f6a4192c94b2bcc41a8e33e83cb682b42791c` (synthetic merge) |
| Browser / unit CI | [41329698977](https://github.com/johnapaz/edc-listening-room/actions/runs/41329698977) / [41329698966](https://github.com/johnapaz/edc-listening-room/actions/runs/41329698966), both SUCCESS at PR head |
| Sanitized ZIP | [13092916753](https://github.com/johnapaz/edc-listening-room/actions/runs/41329698977/artifacts/13092916753), 351917 bytes |
| Downloaded ZIP SHA-256 | `fdf6f2010ad683fcccf011b416f3fbde6a8ff42628dc0b24f07cf4ce6e50e0d1` (matches reported digest) |
| Screenshot evidence | artifact 13092827313 in the browser run; not newly visually reviewed by this PM pass |
| Tree equivalence | tested checkout and merged c05bf2b both tree `76b58be5a0004d1f839e0d76ddbafdac98ed51a6`; equivalence is not a separate merged-head browser run |

PM independently downloaded and inspected the ZIP: 38 files; no private pilot/Discovery/Notion/source/test/script paths; CSP retained. Only listening-room/styles.css and its index.html stylesheet cache key differ from R1; all Companion/data files are byte-identical. Static checks preserve 130 unique appearances, 107 provisional / 23 unknown stage/time, B2B/program/credit IDs and source dates; all five stage coordinates remain null, geometry objects empty, artwork_public_export false. No confidence upgrade.

Reproduce: download/extract into an empty directory, then `python3 -m http.server 8765 --bind 127.0.0.1 --directory <extracted-build-root>`; open /listening-room/ and /companion/. Never serve repo root. This simple server does not apply _headers; security testing uses the existing harness.

**Affected acceptance:** designer re-review of LR-001 on this exact artifact; QA changed-head Listening Room regression plus rail evidence reconciliation; backend independent LR viewport/text verification remains pending. Record actual app/test SHA and limitations. QA's own CSS-fix/retest remains same-agent; design's earlier 360/768 check is at b487476. No old final sign-off is carried forward. Frontend PD-2 app.js and PD-3/4 Companion work remain assigned without takeover. Real devices/Fold, VoiceOver/TalkBack, native zoom and physical high-contrast checks are unverified. Final design -> independent QA -> PM review is still blocked by open findings.

No public Companion, DNS, provider or production deployment by this checkpoint. #66/P2/P3 deferred. Continue coordination while internal work remains; the 08:00 saved PDF remains a clearly dated provisional historical snapshot until final reviews complete.

## Historical post-merge checkpoint - November 1, 2026, 12:00 EST
**PROVISIONAL / NO-GO remains.** #88 merged as `79ab62c9830715cdb0829d5eaba465f3da20398d` at 16:44:37 UTC. LR-001/PD-1 is integrated, not deployment or final acceptance. The prior 08:00 report and R1 are historical snapshots.
- Main [Pilot checks 41327875517](https://github.com/johnapaz/edc-listening-room/actions/runs/41327875517) PASS at `79ab62c`; prior exact PR head `b487476` test PASS. No new browser execution or backend viewport/text verification is established by the merge. Prior design 360/768 verification and QA same-agent cases remain labelled as such.
- **R2 requested, artifact/checks pending:** the existing browser workflow excluded Listening Room-only PRs despite running its ui_smoke.js. The bounded PM change adds listening-room/** and tests/ui_smoke.js to its PR trigger only. Existing jobs/assertions/security/permissions and production exclusion remain identical. Pin actual passing PR head, tested checkout and artifact before describing R2 as available.
- Backend carries independent LR-001 verification to `79ab62c`; QA owns merged-head regression/rail-evidence reconciliation. Frontend PD-2/3/4 remains open, with no new branch checkpoint; backend keeps ui_smoke.js ownership. No duplicate dispatch or takeover.
- App changes invalidate affected R1 acceptance. Final design on changed surfaces, independent final QA and PM acceptance remain pending. Source/map/device gates unchanged; #66/P2/P3 deferred. No deployment or public Companion authority.
- Continue coordination while assigned internal work remains. The saved 08:00 PDF is the historical provisional report; update it after actual final reviews, not as a false final sign-off.

## Historical 08:00 EST morning checkpoint - 2026-11-01 13:00 UTC
**PROVISIONAL / NO-GO; no certified candidate.** See [morning-report.md](morning-report.md) for the coffee one-pager. Integration baseline `af47df430f097718b1bd182c623ef18e2273defc`; R1 artifact/provenance below remains preliminary, app unchanged since #82.
- Preliminary principal design #89 is merged as `af47df4`: rebuilt main `62c7151`, Chromium emulation only. This is observed acknowledgment, not final candidate sign-off.
- LR-001/PD-1 P1 fix is published in #88 at `b487476`, not merged. QA author evidence is same-agent; design independently checked 360/768; full PM static review has no material finding and exact-head test SUCCESS. Backend's assigned independent verification remains pending.
- PD-2 rail focus and PD-3/4 Companion navigation/hierarchy are P1/open with frontend. QA has a bounded rail-evidence reconciliation task; backend owns existing ui_smoke.js assertions/synchronization investigation. No new fix/retest checkpoint or relinquishment observed.
- Eight actual Claude branches completely paginated and their role reports inspected. Frontend `6c217ec`, backend `a5a31bc`, QA `b487476`, designer `1ed18f2`; no new activity assumed.
- Source/map/hardware/public-release gates unchanged. Real-device/AT checks and final design -> QA -> PM acceptance remain pending; P2/P3/#66 deferred.
- No deployment or current live deployment SHA/health certification by this checkpoint. Existing availability/production Companion exclusion preserved; existing verify/rollback plan below remains required before authorized deployment.
- Continued internal P1/verification work remains: do not pause coordination solely because map evidence is externally blocked. No active code-lane takeover or PR review claim retained.

## Historical 05:00 EST cutoff — 2026-11-01 10:00 UTC

**NOT READY / NO-GO for public Companion release. No release candidate is certified.** A real, immutable **preliminary review build R1** is available for review of the implemented surfaces. This is not a reduction of map-first P0 scope.

| Record | Exact value |
| --- | --- |
| Application baseline | `affa1b9b14e2adb9b5824b8d3a26aec67d26e825` (#82 merged) |
| Packaging PR / branch head | #86 / `31245708b0161f4fb93d41b0cfd8545441d5f002` |
| Actual tested checkout | `e7b55cd09f7979921b8f9963d683b0b1152cb1ab` (PR synthetic merge checkout) |
| Merged packaging commit | `675885eb0b92fdae760f0b754c307da7126a2f90` |
| Runnable sanitized ZIP | [artifact 13077233599](https://github.com/johnapaz/edc-listening-room/actions/runs/41291620886/artifacts/13077233599) |
| ZIP SHA-256 | `6210789c2f7dfbba81b7e24742bd20342f0240f9ec8c4ee41c1eadd078540ae9` |
| Browser CI | [41291620886](https://github.com/johnapaz/edc-listening-room/actions/runs/41291620886), SUCCESS at branch head above |
| Unit / validation CI | [41291620891](https://github.com/johnapaz/edc-listening-room/actions/runs/41291620891), SUCCESS at branch head above |
| Screenshot evidence | artifact 13077472938 in the browser run |
| Live status | No public Companion deployment; production builder still excludes Companion. No live-deployment change claimed by this pass. |

PM downloaded/inspected the ZIP: hash matches; 38 files; private pilot/Discovery/Notion/source/test/script paths excluded; CSP headers retained. Data remains 130 unique appearances, 107 provisional poster slots, 23 null unknown stage/time, B2B/program identities intact, five stage coordinates null. This is static artifact inspection, not a new device/assistive-tech test.

**Reproduce R1:** download the artifact and extract into an empty directory. Serve only that extracted build root with `python3 -m http.server 8765 --bind 127.0.0.1 --directory <extracted-build-root>`; open `http://127.0.0.1:8765/companion/` and the sibling `/listening-room/`. Never serve a repository root. The simple reproduction server does not apply Cloudflare `_headers`; security assertions use the existing CI harness.

### Open gates and review sequence

- **LR-001 P1** still has no published CSS fix/checkpoint. QA retains its authorized `listening-room/styles.css` lane; backend independently verifies. No unacknowledged worker takeover.
- Map P0 remains incomplete: independently supported coordinates/permitted representation unavailable. Timetable slots remain provisional; no new evidence/confidence upgrade. #28/#63/#64/#67 remain open.
- QA's independent Companion retest is at `6c217ec` (`ba7e1f2` report); it is not final candidate-wide approval. Real hardware/AT/browser-native zoom remain untested.
- Principal designer is given R1 **only for preliminary inspection**, with final candidate activation BLOCKED by unresolved gates. No designer acknowledgment/sign-off observed. Return ranked findings on these actual surfaces and an exact reviewed SHA; no blanket release approval.
- Final QA after affected fixes, principal final review and PM final acceptance are pending. Any changed app/data surface requires new build generation R2 (or a separately named certified candidate), exact CI and affected retests. Do not carry R1 findings/sign-offs forward automatically.
- Backend's demonstrated smoke geometry synchronization investigation remains assigned; no result or root cause is claimed. Existing assertions/configuration must remain intact.
- Freeze continues. Only release-blocking fixes/verification; #66, P3 polish and new features remain deferred.

Merged overnight PRs: #78 evidence; #85 scenario support; #84 release record; #82 Companion integration; #86 sanitized build packaging. Nothing here authorizes DNS, public Companion deployment, paid/API services or provider/playlist writes.

## Historical freeze checkpoint — 2026-11-01 09:00 UTC / 04:00 EST

**NOT READY. Feature freeze is in effect; only release-blocking fixes and verification remain. No candidate generation or public Companion release is declared.**

- Frozen application baseline: `affa1b9b14e2adb9b5824b8d3a26aec67d26e825` (merged #82). Its PR head `6c217ec` had exact-head test/browser passes, 63 PASS artifact entries, complete PM review and independent QA retest of sticky occlusion / A11Y-001/002/005/006. Main test run: https://github.com/johnapaz/edc-listening-room/actions/runs/41283112462 .
- Merged overnight work: #78 evidence (`9340bea`), #85 helper (`af706af`), #84 release record (`b59e166`), #82 Companion integration (`affa1b9`). Companion remains production-excluded.
- **LR-001 P1 remains open:** no CSS fix or verification checkpoint is published. QA retains the explicit `listening-room/styles.css` transfer in #80; backend independently verifies once available. Lack of branch activity does not establish relinquishment.
- Backend's bounded `tests/ui_smoke.js` geometry-readiness investigation remains assigned in #79. One prior null-boundingBox failure followed by a passing rerun is recorded; root cause is not proven. No assertions or configuration may be weakened.
- Seven Claude branches were completely paginated; observed frontend `6c217ec`, backend `a5a31bc`, QA `ba7e1f2` heads/reports are unchanged. No new designer branch/report/acknowledgment observed. No assumptions about unpublished local work.
- **Review packaging:** the existing browser workflow now additionally uploads `companion-preview/` only after successful checks as `companion-review-build-{workflow SHA}`, retained seven days. The existing sanitized preview builder is unchanged; screenshots still upload on failure. This adds no hosting or provider write. Record the actual successful run/artifact ID and SHA before assigning a build for review.
- At **10:00 UTC / 05:00 EST**, record actual tested build generation or NOT READY with missing inputs. If LR-001 or map/source gates remain, do not silently redefine scope. Principal review can evaluate actual available surfaces with an explicit blocked-release disposition; final design/QA/PM sign-offs remain pending.
- A later app/data fix invalidates affected earlier QA/design sign-offs. P3 polish, #66, source retry loops and speculative optimizations remain deferred. Hardware/AT and exact final candidate checks remain explicit.
- No public Companion release, DNS, OAuth/playlist/provider writes, paid service or API is authorized. Listening Room availability and existing security/allowlist/tests remain protected.

## Historical checkpoint — 2026-11-01 05:00 UTC pass

**NOT READY; no candidate generation or public Companion release.** This section supersedes the historical checkpoint below.

- Backend helper #85 is merged at `af706af38f70f45f6e05e0e3c080d0b29d36f7f0` after full-file PM review, exact-head passing required test CI, syntax/config/manifest/size-rollup checks and verified resolution of both prior review findings. No product data, test configuration or production code changed. Author's Chromium helper evidence is baseline-only; independent/browser WebKit helper execution remains unverified.
- Current frontend #82 head observed: `5237336ecdc2888efd1d80a4d9edb34692717999`. Exact-head test/browser are reported green in the PR. QA independently cleared sticky day-control occlusion at `42e20df`, with the same check failing on the held `db54e8b`. This does not sign off later changes.
- Frontend reports A11Y-001/002/005 fixes (Back focus, retry announcement/focus, unavailable headings/titles); independent QA must retest current code. A11Y-006 forced-colors selection distinguishability is newly assigned to frontend. P3 polish remains deferred.
- **LR-001 (P1) is open on the live Listening Room, pre-existing on main:** bottom navigation fully obscures focused controls. PM accepts the bounded accessibility correction under #44. QA is explicitly assigned ONLY `listening-room/styles.css` for fixed-bar scroll-padding/focus occlusion, in a separate PR with same-agent implementation/retest labelled. Backend independently verifies the fix; no competing CSS edits. LR-002 is included only if that same correction resolves it.
- QA test/ledger branch: `claude/gracious-newton-3s6ivf` @ `4391e2b8d8aa900c41cd3e932497e2d28e67c128`. Findings are tied to tested `42e20df`; no blanket accessibility compliance or real-device/assistive-tech pass.
- Backend branch: `claude/elegant-cray-0na154` @ `a5a31bc30ca810b7022a03ce4aa7b077f0aed5b9` before squash merge. QA's old 8fb2207 handoff pin was corrected; the current merged helper is available. Backend's remaining ready work is the explicit unfinished field-level allowlist/identity/time audit and independent LR-001 verification when the QA fix arrives. No speculative optimization.
- Fully paginated seven Claude branches: frontend, backend and QA have observed acknowledgment/activity. No designer acknowledgment/report observed. Principal design remains gated on an actual candidate at/after 10:00 UTC.
- Existing map/source/public-release gates and real hardware/AT limits remain. Coordinator remains available while fixes/reviews are actionable. No final report or production change from this pass.

## Historical checkpoint — 2026-11-01 04:00 UTC

The remaining sections record the earlier baseline; the current checkpoint above wins where status differs.

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
