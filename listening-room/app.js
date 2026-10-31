"use strict";
// Static, read-only discovery. No visitor credentials or embedded player.
(function () {
  const L = window.RoomLib;
  const main = document.getElementById("main");
  let idx, playlist, checkedOn;
  const fmt = iso => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === null || v === undefined || v === false) return;
      if (k === "text") n.textContent = v;
      else if (k === "class") n.className = v;
      else n.setAttribute(k, v === true ? "" : v);
    });
    kids.flat().filter(k => k !== null && k !== undefined && k !== false).forEach(k => n.append(k));
    return n;
  }
  const readJson = async path => {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(path);
    return r.json();
  };
  function ext(href, text, cls, label) {
    return el("a", { href, class: cls, target: "_blank", rel: "noopener noreferrer", "aria-label": (label || text) + " (opens in a new tab)", text: text + " ↗" });
  }
  const artistLink = (a, ctx, cls) => el("a", { class: cls || "artist-link", href: L.buildHash("artist", ctx, a.artist_id), text: a.display_name });
  function dayLink(p, ctx) {
    const day = L.DAYS.find(d => d.key === p.event_date);
    return el("a", { class: "facet", href: L.buildHash("lineup", { ...ctx, q: "", stage: "", day: p.event_date }), text: day ? day.long : p.day });
  }
  // These are exact reviewed YouTube video thumbnails, never claimed as artist portraits.
  // Keep the complete image, provider attribution and a link to its original video.
  function artwork(s, label, cls) {
    const box = el("span", { class: "artwork " + (cls || ""), "aria-hidden": "true" },
      el("span", { class: "art-fallback", text: label.split(/\s+/).slice(0, 2).map(w => w[0]).join("") }));
    if (s && /^[A-Za-z0-9_-]{11}$/.test(s.video_id)) {
      const img = el("img", { src: "https://img.youtube.com/vi/" + s.video_id + "/mqdefault.jpg", alt: "", width: "320", height: "180", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer" });
      img.addEventListener("error", () => img.remove(), { once: true });
      box.append(img);
    }
    return box;
  }
  function videoArt(s, label, cls) {
    return el("a", { class: "art-link", href: s.url, target: "_blank", rel: "noopener noreferrer", tabindex: "-1", "aria-hidden": "true" }, artwork(s, label, cls));
  }
  function playlistCard() {
    const url = L.validPlaylistUrl(playlist);
    const card = el("section", { class: "card playlist-card", "aria-label": "Event playlist" });
    if (url) card.append(el("h2", { text: playlist.label }), ext(url, "Listen on YouTube Music", "btn", "Listen to " + playlist.label + " on YouTube Music"));
    else card.append(el("details", {}, el("summary", {}, el("span", { text: "Event playlist" }), el("span", { class: "soon", text: "Not available" })),
      el("p", { class: "muted", text: "There is no public event playlist yet. You can open the individual tracks listed here on YouTube." })));
    return card;
  }
  function songRow(s, a, ctx) {
    return el("div", { class: "song" }, videoArt(s, a.display_name, "song-art"),
      el("div", { class: "song-copy" }, ext(s.url, s.title, "track-title"), artistLink(a, ctx),
        s.review_status !== "strong" ? el("small", { class: "muted version", text: "Version may differ from the original release." }) : null),
      el("a", { href: s.url, class: "btn", target: "_blank", rel: "noopener noreferrer", "aria-label": "Open " + s.title + " by " + a.display_name + " on YouTube (opens in a new tab)", text: "YouTube ↗" }));
  }
  function readyToHear(rows, ctx) {
    const seen = new Set();
    const songs = [];
    rows.forEach(p => L.songGroups(p, idx).forEach(g => {
      if (seen.has(g.artist.artist_id) || !g.songs.length) return;
      seen.add(g.artist.artist_id); songs.push({ a: g.artist, s: g.songs[0] });
    }));
    if (!songs.length) return null;
    return el("section", { class: "ready", "aria-labelledby": "ready-title" },
      el("div", { class: "section-heading" }, el("h2", { id: "ready-title", text: "Tracks to try" }), el("a", { href: L.buildHash("listen", ctx), class: "text-link", text: "All " + [...idx.songsByArtist.values()].flat().length + " tracks →" })),
      el("div", { class: "music-grid" }, songs.slice(0, 4).map(({ a, s }) => el("article", { class: "music-card" },
        videoArt(s, a.display_name, "feature-art"), el("div", { class: "music-copy" }, artistLink(a, ctx), ext(s.url, s.title, "track-title"))))));
  }
  function lineupView(ctx) {
    const frag = document.createDocumentFragment();
    frag.append(el("div", { class: "intro" }, el("span", { class: "eyebrow", text: "NOVEMBER 6–8 · TINKER FIELD" }), el("h1", { text: "EDC Orlando 2026" }), el("p", { class: "muted", text: "Find an artist, check their day, and try a track on YouTube." })));
    const search = el("input", { id: "q", type: "search", value: ctx.q, autocomplete: "off", placeholder: "Artist name or B2B partner" });
    frag.append(el("label", { class: "search-label", for: "q", text: "Search artists" }), search);
    const days = el("div", { class: "days", role: "group", "aria-label": "Filter by day" });
    L.DAYS.forEach(d => days.append(el("button", { type: "button", "data-day": d.key, "aria-pressed": String(ctx.day === d.key), "aria-label": d.long, text: d.label })));
    frag.append(days);
    const musicFilter = el("div", { class: "music-filter", role: "group", "aria-label": "Filter by music availability" },
      el("button", { type: "button", "data-music": "all", "aria-pressed": String(!ctx.tracksOnly), text: "All artists" }),
      el("button", { type: "button", "data-music": "tracks", "aria-pressed": String(ctx.tracksOnly), text: "With tracks" }));
    frag.append(musicFilter);
    const stages = L.stageOptions(idx);
    if (stages.length) {
      const sel = el("select", { id: "stage", "aria-label": "Filter by stage" }, el("option", { value: "", text: "All stages" }));
      stages.forEach(s => sel.append(el("option", { value: s.stage_id, selected: ctx.stage === s.stage_id, text: s.display_name })));
      frag.append(sel);
    }
    frag.append(el("div", { id: "featured" }), ...(L.validPlaylistUrl(playlist) ? [playlistCard()] : []),
      el("div", { class: "section-heading lineup-heading" }, el("h2", { text: "Lineup" }), el("span", { class: "muted", text: "By day · alphabetical" })),
      el("p", { id: "count", class: "status", role: "status", "aria-live": "polite" }), el("ul", { id: "list", class: "list" }));
    main.replaceChildren(frag);
    const draw = () => {
      const rows = L.filterLineup(idx, ctx);
      document.getElementById("count").textContent = rows.length + (rows.length === 1 ? " lineup entry" : " lineup entries") + (ctx.day === "all" ? " across the weekend" : " on " + L.DAYS.find(d => d.key === ctx.day).long) + (ctx.tracksOnly ? " with tracks available here." : ".") + " Checked " + checkedOn + ". Poster times are provisional.";
      const featured = ctx.q || ctx.tracksOnly ? null : readyToHear(rows, ctx);
      document.getElementById("featured").replaceChildren(...(featured ? [featured] : []));
      const list = document.getElementById("list");
      const children = [];
      let previousDay;
      rows.forEach(p => {
        if (ctx.day === "all" && p.event_date !== previousDay) {
          const day = L.DAYS.find(d => d.key === p.event_date);
          children.push(el("li", { class: "day-heading" }, el("h3", { text: day.long }), el("span", { class: "muted", text: rows.filter(x => x.event_date === p.event_date).length + " entries" })));
          previousDay = p.event_date;
        }
        children.push(rowFor(p, ctx));
      });
      list.replaceChildren(...children);
      if (!rows.length) list.append(el("li", { class: "empty" }, el("p", { text: "No artists match these filters." }), el("button", { class: "reset-filters", type: "button", text: "Clear filters" })));
      list.querySelector(".reset-filters")?.addEventListener("click", () => { ctx.q = ""; ctx.day = "all"; ctx.tracksOnly = false; ctx.stage = ""; location.hash = L.buildHash("lineup", ctx); });
    };
    const sync = () => history.replaceState(null, "", L.buildHash("lineup", ctx));
    search.addEventListener("input", () => { ctx.q = search.value; sync(); draw(); });
    musicFilter.addEventListener("click", e => {
      const b = e.target.closest("button[data-music]"); if (!b) return;
      ctx.tracksOnly = b.dataset.music === "tracks";
      musicFilter.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); sync(); draw();
    });
    days.addEventListener("click", e => {
      const b = e.target.closest("button[data-day]"); if (!b) return;
      ctx.day = b.dataset.day; days.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); sync(); draw();
    });
    const stageSel = document.getElementById("stage");
    if (stageSel) stageSel.addEventListener("change", () => { ctx.stage = stageSel.value; sync(); draw(); });
    draw();
  }
  function rowFor(p, ctx) {
    const n = L.songCount(p, idx);
    const s = L.songGroups(p, idx).flatMap(g => g.songs)[0];
    const link = el("a", { class: "row-name", href: L.buildHash("artist", ctx, p.performance_id), text: p.display_name });
    const sched = L.scheduleState(p, idx, fmt);
    return el("li", { class: "lineup-row" }, el("a", { class: "art-link", href: link.href, tabindex: "-1", "aria-hidden": "true" }, artwork(s, p.display_name, "row-art")),
      el("div", { class: "row-copy" }, link, el("div", { class: "row-meta" }, dayLink(p, ctx), el("span", { class: n ? "available" : "muted", text: n ? n + (n === 1 ? " track" : " tracks") : "No tracks added" })),
        el("p", { class: "row-schedule", text: sched.kind === "unconfirmed" ? sched.stage + " · " + sched.time + " · Poster time" : sched.kind === "verified" ? sched.text : "Set time not verified" })),
      el("a", { class: "go", href: link.href, tabindex: "-1", "aria-hidden": "true", text: "→" }));
  }
  function artistView(id, ctx) {
    const identity = idx.artists.get(id);
    const p = identity ? { display_name: identity.display_name, artist_ids: [id] } : idx.performances.find(x => x.performance_id === id);
    const back = el("a", { class: "back", href: L.buildHash("lineup", ctx), text: "← Back to lineup" });
    if (!p) { main.replaceChildren(back, el("p", { class: "error", role: "alert", text: "That lineup entry wasn’t found." })); return; }
    const groups = L.songGroups(p, idx);
    const first = groups.flatMap(g => g.songs)[0];
    const allBookings = identity ? idx.performances.filter(x => x.artist_ids.includes(id)) : [p];
    const frag = document.createDocumentFragment();
    frag.append(back, el("section", { class: "artist-hero" + (first ? "" : " no-art") }, first ? videoArt(first, p.display_name, "hero-art") : artwork(null, p.display_name, "hero-art"),
      el("div", {}, el("span", { class: "eyebrow", text: first ? "Track artwork from YouTube" : "EDC Orlando 2026" }),
        el("h1", { id: "title", tabindex: "-1" }, el("a", { href: L.buildHash("lineup", { day: "all", stage: "", q: p.display_name }), text: p.display_name })),
        el("div", { class: "facets" }, allBookings.map(b => dayLink(b, ctx))))));
    if (!identity) {
      const sched = L.scheduleState(p, idx, fmt);
      frag.append(el("p", { class: sched.kind === "verified" ? "" : "flag", text: sched.text }));
      if (sched.kind === "verified" && p.stage_id) frag.append(el("a", { class: "facet", href: L.buildHash("lineup", { day: "all", q: "", stage: p.stage_id }), text: sched.stage }));
      if (p.set_qualifier) frag.append(el("p", { class: "muted", text: "Billing note: " + p.set_qualifier }));
    }
    frag.append(el("h2", { class: "artist-section", text: "Tracks" }));
    if (!groups.some(g => g.songs.length)) frag.append(el("div", { class: "empty" }, el("p", { text: "No tracks have been added for this act." }), el("a", { class: "text-link", href: L.buildHash("listen", ctx), text: "Browse available tracks →" })));
    groups.forEach(g => {
      if (groups.length > 1) frag.append(el("h3", {}, artistLink(g.artist, ctx)));
      if (!g.songs.length && groups.length > 1) frag.append(el("p", { class: "muted", text: "No tracks added for this artist." }));
      g.songs.forEach(s => frag.append(songRow(s, g.artist, ctx)));
    });
    main.replaceChildren(frag); document.getElementById("title").focus();
  }
  function listenView(ctx) {
    const frag = document.createDocumentFragment();
    frag.append(el("div", { class: "intro" }, el("h1", { text: "Tracks" }), el("p", { class: "muted", text: [...idx.songsByArtist.values()].flat().length + " tracks from " + idx.songsByArtist.size + " lineup artists. Each opens on YouTube." })));
    const ul = el("ul", { class: "list" });
    idx.songsByArtist.forEach((songs, id) => { const a = idx.artists.get(id); if (a) songs.forEach(s => ul.append(el("li", {}, songRow(s, a, ctx)))); });
    frag.append(ul, playlistCard()); main.replaceChildren(frag);
  }
  function route() {
    if (!idx) return;
    const r = L.parseHash(location.hash);
    document.getElementById("tab-lineup").href = L.buildHash("lineup", r.ctx);
    document.getElementById("tab-listen").href = L.buildHash("listen", r.ctx);
    document.querySelectorAll(".tabs a").forEach(a => a.removeAttribute("aria-current"));
    document.getElementById(r.view === "listen" ? "tab-listen" : "tab-lineup").setAttribute("aria-current", "page");
    if (r.view === "artist") artistView(r.id, r.ctx); else if (r.view === "listen") listenView(r.ctx); else lineupView(r.ctx);
    if (r.view !== "artist") window.scrollTo(0, 0);
  }
  // A skip link must focus content without changing the app's hash route.
  document.querySelector(".skip").addEventListener("click", e => { e.preventDefault(); main.focus(); main.scrollIntoView(); });
  Promise.all(["performances", "artists", "venues", "event"].map(n => readJson("../data/edco-2026/" + n + ".json")).concat(readJson("../data/listening-room/songs.json"), readJson("../data/listening-room/playlist.json")))
    .then(([perf, art, ven, ev, songs, pl]) => {
      if (!Array.isArray(perf.performances) || !Array.isArray(art.artists) || !Array.isArray(songs.songs)) throw new Error("schema");
      idx = L.index({ performances: perf.performances, artists: art.artists, stages: ven.stages, songs: songs.songs }); playlist = pl;
      checkedOn = perf.checked_on || "date unavailable";
      document.getElementById("freshness").textContent = "Lineup checked " + (perf.checked_on || "unknown date") + ". Set times transcribed from organizer posters; cross-check the official schedule. Listing order is not running order.";
      route();
    }).catch(() => main.replaceChildren(el("p", { class: "error", role: "alert", text: "Couldn’t load the lineup. Check your connection and reload." }), el("p", {}, ext("https://orlando.edc.com/lineup/", "Official lineup"))));
  window.addEventListener("hashchange", route);
})();
