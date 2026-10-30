# Discovery investigation and recovery contract

Agent: codex. Baseline main `ec52346`, merged PR #24; no open PRs at inspection. Read README, discovery instructions, the complete Notion handoff and captured candidates, workflow, matching/publisher, quota meter and offline tests. No AGENTS.md or additional repository agent instructions were present. No live YouTube calls, workflow dispatches, Notion access, paid services, scheduling, or changes to saved production state were made in this session.

## What is established

- [Run 41082487864](https://github.com/johnapaz/edc-listening-room/actions/runs/41082487864) completed successfully. Its job logs show search attempts 3, completed acts 2, HTTP 429, general meter 3,209, added songs 63, playlist count 68, private visibility, ordered read-back true. State commit `c6d6c18` has 33 completed acts. A verbatim match checkpoint was replayed locally via the optional `EDC_OFFLINE_STATE` test input; the captured state is not included in this PR. The destination repository is public, so publication of that fixture was removed after automatic approval review blocked the initial push.
- Earlier documented runs searched 52 acts without saving them, then completed 31 searches before another 429; the latest completed two before its third attempt received 429. These known attempts sum to 87, **not a complete project-wide quota ledger**. Missing requests, other clients, rolling rate windows and daily quota are possible explanations; none is proven.
- The old client retained HTTP status and operation only. The provider reason, headers, and response provenance were not captured. The historical 429 cannot now be attributed to daily exhaustion, per-user/project rate limiting, a shared client, or an intermediary. The general quota reading does not establish search quota availability.
- Current official [quota calculator](https://developers.google.com/youtube/data/determine_quota_cost) confirms separate 100/day search calls and 10,000 general units, with playlist mutations costing 50. The [June 1 revision](https://developers.google.com/youtube/data/revision_history) documents the granular quota transition. [Core errors](https://developers.google.com/youtube/data/reference/rest/v3/core_errors) distinguishes `rateLimitExceeded` / `userRateLimitExceeded` from `dailyLimitExceeded` / `quotaExceeded`. Thus status alone is insufficient.
- No new live evidence was collected. This PR improves diagnosis and recovery; it cannot prove a provider-side fix offline.

## Identified local failures and fixes

| Failure | Resulting behavior |
|---|---|
| Raw provider reason discarded | Read at most 64 KiB to parse only an allowlisted reason. Never log raw bodies, messages, URLs, headers or credentials. Unknown remains unknown. Transport failure uses status 0 (no HTTP response), operation and unknown reason. |
| Fast requests and undifferentiated 429 handling | Pace searches by 10 seconds after observed rate throttling; at most two read retries, after 60/120 seconds, only for explicit transient 429 reasons and within both attempt allowances. Unknown/daily reasons stop searching; cached songs can still publish. Pacing is a precaution, not a diagnosed cure. |
| Successful search repeated if metadata fails | Atomically checkpoint returned video IDs before metadata lookup, then completed act matches after classification. Resume metadata from those IDs even with zero new searches. |
| First-three-only eligibility could omit later captured songs | Search eligibility considers every captured candidate; selection still defaults to three songs per act. All candidates are matched locally from one act result set. |
| Publisher's local estimate omitted pages and retry attempts | Use authoritative Budget deltas, count every admitted attempt by operation, and keep 100 general units outside the write allocation for read-back. The hard Budget cap applies before every real request, including retries and pagination. |
| Blind 404/409 write retry could duplicate additions | Discovery never repeats an uncertain mutation. Save write intent before sending; reconcile bounded stable reads after a failed response. If the effect is visible, continue without repeating. Otherwise retain the journal and stop. |
| Two stale listings could omit successful additions | Persist known playlist identity and confirmed videos. Refuse to add if a listing omits confirmed additions, or the saved playlist disappears/changes. A pending write must resolve before any later mutation. |
| Fetch failure could silently start with empty state | State branch fetch and nonempty checkpoint are mandatory before the live step. |
| Publishing failure hid final progress / save failure lost work | Always emit a safe execution summary for authenticated execution, atomic match/review files, operation counts and completed progress. Upload checkpoint artifact before branch checkout; save step reports commit/push outcome separately; final workflow outcome also covers setup/gate failures. |

Selection/classification policy, uncertainty defaults, private checks, breadth-first desired selection, deduplication and owner decisions remain as documented. Existing 282 source candidates are reused. Ranking, public publication, Notion polish, deeper catalogs and seven gap acts remain deferred.

## Offline validation

The standard unittest suite passes 66 tests and skips the optional saved-state test. With `EDC_OFFLINE_STATE` pointing to the local saved checkpoint, all 67 pass. Validation includes the actual 33-act/68-video saved-state replay with zero search calls; metadata failure/resume without repeating search; unknown 429 pause with cached publishing; explicitly transient 429 retry success and search-budget exhaustion; exact read-cost/write accounting; budget rejection before network; sanitized/malformed provider reasons; stale successful listings; uncertain insert applied vs not applied; checkpoint replacement; and safe summaries even when OAuth fails. The real workflow save script is also exercised against a temporary local bare Git remote, including optional missing files, preservation of decisions, summary persistence and mandatory fetch failure. No test calls YouTube.

## Limits and recovery

- API read-back proves ordered Data API contents, not YouTube Music playback. The private discovery release is still separate from M1 and public gates.
- An unresolved write that never applied deliberately blocks automatic repetition. Inspect the safe journal and reconcile provider visibility before clearing it; do not delete the whole state or rerun blindly. This exceptional path may need an agent after lunch.
- The first new run adopts the existing playlist and records its identity/listing. Older runs did not persist confirmed video IDs; the fixture establishes desired matches, not a replacement for live read-back.
- Atomic files survive process exceptions on the runner. Git checkpoint push plus artifact provide durable recovery after ordinary failures. A forced runner termination can preclude final steps; push failure requires artifact recovery before another live run. No system can guarantee a final summary after runner loss.
- Hard quota ceilings can stop even read-back if responses paginate excessively or repeatedly fail. Such a run is unverified, never complete, and retains its checkpoint.
- Owner approvals and measured quota confirmations remain required. There is no automatic dispatch, recurring task, model loop or additional subscription.

## Post-merge live observation and conservative mitigation (2026-10-30)

First post-merge run [41087502389](https://github.com/johnapaz/edc-listening-room/actions/runs/41087502389) succeeded as a *safe pause* with 84 private playlist items (16 added), ordered API read-back true, 41 searched acts, 65 remaining, 14 attempted search requests and 817 metered general units. The provider returned `search.list HTTP 429` reason `rateLimitExceeded`. Checkpoint `discovery/state` commit `c344c82` and recovery artifact were saved. This is explicit rate throttling, not evidence of daily search-quota exhaustion.

This proposed follow-up changes only request timing (2s to 10s between searches; bounded 15/30s to 60/120s on explicitly transient 429s). It is a **precautionary hypothesis**; neither the 429 cause nor provider-side resolution is proven. Conservative pacing increases runtime and may still pause; automatic retry and quota ceilings remain bounded. No further live run is authorized without newly confirmed remaining Console quota and existing environment approval.

## Minimal remaining owner work

After reviewing/merging the PR, use [the manual workflow](https://github.com/johnapaz/edc-listening-room/actions/workflows/discovery-playlist.yml) on main, confirm actual remaining quota from [Cloud Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas), and approve the existing environment. Prefer one near-full-quota batch, then one on the next quota day if needed. The current upper bound is 250 further inserts plus 73 successful searches: two near-full general-quota days, potentially one if fewer videos match. Retry attempts or provider limits can increase batches. No song-by-song owner action or model supervision is needed for normal execution. See DISCOVERY-PLAYLIST.md for completion fields.
