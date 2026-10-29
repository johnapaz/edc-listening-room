# Evidence recovery — revised implementation

Run 40961296885 attempt 2 preserved eight artist relationship responses and 38 recording-search responses before HTTP 503. They are now persisted in pilot/evidence-checkpoint.json with exact path/parameter hashes and source-run attribution. The checkpoint retains recording IDs, credits, durations, ISRCs and disambiguation plus artist aliases/relationships; nonessential release listings were omitted. These are source responses, not approved identities.

## Implemented

- MusicBrainz-only (default), YouTube-only and both modes. MB-only never refreshes OAuth, requires no Google credentials and spends no YouTube quota.
- Successful committed responses are reused by exact request identity before checking local cache. Only Under My Skin, Barking At Thunder and Cut need new recording searches. Changed request parameters invalidate reuse.
- YouTube mode does one metadata batch, including Benda video oXhWSs0mRH4 from the committed candidate list. No searches. Same-day identical metadata requests can reuse cache.
- Two-second MB pacing; at most three attempts per unresolved request. Jittered backoff; Retry-After over 30 seconds defers the provider instead of retrying early. An exhausted request stops that provider. No automatic rerun.
- COLLECTION_PARTIAL versus COLLECTION_COMPLETE in report/Actions summary. Saving partial evidence completes collection without claiming acceptance. require_complete rejects partial evidence; collection never sets human approval. Unexpected errors and OAuth/authentication errors still fail execution.
- Output includes exact failed lookup, pending recording keys, new logical lookup count and per-attempt YouTube spending. No code consumes this evidence as an approved manifest.

## Bounded live validation after merge

Dispatch Pilot evidence collection on main, provider musicbrainz, remaining_general=0, remaining_search=0. Only three logical MB requests (up to nine HTTP attempts) and zero YouTube calls are permitted by the fixed checkpoint/pool. Owner environment approval is still required.

Then, if needed, use provider youtube with current verified general headroom and remaining_search=0 for one exact metadata lookup batch. Do not repeat the prior eight owner playback checks. Benda's new link still needs owner confirmation unless subsequently provided.

Known cumulative spending before validation: 3 general YouTube units, 4 search requests, zero playlist writes, $0 paid services. No new live run has been dispatched.

## Validation and remaining boundaries

21 no-network tests pass, including durable recovery without cache, provider isolation, long Retry-After deferral and partial evidence rejecting completeness. A replay using the real committed checkpoint makes exactly three fake MB requests and zero YouTube calls. Workflow YAML validated. Live provider recovery remains unproven.

The resilience plan's separate private listening preview remains a delivery milestone, not an M1 acceptance shortcut. No approved-tracks.json, alternative-ID publisher, ranked playlist, public release or bulk ingestion is enabled here. Next work after collecting the final evidence is version/credit selection and the preview manifest review.
