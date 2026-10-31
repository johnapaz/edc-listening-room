// Browser smoke test. Usage: python3 -m http.server 8765 & node tests/ui_smoke.js [screenshotDir]
// STUB_THUMBS=1 answers YouTube thumbnail requests locally (for sandboxes without network access).
const { chromium } = require("playwright");
const assert = require("node:assert");
const BASE = process.env.BASE || "http://localhost:8765/listening-room/";
const shots = process.argv[2];
const FRI = "2026-11-06", SAT = "2026-11-07", SUN = "2026-11-08";
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

(async () => {
  const browser = await chromium.launch(process.env.CHANNEL ? { channel: process.env.CHANNEL } : {});
  const results = [];
  const ok = (name) => { results.push(name); console.log("PASS", name); };
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, reducedMotion: "reduce" });
  if (process.env.STUB_THUMBS) await ctx.route("https://img.youtube.com/**", r => r.fulfill({ status: 200, contentType: "image/gif", body: PIXEL }));
  const page = await ctx.newPage();
  const errors = [];
  const external = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", m => m.type() === "error" && errors.push(m.text()));
  page.on("request", r => { if (!r.url().startsWith(new URL(BASE).origin)) external.push(r.url()); });

  // The app opens on one festival day (today during the festival, otherwise Friday).
  await page.goto(BASE);
  await page.waitForSelector("#list .lineup-row");
  assert.equal(await page.locator(".days button[aria-pressed=true]").count(), 1); ok("opens on a single festival day");

  await page.goto(BASE + "#/lineup?day=" + FRI);
  await page.waitForSelector("#list .lineup-row");
  assert.equal(await page.locator("#list .lineup-row").count(), 43); ok("Friday lists 43 entries");
  assert.match(await page.textContent("#count"), /43 acts\. Times are from organizer posters and can change\./); ok("one schedule caveat for the list");
  assert.equal(await page.locator(".days button").count(), 3);
  assert.match(await page.textContent(".days button[aria-pressed=true]"), /Friday.*Nov 6 · 43 acts/);

  // Playlist is honest when unpublished (no dead CTA)
  // #68: the Event playlists card shows Insomniac's official Spotify playlist; our YouTube Music playlist stays absent until verified.
  assert.equal(await page.locator("section.playlist-card").count(), 1);
  assert.equal(await page.locator('section.playlist-card a[href^="https://open.spotify.com/playlist/"]').count(), 1);
  assert.equal(await page.locator('section.playlist-card a[href*="music.youtube.com"]').count(), 0); ok("playlist card: official Spotify only, no dead YouTube Music link");

  // Rows: time, artwork, act, play. Artwork and name share a destination; at most two keyboard stops.
  const rowLinks = await page.$$eval("#list .lineup-row:nth-child(2) a", as => as.map(a => [a.className, a.getAttribute("href"), a.tabIndex, a.target]));
  const inApp = rowLinks.filter(([, , , t]) => t !== "_blank");
  assert.ok(inApp.length === 2 && inApp.every(([, h]) => h === inApp[0][1] && h.startsWith("#/artist/")));
  assert.ok(rowLinks.filter(([, , t]) => t >= 0).length <= 2);
  const play = rowLinks.find(([c]) => c === "play-btn");
  if (play) assert.match(play[1], /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  const playNames = await page.$$eval("#list .play-btn[href]", as => as.map(a => a.getAttribute("aria-label")));
  assert.ok(playNames.length > 30 && playNames.every(n => /^Play .+ by .+ on YouTube \(opens in a new tab\)$/.test(n))); ok("one-tap play per row with distinct names");
  assert.ok((await page.evaluate(() => document.querySelector("#list .lineup-row").getBoundingClientRect().height)) <= 80, "compact rows");
  assert.ok((await page.evaluate(() => document.querySelector("#list .lineup-row").getBoundingClientRect().top)) <= 740, "lineup starts on the first screen");
  assert.equal(await page.getAttribute("header a.header-help", "href"), "/about/");
  assert.ok(await page.locator("#rail .rail-card").count() >= 4); ok("Hear Friday rail");

  // Sort: By time is the default; A–Z sorts by name and is kept in the URL.
  const times = await page.$$eval("#list .lineup-row", lis => lis.map(li => li.dataset.id));
  await page.click(".seg button[data-sort='az']");
  assert.ok(/sort=az/.test(page.url()));
  const az = await page.$$eval("#list .row-name", ns => ns.map(n => n.textContent));
  assert.deepEqual(az, az.slice().sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })));
  assert.notDeepEqual(await page.$$eval("#list .lineup-row", lis => lis.map(li => li.dataset.id)), times); ok("A–Z and By time sorting");
  await page.click(".seg button[data-sort='time']");

  // Search lives behind the header button on phones and covers all days.
  assert.equal(await page.isVisible("#q"), false);
  await page.click(".search-toggle");
  assert.equal(await page.evaluate(() => document.activeElement.id), "q"); ok("search opens from the header");
  await page.fill("#q", "acraze");
  assert.match(await page.textContent("#list-title"), /Search results/);
  await page.click("#list .row-copy:has-text('ACRAZE B2B CID')");
  await page.waitForSelector("h1#title");
  assert.match(await page.getAttribute("a.btn-play", "href"), /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/);
  assert.equal(await page.getAttribute("a.btn-play", "target"), "_blank");
  assert.match(await page.getAttribute(".song .track-title >> nth=0", "href"), /^https:\/\/www\.youtube\.com\/watch\?v=/);
  assert.equal(await page.locator("h1#title a.name-link").count(), 2, "each B2B artist is linked");
  assert.ok(await page.locator(".song .artist-link").count() > 0);
  assert.equal(await page.evaluate(() => document.activeElement.id), "title"); ok("artist detail, direct YouTube link, focus moved to heading");
  assert.ok(!/null|undefined/.test(await page.textContent("main")), "stray null/undefined text");
  // The official asset loads unchanged at the brand minimum, including narrow screens.
  for (const width of [280, 360, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const mark = page.locator(".youtube-primary .youtube-icon").first();
    await mark.waitFor();
    await mark.evaluate(img => img.decode());
    assert.equal(await mark.getAttribute("alt"), "");
    assert.equal(Math.round((await mark.boundingBox()).height), 187);
    // The unchanged 1075px-high canvas contains a 579px-high visible mark.
    assert.ok((await mark.boundingBox()).height * 579 / 1075 >= 100);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no overflow at " + width);
  }
  assert.equal(await page.locator("svg.play-icon").count(), 0);
  await page.setViewportSize({ width: 360, height: 740 });
  ok("official YouTube mark loads at 100px without overflow at 280/360/1280");

  await page.goBack();
  await page.waitForSelector("#list .lineup-row");
  assert.equal(await page.inputValue("#q"), "acraze"); ok("back preserves search");

  // Day buttons clear the search and switch days.
  await page.click(`button[data-day='${SAT}']`);
  assert.equal(await page.inputValue("#q"), "");
  assert.equal(await page.locator("#list .lineup-row").count(), 43);
  assert.equal(await page.getAttribute(`button[data-day='${SAT}']`, "aria-pressed"), "true");
  assert.ok(new RegExp("#/lineup\\?day=" + SAT).test(page.url()));
  assert.equal(await page.locator("text=playlist").filter({ hasText: /regenerat|generated/i }).count(), 0); ok("Saturday shows 43, URL keeps context");

  // Unknown times stay explicit for newly listed acts.
  await page.click(".search-toggle");
  await page.fill("#q", "2AR");
  await page.click("#list .row-copy >> nth=0");
  await page.waitForSelector("h1#title");
  assert.match(await page.textContent("main"), /Set time not verified/); ok("new appearance has no invented set time");
  await page.goto(BASE + "#/artist/nope");
  await page.waitForSelector(".error");
  assert.match(await page.textContent("main"), /wasn’t found/); ok("unknown route error state");

  // Tracks tab keeps its own search, so the lineup is never emptied by a track title.
  await page.goto(BASE + "#/listen");
  await page.waitForSelector(".song");
  assert.match(await page.textContent("section.card"), /isn’t ready yet/);
  assert.ok(await page.locator(".song .track-title").count() >= 10); ok("Tracks lists reviewed songs");
  assert.equal(await page.title(), "Tracks · Listening Room");
  const allTracks = await page.locator(".song").count();
  await page.fill("#tq", "carry you");
  assert.ok(await page.locator(".song").count() >= 1 && await page.locator(".song").count() < allTracks);
  assert.match(await page.textContent(".song .track-title >> nth=0"), /Carry You/);
  await page.click("#tab-lineup");
  await page.waitForSelector("#list .lineup-row");
  assert.ok(await page.locator("#list .lineup-row").count() >= 43); ok("track search does not empty the lineup");
  await page.goto(BASE + "#/listen");
  await page.waitForSelector(".song");
  await page.click(`button[data-day='${SUN}']`);
  const sunday = await page.locator(".song").count();
  assert.ok(sunday > 0 && sunday < allTracks);
  assert.ok(new RegExp("#/listen\\?.*tday=" + SUN).test(page.url())); ok("Tracks search and day filter");
  await page.goto(BASE + "#/listen");
  await page.waitForSelector(".song");
  const names = await page.$$eval(".song .track-title", as => as.map(a => a.getAttribute("aria-label")));
  assert.ok(names.every(n => /^Play .+ by .+ on YouTube \(opens in a new tab\)$/.test(n)) && new Set(names).size === names.length);

  // Shared root links land on the act.
  await page.goto(new URL(BASE).origin + "/#/artist/" + encodeURIComponent("edco26:2026-11-08:martin-garrix"));
  await page.waitForSelector("h1#title");
  assert.match(await page.textContent("h1#title"), /Martin Garrix/);
  assert.equal(await page.title(), "Martin Garrix · Listening Room"); ok("per-page document titles");
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector("h1#title")).outlineStyle), "none"); ok("no focus box on the routed heading");
  assert.match(await page.textContent(".back"), /Sunday/); ok("back link names the act's day");
  assert.equal(await page.getAttribute('meta[property="og:image"]', "content"), "https://listeningroom.app/og.png");

  // Keyboard: day buttons are reachable in order.
  await page.goto(BASE + "#/lineup?day=" + FRI);
  await page.waitForSelector("#list .lineup-row");
  await page.focus(`button[data-day='${FRI}']`);
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.day), SAT); ok("keyboard reaches day buttons");

  // Tap targets >= 44px, no horizontal overflow at 360 and at 200% zoom-equivalent (180px)
  const small = await page.evaluate(() => [...document.querySelectorAll("a,button,input,select,summary")]
    .filter(e => e.offsetParent && !e.classList.contains("skip")).map(e => [e, e.getBoundingClientRect()])
    .filter(([e, r]) => r.height < 43).map(([e]) => e.outerHTML.slice(0, 80)));
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

  // Wide screens: picking an act opens a side panel and keeps the list and its scroll position.
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.goto(BASE + "#/lineup?day=" + FRI);
  await page.waitForSelector("#detail .detail-empty");
  const afrojack = page.locator("#list .row-copy:has-text('Afrojack')");
  await afrojack.scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => window.scrollY);
  assert.ok(y > 300, "the row is down the list");
  await afrojack.click();
  await page.waitForSelector("#detail h2#title");
  assert.match(await page.textContent("#detail h2#title"), /Afrojack/);
  assert.equal(await page.locator("#list .lineup-row.selected").count(), 1);
  assert.equal(await page.evaluate(() => window.scrollY), y, "list keeps its place");
  assert.equal(await page.title(), "Afrojack · Listening Room");
  await page.goBack();
  await page.waitForSelector("#detail .detail-empty");
  assert.equal(await page.locator("#list .lineup-row").count(), 43); ok("wide-screen side panel keeps the lineup");
  assert.ok(await page.isVisible("#q") && await page.isVisible("#tab-lineup")); ok("search and navigation in the desktop layout");
  if (shots) {
    await page.locator("#list .row-copy:has-text('Afrojack')").click();
    await page.waitForSelector("#detail h2#title");
    await page.screenshot({ path: shots + "/desktop-1280.png" });
  }

  assert.ok(external.every(url => url.startsWith("https://img.youtube.com/vi/")), "only attributed video thumbnails may load externally"); ok("only official video thumbnail requests");
  assert.deepEqual(errors, []); ok("no console errors");

  // Weak network: data fetch fails
  const p2 = await ctx.newPage();
  await p2.route("**/data/**", r => r.abort());
  await p2.goto(BASE);
  await p2.waitForSelector("[role=alert]");
  assert.match(await p2.textContent("[role=alert]"), /Couldn’t load/); ok("network failure state");
  // Final-push integration flows (#70 handoff).
  const p3 = await browser.newPage({ viewport: { width: 360, height: 740 } });
  await p3.goto(BASE + "#/listen?tq=Other%20Side"); await p3.waitForSelector(".song");
  const spotTrack = p3.locator(".song", { hasText: "Other Side" }).first();
  assert.equal(await spotTrack.locator(".play-btn").count(), 1);
  assert.match(await spotTrack.locator(".spotify-link").getAttribute("href"), /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/); ok("Spotify and YouTube coexist on a track row");
  await p3.click("#tab-lineup"); await p3.waitForSelector("#list .lineup-row");
  // tq stays in the URL so Tracks can restore it, but the Lineup search and list are untouched.
  assert.equal(await p3.inputValue("#q"), ""); assert.equal(await p3.locator("#list .lineup-row").count(), 43); ok("Tracks title search does not filter Lineup");
  await p3.goBack(); await p3.waitForSelector(".song");
  assert.match(await p3.evaluate(() => location.hash), /tq=Other/); await p3.goForward(); await p3.waitForSelector("#list .lineup-row"); ok("browser Back/Forward between Tracks and Lineup");
  await p3.goto(BASE + "#/listen"); await p3.waitForSelector(".song");
  await p3.locator(".song .artist-link").first().click(); await p3.waitForSelector("#title");
  await p3.click("a.back"); await p3.waitForSelector("#list .lineup-row"); ok("Tracks → artist → Back to lineup");
  await p3.goto(BASE + "#/artist/" + encodeURIComponent("edco26:2026-11-06:inbal")); await p3.waitForSelector("#title");
  assert.equal(await p3.locator("a.btn-play").count(), 0);
  await p3.click("text=Browse all tracks →"); await p3.waitForSelector(".song"); ok("zero-track act offers Browse all tracks");
  await p3.goto(BASE + "#/artist/" + encodeURIComponent("edco26:2026-11-06:benda-b2b-vastive")); await p3.waitForSelector("#title");
  const b2bNames = await p3.$$eval("#title .name-link", as => as.map(a => a.textContent));
  assert.ok(b2bNames.length === 2 && b2bNames.every(Boolean)); ok("B2B billing keeps separate artist links");
  await p3.close();
  const p4 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await p4.goto(BASE + "#/lineup?day=2026-11-06"); await p4.waitForSelector("#list .lineup-row");
  await p4.locator("#list .row-copy").nth(5).click(); await p4.waitForSelector("#detail #title");
  const scrolls = await p4.evaluate(() => { const d = document.getElementById("detail"); d.scrollTop = 9999; return getComputedStyle(d).overflowY === "auto" && d.scrollHeight >= d.clientHeight; });
  assert.ok(scrolls); assert.equal(await p4.locator("#list .lineup-row").count() > 30, true); ok("desktop side panel scrolls independently of the lineup");
  await p4.close();
  await browser.close();
  console.log(results.length + " checks passed");
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
