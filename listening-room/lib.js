"use strict";
// Pure logic for Listening Room, shared by the browser UI and node tests.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RoomLib = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const DAYS = [
    { key: "all", label: "All", long: "All days" },
    { key: "2026-11-06", label: "Fri", long: "Friday, Nov 6" },
    { key: "2026-11-07", label: "Sat", long: "Saturday, Nov 7" },
    { key: "2026-11-08", label: "Sun", long: "Sunday, Nov 8" }
  ];

  function normalize(value) {
    return String(value || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/\s+/g, " ").trim();
  }

  const EVENT_DAYS = DAYS.slice(1);

  function validDay(day) {
    return DAYS.some(d => d.key === day) ? day : "all";
  }

  // The festival day in America/New_York; before the event (or after it) the first day.
  function defaultDay(now) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now || new Date());
    const hit = EVENT_DAYS.find(d => d.key === today);
    return hit ? hit.key : EVENT_DAYS[0].key;
  }

  function eventDay(day, now) {
    return EVENT_DAYS.some(d => d.key === day) ? day : defaultDay(now);
  }

  // "time": poster start time, unknown times last; "az": billing name.
  function sortRows(rows, sort) {
    const byName = (a, b) => a.display_name.localeCompare(b.display_name, "en", { sensitivity: "base" });
    return rows.slice().sort(sort === "az" ? byName : (a, b) =>
      (a.event_date.localeCompare(b.event_date)) ||
      (a.starts_at && b.starts_at ? Date.parse(a.starts_at) - Date.parse(b.starts_at) : a.starts_at ? -1 : b.starts_at ? 1 : 0) ||
      byName(a, b));
  }

  function safeYoutubeUrl(url) {
    try {
      const u = new URL(url);
      const ok = u.protocol === "https:" && (u.hostname === "www.youtube.com" || u.hostname === "music.youtube.com");
      return ok ? u.href : null;
    } catch (_e) { return null; }
  }

  function index(data) {
    const artists = new Map(data.artists.map(a => [a.artist_id, a]));
    const stages = new Map((data.stages || []).map(s => [s.stage_id, s]));
    const songsByArtist = new Map();
    const songs = [];
    const seen = new Set();
    data.songs.forEach(s => {
      if (!safeYoutubeUrl(s.url) || seen.has(s.video_id)) return;
      const ids = [...new Set(s.artist_ids || [s.artist_id])].filter(id => artists.has(id));
      if (!ids.length) return;
      const song = { ...s, artist_ids: ids };
      seen.add(s.video_id); songs.push(song);
      ids.forEach(id => {
        if (!songsByArtist.has(id)) songsByArtist.set(id, []);
        songsByArtist.get(id).push(song);
      });
    });
    const performances = data.performances.slice().sort((a, b) =>
      a.event_date.localeCompare(b.event_date) || a.source_order - b.source_order);
    return { artists, stages, songs, songsByArtist, performances };
  }

  // Songs grouped per credited artist so a B2B shows whose catalog each song is from.
  function songGroups(perf, idx) {
    return perf.artist_ids.map(id => ({
      artist: idx.artists.get(id),
      songs: idx.songsByArtist.get(id) || []
    })).filter(g => g.artist);
  }

  function songCount(perf, idx) {
    return new Set(songGroups(perf, idx).flatMap(g => g.songs.map(s => s.video_id))).size;
  }

  function matches(perf, idx, query) {
    const q = normalize(query);
    if (!q) return true;
    const names = perf.artist_ids.map(id => {
      const a = idx.artists.get(id);
      return a ? [a.display_name, a.search_name].concat(a.aliases || []).join(" ") : "";
    });
    const hay = normalize([perf.display_name].concat(names).join(" "));
    return q.split(" ").every(tok => hay.includes(tok));
  }

  function filterLineup(idx, { day, q, stage }) {
    return idx.performances.filter(p =>
      (validDay(day) === "all" || p.event_date === day) &&
      (!stage || (p.stage_id === stage && p.schedule_status === "verified")) &&
      matches(p, idx, q));
  }

  // Only a status of "verified" is shown as fact; anything else carries a caveat.
  function scheduleState(perf, idx, formatTime) {
    const stage = idx.stages.get(perf.stage_id);
    const hasTime = Boolean(perf.starts_at && perf.ends_at);
    const time = hasTime && formatTime ? formatTime(perf.starts_at) + "–" + formatTime(perf.ends_at) : null;
    if (perf.lineup_status === "official_sources_conflict") {
      return { kind: "conflict", stage: null, time: null,
        text: "Organizer sources disagree about this billing; day, stage and time are unconfirmed." };
    }
    if (perf.schedule_status === "verified" && (stage || hasTime)) {
      return { kind: "verified", stage: stage ? stage.display_name : null, time,
        text: [stage ? stage.display_name : "Stage not verified", time || "Time not verified"].join(" · ") };
    }
    if (perf.schedule_status === "poster_transcribed" && (stage || hasTime)) {
      return { kind: "unconfirmed", stage: stage ? stage.display_name : null, time,
        text: [stage ? stage.display_name : "Stage unknown", time || "time unknown"].join(" · ") +
          " (from an organizer poster; not yet cross-checked)" };
    }
    return { kind: "unknown", stage: null, time: null, text: "Stage and set time not verified yet." };
  }

  function stageOptions(idx) {
    const seen = new Map();
    idx.performances.forEach(p => {
      if (p.schedule_status === "verified" && idx.stages.has(p.stage_id)) seen.set(p.stage_id, idx.stages.get(p.stage_id));
    });
    return [...seen.values()];
  }

  // Route state lives in the URL hash so Back restores query and filters.
  // Lineup search (q) and Tracks search (tq) are separate so neither empties the other view.
  function parseHash(hash, now) {
    const raw = String(hash || "").replace(/^#\/?/, "");
    const [path, qs = ""] = raw.split("?");
    const params = new URLSearchParams(qs);
    let parts;
    try { parts = path.split("/").filter(Boolean).map(decodeURIComponent); }
    catch (_e) { parts = []; }
    const ctx = { day: eventDay(params.get("day"), now), sort: params.get("sort") === "az" ? "az" : "time",
      q: params.get("q") || "", tq: params.get("tq") || "", tday: validDay(params.get("tday") || "all"), stage: params.get("stage") || "" };
    if (parts[0] === "artist" && parts[1]) return { view: "artist", id: parts[1], ctx };
    if (parts[0] === "listen") return { view: "listen", ctx };
    return { view: "lineup", ctx };
  }

  function buildHash(view, ctx, id) {
    const params = new URLSearchParams();
    if (ctx && ctx.day && ctx.day !== "all") params.set("day", ctx.day);
    if (ctx && ctx.sort === "az") params.set("sort", "az");
    if (ctx && ctx.q) params.set("q", ctx.q);
    if (ctx && ctx.tq) params.set("tq", ctx.tq);
    if (ctx && ctx.tday && ctx.tday !== "all") params.set("tday", ctx.tday);
    if (ctx && ctx.stage) params.set("stage", ctx.stage);
    const qs = params.toString();
    const path = view === "artist" ? "artist/" + encodeURIComponent(id) : view;
    return "#/" + path + (qs ? "?" + qs : "");
  }

  function validPlaylistUrl(playlist) {
    return playlist && playlist.status === "published" && playlist.verified_cross_account === true
      ? safeYoutubeUrl(playlist.url) : null;
  }

  return { DAYS, EVENT_DAYS, defaultDay, eventDay, sortRows, normalize, validDay, safeYoutubeUrl, index, songGroups, songCount, matches,
    filterLineup, scheduleState, stageOptions, parseHash, buildHash, validPlaylistUrl };
});
