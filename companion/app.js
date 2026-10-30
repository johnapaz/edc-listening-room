"use strict";

// Static, read-only presentation of the committed source pack. No API tokens,
// playlist mutations, inferred set times, user analytics or network services.
(function () {
  const dayNames = {
    "2026-11-06": "FRIDAY · NOV 6",
    "2026-11-07": "SATURDAY · NOV 7",
    "2026-11-08": "SUNDAY · NOV 8"
  };
  const storageKey = "edco26-listening-room-picks-v1";
  const state = { day: "2026-11-06", query: "", savedOnly: false, picks: loadPicks() };
  let performances = [];
  let artists = new Map();
  let songs = new Map();
  let stages = new Map();

  const cards = document.getElementById("cards");
  const count = document.getElementById("record-count");
  const empty = document.getElementById("empty");
  const error = document.getElementById("load-error");
  const note = document.getElementById("source-note");

  function loadPicks() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return new Set(Array.isArray(parsed) ? parsed.filter(v => typeof v === "string") : []);
    } catch (_ignored) {
      return new Set();
    }
  }

  function savePicks() {
    try { localStorage.setItem(storageKey, JSON.stringify([...state.picks])); }
    catch (_ignored) { /* Browsers with disabled storage still work this session. */ }
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function normalized(value) {
    return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }

  function musicFor(performance) {
    const byId = new Map();
    performance.artist_ids.forEach(id => (songs.get(id) || []).forEach(song => {
      if (song.spotify_track_id && !byId.has(song.spotify_track_id)) {
        byId.set(song.spotify_track_id, song);
      }
    }));
    return [...byId.values()].sort((a, b) => (Number(a.discovery_pass) || 9) - (Number(b.discovery_pass) || 9) ||
      a.title.localeCompare(b.title)).slice(0, 5);
  }

  function scheduleLabel(raw, fallback) {
    if (!raw) return fallback;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? fallback :
      new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(d);
  }

  function makeCard(performance) {
    const card = el("article", "act-card");
    const top = el("div", "card-top");
    const heading = el("div");
    heading.append(el("p", "day-label", dayNames[performance.event_date] || performance.day));
    heading.append(el("h3", "", performance.display_name));
    top.append(heading);

    const favorite = el("button", "star", state.picks.has(performance.performance_id) ? "★" : "☆");
    favorite.type = "button";
    favorite.setAttribute("aria-pressed", String(state.picks.has(performance.performance_id)));
    favorite.setAttribute("aria-label", (state.picks.has(performance.performance_id) ? "Remove pick: " : "Save pick: ") + performance.display_name);
    favorite.addEventListener("click", () => {
      if (state.picks.has(performance.performance_id)) state.picks.delete(performance.performance_id);
      else state.picks.add(performance.performance_id);
      savePicks();
      render();
      const restored = [...cards.querySelectorAll(".star")].find(btn =>
        btn.getAttribute("aria-label").endsWith(performance.display_name));
      if (restored) restored.focus();
    });
    top.append(favorite);
    card.append(top);

    const schedule = el("div", "schedule");
    const stage = stages.get(performance.stage_id);
    schedule.append(el("span", "", scheduleLabel(performance.starts_at, "Time TBA")));
    schedule.append(el("span", "", stage ? stage.display_name : "Stage TBA"));
    card.append(schedule);

    if (performance.lineup_status === "official_sources_conflict") {
      card.append(el("p", "flag", "⚠ Organizer lineup sources differ; verify billing."));
    }

    const selected = musicFor(performance);
    if (selected.length) {
      const details = el("details", "songs");
      details.append(el("summary", "", "Explore " + selected.length + " candidate track" + (selected.length === 1 ? "" : "s")));
      const list = el("ol");
      selected.forEach(song => {
        const li = el("li");
        li.append(el("strong", "", song.title));
        li.append(el("small", "", song.spotify_artist_credit || ""));
        if (/^[A-Za-z0-9]{22}$/.test(song.spotify_track_id)) {
          const link = el("a", "", "Open on Spotify ↗");
          link.href = "https://open.spotify.com/track/" + song.spotify_track_id;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          li.append(link);
        }
        list.append(li);
      });
      details.append(list);
      details.append(el("p", "songs-note", "Source-listed tracks, not verified setlists, YouTube matches, or guaranteed playable versions."));
      card.append(details);
    } else {
      card.append(el("p", "no-songs", "No source-listed song candidates for this billing yet."));
    }
    return card;
  }

  function render() {
    const query = normalized(state.query.trim());
    const matches = performances.filter(p => {
      if (state.day !== "all" && p.event_date !== state.day) return false;
      if (state.savedOnly && !state.picks.has(p.performance_id)) return false;
      if (!query) return true;
      const people = p.artist_ids.map(id => artists.get(id)?.display_name || "").join(" ");
      const titles = musicFor(p).map(s => s.title).join(" ");
      return normalized(p.display_name + " " + people + " " + titles).includes(query);
    });
    const fragment = document.createDocumentFragment();
    matches.forEach(p => fragment.append(makeCard(p)));
    cards.replaceChildren(fragment);
    count.textContent = matches.length + " lineup " + (matches.length === 1 ? "entry" : "entries");
    empty.hidden = matches.length !== 0;
  }

  async function readJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error("Cannot read local data: " + path);
    return response.json();
  }

  document.querySelectorAll("[data-day]").forEach(button => {
    button.addEventListener("click", () => {
      state.day = button.dataset.day;
      document.querySelectorAll("[data-day]").forEach(b =>
        b.setAttribute("aria-pressed", String(b.dataset.day === state.day)));
      render();
    });
  });
  document.getElementById("search").addEventListener("input", e => {
    state.query = e.target.value;
    render();
  });
  document.getElementById("saved-only").addEventListener("change", e => {
    state.savedOnly = e.target.checked;
    render();
  });

  Promise.all([
    readJson("../data/edco-2026/performances.json"),
    readJson("../data/edco-2026/artists.json"),
    readJson("../data/edco-2026/discovery-candidates.json"),
    readJson("../data/edco-2026/venues.json"),
    readJson("../data/edco-2026/event.json")
  ]).then(([schedule, lineup, catalog, venue, event]) => {
    if (!Array.isArray(schedule.performances) || !Array.isArray(lineup.artists) ||
        !Array.isArray(catalog.rows) || !Array.isArray(venue.stages)) {
      throw new Error("Unexpected reference pack schema");
    }
    performances = schedule.performances.slice().sort((a, b) =>
      a.event_date.localeCompare(b.event_date) || a.source_order - b.source_order);
    artists = new Map(lineup.artists.map(a => [a.artist_id, a]));
    stages = new Map(venue.stages.map(s => [s.stage_id, s]));
    catalog.rows.forEach(song => (song.lineup_artist_ids || []).forEach(id => {
      if (!songs.has(id)) songs.set(id, []);
      songs.get(id).push(song);
    }));
    const allowed = new Set(performances.map(p => p.performance_id));
    state.picks = new Set([...state.picks].filter(id => allowed.has(id)));
    const snapshot = schedule.checked_on || event.checked_on || "unknown";
    note.textContent = "Festival data checked " + snapshot +
      " · Source listing order is not performance order · Picks are saved to this browser only.";
    const mapUrl = venue.map && venue.map.asset_url;
    if (typeof mapUrl === "string" && /^https:\/\//.test(mapUrl)) {
      document.getElementById("map-link").href = mapUrl;
    }
    render();
  }).catch(() => {
    count.textContent = "Unavailable";
    note.textContent = "The committed festival reference files could not be loaded.";
    error.hidden = false;
  });
})();
