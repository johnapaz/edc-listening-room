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
  // Landing (PD-3/PD-4): the bare URL is the stage list. No Map tab, no map box, stages above the fold, counts out of sight.
  await go('');
  assert.equal(await page.textContent('h1'), 'Stages');
  assert.equal(await page.locator('.stage-link').count(), 6);
  assert.equal(await page.locator('.performance').count(), 0);
  assert.equal(await page.getAttribute('.primary [data-nav="stages"]', 'aria-current'), 'page');
  assert.deepEqual((await page.locator('.primary a').allTextContents()).map(t => t.trim()), ['Stages', 'About'], 'tabs: Stages, About');
  assert.equal(await page.locator('[data-nav="map"]').count(), 0);
  assert.doesNotMatch(await page.locator('header').innerText(), /\bMap\b/, 'no visible nav item says Map');
  assert.doesNotMatch(await page.locator('main').innerText(), /Map coming later|\bMap\b/, 'no map promise on the landing');
  assert.match(await page.textContent('.data-status'), /107 provisional.*23 time unknown/); pass('landing is the stage list with only Stages and About tabs');
  for (const [w, h] of [[360, 740], [280, 653], [412, 915]]) {
    await page.setViewportSize({ width: w, height: h }); await go('');
    const fold = await page.evaluate(() => { const c = document.querySelector('.stage-link').getBoundingClientRect(), nav = document.querySelector('.primary').getBoundingClientRect();
      const limit = getComputedStyle(document.querySelector('.primary')).position === 'fixed' ? nav.top : innerHeight; return { bottom: c.bottom, top: c.top, limit }; });
    assert.ok(fold.top >= 0 && fold.bottom <= fold.limit, 'first stage card must be fully visible without scrolling @' + w + ' ' + JSON.stringify(fold));
  }
  await page.setViewportSize({ width: 360, height: 740 }); await go('');
  const visibleText = await page.locator('main').innerText();
  assert.doesNotMatch(visibleText, /\d+ (current appearances|provisional|stage unknown|time unknown)|with sourced times/, 'no count strings on the landing');
  assert.match(await page.locator('.schedule-status summary').innerText(), /Schedule status.*poster.*may change/s);
  assert.equal(await page.locator('.schedule-status').evaluate(d => d.open), false);
  await page.locator('.schedule-status summary').click();
  assert.match(await page.locator('main').innerText(), /107 provisional poster times/); // the counts are one tap away
  assert.deepEqual(await page.locator('.stage-link small').allTextContents(), ['28 sets · poster times', '30 sets · poster times', '21 sets · poster times', '28 sets · poster times', 'No sourced schedule', '23 appearances · stage and time unknown']);
  assert.equal(await page.locator('.map-note a[href="https://orlando.edc.com/"]').count(), 1, 'organizer homepage link kept');
  assert.equal(await page.locator('main canvas, main img, .stage-hotspot, main [data-component="festival-map"]').count(), 0);
  pass('stages above the fold, counts collapsed, stage wording matches About');
  // Primary navigation carries the day (there is no Map tab to carry a stage).
  await page.locator('[data-day="2026-11-08"]').click();
  assert.match(await page.getAttribute('.primary [data-nav="stages"]', 'href'), /day=2026-11-08/);
  await page.locator('[data-stage="stereo-bloom"]').click();
  await page.locator('.primary [data-nav="stages"]').click(); await page.waitForSelector('#page-title');
  assert.equal(await page.textContent('#page-title'), 'Stages'); assert.match(page.url(), /#\/stages\?day=2026-11-08$/);
  assert.equal(await page.getAttribute('.primary [data-nav="sources"]', 'href'), '#/sources?day=2026-11-08');
  assert.equal(await page.getAttribute('.brand', 'href'), '#/stages?day=2026-11-08');
  // Old #/map links still resolve, by replacing the entry (no stray /map history).
  await go('#/map?day=2026-11-07'); assert.match(page.url(), /#\/stages\?day=2026-11-07$/);
  assert.equal(await page.textContent('#page-title'), 'Stages');
  assert.equal(await page.getAttribute('.primary [data-nav="stages"]', 'aria-current'), 'page');
  pass('primary navigation keeps the day; #/map redirects to Stages');
  // Design-contract aliases and legacy deep links resolve to the same page.
  await go('#/stage/neon-garden?day=2026-11-07'); assert.equal(await page.textContent('#stage-title'), 'neonGARDEN');
  await go('#/map?stage=kinetic-field&day=2026-11-06'); assert.match(page.url(), /#\/explore\?day=2026-11-06&stage=kinetic-field$/);
  await go('#/map?stage=nope'); assert.equal(await page.textContent('#page-title'), 'Stages'); assert.equal(await page.locator('.error').count(), 0);
  await go('#/map?set=edco26%3A2026-11-07%3Aacraze-b2b-cid&day=2026-11-07'); assert.match(await page.textContent('#detail-title'), /ACRAZE B2B CID/);
  await go('#/performance/edco26%3A2026-11-06%3Aadventure-club?day=2026-11-07');
  await go('#/performance/edco26%3A2026-11-06%3Aadventure-club?day=2026-11-06');
  assert.match(await page.textContent('.details .day-heading'), /Friday, Nov 6/);
  assert.match(await page.textContent('.details .source-line'), /Poster times · checked Oct 30/);
  assert.ok((await page.locator('.details .set .status').allTextContents()).every(t => t === 'Poster time'));
  await go('#/performance/edco26%3A2026-11-06%3Aadventure-club?day=2026-11-07');
  assert.match(await page.textContent('.details .notice'), /Not on Saturday/); pass('aliases, bad stage on map, set deep link and Not-on-day notice');
  // Owner preference: the visible billing is a native link to details, with separate artist/Hear links and no nesting.
  await go('#/explore?day=2026-11-07&stage=kinetic-field');
  const b2bRow = page.locator('[data-performance="edco26:2026-11-07:acraze-b2b-cid"]');
  assert.equal(await b2bRow.locator('.billing a.billing-link').count(), 1);
  assert.equal(await b2bRow.locator('.participants .artist-link').count(), 2);
  assert.equal(await b2bRow.locator('.billing a a, a .hear, .billing a .artist-link').count(), 0);
  await b2bRow.locator('.billing-link').click(); await page.waitForSelector('#detail-title');
  assert.match(page.url(), /#\/performance\/edco26%3A2026-11-07%3Aacraze-b2b-cid\?day=2026-11-07&stage=kinetic-field$/);
  await page.goBack(); await page.waitForSelector('#stage-title'); assert.match(page.url(), /stage=kinetic-field/);
  await go('#/explore?day=2026-11-08&stage=circuit-grounds');
  await page.locator('[data-performance="edco26:2026-11-08:discovery-project"] .billing-link').click(); await page.waitForSelector('#detail-title');
  assert.equal(await page.locator('.details a[href^="/listening-room/#"]').count(), 0); pass('billing is a native link to details; program links only to its details');
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
  const sourceHrefs = await page.locator('a.external').evaluateAll(n => n.map(a => a.getAttribute('href')));
  assert.ok(sourceHrefs.length >= 1 && sourceHrefs.every(h => h === 'https://orlando.edc.com/'), 'homepage-only source links: ' + sourceHrefs);
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
  // Focus survives browser Back: popstate focuses the heading and the hashchange that follows must not re-render over it.
  await go('#/explore?day=2026-11-07&stage=circuit-grounds');
  await page.locator('.billing-link').nth(2).click(); await page.waitForSelector('#detail-title');
  await page.goBack(); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'stage-title', 'focus after browser Back');
  await page.locator('.billing-link').nth(2).click(); await page.waitForSelector('#detail-title');
  await page.locator('[data-back]').click(); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'stage-title', 'focus after in-page Back'); pass('focus stays on the restored heading after Back');
  // Error views have exactly one h1 and an accurate document title.
  for (const [hash, title] of [['#/artist/nope', /^Entry unavailable/], ['#/performance/nope', /^Entry unavailable/], ['#/bogus', /^Selection unavailable/], ['#/explore?stage=missing', /^Selection unavailable/]]) {
    await go(hash); await page.waitForSelector('.error');
    assert.equal(await page.locator('main h1').count(), 1, 'one h1 ' + hash); assert.match(await page.title(), title, hash);
    assert.equal(await page.evaluate(() => document.querySelector('main h1').id), 'detail-title');
  }
  pass('unavailable views have one h1 and an accurate title');
  // Bad route state is recoverable and the nav still works.
  await go('#/nonsense'); assert.match(await page.textContent('main'), /not found/);
  await page.locator('main .back').click(); await page.waitForSelector('#page-title'); pass('invalid route recovery');
  // Sticky header/day strip must never occlude each other, even when the app bar wraps (wide system fonts, text zoom).
  const CONDITIONS = [['normal', ''], ['wide-font', ':root{font-family:"DejaVu Sans Mono",monospace!important}'], ['200%-text', ':root{font-size:30px!important}']];
  let sawWrappedHeader = false;
  for (const [w, h] of [[320, 640], [360, 740], [390, 844], [412, 915], [844, 390]]) {
    for (const [name, css] of CONDITIONS) {
      await page.setViewportSize({ width: w, height: h });
      await go('#/explore?day=2026-11-07&stage=circuit-grounds');
      const style = css ? await page.addStyleTag({ content: css }) : null;
      // go() returns at once when the target is the same view (aria-busy is already false), so let the hash render and its
      // scroll restore finish before scrolling; otherwise a late render can reset the scroll or swap the nodes under test.
      await page.waitForTimeout(250);
      await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(120);
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await page.evaluate(() => {
        const bar = document.querySelector('.app-bar').getBoundingClientRect(), strip = document.querySelector('.days');
        const sr = strip.getBoundingClientRect(), pos = getComputedStyle(strip).position;
        const links = [...strip.querySelectorAll('a')].map(a => { const r = a.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
          return { top: r.top, bottom: r.bottom, ok: !!hit && (hit === a || a.contains(hit)), text: a.textContent.trim() }; });
        const rootStyle = getComputedStyle(document.documentElement);
        return { barH: bar.height, barBottom: bar.bottom, barPos: getComputedStyle(document.querySelector('.app-bar')).position, stripPos: pos, stripTop: sr.top, links,
          varBar: rootStyle.getPropertyValue('--bar-h'), varStrip: rootStyle.getPropertyValue('--strip-h'), stripH: sr.height };
      });
      const where = w + 'x' + h + ' ' + name;
      if (m.barH > 60) sawWrappedHeader = true;
      if (m.stripPos === 'sticky') {
        if (m.barPos === 'sticky') assert.ok(m.stripTop >= m.barBottom - 0.5, 'strip behind app bar @' + where + ' ' + JSON.stringify({ stripTop: m.stripTop, barBottom: m.barBottom }));
        m.links.forEach(l => assert.ok(l.ok && l.top >= -0.5, 'day link occluded @' + where + ': ' + JSON.stringify({ link: l, barBottom: m.barBottom, stripTop: m.stripTop, varBar: m.varBar, varStrip: m.varStrip })));
        assert.equal(m.varBar, (m.barPos === 'sticky' ? m.barH : 0) + 'px', 'measured bar offset @' + where);
        assert.ok(Math.abs(parseFloat(m.varStrip) - m.stripH) < 1, 'measured strip offset @' + where);
      } else { // landscape / Fold cover: nothing is pinned, so no phantom offset may remain
        assert.equal(m.varStrip, '0px', 'phantom strip offset @' + where);
        if (m.barPos !== 'sticky') assert.equal(m.varBar, '0px', 'phantom bar offset @' + where);
      }
      if (style) await style.evaluate(n => n.remove());
    }
  }
  assert.ok(sawWrappedHeader, 'the wrapped-header condition must actually be exercised');
  // Sticky day headings (All days) clear the real header + strip.
  await page.setViewportSize({ width: 360, height: 740 }); await go('#/explore?stage=circuit-grounds');
  await page.addStyleTag({ content: ':root{font-size:30px!important}' }); await page.waitForTimeout(250); await page.evaluate(() => window.scrollTo(0, 1200)); await page.waitForTimeout(120);
  const headingGap = await page.evaluate(() => { const strip = document.querySelector('.days').getBoundingClientRect().bottom;
    return [...document.querySelectorAll('.day-heading:not(.subtle)')].map(h => parseFloat(getComputedStyle(h).top) - strip); });
  assert.ok(headingGap.length && headingGap.every(g => Math.abs(g) < 1.5), 'day headings stick directly below the strip: ' + headingGap);
  pass('sticky header and day strip never overlap, including wrapped header and 200% text');
  // Real Tab traversal on the Stages landing: a focused control must settle clear of the pinned app bar and the fixed tab bar,
  // including 320x640 with 200% text where the day strip wraps to two rows and rests under the tab bar at scroll top.
  // (Content resting under a fixed bar before any scrolling is not a focus failure; focus must still scroll it clear.)
  const seenStops = new Set();
  for (const [w, h, css] of [[320, 640, ':root{font-size:30px!important}'], [360, 740, ':root{font-size:30px!important}'], [360, 740, ''], [412, 915, ''], [1280, 800, '']]) {
    await page.setViewportSize({ width: w, height: h });
    await page.reload(); await page.waitForSelector('main[aria-busy="false"] h1');
    if (css) await page.addStyleTag({ content: css });
    await page.waitForTimeout(250);
    const bad = []; let stops = 0;
    for (let i = 0; i < 70; i++) {
      await page.keyboard.press('Tab');
      await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
      const m = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body || a.classList.contains('skip')) return null; // the skip link deliberately overlays the header
        const bar = document.querySelector('.app-bar'), nav = document.querySelector('.primary');
        const barSticky = getComputedStyle(bar).position === 'sticky', navFixed = getComputedStyle(nav).position === 'fixed';
        const q = a.getBoundingClientRect(), line = a.getClientRects()[0] || q; // a wrapped inline link's box spans several lines
        const hit = document.elementFromPoint(line.left + line.width / 2, Math.min(Math.max(line.top + line.height / 2, 1), innerHeight - 1));
        return { name: (a.textContent || a.tagName).trim().slice(0, 24), top: q.top, bottom: q.bottom, own: !!(a.closest('.app-bar') || a.closest('.primary')),
          barBottom: barSticky ? bar.getBoundingClientRect().bottom : 0, navTop: navFixed ? nav.getBoundingClientRect().top : innerHeight, ok: !!hit && (hit === a || a.contains(hit)) };
      });
      if (!m) { if (i > 5 && await page.evaluate(() => document.activeElement === document.body)) break; continue; }
      stops++; seenStops.add(w + ':' + m.name);
      if (!m.own && (m.top < m.barBottom - 0.5 || m.bottom > m.navTop + 0.5 || !m.ok)) bad.push(m);
    }
    assert.ok(stops >= 30, 'tabbed through the landing at ' + w + ' (' + stops + ' stops)');
    assert.deepEqual(bad.slice(0, 3), [], 'focused control under a fixed bar at ' + w + 'x' + h + (css ? ' 200% text' : ''));
  }
  assert.ok(seenStops.has('320:Sat 7') && seenStops.has('320:Sun 8'), 'the wrapped day controls were exercised at 320x640');
  pass('keyboard focus on the Stages landing never ends up under the pinned bars (320x640 at 200% text included)');
  // Forced colors (Windows High Contrast): background fills and box-shadows are overridden, so a selected day, stage or nav item
  // must differ from its siblings in something other than colour (border width/style, text decoration). Chromium emulates this.
  if (ctx.browser().browserType().name() === 'chromium') {
    await page.emulateMedia({ forcedColors: 'active' });
    const signature = el => { const c = getComputedStyle(el); return ['borderTopWidth', 'borderTopStyle', 'borderLeftWidth', 'borderBottomWidth', 'textDecorationLine'].map(k => c[k]).join('|'); };
    for (const [w, h, hash, pairs] of [
      [360, 740, '#/explore?day=2026-11-07&stage=circuit-grounds', [['.days a[aria-current="true"]', '.days a:not([aria-current])'], ['.stage-link[aria-current="true"]', '.stage-link:not([aria-current])'], ['.primary a[aria-current="page"]', '.primary a:not([aria-current])']]],
      [1280, 800, '#/explore?day=2026-11-08&stage=kinetic-field', [['.days a[aria-current="true"]', '.days a:not([aria-current])'], ['.stage-link[aria-current="true"]', '.stage-link:not([aria-current])'], ['.primary a[aria-current="page"]', '.primary a:not([aria-current])']]]]) {
      await page.setViewportSize({ width: w, height: h }); await go(hash); await page.waitForTimeout(150);
      for (const [selected, other] of pairs) {
        const sig = await page.evaluate(([a, b, fn]) => { const f = new Function('el', 'return (' + fn + ')(el)'); return [f(document.querySelector(a)), f(document.querySelector(b))]; }, [selected, other, signature.toString()]);
        assert.notEqual(sig[0], sig[1], 'forced-colors: selected state indistinguishable without colour @' + w + ' ' + selected + ' :: ' + sig.join(' vs '));
      }
    }
    await page.emulateMedia({ forcedColors: 'none' });
    pass('selected day, stage and nav states survive forced colors without relying on colour');
  }
  // Reflow/overflow on every new view at the extremes (Fold cover, 320, desktop) and 44px targets.
  for (const [w, h] of [[280, 653], [320, 640], [360, 740], [844, 390], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const hash of ['', '#/stages', '#/explore?day=2026-11-06&stage=kinetic-field', '#/unscheduled?day=2026-11-08', '#/sources', '#/artist/artist%3Acid']) {
      await go(hash);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow ' + hash + ' @' + w);
      const small = await page.locator('.primary a, .days a, .stage-link, .billing-link, .hear, .back, .action').evaluateAll(n => n.filter(a => { const r = a.getBoundingClientRect(); return r.width && r.height < 43.5; }).map(a => a.className + ':' + a.textContent.trim().slice(0, 20)));
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
      await page.locator('[data-performance="edco26:2026-11-07:acraze-b2b-cid"] .billing-link').click();
      assert.match(await page.textContent('#detail-title'), /ACRAZE B2B CID/);
      assert.equal(await page.locator('.details > .participants .artist-link').count(), 2);
      await page.locator('.details > .participants [data-artist="artist:cid"]').click();
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
      await page.waitForSelector('#stage-panel .performance'); assert.equal(await page.locator('#stage-panel .performance').count(), 130);
      assert.equal(await page.evaluate(() => document.activeElement.id), 'stage-title', 'retry success moves focus into the restored content');
      await page.waitForFunction(() => document.getElementById('live').textContent.length > 0); pass('data failure and working retry');
      // No map screen exists: #/map lands on Stages, nothing map-like is mounted, and About states the map disposition truthfully.
      await page.goto(base + '/companion/#/map'); await page.waitForSelector('#page-title');
      assert.equal(await page.textContent('#page-title'), 'Stages');
      assert.equal(await page.locator('main canvas, main img, main svg:not(.stage-link svg), .stage-hotspot, [data-component="festival-map"]').count(), 0);
      assert.equal(await page.locator('main button').count(), 0, 'no fake map controls');
      await page.goto(base + '/companion/#/sources'); await page.waitForSelector('#map-title');
      assert.match(await page.textContent('main'), /Stage positions have not been independently verified/);
      assert.equal(await page.locator('main a[href="https://orlando.edc.com/"]').count() >= 1, true);
      assert.deepEqual(errors, []); pass('no fake map controls, script errors or CSP violations');
      await acceptance(page, base, pass, ctx, perf);
    } catch (e) {
      results.push({ engine, status: 'fail', error: String(e) });
      await page.screenshot({ path: path.join(shots, engine + '-failure.png'), fullPage: true });
      throw e;
    } finally { await browser.close(); fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify(results, null, 2)); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
