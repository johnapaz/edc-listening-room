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
      await page.goto(base + '/companion/');
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
      await page.locator('[data-day="2026-11-07"]').click();
      assert.equal(await page.textContent('#stage-title'), 'kineticFIELD');
      assert.equal(await page.getAttribute('[data-stage="kinetic-field"]', 'aria-current'), 'true');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.day), '2026-11-07');
      const ids = await page.locator('#stage-panel .performance').evaluateAll(nodes => nodes.map(n => n.dataset.performance));
      const times = ids.map(id => Date.parse(perf.find(p => p.performance_id === id).starts_at));
      assert.deepEqual(times, [...times].sort((a, b) => a - b)); pass('stage persistence, source chronology and focus');
      await page.locator('[data-performance="edco26:2026-11-07:acraze-b2b-cid"] h3 a').click();
      assert.match(await page.textContent('#detail-title'), /ACRAZE B2B CID/);
      assert.equal(await page.locator('.participants .artist-link').count(), 2);
      await page.locator('[data-artist="artist:cid"]').click();
      assert.equal(await page.textContent('#detail-title'), 'CID');
      await page.locator('.listening-link').click();
      await page.waitForSelector('.song');
      assert.equal(await page.textContent('h1'), 'CID');
      assert.match(await page.locator('.song a.btn').first().getAttribute('href'), /^https:\/\/www.youtube.com\/watch\?v=/);
      await page.goBack(); await page.waitForSelector('#detail-title');
      assert.equal(await page.textContent('#detail-title'), 'CID');
      await page.locator('[data-back]').click(); await page.waitForSelector('#stage-title');
      assert.match(page.url(), /day=2026-11-07&stage=kinetic-field/); pass('B2B, individual artist, reviewed song and cross-product Back');
      await page.locator('[data-stage="casa-bacardi"]').click();
      assert.match(await page.textContent('#stage-panel'), /No sourced schedule/);
      assert.match(await page.textContent('#stage-panel'), /does not mean the stage is closed/);
      await page.locator('[data-stage="unassigned"]').click();
      assert.equal(await page.locator('#stage-panel .performance').count(), 7);
      assert.ok((await page.locator('#stage-panel .schedule-time').allTextContents()).every(t => t === 'Time unknown · Stage unknown')); pass('CASA empty and unknown-stage states');
      await page.locator('[data-stage="circuit-grounds"]').press('Enter');
      assert.equal(await page.textContent('#stage-title'), 'circuitGROUNDS');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.tagName), 'A'); pass('keyboard stage link and subsequent schedule navigation');
      for (const [width, height] of [[280, 653], [360, 740], [412, 915], [768, 1024], [844, 390], [1280, 800], [320, 640], [180, 740]]) {
        await page.setViewportSize({ width, height });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow at ' + width);
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
      await page.goto(base + '/companion/#/artist/artist%3Acid');
      await page.waitForSelector('#detail-title'); assert.match(await page.textContent('main'), /Listening coverage could not load/);
      await page.unroute('**/data/listening-room/songs.json'); pass('music failure preserves festival navigation');
      await page.route('**/data/edco-2026/performances.json', route => route.fulfill({ status: 503, body: '{}' }));
      await page.goto(base + '/companion/'); await page.waitForSelector('.error');
      assert.match(await page.textContent('main'), /No offline copy is guaranteed/);
      await page.unroute('**/data/edco-2026/performances.json');
      await page.getByRole('button', { name: 'Try again' }).click();
      await page.waitForSelector('#stage-panel .performance'); assert.equal(await page.locator('#stage-panel .performance').count(), 130); pass('data failure and working retry');
      assert.equal(await page.locator('[data-component="festival-map"] button').count(), 0);
      assert.match(await page.textContent('[data-component="festival-map"]'), /positions have not been verified/);
      assert.deepEqual(errors, []); pass('no fake map controls, script errors or CSP violations');
    } catch (e) {
      results.push({ engine, status: 'fail', error: String(e) });
      await page.screenshot({ path: path.join(shots, engine + '-failure.png'), fullPage: true });
      throw e;
    } finally { await browser.close(); fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify(results, null, 2)); }
  }
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => server.close());
