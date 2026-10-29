# Pilot execution checkpoint — October 29, 2026

Owner playback evidence: merge commit 86e781b5624e56fff0fd8b10fb017f55512e4574 says “All videos played and were the correct videos.” This applies to the eight-link queue in PR #4, not every video candidate, and does not establish Benda playback or database recording IDs. Do not ask the owner to repeat those eight checks.

OAuth evidence: https://github.com/johnapaz/edc-listening-room/actions/runs/40960433280
Main source: 01d541b287df226870ced29f31bf0231990805b7. The token refresh and authenticated channels.list step passed. One general unit, zero searches, zero playlist writes. Credentials were not exposed. This establishes current read access, not successful playlist-write execution.

Owner quota screenshot: general daily limit 10,000, used 0; search daily limit 100, used 0 before preflight. The preflight then spent one general unit. Verify current remaining quota before the next dispatch. Testing-mode credentials may require renewal before the November 6 goal; do not publish the OAuth app automatically.

## Read-only evidence collection

Workflow: Pilot evidence collection (read-only), on main in environment youtube-pilot. Owner dispatch and deployment review are required. Enter current remaining general/search quota. It makes at most one videos.list and two search.list calls, with no retries for YouTube and no playlist mutations. Read-only search is discovery, not catalog ingestion or approval. The two Benda queries are Bone Breaker and Poison Control.

MusicBrainz: eight exact candidate artist lookups with relationships; 41 recording searches by title and performer name, at most five results each. Unverified artist IDs are never used to browse catalogs or join recordings. At most 49 logical lookups and 147 HTTP attempts under the existing three-attempt client, with <=1 request/sec and cache reuse. Report logical lookups separately; actual MusicBrainz transport attempts are not instrumented. The first exhausted MusicBrainz error stops that provider. YouTube evidence collection still proceeds. Partial JSON and successful MusicBrainz cache are preserved. Rerunning repeats YouTube reads/searches, so recheck daily quota; no automatic retries or schedules.

Download the pilot-source-evidence artifact after execution for assistant source review. Exact recording/version selection, full credits, upload provenance and any new owner playback check remain separate. Do not turn candidate search rank into acceptance. Zero matching results is an unresolved case. No approved-tracks.json is generated.

## Status

NO-GO for playlist execution, public release and bulk ingestion until the required manifest and verification gates are satisfied. This workflow removes the evidence-retrieval execution gap; it does not relax M1 acceptance. The collection run and its results remain pending.
