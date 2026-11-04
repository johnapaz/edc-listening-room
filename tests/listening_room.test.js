"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../listening-room/lib.js");

const rd = p => JSON.parse(fs.readFileSync(path.join(__dirname, "..", p), "utf8"));
const idx = L.index({
  performances: rd("data/edco-2026/current-lineup.json").performances,
  artists: rd("data/edco-2026/artists.json").artists,
  stages: rd("data/edco-2026/venues.json").stages,
  songs: rd("data/listening-room/songs.json").songs
});
const names = rows => rows.map(p => p.display_name);

test("day filters return only that day and All returns the full lineup", () => {
  assert.equal(L.filterLineup(idx, { day: "all", q: "" }).length, 130);
  for (const d of ["2026-11-06", "2026-11-07", "2026-11-08"]) {
    const rows = L.filterLineup(idx, { day: d, q: "" });
    assert.equal(rows.length, d === "2026-11-08" ? 44 : 43);
    assert.ok(rows.every(p => p.event_date === d));
  }
});

test("search ignores accents and case and finds B2B billings by either artist", () => {
  assert.ok(names(L.filterLineup(idx, { day: "all", q: "ACRAZE" })).includes("ACRAZE B2B CID"));
  assert.ok(names(L.filterLineup(idx, { day: "all", q: "cid" })).includes("ACRAZE B2B CID"));
  assert.ok(names(L.filterLineup(idx, { day: "all", q: "vastive benda" })).includes("Benda B2B Vastive"));
  assert.equal(L.normalize("Gryffin Éclair"), "gryffin eclair");
  const accented = idx.performances.find(p => /[^\u0000-\u007f]/.test(p.display_name));
  if (accented) assert.ok(L.filterLineup(idx, { day: "all", q: L.normalize(accented.display_name) }).length >= 1);
});

test("search and day combine; no match gives an empty list", () => {
  const sat = L.filterLineup(idx, { day: "2026-11-07", q: "acraze" });
  assert.ok(sat.every(p => p.event_date === "2026-11-07"));
  assert.equal(L.filterLineup(idx, { day: "all", q: "zzzzqqq" }).length, 0);
});

test("days default to the festival day in Eastern Time, else Friday", () => {
  assert.equal(L.defaultDay(new Date("2026-10-31T12:00:00-04:00")), "2026-11-06");
  assert.equal(L.defaultDay(new Date("2026-11-07T23:30:00-05:00")), "2026-11-07");
  assert.equal(L.defaultDay(new Date("2026-11-08T03:00:00Z")), "2026-11-07");
  assert.equal(L.defaultDay(new Date("2026-11-12T12:00:00-05:00")), "2026-11-06");
  const before = new Date("2026-10-31T12:00:00-04:00");
  assert.equal(L.parseHash("#/lineup", before).ctx.day, "2026-11-06");
  assert.equal(L.parseHash("#/lineup?day=all", before).ctx.day, "2026-11-06");
  assert.equal(L.parseHash("#/lineup?day=2026-11-08", before).ctx.day, "2026-11-08");
});

test("By time sorts on poster start times with unknown times last; A-Z sorts by name", () => {
  const fri = L.filterLineup(idx, { day: "2026-11-06", q: "" });
  const byTime = L.sortRows(fri, "time");
  const timed = byTime.filter(p => p.starts_at);
  assert.ok(timed.length > 10);
  for (let i = 1; i < timed.length; i++) assert.ok(Date.parse(timed[i - 1].starts_at) <= Date.parse(timed[i].starts_at));
  assert.ok(byTime.slice(timed.length).every(p => !p.starts_at), "untimed acts come last");
  const az = names(L.sortRows(fri, "az"));
  assert.deepEqual(az, az.slice().sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  assert.equal(L.sortRows(fri, "time").length, fri.length);
  assert.notStrictEqual(L.sortRows(fri, "az"), fri, "sorting never mutates the filtered list");
});

test("liked filter round-trips in the Tracks route without affecting default routes", () => {
  const ctx = L.parseHash("#/listen?liked=1&tday=2026-11-07&tq=house").ctx;
  assert.equal(ctx.liked, true);
  assert.equal(ctx.tday, "2026-11-07");
  assert.equal(ctx.tq, "house");
  assert.equal(L.parseHash(L.buildHash("listen", ctx)).ctx.liked, true);
  assert.equal(L.parseHash("#/listen").ctx.liked, undefined);
});

test("lineup and Tracks searches are separate route state", () => {
  const ctx = { day: "2026-11-07", sort: "time", q: "acraze", tq: "carry you", tday: "2026-11-08", stage: "" };
  const r = L.parseHash(L.buildHash("listen", ctx));
  assert.equal(r.ctx.q, "acraze");
  assert.equal(r.ctx.tq, "carry you");
  assert.equal(r.ctx.tday, "2026-11-08");
  assert.equal(L.parseHash("#/lineup?music=1").ctx.tracksOnly, undefined, "retired filter is ignored");
});

test("B2B performance exposes songs from each credited artist", () => {
  const p = idx.performances.find(x => x.display_name === "ACRAZE B2B CID");
  const groups = L.songGroups(p, idx);
  assert.equal(groups.length, 2);
  assert.ok(L.songCount(p, idx) >= 2);
});

test("collaborations appear under each credited artist and once in the catalog", () => {
  assert.ok(idx.songs.length >= 50);
  assert.ok(idx.songsByArtist.size >= 32);
  for (const ids of [["artist:slander", "artist:vastive"], ["artist:kaskade", "artist:wooli"], ["artist:luke-dean", "artist:omar-plus"]]) {
    const shared = idx.songs.filter(s => ids.every(id => s.artist_ids.includes(id)));
    assert.ok(shared.length > 0, ids.join(" / "));
    shared.forEach(s => ids.forEach(id => assert.ok(idx.songsByArtist.get(id).includes(s))));
  }
  const duplicate = L.index({ performances: [], artists: [...idx.artists.values()], songs: [idx.songs[0], idx.songs[0]] });
  assert.equal(duplicate.songs.length, 1);
  const joint = idx.songs.find(s => s.title === "Back It Up");
  assert.equal(L.songCount({ artist_ids: joint.artist_ids }, idx), new Set(L.songGroups({ artist_ids: joint.artist_ids }, idx).flatMap(g => g.songs.map(s => s.video_id))).size);
});

test("only reviewed direct YouTube video URLs are exposed", () => {
  for (const songs of idx.songsByArtist.values())
    for (const s of songs) assert.match(s.url, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  assert.equal(L.safeYoutubeUrl("javascript:alert(1)"), null);
  assert.equal(L.safeYoutubeUrl("https://evil.example/watch?v=x"), null);
  assert.equal(L.safeYoutubeUrl("http://www.youtube.com/watch?v=x"), null);
});

test("unscheduled billings are explicitly unknown; conflicts are flagged", () => {
  const plain = { schedule_status: "unknown", stage_id: null, starts_at: null, ends_at: null, lineup_status: "official_day_confirmed" };
  assert.equal(L.scheduleState(plain, idx).kind, "unknown");
  const conflict = { ...plain, lineup_status: "official_sources_conflict" };
  assert.equal(L.scheduleState(conflict, idx).kind, "conflict");
});

test("poster-transcribed times carry a caveat; only verified times are plain facts", () => {
  const stages = new Map([["kinetic-field", { display_name: "kineticFIELD" }]]);
  const fake = { ...idx, stages };
  const base = { lineup_status: "official_day_confirmed", stage_id: "kinetic-field",
    starts_at: "2026-11-06T20:00:00-05:00", ends_at: "2026-11-06T21:00:00-05:00" };
  const fmt = () => "8:00 PM";
  assert.equal(L.scheduleState({ ...base, schedule_status: "verified" }, fake, fmt).kind, "verified");
  const u = L.scheduleState({ ...base, schedule_status: "poster_transcribed" }, fake, fmt);
  assert.equal(u.kind, "unconfirmed");
  assert.match(u.text, /not yet cross-checked/);
});

test("stage filter and options only use verified schedule data", () => {
  assert.equal(L.stageOptions(idx).length, 0);
  const rows = [{ performance_id: "a", event_date: "2026-11-06", source_order: 1, display_name: "X", artist_ids: [], stage_id: "s", schedule_status: "poster_transcribed" },
    { performance_id: "b", event_date: "2026-11-06", source_order: 2, display_name: "Y", artist_ids: [], stage_id: "s", schedule_status: "verified" }];
  const i2 = L.index({ performances: rows, artists: [], stages: [{ stage_id: "s", display_name: "S" }], songs: [] });
  assert.equal(L.stageOptions(i2).length, 1);
  assert.deepEqual(names(L.filterLineup(i2, { day: "all", q: "", stage: "s" })), ["Y"]);
});

test("route state round-trips so Back preserves search, day and sort", () => {
  const ctx = { day: "2026-11-07", sort: "az", q: "acraze b2b", tq: "", tday: "all", stage: "" };
  const h = L.buildHash("artist", ctx, "edco26:2026-11-07:x y");
  const r = L.parseHash(h);
  assert.equal(r.view, "artist");
  assert.equal(r.id, "edco26:2026-11-07:x y");
  assert.deepEqual(r.ctx, ctx);
  assert.equal(L.parseHash(L.buildHash("lineup", ctx)).ctx.q, "acraze b2b");
  assert.equal(L.parseHash("#/lineup?day=bogus", new Date("2026-10-31T12:00:00-04:00")).ctx.day, "2026-11-06");
  assert.equal(L.parseHash("#/lineup?sort=bogus").ctx.sort, "time");
  assert.equal(L.parseHash("").view, "lineup");
});

test("playlist link requires published + cross-account verification", () => {
  const url = "https://www.youtube.com/playlist?list=PLx";
  assert.equal(L.validPlaylistUrl({ status: "pending_authorization", url: null }), null);
  assert.equal(L.validPlaylistUrl({ status: "published", url, verified_cross_account: false }), null);
  assert.equal(L.validPlaylistUrl({ status: "published", url, verified_cross_account: true }), url);
});

test("malformed route escapes recover to lineup", () => { assert.equal(L.parseHash("#/artist/%").view, "lineup"); });

test("Spotify links are exact open.spotify.com tracks or playlists, and nothing else", () => {
  const track = "https://open.spotify.com/track/6gLDnzjpM0AwOeh9NmmHE0";
  assert.equal(L.safeSpotifyUrl(track, "track"), track);
  assert.equal(L.safeSpotifyUrl(track, "playlist"), null);
  for (const bad of ["javascript:alert(1)", "http://open.spotify.com/track/6gLDnzjpM0AwOeh9NmmHE0", "https://open.spotify.com/track/6gLDnzjpM0AwOeh9NmmHE0?si=x",
    "https://evil.example/open.spotify.com/track/6gLDnzjpM0AwOeh9NmmHE0", "spotify:track:6gLDnzjpM0AwOeh9NmmHE0", null, undefined])
    assert.equal(L.safeSpotifyUrl(bad), null);
  const pl = rd("data/listening-room/playlist.json");
  assert.equal(L.officialSpotifyPlaylist(pl).url, pl.official_spotify.url);
  assert.equal(L.officialSpotifyPlaylist({ official_spotify: { url: track } }), null);
  assert.equal(L.officialSpotifyPlaylist({}), null);
  const linked = rd("data/listening-room/songs.json").songs.filter(s => s.spotify_url);
  assert.ok(linked.length > 0);
  linked.forEach(s => assert.equal(L.safeSpotifyUrl(s.spotify_url, "track"), s.spotify_url));
});



test("Play all queues each exact reviewed video once, with breadth before depth", () => {
  const P = require("../listening-room/player.js");
  const rows = rd("data/listening-room/songs.json").songs;
  const queue = P.buildQueue(rows);
  assert.equal(queue.length, rows.length, "the whole reviewed catalog is queued");
  assert.equal(new Set(queue.map(s => s.video_id)).size, queue.length);
  assert.deepEqual(new Set(queue.map(s => s.video_id)), new Set(rows.map(s => s.video_id)));
  const artists = new Set(rows.map(s => s.artist_ids[0]));
  const firstTurn = queue.slice(0, artists.size).map(s => rows.find(r => r.video_id === s.video_id).artist_ids[0]);
  assert.equal(new Set(firstTurn).size, artists.size, "one lead artist each before second turns");
  const url = P.embedUrl(queue);
  assert.ok(url.startsWith("https://www.youtube-nocookie.com/embed/" + queue[0].video_id));
  assert.ok(url.includes("playlist=" + queue[0].video_id));
  assert.equal(P.embedUrl([]), null);
  assert.equal(P.buildQueue([...rows, rows[0], { video_id: "javascript:1", url: "javascript:1" }]).length, rows.length);
});

test("day mixes use currently billed artist identities with no duplicate videos", () => {
  const P = require("../listening-room/player.js");
  const rows = rd("data/listening-room/songs.json").songs;
  const perfs = rd("data/edco-2026/current-lineup.json").performances;
  const artists = rd("data/edco-2026/artists.json").artists;
  const all = P.buildQueue(rows, perfs, artists, "all");
  assert.equal(all.length, 295);
  for (const [day, expected] of [["2026-11-06", 98], ["2026-11-07", 100], ["2026-11-08", 115]]) {
    const queue = P.buildQueue(rows, perfs, artists, day);
    const eligible = new Set(perfs.filter(p => p.event_date === day).flatMap(p => p.artist_ids));
    const videos = rows.filter(s => s.artist_ids.some(id => eligible.has(id)));
    assert.equal(queue.length, expected, day);
    assert.equal(new Set(queue.map(s => s.video_id)).size, queue.length, "no duplicate videos");
    assert.deepEqual(new Set(queue.map(s => s.video_id)), new Set(videos.map(s => s.video_id)), day);
    assert.ok(queue.every(s => s.artist && s.title && s.artist.indexOf("undefined") === -1));
  }
  assert.equal(P.buildQueue(rows, perfs, artists, "not-a-day").length, all.length);
});

test("multi-day artists and B2B collaborations appear in each eligible day only once", () => {
  const P = require("../listening-room/player.js");
  const ids = ["12345678901", "abcdefghijk", "FGHIJKLMN01"];
  const songs = [
    { video_id: ids[0], url: "https://www.youtube.com/watch?v=" + ids[0], title: "Together", artist_ids: ["a", "b"] },
    { video_id: ids[1], url: "https://www.youtube.com/watch?v=" + ids[1], title: "Other", artist_ids: ["c"] },
    { video_id: ids[2], url: "https://www.youtube.com/watch?v=" + ids[2], title: "Solo", artist_ids: ["a"] },
    { video_id: ids[0], url: "https://www.youtube.com/watch?v=" + ids[0], title: "Duplicate", artist_ids: ["a", "b"] }
  ];
  const perfs = [
    { event_date: "2026-11-06", artist_ids: ["a", "b"] },
    { event_date: "2026-11-07", artist_ids: ["b", "c"] },
    { event_date: "2026-11-08", artist_ids: ["a"] }
  ];
  const artists = ["a", "b", "c"].map(artist_id => ({ artist_id, display_name: artist_id.toUpperCase() }));
  assert.deepEqual(P.buildQueue(songs, perfs, artists, "2026-11-06").map(x => x.video_id), [ids[0], ids[2]]);
  assert.deepEqual(P.buildQueue(songs, perfs, artists, "2026-11-07").map(x => x.video_id), [ids[0], ids[1]]);
  assert.deepEqual(P.buildQueue(songs, perfs, artists, "2026-11-08").map(x => x.video_id), [ids[0], ids[2]]);
});

test("shuffle preserves every song and start-at selection does not mutate queue", () => {
  const P = require("../listening-room/player.js");
  const source = P.buildQueue(rd("data/listening-room/songs.json").songs);
  const baseline = source.map(s => s.video_id);
  const randomized = P.shuffleQueue(source, () => 0);
  assert.equal(randomized.length, source.length);
  assert.notDeepEqual(randomized.map(s => s.video_id), baseline);
  assert.deepEqual(new Set(randomized.map(s => s.video_id)), new Set(baseline));
  assert.deepEqual(source.map(s => s.video_id), baseline);
  const url = P.embedUrl(source, 2);
  assert.ok(url.startsWith("https://www.youtube-nocookie.com/embed/" + source[2].video_id));
  assert.ok(url.includes("playlist=" + source[2].video_id));
  for (const n of [-1, source.length, 1.5]) assert.equal(P.embedUrl(source, n), null);
});
