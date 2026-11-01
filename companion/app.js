"use strict";
(function () {
  const C = window.CompanionLib, U = window.CompanionUI, main = document.getElementById("main");
  const nav = document.querySelector(".primary"), live = document.getElementById("live"), banner = document.getElementById("banner");
  let idx, musicAvailable = false, controller, loadNumber = 0, lastStage = "", liveTimer, renderedHash = null;
  history.scrollRestoration = "manual";
  async function readJson(path, signal) {
    const response = await fetch(path, { cache: "no-cache", signal });
    if (!response.ok) throw new Error("Data unavailable");
    return response.json();
  }
  function announce(text) {
    // Clear first so repeating a message (same stage, same day) is still announced.
    clearTimeout(liveTimer); live.textContent = "";
    liveTimer = setTimeout(() => { live.textContent = text; }, 60);
  }
  const TITLES = { map: "Map", stages: "Stages", unscheduled: "Stage or time unknown", sources: "About & sources" };
  function titleFor(state) {
    if (state.view === "invalid") return "Selection unavailable";
    if (state.view === "explore") return idx.stages.get(state.stage)?.display_name || (state.stage === C.UNKNOWN_STAGE ? "Stage unknown" : "Explore");
    if (state.view === "artist") return idx.artists.get(state.id)?.display_name || "Entry unavailable";
    if (state.view === "performance") return idx.byPerformance.get(state.id)?.display_name || "Entry unavailable";
    return TITLES[state.view] || "Explore";
  }
  function focusTarget(state) {
    if (state.view === "explore") return document.getElementById("stage-title");
    if (["artist", "performance", "invalid"].includes(state.view)) return document.getElementById("detail-title");
    return document.getElementById("page-title");
  }
  // Sticky offsets follow the real layout: the app bar can wrap (long text, wide system fonts, text zoom) and the
  // day strip can wrap on narrow screens. Static (non-sticky) bars contribute no offset.
  const root = document.documentElement, bar = document.querySelector(".app-bar");
  function measureLayout() {
    const days = document.querySelector(".days"), stuck = el => el && getComputedStyle(el).position === "sticky";
    root.style.setProperty("--bar-h", (stuck(bar) ? bar.getBoundingClientRect().height : 0) + "px");
    root.style.setProperty("--strip-h", (stuck(days) ? days.getBoundingClientRect().height : 0) + "px");
  }
  if ("ResizeObserver" in window) new ResizeObserver(measureLayout).observe(bar), new ResizeObserver(measureLayout).observe(main);
  window.addEventListener("resize", measureLayout); document.fonts?.ready.then(measureLayout);
  function render({ focus, scroll } = {}) {
    if (!idx) return;
    const parsed = C.parseHash(location.hash);
    // Gated map aliases (S10) and bad stage params on the list pages canonicalise by replacing the entry.
    const { state, replace } = parsed.view === "invalid" ? { state: parsed, replace: false } : C.resolveRoute(idx, parsed);
    if (replace) history.replaceState({ ...history.state }, "", C.buildHash(state));
    const stageOk = !state.stage || state.stage === C.UNKNOWN_STAGE || idx.stages.has(state.stage);
    if (state.view === "explore" && state.stage && stageOk) lastStage = state.stage;
    if (state.view === "invalid" || ((["explore", "artist", "performance"].includes(state.view)) && !stageOk)) {
      main.replaceChildren(U.el("div", { class: "page" }, U.el("h1", { id: "detail-title", tabindex: "-1", text: "Selection unavailable" }),
        U.StateBox({ title: "This stage or link was not found", message: "Choose from the stages in the current reference.", kind: "error" }),
        U.el("a", { href: C.buildHash({ view: "stages", day: state.day, stage: "" }), class: "back", text: "Browse stages and performances" })));
    } else if (["artist", "performance"].includes(state.view)) {
      main.replaceChildren(U.DetailView({ idx, state, musicAvailable }));
    } else {
      const views = { map: U.MapGatedView, stages: U.StagesView, explore: U.ExploreView, unscheduled: U.UnscheduledView, sources: U.SourcesView };
      main.replaceChildren(views[state.view]({ idx, state }));
    }
    U.syncNav(nav, state, lastStage);
    main.setAttribute("aria-busy", "false");
    measureLayout();
    const unavailable = state.view === "invalid" || (["explore", "artist", "performance"].includes(state.view) && !stageOk);
    document.title = (unavailable ? "Selection unavailable" : titleFor(state)) + " · Event Day Companion";
    renderedHash = location.hash; // lets the hashchange that follows a popstate skip a second, focus-destroying render
    if (focus) {
      const target = focus === "day" ? [...main.querySelectorAll("a[data-day]")].find(a => a.dataset.day === state.day) : focusTarget(state);
      (target || main).focus({ preventScroll: focus === "day" || scroll !== undefined });
      announce(state.view === "explore" && !unavailable ? C.announcement(idx, state) : (unavailable ? "Selection unavailable" : titleFor(state)) + (focus === "day" ? ", " + (state.day === "all" ? "all days" : C.weekday(state.day)) : ""));
    }
    if (scroll !== undefined) requestAnimationFrame(() => window.scrollTo(0, scroll));
  }
  function rememberScroll() { history.replaceState({ ...history.state, companionScroll: window.scrollY }, ""); }
  function navigate(hash, focus) {
    const current = C.buildHash(C.parseHash(location.hash));
    if (hash === current) return;
    rememberScroll();
    if (focus === "day") history.replaceState({ ...history.state, companionScroll: window.scrollY }, "", hash);
    else history.pushState({ companionScroll: 0, companionFrom: current }, "", hash);
    render({ focus, scroll: focus === "day" ? window.scrollY : undefined });
  }
  document.addEventListener("click", e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest("a");
    if (!a) return;
    if (a.classList.contains("skip")) { e.preventDefault(); main.focus(); main.scrollIntoView(); return; }
    if (a.getAttribute("href")?.startsWith("#/")) {
      e.preventDefault();
      // A logical Back link still works on a directly opened/deep-linked detail.
      if (a.dataset.back && history.state?.companionFrom === a.getAttribute("href")) { rememberScroll(); history.back(); }
      else navigate(a.getAttribute("href"), a.dataset.day ? "day" : "content");
    } else rememberScroll(); // Retain route + scroll across the Listening Room boundary.
  });
  window.addEventListener("popstate", () => render({ focus: "content", scroll: history.state?.companionScroll || 0 }));
  // Direct hash edits also work. Browser Back/Forward emits popstate and then hashchange for the same
  // hash: popstate already rendered it and focused the heading, so the duplicate render is skipped
  // (it would replace the focused heading and drop keyboard focus to <body>).
  window.addEventListener("hashchange", () => { if (location.hash !== renderedHash) render({ scroll: history.state?.companionScroll || 0 }); });
  window.addEventListener("pagehide", rememberScroll);
  window.addEventListener("pageshow", e => { if (e.persisted) render({ scroll: history.state?.companionScroll || 0 }); });
  // Honest connectivity note. This is a status message, never an offline-support promise.
  function showConnectivity() {
    banner.hidden = navigator.onLine !== false;
    banner.textContent = navigator.onLine === false ? "You’re offline. Showing what was already loaded; times may be out of date." : "";
  }
  window.addEventListener("offline", showConnectivity); window.addEventListener("online", showConnectivity); showConnectivity();
  async function load(recovering = false) {
    controller?.abort(); controller = new AbortController(); const signal = controller.signal, number = ++loadNumber;
    idx = undefined; main.setAttribute("aria-busy", "true");
    main.replaceChildren(U.StateBox({ title: "Loading stages…", message: "Getting stages and current performances…", kind: "loading" }));
    // Abort weak-signal requests after a bounded wait. No offline/cache promise.
    const requestController = controller;
    const timer = setTimeout(() => requestController.abort(), 15000);
    try {
      const [perf, art, venues, music] = await Promise.all([
        readJson("../data/edco-2026/performances.json", signal), readJson("../data/edco-2026/artists.json", signal),
        readJson("../data/edco-2026/venues.json", signal),
        readJson("../data/listening-room/songs.json", signal).then(d => Array.isArray(d.songs) ? d.songs : null).catch(() => null)
      ]);
      if (number !== loadNumber) return;
      musicAvailable = music !== null; idx = C.createIndex(perf, art, venues, music || []);
      // After a manual retry the retry button is gone, so move focus into the restored content and announce it.
      render({ scroll: history.state?.companionScroll || 0, focus: recovering ? "content" : undefined });
    } catch (_e) {
      if (number !== loadNumber) return;
      main.setAttribute("aria-busy", "false");
      main.replaceChildren(U.el("div", { class: "page" }, U.el("h1", { text: "Festival reference unavailable" }),
        U.StateBox({ title: "Couldn’t load the reference", message: "Your connection may be weak, or the current data may be unavailable. Try again when connected. No offline copy is guaranteed.", kind: "error", retry: () => load(true) }),
        U.el("a", { class: "action", href: "https://orlando.edc.com/", text: "Organizer homepage ↗" })));
    } finally { clearTimeout(timer); }
  }
  load();
})();
