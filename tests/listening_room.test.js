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

test("music availability filter shows only acts with tracks and survives shared links", () => {
  const ctx = { day: "all", q: "", stage: "", tracksOnly: true };
  const rows = L.filterLineup(idx, ctx);
  assert.ok(rows.length > 0 && rows.length < 130);
  assert.ok(rows.every(p => L.songCount(p, idx) > 0));
  assert.deepEqual(L.parseHash(L.buildHash("lineup", ctx)).ctx, ctx);
  assert.equal(L.filterLineup(idx, { ...ctx, q: "allnightkev" }).length, 0);
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

test("route state round-trips so Back preserves search and day", () => {
  const ctx = { day: "2026-11-07", q: "acraze b2b", stage: "", tracksOnly: true };
  const h = L.buildHash("artist", ctx, "edco26:2026-11-07:x y");
  const r = L.parseHash(h);
  assert.equal(r.view, "artist");
  assert.equal(r.id, "edco26:2026-11-07:x y");
  assert.deepEqual(r.ctx, ctx);
  assert.equal(L.parseHash(L.buildHash("lineup", ctx)).ctx.q, "acraze b2b");
  assert.equal(L.parseHash("#/lineup?day=bogus").ctx.day, "all");
  assert.equal(L.parseHash("").view, "lineup");
});

test("playlist link requires published + cross-account verification", () => {
  const url = "https://www.youtube.com/playlist?list=PLx";
  assert.equal(L.validPlaylistUrl({ status: "pending_authorization", url: null }), null);
  assert.equal(L.validPlaylistUrl({ status: "published", url, verified_cross_account: false }), null);
  assert.equal(L.validPlaylistUrl({ status: "published", url, verified_cross_account: true }), url);
});

test("malformed route escapes recover to lineup", () => { assert.equal(L.parseHash("#/artist/%").view, "lineup"); });
