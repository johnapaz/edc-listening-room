# Notion discovery library: Codex → Claude handoff

Snapshot: **2026-10-30**. Repo baseline: `main` at `3b5675a6d11cc798e379e363deb7fcccd39cedaf` (PR #17 merged). Agent: **codex**.

## Claude: requested next action

John asked for this PR so you can pick up the completed Notion/source work and **propose how the implementation plan should change**. Read this file and current main/open PRs, reconcile the Notion snapshot if accessible, then propose a bounded plan update. Do not redo first-pass song discovery for the records below. The single JSON block at the end gives all 282 captured Spotify candidates if you lack Notion access. It is a source snapshot, **not** a publisher manifest.

This PR changes **one handoff file only**. The Notion writes described here have already happened; merging this PR does not run them. No application code, workflow, pilot approval or playlist was changed. No automatic merge is requested.

## Owner decisions and intent

- Drop the headliner distinction. Apply the same collection policy to every musical act.
- Reuse existing songs. Fill coverage to **three songs per act before expanding toward five**; stop automatic collection at five, preserving earlier rows that already exceed that count. A later manual request can ask for more from a specific artist.
- Capture source-backed candidates in advance so Claude can spend its effort on YouTube matching, playable playlists and the app.
- Notion is also a **human-facing listening and festival guide**: useful navigation through artists, songs, stages, genres and appearances. It is not merely a bot cache.
- Use native Notion features. No extension, custom Notion app or new service is requested.
- John asked Claude to propose the plan update after this handoff, rather than silently bypassing the existing M1 acceptance contract.

## Completed work and verified counts

| Item | Current snapshot |
|---|---:|
| Tracks rows | **321** |
| Existing rows preserved from before this pass | **139 / 139** |
| New candidates added in this pass | **182** |
| Distinct captured Spotify track IDs | **282 / 282** |
| Artist/reference entities in Notion | **116** |
| Musical-act collection targets | **113** |
| Targets with at least three candidate rows | **106** |
| Targets with at least five candidate rows, from earlier work | **8** |
| Targets still below three | **7** |
| Existing YouTube Music links retained | **12** |
| New YouTube matches, recording MBIDs, scores or approvals | **0** |
| Genres rows | **0** |
| Performances rows | **6 pilot appearances**, not the full festival schedule |

The 116 reference entities comprise 114 billed performer entities plus two explicitly named Skull Machine members. The 113 collection targets exclude MC Dino's MC-only role and exclude the two members as independent solo-booking targets. Discovery Project is a program slot, not a catalog artist.

The five-song phase was **not started** because seven acts remain below three. Existing five-plus coverage was preserved. These are **source-candidate counts**, not counts of verified YouTube matches or accepted recordings.

### Earlier work included in this snapshot

1. The original 41 eight-artist pilot candidates were projected into Notion, retaining their review caveats and 12 known YouTube Music links.
2. The supplied [EDC Orlando 2026 Official Playlist — Insomniac](https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg) exposed 100 distinct track rows through its [public embed](https://open.spotify.com/embed/playlist/31JmJV1ZZCGX2ZmeWKI1Hg). That import added 98 rows and reused Under My Skin and What's a Girl to Do in '25. No independent full-playlist total was exposed; do not infer coverage of hidden/unavailable tracks.
3. This pass added 182 more source candidates, then created the remaining 15 lineup-entity rows so missing acts remain visible.

## How the source collection worked

- The official playlist anchors 99 target artist identities through its credited songs. Public Spotify track-page musician metadata supplied the associated artist URLs; those artist embeds supplied reusable top-track candidates.
- Seven further artist profiles were sourced separately: ChaseWest, Gabss, Holy Priest, M81!, Maddix, Monoky and Ravenscoon. Organizer/artist/label evidence was checked for identity context. Their profile URLs are retained on Notion artist rows; identity confidence was not promoted to human approval.
- In total, 106 target profiles supplied 1,056 displayed track rows for local selection. Unselected source rows were not imported. No audio previews, audio files, artwork, popularity metrics, OAuth credentials or private account data were collected.
- Candidate selection proceeded in coverage passes to one, two, then three. Existing candidates counted. The local selection comparison normalized case, accents and apostrophes and avoided filling slots with alternate mixes of the same song. The full source title and Spotify ID were preserved.
- Cross-artist collaborations reuse one track row and relate explicitly credited lineup artists. Full source credit text preserves non-lineup collaborators without making them festival bookings.
- No new MusicBrainz or YouTube request, playlist mutation, workflow dispatch, paid service or paid LLM call was made. Public metadata page reads and Notion writes were used.
- Source capture deliberately does **less work** than exact recording reconciliation and playback verification. This is the reason it was faster; it is not evidence that discovery is fully verified or that one agent is inherently faster.

### Quality and reuse boundaries

- Upsert captured Spotify rows by **Spotify Track ID**, never by a title alone. Retain original pilot keys when present; use existing repo recording/video evidence before searching again.
- Different Spotify IDs can still denote equivalent releases. The snapshot has no duplicate Spotify IDs; it does not establish a complete recording-level deduplication.
- Spotify artist/track existence or playlist membership does not establish YouTube Music playback, exact version equivalence, legal identity, popularity ranking, setlist inclusion or publishing approval.
- Keep source-captured, YouTube-matched, playback-confirmed and inclusion-approved states separate.
- Do not require another MusicBrainz search merely to preserve or read an already sourced candidate. Resolve recording ambiguity when it affects the intended listening choice.
- Neither the original Spotify playlist order nor an artist's displayed top-track order is our licensed Discovery Score.
- Preserve B2B identities, MC roles, named project members and source-conflict flags. Do not silently treat member solo catalogs as a joint project's catalog.
- JSON rows below are snapshot facts and links, not an open-data license or authorization to expose a public API. Field-level publication eligibility and existing release gates still need their own review.

## Seven gaps: keep them explicit

| Act | Current issue | Useful next step |
|---|---|---|
| Alves | Organizer describes Victor Alves, a US/Miami house DJ; search also finds a different Portuguese techno artist | Obtain a primary artist/catalog crosslink; do not choose the namesake by name alone |
| Fury | Correct performer is Stephen/Steve Blakley, US drum-and-bass DJ; eligible standalone releases were not established in this pass | Search the correct artist/label releases; do not substitute hardstyle FURY, WE ARE FURY, or full DJ mixes |
| Inbal | Correct organizer identity is Inbal Lankry; a standalone song catalog was not established | Document a DJ/catalog exception if no qualifying releases exist; avoid unrelated INBAL singers |
| MADVKTM | Joint project of MAD DUBZ and VKTM; HANDS UP is already identified under member credits | Define festival-discovery association separately from recording credits; joint track: Spotify `0GtRKN7450m543ES4tBwbG` |
| Matthias | Organizer describes an Orlando techno DJ; several Spotify namesakes exist | Obtain a primary catalog link for that performer |
| Skull Machine | Joint project Black Tiger Sex Machine x Kai Wachi; Save Me is already captured under member credits | Add an explicit project-discovery association for qualifying joint releases; do not inherit complete solo catalogs |
| Ultrathem | Correct Miami/Internet Friends DJ identified; primary examples located were full DJ sets | Find an eligible standalone release or document a catalog exception; do not fill with mixes |

Sources: [Alves](https://www.insomniac.com/music/artists/alves/), [Fury](https://www.insomniac.com/music/artists/fury/), [Inbal](https://www.insomniac.com/music/artists/inbal/), [Matthias](https://www.insomniac.com/music/artists/matthias/), [Ultrathem](https://www.insomniac.com/music/artists/ultrathem/), [MADVKTM joint-release context](https://relentlessbeats.com/2026/03/madvktms-first-official-collab-hands-up/), [HANDS UP release/label credit](https://music.apple.com/us/album/hands-up-single/1879921647), and the existing [project-membership reference](../data/edco-2026/artists.json).

No claim is made that an act has no catalog: these are the unresolved gaps in this bounded pass. Propose a clear rule for non-producing DJs and joint projects before resuming the five-song phase; do not quietly exempt them.

## Notion: where to find and reuse the work

[Listening Room](https://app.notion.com/p/4080e646ca0d814287d0c3579187c102) · [Artists](https://app.notion.com/p/d6bfac9fc10c4375a596989e533d0830) · [Tracks](https://app.notion.com/p/21ef5883a05345f997eaead4d1cc33e4) · [Operations](https://app.notion.com/p/4080e646ca0d81459be6dc4f33f5eb92)

| Source/view | Exact identifier |
|---|---|
| Tracks data source | `collection://42764bba-08f8-4144-ade1-a3659c9f6671` |
| Artists data source | `collection://34b21efc-caf1-48af-8602-86ead44e8cce` |
| Genres data source | `collection://a449c113-f9c8-4587-93e5-a7338934bff1` |
| Performances data source | `collection://6ac6e7c1-c2f9-4044-b860-12b9b006093d` |
| Official Spotify Seed: 100 source rows | `view://4090e646-ca0d-815e-8bb2-000c22c2c533` |
| New Discovery Candidates: 182 new rows | `view://4090e646-ca0d-8188-848d-000ca94498e0` |
| Browse Artists: compact gallery | `view://4090e646-ca0d-814d-8a91-000c1b39de58` |
| Listen & Discover: listening links only | `view://4090e646-ca0d-8137-a611-000cf004deb8` |
| Discovery Gaps: seven-act snapshot | `view://4090e646-ca0d-810a-a226-000cac9065ce` |

Fetch current schemas before writing. Prefer saved-view reads and paginate: the new source view returns 100 then 82 rows. The gap view is a **snapshot filter on seven Artist IDs**, not a dynamic less-than-three query. Native rollup-filter creation was unavailable through this connector; no custom workaround was installed.

Tracks fields added across these sessions: Spotify Track ID, Spotify URL, Spotify Artist Credit, Spotify Source Playlist, Spotify Playlist Position, Spotify Duration ms, Spotify Snapshot Date, Collection Status; and in this pass Discovery Source URL, Discovery Pass, Discovery Batch. This pass's batch is `2026-10-30-three-before-five`.

Artist additions: Artist ID (stable repo key), Spotify Artist URL, Discovery Notes and Candidate Song Count, a native rollup of related Tracks titles using Notion's count function. It counts **rows**, not verified/unique compositions. The connector can expose rollup-result references rather than evaluated numbers; coverage verification here counted actual track relations independently.

The Source Playlist and Playlist Position fields are populated only for actual playlist-derived rows. New artist-profile rows use Discovery Source URL and do not pretend to come from the official playlist.

## Native Notion review and recommendations

Observed: all seven databases already exist, but Genres is empty, Performances has only six pilot appearances, no relational Stages database exists, and the default Tracks table exposes roughly 30 fields. The existing Explore Genres gallery has no records to show. Artist page bodies currently lead into source/review notes. Data relationships are useful; the browsing experience is still incomplete.

Small, reversible improvements **already made**: Browse Artists gallery, Listen & Discover list, the source/gap work views above, candidate-count rollup, artist Spotify links and a home-page correction with a direct official Spotify listening link. No custom app, extension, new automation or paid Notion feature was added.

Recommended next work for Claude's proposal:

| Priority | Experience | Native Notion approach | Data/prerequisite |
|---|---|---|---|
| 1 | A front door that feels like a music guide | Home page with short sections: Listen, Browse Artists, My Shortlist, Festival Days, Explore Genres; embed linked views of existing databases | Reuse the same records; keep collection/approval tables in Operations |
| 1 | Useful artist pages | Native artist-page template: day/genre/listening links first; a filtered linked song view and appearances below; detailed provenance in a toggle or lower section | Do not duplicate song records inside pages; preserve stable keys |
| 1 | Find something to hear quickly | Narrow listening views with song, artist and Spotify/YouTube links; side peek lets the list stay visible | Do not force technical scoring or approval fields into the listening flow |
| 1 | A personal listening journey | Native Heard / Save for later fields and Want to see shortlist views; simple checkboxes or selects, not a new app | Personal notes belong in a private preference area if the guide is later published; filters alone are not access control |
| 2 | Browse festival days | Populate the existing Performances database from the 108-row reference and use the existing Festival Days board | Preserve three Friday source-conflict rows; times/stages remain TBA |
| 2 | Browse stages | Five native stage pages/records with a relation to Performances, eventually stage-specific linked views | The reference has stage names/map, but no verified artist-stage assignments; do not guess from genre |
| 2 | Explore genres meaningfully | Populate the existing Genres database with sourced descriptions and artist relations, then use its existing gallery | Artist styles and per-song genres are distinct; do not assign every song all of its artist's genres |
| 2 | Add a song or request more | A simple native New Song/Request entry with artist, source URL and note, plus a collection queue | Accept Spotify/artist/label links; no separate search/upload application is needed |
| 3 | Polished visual browsing | Permitted artist imagery and consistent page icons/covers; compact gallery properties | Do not let artwork sourcing delay playable playlists or populate every page with a heavy embed |

These are recommendations, not completed features. Native page templates and all 108 performance records still need work. Start with a few finished artist pages to validate navigation before repeating a template across the roster. Keep Spotify source data and user-facing navigation useful even before the ranking system is finished.

Notion references: [galleries](https://www.notion.com/help/galleries), [views, filters, groups and page peek](https://www.notion.com/help/views-filters-and-sorts), [relations and rollups](https://www.notion.com/help/relations-and-rollups), [database templates](https://www.notion.com/help/database-templates).

## Suggestions for the implementation-plan revision

1. **Separate source capture from playback delivery.** Accept source-backed candidate records without an exact MBID. Give Claude the already-captured queue for matching; reserve exact recording/version research for consequential ambiguity.
2. **Define discovery selection separately from strict ranking.** Equal per-act coverage is a discovery rule. It is not the strict Top 100, a popularity score or a finished genre Top 20.
3. **Write the equal-act policy explicitly.** Three before five, existing candidates count, no headliner tier, no automatic additions beyond five. Maintain separate captured/matched/playback counts. Propose how blocked catalogs, joint projects, same-song versions and collaborations count.
4. **Reconcile Notion and the repo once.** Notion is ahead of README and the older handoff's projection counts. Reuse row IDs and Spotify keys, merge with preserved repo evidence, and propose one maintained collection/checkpoint workflow. Do not create competing bidirectional writers or redo all discovery.
5. **Bound the YouTube work.** Plan searches/matching and inserts as separate, resumable, budgeted batches. Spend queries on missing video IDs and use known-ID metadata batches when appropriate. Retain existing protected-main/owner workflow and quota checks.
6. **Preserve the existing preview.** Current main's latest dated preview update records owner playback and 12 approved rows; the last committed readback is still 11 tracks, with Poison Control appended to the manifest. Read current main/run evidence before deciding whether anything remains to publish. Do not recreate the playlist.
7. **Propose an achievable discovery-release milestone.** The old M1 contract combines recording review, licensed scoring, projection validation and playlists. Specify which checks genuinely block the bounded discovery release and which can be later catalog/ranking work; do not silently declare M1 passed or public publication approved.
8. **Treat Notion navigation as product work.** Include source-backed genres, full appearance relations and useful artist/song views in the roadmap. Public API stretch goal remains [#16](https://github.com/johnapaz/edc-listening-room/issues/16); the same stable music/appearance records should support the eventual Companion.

## Validation and boundaries

- Notion saved-view readback: all 182 new Spotify IDs unique; titles, source URLs, durations and owner-artist relations match the selected source rows.
- Complete Tracks readback: 321 rows, 282 unique nonempty Spotify IDs; all original 139 row URLs preserved.
- Complete Artists readback: 116 entities; track relations independently verify 106 of 113 targets at three-plus, with exactly seven gaps.
- Discovery Gaps view returns exactly seven rows, no further pagination.
- Existing 12 YouTube Music links retained; no new row has a YouTube link, recording MBID or Discovery Score.
- No app/code/workflow change is in this PR. No new test suite was written for these reversible data/document changes. Existing publisher inputs, approvals, $0 ceiling and publication gates remain intact.

## Coverage by act

Candidate row counts after the pass; not verified playback counts. Project/MC exceptions are discussed above. Existing rows above five were preserved.

| Act | Stable ID | Captured candidates |
|---|---|---:|
| A Little Sound | `artist:a-little-sound` | 6 |
| Aaron Hibell | `artist:aaron-hibell` | 3 |
| AAT | `artist:aat` | 3 |
| ACRAZE | `artist:acraze` | 6 |
| Adrián Mills | `artist:adrian-mills` | 3 |
| Adventure Club | `artist:adventure-club` | 3 |
| Afrojack | `artist:afrojack` | 3 |
| Alan Walker | `artist:alan-walker` | 3 |
| Alesso | `artist:alesso` | 3 |
| Alison Wonderland | `artist:alison-wonderland` | 3 |
| ALLEYCVT | `artist:alleycvt` | 3 |
| Alok | `artist:alok` | 4 |
| Alves | `artist:alves` | 0 |
| AR/CO | `artist:ar-co` | 3 |
| ATLiens | `artist:atliens` | 3 |
| AVELLO | `artist:avello` | 3 |
| AYYBO | `artist:ayybo` | 3 |
| Azzecca | `artist:azzecca` | 3 |
| Benda | `artist:benda` | 6 |
| Big Florida | `artist:big-florida` | 3 |
| Boogie T | `artist:boogie-t` | 3 |
| Bou | `artist:bou` | 3 |
| Boys Noize | `artist:boys-noize` | 3 |
| Brunello | `artist:brunello` | 3 |
| Brutalismus 3000 | `artist:brutalismus-3000` | 3 |
| Bullet Tooth | `artist:bullet-tooth` | 3 |
| ChaseWest | `artist:chasewest` | 3 |
| Chef Boyarbeatz | `artist:chef-boyarbeatz` | 3 |
| Chris Lorenzo | `artist:chris-lorenzo` | 3 |
| CID | `artist:cid` | 6 |
| CØNTRA | `artist:contra` | 3 |
| David Guetta | `artist:david-guetta` | 4 |
| Dennis Cruz | `artist:dennis-cruz` | 3 |
| Deorro | `artist:deorro` | 3 |
| Devault | `artist:devault` | 3 |
| Discip | `artist:discip` | 3 |
| Disco Lines | `artist:disco-lines` | 4 |
| DJ Diesel | `artist:dj-diesel` | 3 |
| ESSE | `artist:esse` | 3 |
| Fallon | `artist:fallon` | 3 |
| Franky Rizardo | `artist:franky-rizardo` | 3 |
| Fury | `artist:fury` | 0 |
| Gabss | `artist:gabss` | 3 |
| Greg 99 | `artist:greg-99` | 3 |
| Hardwell | `artist:hardwell` | 3 |
| HAYLA | `artist:hayla` | 3 |
| Holy Priest | `artist:holy-priest` | 3 |
| I Hate Models | `artist:i-hate-models` | 6 |
| Ian Asher | `artist:ian-asher` | 3 |
| IDEMI | `artist:idemi` | 3 |
| Inbal | `artist:inbal` | 0 |
| Interplanetary Criminal | `artist:interplanetary-criminal` | 3 |
| Jessica Audiffred | `artist:jessica-audiffred` | 3 |
| Jkyl & Hyde | `artist:jkyl-hyde` | 3 |
| JOA | `artist:joa` | 3 |
| Josh Baker | `artist:josh-baker` | 3 |
| Joshwa | `artist:joshwa` | 3 |
| Kaivon | `artist:kaivon` | 3 |
| Kanine | `artist:kanine` | 3 |
| Kaskade | `artist:kaskade` | 3 |
| KI/KI | `artist:ki-ki` | 6 |
| KinAhau | `artist:kinahau` | 3 |
| Klangkuenstler | `artist:klangkuenstler` | 3 |
| Know Good | `artist:know-good` | 3 |
| Kompany | `artist:kompany` | 3 |
| KREAM | `artist:kream` | 3 |
| LAYZ | `artist:layz` | 3 |
| Level Up | `artist:level-up` | 3 |
| Levity | `artist:levity` | 3 |
| Luke Dean | `artist:luke-dean` | 4 |
| M81! | `artist:m81` | 3 |
| Maddix | `artist:maddix` | 3 |
| MADVKTM | `artist:madvktm` | 0 |
| Mai Iachetti | `artist:mai-iachetti` | 3 |
| MALUGI | `artist:malugi` | 3 |
| Marlon Hoffstadt | `artist:marlon-hoffstadt` | 3 |
| Martin Garrix | `artist:martin-garrix` | 6 |
| Matthias | `artist:matthias` | 0 |
| Mau P | `artist:mau-p` | 3 |
| Max Dean | `artist:max-dean` | 3 |
| Me n ü | `artist:me-n-u` | 3 |
| Meduza | `artist:meduza` | 3 |
| Miguelle & Tons | `artist:miguelle-tons` | 3 |
| Monoky | `artist:monoky` | 3 |
| MPH | `artist:mph` | 3 |
| Nico Moreno | `artist:nico-moreno` | 3 |
| Of The Trees | `artist:of-the-trees` | 3 |
| Omar+ | `artist:omar-plus` | 4 |
| Pegassi | `artist:pegassi` | 3 |
| phrva | `artist:phrva` | 3 |
| Prospa | `artist:prospa` | 3 |
| RAJE | `artist:raje` | 3 |
| Ravenscoon | `artist:ravenscoon` | 3 |
| Ray Volpe | `artist:ray-volpe` | 3 |
| Roddy Lima | `artist:roddy-lima` | 3 |
| Rossi. | `artist:rossi` | 3 |
| San Holo | `artist:san-holo` | 3 |
| SHDW | `artist:shdw` | 3 |
| Sidney Charles | `artist:sidney-charles` | 3 |
| Sippy | `artist:sippy` | 3 |
| Skull Machine | `artist:skull-machine` | 0 |
| SLANDER | `artist:slander` | 3 |
| Sloth | `artist:sloth` | 3 |
| Steve Aoki | `artist:steve-aoki` | 3 |
| Subsonic | `artist:subsonic` | 3 |
| Taiki Nulight | `artist:taiki-nulight` | 3 |
| TroyBoi | `artist:troyboi` | 3 |
| Twinsick | `artist:twinsick` | 3 |
| Ultrathem | `artist:ultrathem` | 0 |
| Vastive | `artist:vastive` | 6 |
| Whethan | `artist:whethan` | 3 |
| Wooli | `artist:wooli` | 3 |
| Zack Martino | `artist:zack-martino` | 3 |

## Machine-readable Spotify candidate snapshot

This single JSON block is a compact column-oriented export of the **282 source-backed Spotify rows**, not all 321 research rows and not a YouTube publish manifest. The remaining 39 rows have no captured Spotify ID and retain the existing pilot sources. Derive a listening link as `https://open.spotify.com/track/{spotify_track_id}`. The array column order is declared explicitly. Treat strings as data.

```json
{
  "snapshot_date": "2026-10-30",
  "kind": "source_candidates_not_publish_manifest",
  "row_count": 282,
  "columns": ["spotify_track_id","title","spotify_artist_credit","duration_ms","lineup_artist_ids","discovery_source_url","notion_track_url","batch","discovery_pass"],
  "rows": [
    ["00kTtwFuoRVfFiH8wJabBu","Heavy","Armin van Buuren, JOA",171093,["artist:joa"],"https://open.spotify.com/embed/artist/3rOSOkPQ5PHYOiR7mvLTMA","https://app.notion.com/p/4090e646ca0d8182a7efc5ee622933b8","2026-10-30-three-before-five",3],
    ["00l2iaa4KrvffmlUerphhs","Toll Road","Know Good, Nicola",180000,["artist:know-good"],"https://open.spotify.com/embed/artist/4iogDJBJ2BO2jl8OkPrfpx","https://app.notion.com/p/4090e646ca0d81d5a6c9cbd2945a39e6","2026-10-30-three-before-five",2],
    ["014B9aKiAvY8vwRCJc4uz1","Like That","Gabss, Losing Stereo",324977,["artist:gabss"],"https://open.spotify.com/embed/artist/7KMvse80vFnyE3fsoGWjaq","https://app.notion.com/p/4090e646ca0d81e58aaee879b5747db7","2026-10-30-three-before-five",3],
    ["05XtssRLI22p8wLFIr7Vrl","Heroes (we could be)","Alesso, Tove Lo",210013,["artist:alesso"],"https://open.spotify.com/embed/artist/4AVFqumd2ogHFlRbKIjp1t","https://app.notion.com/p/4090e646ca0d81919830d72d1b3d72e9","2026-10-30-three-before-five",2],
    ["06DkHLbgIlfPGxe6YDS3Ph","High Class","ChaseWest",212558,["artist:chasewest"],"https://open.spotify.com/embed/artist/4770WxUOyJMOJ1CHiZi2d6","https://app.notion.com/p/4090e646ca0d81538809ed205690498e","2026-10-30-three-before-five",3],
    ["06PtUjF9NsdCYLaYag104S","My Place","Josh Baker, Poppy Baskcomb",159615,["artist:josh-baker"],"https://open.spotify.com/embed/artist/4zf8Awb8y1X9qwL4oiVRd6","https://app.notion.com/p/4090e646ca0d81699d33c77d53dafc80","2026-10-30-three-before-five",2],
    ["07dAUa9SSFAVAD440AWm5y","Back n Forth","Öwnboss, ESSE",172153,["artist:esse"],"https://open.spotify.com/embed/artist/4PFWrk1gURzx5KuGSSLO19","https://app.notion.com/p/4090e646ca0d81a3a7f3ffaf85bbe392","2026-10-30-three-before-five",2],
    ["08aUQAEtGYYOqcghUEuptT","BEATBOX ROCKER","ChaseWest, Dan Molinari",216000,["artist:chasewest"],"https://open.spotify.com/embed/artist/4770WxUOyJMOJ1CHiZi2d6","https://app.notion.com/p/4090e646ca0d8122b5eafeadbb18fe39","2026-10-30-three-before-five",1],
    ["0aDKvLIttZfWCA0zFjVn92","A Place You Wanna Go (Good Life)","bullet tooth",184791,["artist:bullet-tooth"],"https://open.spotify.com/embed/artist/4KWIkeAdOJfvUgXSq0bEWC","https://app.notion.com/p/4090e646ca0d819e8af1eb56063141fd","2026-10-30-three-before-five",3],
    ["0BK6ACxpzK8nkWa3YKuunX","Fancy Footwork","Chris Lorenzo, Chromeo",192195,["artist:chris-lorenzo"],"https://open.spotify.com/embed/artist/7tm9Tuc70geXOOyKhtZHIj","https://app.notion.com/p/4090e646ca0d8119aeacc7d1a3d9ac37","2026-10-30-three-before-five",2],
    ["0d2Ad8j1DftVrZENtEA0fj","Down To The Bone","Josh Baker, Eliza Rose",171964,["artist:josh-baker"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8160af87cb4b852dfde2","2026-10-30-official-playlist",null],
    ["0EqkUvEpUl24bXIQ6NVZRA","Makina Time","Dimitri Vegas & Like Mike, Marlon Hoffstadt, Dj Konik",130090,["artist:marlon-hoffstadt"],"https://open.spotify.com/embed/artist/0HHa7ZJZxUQlg5l2mB0N0f","https://app.notion.com/p/4090e646ca0d8150b53ee87c2fe2a261","2026-10-30-three-before-five",2],
    ["0F1VAVqj021UkGntiDz4nx","Feels Like You","Adventure Club, Codeko",202758,["artist:adventure-club"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81508ef2d22393c2b4fe","2026-10-30-official-playlist",null],
    ["0f3P2kbpIvGdgfvXN7rIKG","I Bring My Gun To The Function (with Boys Noize)","Brutalismus 3000, Boys Noize",190291,["artist:brutalismus-3000","artist:boys-noize"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8190b2dcf648ac1e7433","2026-10-30-official-playlist",null],
    ["0f97n6kmc8RYUwMyialr8y","Closer","Bou, Slay",135796,["artist:bou"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8160b593f0ecb8da63cf","2026-10-30-official-playlist",null],
    ["0Fj8IYC9a7dVMXq3j0wOn9","DIRTY SOUTH","Big Florida",174879,["artist:big-florida"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8165ad24d5fbd2565153","2026-10-30-official-playlist",null],
    ["0gCVfzNzYGBk95GBLQ6US4","oh my yuma!","Azzecca",223100,["artist:azzecca"],"https://open.spotify.com/embed/artist/2k5DY2QDU3kBi5DX7OQlWj","https://app.notion.com/p/4090e646ca0d81d9a324cb23d7b5d21a","2026-10-30-three-before-five",3],
    ["0GOXlShsWOp7BQ7nt9uwUL","I Don't Wanna Wait - Hardwell & Olly James Remix","David Guetta, OneRepublic, Hardwell, Olly James",183200,["artist:david-guetta","artist:hardwell"],"https://open.spotify.com/embed/artist/6BrvowZBreEkXzJQMpL174","https://app.notion.com/p/4090e646ca0d817c885ef4d5f976ebc6","2026-10-30-three-before-five",3],
    ["0HGX3Sk2Wp4ibJDyW9hvdY","Bonito","Dennis Cruz",195365,["artist:dennis-cruz"],"https://open.spotify.com/embed/artist/27mWOSZjlpmtoqsRjRwQyu","https://app.notion.com/p/4090e646ca0d814b84d0ea21e26358da","2026-10-30-three-before-five",3],
    ["0hSuV2otL5a1tl8pByCiAt","Arrival","KREAM",204285,["artist:kream"],"https://open.spotify.com/embed/artist/0DdDnziut7wOo6cAYWVZC5","https://app.notion.com/p/4090e646ca0d81c4a98ed1dcf14fd59a","2026-10-30-three-before-five",3],
    ["0I3VFPyE1agmYzWSTx4mjl","SIMPLY GROOVE - Club Mix","salameh, RAJE, FLAT 22",304761,["artist:raje"],"https://open.spotify.com/embed/artist/2dPCWh9rFrw0MyUSr3sEyQ","https://app.notion.com/p/4090e646ca0d814eb309cd402da13a8b","2026-10-30-three-before-five",2],
    ["0IoD88QDxy5GPip9IzlzyI","Certified","AYYBO",216093,["artist:ayybo"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81b19e50c4a1af02916d","2026-10-30-official-playlist",null],
    ["0K6bM8wUaxWYW5OXmnL5Wf","Sensory Session","Jkyl & Hyde",193333,["artist:jkyl-hyde"],"https://open.spotify.com/embed/artist/23AH13eC6V0NB0QCkV6206","https://app.notion.com/p/4090e646ca0d819b8b68c2f23e99acf5","2026-10-30-three-before-five",3],
    ["0L2hJdknuaFzX2SX0e6Psm","i feel lost","Aaron Hibell",147600,["artist:aaron-hibell"],"https://open.spotify.com/embed/artist/6KJPsGYJN54GllYOKTleaj","https://app.notion.com/p/4090e646ca0d81aab849fab7ec8d6719","2026-10-30-three-before-five",2],
    ["0lHAMNU8RGiIObScrsRgmP","Titanium (feat. Sia)","David Guetta, Sia",245040,["artist:david-guetta"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8143adafe8bc24711da1","2026-10-30-official-playlist",null],
    ["0NIIKZEed0nXPz4lHnMaZg","In Your Eyes","Alesso, OneRepublic",216115,["artist:alesso"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81d5978be6309aebea13","2026-10-30-official-playlist",null],
    ["0niU8VMrQzSNhrmsiLlmeS","Shinjuku","Franky Rizardo",167905,["artist:franky-rizardo"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81cdb30dd32ec7630570","2026-10-30-official-playlist",null],
    ["0nZUQdt97RJ429I0FuAO2r","Crazy For It","Rampa, Adam Port, &ME, Boys Noize, Vinson, Keinemusik",250578,["artist:boys-noize"],"https://open.spotify.com/embed/artist/62k5LKMhymqlDNo2DWOvvv","https://app.notion.com/p/4090e646ca0d813294abef62a3272632","2026-10-30-three-before-five",3],
    ["0OSKN4D9kXEunDf89augTt","FADED","HAYLA, Nelly Furtado",215649,["artist:hayla"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81a88622f7ebc168f91b","2026-10-30-official-playlist",null],
    ["0sPP9TW0xSgke7EKBW6Gui","Think of You","KETTAMA, Prospa, Rohan Pinnock-Hamilton",204884,["artist:prospa"],"https://open.spotify.com/embed/artist/6HabM2PUM519iIxervGWSb","https://app.notion.com/p/4090e646ca0d812e9d9ffac89f55a871","2026-10-30-three-before-five",3],
    ["0SWaeRdDRyljwRH2p0lwCR","Around The World (La La La)","Jessica Audiffred, SampliFire",217714,["artist:jessica-audiffred"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81dcac11f9151879d88b","2026-10-30-official-playlist",null],
    ["0tAFy8LVdMQgW6A6Nq7olS","Do You?","TroyBoi",195790,["artist:troyboi"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81749c6fc82904fd91b7","2026-10-30-official-playlist",null],
    ["0tUGYyimvKEBLd43acJivF","Pretty","Kaivon, Emilia Ali",221772,["artist:kaivon"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81feb203c9188e39b819","2026-10-30-official-playlist",null],
    ["0vHfY43h0GV1lRv5wPpbJR","Ghost Town","Dimension, Subsonic",204137,["artist:subsonic"],"https://open.spotify.com/embed/artist/4D6frglSGSAHoK7W5rp92j","https://app.notion.com/p/4090e646ca0d8119b809c8b6d2bd2d7d","2026-10-30-three-before-five",2],
    ["0vKM6pD1koHLvYzzI5gqNy","Lose Control","Omar+, bullet tooth",173357,["artist:bullet-tooth","artist:omar-plus"],"https://open.spotify.com/embed/artist/4KWIkeAdOJfvUgXSq0bEWC","https://app.notion.com/p/4090e646ca0d81029cfec1dce4ad5f22","2026-10-30-three-before-five",2],
    ["0w7JPlp7eEQI2EKW3ayXrv","Drugs From Amsterdam","Mau P",235785,["artist:mau-p"],"https://open.spotify.com/embed/artist/0w1sbtZVQoK6GzV4A4OkCv","https://app.notion.com/p/4090e646ca0d811ab2b1ec93ba952722","2026-10-30-three-before-five",3],
    ["0WZomj99qKEzipmSQIQktM","Jazz Cabbage","Wooli, Cyclops",172189,["artist:wooli"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8168b29cff0f0d076aa1","2026-10-30-official-playlist",null],
    ["0Yfb937yM0d5f6os0W9IWc","Spectral Bells","Pegassi",193907,["artist:pegassi"],"https://open.spotify.com/embed/artist/2A4uiWrfuBpVFugyvxAt4c","https://app.notion.com/p/4090e646ca0d8156a3a3fb46ef308b61","2026-10-30-three-before-five",3],
    ["0YQLxSWruiFJJ42lexKQGU","Surge","Kompany, Kryture",279724,["artist:kompany"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81ab994efd95d62c97ba","2026-10-30-official-playlist",null],
    ["0ZZWyT8ppn9PxVe17WX2DR","Reflections","IDEMI",187272,["artist:idemi"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81169d9df258770197a9","2026-10-30-official-playlist",null],
    ["10pfamFYvg5ftwq6rGJrWx","Can't Decide","Max Dean, Luke Dean, Locky",175384,["artist:max-dean","artist:luke-dean"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81dea51fdad97e1a09a5","2026-10-30-official-playlist",null],
    ["19hfnO9fYQ5Dq4ZTSvfW24","Perfect on Paper","TWINSICK, EVAN GIIA",157008,["artist:twinsick"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d812f9956ee45fc6b6e30","2026-10-30-official-playlist",null],
    ["19PBU0nWYBOMzHOAxDBEcg","Loaded Gun","CID",194883,["artist:cid"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d815bb345fa6a53cb5eed","2026-10-30-official-playlist",null],
    ["1A0yrRs7GAe1gbCklYE6wl","Green Light","JOA",187384,["artist:joa"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81c2aaaedaa58caf0056","2026-10-30-official-playlist",null],
    ["1aBVDx9VjyLEk8rz8pezru","Gets Like That","Max Dean, Luke Dean",169846,["artist:luke-dean","artist:max-dean"],"https://open.spotify.com/embed/artist/65TLDWbTJxYASqadmNAxvc","https://app.notion.com/p/4090e646ca0d819bb094f26ef8722f9a","2026-10-30-three-before-five",2],
    ["1AVZ3Q3OwCYWoKtbeW0lGu","Los Angeles Freestyle","KinAhau, Cole Terrazas",234265,["artist:kinahau"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d815d8ea5ea1060a854f3","2026-10-30-official-playlist",null],
    ["1CXLQhz0ii0IPCND6jMJXy","STEPPIN","Boogie T, Dodge & Fuski",137142,["artist:boogie-t"],"https://open.spotify.com/embed/artist/4zlw0jXUzd4dRcqI3Y1OiY","https://app.notion.com/p/4090e646ca0d81699c6de17420c25152","2026-10-30-three-before-five",2],
    ["1eMUGMEWrvTXYWrPobq2dH","Heute Nacht","Maddix",204444,["artist:maddix"],"https://open.spotify.com/embed/artist/0RMeG9M8QFzss9bAbq99KA","https://app.notion.com/p/4090e646ca0d81f39a69dbbd561a0902","2026-10-30-three-before-five",3],
    ["1gBq6c3TwyUK9gjsySA07T","Override","A Little Sound",173211,["artist:a-little-sound"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81a79aa1ed0e66035e2f","2026-10-30-official-playlist",null],
    ["1gV0hgMNdpSWeW7ZjSUKnX","Afterhours feat. Diplo & Nina Sky","TroyBoi, Diplo, Nina Sky",275604,["artist:troyboi"],"https://open.spotify.com/embed/artist/0tvpihdAsKiNnP6sWS3jUI","https://app.notion.com/p/4090e646ca0d81d99ae1c3b88cf30296","2026-10-30-three-before-five",3],
    ["1HBiN4vgEq75YD0HFvhM7F","Analog Ascent","Vintage Culture, Roddy Lima",197460,["artist:roddy-lima"],"https://open.spotify.com/embed/artist/0Bg1joLOL52mJS0kf0pIDx","https://app.notion.com/p/4090e646ca0d8136ae33ee3f0136d7b1","2026-10-30-three-before-five",2],
    ["1k8Tw09RkFSTRyYmsmZ62L","NO FEAR","DJ DIESEL, Jessica Audiffred, Shaquille O'Neal",174400,["artist:dj-diesel","artist:jessica-audiffred"],"https://open.spotify.com/embed/artist/75vCyksqhYjtt5VIpc8g7u","https://app.notion.com/p/4090e646ca0d8120a181ff7bc2590330","2026-10-30-three-before-five",3],
    ["1LOjIBinbAVfmVqqELvgLh","ELECTRIC LOVE","AVELLO, HXRT",164307,["artist:avello"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d818da86cd87a07ae8cda","2026-10-30-official-playlist",null],
    ["1lWiQ34sGK1i862zAFiRNW","Forever 2 (Crush Mix) - Malugi Remix","Confidence Man, DJ BORING, MALUGI",177580,["artist:malugi"],"https://open.spotify.com/embed/artist/50udUOTR7dQUgyPwPuCLM6","https://app.notion.com/p/4090e646ca0d81f9bcd4efb306fc1a48","2026-10-30-three-before-five",3],
    ["1NSWEN2D4tSseirwne0bhD","Counting - Taiki Nulight Remix","Hamdi, Princess Superstar, Taiki Nulight",186338,["artist:taiki-nulight"],"https://open.spotify.com/embed/artist/4QWmN97HRZya55JvxN3I5a","https://app.notion.com/p/4090e646ca0d8198a03bffa8b8d8ad55","2026-10-30-three-before-five",3],
    ["1PqolJAHpk7lJH4jXu9ANN","All I Need","Subsonic",220689,["artist:subsonic"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8134ad3fc0138e8fce34","2026-10-30-official-playlist",null],
    ["1rpdapoYtP0nk1zK01FZT9","Work","Gabss",206769,["artist:gabss"],"https://open.spotify.com/embed/artist/7KMvse80vFnyE3fsoGWjaq","https://app.notion.com/p/4090e646ca0d81029b4cf6cbb00c46be","2026-10-30-three-before-five",2],
    ["1SAv0E7nYW6hnP13HRWIFF","Cruise Control","Chef Boyarbeatz",246190,["artist:chef-boyarbeatz"],"https://open.spotify.com/embed/artist/7nSk3iFPogRCOokrMliejt","https://app.notion.com/p/4090e646ca0d81a7886ad979c671140d","2026-10-30-three-before-five",3],
    ["1Siu5Bnrt90vtjUddXeTUg","Slow Burner","Interplanetary Criminal, Original Koffee",212647,["artist:interplanetary-criminal"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81b78083f59af996d064","2026-10-30-official-playlist",null],
    ["1t0HDXFC1yeCKKxWfbZ5Go","Silence","MEDUZA, RANI",179076,["artist:meduza"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81fd814fd36a1710d966","2026-10-30-official-playlist",null],
    ["1t2ESRg2lCWUSAU45DPSkL","Work It","ESSE",182812,["artist:esse"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8161b8ecf0afacdaa045","2026-10-30-official-playlist",null],
    ["1T4zdIuNLgCqGVk4jHDIVl","SONG REQUEST","Ray Volpe",204923,["artist:ray-volpe"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81759c3df5808d4231c5","2026-10-30-official-playlist",null],
    ["1usZa84Ap85dm9WJyFBZv5","SPIRAL","ISOxo, Brutalismus 3000",178285,["artist:brutalismus-3000"],"https://open.spotify.com/embed/artist/6LtXxYMIiKSy2EGHnz1f5j","https://app.notion.com/p/4090e646ca0d81f5b2f6fd0262a4ad64","2026-10-30-three-before-five",3],
    ["1UtglVF0qRCElmVdU6bWuc","Drugs I Like (AVELLO Remix)","nate band, AVELLO",145714,["artist:avello"],"https://open.spotify.com/embed/artist/1ZR5GnPw0Jkb5M4hnBwzuZ","https://app.notion.com/p/4090e646ca0d81e7a05bc88c3f99a9e0","2026-10-30-three-before-five",3],
    ["1uyZGBnuSdTXjsvi6dKgiD","Evoke","CØNTRA, Saturna",226027,["artist:contra"],"https://open.spotify.com/embed/artist/2HhHusDoCRr9pgb30XX7q2","https://app.notion.com/p/4090e646ca0d81e1bfb6d7d8314765de","2026-10-30-three-before-five",3],
    ["1wceODcNiRPq4kwo9vh3oE","Marido Dansa","Franky Rizardo",154153,["artist:franky-rizardo"],"https://open.spotify.com/embed/artist/2UgphhGSlC9QWgaZWUOCkl","https://app.notion.com/p/4090e646ca0d81a2a60ef6194f6533bc","2026-10-30-three-before-five",3],
    ["1z1io5H0gfutwUNILCDshn","Spanish Moss","Of The Trees",158961,["artist:of-the-trees"],"https://open.spotify.com/embed/artist/5V7NIXgCnX2KuQ01Bxg20c","https://app.notion.com/p/4090e646ca0d81b1b445e55f3b4a7c12","2026-10-30-three-before-five",3],
    ["1z6pTKnrEpokcfwked9cNx","I'm Not Alone - MPH Remix","Calvin Harris, MPH",213333,["artist:mph"],"https://open.spotify.com/embed/artist/62SCu33InHVq97VaWw3eof","https://app.notion.com/p/4090e646ca0d81d19fadc67513d633aa","2026-10-30-three-before-five",2],
    ["1zmYWLvqHjxzyfXUjMftIT","True Love Never Dies","Cloonee, Fallon",219697,["artist:fallon"],"https://open.spotify.com/embed/artist/73LVVE6OYOwlXlIJAFNJdR","https://app.notion.com/p/4090e646ca0d81b1ab22e66fa764754d","2026-10-30-three-before-five",2],
    ["23Hxd8ph2vJWlXngubtyuO","Feels Like Us","Devault, GiGi Grombacher",234545,["artist:devault"],"https://open.spotify.com/embed/artist/1VBAKMui4zm5MnBWNn3NbL","https://app.notion.com/p/4090e646ca0d8155b7f1eb6f652168af","2026-10-30-three-before-five",3],
    ["248s42qe2Njb9yU99LSU88","LADIES & GENTLEMEN","KinAhau, WIFE MATERIAL",326769,["artist:kinahau"],"https://open.spotify.com/embed/artist/3C7Tv0IqIGLjA9rpVaeHRB","https://app.notion.com/p/4090e646ca0d81e0a1f1ee1dcde76b63","2026-10-30-three-before-five",3],
    ["24OeEKPQ8qqNZnPevRHxUT","Red Eye (feat. TroyBoi)","Justin Bieber, TroyBoi",187452,["artist:troyboi"],"https://open.spotify.com/embed/artist/0tvpihdAsKiNnP6sWS3jUI","https://app.notion.com/p/4090e646ca0d8177903ff24f4717f85f","2026-10-30-three-before-five",2],
    ["25KN5IFew2JifHoqx5Q7Z7","High Forever - Marlon Hoffstadt Remix","Petite Meller, Marlon Hoffstadt",229161,["artist:marlon-hoffstadt"],"https://open.spotify.com/embed/artist/0HHa7ZJZxUQlg5l2mB0N0f","https://app.notion.com/p/4090e646ca0d818b8bc7ec87abeff395","2026-10-30-three-before-five",3],
    ["26SBh3qrxSkpVqLRQkcSbU","Rave Therapy","Maddix, Bassjackers",157935,["artist:maddix"],"https://open.spotify.com/embed/artist/0RMeG9M8QFzss9bAbq99KA","https://app.notion.com/p/4090e646ca0d816491dfd94a81612440","2026-10-30-three-before-five",2],
    ["273hZiLcekoS5dDMHZn0uM","Turbulence","SHDW, Obscure Shape",272883,["artist:shdw"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d811ab3d4d70af72b5a00","2026-10-30-official-playlist",null],
    ["28neE1gtROH3fazXOamxak","Pumpin Blood","TWINSICK, NONONO",185745,["artist:twinsick"],"https://open.spotify.com/embed/artist/4WfO14YgktUYkdLMrHgTeF","https://app.notion.com/p/4090e646ca0d81a2892ddb3cb9848bb6","2026-10-30-three-before-five",2],
    ["2AJzSl2iYq7Thk2P535MwI","Diet Coke","Fallon",155624,["artist:fallon"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d811d83f0f651561434af","2026-10-30-official-playlist",null],
    ["2B6NPa5xN0ktAoEFXC7Ar9","Whatcha Do To Me","ACRAZE",262153,["artist:acraze"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d811eb8cbceef2d1afb23","2026-10-30-official-playlist",null],
    ["2dH4UWxucbsfFglVAbfNW3","levitation","Aaron Hibell, Felsmann + Tiley",168358,["artist:aaron-hibell"],"https://open.spotify.com/embed/artist/6KJPsGYJN54GllYOKTleaj","https://app.notion.com/p/4090e646ca0d813ba195dd14423df974","2026-10-30-three-before-five",3],
    ["2FFwFlkKjKBSCdVpPf38Gj","Out of My Mind","Joshwa",204737,["artist:joshwa"],"https://open.spotify.com/embed/artist/1PzAgFVk9v8cxn9flrqrv5","https://app.notion.com/p/4090e646ca0d8186a4ddc5cbfc361ecf","2026-10-30-three-before-five",2],
    ["2H43AB2EgHmUChTFL8zVZp","Get Up","Pegassi",211862,["artist:pegassi"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d811cbec1e7e2a3c70e68","2026-10-30-official-playlist",null],
    ["2HGWEdmzqykDOKbAxRd1JE","BELIEVE","ALLEYCVT, LEVEL UP",161600,["artist:alleycvt","artist:level-up"],"https://open.spotify.com/embed/artist/1ZpDxqXS6HAvoZyCzQfKRb","https://app.notion.com/p/4090e646ca0d813780aafc198cfe0201","2026-10-30-three-before-five",2],
    ["2MsgPJQZMfAoDyXAfqqPZs","I Feel It","Kaivon",166400,["artist:kaivon"],"https://open.spotify.com/embed/artist/55FVjkpZs1zuo3zqBgrKtC","https://app.notion.com/p/4090e646ca0d816ea10ad17e8ec41d47","2026-10-30-three-before-five",3],
    ["2N6EnehmF6MOH2fgnQB73d","Nuclear Bass Face (feat. Boogie T)","NGHTMRE, Subtronics, Boogie T",195200,["artist:boogie-t"],"https://open.spotify.com/embed/artist/4zlw0jXUzd4dRcqI3Y1OiY","https://app.notion.com/p/4090e646ca0d81a6a110fda3a53bef99","2026-10-30-three-before-five",3],
    ["2nbye27S8Nv1JSrmxl1Ycf","Slipping Away","Levity, K.Flay",259459,["artist:levity"],"https://open.spotify.com/embed/artist/1PbO7aQiVeKbGp8GYWDL9C","https://app.notion.com/p/4090e646ca0d81da9427ee94aaaaf4b8","2026-10-30-three-before-five",3],
    ["2nWw7VrUn8Ijo45K6WIIna","Vielleicht Vielleicht - Holy Priest & elMefti Remix","MilleniumKid, JBS, HOLY PRIEST, elMefti",169818,["artist:holy-priest"],"https://open.spotify.com/embed/artist/5UG2ipdnA4vk8Eevkf1s06","https://app.notion.com/p/4090e646ca0d815a882ad4c5e1a1b7a0","2026-10-30-three-before-five",1],
    ["2obGMUH9QL8cgyj6bBM58h","ZIPLOCK","Roddy Lima",210053,["artist:roddy-lima"],"https://open.spotify.com/embed/artist/0Bg1joLOL52mJS0kf0pIDx","https://app.notion.com/p/4090e646ca0d8189bfc1f5fdc0e69e08","2026-10-30-three-before-five",3],
    ["2RkSAfwkNF4BnW8407DGRw","Chase The Sunlight","TWINSICK, Saint Raymond",168347,["artist:twinsick"],"https://open.spotify.com/embed/artist/4WfO14YgktUYkdLMrHgTeF","https://app.notion.com/p/4090e646ca0d814e85c0cf2ba70ffde0","2026-10-30-three-before-five",3],
    ["2rkUhGw5iWbBY1PE5AnCl8","Way Too Self Aware","Ian Asher",156207,["artist:ian-asher"],"https://open.spotify.com/embed/artist/5IrxhrMyvZxzgPYrC9j2km","https://app.notion.com/p/4090e646ca0d81c8bdcfc294e1aba644","2026-10-30-three-before-five",2],
    ["2s9Ozz6HLs785JrqpRgzVU","Bones","Mai iachetti",236205,["artist:mai-iachetti"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d812883c8d263b0f284db","2026-10-30-official-playlist",null],
    ["2szlu9y9Q1S0UWcolBtyNJ","Twisted","LAYZ, Kozmoz",206400,["artist:layz"],"https://open.spotify.com/embed/artist/2ozQcs5XxFaj5fvA02zhwo","https://app.notion.com/p/4090e646ca0d81e8b6d1d38fbda2511b","2026-10-30-three-before-five",2],
    ["2tlulSZdCgI5zQFQKmbjma","Out Of My Mind","Omar+, Ben Sterling",177230,["artist:omar-plus"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8145bf7bf3fc16dd29e5","2026-10-30-official-playlist",null],
    ["2unqiEdHtabnsbv6TJ7gCW","Lose Control","MEDUZA, Becky Hill, Goodboys",168387,["artist:meduza"],"https://open.spotify.com/embed/artist/0xRXCcSX89eobfrshSVdyu","https://app.notion.com/p/4090e646ca0d81dcaee5f4ea86951797","2026-10-30-three-before-five",2],
    ["2XXOFINEkzVaszziVzRQj2","Fotopaparazzi","Steve Aoki, Jessica Audiffred, Jon Z",140770,["artist:steve-aoki","artist:jessica-audiffred"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d813ca0dcf5582063841c","2026-10-30-official-playlist",null],
    ["2YVizOAT1yNq7Say1AhrJR","FVKVRVND","Boys Noize",268732,["artist:boys-noize"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8151af06cd0653dc86f3","2026-10-30-official-playlist",null],
    ["2ZWmmrWUgDBcPSLihBMvhg","Baddadan (feat. IRAH, Flowdan, Trigga & Takura)","Chase & Status, Bou, Flowdan, IRAH, Trigga, Takura",177291,["artist:bou"],"https://open.spotify.com/embed/artist/35dxfY1wywqVRUEaVuMm13","https://app.notion.com/p/4090e646ca0d81db973cf8f1291eb498","2026-10-30-three-before-five",2],
    ["33rOFwZOk1rs9OwvHL12cF","STFU","T-Pain, DJ DIESEL, San Holo, NGHTMRE, Kompany, SampliFire, IVORY",219428,["artist:dj-diesel","artist:kompany","artist:san-holo"],"https://open.spotify.com/embed/artist/75vCyksqhYjtt5VIpc8g7u","https://app.notion.com/p/4090e646ca0d8180a13cdce81bd06f2f","2026-10-30-three-before-five",2],
    ["34cGRbu2sg9mXm8fcUWlTw","Not A Problem","Max Dean, Nafe Smallz, Luke Dean",247272,["artist:luke-dean","artist:max-dean"],"https://open.spotify.com/embed/artist/65TLDWbTJxYASqadmNAxvc","https://app.notion.com/p/4090e646ca0d8184ae0ae8e1b7956cfc","2026-10-30-three-before-five",3],
    ["35dt2bP4CcBzepyufQbvYZ","Fire Fire","Shimza, AR/CO, Kasango",150480,["artist:ar-co"],"https://open.spotify.com/embed/artist/7mGI9Sd66FqHjIkwzkgbG7","https://app.notion.com/p/4090e646ca0d81bfa081cd73e122a64f","2026-10-30-three-before-five",2],
    ["39hHUnYBmyMwprzRaPODCX","Free Your Mind","Prospa, Cloonee, Sybil",201700,["artist:prospa"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8171b93de1b402988173","2026-10-30-official-playlist",null],
    ["39JofJHEtg8I4fSyo7Imft","B.O.T.A. (Baddest Of Them All) - Edit","Eliza Rose, Interplanetary Criminal",226626,["artist:interplanetary-criminal"],"https://open.spotify.com/embed/artist/6uJ51uV5rYzu1MJkC4CceI","https://app.notion.com/p/4090e646ca0d813fb41fd474750ac773","2026-10-30-three-before-five",2],
    ["3aTOR9GP22TN2YVvmKbk8e","You Make Me Horny","Nico Moreno, Laren",294321,["artist:nico-moreno"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81b5ace5ec667567c5b2","2026-10-30-official-playlist",null],
    ["3b26vJtV7KETHKtu4sxabB","ONE FOR YOU","ALLEYCVT, Levity",152516,["artist:alleycvt","artist:levity"],"https://open.spotify.com/embed/artist/4JxRK2gxmri7L7OWaxnVD1","https://app.notion.com/p/4090e646ca0d8134aca3d01b746c0898","2026-10-30-three-before-five",2],
    ["3BbD2sqk7P7Rc9V0KF9o4s","My Humps","Joshwa, Lee Foss",186124,["artist:joshwa"],"https://open.spotify.com/embed/artist/1PzAgFVk9v8cxn9flrqrv5","https://app.notion.com/p/4090e646ca0d818ca6d7ce5238d436f1","2026-10-30-three-before-five",3],
    ["3c805upue925stoIrEG8Ep","RIDE","Big Florida",178875,["artist:big-florida"],"https://open.spotify.com/embed/artist/7LjnXw8QLtGkt9GSwyo7aj","https://app.notion.com/p/4090e646ca0d815191b4c93b096f6c6e","2026-10-30-three-before-five",2],
    ["3cZajhyr8LmtPfHZ9296tj","No Broke Boys","Disco Lines, Tinashe",163994,["artist:disco-lines"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81adbfa1c2d94d12733a","2026-10-30-official-playlist",null],
    ["3dcWKFefG4Otjdb6ykBVcY","Feel The Vibration","Kanine",201847,["artist:kanine"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81609748d493d64dae42","2026-10-30-official-playlist",null],
    ["3dD9yyYTQ73SZvyOygyKva","High (& Dua Lipa)","Whethan, Dua Lipa",196706,["artist:whethan"],"https://open.spotify.com/embed/artist/0vqJkZ0RpLZixt3lTmD8vP","https://app.notion.com/p/4090e646ca0d81b28963f80adbdf25c1","2026-10-30-three-before-five",3],
    ["3deZ4afG0Y4WhbSBEp97oK","MONEY ON THE DASH - SPED UP","Elley Duhé, Whethan",116465,["artist:whethan"],"https://open.spotify.com/embed/artist/0vqJkZ0RpLZixt3lTmD8vP","https://app.notion.com/p/4090e646ca0d8189a39ac71cc207e661","2026-10-30-three-before-five",2],
    ["3dNDt0VLKc0xUcuTI20Q73","Innocence 2025","NERO, Taiki Nulight",168000,["artist:taiki-nulight"],"https://open.spotify.com/embed/artist/4QWmN97HRZya55JvxN3I5a","https://app.notion.com/p/4090e646ca0d8199a4ffc44f5630453c","2026-10-30-three-before-five",2],
    ["3DqOJ2BoddzZpNdty3okJH","RIZZ","AYYBO",200787,["artist:ayybo"],"https://open.spotify.com/embed/artist/0YVquC9RaJLYFNmlJFzkTV","https://app.notion.com/p/4090e646ca0d81a6b7d2d9da04184e22","2026-10-30-three-before-five",2],
    ["3EB2capRBxxmTvW4fxYQht","Bodies","Know Good, JEANLOUIS",111044,["artist:know-good"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81078708dd1c377bd02e","2026-10-30-official-playlist",null],
    ["3ebXMykcMXOcLeJ9xZ17XH","Scared to Be Lonely","Martin Garrix, Dua Lipa",220883,["artist:martin-garrix"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81c59500fe0af540abd4","2026-10-30-official-playlist",null],
    ["3ekLXHhFW8qI6FZDE6Xx9l","One Last Breath - Remix","ATLiens",177777,["artist:atliens"],"https://open.spotify.com/embed/artist/74RET4rCZPTGzhsLjD0i3g","https://app.notion.com/p/4090e646ca0d8118aac6dfb29ab10bbb","2026-10-30-three-before-five",2],
    ["3ftdZ6WtsQo7o5tSFI2WV5","Is It All","Phrva",222857,["artist:phrva"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d813cae6adc8f82683a85","2026-10-30-official-playlist",null],
    ["3G2O60rq5a77GEIwK1mVmh","Make Me Yours","Borgeous, Zack Martino",195239,["artist:zack-martino"],"https://open.spotify.com/embed/artist/2US2mjK9hW7QGSBNpprlbu","https://app.notion.com/p/4090e646ca0d814281fef3599b31c6f0","2026-10-30-three-before-five",2],
    ["3hVySEjegjGhNCbwFBYrEk","Holy Atlantis","HOLY PRIEST, Netherworld",116707,["artist:holy-priest"],"https://open.spotify.com/embed/artist/5UG2ipdnA4vk8Eevkf1s06","https://app.notion.com/p/4090e646ca0d81dbacd1fbaf6a24096a","2026-10-30-three-before-five",3],
    ["3jDXVV12qJ0sZB3Ixp3srB","RESCUE U","Alison Wonderland, WINK",175448,["artist:alison-wonderland"],"https://open.spotify.com/embed/artist/11gWrKZMBsGQWmobv3oNfW","https://app.notion.com/p/4090e646ca0d8169bb4bfad41726c35b","2026-10-30-three-before-five",2],
    ["3JFbLpgf57vGArmdFULXNB","Get Wompy","SIPPY",153600,["artist:sippy"],"https://open.spotify.com/embed/artist/4LLYqe8ogaK9wC1xHlvR5S","https://app.notion.com/p/4090e646ca0d81c08c8fdefa593f6af4","2026-10-30-three-before-five",2],
    ["3JGVhjbPvMdxKqDE7NDJEK","Got To Do","Disco Lines",169323,["artist:disco-lines"],"https://open.spotify.com/embed/artist/5Kmr0b3ip8g9P2i0dLTC3Z","https://app.notion.com/p/4090e646ca0d81a39faee9177d776969","2026-10-30-three-before-five",3],
    ["3JhgPs7rbmzLBWRvHlel8U","Bad Memories","MEDUZA, James Carter, Elley Duhé, FAST BOY",147629,["artist:meduza"],"https://open.spotify.com/embed/artist/0xRXCcSX89eobfrshSVdyu","https://app.notion.com/p/4090e646ca0d814b9206f3f9348d7b77","2026-10-30-three-before-five",3],
    ["3KO4hzcExe2SeapsmuLizY","240 INTRO","Adrian Mills, 240 KM/H",340253,["artist:adrian-mills"],"https://open.spotify.com/embed/artist/6H9sRmDCsXzsWK7jEg1thF","https://app.notion.com/p/4090e646ca0d8153ad8fd97c4c1ce7c5","2026-10-30-three-before-five",3],
    ["3Mep8LVvhULlNgkn6oTLNu","PEOPLE IN THE PLACE","A.B.C., Silva Bumpa, Rossi.",203105,["artist:rossi"],"https://open.spotify.com/embed/artist/7itMGcVGRKS43LcTQvJitf","https://app.notion.com/p/4090e646ca0d8140a922e4e533344511","2026-10-30-three-before-five",2],
    ["3MOECVkNshqHYTPt5DZcdN","Five More Hours","Deorro, Chris Brown",211975,["artist:deorro"],"https://open.spotify.com/embed/artist/6VD4UEUPvtsemqD3mmTqCR","https://app.notion.com/p/4090e646ca0d817facfee74e054bfe66","2026-10-30-three-before-five",2],
    ["3OgdqZIgGIqusstV9IqX6p","What’s a Girl to Do in ‘25","KI/KI",148047,["artist:ki-ki"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81fabe10e828e98686d8","2026-10-30-official-playlist",null],
    ["3PJo4Pq0WscWLh2h89U2Kx","227kg","Pegassi",228571,["artist:pegassi"],"https://open.spotify.com/embed/artist/2A4uiWrfuBpVFugyvxAt4c","https://app.notion.com/p/4090e646ca0d8145ac2cdd16eb2acdf9","2026-10-30-three-before-five",2],
    ["3pUz2qJe5nqZemi3hhIxMk","Where You Are","John Summit, HAYLA",236000,["artist:hayla"],"https://open.spotify.com/embed/artist/4yX6mpMyBGf9UfvBB8JJrc","https://app.notion.com/p/4090e646ca0d8137b856e9ae7f6411e4","2026-10-30-three-before-five",2],
    ["3rBYmkOB8N1Z4bCa3DsdPK","Love On Me","Azzecca, House Of Molly",147374,["artist:azzecca"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81c88bd7d7dda65d4098","2026-10-30-official-playlist",null],
    ["3RBZG00eHECxQIgOwrLhjC","Don't Stop","AAT",181762,["artist:aat"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8135af6cc35cbb4a321e","2026-10-30-official-playlist",null],
    ["3sGy9TKEpZZCEgbpSMlOKK","Yup - Radio Edit","Fallon",188500,["artist:fallon"],"https://open.spotify.com/embed/artist/73LVVE6OYOwlXlIJAFNJdR","https://app.notion.com/p/4090e646ca0d81728e93ed6012e8b4b2","2026-10-30-three-before-five",3],
    ["3SoMMKpm0eB3BghB3b5wyM","Big Sip","SIPPY",149172,["artist:sippy"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d814d98d9df6a4d0145e9","2026-10-30-official-playlist",null],
    ["3Sy6SmgPL9NlzNoOdxUhqq","Дорадура (doradura)","M81!",99000,["artist:m81"],"https://open.spotify.com/embed/artist/3bE8ejTzBABjsWxbDhUSRv","https://app.notion.com/p/4090e646ca0d810b8c27fde1be589067","2026-10-30-three-before-five",2],
    ["3t6829TdVyxeSSj7SJ7uWn","Misery","Rossi.",195572,["artist:rossi"],"https://open.spotify.com/embed/artist/7itMGcVGRKS43LcTQvJitf","https://app.notion.com/p/4090e646ca0d817ebcdbc1ed0042de10","2026-10-30-three-before-five",3],
    ["3TCmo9oC5hlzCGzlTFZ0u5","Pull Up","Discip",171162,["artist:discip"],"https://open.spotify.com/embed/artist/6K16NRv0isbkftsv5lmlMT","https://app.notion.com/p/4090e646ca0d81d08e78d08d8053579e","2026-10-30-three-before-five",3],
    ["3TmTEN2zy0cyYMjiviWbMK","I Love You.","Kaivon",246315,["artist:kaivon"],"https://open.spotify.com/embed/artist/55FVjkpZs1zuo3zqBgrKtC","https://app.notion.com/p/4090e646ca0d81faa24adaf3db00aa2f","2026-10-30-three-before-five",2],
    ["3tVV7V3TH4jpPVvfgPILR0","La Pista Es Mía","Miguelle & Tons, Barbara Doza",198425,["artist:miguelle-tons"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8153800ededa981b6e27","2026-10-30-official-playlist",null],
    ["3ujrxclgI5IGFpGGcid37R","God Complex","GREG 99",205312,["artist:greg-99"],"https://open.spotify.com/embed/artist/68ocQOFVB9wvLiC1C1WjYp","https://app.notion.com/p/4090e646ca0d813ab689ed8a06da80d9","2026-10-30-three-before-five",3],
    ["3V9Y3MU0zee8FiZYF0GDE9","Devils","Vastive, Left to Suffer",238683,["artist:vastive"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8134bf46d390f9c55927","2026-10-30-official-playlist",null],
    ["3VpxEo6vMpi4rQ6t2WVVkK","Escape (feat. Hayla)","Kx5, deadmau5, Kaskade, HAYLA",240445,["artist:hayla","artist:kaskade"],"https://open.spotify.com/embed/artist/6TQj5BFPooTa08A7pk8AQ1","https://app.notion.com/p/4090e646ca0d81c3a9aac6bc7a578af0","2026-10-30-three-before-five",2],
    ["3wRO9Pt5iPbZTs8YT1x69Q","Just A Little Bit More","Mau P",214038,["artist:mau-p"],"https://open.spotify.com/embed/artist/0w1sbtZVQoK6GzV4A4OkCv","https://app.notion.com/p/4090e646ca0d8155aeead824628d0e39","2026-10-30-three-before-five",2],
    ["3wWdJGv0iqFJRQ82Uixaiu","What's a Gremlin?","SIPPY",140142,["artist:sippy"],"https://open.spotify.com/embed/artist/4LLYqe8ogaK9wC1xHlvR5S","https://app.notion.com/p/4090e646ca0d81dc9e0dc086109ee7c1","2026-10-30-three-before-five",3],
    ["3x6CEyquRREaQ9ZBbBhrGe","Ghost Dance","Brunello, Vargas",372480,["artist:brunello"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d810c924fcac576b30b95","2026-10-30-official-playlist",null],
    ["3XIpIZvqELq9H0xCUQI3mh","Eraser","SHDW, Obscure Shape",301800,["artist:shdw"],"https://open.spotify.com/embed/artist/4IyAdT9yACjgFv8Qk2eSkO","https://app.notion.com/p/4090e646ca0d81dcb95dd4eab93a53fc","2026-10-30-three-before-five",3],
    ["3YnzLXBGOXq0I4pcfYnOcX","You & Me","bullet tooth, Tom Did It",197819,["artist:bullet-tooth"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8148bd1fcd99b4531bdd","2026-10-30-official-playlist",null],
    ["3Z23sDc2J9ZkmFiMStRoIp","High On Me","Rossi., Jazzy",189767,["artist:rossi"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81ada1b3e58893eaf0af","2026-10-30-official-playlist",null],
    ["3zW2p2IIK885aOrjfDJEXv","Elevator","Discip",128874,["artist:discip"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81738b92c735c7b75f0e","2026-10-30-official-playlist",null],
    ["45Q7gfiscW28MWPY9VvebZ","Mirage","MPH, Skrillex",291971,["artist:mph"],"https://open.spotify.com/embed/artist/62SCu33InHVq97VaWw3eof","https://app.notion.com/p/4090e646ca0d81dd8683c351fe208908","2026-10-30-three-before-five",3],
    ["46WqNBxyjLaxbHMM4BKTA2","PUT IT DOWN - Jkyl & Hyde Remix","Angrybaby, Jkyl & Hyde",194782,["artist:jkyl-hyde"],"https://open.spotify.com/embed/artist/23AH13eC6V0NB0QCkV6206","https://app.notion.com/p/4090e646ca0d81bca129cda0a1386a0c","2026-10-30-three-before-five",2],
    ["4Akak3MSwvkk49TVmBwjvS","BALL SO HARD","M81!",154835,["artist:m81"],"https://open.spotify.com/embed/artist/3bE8ejTzBABjsWxbDhUSRv","https://app.notion.com/p/4090e646ca0d817fa544e3b3a1063c12","2026-10-30-three-before-five",3],
    ["4ASOMWcJUrwEpjJy4GEijz","California Dreamin' (feat. High Jinx)","Chris Lorenzo, High Jinx",196899,["artist:chris-lorenzo"],"https://open.spotify.com/embed/artist/7tm9Tuc70geXOOyKhtZHIj","https://app.notion.com/p/4090e646ca0d814a99d0f8dfc92e6d95","2026-10-30-three-before-five",3],
    ["4bRMcJ517G0Zda8VmFZCZB","What I Can Do","CØNTRA, Saturna",195230,["artist:contra"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81d299dee63b85e33de0","2026-10-30-official-playlist",null],
    ["4D3XVVyxjxNvZLXMhmF9x3","Donnie Brasco","Know Good",182166,["artist:know-good"],"https://open.spotify.com/embed/artist/4iogDJBJ2BO2jl8OkPrfpx","https://app.notion.com/p/4090e646ca0d818cad38d39a2d2ffade","2026-10-30-three-before-five",3],
    ["4eMuPLoETMcowDdFERoJcq","No Worries if Not","CØNTRA, Chef Boyarbeatz",229714,["artist:chef-boyarbeatz","artist:contra"],"https://open.spotify.com/embed/artist/7nSk3iFPogRCOokrMliejt","https://app.notion.com/p/4090e646ca0d8192b870e9d6d2c86dea","2026-10-30-three-before-five",2],
    ["4ErKiLpGrMNHSB8xQ6UIXT","SPIRAL","Ravenscoon, Jessy Covets",212571,["artist:ravenscoon"],"https://open.spotify.com/embed/artist/7vfvYuEyJbh1Tf3QlOTAmZ","https://app.notion.com/p/4090e646ca0d813cb233e1f1f2f89904","2026-10-30-three-before-five",1],
    ["4G8kDpgyrmgDiILzPIUnpe","BANG YOUR HEAD","DJ DIESEL, Hairitage, Shaquille O'Neal",204798,["artist:dj-diesel"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d813eb37ce1585aceed0f","2026-10-30-official-playlist",null],
    ["4HTD64x2NstZsK1su3OFd6","Face Your Fear","Sidney Charles",219354,["artist:sidney-charles"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81ca8ff9fd820655752d","2026-10-30-official-playlist",null],
    ["4J7CKHCF3mdL4diUsmW8lq","Under Control (feat. Hurts)","Calvin Harris, Alesso, Hurts",184280,["artist:alesso"],"https://open.spotify.com/embed/artist/4AVFqumd2ogHFlRbKIjp1t","https://app.notion.com/p/4090e646ca0d81d6bc10edb67f99bbab","2026-10-30-three-before-five",3],
    ["4KUvFYXZftOZQaVa3Hxato","What I Came For","Devault",183636,["artist:devault"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d816a9fb9f8de916fdc24","2026-10-30-official-playlist",null],
    ["4LlDviPbNd8rn1216SmDql","ME V ME","Benda",209577,["artist:benda"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d814583a1f5377d161d2a","2026-10-30-official-playlist",null],
    ["4MgH7JjZQAPgIBf0lrdbie","Save Me","Kai Wachi, Black Tiger Sex Machine",196790,["artist:kai-wachi","artist:black-tiger-sex-machine"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81ee82d2f2386ea7ed1e","2026-10-30-official-playlist",null],
    ["4nOOoo9OJbgnTBNHe5b6nD","Romantika","Brutalismus 3000",250145,["artist:brutalismus-3000"],"https://open.spotify.com/embed/artist/6LtXxYMIiKSy2EGHnz1f5j","https://app.notion.com/p/4090e646ca0d81659539d96e2bbe281b","2026-10-30-three-before-five",2],
    ["4oAZsDVgeunfAxyTR782a4","Hyper Rave","Sidney Charles",185454,["artist:sidney-charles"],"https://open.spotify.com/embed/artist/0J6ZEXmLQfZMeHBoa4JZTH","https://app.notion.com/p/4090e646ca0d8148a39ed61fcb043e71","2026-10-30-three-before-five",2],
    ["4orH1YqyAjXBtBr0DfsqjV","Swag Surfin'","Whethan",228368,["artist:whethan"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81bbb209ed94d8217faa","2026-10-30-official-playlist",null],
    ["4PzgYtLEcik1VGjbDDdqbA","Heartbreak","Levity",154405,["artist:levity"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d816ba6e0fffd787722f8","2026-10-30-official-playlist",null],
    ["4q1LQDKbCd6JX2EDJTRZjn","Under My Skin","SLANDER, Spiritbox, Vastive",276153,["artist:slander","artist:vastive"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81169bbcc69ace9f5973","2026-10-30-official-playlist",null],
    ["4QNpBfC0zvjKqPJcyqBy9W","Give Me Everything (feat. Nayer)","Pitbull, AFROJACK, Ne-Yo, Nayer",252306,["artist:afrojack"],"https://open.spotify.com/embed/artist/4D75GcNG95ebPtNvoNVXhz","https://app.notion.com/p/4090e646ca0d818b91a5d73e9b360810","2026-10-30-three-before-five",2],
    ["4QUxlbwlSBYiaTT27A5MEj","In This Bih'","Chris Lorenzo, Kah-Lo",210923,["artist:chris-lorenzo"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8180a454eaef14d1779e","2026-10-30-official-playlist",null],
    ["4rtz2VliXObZALpQghDO5K","Till I Found You","Zack Martino",220542,["artist:zack-martino"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81f18191d2e0ddc4ec1a","2026-10-30-official-playlist",null],
    ["4RV0l2NdRR6cZ6SWqneFvx","Lotis Eater","Boogie T",256285,["artist:boogie-t"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81939a6ad592fb88f488","2026-10-30-official-playlist",null],
    ["4SlGZwTjgOXjOK7Pqw7xGW","Get Stupid","GREG 99",190153,["artist:greg-99"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d817abf78e65a86886e7c","2026-10-30-official-playlist",null],
    ["4sMR8fuTzbUyzB0asxifV0","Desire","Ian Asher, Olly Alexander (Years & Years)",158840,["artist:ian-asher"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8117bd80fa7081ad9297","2026-10-30-official-playlist",null],
    ["4TIkSdsNSfqpuq6ZYvCjAz","All You Need To Know (feat. Calle Lehmann)","Gryffin, SLANDER, Calle Lehmann",238337,["artist:slander"],"https://open.spotify.com/embed/artist/20DZAfCuP1TKZl5KcY7z3Q","https://app.notion.com/p/4090e646ca0d812184e5c9e499c4c759","2026-10-30-three-before-five",3],
    ["4Vdes3GjtIqdFskoWbVYnP","Awake Tonight","AFROJACK, Sia, David Guetta",190013,["artist:afrojack","artist:david-guetta"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81faad72c1771b6cfffd","2026-10-30-official-playlist",null],
    ["4XQqAGRG3jRH0fVmVpyOms","Meet Again","Kaskade, Layton Giordani, Natalie Jane",206363,["artist:kaskade"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8163a612e4314eab0711","2026-10-30-official-playlist",null],
    ["4xUtkaR5dWtESdFmniDj3K","Aquarius","KUKO, Adrian Mills",223161,["artist:adrian-mills"],"https://open.spotify.com/embed/artist/6H9sRmDCsXzsWK7jEg1thF","https://app.notion.com/p/4090e646ca0d811a9b5cef35cbc5ed2a","2026-10-30-three-before-five",2],
    ["4xWXrhg0Vwc29lbeyHZsYt","Dingus","Subtronics, Wooli, LEVEL UP",218482,["artist:level-up","artist:wooli"],"https://open.spotify.com/embed/artist/1ZpDxqXS6HAvoZyCzQfKRb","https://app.notion.com/p/4090e646ca0d81b8adf4e6253e6afbeb","2026-10-30-three-before-five",3],
    ["4YX65szuyA3cu2EGMdIrRo","WIDE AWAKE","me n ü, Sandro Cavazza",186666,["artist:me-n-u"],"https://open.spotify.com/embed/artist/1hqo0TnaWxL6jVm0wdzi9f","https://app.notion.com/p/4090e646ca0d8188955de2c8bcc22076","2026-10-30-three-before-five",2],
    ["4ZmjEc72ASdMpRVYDeF9Z7","Desire","Zack Martino, Spat",184620,["artist:zack-martino"],"https://open.spotify.com/embed/artist/2US2mjK9hW7QGSBNpprlbu","https://app.notion.com/p/4090e646ca0d810aa280c900e551b49b","2026-10-30-three-before-five",3],
    ["4zXG4SBvsjsW0EN1mjCxaV","No Broke Boys - AVELLO Remix","Disco Lines, Tinashe, AVELLO",164885,["artist:avello","artist:disco-lines"],"https://open.spotify.com/embed/artist/1ZR5GnPw0Jkb5M4hnBwzuZ","https://app.notion.com/p/4090e646ca0d8122a397f348e445bb38","2026-10-30-three-before-five",2],
    ["508qHPYB5x0CTw2F6oILwe","BAJA BLASTER","GHENGAR, Big Florida",243310,["artist:big-florida"],"https://open.spotify.com/embed/artist/7LjnXw8QLtGkt9GSwyo7aj","https://app.notion.com/p/4090e646ca0d819993c6d593fdef1258","2026-10-30-three-before-five",3],
    ["51NH5ntx0mM6T2FZbOXETL","Blow Your Mind","HILLS, ESSE",141984,["artist:esse"],"https://open.spotify.com/embed/artist/4PFWrk1gURzx5KuGSSLO19","https://app.notion.com/p/4090e646ca0d81c1b735d64267c3916b","2026-10-30-three-before-five",3],
    ["523S2SOGiZ5q1VHiiSPxbg","Bad Mamma Jamma - Extended Mix","itsbilly, Monoky",361473,["artist:monoky"],"https://open.spotify.com/embed/artist/35fqprYtwqebSkrjHVXfxw","https://app.notion.com/p/4090e646ca0d8181898ccc3ba52c517a","2026-10-30-three-before-five",3],
    ["54S9rhNgvLcu0oGNwWjTXD","Hear Me Now","Kaskade, Wooli, MAXINE",199781,["artist:kaskade","artist:wooli"],"https://open.spotify.com/embed/artist/1Uyqa2sdHm1bL5JK4IC4zc","https://app.notion.com/p/4090e646ca0d81a4bb39e2823a4c855f","2026-10-30-three-before-five",2],
    ["55Buxzkild4FXY4oYkJJkS","SO DAMN GOOD","ALLEYCVT",198400,["artist:alleycvt"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d814fbeacc787235e2299","2026-10-30-official-playlist",null],
    ["57508shL0obX0KUOUL8CJk","Make Me - Franky Rizardo Remix","Borai & Denham Audio, Franky Rizardo",195692,["artist:franky-rizardo"],"https://open.spotify.com/embed/artist/2UgphhGSlC9QWgaZWUOCkl","https://app.notion.com/p/4090e646ca0d81d2a31af133e2918cce","2026-10-30-three-before-five",2],
    ["58IaSaF4BJUgYPI9G2gPmC","Delincuente","Miguelle & Tons, Miluhska, Jambene",277209,["artist:miguelle-tons"],"https://open.spotify.com/embed/artist/1U7nDI6jydkqHWaOtUdlkx","https://app.notion.com/p/4090e646ca0d81d9881eddb88227bdd4","2026-10-30-three-before-five",3],
    ["58ZxB5HafuK7mZS3B3kf8y","LICK IT","Roddy Lima, Sarah de Warren",211987,["artist:roddy-lima"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81d1892cc286f750657f","2026-10-30-official-playlist",null],
    ["5au1dxozcN7pepkik4E4uE","Get Funky","AAT",193384,["artist:aat"],"https://open.spotify.com/embed/artist/02B08CAGsMQ0y87xmg07M9","https://app.notion.com/p/4090e646ca0d81a792bbc27850e4a690","2026-10-30-three-before-five",2],
    ["5B5onCeur5UE2jbTCCkUiK","Still My Baby","Cloonee, GREG 99",191233,["artist:greg-99"],"https://open.spotify.com/embed/artist/68ocQOFVB9wvLiC1C1WjYp","https://app.notion.com/p/4090e646ca0d81c19430ff0d5060e91f","2026-10-30-three-before-five",2],
    ["5bdKaYnig6IqBsQQqBUjHm","Back It Up","Josh Baker, Omar+",156398,["artist:josh-baker","artist:omar-plus"],"https://open.spotify.com/embed/artist/4zf8Awb8y1X9qwL4oiVRd6","https://app.notion.com/p/4090e646ca0d81889ec0e48c2c9cf4ac","2026-10-30-three-before-five",3],
    ["5cR7culxUEPLhzIC0KWAH1","Perdoname (feat. DyCy & Adrian Delgado)","Deorro, DyCy, Adrian Delgado",270053,["artist:deorro"],"https://open.spotify.com/embed/artist/6VD4UEUPvtsemqD3mmTqCR","https://app.notion.com/p/4090e646ca0d81d99f86c8c5430bd617","2026-10-30-three-before-five",3],
    ["5DdDbJvoaT8fqQMJkiGg4T","Take Over Control (feat. Eva Simons) - Radio Edit","AFROJACK, Eva Simons",208620,["artist:afrojack"],"https://open.spotify.com/embed/artist/4D75GcNG95ebPtNvoNVXhz","https://app.notion.com/p/4090e646ca0d8173ad49d55d19b15ab5","2026-10-30-three-before-five",3],
    ["5Dvlbh5yIVJw57MM9DejLK","Ocean","FISHER, AR/CO",196923,["artist:ar-co"],"https://open.spotify.com/embed/artist/7mGI9Sd66FqHjIkwzkgbG7","https://app.notion.com/p/4090e646ca0d81ea98e3fd4616813107","2026-10-30-three-before-five",3],
    ["5e4II0hLokRNiw4q2uHeL8","Better With You","Nico Moreno, Novah, KIMI",211928,["artist:nico-moreno"],"https://open.spotify.com/embed/artist/6fjhNhp9IoeiZpEXq9AT2S","https://app.notion.com/p/4090e646ca0d81eb9b8ce64d652b3788","2026-10-30-three-before-five",2],
    ["5Ef5Df4m9y7X4ixO4TgBWy","Push It","Disco Lines, Maesic, Mason, Princess Superstar",129302,["artist:disco-lines"],"https://open.spotify.com/embed/artist/5Kmr0b3ip8g9P2i0dLTC3Z","https://app.notion.com/p/4090e646ca0d813f83b3fcca80f9a58a","2026-10-30-three-before-five",2],
    ["5eYVjWYsfGUqpkzM9uef7Q","Hear Me Now","Alok, Bruno Martini, Zeeba",192846,["artist:alok"],"https://open.spotify.com/embed/artist/0NGAZxHanS9e0iNHpR8f2W","https://app.notion.com/p/4090e646ca0d81d59611e767fcccf511","2026-10-30-three-before-five",3],
    ["5fF9T9SMqBKUvT06cn7kBR","It's That Time","Marlon Hoffstadt, DJ Daddy Trance",240250,["artist:marlon-hoffstadt"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81c4a251defc831fd7e6","2026-10-30-official-playlist",null],
    ["5fqLqeakKq58Eu05bx2si5","The Spot","ARTBAT, JOA",298125,["artist:joa"],"https://open.spotify.com/embed/artist/3rOSOkPQ5PHYOiR7mvLTMA","https://app.notion.com/p/4090e646ca0d819a9485ea2eb7448cc6","2026-10-30-three-before-five",2],
    ["5jdGLLEA1e85jy9VYdggoP","Crave You - Adventure Club Remix","Flight Facilities, Adventure Club",236930,["artist:adventure-club"],"https://open.spotify.com/embed/artist/5CdJjUi9f0cVgo9nFuJrFa","https://app.notion.com/p/4090e646ca0d81a9b4cfff7b8e77dca2","2026-10-30-three-before-five",2],
    ["5LALKtB7ARRwCS5j06BfOf","Good Girl","Cloonee, Prospa, Tristan Henry",181411,["artist:prospa"],"https://open.spotify.com/embed/artist/6HabM2PUM519iIxervGWSb","https://app.notion.com/p/4090e646ca0d8113bb7cfa97bbc00ff1","2026-10-30-three-before-five",2],
    ["5LgajY7TLsN0WzXza4Fkw8","RUSH","Sloth",142285,["artist:sloth"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81228584e45cd63f49e4","2026-10-30-official-playlist",null],
    ["5LOkqfRL9Wl6r7exO6Xm6P","Bass Drop","AAT",198945,["artist:aat"],"https://open.spotify.com/embed/artist/02B08CAGsMQ0y87xmg07M9","https://app.notion.com/p/4090e646ca0d81dc8143c33c50410051","2026-10-30-three-before-five",3],
    ["5MhdIizFfxEAwBczKWBzbQ","Moonshine","Alan Walker, Elley Duhé",160344,["artist:alan-walker"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d819ebff4e93a05733b79","2026-10-30-official-playlist",null],
    ["5O5zNr0ooHWqHWfRGYX049","Wide Awake","Kanine",226206,["artist:kanine"],"https://open.spotify.com/embed/artist/1KiNUGL3r0GgyLwqYCY1yV","https://app.notion.com/p/4090e646ca0d813cb445e96398a24113","2026-10-30-three-before-five",3],
    ["5On7CF20MHgFOYUUlacXbf","Substance","Alok, SCRIPT, FAANGS",160496,["artist:alok"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d812f9e0fed93ee91a264","2026-10-30-official-playlist",null],
    ["5th3NC5g5X0DiT2nruzr85","theytookmymoney","salameh, RAJE, FLAT 22",270001,["artist:raje"],"https://open.spotify.com/embed/artist/2dPCWh9rFrw0MyUSr3sEyQ","https://app.notion.com/p/4090e646ca0d816d9d42fa0992f1b7c5","2026-10-30-three-before-five",3],
    ["5uaHSOou5ernQBKhfVse1f","Everytime","IDEMI, Lustral",205454,["artist:idemi"],"https://open.spotify.com/embed/artist/09OK5GXLbMSjg8lOb4wRVT","https://app.notion.com/p/4090e646ca0d812d8ad9dac4e122564d","2026-10-30-three-before-five",2],
    ["5UcnVThvFiSQKWGQDtG58z","Surrender","Kanine, Jem Cooke",203793,["artist:kanine"],"https://open.spotify.com/embed/artist/1KiNUGL3r0GgyLwqYCY1yV","https://app.notion.com/p/4090e646ca0d81319d8ee0ccdefc3a52","2026-10-30-three-before-five",2],
    ["5uxwxuFRvmwYr3rLn81k8G","YOUR EYES","me n ü",176470,["artist:me-n-u"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81b09de3c0020448396d","2026-10-30-official-playlist",null],
    ["5vdYKeo49iIaBRXoug9bsi","Illusions","Brunello",411968,["artist:brunello"],"https://open.spotify.com/embed/artist/7FZIk8RSha4GBa4ZEPuytU","https://app.notion.com/p/4090e646ca0d8134a265e4a8a765d4f2","2026-10-30-three-before-five",3],
    ["5wBIHtGYaQDWdB4uKWcmsu","SMILING/HIDING","San Holo, Kompany, Allegra Miles, Underbelly, Au5",234755,["artist:kompany","artist:san-holo"],"https://open.spotify.com/embed/artist/7dtX3ykcuyVmts2HQnWgSP","https://app.notion.com/p/4090e646ca0d81f19f5ef3194862e834","2026-10-30-three-before-five",3],
    ["5wFtmxPFbYlbukfvWjzGki","Woozy","WonkyWilla, Sloth",120756,["artist:sloth"],"https://open.spotify.com/embed/artist/2R8PPmEGSs8qYtV7qlHjt4","https://app.notion.com/p/4090e646ca0d81159b99deb19a3e750b","2026-10-30-three-before-five",2],
    ["5ZOSgH7PHnPlJijoh1bjPh","Toter Schmetterling","Klangkuenstler, Sant",233846,["artist:klangkuenstler"],"https://open.spotify.com/embed/artist/6H77vD9YyhyxHBTkRpbMBk","https://app.notion.com/p/4090e646ca0d818d8eb6c281e867c636","2026-10-30-three-before-five",2],
    ["5ZWJAsrrjXUBPv3tYxaHEN","Disguise","Taiki Nulight, borne",193273,["artist:taiki-nulight"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81e4adc6d80ab4ba0926","2026-10-30-official-playlist",null],
    ["67kmVaXtdmcy856hKjHb3y","YAPAQUE","Farruko, Greeicy, Steve Aoki",237120,["artist:steve-aoki"],"https://open.spotify.com/embed/artist/77AiFEVeAVj2ORpC85QVJs","https://app.notion.com/p/4090e646ca0d817b9de0c84fb3658baa","2026-10-30-three-before-five",2],
    ["698ItKASDavgwZ3WjaWjtz","Faded","Alan Walker",212106,["artist:alan-walker"],"https://open.spotify.com/embed/artist/7vk5e3vY1uw9plTHJAMwjN","https://app.notion.com/p/4090e646ca0d810fbcc5c440e8eb37a3","2026-10-30-three-before-five",2],
    ["69LK77IjL8NtKTgpMmRuCB","Brackish","Of The Trees, Tape B",169714,["artist:of-the-trees"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d811eb832c5338a64872e","2026-10-30-official-playlist",null],
    ["6AJAzlq5ujQWCzzwpeGEZA","Wicked Game","KREAM",175327,["artist:kream"],"https://open.spotify.com/embed/artist/0DdDnziut7wOo6cAYWVZC5","https://app.notion.com/p/4090e646ca0d8198a030fbf97cef9c50","2026-10-30-three-before-five",2],
    ["6bs1myCEARQoI7oOLxqHkp","Sonne Geht Auf","Klangkuenstler, Ski Aggu",126538,["artist:klangkuenstler"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81de9204dc3869ac4794","2026-10-30-official-playlist",null],
    ["6bU9aYY97cCrzsx1IKdxZG","What U Doing","Dennis Cruz, Leo Wood",229523,["artist:dennis-cruz"],"https://open.spotify.com/embed/artist/27mWOSZjlpmtoqsRjRwQyu","https://app.notion.com/p/4090e646ca0d8184ac5cc98bd0598d39","2026-10-30-three-before-five",2],
    ["6cJwVvwYpMg8PlQpJY5RwS","4 Ya Mind","AYYBO, Discip",205546,["artist:ayybo","artist:discip"],"https://open.spotify.com/embed/artist/6K16NRv0isbkftsv5lmlMT","https://app.notion.com/p/4090e646ca0d8159a08dd668d954d14a","2026-10-30-three-before-five",2],
    ["6cl01mVeSioV2jTHRcGe0l","Runaway","Jkyl & Hyde",185142,["artist:jkyl-hyde"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d818e8122d69c7f77691b","2026-10-30-official-playlist",null],
    ["6e3aWmdRTfEm9aXQjNuVl0","Wildflower","Joshwa",208039,["artist:joshwa"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d819896baf05067dff40d","2026-10-30-official-playlist",null],
    ["6eVObZmZadZp8MsUtgKIur","Dancer in the Dark","SHDW, Obscure Shape",307240,["artist:shdw"],"https://open.spotify.com/embed/artist/4IyAdT9yACjgFv8Qk2eSkO","https://app.notion.com/p/4090e646ca0d81fba72af78cb64b2c43","2026-10-30-three-before-five",2],
    ["6F2ckzsOmaog4Ho3S928X4","THE MOB","IDEMI",151384,["artist:idemi"],"https://open.spotify.com/embed/artist/09OK5GXLbMSjg8lOb4wRVT","https://app.notion.com/p/4090e646ca0d81fabbead558d532b331","2026-10-30-three-before-five",3],
    ["6FTveMyq8szPAloptdZ17g","Science Fiction","Brunello",396851,["artist:brunello"],"https://open.spotify.com/embed/artist/7FZIk8RSha4GBa4ZEPuytU","https://app.notion.com/p/4090e646ca0d81a0a201f625af53a5c4","2026-10-30-three-before-five",2],
    ["6gLDnzjpM0AwOeh9NmmHE0","Other Side","Azzecca",244337,["artist:azzecca"],"https://open.spotify.com/embed/artist/2k5DY2QDU3kBi5DX7OQlWj","https://app.notion.com/p/4090e646ca0d810f8ab4e19701b4ad5d","2026-10-30-three-before-five",2],
    ["6GvfH6m9biXR8bL6WW8YX7","Bubbling","Dennis Cruz, Patrick Luna",209092,["artist:dennis-cruz"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d817cbd35ee8ee92de7de","2026-10-30-official-playlist",null],
    ["6Gzd1wfVKRoBg9EhcC1ytq","Chiggy Chiggy (feat. Inéz)","MALUGI, Inéz",151939,["artist:malugi"],"https://open.spotify.com/embed/artist/50udUOTR7dQUgyPwPuCLM6","https://app.notion.com/p/4090e646ca0d814bacabf78fb065d232","2026-10-30-three-before-five",2],
    ["6HQZTHthmIW0QIefnOsSh1","Fiesta","MPH",226086,["artist:mph"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d816094def6174df9878b","2026-10-30-official-playlist",null],
    ["6IDywtwTrAkEsmJkPSNs27","Toter Schmetterling - Single Edit","Klangkuenstler, Sant",164615,["artist:klangkuenstler"],"https://open.spotify.com/embed/artist/6H77vD9YyhyxHBTkRpbMBk","https://app.notion.com/p/4090e646ca0d81099696ff39f6a8a613","2026-10-30-three-before-five",3],
    ["6KTJrH8rLM4TefZcc9XFQF","Black Sheep","ATLiens, GG Magree",174428,["artist:atliens"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d812ca38cf636d812b24c","2026-10-30-official-playlist",null],
    ["6L5xbckRDXIf5K1pwTaGkD","Satisfaction - Hardwell & Maddix Remix","David Guetta, Benny Benassi, Hardwell, Maddix",204436,["artist:david-guetta","artist:hardwell","artist:maddix"],"https://open.spotify.com/embed/artist/0RMeG9M8QFzss9bAbq99KA","https://app.notion.com/p/4090e646ca0d8162b0deddaf313ec8f5","2026-10-30-three-before-five",1],
    ["6LBVBJN2rdpOADp3RozGKC","LOW","Hardwell, Azteck, Dr Phunk",152945,["artist:hardwell"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8139bcafeec3dcb84866","2026-10-30-official-playlist",null],
    ["6lG1GtM6FvL18EvOVQELC8","Se Que Quiere","KREAM, RUBACK",220009,["artist:kream"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d814a9d1ae2d541c12299","2026-10-30-official-playlist",null],
    ["6m32mRhSnHe5NuQLmNwbv9","No Phone Party","Gabss, Talón",201230,["artist:gabss"],"https://open.spotify.com/embed/artist/7KMvse80vFnyE3fsoGWjaq","https://app.notion.com/p/4090e646ca0d810fab0cdc440752d70b","2026-10-30-three-before-five",1],
    ["6m5LSzsU466ynNvEkxoctM","Sound Of The Sunrise","AR/CO, Sistek",193548,["artist:ar-co"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81519a07f92c4b97b96b","2026-10-30-official-playlist",null],
    ["6nQs7YFkvBIR3OpnAXDfLL","I Need The","Phrva, ero808",224571,["artist:phrva"],"https://open.spotify.com/embed/artist/2gUjbFSv34ZRVw5qkwKTO7","https://app.notion.com/p/4090e646ca0d81038cdbd910858aba13","2026-10-30-three-before-five",2],
    ["6Pr51Pbeeu9PXskLUBfaBf","SHADES OF BLUE","John Summit, Devault, Julia Church",203076,["artist:devault"],"https://open.spotify.com/embed/artist/1VBAKMui4zm5MnBWNn3NbL","https://app.notion.com/p/4090e646ca0d816e91fbfca668117995","2026-10-30-three-before-five",2],
    ["6PzbQNu6gi1uIuDwVCrmUu","Honestly","MALUGI, Sam Harper",175628,["artist:malugi"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8164a1d3e74bb37bf4c8","2026-10-30-official-playlist",null],
    ["6qJhrI2BMuA8qHcmycD3fL","TESLA","Mau P",186818,["artist:mau-p"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8158a74ffe452e72c938","2026-10-30-official-playlist",null],
    ["6QvldZZ10eYgKamaWfG52b","Fuck Your Sunshine (Adventure Club Remix)","Łaszewo, Adventure Club",224250,["artist:adventure-club"],"https://open.spotify.com/embed/artist/5CdJjUi9f0cVgo9nFuJrFa","https://app.notion.com/p/4090e646ca0d814796d5eb5304fe817a","2026-10-30-three-before-five",3],
    ["6r7FXNO57mlZCBY6PXcZZT","Five Hours","Deorro",326887,["artist:deorro"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d8150ba0de7f3a5281793","2026-10-30-official-playlist",null],
    ["6sStFqQdlp0L4vEXk24Ms6","HARDEST MFS","LAYZ, RZRKT",257600,["artist:layz"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81318da3c7f14bcb279e","2026-10-30-official-playlist",null],
    ["6TAbRIua9JOTmqGMjGWe4d","Raving In The Studio","Aitch, Bou",183771,["artist:bou"],"https://open.spotify.com/embed/artist/35dxfY1wywqVRUEaVuMm13","https://app.notion.com/p/4090e646ca0d81ba9fa8f021a8d414f5","2026-10-30-three-before-five",3],
    ["6tGqADF1MUkCEwHbY6EKCr","DIS FUNCTION","ATLiens, Cyclops",160285,["artist:atliens"],"https://open.spotify.com/embed/artist/74RET4rCZPTGzhsLjD0i3g","https://app.notion.com/p/4090e646ca0d81aab879f148be7e4c1b","2026-10-30-three-before-five",3],
    ["6tTDDMmEJpyA97VNYQjjeP","Windhorse","Of The Trees, Sophie Marks",234244,["artist:of-the-trees"],"https://open.spotify.com/embed/artist/5V7NIXgCnX2KuQ01Bxg20c","https://app.notion.com/p/4090e646ca0d819b908fca2cebbecd51","2026-10-30-three-before-five",2],
    ["6VU8WmsSE0Iz49V8BJNR2v","The Other Side","LEVEL UP",181241,["artist:level-up"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d810f9754cdc89fc2216f","2026-10-30-official-playlist",null],
    ["6wb61u8ayuanWSHZzle5od","I Want U","Alison Wonderland",210017,["artist:alison-wonderland"],"https://open.spotify.com/embed/artist/11gWrKZMBsGQWmobv3oNfW","https://app.notion.com/p/4090e646ca0d813d9152e6f6c5dfefa0","2026-10-30-three-before-five",3],
    ["6we24gnTynbSBMhitlNm0U","Magic Trick - Jorge Savoretti Remix","Natalia Roth, Mai iachetti, Jorge Savoretti",365878,["artist:mai-iachetti"],"https://open.spotify.com/embed/artist/575TgodOOhMtSqhGYNWAeh","https://app.notion.com/p/4090e646ca0d810f87cafcd3e1983e73","2026-10-30-three-before-five",2],
    ["6XtFbNwhLEQnWXaasf2mwL","No Le Bajes - Radio Mix","Miguelle & Tons, Dru Flecha, Imperatori",174175,["artist:miguelle-tons"],"https://open.spotify.com/embed/artist/1U7nDI6jydkqHWaOtUdlkx","https://app.notion.com/p/4090e646ca0d8121bc2ffebd6cfe3f68","2026-10-30-three-before-five",2],
    ["6YPXz7BFlkL9QxEmZVgPvh","Peaky & Distorted","RAJE",192114,["artist:raje"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81b984cfeaf2cf76c3df","2026-10-30-official-playlist",null],
    ["6Yvo3lutdPOraK0TFBQLNi","Balanca","Simon Kidzoo, Monoky",183804,["artist:monoky"],"https://open.spotify.com/embed/artist/35fqprYtwqebSkrjHVXfxw","https://app.notion.com/p/4090e646ca0d81ff807ac972f18da643","2026-10-30-three-before-five",2],
    ["6Z3cE0ZK0tmj7131PFIOeZ","Yosemite","KETTAMA, Interplanetary Criminal",266375,["artist:interplanetary-criminal"],"https://open.spotify.com/embed/artist/6uJ51uV5rYzu1MJkC4CceI","https://app.notion.com/p/4090e646ca0d812c8dbbd089bb493e63","2026-10-30-three-before-five",3],
    ["6ZWYsvOTYigBYoHMpFOyoA","Forever Melancholia","I Hate Models",421559,["artist:i-hate-models"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d814b9198f206e15d080a","2026-10-30-official-playlist",null],
    ["71lvGzvRiC58AeFffFmw3N","Bass Rider","Sidney Charles",225454,["artist:sidney-charles"],"https://open.spotify.com/embed/artist/0J6ZEXmLQfZMeHBoa4JZTH","https://app.notion.com/p/4090e646ca0d8165ac7bc39b410048fb","2026-10-30-three-before-five",3],
    ["73dPS5EDSbo40IdutOvhJ6","SPARK","LAYZ",142400,["artist:layz"],"https://open.spotify.com/embed/artist/2ozQcs5XxFaj5fvA02zhwo","https://app.notion.com/p/4090e646ca0d81a28621c2b4e3fc687e","2026-10-30-three-before-five",3],
    ["76Lq3l4TEzt2javAjXezAr","Different Side","Michael Bibi, KinAhau, Audio Bullys",193710,["artist:kinahau"],"https://open.spotify.com/embed/artist/3C7Tv0IqIGLjA9rpVaeHRB","https://app.notion.com/p/4090e646ca0d81c6bd90ec4f51ae9bfd","2026-10-30-three-before-five",2],
    ["775PftjfvN07kkNA04F4J8","STROB3","M81!, ORV",204800,["artist:m81"],"https://open.spotify.com/embed/artist/3bE8ejTzBABjsWxbDhUSRv","https://app.notion.com/p/4090e646ca0d81af85f6ff8e43f20e01","2026-10-30-three-before-five",1],
    ["77tLqaiLioNxEex0BsVFEE","Frontin'","Chef Boyarbeatz, MYTHM",226285,["artist:chef-boyarbeatz"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d814681fffdc7abaa1a16","2026-10-30-official-playlist",null],
    ["77WI2HaRmm2no6NqSA3G2c","Take It All","Subsonic, Stealth",226206,["artist:subsonic"],"https://open.spotify.com/embed/artist/4D6frglSGSAHoK7W5rp92j","https://app.notion.com/p/4090e646ca0d8136bab7f4c5e8326b55","2026-10-30-three-before-five",3],
    ["79BY6QNQu7FeL6DnaKu5wT","Take Me (To The Moon)","Ian Asher, D A N N Y",158629,["artist:ian-asher"],"https://open.spotify.com/embed/artist/5IrxhrMyvZxzgPYrC9j2km","https://app.notion.com/p/4090e646ca0d813fb9f9c96a84e1923f","2026-10-30-three-before-five",3],
    ["7AlemQMHpofDh4RPlWGada","ECHOES","Ravenscoon, Hex Cougar",225000,["artist:ravenscoon"],"https://open.spotify.com/embed/artist/7vfvYuEyJbh1Tf3QlOTAmZ","https://app.notion.com/p/4090e646ca0d813b9f63cbb962c0ddf5","2026-10-30-three-before-five",2],
    ["7BhmwvCdQZNwuQXSHw5TzP","Headlights (feat. KIDDO)","Alok, Alan Walker, KIDDO",158400,["artist:alan-walker","artist:alok"],"https://open.spotify.com/embed/artist/0NGAZxHanS9e0iNHpR8f2W","https://app.notion.com/p/4090e646ca0d81da8f08e46c2a2190b6","2026-10-30-three-before-five",2],
    ["7C9Bcp8XgBqdetAyvp5Vms","Superrich","Alok, me n ü, Ten Fé",179000,["artist:alok","artist:me-n-u"],"https://open.spotify.com/embed/artist/1hqo0TnaWxL6jVm0wdzi9f","https://app.notion.com/p/4090e646ca0d815daee1e49755722522","2026-10-30-three-before-five",3],
    ["7CpaMI2EEklDbPXRkc4ocR","She Lyin'","Malóne Morez, Monoky, Ali Story",160162,["artist:monoky"],"https://open.spotify.com/embed/artist/35fqprYtwqebSkrjHVXfxw","https://app.notion.com/p/4090e646ca0d8166ad1df4cdbafa52a1","2026-10-30-three-before-five",1],
    ["7dYWuswcYTfETp2NxUqpRn","Gangsta's Paradise","Coolio, HOLY PRIEST, 1 World",168000,["artist:holy-priest"],"https://open.spotify.com/embed/artist/5UG2ipdnA4vk8Eevkf1s06","https://app.notion.com/p/4090e646ca0d81c2adabf3edcb13050e","2026-10-30-three-before-five",2],
    ["7dZYflC0DNtTZm3DwnryUH","Think About Me - JNJS Remix","Natalia Roth, Mai iachetti, JNJS",348653,["artist:mai-iachetti"],"https://open.spotify.com/embed/artist/575TgodOOhMtSqhGYNWAeh","https://app.notion.com/p/4090e646ca0d814b96c5cbee8606b15c","2026-10-30-three-before-five",3],
    ["7eHjjHvs8kbYKtVAVySLzw","Botega Vendeta","ChaseWest, Mandragora",285112,["artist:chasewest"],"https://open.spotify.com/embed/artist/4770WxUOyJMOJ1CHiZi2d6","https://app.notion.com/p/4090e646ca0d81589776f1b67dac971f","2026-10-30-three-before-five",2],
    ["7Ei2LsA34MJPITPv72dvZw","Heaven","Alison Wonderland, Ninajirachi",205693,["artist:alison-wonderland"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81e682d6f495cc8e6544","2026-10-30-official-playlist",null],
    ["7F1CiKqrY44kh5cDqwHOnx","Love Is Gone - Acoustic","SLANDER, Dylan Matthew",176971,["artist:slander"],"https://open.spotify.com/embed/artist/20DZAfCuP1TKZl5KcY7z3Q","https://app.notion.com/p/4090e646ca0d813ebecddc35c5627282","2026-10-30-three-before-five",2],
    ["7hBUvEg6V9TQPZgLie2krb","SEE YOU DROP","Ray Volpe",157600,["artist:ray-volpe"],"https://open.spotify.com/embed/artist/2K9qsrYnsu1EWt7ZQkkuXb","https://app.notion.com/p/4090e646ca0d813c8b4ef867a939c870","2026-10-30-three-before-five",2],
    ["7hFfVcwHyNWVTbLCdT4wnz","Dance In The Light","Nico Moreno, Sarah de Warren",230886,["artist:nico-moreno"],"https://open.spotify.com/embed/artist/6fjhNhp9IoeiZpEXq9AT2S","https://app.notion.com/p/4090e646ca0d819dacf0df30a78914f8","2026-10-30-three-before-five",3],
    ["7IoTUnyyvbMEY2UuE2Tmsx","Make Believe","Luke Dean, Omar+",185000,["artist:luke-dean","artist:omar-plus"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d813f944af1028e7d40a8","2026-10-30-official-playlist",null],
    ["7Kmo4UQ5Co6tqtysQcLkpF","set me free","Aaron Hibell, Alex Wann",218360,["artist:aaron-hibell"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81269316f4e0fda756b4","2026-10-30-official-playlist",null],
    ["7kMUrgcLuIv7ODffVw27FQ","REWIND","Ray Volpe, Sullivan King",198800,["artist:ray-volpe"],"https://open.spotify.com/embed/artist/2K9qsrYnsu1EWt7ZQkkuXb","https://app.notion.com/p/4090e646ca0d81a78663c9d702cd599f","2026-10-30-three-before-five",3],
    ["7m47Go71qTMBs4kTH7U8F8","Pursuit Of Happiness - Extended Steve Aoki Remix","Kid Cudi, MGMT, Ratatat, Steve Aoki",373546,["artist:steve-aoki"],"https://open.spotify.com/embed/artist/77AiFEVeAVj2ORpC85QVJs","https://app.notion.com/p/4090e646ca0d817eaa03c23d4b4273f5","2026-10-30-three-before-five",3],
    ["7ml6mms5SS6qahrXMYWSVw","CLOSE YOUR EYES","San Holo",208965,["artist:san-holo"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81cfa4d0c12b86ed4334","2026-10-30-official-playlist",null],
    ["7MLitWCZt9WDukjo066SfF","Orgasmic - Sloth Remix","WonkyWilla, Sloth",149677,["artist:sloth"],"https://open.spotify.com/embed/artist/2R8PPmEGSs8qYtV7qlHjt4","https://app.notion.com/p/4090e646ca0d81648acde1e2111f3add","2026-10-30-three-before-five",3],
    ["7uSupgnScNSahebyEiRitY","FULL SEND","Jantsen, Ravenscoon",211862,["artist:ravenscoon"],"https://open.spotify.com/embed/artist/7vfvYuEyJbh1Tf3QlOTAmZ","https://app.notion.com/p/4090e646ca0d810fb442c32f6ef3dec2","2026-10-30-three-before-five",3],
    ["7wuRzfIdxpcqrCjYqNm0k2","Wanna Go","Phrva",138857,["artist:phrva"],"https://open.spotify.com/embed/artist/2gUjbFSv34ZRVw5qkwKTO7","https://app.notion.com/p/4090e646ca0d8189a990d9ed23a03a72","2026-10-30-three-before-five",3],
    ["7yG1WnAViThzokX5FLL24v","METAVERSO","Adrian Mills, Pablo185",213525,["artist:adrian-mills"],"https://open.spotify.com/playlist/31JmJV1ZZCGX2ZmeWKI1Hg","https://app.notion.com/p/4090e646ca0d81c69496f41f636c3cdd","2026-10-30-official-playlist",null]
  ]
}
```
