const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../companion/lib.js');
const read = n => JSON.parse(fs.readFileSync(path.join(__dirname, '../data/edco-2026/', n + '.json')));
const perf = read('current-lineup'), art = read('artists'), venues = read('venues');
const idx = C.createIndex(perf, art, venues, []);

test('All/Fri/Sat/Sun cover every current appearance without mutating authority', () => {
  const before = JSON.stringify(perf);
  assert.deepEqual(C.DAYS.map(d => C.query(idx, { day: d.key, stage: '' }).length), [130, 43, 43, 44]);
  assert.equal(JSON.stringify(perf), before);
});
test('every stage/day query is exclusive and chronological; missing stage remains discoverable', () => {
  for (const day of C.DAYS) for (const stage of idx.stages.values()) {
    const rows = C.query(idx, { day: day.key, stage: stage.stage_id });
    rows.forEach(p => { assert.equal(p.stage_id, stage.stage_id); assert.ok(day.key === 'all' || p.event_date === day.key); });
    for (let i = 1; i < rows.length; i++) assert.ok(C.chronological(rows[i - 1], rows[i]) <= 0);
  }
  assert.equal(C.query(idx, { day: 'all', stage: C.UNKNOWN_STAGE }).length, 23);
  assert.equal(C.query(idx, { day: 'all', stage: 'casa-bacardi' }).length, 0);
});
test('sorting uses clock timestamps, preserves next-day midnight and puts unknowns after sourced rows per day', () => {
  const known = idx.performances.find(C.hasTime);
  const rows = [{ ...known, performance_id: 'late', starts_at: '2026-11-06T23:00:00-05:00', ends_at: '2026-11-07T00:00:00-05:00' },
    { ...known, performance_id: 'early', starts_at: '2026-11-06T13:00:00-05:00', ends_at: '2026-11-06T14:00:00-05:00' },
    { ...known, performance_id: 'unknown', starts_at: null, ends_at: null }].sort(C.chronological);
  assert.deepEqual(rows.map(p => p.performance_id), ['early', 'late', 'unknown']);
  assert.match(C.timeLabel(rows[1]), /11:00 PM–12:00 AM \(ends next day\)/);
  assert.equal(C.timeLabel(rows[2]), 'Time unknown');
});
test('day transition retains stage and navigation context', () => {
  const state = { view: 'explore', day: '2026-11-06', stage: 'kinetic-field' };
  const saturday = C.transition(state, { type: 'day', day: '2026-11-07' });
  assert.equal(saturday.stage, 'kinetic-field'); assert.equal(saturday.day, '2026-11-07');
  const artist = C.transition(saturday, { type: 'artist', id: 'artist:cid' });
  assert.deepEqual(C.parseHash(C.buildHash(artist)), artist);
  const back = C.transition(artist, { type: 'back' });
  assert.equal(back.day, saturday.day); assert.equal(back.stage, saturday.stage); assert.equal(back.view, 'explore');
});
test('stage transition preserves day and clears artist identity', () => {
  const state = C.transition({ view: 'artist', id: 'artist:cid', day: '2026-11-07', stage: '' }, { type: 'stage', stage: 'neon-garden' });
  assert.equal(state.day, '2026-11-07'); assert.equal(state.id, undefined); assert.equal(state.view, 'explore');
});
test('B2B is one performance with individual artist links and stable Listening Room targets', () => {
  const row = idx.performances.find(p => p.display_name === 'ACRAZE B2B CID');
  assert.equal(row.performance_type, 'b2b'); assert.equal(row.artist_ids.length, 2);
  assert.equal(idx.performances.filter(p => p.performance_id === row.performance_id).length, 1);
  row.artist_ids.forEach(id => assert.match(C.listeningHref(id, { day: row.event_date }), new RegExp('/listening-room/#/artist/' + encodeURIComponent(id))));
  assert.match(C.listeningHref(row.performance_id, { day: row.event_date }), /edco26%3A2026-11-07%3Aacraze-b2b-cid/);
});
test('unknown/disputed/unsourced timestamps cannot become a sourced running order', () => {
  const row = idx.performances.find(C.hasTime);
  assert.equal(C.hasTime({ ...row, source_ids: [] }), false);
  assert.equal(C.hasTime({ ...row, schedule_status: 'disputed' }), false);
  assert.equal(C.hasTime({ ...row, lineup_status: 'official_sources_conflict' }), false);
  assert.equal(C.hasTime({ ...row, ends_at: 'nope' }), false);
});
test('malformed route and data have deliberate unavailable states', () => {
  assert.equal(C.parseHash('#/artist/%E0%A4').view, 'invalid');
  assert.equal(C.parseHash('#/fake').view, 'invalid');
  assert.equal(C.parseHash('#/explore?day=nope').day, 'all');
  assert.throws(() => C.createIndex({ ...perf, schema_version: 99 }, art, venues, []), /Unsupported/);
  assert.throws(() => C.createIndex({ ...perf, performances: [...perf.performances, perf.performances[0]] }, art, venues, []), /Unsupported|Duplicate/);
});
test('geometry is absent until evidence is verified; normalized transform is resolution independent', () => {
  assert.deepEqual(C.hotspots(venues), []);
  const fixture = { stages: [{ stage_id: 'test-only', coordinates: { x: .25, y: .75, verification: 'verified', source_ids: ['test-fixture'], checked_on: '2026-10-31' } }], map: { geometry: { status: 'verified', coordinate_space: 'normalized-top-left' } } };
  const [point] = C.hotspots(fixture);
  assert.deepEqual(C.pointToPercent(point), { left: '25%', top: '75%' });
  fixture.stages[0].coordinates.x = NaN; assert.deepEqual(C.hotspots(fixture), []);
  fixture.stages[0].coordinates.x = 1.01; assert.deepEqual(C.hotspots(fixture), []);
});
test('dated reference warning uses Orlando calendar rather than user timezone', () => {
  assert.equal(C.freshnessWarning('2026-10-31', new Date('2026-11-06T04:59:00Z')), false);
  assert.equal(C.freshnessWarning('2026-10-31', new Date('2026-11-06T05:00:00Z')), true);
});

test('design-contract routes and legacy deep links parse to one canonical state', () => {
  const legacy = C.parseHash('#/explore?day=2026-11-07&stage=neon-garden');
  assert.deepEqual(C.parseHash('#/stage/neon-garden?day=2026-11-07'), legacy);
  assert.equal(C.buildHash(legacy), '#/explore?day=2026-11-07&stage=neon-garden');
  for (const view of ['stages', 'map', 'unscheduled', 'sources']) assert.equal(C.parseHash('#/' + view).view, view);
  assert.equal(C.parseHash('#/about').view, 'sources');
  assert.equal(C.parseHash('').view, 'stages'); assert.equal(C.parseHash('#/').view, 'stages'); assert.equal(C.parseHash('#/explore').view, 'explore');
  assert.equal(C.parseHash('#/stages/extra').view, 'invalid');
  assert.equal(C.parseHash('#/stage').view, 'invalid');
  assert.equal(C.buildHash({ view: 'unscheduled', day: '2026-11-08', stage: '' }), '#/unscheduled?day=2026-11-08');
  const legacyArtist = '#/artist/artist%3Acid?day=2026-11-07&stage=kinetic-field';
  assert.equal(C.buildHash(C.parseHash(legacyArtist)), legacyArtist);
  const nav = C.transition({ view: 'artist', id: 'artist:cid', day: '2026-11-07', stage: 'kinetic-field' }, { type: 'sources' });
  assert.deepEqual(nav, { view: 'sources', day: '2026-11-07', stage: 'kinetic-field' });
});
test('the legacy map alias never shows a map: it redirects to the stage list, a stage page or a detail page', () => {
  const r = state => C.resolveRoute(idx, C.parseHash(state));
  assert.deepEqual(r('#/map?day=2026-11-06&stage=kinetic-field'), { state: { view: 'explore', day: '2026-11-06', stage: 'kinetic-field' }, replace: true });
  assert.deepEqual(r('#/map?stage=nope'), { state: { view: 'stages', day: 'all', stage: '' }, replace: true });
  assert.deepEqual(r('#/map?set=edco26%3A2026-11-07%3Aacraze-b2b-cid&day=2026-11-07').state, { day: '2026-11-07', stage: '', view: 'performance', id: 'edco26:2026-11-07:acraze-b2b-cid' });
  assert.equal(r('#/map?artist=artist%3Acid').state.view, 'artist');
  assert.equal(r('#/stages?stage=nope').replace, true);
  assert.equal(r('#/stages?stage=nope').state.stage, '');
  assert.equal(r('#/explore?stage=nope').state.stage, 'nope', 'explore keeps its recoverable unavailable state');
  assert.deepEqual(r('#/map?day=2026-11-08'), { state: { view: 'stages', day: '2026-11-08', stage: '' }, replace: true });
  assert.deepEqual(r('#/map'), { state: { view: 'stages', day: 'all', stage: '' }, replace: true });
  assert.equal(r('#/stages').replace, false, 'the stage list itself is canonical');
});
test('unscheduled lists exactly the current appearances without a usable stage and time', () => {
  assert.deepEqual(C.DAYS.map(d => C.unscheduled(idx, d.key).length), [23, 8, 7, 8]);
  C.unscheduled(idx, 'all').forEach(p => assert.ok(!p.stage_id || !C.hasTime(p)));
  assert.equal(C.query(idx, { day: 'all', stage: C.UNKNOWN_STAGE }).length, 23);
  assert.ok(idx.performances.filter(p => p.stage_id && C.hasTime(p)).every(p => !C.unscheduled(idx, 'all').includes(p)));
});
test('status vocabulary: header carries a shared status, mixed lists spell each row out', () => {
  const timed = idx.performances.find(C.hasTime);
  const untimed = { ...timed, starts_at: null, ends_at: null, schedule_status: 'set_times_unverified' };
  assert.equal(C.statusOf(timed), 'poster');
  assert.equal(C.statusOf({ ...timed, schedule_status: 'verified' }), 'verified');
  assert.equal(C.statusOf(untimed), 'unknown');
  assert.equal(C.statusOf({ ...timed, lineup_status: 'official_sources_conflict' }), 'unknown');
  assert.equal(C.summarizeStatus([timed, timed]).status, 'poster');
  assert.equal(C.summarizeStatus([timed, untimed]).status, 'mixed');
  assert.equal(C.summarizeStatus([]).status, 'none');
  assert.equal(C.sourcesDisagree({ ...timed, issue_ids: [] }), false);
  assert.equal(C.sourcesDisagree({ ...timed, issue_ids: ['x'] }), true);
  assert.equal(C.sourcesDisagree({ ...timed, issue_ids: [], reconciliation: { status: 'qualifier_changed' } }), true);
  assert.equal(C.dayLabel('2026-11-06'), 'Fri 6'); assert.equal(C.dayLabel('all'), 'All');
  assert.equal(C.shortDate('2026-10-30'), 'Oct 30');
  assert.deepEqual(C.timeParts({ ...timed, starts_at: '2026-11-06T23:30:00-05:00', ends_at: '2026-11-07T00:30:00-05:00' }), { start: '11:30 PM', end: '12:30 AM', nextDay: true });
  assert.equal(C.timeParts(untimed), null);
});
test('Listening Room targets are stable artist IDs; programs and empty credits get none', () => {
  const songs = [{ video_id: 'a', artist_ids: ['artist:cid'], url: 'https://www.youtube.com/watch?v=a', title: 't', artist: 'CID' }];
  const withSongs = C.createIndex(perf, art, venues, songs);
  const b2b = withSongs.performances.find(p => p.display_name === 'ACRAZE B2B CID');
  const targets = C.hearTargets(withSongs, b2b);
  assert.deepEqual(targets.map(t => t.artist.artist_id).sort(), [...b2b.artist_ids].sort());
  assert.equal(targets.find(t => t.artist.artist_id === 'artist:cid').tracks, 1);
  assert.equal(targets.find(t => t.artist.artist_id !== 'artist:cid').tracks, 0);
  const program = withSongs.performances.find(p => p.performance_type === 'program');
  assert.deepEqual(C.hearTargets(withSongs, program), []);
  assert.deepEqual(C.hearTargets(withSongs, { ...b2b, artist_ids: [] }), []);
  assert.equal(C.hearTargets(idx, b2b).every(t => t.tracks === 0), true);
});
