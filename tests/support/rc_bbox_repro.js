"use strict";
/*
 * Repro harness for the intermittent null boundingBox() in tests/ui_smoke.js (official YouTube mark block, after a viewport resize).
 * It replays the SAME steps as ui_smoke.js without changing any assertion there, and records a timeline so the cause is evidence, not a guess:
 * when the viewport change resolved, when the (min-width:1100px) listener fired, when the .youtube-icon node was replaced, and what each step saw.
 *
 *   python3 scripts/build_public_site.py && node tests/support/rc_bbox_repro.js [--iterations 60] [--load 3] [--id <artist id>]
 *
 * --load N spawns N busy-loop processes to slow the browser (a loaded CI runner). Exit 0 always; it reports counts.
 */
const { spawn } = require("node:child_process");
const rc = require("./rc_scenarios");
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : d; };
const N = Number(arg("--iterations", 60)), LOAD = Number(arg("--load", 0)), ID = arg("--id", "edco26:2026-11-07:acraze-b2b-cid");

(async () => {
  const load = Array.from({ length: LOAD }, () => spawn(process.execPath, ["-e", "for(;;){}"], { stdio: "ignore" }));
  const server = await rc.startServer("public-site");
  const tally = { runs: 0, failed: 0, byWidth: {}, causes: {} }; const samples = [];
  try {
    for (let i = 0; i < N; i++) {
      const s = await rc.openScenario({ engine: "chromium", profile: "phone-360", base: server.base, path: "/listening-room/", reducedMotion: true, goto: false, scenario: "thumbnails-stub" });
      const page = s.page;
      await page.addInitScript(() => {
        window.__t = []; const log = (k, extra) => window.__t.push({ k, t: Math.round(performance.now()), ...extra });
        document.addEventListener("DOMContentLoaded", () => {
          matchMedia("(min-width: 1100px)").addEventListener("change", e => log("wide-change", { matches: e.matches }));
          new MutationObserver(ms => { for (const m of ms) { for (const n of m.removedNodes) if (n.nodeType === 1 && (n.matches?.(".youtube-icon") || n.querySelector?.(".youtube-icon"))) log("icon-removed");
            for (const n of m.addedNodes) if (n.nodeType === 1 && (n.matches?.(".youtube-icon") || n.querySelector?.(".youtube-icon"))) log("icon-added"); } }).observe(document.body, { childList: true, subtree: true });
        });
      });
      await s.goto("/listening-room/#/artist/" + encodeURIComponent(ID));
      await page.waitForSelector("h1#title"); tally.runs++;
      let failedAt = null, stage = "", result = [];
      for (const width of [280, 360, 1280]) {
        stage = "resize";
        await page.evaluate(() => window.__t.push({ k: "test-resize-start", t: Math.round(performance.now()) }));
        await page.setViewportSize({ width, height: 900 });
        await page.evaluate(w => window.__t.push({ k: "test-resize-done", w, t: Math.round(performance.now()) }), width);
        const mark = page.locator(".youtube-primary .youtube-icon").first();
        try {
          stage = "waitFor"; await mark.waitFor();
          stage = "decode"; await mark.evaluate(img => img.decode());
          stage = "boundingBox#1"; const b1 = await mark.boundingBox(); if (!b1) throw new Error("null boundingBox"); b1.height;
          stage = "boundingBox#2"; const b2 = await mark.boundingBox(); if (!b2) throw new Error("null boundingBox");
          result.push(width + ":" + Math.round(b1.height));
        } catch (e) { failedAt = { width, stage, error: String(e.message).split("\n")[0].slice(0, 120) }; break; }
      }
      if (failedAt) {
        tally.failed++; tally.byWidth[failedAt.width] = (tally.byWidth[failedAt.width] || 0) + 1; const key = failedAt.stage + " @" + failedAt.width; tally.causes[key] = (tally.causes[key] || 0) + 1;
        if (samples.length < 3) samples.push({ failedAt, timeline: await page.evaluate(() => window.__t).catch(() => []), state: await page.evaluate(() => ({ iconCount: document.querySelectorAll(".youtube-icon").length, primary: document.querySelectorAll(".youtube-primary").length, view: document.querySelector("main")?.dataset.view, inPanel: !!document.querySelector("#detail .youtube-icon") })).catch(() => null) });
      }
      if (process.argv.includes("--show") && !failedAt && samples.length < 2) samples.push({ passing_run: result, timeline: await page.evaluate(() => window.__t) });
      await s.close();
    }
  } finally { await server.close(); load.forEach(p => p.kill()); }
  console.log(JSON.stringify({ iterations: N, load: LOAD, ...tally }, null, 1));
  for (const x of samples) console.log("SAMPLE", JSON.stringify(x));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
