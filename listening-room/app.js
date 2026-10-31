"use strict";
// Static, read-only app. Fetches only committed JSON from this repository.
(function () {
  const L = window.RoomLib;
  const main = document.getElementById("main");
  let idx = null;
  let playlist = null;
  let eventMeta = null;
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

  function ext(href, text, cls) {
    return el("a", { href, class: cls, target: "_blank", rel: "noopener noreferrer", text: text + " ↗" });
  }

  function playlistCard() {
    const url = L.validPlaylistUrl(playlist);
    const card = el("section", { class: "card" + (url ? "" : " pending"), "aria-labelledby": "pl-h" },
      el("h2", { id: "pl-h", text: playlist.label }));
    if (url) {
      card.append(el("p", { class: "muted", text: "Tracks from across the lineup." }),
        ext(url, "Listen on YouTube Music", "btn"));
    } else {
      card.append(el("p", { text: "Not available yet. The shared playlist hasn’t been published, so there is nothing to open." }),
        el("p", { class: "muted", text: "You can still open reviewed songs for individual artists." }));
    }
    card.append(el("details", {}, el("summary", { text: "About this playlist" }),
      el("p", { class: "muted", text: playlist.about })));
    return card;
  }

  function lineupView(ctx) {
    const frag = document.createDocumentFragment();
    frag.append(el("h1", { text: "Find your next favorite." }),
      el("p", { class: "muted", text: "Search the EDC Orlando 2026 lineup, then open a reviewed song on YouTube." }));

    const search = el("input", { id: "q", type: "search", value: ctx.q, autocomplete: "off", placeholder: "Search artists at this event" });
    frag.append(el("label", { class: "muted", for: "q", text: "Search artists" }), search);

    const days = el("div", { class: "days", role: "group", "aria-label": "Filter by day" });
    L.DAYS.forEach(d => days.append(el("button", { type: "button", "data-day": d.key, "aria-pressed": String(ctx.day === d.key), "aria-label": d.long, text: d.label })));
    frag.append(days);

    const stages = L.stageOptions(idx);
    if (stages.length) {
      const sel = el("select", { id: "stage", "aria-label": "Filter by stage (verified set times only)" }, el("option", { value: "", text: "All stages" }));
      stages.forEach(s => sel.append(el("option", { value: s.stage_id, selected: ctx.stage === s.stage_id, text: s.display_name })));
      frag.append(sel);
    } else {
      frag.append(el("p", { class: "muted", text: "Stage and genre filters aren’t shown: no verified stage or genre data yet." }));
    }

    frag.append(playlistCard(), el("h2", { text: "Artists" }),
      el("p", { id: "count", class: "status", role: "status", "aria-live": "polite" }), el("ul", { id: "list", class: "list" }));
    main.replaceChildren(frag);

    const list = document.getElementById("list");
    const count = document.getElementById("count");
    const draw = () => {
      const rows = L.filterLineup(idx, ctx);
      count.textContent = rows.length + (rows.length === 1 ? " lineup entry" : " lineup entries") +
        (ctx.day === "all" ? "" : " on " + L.DAYS.find(d => d.key === ctx.day).long) + ". Source order, not set order.";
      list.replaceChildren(...rows.map(p => rowFor(p, ctx)));
      if (!rows.length) list.append(el("li", { class: "muted", text: "No artists match. Clear the search or choose All days." }));
    };
    const sync = () => history.replaceState(null, "", L.buildHash("lineup", ctx));
    search.addEventListener("input", () => { ctx.q = search.value; sync(); draw(); });
    days.addEventListener("click", e => {
      const b = e.target.closest("button[data-day]");
      if (!b) return;
      ctx.day = b.dataset.day;
      days.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      sync(); draw();
    });
    const stageSel = document.getElementById("stage");
    if (stageSel) stageSel.addEventListener("change", () => { ctx.stage = stageSel.value; sync(); draw(); });
    draw();
  }

  function rowFor(p, ctx) {
    const n = L.songCount(p, idx);
    const day = L.DAYS.find(d => d.key === p.event_date);
    const a = el("a", { class: "row", href: L.buildHash("artist", ctx, p.performance_id) },
      el("span", {},
        el("span", { text: p.display_name }),
        el("small", { text: (day ? day.long : p.day) + (n ? " · " + n + (n === 1 ? " song" : " songs") : " · no reviewed songs yet") }),
        p.lineup_status === "official_sources_conflict" ? el("small", { class: "flag", text: "⚠ Billing disputed between sources" }) : null),
      el("span", { class: "go", "aria-hidden": "true", text: "→" }));
    return el("li", {}, a);
  }

  function artistView(id, ctx) {
    const p = idx.performances.find(x => x.performance_id === id);
    const back = el("a", { class: "back", href: L.buildHash("lineup", ctx), text: "← Back to lineup" });
    if (!p) {
      main.replaceChildren(back, el("p", { class: "error", role: "alert", text: "That lineup entry wasn’t found." }));
      return;
    }
    const day = L.DAYS.find(d => d.key === p.event_date);
    const sched = L.scheduleState(p, idx, fmt);
    const frag = document.createDocumentFragment();
    frag.append(back, el("h1", { id: "title", tabindex: "-1", text: p.display_name }),
      el("p", { text: day ? day.long : p.day }),
      el("p", { class: sched.kind === "verified" ? "" : "flag", text: sched.text }));
    if (p.set_qualifier) frag.append(el("p", { class: "muted", text: "Billing note: " + p.set_qualifier }));
    frag.append(el("h2", { text: "Listen to their music" }));
    const groups = L.songGroups(p, idx);
    const total = groups.reduce((n, g) => n + g.songs.length, 0);
    if (!total) {
      frag.append(el("p", { text: "No reviewed songs for this billing yet. Search results aren’t used in their place." }));
    }
    groups.forEach(g => {
      if (!g.songs.length) {
        if (groups.length > 1) frag.append(el("p", { class: "muted", text: g.artist.display_name + ": no reviewed songs yet." }));
        return;
      }
      if (groups.length > 1) frag.append(el("h3", { text: g.artist.display_name }));
      g.songs.forEach(s => {
        const caveat = s.review_status !== "strong";
        frag.append(el("div", { class: "song" },
          el("span", {}, el("span", { text: s.title }),
            caveat ? el("small", { class: "muted", text: " Reviewed; exact version may differ from the studio release." }) : null),
          ext(s.url, "YouTube", "btn")));
      });
    });
    main.replaceChildren(frag);
    document.getElementById("title").focus();
  }

  function listenView(ctx) {
    const frag = document.createDocumentFragment();
    frag.append(el("h1", { text: "Listen" }), playlistCard(), el("h2", { text: "Reviewed songs" }),
      el("p", { class: "muted", text: "Each opens a specific YouTube recording. Only some artists have reviewed songs so far." }));
    const ul = el("ul", { class: "list" });
    idx.performances.filter(p => L.songCount(p, idx)).forEach(p => {
      L.songGroups(p, idx).forEach(g => g.songs.forEach(s => ul.append(el("li", {},
        el("div", { class: "song" },
          el("span", {}, el("span", { text: s.title }), el("small", { class: "muted", text: " " + g.artist.display_name })),
          ext(s.url, "YouTube", "btn"))))));
    });
    frag.append(ul);
    main.replaceChildren(frag);
  }

  function route() {
    if (!idx) return;
    const r = L.parseHash(location.hash);
    document.getElementById("tab-lineup").toggleAttribute("aria-current", r.view !== "listen");
    document.getElementById("tab-listen").toggleAttribute("aria-current", r.view === "listen");
    document.querySelectorAll(".tabs a").forEach(a => { if (a.hasAttribute("aria-current")) a.setAttribute("aria-current", "page"); });
    if (r.view === "artist") artistView(r.id, r.ctx);
    else if (r.view === "listen") listenView(r.ctx);
    else lineupView(r.ctx);
    if (r.view !== "artist") window.scrollTo(0, 0);
  }

  Promise.all(["performances", "artists", "venues", "event"].map(n => readJson("../data/edco-2026/" + n + ".json")).concat(
    readJson("../data/listening-room/songs.json"), readJson("../data/listening-room/playlist.json")))
    .then(([perf, art, ven, ev, songs, pl]) => {
      if (!Array.isArray(perf.performances) || !Array.isArray(art.artists) || !Array.isArray(songs.songs)) throw new Error("schema");
      idx = L.index({ performances: perf.performances, artists: art.artists, stages: ven.stages, songs: songs.songs });
      playlist = pl;
      eventMeta = ev;
      document.getElementById("freshness").textContent = "Lineup data checked " + (perf.checked_on || "unknown date") +
        ". " + (perf.schedule_status === "day_assignments_only" ? "Day assignments only; stage and set times aren’t verified." : "Check the official schedule for set times.") + " Listing order is not running order.";
      route();
    })
    .catch(() => {
      main.replaceChildren(el("p", { class: "error", role: "alert", text: "Couldn’t load the lineup data. Check your connection and reload. If you opened this file directly, serve the repository over HTTP." }),
        el("p", {}, ext("https://orlando.edc.com/lineup/", "Official lineup")));
    });
  window.addEventListener("hashchange", route);
})();
