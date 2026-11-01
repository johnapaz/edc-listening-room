"use strict";
/*
 * Independent LR-001 verification (backend lane, #77/#79): Tab through the whole Listening Room lineup ring and count focused
 * controls that are fully covered by a fixed/sticky element (header, bottom tab bar, anything else), at 360/768/1280 and in
 * text-zoom / text-spacing / font configurations.
 *
 *   python3 scripts/build_public_site.py && node tests/support/rc_lr001_verify.js [--engine chromium] [--out file.json]
 *
 * Method (does not reuse QA's sampler): a 9x5 grid of points inside the focused element's box; a point is "free" when
 * elementFromPoint returns the element or a descendant. A stop is "fully covered" when it has zero free in-viewport points
 * but at least one in-viewport point, "offscreen" when no point is inside the viewport, and "partial" when some but not all
 * points are covered. The covering element is named so a failure is actionable. Emulated viewports and CSS-injected zoom are
 * NOT native browser zoom or OS text scaling. Exit 1 if any stop is fully covered.
 */
const fs = require("node:fs");
const path = require("node:path");
const rc = require("./rc_scenarios");

const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const ENGINE = arg("--engine", "chromium"), OUT = arg("--out", null), MAX_STOPS = 400;
const ROOT_DIR = arg("--root", "public-site"); // negative controls point this at a copy of the build

const SIZES = (arg("--sizes", "") ? arg("--sizes").split(",") : ["phone-360", "fold-open-768", "desktop-1280"]);
const CONFIGS = [
  { id: "default", css: "" },
  { id: "font-200", css: "html{font-size:200% !important}" },
  { id: "font-300", css: "html{font-size:300% !important}" },
  { id: "text-spacing", css: "*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}p{margin-bottom:2em !important}" },
  { id: "verdana", css: '*{font-family:Verdana,"DejaVu Sans",sans-serif !important}' },
  { id: "font-200+spacing", css: "html{font-size:200% !important}*{line-height:1.5 !important;letter-spacing:.12em !important;word-spacing:.16em !important}" },
];
const MOTION = [{ id: "reduced", reducedMotion: true }, { id: "smooth", reducedMotion: false }];

const probe = () => {
  const e = document.activeElement;
  if (!e || e === document.body || e === document.documentElement) return { body: true };
  const q = e.getBoundingClientRect();
  const label = (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  let free = 0, covered = 0, off = 0; const by = {};
  for (let a = 1; a <= 9; a++) for (let b = 1; b <= 5; b++) {
    const x = q.left + q.width * a / 10, y = q.top + q.height * b / 6;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) { off++; continue; }
    const t = document.elementFromPoint(x, y);
    if (t === e || e.contains(t)) { free++; continue; }
    covered++;
    // Name the covering fixed/sticky ancestor (or the element itself).
    let n = t; while (n && n !== document.body && !["fixed", "sticky"].includes(getComputedStyle(n).position)) n = n.parentElement;
    const k = ((n && n !== document.body ? n : t)?.tagName.toLowerCase() || "?") + (((n && n !== document.body ? n : t)?.className || "") + "").split(" ")[0].replace(/^(.)/, ".$1").replace(/^\.$/, "");
    by[k] = (by[k] || 0) + 1;
  }
  const inView = free + covered;
  return { body: false, label, tag: e.tagName, free, covered, off, inView, by,
    top: Math.round(q.top), bottom: Math.round(q.bottom), vh: innerHeight };
};

async function run(sizeId, cfg, motion, base) {
  const s = await rc.openScenario({ engine: ENGINE, profile: sizeId, base, path: "/listening-room/#/lineup", reducedMotion: motion.reducedMotion });
  try {
    await s.page.waitForSelector(".lineup-row", { timeout: 8000 });
    if (cfg.css) await s.page.addStyleTag({ content: cfg.css });
    await s.page.waitForTimeout(500);
    // Start from the document start so the ring begins at the skip link.
    await s.page.evaluate(() => { document.activeElement?.blur?.(); scrollTo(0, 0); });
    const first = {}; let stops = 0, bodyHits = 0; const full = [], partial = [], offscreen = []; const seen = new Set();
    for (let i = 0; i < MAX_STOPS; i++) {
      await s.page.keyboard.press("Tab");
      await s.page.waitForTimeout(motion.reducedMotion ? 40 : 160);
      const r = await s.page.evaluate(probe);
      if (r.body) { if (++bodyHits >= 2) break; continue; }
      const key = r.label + "|" + r.tag + "|" + i; // positions differ; ring end is detected by label repeat of the first stop
      if (i === 0) Object.assign(first, r);
      else if (r.label === first.label && r.tag === first.tag) break; // wrapped around the full ring
      stops++; seen.add(key);
      const rec = { n: stops, label: r.label, top: r.top, bottom: r.bottom, vh: r.vh, by: r.by };
      if (r.inView === 0) offscreen.push(rec);
      else if (r.free === 0) full.push(rec);
      else if (r.covered > 0) partial.push({ ...rec, freePct: Math.round(100 * r.free / r.inView) });
    }
    return { size: sizeId, viewport: s.profile.width + "x" + s.profile.height, config: cfg.id, motion: motion.id, stops,
      fully_covered: full.length, partially_covered: partial.length, offscreen: offscreen.length,
      examples_fully_covered: full.slice(0, 3), examples_partial: partial.slice(0, 2), examples_offscreen: offscreen.slice(0, 2),
      page_errors: s.record.pageErrors.length };
  } finally { await s.close(); }
}

(async () => {
  if (!rc.engineInstalled(ENGINE)) { console.error("Engine not installed: " + ENGINE + " (nothing verified)"); process.exit(2); }
  const server = await rc.startServer(ROOT_DIR);
  const rows = [];
  try {
    const only = arg("--configs", ""), onlyMotion = arg("--motion", "");
    for (const size of SIZES) for (const cfg of CONFIGS.filter(c => !only || only.split(",").includes(c.id))) for (const motion of MOTION.filter(m => !onlyMotion || m.id === onlyMotion)) {
      const r = await run(size, cfg, motion, server.base); rows.push(r);
      console.log((r.fully_covered ? "FAIL" : "PASS").padEnd(5), size.padEnd(14), cfg.id.padEnd(17), motion.id.padEnd(8),
        "stops=" + r.stops, "fully=" + r.fully_covered, "partial=" + r.partially_covered, "offscreen=" + r.offscreen);
    }
  } finally { await server.close(); }
  const git = require("node:child_process").execFileSync("git", ["rev-parse", "HEAD"], { cwd: rc.REPO }).toString().trim();
  const report = { baseline_sha: git, engine: ENGINE, generated_utc: new Date().toISOString(), runs: rows.length,
    total_fully_covered: rows.reduce((a, r) => a + r.fully_covered, 0), rows,
    limits: ["Emulated viewport and CSS-injected font-size/spacing; not native browser zoom, OS text scaling or hardware.", "Chromium only unless --engine webkit is installed.", "Assertion is zero FULLY covered stops (LR-001). Partial coverage is reported, not failed."] };
  if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(report, null, 1) + "\n"); }
  console.log(`LR-001 independent check @ ${git.slice(0, 7)} (${ENGINE}): ${rows.length} runs, ${report.total_fully_covered} fully covered stops`);
  process.exit(report.total_fully_covered ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
