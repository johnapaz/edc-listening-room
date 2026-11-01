"use strict";
// Replaceable presentation functions. All input data comes from CompanionLib queries; nothing
// here owns schedule, stage or catalog authority. Every string reaches the DOM through text APIs.
(function () {
  const C = window.CompanionLib;
  const SVG_NS = "http://www.w3.org/2000/svg";
  const ORGANIZER = "https://orlando.edc.com/";

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
  function icon(shapes, size = 20) {
    const svg = document.createElementNS(SVG_NS, "svg");
    [["width", size], ["height", size], ["viewBox", "0 0 24 24"], ["fill", "none"], ["stroke", "currentColor"], ["stroke-width", 2],
      ["stroke-linecap", "round"], ["stroke-linejoin", "round"], ["aria-hidden", "true"], ["focusable", "false"]].forEach(([k, v]) => svg.setAttribute(k, v));
    shapes.forEach(([tag, attrs]) => {
      const shape = document.createElementNS(SVG_NS, tag);
      Object.entries(attrs).forEach(([k, v]) => shape.setAttribute(k, v));
      svg.append(shape);
    });
    return svg;
  }
  const ICONS = {
    chevron: [["path", { d: "m9 6 6 6-6 6" }]],
    external: [["path", { d: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" }]],
    pin: [["circle", { cx: 12, cy: 10, r: 3.2 }], ["path", { d: "M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" }]]
  };
  const link = (text, state, props, ...kids) => el("a", { href: C.buildHash(state), text, ...props }, ...kids);
  // Outbound links are https only, whatever the data says.
  const external = (text, href) => /^https:\/\//i.test(href || "") ? el("a", { class: "external", href, text, rel: "noopener noreferrer" }, " ", el("span", { "aria-hidden": "true", text: "↗" })) : el("span", { text });
  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const dayName = date => C.longDay(date);
  const scopeLabel = day => day === "all" ? "all days" : C.weekday(day);

  function StateBox({ title, message, kind = "empty", retry }) {
    const node = el("section", { class: "state-box " + kind, role: kind === "error" ? "alert" : kind === "loading" ? "status" : undefined },
      el("h2", { text: title }), el("p", { text: message }));
    if (retry) { const button = el("button", { type: "button", text: "Try again" }); button.addEventListener("click", retry); node.append(button); }
    return node;
  }

  // Primary navigation keeps the day. Map returns to the last stage the visitor picked, which
  // (while the map is gated) lands on that stage's schedule through the route resolver.
  function syncNav(nav, state, lastStage) {
    const current = state.view === "sources" ? "sources" : state.view === "map" ? "map" : "stages";
    const targets = {
      home: { view: "map", day: state.day, stage: "" },
      map: { view: "map", day: state.day, stage: lastStage || "" },
      stages: { view: "stages", day: state.day, stage: "" },
      sources: { view: "sources", day: state.day, stage: "" }
    };
    document.querySelectorAll("[data-nav]").forEach(a => {
      a.setAttribute("href", C.buildHash(targets[a.dataset.nav]));
      if (a.dataset.nav === "home") return;
      if (a.dataset.nav === current) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  // Native links, not toggle buttons: each day is a real URL and the selection is aria-current.
  function DayPicker({ state }) {
    return el("nav", { class: "days", "aria-label": "Festival day" }, C.DAYS.map(d => {
      const a = link("", C.transition(state, { type: "day", day: d.key }), { "data-day": d.key, "aria-current": d.key === state.day ? "true" : null });
      a.append(d.key === "all" ? el("span", {}, "All", el("span", { class: "sr-only", text: " days" })) : el("span", { text: C.dayLabel(d.key) }));
      return a;
    }));
  }

  function FestivalMap({ compact } = {}) {
    // Geographic interaction is gated by supported positions + an original permitted representation.
    // Never substitute a decorative or guessed map for unavailable evidence.
    return el("div", { class: "notice geometry-unavailable" + (compact ? " compact" : ""), "data-component": "festival-map" },
      el("strong", { text: "Map coming later" }),
      el("p", { text: "Stage positions have not been verified, so there is no map yet. Choose a stage to explore its performances. These cards do not show physical locations." }),
      el("p", {}, "For the official park map, see the ", external("organizer homepage", ORGANIZER), "."));
  }
  function StageHotspot({ stage, state }) {
    const a = link(stage.display_name, C.transition(state, { type: "stage", stage: stage.stage_id }), { class: "stage-hotspot", "aria-label": "View " + stage.display_name + " performances" });
    const pos = C.pointToPercent(stage); a.style.left = pos.left; a.style.top = pos.top;
    return a; // Integration seam only; never mounted without validated geometry and a permitted representation.
  }

  // The visible status vocabulary. Shape and words carry meaning; colour only reinforces them.
  const STATUS = {
    verified: { cls: "verified", text: "Confirmed" },
    poster: { cls: "poster", text: "Poster time" },
    unknown: { cls: "unknown", text: "Time unknown" }
  };
  function StatusBadge({ status, compact }) {
    const s = STATUS[status];
    return el("span", { class: "status " + s.cls + (compact ? " glyph" : "") }, el("span", { class: compact ? "sr-only" : null, text: s.text }));
  }
  function SourceLine({ idx, rows }) {
    const { status, disagreeing } = C.summarizeStatus(rows);
    const checked = key => C.shortDate(idx.sources.get(key)?.checked_on || "");
    const wrap = el("span", { class: "source-line" });
    if (status === "none") return wrap;
    if (status === "mixed") wrap.append(el("span", { class: "status mixed", text: "Mixed sources" }), " ", link("What do these mean?", { view: "sources", day: "all", stage: "" }));
    else {
      const date = status === "poster" ? idx.sources.get("set-times-posters-2026-10-30") && checked("set-times-posters-2026-10-30") : C.shortDate(idx.meta.checked_on);
      wrap.append(el("span", { class: "status " + STATUS[status].cls }, el("span", { text: status === "poster" ? "Poster times" : status === "verified" ? "Confirmed times" : "Time unknown" })), date ? el("span", { class: "muted", text: " · checked " + date }) : null);
    }
    if (disagreeing) wrap.append(el("span", { class: "status disagree", text: plural(disagreeing, "set", "sets") + " with differing sources" }));
    return wrap;
  }

  function StageList({ idx, state, mode = "full" }) {
    const options = [...idx.stages.values(), { stage_id: C.UNKNOWN_STAGE, display_name: "Stage unknown" }];
    return el("section", { class: "stage-list-panel " + mode, "aria-labelledby": "stage-list-title" },
      el("h2", { id: "stage-list-title", text: mode === "rail" ? "Stages" : "Choose a stage" }),
      el("ul", { class: "stage-list" }, options.map(stage => {
        const rows = C.query(idx, { ...state, stage: stage.stage_id }), cov = C.coverage(rows);
        const selected = state.view === "explore" && state.stage === stage.stage_id;
        const unknown = stage.stage_id === C.UNKNOWN_STAGE;
        const meta = !cov.total ? "No sourced schedule" : unknown ? plural(cov.total, "appearance", "appearances") + " · stage and time unknown" : plural(cov.total, "performance", "performances") + " · " + cov.timed + " with sourced times";
        return el("li", {}, link("", C.transition(state, { type: "stage", stage: stage.stage_id }), {
          class: "stage-link" + (!cov.total ? " empty" : ""), "data-stage": stage.stage_id, "aria-current": selected ? "true" : null
        }, el("span", { class: "stage-name", text: stage.display_name }), el("small", { text: meta }), icon(ICONS.chevron, 18)));
      })),
      el("div", { class: "stage-tools" }, link("View all performances", { view: "explore", day: state.day, stage: "" }, { "data-stage": "", "aria-current": state.view === "explore" && !state.stage ? "true" : null }),
        link("Stage or time unknown", { view: "unscheduled", day: state.day, stage: "" }, { class: "unscheduled-link" })));
  }

  function ArtistEntry({ artist, state, role }) {
    return link(artist.display_name + (role === "mc" ? " (MC)" : role === "dj" ? " (DJ)" : ""),
      C.transition(state, { type: "artist", id: artist.artist_id }), { class: "artist-link", "data-artist": artist.artist_id });
  }

  function DisagreementNote(p) {
    const r = p.reconciliation;
    const detail = r?.status === "qualifier_changed"
      ? "Poster billing: “" + r.historical_billing + "”. Which slot this billing belongs to needs confirmation."
      : "An earlier source disagreed; this billing is in the current organizer day list. Check the official schedule.";
    return el("p", { class: "disagree-note" }, el("span", { class: "status disagree", text: "Sources disagree" }), " ", detail);
  }

  // One set. Billing is plain text; actions are separate native links (no nested interactives).
  function SetRow({ performance: p, idx, state, headerStatus, showStage }) {
    const stage = idx.stages.get(p.stage_id), status = C.statusOf(p), parts = C.timeParts(p);
    const compact = headerStatus === status;
    const row = el("li", { class: "set performance", "data-performance": p.performance_id },
      el("div", { class: "time" + (parts ? "" : " none") },
        parts ? [el("span", { class: "start", text: parts.start }), el("span", { class: "end", text: parts.end + (parts.nextDay ? " +1" : "") }),
          parts.nextDay ? el("span", { class: "sr-only", text: " (ends next day)" }) : null]
          : [el("span", { "aria-hidden": "true", text: "—" }), el("span", { class: "sr-only", text: "Time unknown" })]),
      el("div", { class: "set-body" },
        el("p", { class: "billing" }, link(p.display_name, C.transition(state, { type: "performance", id: p.performance_id }), { class: "billing-link" }), p.set_qualifier ? el("span", { class: "chip", text: p.set_qualifier }) : null),
        showStage ? el("p", { class: "set-stage", text: stage?.display_name || "Stage unknown" }) : null,
        p.performance_type === "program" ? el("p", { class: "set-status", text: "Program · no artist page" }) : null,
        C.sourcesDisagree(p) ? DisagreementNote(p) : null,
        p.artist_ids.length > 1 ? el("div", { class: "participants", "aria-label": "Credited artists" }, p.artist_ids.map(id => idx.artists.get(id)).filter(Boolean).map(artist =>
          ArtistEntry({ artist, state, role: p.credits?.find(c => c.artist_id === artist.artist_id)?.role }))) : null,
        el("p", { class: "actions" }, StatusBadge({ status, compact }),
          C.hearTargets(idx, p).filter(t => t.tracks > 0).map(t => el("a", { class: "hear", href: C.listeningHref(t.artist.artist_id, state), "data-hear": t.artist.artist_id },
            el("span", { "aria-hidden": "true", text: "♫ " }), "Hear " + t.artist.display_name)))));
    return row;
  }

  function ScheduleList({ rows, idx, state, showStage, detail }) {
    const fragment = document.createDocumentFragment();
    // Glyph-only badges rely on a visible source summary above the list; detail pages have none, so they spell each badge out.
    const headerStatus = detail ? null : C.summarizeStatus(rows).status;
    const dates = [...new Set(rows.map(p => p.event_date))];
    dates.forEach(date => {
      const dayRows = rows.filter(p => p.event_date === date);
      if (detail || state.day === "all" || dates.length > 1) fragment.append(el("h3", { class: "day-heading", text: dayName(date) }));
      const timed = dayRows.filter(C.hasTime), untimed = dayRows.filter(p => !C.hasTime(p));
      if (timed.length) fragment.append(el("ul", { class: "schedule", "aria-label": dayName(date) + " sourced times" }, timed.map(p => SetRow({ performance: p, idx, state, headerStatus, showStage }))));
      if (untimed.length) fragment.append(el("h3", { class: "day-heading subtle", text: "Time unknown · alphabetical" }),
        el("ul", { class: "schedule untimed", "aria-label": dayName(date) + " time unknown" }, untimed.map(p => SetRow({ performance: p, idx, state, headerStatus, showStage }))));
    });
    return fragment;
  }

  function UnscheduledLink({ idx, state }) {
    const n = C.unscheduled(idx, state.day).length;
    if (!n) return null;
    const who = state.day === "all" ? plural(n, "act has", "acts have") : plural(n, C.weekday(state.day) + " act has", C.weekday(state.day) + " acts have");
    return el("p", { class: "foot-link" }, link(who + " an unknown stage or time in this reference →", { view: "unscheduled", day: state.day, stage: "" }));
  }

  function StagePanel({ idx, state }) {
    const rows = C.query(idx, state), cov = C.coverage(rows);
    const stage = idx.stages.get(state.stage);
    const title = stage?.display_name || (state.stage === C.UNKNOWN_STAGE ? "Stage unknown" : "All performances");
    const section = el("section", { class: "panel", id: "stage-panel", "aria-labelledby": "stage-title" },
      el("h2", { id: "stage-title", tabindex: "-1", text: title }),
      el("p", { class: "section-meta" }, el("span", { text: (state.day === "all" ? "All days" : C.dayLabel(state.day)) + " · " + plural(cov.total, "performance", "performances") + " · " + cov.timed + " with sourced times · " + cov.unknownTime + " time unknown" })),
      rows.length ? el("p", { class: "section-meta" }, SourceLine({ idx, rows })) : null);
    if (!rows.length) {
      const day = state.day === "all" ? "" : " on " + C.weekday(state.day);
      section.append(StateBox({ title: stage ? "No sourced schedule for " + stage.display_name + day + " in this reference" : "No sourced schedule for this selection",
        message: "This reference has no assigned performances" + (stage ? " for this stage" : "") + (state.day === "all" ? "" : " on this day") + ". It does not mean the stage is closed or has no programming. Check the organizer for updates." }));
    } else section.append(ScheduleList({ rows, idx, state, showStage: !stage }));
    section.append(UnscheduledLink({ idx, state }));
    return section;
  }

  function SourceNotice({ idx, compact }) {
    const cov = C.coverage(idx.performances);
    const stale = C.freshnessWarning(idx.meta.checked_on);
    const posters = idx.sources.get("set-times-posters-2026-10-30")?.checked_on;
    const facts = cov.total + " current appearances · " + cov.provisional + " provisional poster times · " + cov.unknownTime + " time unknown · " + cov.unknownStage + " stage unknown.";
    return el("aside", { class: "notice notice-warning data-status" + (compact ? " compact" : ""), "aria-label": "Schedule coverage and freshness" },
      el("p", { text: facts }),
      el("p", {}, (compact ? "Checked " + C.shortDate(idx.meta.checked_on) + "; poster times transcribed " + (posters ? C.shortDate(posters) : "date unavailable") + ". Orlando time. "
        : "Lineup checked " + idx.meta.checked_on + ". Poster transcription: " + (posters || "date unavailable") + ". Incomplete timetable; all times are Orlando time (EST, UTC−05:00). ") +
        "Cross-check the official schedule. ", link("What do these labels mean?", { view: "sources", day: "all", stage: "" })),
      stale ? el("p", { class: "stale" }, "Dated reference: these records have not been checked today. Changes may be missing. ", external("Check the official lineup", ORGANIZER)) : null);
  }

  function BackLink({ state }) { return link("← Back to stages and performances", { ...state, view: "explore", id: undefined }, { class: "back", "data-back": "true" }); }

  function PageIntro({ eyebrow, title, lede, id }) {
    return el("div", { class: "intro" }, el("p", { class: "eyebrow", text: eyebrow }), el("h1", { id, tabindex: "-1", text: title }), lede ? el("p", { class: "muted", text: lede }) : null);
  }

  // S10: while geometry is unverified the Map tab is the stage list under a "Map coming later" notice.
  function MapGatedView({ idx, state }) {
    return el("div", { class: "page" }, PageIntro({ id: "page-title", eyebrow: "EDC Orlando · Nov 6–8, 2026 · Review preview", title: "Find your next stage", lede: "Explore stages, check the available set times, and get to know the artists." }),
      SourceNotice({ idx }), DayPicker({ state }), FestivalMap(), StageList({ idx, state, mode: "full" }));
  }
  function StagesView({ idx, state }) {
    return el("div", { class: "page" }, PageIntro({ id: "page-title", eyebrow: "Stages", title: "Stages", lede: "Five stages. Counts follow the selected day." }),
      DayPicker({ state }), StageList({ idx, state, mode: "full" }), UnscheduledLink({ idx, state }));
  }
  function ExploreView({ idx, state }) {
    return el("div", { class: "page wide" },
      PageIntro({ eyebrow: "EDC Orlando · Nov 6–8, 2026 · Review preview", title: "Stages and sets", lede: null, id: "page-title" }),
      SourceNotice({ idx, compact: true }), DayPicker({ state }),
      el("div", { class: "explorer" }, el("div", { class: "rail" }, StageList({ idx, state, mode: "rail" })), StagePanel({ idx, state })));
  }
  function UnscheduledView({ idx, state }) {
    const rows = C.unscheduled(idx, state.day);
    const section = el("section", { class: "panel", "aria-labelledby": "page-title" },
      el("p", { class: "muted", text: "These current lineup entries have no sourced stage or time in this reference. They are listed alphabetically; the order is not a running order." }),
      rows.length ? ScheduleList({ rows, idx, state, showStage: true })
        : StateBox({ title: "Nothing to show for " + scopeLabel(state.day), message: "Every current appearance on this day has a sourced stage and time in this reference." }));
    return el("div", { class: "page" }, link("← Back to stages", { view: "stages", day: state.day, stage: "" }, { class: "back" }),
      PageIntro({ id: "page-title", eyebrow: "Unscheduled lineup entries", title: "Stage or time unknown", lede: null }), DayPicker({ state }), section);
  }

  function SourcesView({ idx }) {
    const legend = [
      ["verified", "Confirmed", "Checked against the organizer’s own schedule. No current slot has this status yet."],
      ["poster", "Poster time", "Read from a published set-time poster on the date shown. Usually right, but not cross-checked and it may change."],
      ["unknown", "Time unknown", "This reference has no sourced stage or time for the entry. Its place in a list is not a running order."]
    ];
    const meta = idx.meta;
    const named = { organizer_day_list: "Organizer day list", poster_transcription: "Set-time poster transcription" };
    return el("div", { class: "page" }, PageIntro({ id: "page-title", eyebrow: "About & sources", title: "How to read this reference", lede: "An independent, unofficial planning aid. It describes our evidence; it is not the festival’s schedule." }),
      el("section", { "aria-labelledby": "legend-title" }, el("h2", { id: "legend-title", text: "What the labels mean" }),
        el("dl", { class: "legend" }, legend.flatMap(([cls, term, text]) => [el("dt", {}, el("span", { class: "status " + cls, text: term })), el("dd", { text })]),
          el("dt", {}, el("span", { class: "status disagree", text: "Sources disagree" })),
          el("dd", { text: "Our sources differ on this billing or slot. The note on the set says how. Check the official schedule before relying on it." }),
          el("dt", {}, el("span", { class: "status mixed", text: "Program" })),
          el("dd", { text: "A festival program slot rather than one artist, so there is no artist page for it." }))),
      el("section", { "aria-labelledby": "sources-title" }, el("h2", { id: "sources-title", text: "Where the schedule comes from" }),
        // Homepage-only UI links: the audited source URLs stay in the data, not in the UI.
        el("ul", { class: "source-list" }, (meta.sources || []).map(s => el("li", {},
          el("strong", { text: named[s.kind] || s.kind }), el("span", { text: " · checked " + C.shortDate(s.checked_on) + (s.independently_verified === false ? " · not independently verified" : "") }),
          s.url ? [" · ", external("organizer homepage", ORGANIZER)] : null))),
        el("p", { class: "muted", text: "Times are Orlando time (EST, UTC−05:00); a set after midnight belongs to the night it continues. Music shown is reviewed discovery recordings, not a live setlist." })),
      el("section", { "aria-labelledby": "map-title" }, el("h2", { id: "map-title", text: "The map" }),
        el("p", { text: "There is no map yet. Stage positions have not been independently verified and no official artwork is copied, traced or embedded here, so nothing on this site shows where a stage is. No GPS, routes, walking times or offline copy are offered." }),
        el("p", {}, external("Organizer homepage", ORGANIZER))));
  }

  function ListeningCta({ idx, state, musicAvailable, artist }) {
    const n = C.trackCount(idx, artist.artist_id);
    const href = C.listeningHref(artist.artist_id, state);
    if (musicAvailable && n) return el("a", { class: "action listening-link", href, "data-hear": artist.artist_id }, el("span", { "aria-hidden": "true", text: "♫ " }), "Hear " + artist.display_name + " in Listening Room →");
    return el("p", { class: "no-tracks" }, el("span", { class: "muted", text: musicAvailable ? "No reviewed tracks yet for " + artist.display_name + ". " : "Listening coverage could not load. " }),
      el("a", { class: "action", href, text: musicAvailable ? "Artist page in Listening Room →" : "Open " + artist.display_name + " in Listening Room →" }));
  }

  function DetailView({ idx, state, musicAvailable }) {
    const isArtist = state.view === "artist";
    const entity = isArtist ? idx.artists.get(state.id) : idx.byPerformance.get(state.id);
    if (!entity) return el("div", { class: "details" }, BackLink({ state }), el("h1", { id: "detail-title", tabindex: "-1", text: "Entry unavailable" }),
      StateBox({ title: "Not in the current reference", message: "This link does not match the current reference. Return to stages and performances.", kind: "error" }));
    const allAppearances = isArtist ? idx.performances.filter(p => p.artist_ids.includes(state.id)).sort(C.chronological) : [entity];
    const rows = isArtist ? allAppearances.filter(p => state.day === "all" || p.event_date === state.day) : allAppearances;
    const node = el("article", { class: "details" }, BackLink({ state }),
      el("p", { class: "eyebrow", text: isArtist ? "Artist information" : "Performance information" }),
      el("h1", { id: "detail-title", tabindex: "-1", text: entity.display_name }));
    if (!isArtist && state.day !== "all" && entity.event_date !== state.day) node.append(el("p", { class: "notice compact", text: "Not on " + C.weekday(state.day) + ". This performance is on " + dayName(entity.event_date) + "." }));
    if (isArtist && entity.member_artist_ids?.length) node.append(el("p", { text: "Billed project with credited members:" }), el("div", { class: "participants" }, entity.member_artist_ids.map(id => ArtistEntry({ artist: idx.artists.get(id), state }))));
    if (!isArtist && entity.artist_ids.length > 1) node.append(el("p", { text: "Credited artists:" }), el("div", { class: "participants" }, entity.artist_ids.map(id => ArtistEntry({ artist: idx.artists.get(id), state, role: entity.credits?.find(c => c.artist_id === id)?.role }))));
    else if (!isArtist && entity.artist_ids.length === 1 && entity.performance_type !== "program") node.append(el("div", { class: "participants" }, ArtistEntry({ artist: idx.artists.get(entity.artist_ids[0]), state })));
    const targets = isArtist ? [{ artist: entity }] : C.hearTargets(idx, entity);
    const n = new Set(targets.flatMap(t => (idx.songsByArtist.get(t.artist.artist_id) || []).map(s => s.video_id))).size;
    if (isArtist || targets.length) {
      node.append(el("p", { text: musicAvailable ? n ? n + " reviewed discovery recordings available in Listening Room." : "No reviewed recordings added for this entry yet. Its lineup information is still available." : "Listening coverage could not load. You can still open Listening Room and try there." }),
        el("div", { class: "cta-group" }, targets.map(t => ListeningCta({ idx, state, musicAvailable, artist: t.artist }))));
    } else node.append(el("p", { class: "muted", text: "This is a festival program, not a single artist, so there is no Listening Room page for it." }));
    node.append(el("p", { class: "muted", text: "Discovery recordings are not the songs promised for a live set. Use your browser’s Back to return from Listening Room." }),
      el("h2", { text: isArtist ? "Current appearances · " + dayName(state.day) : "This performance" }));
    if (rows.length) node.append(el("p", { class: "section-meta" }, SourceLine({ idx, rows })), ScheduleList({ rows, idx, state, showStage: true, detail: true }));
    else node.append(StateBox({ title: allAppearances.length ? "No appearance on the selected day" : "No separately billed appearance", message: allAppearances.length ? "This artist has current appearances on other days. Return to stages and choose All days to see them." : "This identity is a credited project member or historical reference, not a separate current booking. Project membership does not make its solo catalog a project recording." }));
    return node;
  }

  window.CompanionUI = { el, icon, ICONS, external, StateBox, syncNav, DayPicker, FestivalMap, StageHotspot, StatusBadge, SourceLine, StageList, ArtistEntry,
    SetRow, PerformanceCard: SetRow, ScheduleList, PerformanceSchedule: ScheduleList, StagePanel, UnscheduledLink, SourceNotice, DetailView, BackLink,
    MapGatedView, StagesView, ExploreView, UnscheduledView, SourcesView };
})();
