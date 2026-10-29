# Private pilot review checkpoint — October 29, 2026

## Decision

**NO-GO for playlist execution, public release, or bulk ingestion.** This is a resumable preparation checkpoint, not M1 acceptance. Do not create `approved-tracks.json` from these records automatically.

PRs #2 and #3 are both merged. Current main at inspection: `161a47510aef9d5619c2f3bd27f4d16ff7d871eb`; no open PRs. The repository tree contains no AGENTS.md or other repository agent instruction file. README, M1-PILOT and OAUTH-BROWSER-SETUP were read on main.

## What is verified

- Eight intended performer source records remain; two database identity crosschecks (CID and ACRAZE) are inherited from #3, not newly reverified here. Six crosslinks remain unresolved. Exact candidate MBIDs and original evidence remain in `pilot/identity-review.json`.
- All 41 rows received an explicit triage disposition and duplicate-review status. Fifteen now have source-supported release artist credits; three have track-specific original-version source URLs. **Zero canonical recording MBIDs or ISRCs are verified.** Candidate IDs and source URLs are not substitutes for canonical recording IDs.
- Five exact video links were obtained directly from UKF's artist page. Together with six inherited search candidates, there are eleven candidates covering seven artists. Benda has no verified video match. No destination was successfully played; source linking, owner approval and playback remain separate.
- All 15 no-network tests passed, including bounded failure/cache/recovery tests. Latest inspected Actions runs show checks succeeding on main, but no post-#2 live research run. Run 40946898441 remains evidence only for the original commit.

## Source findings and remaining evidence work

The ARTS release distinguishes the original Warehouse Memories from its Emmanuel remix. Track URLs identify Warehouse Memories, Daydream and Shades Of Night; durations are 7:26, 7:43 and 6:14. Disco Inferno 01 lists Two Steps From Heaven (9:27) and Sad Groove (8:16). These five entries have release-level artist evidence; only the first three have individually inspected track URLs.

UKF credits Friction with A Little Sound on Weed & Wine, Technimatic with A Little Sound on Confide, and Annix with A Little Sound on Overload. Back To Back (B2B) is a song, not an excluded full B2B DJ mix.

Monstercat credits Slaughter to Sullivan King & Vastive (3:08), and Die By My Hand to Sullivan King & Vastive feat. Taylor Barber of Left To Suffer (3:12). KI/KI's Bandcamp credits Put Your Bassline jointly with Armin van Buuren. A standalone Apple song identifies Benda's Bone Breaker; do not substitute a DJ-set track labeled Mixed. Free Smoke's single date is January 17, 2020; a catalog identifier does not establish its release year.

The other 26 candidates remain held for complete credits and canonical/version evidence. No duplicate candidate title within the same pilot artist was found; recording-level deduplication cannot pass without recording identities. No new exclusion was fabricated. Preserve #3's bootleg/full-mix exclusions and held Benda flip.

MusicBrainz artist/relationship retrieval failed for KI/KI and I Hate Models; a subsequent Martin Garrix relationship request explicitly returned HTTP 429. Further MusicBrainz requests were stopped. Martin Garrix's relationship page was partially retrievable (performance-name and label relationships), but the required exact official URL crosslink was not recovered. Do not promote any of the six crosslinks from this evidence. Resume those exact IDs after rate-limit recovery, with the configured meaningful User-Agent and <=1 request/sec. Do not switch to catalog browsing against unverified artist IDs.

## Owner playback checklist

This is an **eight-link preliminary review queue**, not an approved eight-artist manifest. It covers seven artists; Benda is an explicit gap. The first six links are inherited search candidates whose uploader/version evidence still needs independent research. UKF directly links the final two, but destination metadata could not be fetched. Review can proceed while canonical research is blocked; successful listening alone does not establish a MusicBrainz identity.

| Artist | Track | YouTube Music | Evidence status |
|---|---|---|---|
| Martin Garrix | Carry You | https://music.youtube.com/watch?v=bz6taI5pDl0 | Inherited candidate; full collaboration/version pending |
| I Hate Models | Daydream | https://music.youtube.com/watch?v=U6EjUIefwiw | Original source is 7:43; video match pending |
| KI/KI | 5 Mins Of Acid | https://music.youtube.com/watch?v=wtnrLTqmUKI | Inherited candidate; edition and artist crosslink pending |
| ACRAZE | Do It To It | https://music.youtube.com/watch?v=bnA7yJkAG30 | Inherited candidate; featured credit/version pending |
| CID | Night Service Only | https://music.youtube.com/watch?v=Scc4CRVroPo | Inherited candidate; exact release identity pending |
| Vastive / Sullivan King | Slaughter | https://music.youtube.com/watch?v=Ve_LOVTzbxM | Label confirms joint credit; video match pending |
| A Little Sound | Back To Back (B2B) | https://music.youtube.com/watch?v=HYCG79PxgFc | Direct UKF link; exact destination/version pending |
| A Little Sound | Breathe | https://music.youtube.com/watch?v=Rv550gn6y8k | Direct UKF link; exact destination/version pending |

For each link, the owner need only report: (1) actually plays in YouTube Music, (2) correct song/artists/version or the discrepancy, (3) approve or reject inclusion. Include country, account tier and test date once for the batch, and flag any unavailable/age/account restrictions. Do not interpret silence as approval. Metadata research and Benda matching remain the assistant's work.

## Execution capability and OAuth

Local Python is available; 15 tests pass. No GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN or YouTube key variable names are configured in this executor. No secret values were read. The GitHub connector can read files/runs and prepare commits/PRs, but its fetch tool expressly excludes secrets endpoints; no environment-secret metadata capability or workflow-dispatch tool was discovered. A managed-environment status tool was not exposed. Therefore GitHub `youtube-pilot` credential readiness is **unknown**, not absent. Local variable absence says nothing about GitHub environment secrets.

No OAuth refresh or YouTube API call was attempted. Quota headroom is unverified. The owner can inspect setup without revealing values.

**Next browser-only owner step:** open https://github.com/johnapaz/edc-listening-room/settings/environments and select `youtube-pilot` if present. Report only whether the environment exists and whether the three required secret **names** are listed. Do not paste values. If absent, report that; subsequent setup will be given one step at a time.

## Accounting and next execution

This continuation used zero YouTube Data API calls/searches/writes, zero direct MusicBrainz API calls, zero Notion mutations and zero paid services or paid model API calls. Research used web search/page retrieval; underlying search-provider requests are not directly measurable as MusicBrainz API quota. An explicit MusicBrainz web 429 was observed. Cost incurred by this continuation: $0 paid services.

The preliminary eight-track writer estimate is 470 general units under the repository's conservative preflight (50 create + 400 inserts + 20 reads); actual headroom still must come from Cloud Console. This estimate is not authorization or quota evidence. All eight pilot artists must be covered before the intended artist-coverage goal is met.

Resume assistant research from the stored unresolved rows after MusicBrainz recovery. Finish canonical IDs and Benda video evidence before assembling the final manifest. After genuine owner approval, credential readiness, current quota evidence and PR merge, dry-run and dispatch the authorized main-only private workflow; verify exact ordered readback and then owner playback. Ranking/licensing and Notion acceptance remain separate M1 gaps. Eventual public release remains the goal.

## Evidence URLs

- https://artsrecordings.bandcamp.com/album/warehouse-memories
- https://disco-inferno.bandcamp.com/album/disco-inferno-01
- https://ukf.com/discover/artists/a-little-sound/
- https://www.monstercat.com/release/742779553713
- https://www.monstercat.com/release/742779546258
- https://kislashki.bandcamp.com/album/put-your-bassline
- https://music.apple.com/us/song/1699049290
- https://music.apple.com/us/song/1830441261
- https://musicbrainz.org/artist/3e1f2ee4-16be-4406-bf18-6173840cf2b1/relationships

## Practical fallback plan (owner follow-up)

Recommended: pursue a small, unranked listening preview while keeping M1 and bulk ingestion blocked. Use official artist/label release pages and distributor-provided track identifiers (ISRC or exact store track IDs, explicitly namespaced) when MusicBrainz is unavailable. Keep the MBID crosswalk unresolved; never relabel a store ID as a MusicBrainz ID. This changes the documented MB-first pilot contract, so implement it in a separately reviewable change before automated execution. Verify full artist credits, version, upload provenance, scope and human playback regardless of identifier provider.

Immediate fallback requiring no OAuth or code change: the owner can manually create a private YouTube Music preview from individually checked links. This is a listening aid, not an M1 pass or ordered API-readback demonstration. The assistant must finish independent source research; the owner should not have to resolve database identities.

If Benda remains unresolved, a seven-artist preview may help listening now, but must be labeled partial and cannot pass eight-artist coverage. Popularity ranking stays deferred until legitimate source metrics and licensing are available. No fabricated rankings or public release.

Owner confirms no GitHub environment exists. Browser setup begins at Settings → Environments → New environment → name `youtube-pilot` → Configure environment. Subsequent steps restrict it to main and configure owner review before adding secrets. Never enable Prevent self-review if the sole owner must both dispatch and approve.

PR #4 remains a draft research checkpoint. No merge is currently requested; merging research later would not approve tracks, authorize a playlist write, or declare M1 complete.

For explicit new-tab links, use [M1-PLAYBACK-CHECKLIST.html](M1-PLAYBACK-CHECKLIST.html) opened as an HTML file. Its external links use target="_blank" and rel="noopener noreferrer". GitHub Markdown and chat link rendering cannot reliably enforce new-tab behavior; Ctrl+click (Windows) or Cmd+click (Mac) works there.
