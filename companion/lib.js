"use strict";
// Pure Companion queries and routes. Festival/catalog authority stays in shared JSON.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("../listening-room/lib.js"));
  else root.CompanionLib = factory(root.RoomLib);
})(typeof self !== "undefined" ? self : this, function (Room) {
  const UNKNOWN_STAGE = "unassigned";
  const DAYS = Room.DAYS;
  const validDay = Room.validDay;
  const hasTime = p => ["verified", "poster_transcribed"].includes(p.schedule_status) &&
    p.lineup_status !== "official_sources_conflict" && Boolean(p.schedule_source_id) &&
    (p.source_ids || []).includes(p.schedule_source_id) &&
    Number.isFinite(Date.parse(p.starts_at)) && Number.isFinite(Date.parse(p.ends_at)) &&
    Date.parse(p.ends_at) > Date.parse(p.starts_at);
  function chronological(a, b) {
    return a.event_date.localeCompare(b.event_date) ||
      (hasTime(a) && hasTime(b) ? Date.parse(a.starts_at) - Date.parse(b.starts_at) : Number(!hasTime(a)) - Number(!hasTime(b))) ||
      a.display_name.localeCompare(b.display_name) || a.performance_id.localeCompare(b.performance_id);
  }
  function createIndex(perf, art, venues, songs) {
    if (perf.schema_version !== 2 || perf.timezone !== "America/New_York" ||
        !Array.isArray(perf.performances) || !Array.isArray(art.artists) || !Array.isArray(venues.stages) ||
        !Array.isArray(perf.sources) || perf.coverage?.appearances !== perf.performances.length) throw new Error("Unsupported festival data");
    const idx = Room.index({ performances: perf.performances, artists: art.artists, stages: venues.stages, songs: songs || [] });
    if (idx.artists.size !== art.artists.length || idx.stages.size !== venues.stages.length ||
        new Set(idx.performances.map(p => p.performance_id)).size !== idx.performances.length) throw new Error("Duplicate festival IDs");
    idx.performances.forEach(p => {
      if (!Array.isArray(p.artist_ids) || p.artist_ids.some(id => !idx.artists.has(id)) ||
          (p.stage_id !== null && !idx.stages.has(p.stage_id))) throw new Error("Invalid festival join");
    });
    idx.byPerformance = new Map(idx.performances.map(p => [p.performance_id, p]));
    idx.sources = new Map(perf.sources.map(s => [s.source_id, s]));
    idx.meta = perf; idx.venues = venues;
    return idx;
  }
  function query(idx, state) {
    return idx.performances.filter(p =>
      (validDay(state.day) === "all" || state.day === p.event_date) &&
      (!state.stage || (state.stage === UNKNOWN_STAGE ? p.stage_id === null : p.stage_id === state.stage)))
      .sort(chronological);
  }
  function coverage(rows) {
    return { total: rows.length, timed: rows.filter(hasTime).length,
      provisional: rows.filter(p => hasTime(p) && p.schedule_status === "poster_transcribed").length,
      unknownTime: rows.filter(p => !hasTime(p)).length, unknownStage: rows.filter(p => !p.stage_id).length };
  }
  function parseHash(hash) {
    const [path, qs = ""] = String(hash || "").replace(/^#\/?/, "").split("?");
    const params = new URLSearchParams(qs);
    let parts;
    try { parts = path.split("/").filter(Boolean).map(decodeURIComponent); }
    catch (_e) { return { view: "invalid", day: validDay(params.get("day")), stage: params.get("stage") || "" }; }
    const state = { view: "explore", day: validDay(params.get("day")), stage: params.get("stage") || "" };
    if (["artist", "performance"].includes(parts[0]) && parts[1]) return { ...state, view: parts[0], id: parts[1] };
    if (parts.length && parts[0] !== "explore") state.view = "invalid";
    return state;
  }
  function buildHash(state) {
    const params = new URLSearchParams();
    if (validDay(state.day) !== "all") params.set("day", state.day);
    if (state.stage) params.set("stage", state.stage);
    const path = ["artist", "performance"].includes(state.view) ? state.view + "/" + encodeURIComponent(state.id) : "explore";
    return "#/" + path + (params.size ? "?" + params.toString() : "");
  }
  function transition(state, action) {
    if (action.type === "day") return { ...state, day: validDay(action.day) };
    if (action.type === "stage") return { ...state, view: "explore", id: undefined, stage: action.stage || "" };
    if (["artist", "performance"].includes(action.type)) return { ...state, view: action.type, id: action.id };
    return { ...state, view: "explore", id: undefined };
  }
  function listeningHref(id, state) {
    return "/listening-room/" + Room.buildHash("artist", { day: validDay(state.day), stage: "", q: "" }, id);
  }
  function timeLabel(p) {
    if (!hasTime(p)) return "Time unknown";
    const fmt = iso => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
    return fmt(p.starts_at) + "–" + fmt(p.ends_at) + (p.ends_at.slice(0, 10) !== p.event_date ? " (ends next day)" : "");
  }
  // Verified normalized geometry only. No inferred layout from stage order or genre.
  function hotspots(venues) {
    if (venues.map?.geometry?.status !== "verified" || venues.map.geometry.coordinate_space !== "normalized-top-left") return [];
    return venues.stages.filter(s => {
      const p = s.coordinates;
      return p && p.verification === "verified" && p.source_ids?.length && p.checked_on &&
        [p.x, p.y].every(n => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1);
    }).map(s => ({ stage_id: s.stage_id, display_name: s.display_name, ...s.coordinates }));
  }
  function pointToPercent(p) { return { left: (p.x * 100) + "%", top: (p.y * 100) + "%" }; }
  function freshnessWarning(checkedOn, now = new Date()) {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
    return today >= "2026-11-06" && checkedOn < today;
  }
  return { DAYS, UNKNOWN_STAGE, validDay, hasTime, chronological, createIndex, query, coverage,
    parseHash, buildHash, transition, listeningHref, timeLabel, hotspots, pointToPercent, freshnessWarning };
});
