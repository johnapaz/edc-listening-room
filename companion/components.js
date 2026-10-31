"use strict";
// Replaceable presentation functions. All input data comes from CompanionLib queries.
(function () {
  const C = window.CompanionLib;
  function el(tag, props, ...kids) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === false) return;
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else node.setAttribute(key, value === true ? "" : value);
    });
    kids.flat(Infinity).filter(k => k !== null && k !== undefined && k !== false).forEach(k => node.append(k));
    return node;
  }
  const link = (text, state, props, ...kids) => el("a", { href: C.buildHash(state), text, ...props }, ...kids);
  const dayName = date => C.DAYS.find(d => d.key === date)?.long || date;
  function StateBox({ title, message, kind = "empty", retry }) {
    const node = el("section", { class: "state-box " + kind, role: kind === "error" ? "alert" : kind === "loading" ? "status" : undefined },
      el("h2", { text: title }), el("p", { text: message }));
    if (retry) { const button = el("button", { type: "button", text: "Try again" }); button.addEventListener("click", retry); node.append(button); }
    return node;
  }
  function DayPicker({ state }) {
    return el("nav", { class: "days", "aria-label": "Festival day" }, C.DAYS.map(d => link(d.long, C.transition(state, { type: "day", day: d.key }), {
      "data-day": d.key, "aria-current": d.key === state.day ? "date" : null
    })));
  }
  function FestivalMap() {
    // Geographic interaction is gated by supported positions + original representation.
    // Never substitute a decorative or guessed map for unavailable evidence.
    return el("div", { class: "notice geometry-unavailable", "data-component": "festival-map" },
      el("strong", { text: "Geographic map unavailable" }),
      el("p", { text: "Stage positions have not been verified. Choose a stage below to explore its performances. These cards do not show physical locations." }));
  }
  function StageHotspot({ stage, state }) {
    const a = link(stage.display_name, C.transition(state, { type: "stage", stage: stage.stage_id }), { class: "stage-hotspot", "aria-label": "View " + stage.display_name + " performances" });
    const pos = C.pointToPercent(stage); a.style.left = pos.left; a.style.top = pos.top;
    return a; // Integration seam only; never mounted without validated geometry and a permitted representation.
  }
  function StageList({ idx, state }) {
    const options = [...idx.stages.values(), { stage_id: C.UNKNOWN_STAGE, display_name: "Stage unknown" }];
    return el("section", { class: "stage-list-panel", "aria-labelledby": "stage-list-title" },
      el("h2", { id: "stage-list-title", text: "Explore stages" }),
      FestivalMap(),
      el("ul", { class: "stage-list" }, options.map(stage => {
        const cov = C.coverage(C.query(idx, { ...state, stage: stage.stage_id }));
        return el("li", {}, link("", C.transition(state, { type: "stage", stage: stage.stage_id }), {
          class: "stage-link", "data-stage": stage.stage_id, "aria-controls": "stage-panel", "aria-current": state.stage === stage.stage_id ? "true" : null
        }, el("strong", { text: stage.display_name }), el("small", { text: cov.total ? cov.total + " performances · " + cov.timed + " with sourced times" : "No sourced schedule" })));
      })),
      el("div", { class: "stage-tools" }, link("View all performances", { ...state, view: "explore", stage: "", id: undefined }, { "data-stage": "", "aria-current": !state.stage ? "true" : null })));
  }
  function ArtistEntry({ artist, state, role }) {
    return link(artist.display_name + (role === "mc" ? " (MC)" : role === "dj" ? " (DJ)" : ""),
      C.transition(state, { type: "artist", id: artist.artist_id }), { class: "artist-link", "data-artist": artist.artist_id });
  }
  function PerformanceCard({ performance: p, idx, state }) {
    const stage = idx.stages.get(p.stage_id);
    const source = idx.sources.get(p.schedule_source_id);
    const card = el("li", { class: "performance", "data-performance": p.performance_id },
      el("h3", {}, link(p.display_name, C.transition(state, { type: "performance", id: p.performance_id }))),
      el("p", { class: "schedule-time", text: C.timeLabel(p) + " · " + (stage?.display_name || "Stage unknown") }),
      el("div", { class: "participants", "aria-label": "Credited artists" }, p.artist_ids.map(id => ArtistEntry({ artist: idx.artists.get(id), state, role: p.credits?.find(c => c.artist_id === id)?.role }))));
    if (p.performance_type === "program") card.append(el("p", { class: "muted", text: "Program slot; no individual artist announced in this reference." }));
    if (p.schedule_status === "poster_transcribed" && C.hasTime(p)) card.append(el("p", { class: "schedule-note", text: "Provisional poster time · transcribed " + (source?.checked_on || "date unavailable") + "; not independently cross-checked." }));
    else if (!C.hasTime(p)) card.append(el("p", { class: "schedule-note", text: "No sourced time for this current appearance. Its position here is not a set time." }));
    if (p.reconciliation?.status === "qualifier_changed") card.append(el("p", { class: "schedule-note", text: "Billing differs from the poster: “" + p.reconciliation.historical_billing + "”. Slot association needs confirmation." }));
    else if (p.issue_ids?.length) card.append(el("p", { class: "schedule-note", text: "Earlier source disagreement retained; this billing is in the current organizer day list. Check the official schedule." }));
    return card;
  }
  function PerformanceSchedule({ rows, idx, state }) {
    const fragment = document.createDocumentFragment();
    const dates = [...new Set(rows.map(p => p.event_date))];
    dates.forEach(date => {
      const dayRows = rows.filter(p => p.event_date === date);
      fragment.append(el("h3", { class: "day-heading", text: dayName(date) }));
      const timed = dayRows.filter(C.hasTime), untimed = dayRows.filter(p => !C.hasTime(p));
      if (timed.length) fragment.append(el("ul", { class: "schedule", "aria-label": dayName(date) + " sourced times" }, timed.map(p => PerformanceCard({ performance: p, idx, state }))));
      if (untimed.length) fragment.append(el("h3", { class: "day-heading", text: "Time unknown · alphabetical" }),
        el("ul", { class: "schedule untimed", "aria-label": dayName(date) + " time unknown" }, untimed.map(p => PerformanceCard({ performance: p, idx, state }))));
    });
    return fragment;
  }
  function StagePanel({ idx, state }) {
    const rows = C.query(idx, state), cov = C.coverage(rows);
    const stage = idx.stages.get(state.stage);
    const title = stage?.display_name || (state.stage === C.UNKNOWN_STAGE ? "Stage unknown" : "All performances");
    const section = el("section", { class: "panel", id: "stage-panel", "aria-labelledby": "stage-title" },
      el("h2", { id: "stage-title", tabindex: "-1", text: title }),
      el("p", { class: "section-meta", role: "status", text: cov.total + " performances · " + cov.timed + " with sourced times · " + cov.unknownTime + " time unknown" }));
    if (!rows.length) section.append(StateBox({ title: "No sourced schedule for this selection", message: "This reference has no assigned performances for this stage and day. It does not mean the stage is closed or has no programming. Check the organizer for updates." }));
    else section.append(PerformanceSchedule({ rows, idx, state }));
    return section;
  }
  function SourceNotice({ idx }) {
    const cov = C.coverage(idx.performances);
    return el("aside", { class: "notice notice-warning data-status", "aria-label": "Schedule coverage and freshness" },
      el("p", { text: cov.total + " current appearances · " + cov.provisional + " provisional poster times · " + cov.unknownTime + " time unknown · " + cov.unknownStage + " stage unknown." }),
      el("p", { text: "Lineup checked " + idx.meta.checked_on + ". Poster transcription: " + (idx.sources.get("set-times-posters-2026-10-30")?.checked_on || "date unavailable") + ". Incomplete timetable; all times are Orlando time (EST, UTC−05:00). Cross-check the official schedule." }),
      C.freshnessWarning(idx.meta.checked_on) ? el("p", { text: "Dated reference: these records have not been checked today. Changes may be missing." }) : null);
  }
  function BackLink({ state }) { return link("← Back to stages and performances", { ...state, view: "explore", id: undefined }, { class: "back", "data-back": "true" }); }
  function DetailView({ idx, state, musicAvailable }) {
    const isArtist = state.view === "artist";
    const entity = isArtist ? idx.artists.get(state.id) : idx.byPerformance.get(state.id);
    if (!entity) return el("div", { class: "details" }, BackLink({ state }), StateBox({ title: "Entry unavailable", message: "This link does not match the current reference. Return to stages and performances.", kind: "error" }));
    const allAppearances = isArtist ? idx.performances.filter(p => p.artist_ids.includes(state.id)).sort(C.chronological) : [entity];
    const rows = isArtist ? allAppearances.filter(p => state.day === "all" || p.event_date === state.day) : allAppearances;
    const node = el("article", { class: "details" }, BackLink({ state }),
      el("p", { class: "eyebrow", text: isArtist ? "Artist information" : "Performance information" }),
      el("h1", { id: "detail-title", tabindex: "-1", text: entity.display_name }));
    if (isArtist && entity.member_artist_ids?.length) node.append(el("p", { text: "Billed project with credited members:" }), el("div", { class: "participants" }, entity.member_artist_ids.map(id => ArtistEntry({ artist: idx.artists.get(id), state }))));
    const ids = isArtist ? [entity.artist_id] : entity.artist_ids;
    const n = new Set(ids.flatMap(id => (idx.songsByArtist.get(id) || []).map(s => s.video_id))).size;
    node.append(el("p", { text: musicAvailable ? n ? n + " reviewed discovery recordings available in Listening Room." : "No reviewed recordings added for this entry yet. Its lineup information is still available." : "Listening coverage could not load. You can still open Listening Room and try there." }));
    if (isArtist || entity.performance_type !== "program") node.append(el("a", { class: "action listening-link", href: C.listeningHref(state.id, state), text: "Hear " + entity.display_name + " in Listening Room →" }));
    node.append(el("p", { class: "muted", text: "Discovery recordings are not the songs promised for a live set. Use your browser’s Back to return from Listening Room." }),
      el("h2", { text: isArtist ? "Current appearances · " + dayName(state.day) : "This performance" }));
    if (rows.length) node.append(PerformanceSchedule({ rows, idx, state }));
    else node.append(StateBox({ title: allAppearances.length ? "No appearance on the selected day" : "No separately billed appearance", message: allAppearances.length ? "This artist has current appearances on other days. Return to stages and choose All days to see them." : "This identity is a credited project member or historical reference, not a separate current booking. Project membership does not make its solo catalog a project recording." }));
    return node;
  }
  window.CompanionUI = { el, StateBox, DayPicker, FestivalMap, StageHotspot, StageList, ArtistEntry, PerformanceCard, PerformanceSchedule, StagePanel, SourceNotice, DetailView, BackLink };
})();
