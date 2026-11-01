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
  // Views. "explore" is the legacy/canonical stage or all-performances page (S4).
  // "stages" is the stage list (S3), "map" is the gated map tab (S10), "unscheduled" is S7, "sources" is S8.
  const PAGE_VIEWS = ["stages", "map", "unscheduled", "sources"];
  function parseHash(hash) {
    const [path, qs = ""] = String(hash || "").replace(/^#\/?/, "").split("?");
    const params = new URLSearchParams(qs);
    let parts;
    try { parts = path.split("/").filter(Boolean).map(decodeURIComponent); }
    catch (_e) { return { view: "invalid", day: validDay(params.get("day")), stage: params.get("stage") || "" }; }
    const state = { view: "explore", day: validDay(params.get("day")), stage: params.get("stage") || "" };
    const head = parts[0];
    if (!parts.length) return { ...state, view: "map" }; // S1/S10: the bare URL lands on the (gated) map tab
    if (["artist", "performance"].includes(head) && parts[1]) return { ...state, view: head, id: parts[1] };
    // Design-contract alias: #/stage/{id} is the same page as #/explore?stage={id}.
    if (head === "stage" && parts.length === 2) return { ...state, stage: parts[1] };
    if (head === "about" && parts.length === 1) return { ...state, view: "sources" };
    if (PAGE_VIEWS.includes(head) && parts.length === 1) {
      if (head === "map") { if (params.get("set")) state.set = params.get("set"); if (params.get("artist")) state.artist = params.get("artist"); }
      return { ...state, view: head };
    }
    if (parts.length && head !== "explore") state.view = "invalid";
    return state;
  }
  function buildHash(state) {
    const params = new URLSearchParams();
    if (validDay(state.day) !== "all") params.set("day", state.day);
    if (state.stage) params.set("stage", state.stage);
    if (state.view === "map") { if (state.set) params.set("set", state.set); if (state.artist) params.set("artist", state.artist); }
    const path = ["artist", "performance"].includes(state.view) ? state.view + "/" + encodeURIComponent(state.id) : PAGE_VIEWS.includes(state.view) ? state.view : "explore";
    return "#/" + path + (params.size ? "?" + params.toString() : "");
  }
  function transition(state, action) {
    if (action.type === "day") return { ...state, day: validDay(action.day) };
    if (action.type === "stage") return { ...state, view: "explore", id: undefined, stage: action.stage || "" };
    if (["artist", "performance"].includes(action.type)) return { ...state, view: action.type, id: action.id };
    if (PAGE_VIEWS.includes(action.type)) return { view: action.type, day: state.day, stage: action.stage ?? state.stage ?? "" };
    return { ...state, view: "explore", id: undefined };
  }
  // Pure route canonicalisation once data is known (S10 gating). `replace` means "rewrite the
  // current history entry", never push. Unknown stages on the new pages are ignored silently;
  // explore/artist/performance keep their recoverable "unavailable" state.
  function resolveRoute(idx, state) {
    const known = !state.stage || state.stage === UNKNOWN_STAGE || idx.stages.has(state.stage);
    if (state.view === "map") {
      const base = { day: state.day, stage: known ? state.stage : "" };
      if (state.set) return { state: { ...base, view: "performance", id: state.set }, replace: true };
      if (state.artist) return { state: { ...base, view: "artist", id: state.artist }, replace: true };
      if (base.stage && !hotspots(idx.venues).length) return { state: { ...base, view: "explore" }, replace: true };
      return { state: { view: "map", ...base }, replace: false };
    }
    if (PAGE_VIEWS.includes(state.view) && !known) return { state: { ...state, stage: "" }, replace: true };
    return { state, replace: false };
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

  const longDay = key => DAYS.find(d => d.key === key)?.long || key;
  const weekday = key => longDay(key).split(",")[0];
  function dayLabel(key) { const d = DAYS.find(x => x.key === key); return !d || d.key === "all" ? "All" : d.label + " " + Number(d.key.slice(8)); }
  function shortDate(iso) {
    const t = Date.parse(iso + "T12:00:00Z");
    return Number.isFinite(t) ? new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(t) : "date unavailable";
  }
  const statusOf = p => !hasTime(p) ? "unknown" : p.schedule_status === "verified" ? "verified" : "poster";
  const sourcesDisagree = p => Boolean(p.issue_ids?.length) || p.reconciliation?.status === "qualifier_changed";
  // One status for a list header: a shared status, or "mixed" so every row spells its own out.
  function summarizeStatus(rows) {
    const kinds = new Set(rows.map(statusOf));
    return { status: kinds.size === 0 ? "none" : kinds.size === 1 ? [...kinds][0] : "mixed", disagreeing: rows.filter(sourcesDisagree).length };
  }
  // Current appearances with no usable stage/time slot (S7). Never inferred from genre or order.
  function unscheduled(idx, day) {
    return idx.performances.filter(p => (validDay(day) === "all" || p.event_date === day) && (!p.stage_id || !hasTime(p))).sort(chronological);
  }
  function trackCount(idx, artistId) { return new Set((idx.songsByArtist.get(artistId) || []).map(s => s.video_id)).size; }
  // Listening Room targets are stable artist IDs only; programs or empty credits get none.
  function hearTargets(idx, p) {
    if (p.performance_type === "program" || !p.artist_ids?.length) return [];
    return p.artist_ids.map(id => idx.artists.get(id)).filter(Boolean).map(artist => ({ artist, tracks: trackCount(idx, artist.artist_id) }));
  }
  function timeParts(p) {
    if (!hasTime(p)) return null;
    const fmt = iso => new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
    return { start: fmt(p.starts_at), end: fmt(p.ends_at), nextDay: p.ends_at.slice(0, 10) !== p.event_date };
  }
  function announcement(idx, state) {
    const rows = query(idx, state), stage = idx.stages.get(state.stage);
    const where = stage?.display_name || (state.stage === UNKNOWN_STAGE ? "Stage unknown" : "All performances");
    return where + ", " + (state.day === "all" ? "all days" : weekday(state.day)) + ", " + rows.length + (rows.length === 1 ? " performance." : " performances.");
  }
  return { PAGE_VIEWS, resolveRoute, longDay, weekday, dayLabel, shortDate, statusOf, sourcesDisagree, summarizeStatus, unscheduled, trackCount, hearTargets, timeParts, announcement,
    DAYS, UNKNOWN_STAGE, validDay, hasTime, chronological, createIndex, query, coverage,
    parseHash, buildHash, transition, listeningHref, timeLabel, hotspots, pointToPercent, freshnessWarning };
});
