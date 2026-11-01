/* CI browser acceptance of the sanitized review artifact; no deployment or external writes. */
const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '../companion-preview');
const shots = path.resolve(process.env.SHOTS || 'companion-evidence');
fs.mkdirSync(shots, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const headers = Object.fromEntries(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split('\n').filter(l => l.startsWith('  ')).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const results = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://test');
  let file = path.resolve(ROOT, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT + path.sep) && file !== ROOT) { res.writeHead(403).end(); return; }
  try {
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { ...headers, 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (_) { res.writeHead(404, headers).end('Not found'); }
});
// Companion Session 2: gated map (S10), design-contract routes, S6/S7/S8, status language, semantics.
async function acceptance(page, base, pass, ctx, perf) {
  await page.setViewportSize({ width: 360, height: 740 });
  const go = async hash => { await page.goto(base + '/companion/' + hash); await page.waitForSelector('main[aria-busy="false"] h1'); };
  // S1/S10 landing: bare URL is the Map tab; no performance list, no map graphic, five stages plus the unknown bucket.
  await go('');
  assert.equal(await page.textContent('h1'), 'Find your next stage');
  assert.equal(await page.locator('.stage-link').count(), 6);
  assert.equal(await page.locator('.performance').count(), 0);
  assert.equal(await page.getAttribute('.primary [data-nav="map"]', 'aria-current'), 'page');
  assert.match(await page.textContent('.data-status'), /107 provisional.*23 time unknown/); pass('map landing is the gated stage list (S10)');
  // Primary navigation carries the day; Map returns to the last stage through the gate (replace, not a stray /map entry).
  await page.locator('[data-day="2026-11-08"]').click();
  assert.match(await page.getAttribute('.primary [data-nav="stages"]', 'href'), /day=2026-11-08/);
  await page.locator('[data-stage="stereo-bloom"]').click();
  await page.locator('.primary [data-nav="stages"]').click(); await page.waitForSelector('#page-title');
  assert.equal(await page.textContent('#page-title'), 'Stages'); assert.match(page.url(), /#\/stages\?day=2026-11-08$/);
  await page.locator('.primary [data-nav="map"]').click(); await page.waitForSelector('#stage-title');
  assert.match(page.url(), /#\/explore\?day=2026-11-08&stage=stereo-bloom$/);
  assert.equal(await page.textContent('#stage-title'), 'stereoBLOOM');
  await page.goBack(); assert.match(page.url(), /#\/stages\?day=2026-11-08$/); pass('primary navigation keeps day and last stage; map alias replaces');
  // Design-contract aliases and legacy deep links resolve to the same page.
  await go('#/stage/neon-garden?day=2026-11-07'); assert.equal(await page.textContent('#stage-title'), 'neonGARDEN');
  await go('#/map?stage=kinetic-field&day=2026-11-06'); assert.match(page.url(), /#\/explore\?day=2026-11-06&stage=kinetic-field$/);
  await go('#/map?stage=nope'); assert.equal(await page.textContent('#page-title'), 'Find your next stage'); assert.equal(await page.locator('.error').count(), 0);
  await go('#/map?set=edco26%3A2026-11-07%3Aacraze-b2b-cid&day=2026-11-07'); assert.match(await page.textContent('#detail-title'), /ACRAZE B2B CID/);
  await go('#/performance/edco26%3A2026-11-06%3Aadventure-club?day=2026-11-07');
  assert.match(await page.textContent('.details .notice'), /Not on Saturday/); pass('aliases, bad stage on map, set deep link and Not-on-day notice');
  // S7 unscheduled and S6 empty copy.
  await go('#/explore?day=2026-11-06&stage=casa-bacardi');
  assert.match(await page.textContent('#stage-panel'), /No sourced schedule for CASA BACARDÍ on Friday in this reference/);
  await page.locator('.foot-link a').click(); await page.waitForSelector('#page-title');
  assert.equal(await page.textContent('#page-title'), 'Stage or time unknown');
  assert.equal(await page.locator('.performance').count(), 8); assert.match(page.url(), /#\/unscheduled\?day=2026-11-06$/);
  pass('S6 empty and S7 unscheduled lists');
  // A program slot (no credited artist) is labelled and never gets an artist or Hear link.
  await go('#/explore?day=2026-11-08&stage=circuit-grounds');
  const program = page.locator('[data-performance="edco26:2026-11-08:discovery-project"]');
  assert.equal(await program.count(), 1);
  assert.match(await program.textContent(), /Program · no artist page/);
  assert.equal(await program.locator('.hear, a[href^="/listening-room/"]').count(), 0); pass('program slot has no artist link');
  // No Listening Room link is ever built from a missing/unknown ID, and none for a program.
  const artistIds = new Set(await page.evaluate(async () => (await (await fetch('../data/edco-2026/artists.json')).json()).artists.map(a => a.artist_id)));
  for (const hash of ['#/explore', '#/unscheduled', '#/explore?stage=unassigned', '#/artist/artist%3Acid', '#/performance/edco26%3A2026-11-07%3Aacraze-b2b-cid']) {
    await go(hash);
    const hrefs = await page.locator('a[href^="/listening-room/"]').evaluateAll(n => n.map(a => a.getAttribute('href')));
    hrefs.filter(h => h !== '/listening-room/').forEach(h => {
      const m = h.match(/^\/listening-room\/#\/artist\/([^?]+)/); assert.ok(m, 'artist route only: ' + h);
      assert.ok(artistIds.has(decodeURIComponent(m[1])), 'known stable ID: ' + h); assert.ok(!/undefined|null/.test(h));
    });
  }
  const programId = await page.evaluate(async () => (await (await fetch('../data/edco-2026/performances.json')).json()).performances.find(p => p.performance_type === 'program').performance_id);
  await go('#/performance/' + encodeURIComponent(programId));
  assert.match(await page.textContent('.details'), /festival program, not a single artist/);
  assert.equal(await page.locator('.details a[href^="/listening-room/#"]').count(), 0); pass('Listening Room links use stable IDs only; programs have none');
  // B2B rows get one mint link per credited identity with reviewed tracks.
  await go('#/explore?day=2026-11-07&stage=kinetic-field');
  const hear = await page.locator('[data-performance="edco26:2026-11-07:acraze-b2b-cid"] .hear').evaluateAll(n => n.map(a => a.dataset.hear));
  assert.equal(new Set(hear).size, hear.length); assert.ok(hear.includes('artist:cid')); pass('B2B row exposes per-identity Hear links');
  // Status language: a shared status is spelled out once in the header; every row has a text equivalent.
  assert.match(await page.textContent('#stage-panel .source-line'), /Poster times · checked Oct 30/);
  assert.ok((await page.locator('#stage-panel .set .status').allTextContents()).every(t => t === 'Poster time'));
  assert.equal(await page.locator('#stage-panel .set .status.glyph').count(), await page.locator('#stage-panel .set').count()); pass('status vocabulary and compact row rule');
  // Semantics: native links for days, no aria-pressed/radiogroup substitute, one h1, labelled landmarks.
  for (const hash of ['', '#/stages', '#/explore?stage=kinetic-field', '#/unscheduled', '#/sources']) {
    await go(hash);
    assert.equal(await page.locator('[aria-pressed], [role="radiogroup"], [role="radio"]').count(), 0, hash);
    assert.equal(await page.locator('h1').count(), 1, 'one h1 ' + hash);
    assert.equal(await page.locator('nav.days a').count() === 4 || hash === '#/sources', true);
    assert.equal(await page.locator('a a, button a, a button').count(), 0, 'no nested interactives');
  }
  pass('native-link day switch, no invalid pressed/radiogroup semantics, no nested interactives');
  // S8 sources & About.
  await go('#/sources'); const sources = await page.textContent('main');
  for (const text of [/Confirmed/, /Poster time/, /Time unknown/, /Sources disagree/, /Program/, /There is no map yet/, /No GPS, routes, walking times or offline copy/, /checked Oct 30/]) assert.match(sources, text);
  assert.ok((await page.locator('a.external').evaluateAll(n => n.map(a => a.getAttribute('href')))).every(h => /^https:\/\//.test(h)), 'outbound links are https');
  assert.ok((await page.locator('a.external').evaluateAll(n => n.every(a => a.rel.includes('noopener')))));
  await go('#/about'); assert.equal(await page.textContent('#page-title'), 'How to read this reference'); pass('sources and About page');
  // Disagreement surfaces on the set (coral badge + text).
  await go('#/explore'); assert.ok(await page.locator('.disagree-note .status.disagree').count() >= 1); pass('differing sources stay visible on affected sets');
  // Focus + live region + skip link.
  await go('#/explore?day=2026-11-06&stage=kinetic-field');
  await page.locator('[data-day="2026-11-07"]').click();
  await page.waitForFunction(() => /Saturday/.test(document.getElementById('live').textContent));
  assert.match(await page.textContent('#live'), /^kineticFIELD, Saturday, \d+ performances\.$/);
  await page.reload(); await page.waitForSelector('main[aria-busy="false"] h1'); // fresh load: the skip link is the first tab stop
  await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.className), 'skip');
  await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => document.activeElement.id), 'main');
  assert.match(page.url(), /stage=kinetic-field/); pass('live announcements, skip link focuses main without changing the route');
  // Connectivity banner is honest: a status, never an offline promise.
  await ctx.setOffline(true);
  await page.waitForFunction(() => !document.getElementById('banner').hidden);
  const banner = await page.textContent('#banner'); assert.match(banner, /offline/i); assert.doesNotMatch(banner, /available offline|works offline/i);
  await ctx.setOffline(false); await page.waitForFunction(() => document.getElementById('banner').hidden); pass('offline banner appears and clears');
  // Bad route state is recoverable and the nav still works.
  await go('#/nonsense'); assert.match(await page.textContent('main'), /not found/);
  await page.locator('main .back').click(); await page.waitForSelector('#page-title'); pass('invalid route recovery');
  // Reflow/overflow on every new view at the extremes (Fold cover, 320, desktop) and 44px targets.
  for (const [w, h] of [[280, 653], [320, 640], [360, 740], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const hash of ['', '#/stages', '#/explore?day=2026-11-06&stage=kinetic-field', '#/unscheduled?day=2026-11-08', '#/sources', '#/artist/artist%3Acid']) {
      await go(hash);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow ' + hash + ' @' + w);
      const small = await page.locator('.primary a, .days a, .stage-link, .details-link, .hear, .back, .action').evaluateAll(n => n.filter(a => { const r = a.getBoundingClientRect(); return r.width && r.height < 43.5; }).map(a => a.className + ':' + a.textContent.trim().slice(0, 20)));
      assert.deepEqual(small, [], 'target <44px ' + hash + ' @' + w);
    }
  }
  pass('new views reflow without overflow and keep 44px targets');
}
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const perf = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/edco-2026/performances.json'))).performances;
  for (const [engine, type] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await type.launch();
    const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
    // Thumbnails aren't under test. Block all external traffic (no providers, analytics or playlist calls).
    await ctx.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    const pass = name => { results.push({ engine, check: name, status: 'pass' }); console.log('PASS', engine, name); };
    try {
      await page.goto(base + '/companion/#/explore');
      await page.waitForSelector('#stage-panel .performance');
      assert.equal(await page.locator('#stage-panel .performance').count(), 130);
      assert.match(await page.textContent('.data-status'), /107 provisional.*23 time unknown/);
      assert.equal(await page.locator('.stage-link').count(), 6); pass('complete lineup and five stages plus unassigned');
      for (const [day, count] of [['2026-11-06', 43], ['2026-11-07', 43], ['2026-11-08', 44], ['all', 130]]) {
        await page.locator('[data-day="' + day + '"]').click();
        assert.equal(await page.locator('#stage-panel .performance').count(), count);
      }
      pass('all four day filters');
      await page.locator('[data-day="2026-11-06"]').click();
      await page.locator('[data-stage="kinetic-field"]').click();
      assert.equal(await page.evaluate(() => document.activeElement.id), 'stage-title');
      const stageHistory = await page.evaluate(() => history.length);
      await page.locator('[data-stage="kinetic-field"]').click();
      assert.equal(await page.evaluate(() => history.length), stageHistory, 'selected stage is a no-op');
      await page.locator('[data-day="2026-11-07"]').click();
      assert.equal(await page.evaluate(() => history.length), stageHistory, 'day filter replaces history');
      assert.equal(await page.textContent('#stage-title'), 'kineticFIELD');
      assert.equal(await page.getAttribute('[data-stage="kinetic-field"]', 'aria-current'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.day), '2026-11-07');
      const ids = await page.locator('#stage-panel .performance').evaluateAll(nodes => nodes.map(n => n.dataset.performance));
      const times = ids.map(id => Date.parse(perf.find(p => p.performance_id === id).starts_at));
      assert.deepEqual(times, [...times].sort((a, b) => a - b)); pass('stage persistence, source chronology and focus');
      await page.locator('[data-performance="edco26:2026-11-07:acraze-b2b-cid"] .details-link').click();
      assert.match(await page.textContent('#detail-title'), /ACRAZE B2B CID/);
      assert.equal(await page.locator('.participants .artist-link').count(), 2);
      await page.locator('[data-artist="artist:cid"]').click();
      assert.equal(await page.textContent('#detail-title'), 'CID');
      await page.locator('.listening-link').click();
      await page.waitForSelector('.song');
      assert.equal(await page.textContent('h1'), 'CID');
      assert.match(await page.locator('.song .play-btn[href]').first().getAttribute('href'), /^https:\/\/www.youtube.com\/watch\?v=/);
      await page.goBack(); await page.waitForSelector('#detail-title');
      assert.equal(await page.textContent('#detail-title'), 'CID');
      await page.locator('[data-back]').click(); await page.waitForSelector('#stage-title');
      assert.match(page.url(), /day=2026-11-07&stage=kinetic-field/); pass('B2B, individual artist, reviewed song and cross-product Back');
      await page.locator('[data-stage="casa-bacardi"]').click();
      assert.match(await page.textContent('#stage-panel'), /No sourced schedule/);
      assert.match(await page.textContent('#stage-panel'), /does not mean the stage is closed/);
      await page.locator('[data-stage="unassigned"]').click();
      assert.equal(await page.locator('#stage-panel .performance').count(), 7);
      assert.ok((await page.locator('#stage-panel .time').allTextContents()).every(t => /Time unknown/.test(t)));
      assert.ok((await page.locator('#stage-panel .set-stage').allTextContents()).every(t => t === 'Stage unknown')); pass('CASA empty and unknown-stage states');
      await page.locator('[data-stage="circuit-grounds"]').press('Enter');
      assert.equal(await page.textContent('#stage-title'), 'circuitGROUNDS');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'A'); pass('keyboard stage link and subsequent schedule navigation');
      for (const [width, height] of [[280, 653], [360, 740], [412, 915], [768, 1024], [844, 390], [1280, 800], [320, 640], [180, 740]]) {
        await page.setViewportSize({ width, height });
        const overflow = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(n => n.getBoundingClientRect().right > innerWidth + 1).map(n => ({ tag: n.tagName, cls: n.className, text: n.textContent.slice(0, 70) })).slice(0, 8));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow at ' + width + ': ' + JSON.stringify(overflow));
        const min = await page.locator('.stage-link,.days a').evaluateAll(nodes => Math.min(...nodes.map(n => n.getBoundingClientRect().height)));
        assert.ok(min >= 44, 'target below 44px at ' + width);
        await page.screenshot({ path: path.join(shots, engine + '-' + width + 'x' + height + '.png') });
      }
      pass('phone, Fold cover/open, tablet, landscape, desktop and narrow reflow');
      await page.goto(base + '/companion/#/artist/no-such-id?day=2026-11-08&stage=neon-garden');
      await page.waitForSelector('.error'); assert.match(await page.textContent('main'), /Entry unavailable/);
      await page.locator('[data-back]').click(); await page.waitForSelector('#stage-title');
      assert.equal(await page.textContent('#stage-title'), 'neonGARDEN'); pass('bad artist deep-link recovery retains stage and day');
      await page.goto(base + '/companion/#/explore?stage=missing');
      await page.waitForSelector('.error'); assert.match(await page.textContent('main'), /not found/); pass('bad stage has meaningful unavailable state');
      await page.route('**/data/listening-room/songs.json', route => route.fulfill({ status: 503, body: '{}' }));
      await page.goto(base + '/companion/#/artist/artist%3Acid'); await page.reload();
      await page.waitForSelector('#detail-title'); assert.match(await page.textContent('main'), /Listening coverage could not load/);
      await page.unroute('**/data/listening-room/songs.json'); pass('music failure preserves festival navigation');
      await page.route('**/data/edco-2026/performances.json', route => route.fulfill({ status: 503, body: '{}' }));
      await page.goto(base + '/companion/#/explore'); await page.reload(); await page.waitForSelector('.error');
      assert.match(await page.textContent('main'), /No offline copy is guaranteed/);
      await page.unroute('**/data/edco-2026/performances.json');
      await page.getByRole('button', { name: 'Try again' }).click();
      await page.waitForSelector('#stage-panel .performance'); assert.equal(await page.locator('#stage-panel .performance').count(), 130); pass('data failure and working retry');
      await page.goto(base + '/companion/#/map'); await page.waitForSelector('[data-component="festival-map"]');
      assert.equal(await page.locator('[data-component="festival-map"] button').count(), 0);
      assert.equal(await page.locator('[data-component="festival-map"] svg, [data-component="festival-map"] img, canvas, .stage-hotspot').count(), 0);
      assert.match(await page.textContent('[data-component="festival-map"]'), /positions have not been verified/);
      assert.match(await page.textContent('[data-component="festival-map"]'), /Map coming later/);
      assert.equal(await page.locator('[data-component="festival-map"] a[href="https://orlando.edc.com/"]').count(), 1);
      assert.deepEqual(errors, []); pass('no fake map controls, script errors or CSP violations');
      await acceptance(page, base, pass, ctx, perf);
    } catch (e) {
      results.push({ engine, status: 'fail', error: String(e) });
      await page.screenshot({ path: path.join(shots, engine + '-failure.png'), fullPage: true });
      throw e;
    } finally { await browser.close(); fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify(results, null, 2)); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
