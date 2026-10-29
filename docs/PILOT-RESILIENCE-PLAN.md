# Pilot resilience and delivery plan

Status: provider isolation, durable missing-work recovery, conservative backoff, metadata-only YouTube collection and distinct partial outcomes are implemented in PR #8. Live validation is pending. The preview manifest/source-contract changes remain pending; M1 gates are unchanged. No new retry is queued. Keep this with PR #8 rather than opening another planning PR.

## Why runs keep stopping

Evidence runs 40961296885 attempts 1 and 2 both ended after MusicBrainz HTTP 503. Attempt 1 collected 25 recording searches; attempt 2 reused those results and reached 38. This is partial progress, not a lost run. OAuth and YouTube reads worked; main/PR unit checks passed.

A MusicBrainz 503 can indicate application/IP throttling or global load; our logs do not distinguish these causes. Serial pacing at 1.1 seconds does not guarantee acceptance. Documentation: https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting . Do not evade throttling with alternate IPs or invented clients.

Our design made provider availability a blocker for the whole collection and repeated independent YouTube work. Offline tests proved code paths but could not establish live provider availability. More immediate retries will not fix sustained throttling or missing/ambiguous metadata.

## Two distinct outcomes

1. Private listening preview: 8–16 source-verified tracks, ideally all eight artists, individually approved and actually playable; unranked, private, exact ordered API readback. This is useful output before the festival but is not an M1 pass.
2. Full M1 acceptance: original eight-artist identity, 40-plus candidate inspection where available, exclusions, ranking/licensing, Notion projection, idempotence, playlist/readback/playback requirements remain unchanged. No bulk ingestion or public release before existing gates.

A preview is an additional bounded milestone. The MB-first manifest contract must be explicitly amended and tested before alternate source IDs can be used in automated preview execution. An unresolved item may be omitted only with explicit partial coverage labeling; it cannot count as verified. No synthetic MBIDs, invented ranks or inferred human approval.

## One implementation change, then one bounded validation

Extend the existing recovery work, without another PR for each transient provider failure:

- Provider selection: support MB-only, YouTube-only or both. A MusicBrainz recovery must not spend YouTube quota. Existing cache improvements remain useful, but optional provider execution prevents coupling even when a cache expires.
- Missing-work selection: persist per-request identity, status, attempts, last error, fetched-at time and source/version evidence. Resume only unresolved requests. Actions cache is an accelerator, not the sole durable record; retain normalized successful evidence in reviewed repo data and artifacts. Expired cache must not require rereading all completed items.
- Diagnostics: report COLLECTION_COMPLETE, COLLECTION_PARTIAL or EXECUTION_ERROR distinctly. A successfully saved partial result may finish collection with an explicit partial outcome; the acceptance/manifest gate separately fails on missing required evidence. Code errors, OAuth failures, malformed results and lost checkpoints remain errors. No green badge is presented as an M1 pass.
- Backoff: <=1 request/sec (use a conservative 2-second interval); retain bounded retries with jitter. Honor provider Retry-After; if it exceeds the run's wait budget, save a deferred-until time and stop rather than shortening the requested wait. After exhausted throttling/service retries, open a provider circuit and defer the rest of that provider. No indefinite loops or automatic reruns.
- Validation: tests cover provider isolation, resumed collection without prior Actions cache, Retry-After deferral, partial output blocking acceptance, no duplicate IDs and zero playlist writes. Perform one bounded live validation after merge and owner environment approval.

## Immediate scope

MusicBrainz: only the three unfinished Vastive recording searches (Under My Skin, Barking At Thunder, Cut); at most three attempts each, nine HTTP attempts total. Do not replay the 38 completed searches just because they are absent from a local cache.

YouTube: a separate metadata-only lookup for Benda Poison Control video oXhWSs0mRH4, at most one general unit, zero new search requests. Previous eight owner playback checks stand. Ask only for Benda playback/inclusion if it has not already been confirmed.

Review the 38 existing results now. Resolve duplicates and different edits explicitly; do not make recording identity depend on search rank. Prioritize the 8–16 preview candidates rather than waiting for every optional catalog crosslink. A failed optional enrichment cannot invalidate an independently verified official release.

Fallback evidence: official artist/label release + distributor-provided audio metadata; prefer ISRC. Where unavailable, use an exact source track ID/URL with an explicit provider namespace and version description, never a made-up canonical identifier. Keep the MBID crosswalk unresolved. Verify contributor credits, release scope, version and human playback regardless of source. Do not substitute unofficial reuploads or full DJ mixes.

## Costs and authorizations

Keep $0 paid services, no bulk ingestion, manual protected main-only live runs and no auto-merge. Known measured use through the OAuth test and first two evidence attempts is 3 YouTube general units and 4 search requests, with zero playlist writes. Verify available quota before a new run.

A branch merge and environment approval remain owner actions under the current repo workflow. Routine metadata review, repairs and preparation do not need repeated conversational permission. Present one concrete execution package, rather than sending the owner through a retry/merge cycle for every provider failure.
