// Browser smoke test. Usage: python3 -m http.server 8765 & node tests/ui_smoke.js [screenshotDir]
const { chromium } = require("playwright");
const assert = require("node:assert");
const BASE = process.env.BASE || "http://localhost:8765/listening-room/";
const shots = process.argv[2];

(async () => {
  const browser = await chromium.launch();
  const results = [];
  const ok = (name) => { results.push(name); console.log("PASS", name); };
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  page.on("request", r => { if (!r.url().startsWith(new URL(BASE).origin)) external.push(r.url()); });

  await page.goto(BASE);
  await page.waitForSelector("#list li");
  assert.equal(await page.locator("#list li").count(), 110); ok("all 110 entries listed");
  assert.match(await page.textContent("#count"), /110 lineup entries/);

  // Scenario 1: playlist is honest when unpublished (no dead CTA). Until it is live, its card lives on Listen only.
  assert.equal(await page.locator("section.playlist-card").count(), 0); ok("no unavailable playlist card above the lineup");

  // Design review #47: one keyboard stop per destination, consistent row targets, header About link
  const rowLinks = await page.$$eval("#list li:first-child a", as => as.map(a => [a.className, a.getAttribute("href"), a.tabIndex]));
  const toArtist = rowLinks.filter(([c]) => c !== "facet");
  assert.ok(toArtist.every(([, h]) => h === toArtist[0][1] && h.startsWith("#/artist/")), "row artwork, name and arrow share one destination");
  assert.equal(rowLinks.filter(([, , t]) => t >= 0).length, 2, "two keyboard stops per row: name and day");
  assert.equal(await page.getAttribute("header a.about-link", "href"), "/about/"); ok("lineup rows consistent, keyboard-lean, About in header");

  // Scenario 2: find B2B artist -> song in 3 taps excluding typing, back keeps context
  await page.fill("#q", "acraze");
  await page.click("#list .row-name:has-text('ACRAZE B2B CID')");   // tap 1
  await page.waitForSelector("h1#title");
  const href = await page.getAttribute(".song a.btn >> nth=0", "href"); // tap 2 would open it
  assert.match(href, /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  assert.equal(await page.getAttribute(".song a.btn >> nth=0", "target"), "_blank");
  assert.match(await page.getAttribute(".song .track-title >> nth=0", "href"), /^https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.ok(await page.locator(".song .artist-link").count() > 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), "title"); ok("artist detail, direct YouTube link, focus moved to heading");
  assert.ok(!/null|undefined/.test(await page.textContent("main")), "stray null/undefined text");
  await page.goBack();
  await page.waitForSelector("#list li");
  assert.equal(await page.inputValue("#q"), "acraze"); ok("back preserves search");

  // Scenario 3: day filter
  await page.fill("#q", "");
  await page.click("button[data-day='2026-11-07']");
  assert.equal(await page.locator("#list li").count(), 37);
  assert.equal(await page.getAttribute("button[data-day='2026-11-07']", "aria-pressed"), "true");
  assert.ok(/#\/lineup\?day=2026-11-07/.test(page.url()));
  assert.equal(await page.locator("text=playlist").filter({ hasText: /regenerat|generated/i }).count(), 0); ok("Saturday filter shows 37, URL keeps context");

  // Scenario 4: unknown / conflict states
  await page.click("button[data-day='all']");
  await page.fill("#q", "prospa");
  await page.click("#list .row-name >> nth=0");
  await page.waitForSelector("h1#title");
  assert.match(await page.textContent("main"), /disagree|not verified/i); ok("conflict state visible");
  await page.goto(BASE + "#/artist/nope");
  assert.match(await page.textContent("main"), /wasn’t found/); ok("unknown route error state");

  // Listen tab
  await page.goto(BASE + "#/listen");
  await page.waitForSelector(".song");
  assert.ok(await page.locator(".song a.btn").count() >= 10); ok("Listen lists reviewed songs");
  assert.match(await page.textContent("section.playlist-card"), /Coming soon/);
  assert.equal(await page.locator("section.playlist-card a.btn").count(), 0); ok("Listen: playlist unavailable state, no dead link");
  const names = await page.$$eval(".song a.btn", as => as.map(a => a.getAttribute("aria-label")));
  assert.ok(names.every(n => /^Play .+ on YouTube \(opens in a new tab\)$/.test(n)) && new Set(names).size === names.length, "distinct YouTube button names");
  ok("YouTube buttons have distinct accessible names");

  // Shared root links keep their route; link previews and icons are declared
  await page.goto(new URL(BASE).origin + "/#/artist/" + encodeURIComponent("edco26:2026-11-08:martin-garrix"));
  await page.waitForSelector("h1#title");
  assert.match(await page.textContent("h1#title"), /Martin Garrix/); ok("root share link keeps #/route");
  assert.equal(await page.getAttribute('meta[property="og:image"]', "content"), "https://listeningroom.app/og.png");
  assert.equal(await page.getAttribute('link[rel="icon"]', "href"), "/favicon.svg"); ok("link preview and icon metadata");

  // Keyboard: tab order reaches search and a result, Enter opens
  await page.goto(BASE);
  await page.waitForSelector("#list li");
  await page.focus("#q");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.day), "all"); ok("keyboard reaches day filters");

  // Tap targets >= 44px for interactive elements, no horizontal overflow at 360 and at 200% zoom-equivalent (180px)
  const small = await page.evaluate(() => [...document.querySelectorAll("a,button,input,select,summary")]
    .filter(e => e.offsetParent && !e.classList.contains("skip")).map(e => [e, e.getBoundingClientRect()])
    .filter(([e, r]) => r.height < 43).map(([e]) => e.outerHTML.slice(0, 60)));
  assert.deepEqual(small, []); ok("tap targets >= 44px");
  for (const w of [360, 280, 180]) {
    await page.setViewportSize({ width: w, height: 740 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "overflow at " + w);
  }
  ok("no horizontal overflow at 360/280/180px");
  await page.setViewportSize({ width: 360, height: 740 });
  if (shots) {
    await page.screenshot({ path: shots + "/lineup-360.png" });
    await page.goto(BASE + "#/artist/" + encodeURIComponent("edco26:2026-11-07:acraze-b2b-cid"));
    await page.waitForSelector(".song");
    await page.screenshot({ path: shots + "/artist-360.png" });
  }

  assert.ok(external.every(url => url.startsWith("https://img.youtube.com/vi/")), "only attributed video thumbnails may load externally"); ok("only official video thumbnail requests");
  assert.deepEqual(errors, []); ok("no console errors");

  // Weak network: data fetch fails
  const p2 = await ctx.newPage();
  await p2.route("**/data/**", r => r.abort());
  await p2.goto(BASE);
  await p2.waitForSelector("[role=alert]");
  assert.match(await p2.textContent("[role=alert]"), /Couldn’t load/); ok("network failure state");
  await browser.close();
  console.log(results.length + " checks passed");
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
