const { chromium } = require('playwright');
const path = require('path');
const root = path.resolve(process.argv[2]); const out = process.argv[3];
const base = 'file://' + root + '/index.html';
const cases = [
  ['01-landing-360', 360, 740, '#/map?day=2026-11-06'],
  ['02-stage-fri-360', 360, 740, '#/map?day=2026-11-06&stage=kinetic-field'],
  ['03-stage-sat-same-stage-360', 360, 740, '#/map?day=2026-11-07&stage=kinetic-field&sheet=full'],
  ['04-artist-b2b-360', 360, 740, '#/map?day=2026-11-06&stage=circuit-grounds&set=edco26:2026-11-06:benda-b2b-vastive'],
  ['05-casa-empty-360', 360, 740, '#/map?day=2026-11-06&stage=casa-bacardi'],
  ['06-stage-list-360', 360, 740, '#/stages?day=2026-11-06'],
  ['07-unscheduled-360', 360, 740, '#/unscheduled?day=2026-11-06'],
  ['08-fold-280', 280, 653, '#/map?day=2026-11-08&stage=neon-garden'],
  ['09-tablet-768', 768, 1024, '#/map?day=2026-11-07&stage=stereo-bloom'],
  ['10-desktop-1280', 1280, 800, '#/map?stage=kinetic-field'],
  ['11-sources-360', 360, 740, '#/sources'],
  ['12-mapfail-360', 360, 740, '#/map?day=2026-11-06', 'mapfail'],
  ['13-landscape-740', 740, 360, '#/map?day=2026-11-06&stage=kinetic-field'],
];
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [name, w, h, hash, sim] of cases) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto(base + (sim ? '?state=' + sim : '') + hash); await p.waitForTimeout(400);
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) errs.push(name + ': horizontal overflow');
    await p.screenshot({ path: `${out}/${name}.png` }); await p.close();
  }
  // flow check: select stage via click, switch day, stage stays selected
  const p = await b.newPage({ viewport: { width: 360, height: 740 } });
  await p.goto(base + '#/map?day=2026-11-06'); await p.click('.hs[data-stage="kinetic-field"]'); await p.waitForTimeout(100);
  await p.click('#days [data-day="2026-11-07"]'); await p.waitForTimeout(100);
  console.log('after day switch:', await p.evaluate(() => location.hash), await p.getAttribute('.hs[data-stage="kinetic-field"]', 'aria-pressed'), 'focus:', await p.evaluate(() => document.activeElement.textContent.trim()));
  await p.goBack(); await p.waitForTimeout(100); console.log('after back:', await p.evaluate(() => location.hash));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
