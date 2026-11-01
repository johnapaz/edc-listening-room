"use strict";
/*
 * Repeatable build/payload baseline (issue #79 item 5). Measures; it does not set thresholds or fail on numbers.
 *
 *   python3 scripts/build_public_site.py && python3 scripts/build_companion_preview.py   (preview build includes public files)
 *   node tests/support/rc_baseline.js [--runs 15] [--out file.json]
 *
 * Reports, per artifact: raw and gzip(9) bytes by asset, an asset-type rollup, JSON parse and Companion index-build timings
 * (median/p95 over N runs after warm-up), and request counts from a real browser load when Chromium is available.
 * Timings are Node/V8 on this machine: indicative of relative cost, not of phone CPU or network.
 */
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const os = require("node:os");
const rc = require("./rc_scenarios");

const runsIndex = process.argv.indexOf("--runs"), outIndex = process.argv.indexOf("--out");
const RUNS = runsIndex > -1 ? Number(process.argv[runsIndex + 1]) : 15;
const OUT = outIndex > -1 ? process.argv[outIndex + 1] : null;
const ROOT = rc.REPO;

const stats = xs => { const s = [...xs].sort((a, b) => a - b); const q = p => s[Math.min(s.length - 1, Math.floor(p * s.length))];
  return { median_ms: +q(0.5).toFixed(3), p95_ms: +q(0.95).toFixed(3), min_ms: +s[0].toFixed(3), runs: s.length }; };
const time = fn => { const a = process.hrtime.bigint(); fn(); return Number(process.hrtime.bigint() - a) / 1e6; };
const gz = buf => zlib.gzipSync(buf, { level: 9 }).length;
const br = buf => zlib.brotliCompressSync(buf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

function listFiles(dir) {
  const out = [];
  (function walk(d) { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p) : out.push(p); } })(dir);
  return out;
}
function sizes(dir) {
  const files = listFiles(dir).map(p => { const b = fs.readFileSync(p); return { path: path.relative(dir, p), raw: b.length, gzip: gz(b), brotli: br(b), sha256_12: require("node:crypto").createHash("sha256").update(b).digest("hex").slice(0, 12) }; });
  const byType = {};
  for (const f of files) { const t = path.extname(f.path) || "(none)"; const r = byType[t] ||= { files: 0, raw: 0, gzip: 0, brotli: 0 }; r.files++; r.raw += f.raw; r.gzip += f.gzip; r.brotli += f.brotli; }
  const total = files.reduce((a, f) => ({ raw: a.raw + f.raw, gzip: a.gzip + f.gzip, brotli: a.brotli + f.brotli }), { raw: 0, gzip: 0, brotli: 0 });
  return { file_count: files.length, total, by_type: byType, largest: [...files].sort((a, b) => b.raw - a.raw).slice(0, 8), files };
}

// Detect byte-identical files that are served twice (duplicate transfers) and fields with heavy repetition.
function duplicates(files) {
  const groups = {};
  for (const f of files) (groups[f.sha256_12] ||= []).push(f);
  return Object.values(groups).filter(g => g.length > 1 && g[0].raw > 1024).map(g => ({ bytes_each: g[0].raw, paths: g.map(x => x.path) }));
}

function jsonCosts(dir, names) {
  const out = {};
  for (const name of names) {
    const text = fs.readFileSync(path.join(dir, name), "utf8");
    for (let i = 0; i < 5; i++) JSON.parse(text); // warm-up
    out[name] = { raw: Buffer.byteLength(text), gzip: gz(Buffer.from(text)), minified_raw: Buffer.byteLength(JSON.stringify(JSON.parse(text))), parse: stats(Array.from({ length: RUNS }, () => time(() => JSON.parse(text)))) };
    out[name].pretty_printing_overhead_bytes = out[name].raw - out[name].minified_raw;
    out[name].minified_gzip = gz(Buffer.from(JSON.stringify(JSON.parse(text))));
  }
  return out;
}

function companionIndexCost(dir) {
  const read = n => JSON.parse(fs.readFileSync(path.join(dir, "data", n), "utf8"));
  const C = require(path.join(ROOT, "companion/lib.js"));
  const perf = read("edco-2026/performances.json"), art = read("edco-2026/artists.json"), ven = read("edco-2026/venues.json"), songs = read("listening-room/songs.json").songs;
  for (let i = 0; i < 5; i++) C.createIndex(perf, art, ven, songs);
  const build = stats(Array.from({ length: RUNS }, () => time(() => C.createIndex(perf, art, ven, songs))));
  const idx = C.createIndex(perf, art, ven, songs);
  const days = ["all", "2026-11-06", "2026-11-07", "2026-11-08"];
  const queries = stats(Array.from({ length: RUNS }, () => time(() => { for (const day of days) { C.query(idx, { day, stage: "" }); for (const id of idx.stages.keys()) C.query(idx, { day, stage: id }); } })));
  return { createIndex: build, queries_all_days_all_stages: queries, performances: perf.performances.length, songs: songs.length };
}

async function browserRequests(serverRoot, pagePath, label) {
  if (!rc.engineInstalled("chromium")) return { skipped: "chromium not installed" };
  const server = await rc.startServer(serverRoot);
  try {
    const s = await rc.openScenario({ engine: "chromium", profile: "phone-390", base: server.base, path: pagePath, scenario: "thumbnails-stub", goto: false });
    const seen = [];
    s.page.on("response", r => seen.push({ url: new URL(r.url()).pathname || r.url(), status: r.status(), type: r.request().resourceType(), bytes: null }));
    const t0 = Date.now();
    await s.goto(pagePath, { waitUntil: "load" });
    await rc.waitForSettled(s.page);
    await s.page.waitForLoadState("networkidle").catch(() => {});
    const timing = await s.page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { dom_content_loaded_ms: Math.round(n.domContentLoadedEventEnd), load_ms: Math.round(n.loadEventEnd) }; });
    const transfers = await s.page.evaluate(() => performance.getEntriesByType("resource").map(r => ({ name: new URL(r.name).pathname, encoded: r.encodedBodySize, decoded: r.decodedBodySize })));
    const counts = seen.reduce((a, r) => (a[r.type] = (a[r.type] || 0) + 1, a), {});
    const repeated = Object.entries(seen.reduce((a, r) => (a[r.url] = (a[r.url] || 0) + 1, a), {})).filter(([, n]) => n > 1).map(([url, n]) => ({ url, n }));
    const blocked = s.record.requests.filter(q => q.kind.startsWith("external")).length;
    await s.close();
    return { label, path: pagePath, requests_total: seen.length, requests_by_type: counts, repeated_same_url: repeated, external_requests_blocked_or_stubbed: blocked,
      same_origin_bytes_decoded: transfers.reduce((a, r) => a + r.decoded, 0), navigation_timing_localhost: timing, wall_ms: Date.now() - t0,
      note: "localhost over loopback, no CPU/network throttling: use for request counts, not for user-perceived speed", transfers };
  } finally { await server.close(); }
}

(async () => {
  const dirs = { "public-site": path.join(ROOT, "public-site"), "companion-preview": path.join(ROOT, "companion-preview") };
  for (const d of Object.values(dirs)) if (!fs.existsSync(d)) { console.error("Missing " + d + ". Build first (see header)."); process.exit(2); }
  const git = require("node:child_process").execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT }).toString().trim();
  const report = {
    schema_version: 1, baseline_sha: git, generated_utc: new Date().toISOString(),
    environment: { node: process.version, cpu: os.cpus()[0].model.trim(), cpus: os.cpus().length, platform: process.platform + "/" + process.arch, runs_per_timing: RUNS },
    caveats: ["Timings are Node/V8 on the build machine, not phone CPU.", "Browser request counts are over loopback with no throttling.", "No Core Web Vitals are measured or claimed.", "gzip level 9 and brotli 11 are best-case; the host's actual compression may differ."],
    artifacts: {},
  };
  for (const [name, dir] of Object.entries(dirs)) {
    const s = sizes(dir);
    report.artifacts[name] = { ...s, duplicate_files: duplicates(s.files) };
    delete report.artifacts[name].files; // per-asset detail is kept in the file listing below
    report.artifacts[name].assets = s.files.map(f => ({ path: f.path, raw: f.raw, gzip: f.gzip, brotli: f.brotli }));
  }
  const dataFiles = ["data/edco-2026/performances.json", "data/edco-2026/artists.json", "data/edco-2026/venues.json", "data/edco-2026/event.json", "data/listening-room/songs.json", "data/listening-room/playlist.json"];
  report.json_payloads = jsonCosts(dirs["companion-preview"], dataFiles);
  report.companion_index = companionIndexCost(dirs["companion-preview"]);
  report.browser_loads = [await browserRequests("companion-preview", "/companion/", "Companion first load"), await browserRequests("public-site", "/listening-room/", "Listening Room first load")];
  const text = JSON.stringify(report, null, 1) + "\n";
  if (OUT) { fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true }); fs.writeFileSync(OUT, text); console.log("Wrote " + OUT); }
  const a = report.artifacts;
  console.log("public-site:", a["public-site"].file_count, "files, raw", a["public-site"].total.raw, "gzip", a["public-site"].total.gzip);
  console.log("companion-preview:", a["companion-preview"].file_count, "files, raw", a["companion-preview"].total.raw, "gzip", a["companion-preview"].total.gzip);
  for (const [n, v] of Object.entries(report.json_payloads)) console.log("json", n, "raw", v.raw, "gzip", v.gzip, "minified", v.minified_raw, "parse median", v.parse.median_ms, "ms");
  console.log("createIndex median", report.companion_index.createIndex.median_ms, "ms; query sweep median", report.companion_index.queries_all_days_all_stages.median_ms, "ms");
  for (const b of report.browser_loads) console.log(b.label || "browser", b.skipped || (b.requests_total + " requests " + JSON.stringify(b.requests_by_type) + (b.repeated_same_url.length ? " repeated:" + JSON.stringify(b.repeated_same_url) : "")));
})().catch(e => { console.error(e); process.exit(1); });
