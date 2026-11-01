"use strict";
/*
 * Reusable, deterministic QA scenario helper (issue #79 -> QA #80).
 *
 * Sets up viewport/device, failure, time and state-transition conditions for a
 * Playwright page and records exactly what was applied. It makes no product
 * assertions; acceptance tests live in QA-owned files and consume this module.
 *
 * Safety contract:
 *  - The static server is read-only (GET/HEAD) and serves a built artifact; repository files are never written.
 *  - Failure variants are produced in the request layer (route.fulfill/abort), never by editing files.
 *  - Every request outside the local origin is aborted, or answered with a stub, and recorded. No provider, analytics or playlist call can leave the browser.
 *  - Each openScenario() uses a fresh browser context, so routes, offline state and clocks cannot leak between scenarios.
 *
 * Usage:
 *   const rc = require("./tests/support/rc_scenarios");
 *   const server = await rc.startServer("companion-preview");
 *   const s = await rc.openScenario({ engine: "chromium", profile: "phone-390", scenario: "required-503",
 *                                     time: "stale-boundary-at", base: server.base, path: "/companion/" });
 *   // ... QA assertions on s.page ...
 *   await s.restore();            // lift the failure, then click the app's retry
 *   console.log(s.record);         // machine-readable parameters + observed requests
 *   await s.close(); await server.close();
 *
 * CLI:  node tests/support/rc_scenarios.js --manifest [outFile]   (machine-readable manifest)
 */
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const SUPPORT = __dirname;
const REPO = path.resolve(SUPPORT, "../..");
const CONFIG = JSON.parse(fs.readFileSync(path.join(SUPPORT, "rc_profiles.json"), "utf8"));
const profileById = Object.fromEntries(CONFIG.profiles.map(p => [p.id, p]));
const scenarioById = Object.fromEntries(CONFIG.failure_scenarios.map(s => [s.id, s]));
const timeById = Object.fromEntries(CONFIG.time_fixtures.map(t => [t.id, t]));

const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
// 1x1 transparent PNG.
const PNG_1X1 = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

function lookup(table, id, kind) {
  if (!table[id]) throw new Error("Unknown " + kind + " '" + id + "'. Known: " + Object.keys(table).join(", "));
  return table[id];
}

/** Read-only static server for a built artifact (default headers file honoured so CSP matches production). */
async function startServer(rootDir = "companion-preview") {
  const root = path.resolve(REPO, rootDir);
  if (!fs.existsSync(root)) throw new Error("Build the artifact first (python3 scripts/build_companion_preview.py or build_public_site.py): " + root);
  let headers = {};
  const headersFile = path.join(root, "_headers");
  if (fs.existsSync(headersFile)) {
    headers = Object.fromEntries(fs.readFileSync(headersFile, "utf8").split("\n").filter(l => l.startsWith("  "))
      .map(l => { const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
  }
  const server = http.createServer((req, res) => {
    if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405, { Allow: "GET, HEAD" }).end(); return; }
    const url = new URL(req.url, "http://local");
    let file = path.resolve(root, "." + decodeURIComponent(url.pathname));
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      if (fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      res.writeHead(200, { ...headers, "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
      if (req.method === "HEAD") res.end(); else fs.createReadStream(file).pipe(res);
    } catch (_) { res.writeHead(404, headers).end("Not found"); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = "http://127.0.0.1:" + server.address().port;
  return { base, root, close: () => new Promise(resolve => server.close(resolve)) };
}

/** SHA-256 of every file under dir; use before and after a run to prove nothing was mutated. */
function treeDigest(dir) {
  const hash = crypto.createHash("sha256");
  (function walk(d) {
    for (const name of fs.readdirSync(d).sort()) {
      const p = path.join(d, name);
      if (fs.statSync(p).isDirectory()) walk(p);
      else { hash.update(path.relative(dir, p)); hash.update(fs.readFileSync(p)); }
    }
  })(dir);
  return hash.digest("hex");
}

function engineInstalled(name) {
  try { return fs.existsSync(require("playwright")[name].executablePath()); } catch (_) { return false; }
}

const matches = (url, list) => list.some(p => url.pathname.endsWith("/" + p) || url.pathname === "/" + p);

/**
 * Failure/network scenario installation.
 * Returns { afterLoad, restore } and appends to record.applied.
 */
async function installScenario(ctx, base, id, overrides, record) {
  const def = lookup(scenarioById, id, "failure scenario");
  const params = { ...def.params, ...overrides };
  const paths = CONFIG.data_paths;
  const state = { active: id !== "normal", counts: new Map(), failuresLeft: params.fail_count };
  record.scenario = { id, label: def.label, params };
  const originOk = u => u.origin === base;
  const log = (kind, url, extra) => record.requests.push({ kind, url, ...extra });

  // Always: nothing leaves the local origin. Thumbnails may be stubbed; everything else is aborted and recorded.
  await ctx.route(u => !originOk(new URL(u)), route => {
    const url = new URL(route.request().url());
    const host = url.hostname;
    if (id === "thumbnails-stub" && (params.hosts || []).includes(host)) {
      log("external-stubbed", url.href, { status: 200 });
      return route.fulfill({ status: 200, contentType: "image/png", body: PNG_1X1 });
    }
    log("external-blocked", url.href, { reason: id === "thumbnails-fail" && (params.hosts || []).includes(host) ? "scenario" : "no-external-traffic" });
    return route.abort("failed");
  });

  // Same-origin data scenarios. The handler consults `state.active`, so restore() simply deactivates it.
  const required = paths.required, songs = paths.optional_songs;
  const dataScenario = ["required-delayed", "required-503", "required-503-then-ok", "required-malformed",
    "required-incompatible-schema", "optional-songs-503", "optional-songs-malformed"].includes(id);
  if (dataScenario) {
    await ctx.route(u => new URL(u).origin === base && /\.json$/.test(new URL(u).pathname), async route => {
      const url = new URL(route.request().url());
      const isRequired = matches(url, required), isSongs = matches(url, songs);
      if (!state.active || !(isRequired || isSongs)) return route.fallback();
      const n = (state.counts.get(url.pathname) || 0) + 1;
      state.counts.set(url.pathname, n);
      const hit = status => log("injected", url.pathname, { scenario: id, status, n });
      const targetOk = t => !t || url.pathname.endsWith("/" + t);
      if (id === "required-delayed" && isRequired) {
        await new Promise(r => setTimeout(r, params.delay_ms));
        hit("delayed " + params.delay_ms + "ms");
        return route.fallback();
      }
      if (id === "required-503" && isRequired) { hit(params.status); return route.fulfill({ status: params.status, contentType: "text/plain", body: "Service Unavailable" }); }
      if (id === "required-503-then-ok" && isRequired) {
        if (state.failuresLeft > 0) { state.failuresLeft--; hit(params.status); return route.fulfill({ status: params.status, contentType: "text/plain", body: "Service Unavailable" }); }
        return route.fallback();
      }
      if (id === "required-malformed" && isRequired && targetOk(params.target)) {
        hit("200 malformed");
        return route.fulfill({ status: 200, contentType: "application/json", body: '{"schema_version":2,"performances":[{"performance_id":"edco26:truncated' });
      }
      if (id === "required-incompatible-schema" && isRequired && targetOk(params.target)) {
        hit("200 incompatible");
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(params.body) });
      }
      if (id === "optional-songs-503" && isSongs) { hit(params.status || 503); return route.fulfill({ status: params.status || 503, contentType: "text/plain", body: "Service Unavailable" }); }
      if (id === "optional-songs-malformed" && isSongs) { hit("200 malformed"); return route.fulfill({ status: 200, contentType: "application/json", body: '{"songs":[{"video_id":' }); }
      return route.fallback();
    });
  }
  if (id === "offline-before-load") { await ctx.setOffline(true); record.applied.push("offline before first load"); }
  record.applied.push(id);
  return {
    // Call after the QA test has seen the page load successfully.
    afterLoad: async () => {
      if (id === "network-lost-after-load") { await ctx.setOffline(true); record.applied.push("offline after load"); }
    },
    // Lift the condition so a retry can succeed.
    restore: async () => {
      state.active = false;
      await ctx.setOffline(false);
      record.applied.push("restored");
    },
  };
}

/**
 * Open a page under one profile + scenario + time fixture.
 * opts: engine, profile, scenario, time (fixture id or ISO instant), base, path, params, reducedMotion,
 *       (offline-before-load never auto-navigates; call s.goto() yourself),
 *       locale, colorScheme, goto (default true).
 */
async function openScenario(opts) {
  const { chromium, webkit } = require("playwright");
  const engineName = opts.engine || "chromium";
  if (!["chromium", "webkit"].includes(engineName)) throw new Error("engine must be chromium or webkit");
  if (!engineInstalled(engineName)) { const e = new Error("Browser not installed: " + engineName); e.code = "ENGINE_UNAVAILABLE"; throw e; }
  const profile = lookup(profileById, opts.profile || "phone-390", "profile");
  if (!profile.engines.includes(engineName)) { const e = new Error("Profile " + profile.id + " is not defined for " + engineName); e.code = "PROFILE_ENGINE_MISMATCH"; throw e; }
  const timeFixture = opts.time ? (timeById[opts.time] || { id: "custom", instant: opts.time }) : null;
  if (timeFixture && Number.isNaN(Date.parse(timeFixture.instant))) throw new Error("Invalid time instant: " + timeFixture.instant);
  if (!opts.base) throw new Error("opts.base is required (use startServer())");

  const record = {
    engine: engineName, profile: { ...profile }, time: timeFixture, base: opts.base, path: opts.path || "/companion/",
    reducedMotion: Boolean(opts.reducedMotion), applied: [], requests: [], consoleErrors: [], pageErrors: [],
    emulation: "viewport/device-metrics only; not hardware", started_utc: new Date().toISOString(),
  };
  const browser = await (engineName === "webkit" ? webkit : chromium).launch();
  const ctx = await browser.newContext({
    viewport: { width: profile.width, height: profile.height },
    deviceScaleFactor: Math.min(profile.dpr, 2), // matches tests/device_matrix.js; 3x adds screenshot weight without layout change
    isMobile: profile.mobile, // supported by Chromium and WebKit (device_matrix.js does the same)
    hasTouch: profile.touch,
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
    colorScheme: opts.colorScheme || "light",
    locale: opts.locale || "en-US",
    timezoneId: "America/New_York", // fixture instants are interpreted in the festival timezone
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => record.pageErrors.push(String(e)));
  page.on("console", m => { if (m.type() === "error") record.consoleErrors.push(m.text()); });
  ctx.on("response", r => { if (r.url().startsWith(opts.base) && /\.json$/.test(r.url())) record.requests.push({ kind: "data", url: new URL(r.url()).pathname, status: r.status() }); });

  const handle = await installScenario(ctx, opts.base, opts.scenario || "normal", opts.params || {}, record);
  if (timeFixture) {
    // clock.install keeps time flowing from the fixture instant, so timeouts and retries still run.
    await page.clock.install({ time: new Date(timeFixture.instant) });
    record.applied.push("clock " + timeFixture.instant);
  }
  const scenario = {
    page, ctx, browser, record, profile,
    afterLoad: handle.afterLoad,
    restore: handle.restore,
    close: async () => { record.finished_utc = new Date().toISOString(); await ctx.close(); await browser.close(); },
    goto: (p, o) => page.goto(opts.base + (p || record.path), o),
  };
  // offline-before-load makes the first navigation fail by design, so the caller must navigate itself after deciding what to assert.
  const autoGoto = opts.goto !== false && (opts.scenario || "normal") !== "offline-before-load";
  if (!autoGoto && opts.goto !== false) record.applied.push("navigation skipped: offline-before-load; call s.goto() then s.restore()");
  if (autoGoto) {
    try { await page.goto(opts.base + record.path, { waitUntil: "domcontentloaded" }); }
    catch (e) { await scenario.close().catch(() => {}); throw e; } // never leak the browser when navigation fails
  }
  return scenario;
}

// ---- State transitions -----------------------------------------------------------------------------------------------

async function resizeTo(page, profileId) {
  const p = lookup(profileById, profileId, "profile");
  await page.setViewportSize({ width: p.width, height: p.height });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { width: p.width, height: p.height };
}
async function rotate(page) {
  const { width, height } = page.viewportSize();
  await page.setViewportSize({ width: height, height: width });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  return { width: height, height: width };
}
async function resizeSweep(page, ids) {
  const out = [];
  for (const id of ids || CONFIG.transitions.find(t => t.id === "resize-sweep").steps) out.push({ id, ...(await resizeTo(page, id)) });
  return out;
}
async function foldCycle(page, { cover = "fold-cover-280", open = "fold-open-768" } = {}) {
  const trace = [];
  for (const id of [cover, open, cover]) trace.push({ id, ...(await resizeTo(page, id)) });
  return trace;
}
async function setReducedMotion(page, reduce = true) { await page.emulateMedia({ reducedMotion: reduce ? "reduce" : "no-preference" }); }
async function goBack(page) { return page.goBack({ waitUntil: "domcontentloaded" }); }
/** Press Tab n times and describe what has focus after each press. Selector-agnostic. */
async function tabTrace(page, n = 10) {
  const trace = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press("Tab");
    trace.push(await page.evaluate(() => {
      const e = document.activeElement;
      if (!e || e === document.body) return { tag: "BODY" };
      const r = e.getBoundingClientRect();
      return { tag: e.tagName, role: e.getAttribute("role"), name: (e.getAttribute("aria-label") || e.textContent || "").trim().slice(0, 60),
        href: e.getAttribute("href"), inViewport: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
    }));
  }
  return trace;
}
/** Wait for the app to leave its loading state. Falls back to network quiet when the app has no aria-busy region. */
async function waitForSettled(page, { timeout = 10000 } = {}) {
  try { await page.waitForSelector('[aria-busy="false"]', { timeout }); return "aria-busy=false"; }
  catch (_) { try { await page.waitForLoadState("networkidle", { timeout: 2000 }); return "networkidle"; } catch (__) { return "timeout"; } }
}

// ---- Manifest --------------------------------------------------------------------------------------------------------

function manifest() {
  let sha = "unknown", dirty = null;
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: REPO }).toString().trim();
    dirty = execFileSync("git", ["status", "--porcelain", "--", "tests/support"], { cwd: REPO }).toString().trim() !== "";
  } catch (_) { /* not a git checkout */ }
  let playwrightVersion = "unknown";
  try { playwrightVersion = require("playwright/package.json").version; } catch (_) { /* not installed */ }
  return {
    schema_version: CONFIG.schema_version,
    baseline_sha: sha, support_files_modified_since_commit: dirty,
    generated_utc: new Date().toISOString(),
    environment: { node: process.version, playwright: playwrightVersion, platform: process.platform + "/" + process.arch,
      engines_installed: { chromium: engineInstalled("chromium"), webkit: engineInstalled("webkit") } },
    commands: {
      build_preview: "python3 scripts/build_companion_preview.py",
      self_check: "node tests/support/rc_selfcheck.js",
      manifest: "node tests/support/rc_scenarios.js --manifest <outFile>",
    },
    honesty: CONFIG.honesty, hardware_confirmation_needed: CONFIG.hardware_confirmation_needed,
    profiles: CONFIG.profiles, failure_scenarios: CONFIG.failure_scenarios, time_fixtures: CONFIG.time_fixtures,
    transitions: CONFIG.transitions, unsupported_simulations: CONFIG.unsupported_simulations,
    api: ["startServer", "openScenario", "resizeTo", "rotate", "resizeSweep", "foldCycle", "setReducedMotion", "goBack", "tabTrace", "waitForSettled", "treeDigest", "engineInstalled", "manifest"],
  };
}

module.exports = { CONFIG, profiles: CONFIG.profiles, startServer, openScenario, resizeTo, rotate, resizeSweep, foldCycle,
  setReducedMotion, goBack, tabTrace, waitForSettled, treeDigest, engineInstalled, manifest, REPO };

if (require.main === module) {
  const i = process.argv.indexOf("--manifest");
  if (i === -1) { console.error("Usage: node tests/support/rc_scenarios.js --manifest [outFile]"); process.exit(2); }
  const text = JSON.stringify(manifest(), null, 1) + "\n";
  const out = process.argv[i + 1];
  if (out) { fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true }); fs.writeFileSync(out, text); console.log("Wrote " + out); }
  else process.stdout.write(text);
}
