"use strict";
(function () {
  const C = window.CompanionLib, U = window.CompanionUI, main = document.getElementById("main");
  let idx, musicAvailable = false, controller, loadNumber = 0;
  history.scrollRestoration = "manual";
  async function readJson(path, signal) {
    const response = await fetch(path, { cache: "no-cache", signal });
    if (!response.ok) throw new Error("Data unavailable");
    return response.json();
  }
  function render({ focus, scroll } = {}) {
    if (!idx) return;
    const state = C.parseHash(location.hash);
    if (state.view === "invalid" || (state.stage && state.stage !== C.UNKNOWN_STAGE && !idx.stages.has(state.stage))) {
      main.replaceChildren(U.el("h1", { id: "detail-title", tabindex: "-1", text: "Selection unavailable" }),
        U.StateBox({ title: "This stage or link was not found", message: "Choose from the stages in the current reference.", kind: "error" }),
        U.el("a", { href: C.buildHash({ day: state.day, stage: "" }), class: "back", text: "Browse stages and performances" }));
    } else if (["artist", "performance"].includes(state.view)) {
      main.replaceChildren(U.DetailView({ idx, state, musicAvailable }));
    } else {
      main.replaceChildren(U.el("div", { class: "intro" }, U.el("p", { class: "eyebrow", text: "EDC Orlando · Nov 6–8, 2026 · Review preview" }),
        U.el("h1", { text: "Find your next stage" }), U.el("p", { class: "muted", text: "Explore stages, check the available set times, and get to know the artists." })),
        U.SourceNotice({ idx }), U.DayPicker({ state }),
        U.el("div", { class: "explorer" }, U.StageList({ idx, state }), U.StagePanel({ idx, state })));
    }
    main.setAttribute("aria-busy", "false");
    document.title = (idx.artists.get(state.id)?.display_name || idx.byPerformance.get(state.id)?.display_name || idx.stages.get(state.stage)?.display_name || "Explore") + " · Event Day Companion";
    if (focus) {
      const target = focus === "day" ? [...main.querySelectorAll("a[data-day]")].find(a => a.dataset.day === state.day) : document.getElementById(state.view === "explore" ? "stage-title" : "detail-title");
      (target || main).focus({ preventScroll: focus === "day" || scroll !== undefined });
    }
    if (scroll !== undefined) requestAnimationFrame(() => window.scrollTo(0, scroll));
  }
  function rememberScroll() { history.replaceState({ ...history.state, companionScroll: window.scrollY }, ""); }
  function navigate(hash, focus) {
    rememberScroll(); history.pushState({ companionScroll: 0, companionFrom: C.buildHash(C.parseHash(location.hash)) }, "", hash);
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
  // Direct hash edits also work. Browser popstate may additionally emit hashchange;
  // rendering again is harmless but must not reset a restored scroll position.
  window.addEventListener("hashchange", () => render({ scroll: history.state?.companionScroll || 0 }));
  window.addEventListener("pagehide", rememberScroll);
  window.addEventListener("pageshow", e => { if (e.persisted) render({ scroll: history.state?.companionScroll || 0 }); });
  async function load() {
    controller?.abort(); controller = new AbortController(); const signal = controller.signal, number = ++loadNumber;
    idx = undefined; main.setAttribute("aria-busy", "true");
    main.replaceChildren(U.StateBox({ title: "Loading festival reference", message: "Getting stages and current performances…", kind: "loading" }));
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
      render({ scroll: history.state?.companionScroll || 0 });
    } catch (_e) {
      if (number !== loadNumber) return;
      main.setAttribute("aria-busy", "false");
      main.replaceChildren(U.el("h1", { text: "Festival reference unavailable" }), U.StateBox({ title: "Couldn’t load the reference", message: "Your connection may be weak, or the current data may be unavailable. Try again when connected. No offline copy is guaranteed.", kind: "error", retry: load }),
        U.el("a", { class: "action", href: "https://orlando.edc.com/", text: "Organizer homepage ↗" }));
    } finally { clearTimeout(timer); }
  }
  load();
})();
