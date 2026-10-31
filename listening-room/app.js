"use strict";
// Static, read-only discovery. No visitor credentials or embedded player; YouTube and Spotify are plain outbound links.
(function () {
  const L = window.RoomLib;
  const main = document.getElementById("main");
  const wide = window.matchMedia("(min-width: 1100px)");
  let idx, playlist;
  let openSearch = false;
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
  function svg(cls, d, viewBox) {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("class", cls); s.setAttribute("viewBox", viewBox || "0 0 16 16"); s.setAttribute("aria-hidden", "true"); s.setAttribute("focusable", "false");
    const p = document.createElementNS(ns, "path"); p.setAttribute("d", d); s.append(p);
    return s;
  }
  // Compact links use text; the official mark needs 100px height under current brand guidance.
  const youtubeLabel = () => el("span", { class: "provider-label", text: "YouTube" });
  const youtubeIcon = () => el("img", { class: "youtube-icon", src: "youtube-icon.png", alt: "", width: "218", height: "187" });
  const refreshIcon = () => svg("ui-icon", "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7", "0 0 24 24");
  const shareIcon = () => svg("ui-icon", "M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5", "0 0 24 24");
  const readJson = async path => {
    const r = await fetch(path, { cache: "no-cache" });
    if (!r.ok) throw new Error(path);
    return r.json();
  };
  const day = key => L.DAYS.find(d => d.key === key);
  const dayName = key => day(key).long.split(",")[0];
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  function ext(href, text, cls, label) {
    return el("a", { href, class: cls, target: "_blank", rel: "noopener noreferrer", "aria-label": (label || text) + " (opens in a new tab)", text: text + " ↗" });
  }
  const playLabel = (s, artistName) => "Play " + s.title + " by " + artistName + " on YouTube (opens in a new tab)";
  const artistLink = (a, ctx, cls) => el("a", { class: cls || "artist-link", href: L.buildHash("artist", ctx, a.artist_id), text: a.display_name });
  const firstSong = p => L.songGroups(p, idx).flatMap(g => g.songs)[0];
  const firstGroup = p => L.songGroups(p, idx).find(g => g.songs.length);

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
  // A pointer shortcut to the same destination as a labelled link nearby, so it stays out of the tab order.
  const shortcut = (href, cls, external, ...kids) => el("a", Object.assign({ class: cls, href, tabindex: "-1", "aria-hidden": "true" },
    external ? { target: "_blank", rel: "noopener noreferrer" } : {}), ...kids);

  // One card for every whole-event way to listen: ours on YouTube Music (once verified) and the organizer's own on Spotify.
  function playlistCard() {
    const url = L.validPlaylistUrl(playlist);
    const official = L.officialSpotifyPlaylist(playlist);
    const card = el("section", { class: "card playlist-card", "aria-labelledby": "playlists-title" },
      el("h2", { id: "playlists-title", text: "Event playlists" }));
    const rows = el("div", { class: "playlist-rows" });
    if (url) rows.append(el("div", { class: "playlist-row" }, el("div", {}, el("strong", { text: playlist.label }), el("p", { class: "muted", text: "Our reviewed tracks, one playlist." })),
      ext(url, "YouTube Music", "btn", "Listen to " + playlist.label + " on YouTube Music")));
    if (official) rows.append(el("div", { class: "playlist-row" }, el("div", {}, el("strong", { text: official.label }), el("p", { class: "muted", text: (official.curator ? "Curated by " + official.curator + " on Spotify. " : "") + "Not made or checked by Listening Room." })),
      ext(official.url, "Spotify", "btn btn-alt", "Open " + official.label + " on Spotify")));
    if (!url) rows.append(el("p", { class: "muted playlist-pending", text: "Our own event playlist on YouTube Music isn’t ready yet. Until then, open any track below on YouTube or Spotify." }));
    card.append(rows);
    return card;
  }

  // Spotify track link only where the reviewed match was made against that exact track (#68). Plain outbound link.
  function spotifyLink(s, a, cls) {
    const url = L.safeSpotifyUrl(s.spotify_url, "track");
    return url ? el("a", { class: cls || "spotify-link", href: url, target: "_blank", rel: "noopener noreferrer", "aria-label": "Open " + s.title + " by " + a.display_name + " on Spotify (opens in a new tab)", text: "Spotify" }) : null;
  }
  function songRow(s, a, ctx) {
    const credited = s.artist_ids.map(id => idx.artists.get(id)).filter(Boolean);
    return el("div", { class: "song" }, shortcut(s.url, "art-link", true, artwork(s, a.display_name, "song-art")),
      el("div", { class: "song-copy" },
        el("a", { class: "track-title", href: s.url, target: "_blank", rel: "noopener noreferrer", "aria-label": playLabel(s, a.display_name), text: s.title }),
        el("div", { class: "song-credits" }, credited.flatMap((artist, i) => i ? [document.createTextNode(" · "), artistLink(artist, ctx)] : [artistLink(artist, ctx)])),
        s.review_status !== "strong" && s.verification !== "source_reviewed" ? el("small", { class: "muted version", text: "Version may differ from the original release." }) : null),
      el("div", { class: "song-actions" }, spotifyLink(s, a), shortcut(s.url, "play-btn", true, youtubeLabel())));
  }

  // ---------- Lineup ----------
  function railSongs(rows) {
    const seen = new Set();
    const out = [];
    rows.forEach(p => L.songGroups(p, idx).forEach(g => {
      const s = g.songs[0];
      if (!s || seen.has(s.video_id)) return;
      seen.add(s.video_id); out.push({ a: g.artist, s });
    }));
    return out;
  }
  function rail(ctx, rows) {
    let songs = railSongs(rows);
    if (!songs.length) return null;
    const strip = el("div", { class: "rail-strip" });
    const fill = () => strip.replaceChildren(...songs.slice(0, 10).map(({ a, s }) => el("article", { class: "rail-card" },
      shortcut(s.url, "art-link", true, artwork(s, a.display_name, "rail-art")),
      el("a", { class: "track-title", href: s.url, target: "_blank", rel: "noopener noreferrer", "aria-label": playLabel(s, a.display_name), text: s.title }),
      artistLink(a, ctx))));
    // Reorders the cards only; nothing is queued or played.
    const more = el("button", { type: "button", class: "text-btn", "aria-label": "Show other tracks from " + dayName(ctx.day) }, refreshIcon(), el("span", { text: "Show others" }));
    more.addEventListener("click", () => {
      songs = songs.slice();
      for (let i = songs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [songs[i], songs[j]] = [songs[j], songs[i]]; }
      fill();
    });
    fill();
    return el("section", { class: "rail", "aria-labelledby": "rail-title" },
      el("div", { class: "section-heading" }, el("h2", { id: "rail-title", text: "Hear " + dayName(ctx.day) }), more), strip);
  }
  function rowFor(p, ctx, crossDay) {
    const n = L.songCount(p, idx);
    const g = firstGroup(p);
    const s = g && g.songs[0];
    const sched = L.scheduleState(p, idx, fmt);
    const href = L.buildHash("artist", ctx, p.performance_id);
    const meta = [crossDay ? dayName(p.event_date) : null,
      sched.kind === "conflict" ? "Billing unconfirmed" : sched.stage || (sched.time ? null : "Set time not verified"),
      n ? plural(n, "track", "tracks") : "No tracks yet"].filter(Boolean).join(" · ");
    return el("li", { class: "lineup-row", "data-id": p.performance_id },
      el("span", { class: "row-time" + (sched.time ? "" : " none") }, sched.time ? fmt(p.starts_at) : el("span", { "aria-label": "No set time", text: "—" })),
      shortcut(href, "art-link", false, artwork(s, p.display_name, "row-art")),
      el("a", { class: "row-copy", href }, el("span", { class: "row-name", text: p.display_name }), el("span", { class: "row-meta" + (n ? "" : " quiet"), text: meta })),
      s ? el("a", { class: "play-btn", href: s.url, target: "_blank", rel: "noopener noreferrer", "aria-label": playLabel(s, g.artist.display_name) }, youtubeLabel())
        : el("span", { class: "play-btn empty", "aria-hidden": "true" }));
  }
  const lineupKey = ctx => JSON.stringify([ctx.day, ctx.sort, ctx.q, ctx.stage]);
  function lineupView(ctx) {
    const list = el("ul", { id: "list", class: "list" });
    const count = el("p", { id: "count", class: "status", role: "status", "aria-live": "polite" });
    const listTitle = el("h2", { id: "list-title" });
    const railHost = el("div", { id: "rail" });
    const search = el("input", { id: "q", type: "search", value: ctx.q, autocomplete: "off", placeholder: "Artist or B2B partner" });
    const searchRow = el("div", { class: "search-row" + (ctx.q || openSearch ? " open" : "") }, el("label", { class: "search-label", for: "q", text: "Search all three days" }), search);
    const days = el("div", { class: "days", role: "group", "aria-label": "Day" });
    L.EVENT_DAYS.forEach(d => days.append(el("button", { type: "button", "data-day": d.key },
      el("span", { class: "day-name", text: dayName(d.key) }),
      el("span", { class: "day-sub", text: d.long.split(", ")[1] + " · " + plural(idx.performances.filter(p => p.event_date === d.key).length, "act", "acts") }))));
    const sorts = el("div", { class: "seg", role: "group", "aria-label": "Sort" },
      el("button", { type: "button", "data-sort": "az", text: "A–Z" }), el("button", { type: "button", "data-sort": "time", text: "By time" }));
    const listPane = el("div", { class: "list-pane" },
      el("h1", { class: "sr-only", text: "EDC Orlando 2026 lineup" }),
      el("p", { class: "context", text: "EDC Orlando 2026 · Nov 6–8 · Tinker Field · Unofficial" }),
      searchRow, days, railHost,
      el("div", { class: "section-heading list-head" }, listTitle, sorts), count, list,
      // Below the list so the first act stays on the first screen (v2 priority); Tracks shows it at the top.
      ...(L.validPlaylistUrl(playlist) || L.officialSpotifyPlaylist(playlist) ? [playlistCard()] : []));
    const frag = wide.matches
      ? el("div", { class: "split" }, listPane, el("aside", { id: "detail", class: "detail", "aria-label": "Selected act" }, emptyDetail()))
      : listPane;
    main.replaceChildren(frag);
    main.dataset.view = "lineup";
    const draw = () => {
      const searching = Boolean(L.normalize(ctx.q));
      const rows = L.sortRows(L.filterLineup(idx, { day: searching ? "all" : ctx.day, q: ctx.q, stage: ctx.stage }), ctx.sort);
      days.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(!searching && b.dataset.day === ctx.day)));
      sorts.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.sort === ctx.sort)));
      listTitle.textContent = searching ? "Search results" : dayName(ctx.day) + " lineup";
      count.textContent = (searching ? plural(rows.length, "match", "matches") + " across all three days." : plural(rows.length, "act", "acts") + ".")
        + (rows.some(p => p.starts_at) ? " Times are from organizer posters and can change." : "");
      railHost.replaceChildren(...[searching ? null : rail(ctx, L.sortRows(rows, "time"))].filter(Boolean));
      list.replaceChildren(...rows.map(p => rowFor(p, ctx, searching)));
      if (!rows.length) {
        const reset = el("button", { class: "reset-filters", type: "button", text: "Clear search" });
        reset.addEventListener("click", () => { ctx.q = ""; search.value = ""; sync(); draw(); search.focus(); });
        list.append(el("li", { class: "empty" }, el("p", { text: "No acts match “" + ctx.q + "”." }), reset));
      }
      markSelected();
    };
    const sync = () => {
      history.replaceState(null, "", L.buildHash(location.hash.startsWith("#/artist/") && wide.matches ? "artist" : "lineup", ctx, currentArtistId()));
      main.dataset.key = lineupKey(ctx);
      setTabs(ctx);
    };
    search.addEventListener("input", () => { ctx.q = search.value; sync(); draw(); });
    days.addEventListener("click", e => {
      const b = e.target.closest("button[data-day]"); if (!b) return;
      ctx.day = b.dataset.day; ctx.q = ""; search.value = ""; sync(); draw();
    });
    sorts.addEventListener("click", e => {
      const b = e.target.closest("button[data-sort]"); if (!b) return;
      ctx.sort = b.dataset.sort; sync(); draw();
    });
    main.dataset.key = lineupKey(ctx);
    draw();
    if (openSearch) { openSearch = false; search.focus(); }
  }
  function currentArtistId() {
    const r = L.parseHash(location.hash);
    return r.view === "artist" ? r.id : undefined;
  }
  function markSelected() {
    const id = currentArtistId();
    document.querySelectorAll("#list .lineup-row").forEach(li => li.classList.toggle("selected", li.dataset.id === id));
  }
  function emptyDetail() {
    return el("div", { class: "detail-empty" }, el("p", { text: "Pick an act to see its day, stage and tracks." }));
  }

  // ---------- Artist ----------
  function artistContent(id, ctx, inPanel) {
    const identity = idx.artists.get(id);
    const p = identity ? { display_name: identity.display_name, artist_ids: [id] } : idx.performances.find(x => x.performance_id === id);
    if (!p) return null;
    const groups = L.songGroups(p, idx);
    const g0 = groups.find(g => g.songs.length);
    const first = g0 && g0.songs[0];
    const bookings = identity ? idx.performances.filter(x => x.artist_ids.includes(id)) : [p];
    const searching = Boolean(L.normalize(ctx.q));
    const backDay = bookings.length === 1 ? bookings[0].event_date : ctx.day;
    const backCtx = { ...ctx, day: searching ? ctx.day : backDay };
    const back = el("a", { class: "back", href: L.buildHash("lineup", backCtx) }, el("span", { "aria-hidden": "true", text: "← " }), searching ? "Search results" : dayName(backCtx.day));
    const share = el("button", { type: "button", class: "icon-btn share", "aria-label": "Share " + p.display_name }, shareIcon());
    const shared = el("p", { class: "sr-only", role: "status", "aria-live": "polite" });
    share.addEventListener("click", async () => {
      const url = location.href.split("#")[0] + L.buildHash("artist", { day: backCtx.day, sort: "time" }, id);
      try {
        if (navigator.share) await navigator.share({ title: p.display_name + " · Listening Room", url });
        else { await navigator.clipboard.writeText(url); shared.textContent = "Link copied."; share.classList.add("done"); }
      } catch (_e) { /* The visitor closed the share sheet. */ }
    });
    const Heading = inPanel ? "h2" : "h1";
    const heading = el(Heading, { id: "title", tabindex: "-1" },
      groups.length > 1 && !identity
        ? groups.flatMap((g, i) => i ? [el("span", { class: "b2b", text: " B2B " }), artistLink(g.artist, ctx, "name-link")] : [artistLink(g.artist, ctx, "name-link")])
        : p.display_name);
    if (groups.length > 1 && !identity && p.set_qualifier) heading.append(el("span", { class: "b2b", text: " (" + p.set_qualifier + ")" }));
    const chips = el("div", { class: "chips" });
    bookings.forEach(b => {
      chips.append(el("a", { class: "chip", href: L.buildHash("lineup", { ...ctx, q: "", day: b.event_date }), text: day(b.event_date).long }));
      const sched = L.scheduleState(b, idx, fmt);
      if (sched.stage) chips.append(el("span", { class: "chip", text: sched.stage }));
      if (sched.kind === "verified" && sched.time) chips.append(el("span", { class: "chip", text: sched.time }));
      else if (sched.kind === "unconfirmed" && sched.time) chips.append(el("span", { class: "chip caveat", text: sched.time + " · poster time" }));
      else if (sched.kind === "conflict") chips.append(el("span", { class: "chip caveat", text: "Billing unconfirmed" }));
      else chips.append(el("span", { class: "chip caveat", text: "Set time not verified" }));
    });
    const frag = document.createDocumentFragment();
    const hero = el("div", { class: "hero" + (first ? "" : " no-art") },
      first ? shortcut(first.url, "hero-link", true, artwork(first, p.display_name, "hero-art")) : artwork(null, p.display_name, "hero-art"),
      el("div", { class: "hero-bar" }, inPanel ? el("span") : back, share),
      first ? el("p", { class: "credit", text: "Artwork: “" + first.title + "” on YouTube" }) : null);
    frag.append(hero);
    const body = el("div", { class: "artist-body" }, heading, chips, shared);
    const conflict = bookings.map(b => L.scheduleState(b, idx, fmt)).find(s => s.kind === "conflict");
    if (conflict) body.append(el("p", { class: "flag", text: conflict.text }));
    if (bookings.some(b => L.scheduleState(b, idx, fmt).kind === "unconfirmed")) body.append(el("p", { class: "fine", text: "Poster times are transcribed from organizer posters and not yet cross-checked." }));
    if (first) body.append(el("div", { class: "artist-actions" }, el("a", { class: "btn btn-play youtube-primary", href: first.url, target: "_blank", rel: "noopener noreferrer", "aria-label": playLabel(first, g0.artist.display_name) },
      youtubeIcon(), el("span", { text: "Play “" + first.title + "” on YouTube" })), spotifyLink(first, g0.artist, "btn btn-alt btn-play")));
    if (inPanel) body.append(el("a", { class: "text-link", href: L.buildHash("artist", ctx, id) + (L.buildHash("artist", ctx, id).includes("?") ? "&" : "?") + "full=1", text: "Open full page →" }));
    const total = new Set(groups.flatMap(g => g.songs.map(s => s.video_id))).size;
    body.append(el(inPanel ? "h3" : "h2", { class: "artist-section", text: total ? plural(total, "track", "tracks") : "Tracks" }));
    if (!total) body.append(el("div", { class: "empty" }, el("p", { text: "No tracks added yet for this act." }), el("a", { class: "text-link", href: L.buildHash("listen", ctx), text: "Browse all tracks →" })));
    const shown = new Set();
    groups.forEach(g => {
      if (groups.length > 1) body.append(el(inPanel ? "h4" : "h3", { class: "group-head" }, artistLink(g.artist, ctx)));
      if (!g.songs.length && groups.length > 1) body.append(el("p", { class: "muted", text: "No tracks added for this artist yet." }));
      g.songs.forEach(s => { if (!shown.has(s.video_id)) { shown.add(s.video_id); body.append(songRow(s, g.artist, ctx)); } });
    });
    frag.append(body);
    return frag;
  }
  function artistView(id, ctx) {
    const content = artistContent(id, ctx, false);
    main.dataset.view = "artist"; main.dataset.key = "";
    if (!content) {
      main.replaceChildren(el("a", { class: "back", href: L.buildHash("lineup", ctx), text: "← Lineup" }), el("p", { class: "error", role: "alert", text: "That lineup entry wasn’t found." }));
      return;
    }
    main.replaceChildren(el("article", { class: "artist-page" }, content));
    document.getElementById("title").focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  function panelView(id, ctx) {
    if (main.dataset.view !== "lineup" || main.dataset.key !== lineupKey(ctx) || !document.getElementById("detail")) lineupView(ctx);
    const aside = document.getElementById("detail");
    const content = artistContent(id, ctx, true);
    aside.replaceChildren(content || el("p", { class: "error", role: "alert", text: "That lineup entry wasn’t found." }));
    aside.scrollTop = 0;
    markSelected();
    const title = document.getElementById("title");
    if (title) title.focus({ preventScroll: true });
  }

  // ---------- Tracks ----------
  function songDays(s) {
    const days = new Set();
    s.artist_ids.forEach(id => idx.performances.forEach(p => { if (p.artist_ids.includes(id)) days.add(p.event_date); }));
    return days;
  }
  function songMatches(s, q) {
    const needle = L.normalize(q);
    if (!needle) return true;
    const hay = L.normalize([s.title].concat(s.artist_ids.map(id => (idx.artists.get(id) || {}).display_name || "")).join(" "));
    return needle.split(" ").every(t => hay.includes(t));
  }
  function listenView(ctx) {
    const search = el("input", { id: "tq", type: "search", value: ctx.tq, autocomplete: "off", placeholder: "Track or artist" });
    const days = el("div", { class: "days compact", role: "group", "aria-label": "Filter by day" });
    L.DAYS.forEach(d => days.append(el("button", { type: "button", "data-day": d.key, "aria-label": d.long, text: d.label })));
    const count = el("p", { id: "count", class: "status", role: "status", "aria-live": "polite" });
    const ul = el("ul", { class: "list" });
    main.replaceChildren(el("div", { class: "intro" }, el("h1", { text: "Tracks" }), el("p", { class: "muted", text: idx.songs.length + " tracks from " + idx.songsByArtist.size + " lineup artists. Open each on YouTube, or on Spotify where it’s linked." })),
      el("label", { class: "search-label", for: "tq", text: "Search tracks" }), playlistCard(), search, days, count, ul);
    main.dataset.view = "listen"; main.dataset.key = "";
    const dayCache = new Map();
    const draw = () => {
      days.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.day === ctx.tday)));
      const shown = idx.songs.filter(s => {
        if (ctx.tday !== "all") {
          if (!dayCache.has(s)) dayCache.set(s, songDays(s));
          if (!dayCache.get(s).has(ctx.tday)) return false;
        }
        return songMatches(s, ctx.tq);
      });
      count.textContent = plural(shown.length, "track", "tracks") + (ctx.tday === "all" ? "" : " from acts on " + day(ctx.tday).long) + ".";
      ul.replaceChildren(...shown.map(s => el("li", {}, songRow(s, idx.artists.get(s.artist_ids[0]), ctx))));
      if (!shown.length) {
        const reset = el("button", { class: "reset-filters", type: "button", text: "Clear filters" });
        reset.addEventListener("click", () => { ctx.tq = ""; ctx.tday = "all"; search.value = ""; sync(); draw(); });
        ul.append(el("li", { class: "empty" }, el("p", { text: "No tracks match these filters." }), reset));
      }
    };
    const sync = () => { history.replaceState(null, "", L.buildHash("listen", ctx)); setTabs(ctx); };
    search.addEventListener("input", () => { ctx.tq = search.value; sync(); draw(); });
    days.addEventListener("click", e => {
      const b = e.target.closest("button[data-day]"); if (!b) return;
      ctx.tday = b.dataset.day; sync(); draw();
    });
    draw();
  }

  // ---------- Routing ----------
  function setTabs(ctx) {
    document.getElementById("tab-lineup").href = L.buildHash("lineup", ctx);
    document.getElementById("tab-listen").href = L.buildHash("listen", ctx);
  }
  function route() {
    if (!idx) return;
    const r = L.parseHash(location.hash);
    const full = /[?&]full=1/.test(location.hash);
    setTabs(r.ctx);
    document.querySelectorAll(".tabs a").forEach(a => a.removeAttribute("aria-current"));
    document.getElementById(r.view === "listen" ? "tab-listen" : "tab-lineup").setAttribute("aria-current", "page");
    const searchToggle = document.querySelector(".search-toggle");
    if (r.view === "artist" && wide.matches && !full) panelView(r.id, r.ctx);
    else if (r.view === "artist") artistView(r.id, r.ctx);
    else if (r.view === "listen") { listenView(r.ctx); window.scrollTo(0, 0); }
    else if (main.dataset.view === "lineup" && main.dataset.key === lineupKey(r.ctx) && document.getElementById("detail")) {
      document.getElementById("detail").replaceChildren(emptyDetail()); markSelected();
    } else { lineupView(r.ctx); window.scrollTo(0, 0); }
    searchToggle.setAttribute("aria-expanded", String(Boolean(document.querySelector(".search-row.open"))));
    const heading = r.view === "artist" ? document.getElementById("title") : null;
    document.title = heading ? heading.textContent + " · Listening Room" : r.view === "listen" ? "Tracks · Listening Room" : "Listening Room · EDC Orlando 2026";
  }
  document.querySelector(".search-toggle").addEventListener("click", e => {
    const row = document.querySelector(".search-row");
    if (row && main.dataset.view === "lineup") {
      const open = !row.classList.contains("open") || document.activeElement !== document.getElementById("q");
      row.classList.toggle("open", open);
      e.currentTarget.setAttribute("aria-expanded", String(open));
      if (open) document.getElementById("q").focus();
      return;
    }
    openSearch = true;
    location.hash = L.buildHash("lineup", L.parseHash(location.hash).ctx);
  });
  // Switching between the panel layout and the phone layout re-renders the current route.
  wide.addEventListener("change", () => { main.dataset.view = ""; route(); });
  // A skip link must focus content without changing the app's hash route.
  document.querySelector(".skip").addEventListener("click", e => { e.preventDefault(); main.focus(); main.scrollIntoView(); });
  Promise.all(["performances", "artists", "venues", "event"].map(n => readJson("../data/edco-2026/" + n + ".json")).concat(readJson("../data/listening-room/songs.json"), readJson("../data/listening-room/playlist.json")))
    .then(([perf, art, ven, ev, songs, pl]) => {
      if (!Array.isArray(perf.performances) || !Array.isArray(art.artists) || !Array.isArray(songs.songs)) throw new Error("schema");
      idx = L.index({ performances: perf.performances, artists: art.artists, stages: ven.stages, songs: songs.songs }); playlist = pl;
      document.getElementById("freshness").textContent = "Lineup checked " + (perf.checked_on || "unknown date") + ". Set times transcribed from organizer posters; cross-check the official schedule.";
      route();
    }).catch(() => main.replaceChildren(el("p", { class: "error", role: "alert", text: "Couldn’t load the lineup. Check your connection and reload." }), el("p", {}, ext("https://orlando.edc.com/lineup/", "Official lineup"))));
  window.addEventListener("hashchange", route);
})();
