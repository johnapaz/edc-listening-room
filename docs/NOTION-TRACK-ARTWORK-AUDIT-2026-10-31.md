# Notion verification and track/artwork delivery — 2026-10-31

John authorized publishing the prepared material to `johnapaz/edc-listening-room` and the changes required to put tracks in the live app: “Yes, go for it, and you're authorized to make the changes needed to deliver what was asked.” This supersedes the earlier data-only handoff and permits source-reviewed inclusion without pretending it is personal playback.

The catalog now contains **50 distinct videos across 32 credited lineup artists**, including 38 newly source-reviewed tracks. Every new recording has a checked provider artwork URL. The app indexes collaborations under each credited artist, while the Tracks list, featured cards and totals deduplicate recordings. All credited artist names remain links. The original 12 approved preview records remain intact.

The source-review manifest records explicit publication authorization and marks the batch eligible for public export. Its human/owner-playback/YouTube-Music-playback flags remain false. The exporter rejects invalid or inactive credits, malformed video/artwork URLs, duplicate videos and unchecked records. Unapproved candidates and private discovery state remain excluded. The About pages explain the two review histories accurately.

No playlist was created or made public, and no YouTube Data API call, paid service or infrastructure change was required.

## Verified lineup and Notion state

- Read every active Artists row (100 + 37), every active Tracks row (100 + 100 + 100 + 64), both current Notion guide pages, and the live organizer page at https://orlando.edc.com/lineup/ on October 31.
- The live organizer day lists match the repository's October 31 snapshot and current projection: 43 Friday, 43 Saturday, 44 Sunday; 130 appearances, 127 unique billings.
- Expanding the eight B2B billings, Fury/MC Dino, and Skull Machine's two explicitly named members, while excluding the Discovery Project program slot, yields exactly 137 people/act rows. Notion contains exactly those 137: **zero missing, zero extra, zero duplicate stable IDs, zero wrong day assignments**. Named project members are not additional solo bookings.
- Notion has **364 candidate rows, 325 distinct nonempty Spotify IDs, no duplicate Spotify IDs, and 120 artists at three-plus candidates**. MC Dino is a non-musical credit. Source capture is not exact-recording, identity, ranking, or playback approval. No score or owner decision was invented.
- Performances still holds six pilot appearances, and the Genres database remains unpopulated according to the current guide. This is not a complete relational festival schedule.
- SQL/rows quota ran out after the initial reads; complete verification used the existing unfiltered saved views, with pagination through `has_more=false`. No trial, upgrade, paid service, or account change.

Full artist-by-artist audit: `data/listening-room/artist-lineup-audit-2026-10-31.csv`.

## Notion corrections and artwork

Removed dangling Max Dean relations from Not A Problem, Gets Like That and Can't Decide while retaining valid Luke Dean credits and all song/source records. Replaced unsupported cancellation claims with absence from the current official day lists. Added the 38 source-checked links as Review candidates, preserving Owner Review fields, for 50 linked rows total. Added covers to 50 song pages and 32 artist pages, with track attribution. The native YouTube links · review status view read back all 50 rows, including 38 Review rows, without further pagination.

## Validation

Existing Python, Node, reference, generated-catalog and public build checks are run before merge. Focused collaboration tests verify shared artist attribution, unique catalog counts and duplicate-video handling. The public build strips private sources and review manifests. Real-image browser verification and deployment evidence are recorded in the PR after release.

## Added source-reviewed batch

Every link below has a paired current provider artwork URL in the JSON. Metadata/source checked; human playback not asserted.

| Credited lineup artists | Track | Exact recording | Artwork |
|---|---|---|---|
| Azzecca | Other Side | [Video](https://www.youtube.com/watch?v=xX8vYFSV6ek) | [Artwork](https://img.youtube.com/vi/xX8vYFSV6ek/mqdefault.jpg) |
| Azzecca | oh my yuma! | [Video](https://www.youtube.com/watch?v=QGR2oJ8lr2E) | [Artwork](https://img.youtube.com/vi/QGR2oJ8lr2E/mqdefault.jpg) |
| SLANDER, Vastive | Under My Skin | [Video](https://www.youtube.com/watch?v=kYP_jbcd3Q8) | [Artwork](https://img.youtube.com/vi/kYP_jbcd3Q8/mqdefault.jpg) |
| Big Florida | RIDE | [Video](https://www.youtube.com/watch?v=0oAc2uiyOeY) | [Artwork](https://img.youtube.com/vi/0oAc2uiyOeY/mqdefault.jpg) |
| Bou | Closer | [Video](https://www.youtube.com/watch?v=F6BU1_R64oM) | [Artwork](https://img.youtube.com/vi/F6BU1_R64oM/mqdefault.jpg) |
| Brunello | Ghost Dance | [Video](https://www.youtube.com/watch?v=irDsRokzylg) | [Artwork](https://img.youtube.com/vi/irDsRokzylg/mqdefault.jpg) |
| Brunello | Science Fiction | [Video](https://www.youtube.com/watch?v=7CUTn0q-j0w) | [Artwork](https://img.youtube.com/vi/7CUTn0q-j0w/mqdefault.jpg) |
| Brunello | Illusions | [Video](https://www.youtube.com/watch?v=A_M-v_qsIJI) | [Artwork](https://img.youtube.com/vi/A_M-v_qsIJI/mqdefault.jpg) |
| Bullet Tooth | A Place You Wanna Go (Good Life) | [Video](https://www.youtube.com/watch?v=gBBfvLjtDGE) | [Artwork](https://img.youtube.com/vi/gBBfvLjtDGE/mqdefault.jpg) |
| Sidney Charles | Hyper Rave | [Video](https://www.youtube.com/watch?v=M59_URXeNlc) | [Artwork](https://img.youtube.com/vi/M59_URXeNlc/mqdefault.jpg) |
| Sidney Charles | Bass Rider | [Video](https://www.youtube.com/watch?v=Eg6P3j5wIzY) | [Artwork](https://img.youtube.com/vi/Eg6P3j5wIzY/mqdefault.jpg) |
| Chris Lorenzo | In This Bih' | [Video](https://www.youtube.com/watch?v=TbYk1ib8CA8) | [Artwork](https://img.youtube.com/vi/TbYk1ib8CA8/mqdefault.jpg) |
| Chris Lorenzo | California Dreamin' (feat. High Jinx) | [Video](https://www.youtube.com/watch?v=aNggrPAi5dg) | [Artwork](https://img.youtube.com/vi/aNggrPAi5dg/mqdefault.jpg) |
| HAYLA, Kaskade | Escape (feat. Hayla) | [Video](https://www.youtube.com/watch?v=BMFNN40fNp0) | [Artwork](https://img.youtube.com/vi/BMFNN40fNp0/mqdefault.jpg) |
| HAYLA | Where You Are | [Video](https://www.youtube.com/watch?v=5BqjhUmldDc) | [Artwork](https://img.youtube.com/vi/5BqjhUmldDc/mqdefault.jpg) |
| IDEMI | Reflections | [Video](https://www.youtube.com/watch?v=-899-ptNSXo) | [Artwork](https://img.youtube.com/vi/-899-ptNSXo/mqdefault.jpg) |
| Interplanetary Criminal | Yosemite | [Video](https://www.youtube.com/watch?v=ZDJdynqu-i4) | [Artwork](https://img.youtube.com/vi/ZDJdynqu-i4/mqdefault.jpg) |
| Josh Baker | My Place | [Video](https://www.youtube.com/watch?v=iUzi0PHB1sY) | [Artwork](https://img.youtube.com/vi/iUzi0PHB1sY/mqdefault.jpg) |
| Josh Baker, Omar+ | Back It Up | [Video](https://www.youtube.com/watch?v=Ls76ISA-4hc) | [Artwork](https://img.youtube.com/vi/Ls76ISA-4hc/mqdefault.jpg) |
| Joshwa | My Humps | [Video](https://www.youtube.com/watch?v=TOlDFkiVLdw) | [Artwork](https://img.youtube.com/vi/TOlDFkiVLdw/mqdefault.jpg) |
| KREAM | Arrival | [Video](https://www.youtube.com/watch?v=zGO142zWkIs) | [Artwork](https://img.youtube.com/vi/zGO142zWkIs/mqdefault.jpg) |
| Level Up | The Other Side | [Video](https://www.youtube.com/watch?v=Z1rnXaTV3ck) | [Artwork](https://img.youtube.com/vi/Z1rnXaTV3ck/mqdefault.jpg) |
| MALUGI | Honestly | [Video](https://www.youtube.com/watch?v=G7LVAtqPadU) | [Artwork](https://img.youtube.com/vi/G7LVAtqPadU/mqdefault.jpg) |
| MALUGI | Chiggy Chiggy (feat. Inéz) | [Video](https://www.youtube.com/watch?v=c-VZY0XxxtM) | [Artwork](https://img.youtube.com/vi/c-VZY0XxxtM/mqdefault.jpg) |
| MALUGI | Forever 2 (Crush Mix) - Malugi Remix | [Video](https://www.youtube.com/watch?v=ykY-5DZS_Ok) | [Artwork](https://img.youtube.com/vi/ykY-5DZS_Ok/mqdefault.jpg) |
| Luke Dean, Omar+ | Make Believe | [Video](https://www.youtube.com/watch?v=W7ThRlBDjfg) | [Artwork](https://img.youtube.com/vi/W7ThRlBDjfg/mqdefault.jpg) |
| Omar+ | Out Of My Mind | [Video](https://www.youtube.com/watch?v=RFXM4RrHCRU) | [Artwork](https://img.youtube.com/vi/RFXM4RrHCRU/mqdefault.jpg) |
| Bullet Tooth, Omar+ | Lose Control | [Video](https://www.youtube.com/watch?v=lfWqXksjQQQ) | [Artwork](https://img.youtube.com/vi/lfWqXksjQQQ/mqdefault.jpg) |
| Pegassi | Spectral Bells | [Video](https://www.youtube.com/watch?v=jBWLZ_GxWlg) | [Artwork](https://img.youtube.com/vi/jBWLZ_GxWlg/mqdefault.jpg) |
| Whethan | Swag Surfin' | [Video](https://www.youtube.com/watch?v=fcgr6PR9E60) | [Artwork](https://img.youtube.com/vi/fcgr6PR9E60/mqdefault.jpg) |
| Whethan | MONEY ON THE DASH - SPED UP | [Video](https://www.youtube.com/watch?v=5D597frOWhI) | [Artwork](https://img.youtube.com/vi/5D597frOWhI/mqdefault.jpg) |
| Kaskade, Wooli | Hear Me Now | [Video](https://www.youtube.com/watch?v=KWn5FkkuYwk) | [Artwork](https://img.youtube.com/vi/KWn5FkkuYwk/mqdefault.jpg) |
| Aaron Hibell | set me free | [Video](https://www.youtube.com/watch?v=Og0A10H7YqU) | [Artwork](https://img.youtube.com/vi/Og0A10H7YqU/mqdefault.jpg) |
| Aaron Hibell | i feel lost | [Video](https://www.youtube.com/watch?v=85-so5m3CMM) | [Artwork](https://img.youtube.com/vi/85-so5m3CMM/mqdefault.jpg) |
| Aaron Hibell | levitation | [Video](https://www.youtube.com/watch?v=RlmeqTs4i_w) | [Artwork](https://img.youtube.com/vi/RlmeqTs4i_w/mqdefault.jpg) |
| ALLEYCVT, Level Up | BELIEVE | [Video](https://www.youtube.com/watch?v=rht_fkVLk8I) | [Artwork](https://img.youtube.com/vi/rht_fkVLk8I/mqdefault.jpg) |
| ACRAZE | Take Me Away | [Video](https://www.youtube.com/watch?v=bVm0ygOuiNk) | [Artwork](https://img.youtube.com/vi/bVm0ygOuiNk/mqdefault.jpg) |
| ACRAZE | Heard It Like This | [Video](https://www.youtube.com/watch?v=UeqAebUWRQE) | [Artwork](https://img.youtube.com/vi/UeqAebUWRQE/mqdefault.jpg) |

## Validation

- Existing Python suite: 91 tests, one pre-existing Node-unavailable skip; all executed checks passed.
- Historical reference validator and explicit public artifact builder pass: 38 allowlisted public files, 130 current lineup appearances. The public build excludes this review queue and audit matrix.
- Independent comparisons: exact live day-list snapshot/projection equality; 137-row artist audit; 38 distinct recording keys and videos; active artist IDs; untouched false human/playback/public flags; exact paired video/artwork URLs; no Notion links or private playlist marker in the import JSON.
- Notion write responses: all 50 track-cover updates and all 32 artist-cover updates succeeded; original owner-review fields were not changed. Native view readback: 50 linked rows, 38 Review rows, no pagination remaining.
- Live production browser: current lineup/12-track copy and visible original thumbnail loading inspected. No new app deployment claimed.
