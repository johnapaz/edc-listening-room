// Device-matrix design check: 10 Apple + 20 Android screen profiles (foldables folded and open).
// Apple profiles run in WebKit, Android profiles in Chromium. Measures layout, never fails the build.
// Usage: node tests/device_matrix.js <outDir>    BASE=https://listeningroom.app/listening-room/ (default)
// Viewports marked est are derived from published resolutions; confirm on hardware with innerWidth x innerHeight.
const { chromium, webkit } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const BASE = process.env.BASE || "https://listeningroom.app/listening-room/";
const OUT = process.argv[2] || "device-matrix";
const ENGINES = (process.env.ENGINES || "webkit,chromium").split(",");

const DEVICES = [
  ["apple", "iPhone 17 Pro Max", 440, 956, 3], ["apple", "iPhone 17 Pro / iPhone 17", 402, 874, 3],
  ["apple", "iPhone Air", 420, 912, 3], ["apple", "iPhone 17e", 390, 844, 3, "est"],
  ["apple", "iPhone 16 / 15", 393, 852, 3], ["apple", "iPhone 16 Plus / 15 Pro Max", 430, 932, 3],
  ["apple", "iPhone 14 / 13", 390, 844, 3], ["apple", "iPhone 13 mini", 375, 812, 3],
  ["apple", "iPhone SE (3rd gen)", 375, 667, 2], ["apple", "iPhone Duo cover", 466, 678, 3, "est"],
  ["apple", "iPhone Duo open", 626, 890, 3, "est"],
  ["android", "Galaxy S26 Ultra", 412, 891, 3.5], ["android", "Galaxy S26 / S26+", 384, 832, 2.8125],
  ["android", "Galaxy A17 5G / 4G", 412, 892, 2.625, "est"], ["android", "Galaxy A07", 412, 915, 1.75, "est"],
  ["android", "Galaxy A56 / A36", 412, 915, 2.625], ["android", "Galaxy A16 5G", 412, 915, 2.625],
  ["android", "Pixel 10 / 10a", 412, 923, 2.625], ["android", "Pixel 10 Pro", 410, 914, 3.125],
  ["android", "Pixel 10 Pro XL", 414, 921, 3.25, "est"], ["android", "Moto G Power (2026)", 412, 917, 1.75, "est"],
  ["android", "Moto G Stylus (2026)", 412, 915, 2.625, "est"], ["android", "OnePlus 15", 412, 905, 3.5, "est"],
  ["android", "Galaxy Z Fold8 cover", 412, 960, 2.625, "est"], ["android", "Galaxy Z Fold8 open", 750, 832, 2.625, "est"],
  ["android", "Galaxy Z Fold5 cover", 280, 653, 3], ["android", "Galaxy Z Flip8 open", 412, 960, 2.625, "est"],
  ["android", "Galaxy Z Flip8 cover", 361, 399, 2.625, "est"], ["android", "Pixel 10 Pro Fold cover", 412, 900, 2.625, "est"],
  ["android", "Pixel 10 Pro Fold open", 791, 820, 2.625, "est"], ["android", "Razr+ 2026 cover", 412, 350, 2.625, "est"],
  ["android", "Razr+ 2026 open", 412, 1006, 2.625, "est"], ["android", "Galaxy Tab S10 FE", 800, 1280, 2],
];

const measure = () => {
  const tabs = document.querySelector(".tabs").getBoundingClientRect();
  const row = document.querySelector(".lineup-row");
  const small = [...document.querySelectorAll("a,button,input,select,summary")]
    .filter(e => e.offsetParent && e.tabIndex >= 0 && !e.classList.contains("skip"))
    .filter(e => e.getBoundingClientRect().height < 43).length;
  return {
    firstRowTop: row ? Math.round(row.getBoundingClientRect().top) : null,
    rowHeight: row ? Math.round(row.getBoundingClientRect().height) : null,
    firstActReadable: row ? row.getBoundingClientRect().top + 60 <= tabs.top : false,
    overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    smallTargets: small,
    pageHeight: document.documentElement.scrollHeight,
  };
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const results = [];
  for (const engineName of ENGINES) {
    const engine = engineName === "webkit" ? webkit : chromium;
    const browser = await engine.launch();
    for (const [kind, name, width, height, dpr, est] of DEVICES) {
      if ((kind === "apple") !== (engineName === "webkit") && ENGINES.length > 1) continue;
      const slug = (engineName + "-" + name).toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: Math.min(dpr, 2), isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      const row = { engine: engineName, kind, name, width, height, estimated: Boolean(est) };
      try {
        await page.goto(BASE + "#/lineup", { waitUntil: "networkidle" });
        await page.waitForSelector(".lineup-row");
        Object.assign(row, await page.evaluate(measure));
        await page.screenshot({ path: path.join(OUT, slug + "-lineup.png") });
        await page.goto(BASE + "#/artist/" + encodeURIComponent("edco26:2026-11-08:martin-garrix"));
        await page.waitForSelector("h1#title");
        row.playOnFirstScreen = await page.evaluate(() => {
          const b = document.querySelector(".song .btn");
          return Boolean(b) && b.getBoundingClientRect().bottom <= document.querySelector(".tabs").getBoundingClientRect().top;
        });
        await page.screenshot({ path: path.join(OUT, slug + "-artist.png") });
        await page.goto(BASE + "#/listen");
        await page.waitForSelector(".song");
        await page.screenshot({ path: path.join(OUT, slug + "-tracks.png") });
      } catch (e) {
        row.error = String(e.message || e).slice(0, 200);
      }
      results.push(row);
      console.log([engineName, name, width + "x" + height, "row@" + row.firstRowTop, row.firstActReadable ? "act visible" : "act below fold",
        row.playOnFirstScreen ? "play visible" : "play below fold", row.overflowX ? "OVERFLOW" : "", row.error || ""].join(" | "));
      await ctx.close();
    }
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 1));
  const readable = results.filter(r => r.firstActReadable).length;
  const summary = `Device matrix: ${results.length} profiles, first act visible on ${readable}, overflow on ${results.filter(r => r.overflowX).length}, errors on ${results.filter(r => r.error).length}.`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary + "\n");
})().catch(e => { console.error(e); process.exit(1); });
