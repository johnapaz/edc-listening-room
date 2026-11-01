// Re-capture the Session 2 review screenshots from the local review artifact.
//   python3 scripts/build_companion_preview.py && node docs/companion-session2/capture.js <out-dir>
// Chromium emulation only: these are not real-device or screen-reader evidence.
const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '../../companion-preview');
const out = path.resolve(process.argv[2] || 'companion-session2-shots');
fs.mkdirSync(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT)) return void res.writeHead(403).end();
  try { const f = fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
    res.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  } catch { res.writeHead(404).end(); }
});
const SHOTS = [
  ['01-stages-landing-360', 360, 740, ''], ['02-stage-fri-360', 360, 740, '#/explore?day=2026-11-06&stage=kinetic-field'],
  ['03-stage-all-days-360', 360, 740, '#/explore?stage=circuit-grounds'], ['04-casa-empty-360', 360, 740, '#/explore?day=2026-11-06&stage=casa-bacardi'],
  ['05-stage-list-360', 360, 740, '#/stages?day=2026-11-07'], ['06-unscheduled-360', 360, 740, '#/unscheduled?day=2026-11-06'],
  ['07-b2b-detail-360', 360, 740, '#/performance/edco26%3A2026-11-07%3Aacraze-b2b-cid?day=2026-11-07&stage=kinetic-field'],
  ['08-sources-360', 360, 740, '#/sources'], ['09-fold-cover-280', 280, 653, '#/explore?day=2026-11-07&stage=neon-garden'],
  ['10-tablet-768', 768, 1024, '#/explore?day=2026-11-07&stage=kinetic-field'], ['11-desktop-1280', 1280, 800, '#/explore?day=2026-11-07&stage=kinetic-field'],
  ['12-landscape-844', 844, 390, '#/explore?day=2026-11-06&stage=kinetic-field'], ['13-load-failure-360', 360, 740, '#/explore', 'fail'],
  ['14-sticky-scrolled-360', 360, 740, '#/explore?day=2026-11-07&stage=circuit-grounds', 'scroll'],
  ['15-sticky-wrapped-header-200pct-360', 360, 740, '#/explore?day=2026-11-07&stage=circuit-grounds', 'zoom'],
  ['17-stages-landing-280', 280, 653, ''],
  ['16-forced-colors-360', 360, 740, '#/explore?day=2026-11-07&stage=circuit-grounds', 'forced']
];
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port, browser = await chromium.launch();
  for (const [name, width, height, hash, mode] of SHOTS) {
    const ctx = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    if (mode === 'forced') await page.emulateMedia({ forcedColors: 'active' });
    if (mode === 'fail') await page.route('**/performances.json', r => r.fulfill({ status: 503, body: '{}' }));
    await page.goto(base + '/companion/' + hash);
    await page.waitForSelector(mode === 'fail' ? '.error' : 'main[aria-busy="false"] h1');
    if (mode === 'zoom') await page.addStyleTag({ content: ':root{font-size:30px!important}' });
    if (mode === 'scroll' || mode === 'zoom') { await page.evaluate(() => window.scrollTo(0, 900)); await page.waitForTimeout(150); }
    await page.screenshot({ path: path.join(out, name + '.png') });
    await ctx.close();
  }
  await browser.close(); server.close(); console.log('wrote', SHOTS.length, 'PNGs to', out);
})();
