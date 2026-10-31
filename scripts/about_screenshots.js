// Capture the app screenshots used by the About & Help pages.
//
//   python3 scripts/build_public_site.py
//   (cd public-site && python3 -m http.server 8766) &
//   node scripts/about_screenshots.js http://localhost:8766 about-site/img
//
// Needs Playwright (npm i -g playwright; NODE_PATH=$(npm root -g)). Writes PNGs plus
// shots.json (file, width, height), which scripts/build_about.py reads. If Python has Pillow,
// the PNGs are converted to much smaller WebP files. Song artwork loads
// from img.youtube.com; without network access the app shows its initials fallback instead.
const { chromium } = require("playwright");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

const BASE = (process.argv[2] || "http://localhost:8766").replace(/\/$/, "");
const OUT = process.argv[3] || "about-site/img";
const PHONE = { width: 375, height: 812 };
const TABS = 64; // fixed bottom bar, kept in frame so the shot looks like the real screen

const shots = [
  { name: "lineup", route: "#/lineup", wait: "#list li",
    callouts: [["#q", 1], [".days", 2], ["#featured .music-grid", 3], ["#list li:first-child", 4]],
    until: "#list li:first-child" },
  { name: "search", route: "#/lineup", wait: "#list li", type: "luke dean", until: "#list li:last-child" },
  { name: "day", route: "#/lineup?day=2026-11-06", wait: "#list li", until: "#list li:nth-child(2)" },
  { name: "artist", route: "#/artist/edco26:2026-11-08:martin-garrix", wait: ".song",
    callouts: [["main p.flag", 1], [".song .track-title", 2], [".song .btn", 3]], until: ".song:last-of-type" },
  { name: "nosong", route: "#/artist/edco26:2026-11-06:afrojack", wait: ".empty", until: ".empty" },
  { name: "b2b", route: "#/artist/edco26:2026-11-07:acraze-b2b-cid", wait: ".song", until: "main .song:last-of-type" },
  { name: "listen", route: "#/listen", wait: ".song", until: "main ul.list li:nth-child(4)" },
  { name: "desktop", route: "#/lineup", wait: "#list li", viewport: { width: 1280, height: 800 }, scale: 1 },
];

async function callout(page, items) {
  await page.evaluate(list => {
    for (const [sel, n] of list) {
      const t = document.querySelector(sel);
      if (!t) throw new Error("callout target missing: " + sel);
      const r = t.getBoundingClientRect();
      const ring = document.createElement("div");
      Object.assign(ring.style, { position: "absolute", left: r.left + scrollX - 4 + "px", top: r.top + scrollY - 4 + "px",
        width: r.width + 8 + "px", height: r.height + 8 + "px", border: "2px solid #ffd98a", borderRadius: "12px",
        boxShadow: "0 0 0 4px #ffd98a33", pointerEvents: "none", zIndex: 50 });
      const badge = document.createElement("div");
      badge.textContent = n;
      Object.assign(badge.style, { position: "absolute", left: Math.max(2, r.left + scrollX - 12) + "px", top: r.top + scrollY - 12 + "px",
        width: "24px", height: "24px", borderRadius: "50%", background: "#ffd98a", color: "#1a1205", font: "800 13px system-ui,sans-serif",
        display: "grid", placeItems: "center", boxShadow: "0 2px 8px #0008", pointerEvents: "none", zIndex: 51 });
      document.body.append(ring, badge);
    }
  }, items);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const meta = {};
  for (const s of shots) {
    const viewport = s.viewport || PHONE;
    const scale = s.scale || 2;
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: "reduce", colorScheme: "dark" });
    const page = await ctx.newPage();
    await page.goto(BASE + "/listening-room/" + s.route);
    await page.waitForSelector(s.wait);
    if (s.type) { await page.fill("#q", s.type); await page.waitForTimeout(150); }
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.evaluate(() => document.activeElement && document.activeElement.blur());
    if (!s.viewport) {
      // Grow the viewport to end just below the element of interest, keeping the tab bar in view.
      const bottom = await page.$eval(s.until, el => el.getBoundingClientRect().bottom + scrollY);
      const height = Math.min(1150, Math.ceil(bottom + 20 + TABS));
      await page.setViewportSize({ width: viewport.width, height });
      await page.evaluate(() => scrollTo(0, 0));
    }
    if (s.callouts) await callout(page, s.callouts);
    const file = s.name + ".png";
    await page.screenshot({ path: path.join(OUT, file) });
    const size = page.viewportSize();
    meta[s.name] = { file, width: size.width * scale, height: size.height * scale };
    console.log("captured", file, meta[s.name].width + "x" + meta[s.name].height);
    await ctx.close();
  }
  await browser.close();
  try {
    const conv = "import sys,os\nfrom PIL import Image\nfor p in sys.argv[1:]:\n    Image.open(p).save(p[:-4] + '.webp', 'WEBP', quality=82, method=6)\n    os.remove(p)";
    execFileSync("python3", ["-c", conv, ...Object.values(meta).map(m => path.join(OUT, m.file))], { stdio: "inherit" });
    Object.values(meta).forEach(m => { m.file = m.file.replace(/\.png$/, ".webp"); });
  } catch (_e) { console.log("Pillow unavailable; keeping PNG screenshots."); }
  fs.writeFileSync(path.join(OUT, "shots.json"), JSON.stringify(meta, null, 2) + "\n");
})().catch(e => { console.error(e); process.exit(1); });
