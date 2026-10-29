# Evidence recovery status — October 29, 2026

Run 40961296885 attempt 2 failed after a second MusicBrainz HTTP 503. It recovered from 25 to 38 of 41 recording searches using the successful-response cache. All eight artist relationships were returned. The raw artifact for attempt 2 is 12936289108. Remaining searches: Vastive — Under My Skin, Barking At Thunder, Cut. Collection failure is not a JSON validation or merge-check failure: PR #7 and its main merge passed Pilot checks.

Attempt 2 used 1 general YouTube unit and 2 search requests, zero playlist writes, $0 paid services. Known cumulative usage across OAuth preflight plus evidence attempts 1 and 2: 3 general units, 4 searches. The metadata/search requests were unnecessarily repeated by the recovery implementation. No further retry has been queued.

## Fix

Cache successful public YouTube metadata/search responses by UTC date, endpoint and full request parameters. Restore and save that cache alongside MusicBrainz cache. Same-day, same-query recovery reuses results without spending more quota. Changes in queried IDs or date invalidate the entry. The first run of this new code has no prior YouTube cache, so can still spend up to 1 general unit and 2 searches; later same-day recovery avoids repeating successes.

Add the exact failed lookup, pending recording IDs and a visible Actions job summary. Partial provider failure continues to exit unsuccessfully: never make an incomplete collection look complete or permit dependent playlist execution.

Validation: 18 no-network tests pass, including a two-run regression proving zero YouTube requests on resumed identical queries after MusicBrainz failure. Workflow YAML/cache path structure checked. Live validation of this fix remains pending merge and an explicitly approved main run.

Owner playback for Benda remains unconfirmed in the evidence inspected here. Previous eight-video playback is retained. No approved manifest, playlist write, public publication or bulk ingestion is enabled by this fix.
