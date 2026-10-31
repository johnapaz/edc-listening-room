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
