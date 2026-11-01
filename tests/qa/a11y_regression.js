/* QA accessibility regression checks for the Companion review build (WCAG 2.2 A/AA subset, Chromium only).
 * Run: python3 scripts/build_companion_preview.py && NODE_PATH=<playwright> node tests/qa/a11y_regression.js
 * ROOT=<dir> tests another sanitized preview. Not wired into CI (workflow files are PM-owned).
 * Checks tagged KNOWN are open ledger findings (docs/overnight-2026-11-01/qa/accessibility.md): they print KNOWN-OPEN and do
 * not fail the run unless STRICT=1, so they flip to a hard failure the moment a fix lands without being retested. */
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(process.env.ROOT || path.join(__dirname, '../../companion-preview'));
const STRICT = process.env.STRICT === '1';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const headers = Object.fromEntries(fs.readFileSync(path.join(ROOT, '_headers'), 'utf8').split('\n').filter(l => l.startsWith('  ')).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://t'); let f = path.resolve(ROOT, '.' + decodeURIComponent(u.pathname));
  if (!f.startsWith(ROOT)) return void res.writeHead(403).end();
  try { if (fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); res.writeHead(200, { ...headers, 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); } catch (_) { res.writeHead(404, headers).end('nf'); }
});
const results = []; let hardFail = 0;
function record(id, name, ok, detail = '', known = false) {
  const status = ok ? 'PASS' : known && !STRICT ? 'KNOWN-OPEN' : 'FAIL';
  if (status === 'FAIL') hardFail++;
  results.push({ id, name, status, detail }); console.log(`${status.padEnd(10)} ${id.padEnd(9)} ${name}${detail ? ' :: ' + detail : ''}`);
}
const ready = page => page.waitForFunction(() => document.querySelector('main')?.getAttribute('aria-busy') === 'false', null, { timeout: 8000 });
const SIZES = [[360, 740, ''], [390, 844, ''], [412, 915, ''], [320, 640, ''], [280, 653, ''], [844, 390, ''], [360, 740, 'html{font-size:200% !important}'], [390, 844, 'html{font-size:200% !important}'], [412, 915, 'html{font-size:200% !important}'], [320, 640, 'html{font-size:200% !important}'],
  [360, 740, '*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}'], [360, 740, '*{font-family:Verdana,"DejaVu Sans",sans-serif !important}']];
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const open = async (opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, ...opts }); await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort()); return { ctx, page: await ctx.newPage() }; };
  try {
    // QA-A11Y-SC2.4.11: pinned bars never overlap and day controls in view are hit-testable (regression for the wrapped app bar over the day strip).
    for (const [w, h, css] of SIZES) {
      const { ctx, page } = await open({ viewport: { width: w, height: h } });
      await page.goto(base + '/companion/#/explore?day=2026-11-07&stage=circuit-grounds'); await ready(page);
      if (css) await page.addStyleTag({ content: css }); await page.waitForTimeout(250);
      const bad = [];
      for (const y of [0, 400, 1200]) {
        await page.evaluate(y => scrollTo(0, y), y); await page.waitForTimeout(120);
        const r = await page.evaluate(() => {
          const bars = [...document.querySelectorAll('.app-bar,.days,nav.primary')].filter(n => ['fixed', 'sticky'].includes(getComputedStyle(n).position) && n.getBoundingClientRect().height > 0).map(n => ({ n: n.className, r: n.getBoundingClientRect() }));
          const ov = []; for (let i = 0; i < bars.length; i++) for (let j = i + 1; j < bars.length; j++) { const a = bars[i].r, c = bars[j].r; if (Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1 && Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1) ov.push(bars[i].n + '/' + bars[j].n); }
          const hit = [...document.querySelectorAll('.days a')].filter(a => { const q = a.getBoundingClientRect(); return q.width && q.top >= 0 && q.bottom <= innerHeight; }).filter(a => { const q = a.getBoundingClientRect(); const t = document.elementFromPoint(q.x + q.width / 2, q.y + q.height / 2); return !(t === a || a.contains(t)); }).length;
          return { ov, hit };
        });
        if (r.ov.length || r.hit) bad.push(`y=${y} ${JSON.stringify(r)}`);
      }
      record('SC2.4.11', `sticky bars clear of day controls at ${w}x${h}${css ? ' [' + css.slice(0, 22) + '…]' : ''}`, !bad.length, bad.join('; '));
      await ctx.close();
    }
    // A11Y-001: after browser Back, focus must stay on the restored view's heading (popstate focuses it; hashchange re-render must not destroy it).
    { const { ctx, page } = await open(); await page.goto(base + '/companion/#/explore?day=2026-11-07&stage=circuit-grounds'); await ready(page);
      await page.locator('.billing-link').nth(2).click(); await page.waitForSelector('#detail-title'); await page.goBack(); await page.waitForTimeout(800);
      const a = await page.evaluate(() => document.activeElement.id || document.activeElement.tagName);
      record('A11Y-001', 'focus lands on and stays on the stage heading after browser Back', a === 'stage-title', 'activeElement=' + a, true); await ctx.close(); }
    // A11Y-005: successful "Try again" must move focus into the restored content and announce it.
    { const { ctx, page } = await open(); let n = 0; await page.route('**/data/edco-2026/performances.json', r => ++n === 1 ? r.fulfill({ status: 503, body: 'x' }) : r.continue());
      await page.goto(base + '/companion/#/explore?stage=circuit-grounds'); await page.waitForSelector('main button');
      await page.evaluate(() => { window.__live = []; const t = document.getElementById('live'); new MutationObserver(() => window.__live.push(t.textContent)).observe(t, { childList: true, characterData: true, subtree: true }); });
      await page.focus('main button'); await page.keyboard.press('Enter'); await page.waitForSelector('#stage-title', { timeout: 5000 }); await page.waitForTimeout(500);
      const f = await page.evaluate(() => document.activeElement.id || document.activeElement.tagName); const live = await page.evaluate(() => window.__live.filter(Boolean));
      record('A11Y-005', 'successful retry keeps focus in content and announces recovery', f !== 'BODY' && live.length > 0, `activeElement=${f} announcements=${JSON.stringify(live)}`, true); await ctx.close(); }
    // A11Y-002: every route (incl. error views) has exactly one h1 and a title that matches its content.
    { const { ctx, page } = await open(); const bad = [];
      for (const [r, mustTitle] of [['#/map', /^Map/], ['#/stages', /^Stages/], ['#/unscheduled', /^Stage or time unknown/], ['#/sources', /^About/], ['#/artist/nope', /unavailable|not found/i], ['#/bogus', /unavailable|not found/i]]) {
        await page.goto(base + '/companion/' + r); await page.reload(); await ready(page);
        const d = await page.evaluate(() => ({ h1: document.querySelectorAll('main h1').length, title: document.title }));
        if (d.h1 !== 1 || !mustTitle.test(d.title)) bad.push(`${r}: h1=${d.h1} title="${d.title}"`); }
      record('A11Y-002', 'one h1 per view; error views have a descriptive title', !bad.length, bad.join(' | '), true); await ctx.close(); }
    // Structure guards (currently passing): no invalid pressed/radiogroup semantics, no unnamed controls, one main landmark, lang set.
    { const { ctx, page } = await open(); const bad = [];
      for (const r of ['#/map', '#/stages', '#/explore', '#/unscheduled', '#/sources', '#/performance/edco26:2026-11-06:benda-b2b-vastive', '#/performance/edco26:2026-11-08:discovery-project', '#/artist/artist:benda']) {
        await page.goto(base + '/companion/' + r); await page.reload(); await ready(page);
        const d = await page.evaluate(() => {
          const name = e => (e.getAttribute('aria-label') || [...e.childNodes].map(function w(n) { return n.nodeType === 3 ? n.textContent : n.nodeType === 1 && !n.matches('[aria-hidden=true]') ? [...n.childNodes].map(w).join('') : ''; }).join('')).trim();
          const ctl = [...document.querySelectorAll('a[href],button,input,select,textarea')].filter(e => !e.closest('[hidden]'));
          return { unnamed: ctl.filter(e => !name(e)).length, pressed: document.querySelectorAll('[aria-pressed],[role=radiogroup]').length, mains: document.querySelectorAll('main').length, lang: document.documentElement.lang, nested: document.querySelectorAll('a a,a button,button a,button button').length, dupIds: [...document.querySelectorAll('[id]')].length - new Set([...document.querySelectorAll('[id]')].map(e => e.id)).size };
        });
        if (d.unnamed || d.pressed || d.mains !== 1 || d.lang !== 'en' || d.nested || d.dupIds) bad.push(r + ' ' + JSON.stringify(d)); }
      record('SC4.1.2', 'controls named; no aria-pressed/radiogroup; one main; lang=en; no nested interactives; unique ids', !bad.length, bad.join(' | ')); await ctx.close(); }
    // Program entries must not invent artist links (Discovery Project has no artist ids).
    { const { ctx, page } = await open(); await page.goto(base + '/companion/#/performance/edco26:2026-11-08:discovery-project'); await ready(page);
      const n = await page.locator('main a[href*="/artist/"]').count(); record('SC2.4.4', 'program entry has no artist or Listening Room links', n === 0, 'artist links=' + n); await ctx.close(); }
  } finally { await browser.close(); server.close(); }
  const out = process.env.RESULTS; if (out) fs.writeFileSync(out, JSON.stringify(results, null, 1));
  console.log(`\n${results.filter(r => r.status === 'PASS').length} pass, ${results.filter(r => r.status === 'KNOWN-OPEN').length} known-open, ${hardFail} fail`);
  process.exit(hardFail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
