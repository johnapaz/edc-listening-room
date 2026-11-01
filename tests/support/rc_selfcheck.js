"use strict";
/*
 * Self-check and usage example for rc_scenarios.js. It verifies that the HELPER delivers the conditions it promises
 * (viewport, injected failures, restoration, isolation, clock, read-only serving). It is not product acceptance:
 * it uses fetch/DOM probes only and never depends on Companion selectors, so frontend changes cannot break it.
 *
 *   python3 scripts/build_companion_preview.py
 *   node tests/support/rc_selfcheck.js [--out dir]        exit 0 = helper verified, 1 = helper defect
 *
 * Engines that are not installed are reported as SKIPPED, never as passed.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const rc = require("./rc_scenarios");

const outIndex = process.argv.indexOf("--out");
const OUT = outIndex > -1 ? path.resolve(process.argv[outIndex + 1]) : null;
const results = [];
const note = (engine, name, status, detail) => { results.push({ engine, check: name, status, detail }); console.log(status.toUpperCase().padEnd(7), engine.padEnd(8), name, detail || ""); };

const fetchStatus = (page, url) => page.evaluate(async u => {
  try { const r = await fetch(u, { cache: "no-store" }); const text = await r.text(); let json = null, parsed = false;
    try { json = JSON.parse(text); parsed = true; } catch (_) { /* malformed */ }
    return { status: r.status, parsed, json }; }
  catch (e) { return { error: String(e.message || e) }; }
}, url);
const imgOutcome = (page, src) => page.evaluate(s => new Promise(resolve => {
  const i = new Image(); i.onload = () => resolve({ loaded: true, width: i.naturalWidth }); i.onerror = () => resolve({ loaded: false }); i.src = s;
}), src);

const PERF = "/data/edco-2026/performances.json", SONGS = "/data/listening-room/songs.json";
const THUMB = "https://img.youtube.com/vi/aaaaaaaaaaa/mqdefault.jpg";

async function run() {
  const server = await rc.startServer("companion-preview");
  const before = rc.treeDigest(server.root);
  const engines = ["chromium", "webkit"];
  for (const engine of engines) {
    if (!rc.engineInstalled(engine)) { note(engine, "engine", "skipped", "browser not installed; nothing verified for this engine"); continue; }
    const open = o => rc.openScenario({ engine, base: server.base, path: "/companion/", ...o });
    const check = async (name, fn) => {
      try { const detail = await fn(); note(engine, name, "pass", detail); }
      catch (e) { note(engine, name, "fail", String(e.message || e).split("\n")[0]); }
    };

    await check("profiles apply exact CSS viewport", async () => {
      const ids = rc.profiles.filter(p => p.engines.includes(engine)).map(p => p.id);
      for (const id of ids) {
        const s = await open({ profile: id });
        try {
          const m = await s.page.evaluate(() => ({ w: innerWidth, h: innerHeight, touch: navigator.maxTouchPoints > 0 }));
          assert.deepEqual([m.w, m.h], [s.profile.width, s.profile.height], id + " viewport");
        } finally { await s.close(); }
      }
      return ids.length + " profiles";
    });

    await check("normal: data served unmodified, no external traffic", async () => {
      const s = await open({ profile: "phone-390", scenario: "normal" });
      try {
        const r = await fetchStatus(s.page, PERF);
        assert.equal(r.status, 200); assert.ok(Array.isArray(r.json.performances), "performances is an array in the repo data"); assert.equal(r.json.performances.length, 130);
        await imgOutcome(s.page, THUMB);
        const blocked = s.record.requests.filter(q => q.kind === "external-blocked");
        assert.ok(blocked.length >= 1, "external image request recorded as blocked");
        assert.equal(s.record.requests.filter(q => q.kind === "external-stubbed").length, 0);
      } finally { await s.close(); }
    });

    await check("required-503: fails, then restore() lets retry succeed", async () => {
      const s = await open({ profile: "phone-360", scenario: "required-503" });
      try {
        assert.equal((await fetchStatus(s.page, PERF)).status, 503);
        await s.restore();
        assert.equal((await fetchStatus(s.page, PERF)).status, 200);
        assert.ok(s.record.requests.some(q => q.kind === "injected" && q.scenario === "required-503"));
      } finally { await s.close(); }
    });

    await check("required-503-then-ok: exactly fail_count failures", async () => {
      // Probe from a static page: the Companion app would spend the failure budget on its own load.
      const s = await open({ profile: "phone-360", path: "/404.html", scenario: "required-503-then-ok", params: { fail_count: 2 } });
      try {
        const got = [];
        for (let i = 0; i < 4; i++) got.push((await fetchStatus(s.page, PERF)).status);
        assert.deepEqual(got, [503, 503, 200, 200]);
      } finally { await s.close(); }
    });

    await check("required-malformed and incompatible-schema", async () => {
      let s = await open({ profile: "phone-360", scenario: "required-malformed" });
      try { const r = await fetchStatus(s.page, PERF); assert.equal(r.status, 200); assert.equal(r.parsed, false, "body must not parse"); } finally { await s.close(); }
      s = await open({ profile: "phone-360", scenario: "required-incompatible-schema" });
      try { const r = await fetchStatus(s.page, PERF); assert.equal(r.parsed, true); assert.equal(Array.isArray(r.json.performances), false); assert.equal(r.json.schema_version, 99);
        const artists = await fetchStatus(s.page, "/data/edco-2026/artists.json"); assert.ok(artists.json, "only the targeted file is altered"); assert.notEqual(artists.json.schema_version, 99); } finally { await s.close(); }
    });

    await check("required-delayed holds responses for delay_ms", async () => {
      const s = await open({ profile: "phone-360", scenario: "required-delayed", params: { delay_ms: 600 } });
      try {
        const t = await s.page.evaluate(async u => { const a = performance.now(); await fetch(u, { cache: "no-store" }); return performance.now() - a; }, PERF);
        assert.ok(t >= 550, "elapsed " + Math.round(t) + " ms");
        return "elapsed " + Math.round(t) + " ms";
      } finally { await s.close(); }
    });

    await check("optional songs failures leave required data intact", async () => {
      for (const scenario of ["optional-songs-503", "optional-songs-malformed"]) {
        const s = await open({ profile: "phone-360", scenario });
        try {
          const req = await fetchStatus(s.page, PERF); assert.equal(req.status, 200);
          const songs = await fetchStatus(s.page, SONGS);
          if (scenario === "optional-songs-503") assert.equal(songs.status, 503); else assert.equal(songs.parsed, false);
        } finally { await s.close(); }
      }
    });

    await check("thumbnails: fail vs stub", async () => {
      let s = await open({ profile: "phone-360", scenario: "thumbnails-fail" });
      try { assert.equal((await imgOutcome(s.page, THUMB)).loaded, false); assert.ok(s.record.requests.some(q => q.reason === "scenario")); } finally { await s.close(); }
      s = await open({ profile: "phone-360", scenario: "thumbnails-stub" });
      try { const r = await imgOutcome(s.page, THUMB); assert.equal(r.loaded, true); assert.equal(r.width, 1); } finally { await s.close(); }
    });

    await check("offline-before-load fails navigation; restore recovers", async () => {
      const s = await open({ profile: "phone-390", scenario: "offline-before-load", goto: false });
      try {
        await assert.rejects(s.goto("/companion/"));
        await s.restore();
        await s.goto("/companion/");
        assert.equal((await fetchStatus(s.page, PERF)).status, 200);
      } finally { await s.close(); }
    });

    await check("network-lost-after-load: data fetch fails only after afterLoad()", async () => {
      const s = await open({ profile: "phone-390", scenario: "network-lost-after-load" });
      try {
        assert.equal((await fetchStatus(s.page, PERF)).status, 200);
        await s.afterLoad();
        assert.ok((await fetchStatus(s.page, PERF)).error, "fetch rejects while offline");
        await s.restore();
        assert.equal((await fetchStatus(s.page, PERF)).status, 200);
      } finally { await s.close(); }
    });

    await check("time fixtures: instant, festival-timezone date, DST abbreviation", async () => {
      const probe = s => s.page.evaluate(() => {
        const now = new Date();
        const f = o => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", ...o }).format(now);
        return { iso: now.toISOString(), date: f({ year: "numeric", month: "2-digit", day: "2-digit" }),
          zone: new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "short" }).format(now).split(" ").pop() };
      });
      const expect = {
        "stale-boundary-before": ["2026-11-05", "EST"], "stale-boundary-at": ["2026-11-06", "EST"],
        "festival-midnight-rollover": ["2026-11-06", "EST"], "festival-after-midnight": ["2026-11-07", "EST"],
        "dst-fall-back-first-1am": ["2026-11-01", "EDT"], "dst-fall-back-second-1am": ["2026-11-01", "EST"],
      };
      for (const [id, [date, zone]] of Object.entries(expect)) {
        const s = await open({ profile: "phone-360", time: id });
        try {
          const p = await probe(s);
          assert.ok(Math.abs(Date.parse(p.iso) - Date.parse(s.record.time.instant)) < 5000, id + " instant " + p.iso);
          assert.equal(p.date, date, id + " local date"); assert.equal(p.zone, zone, id + " zone");
        } finally { await s.close(); }
      }
      return Object.keys(expect).length + " fixtures";
    });

    await check("transitions: rotate, fold cycle, sweep, reduced motion, tab trace, back", async () => {
      const s = await open({ profile: "phone-390" });
      try {
        assert.deepEqual(await rc.rotate(s.page), { width: 844, height: 390 });
        assert.equal(await s.page.evaluate(() => innerWidth), 844);
        await rc.resizeTo(s.page, "phone-390");
        const fold = await rc.foldCycle(s.page);
        assert.deepEqual(fold.map(x => x.width), [280, 768, 280]);
        assert.equal(await s.page.evaluate(() => innerWidth), 280);
        const sweep = await rc.resizeSweep(s.page);
        assert.equal(sweep.length, 8); assert.equal(await s.page.evaluate(() => matchMedia("(min-width: 1100px)").matches), false);
        await rc.resizeTo(s.page, "desktop-1100");
        assert.equal(await s.page.evaluate(() => matchMedia("(min-width: 1100px)").matches), true);
        await rc.setReducedMotion(s.page, true);
        assert.equal(await s.page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
        await rc.waitForSettled(s.page);
        assert.equal((await rc.tabTrace(s.page, 4)).length, 4);
        await s.goto("/listening-room/");
        const back = await rc.goBack(s.page); assert.ok(back, "goBack returned a response");
        assert.match(s.page.url(), /\/companion\//);
      } finally { await s.close(); }
    });
  }

  const after = rc.treeDigest(server.root);
  assert.equal(after, before, "served artifact must be byte-identical after the run");
  note("all", "served artifact unmodified", "pass", "digest " + before.slice(0, 12));
  const repoPerf = fs.readFileSync(path.join(rc.REPO, "data/edco-2026/performances.json"));
  assert.ok(repoPerf.length > 0);
  await server.close();
  if (OUT) { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, "rc-selfcheck-results.json"), JSON.stringify({ manifest: rc.manifest(), results }, null, 1) + "\n"); }
  const failed = results.filter(r => r.status === "fail").length, skipped = results.filter(r => r.status === "skipped").length;
  console.log("RC helper self-check: " + results.filter(r => r.status === "pass").length + " passed, " + failed + " failed, " + skipped + " skipped (skipped engines are unverified)");
  process.exit(failed ? 1 : 0);
}
run().catch(e => { console.error(e); process.exit(1); });
