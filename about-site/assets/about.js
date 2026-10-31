"use strict";
// About & Help enhancements. Everything works without this file; it adds help search,
// copy-a-section-link, and the "On this page" position marker.
(function () {
  const APP_SEARCH = "/listening-room/#/lineup?q=";
  let index = null;
  let loading = null;

  function load() {
    if (!loading) {
      loading = fetch("/about/search.json", { cache: "no-cache" })
        .then(r => (r.ok ? r.json() : []))
        .catch(() => [])
        .then(d => (index = Array.isArray(d) ? d : []));
    }
    return loading;
  }

  const norm = s => String(s || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

  function find(q) {
    const tokens = norm(q).split(/\s+/).filter(t => t.length > 1);
    if (!tokens.length || !index) return [];
    return index.map(row => {
      const title = norm(row.page), heading = norm(row.heading), text = norm(row.text);
      let score = 0;
      for (const t of tokens) {
        const hit = (title.includes(t) ? 4 : 0) + (heading.includes(t) ? 6 : 0) + (text.includes(t) ? 1 : 0);
        if (!hit) return null;
        score += hit;
      }
      return { row, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score || (a.row.act ? 1 : 0) - (b.row.act ? 1 : 0)).slice(0, 6).map(x => x.row);
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function render(form) {
    const input = form.querySelector("input");
    const list = form.querySelector(".results");
    const status = form.querySelector("[role=status]");
    const q = input.value.trim();
    list.replaceChildren();
    if (!q) { status.textContent = ""; return; }
    const hits = find(q);
    hits.forEach(row => {
      const a = el("a");
      a.href = row.url;
      a.append(el("strong", "", row.heading), el("span", "", row.act ? row.page + " · artist page" : row.heading === row.page ? "Help page" : row.page));
      const li = el("li"); li.append(a); list.append(li);
    });
    if (!hits.length) list.append(el("li", "none", "No help topics match."));
    const lineup = el("li", "lineup");
    const a = el("a");
    a.href = APP_SEARCH + encodeURIComponent(q);
    a.append(el("strong", "", "Search the lineup for “" + q + "”"), el("span", "", "Opens Listening Room"));
    lineup.append(a); list.append(lineup);
    status.textContent = hits.length ? hits.length + (hits.length === 1 ? " help topic found." : " help topics found.") : "No help topics found.";
  }

  document.querySelectorAll("[data-search]").forEach(form => {
    form.hidden = false;
    const input = form.querySelector("input");
    input.addEventListener("focus", load, { once: true });
    input.addEventListener("input", () => load().then(() => render(form)));
    input.addEventListener("keydown", e => {
      if (e.key === "Escape" && input.value) { e.preventDefault(); input.value = ""; render(form); }
      if (e.key === "ArrowDown") { const a = form.querySelector(".results a"); if (a) { e.preventDefault(); a.focus(); } }
    });
    form.addEventListener("keydown", e => {
      if (!e.target.closest(".results")) return;
      const links = [...form.querySelectorAll(".results a")];
      const i = links.indexOf(e.target);
      if (e.key === "ArrowDown" && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
      if (e.key === "ArrowUp") { e.preventDefault(); (i > 0 ? links[i - 1] : input).focus(); }
      if (e.key === "Escape") { e.preventDefault(); input.focus(); }
    });
    form.addEventListener("submit", e => {
      e.preventDefault();
      load().then(() => { render(form); const a = form.querySelector(".results a"); if (a) a.click(); });
    });
  });

  // Section links: follow the link as usual, and also copy the full URL when allowed.
  const toast = document.querySelector(".toast");
  let timer;
  document.addEventListener("click", e => {
    const a = e.target.closest("a.anchor");
    if (!a || !navigator.clipboard || !window.isSecureContext) return;
    navigator.clipboard.writeText(a.href).then(() => {
      if (!toast) return;
      toast.textContent = "Link copied";
      toast.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove("show"), 1600);
    }, () => {});
  });

  // Open an FAQ answer when its link is followed (#question-id).
  function openTarget() {
    if (!location.hash) return;
    let t = null;
    try { t = document.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (_e) { t = null; }
    if (t && t.tagName === "DETAILS") t.open = true;
  }
  window.addEventListener("hashchange", openTarget);
  openTarget();

  // Close the mobile menu after choosing a destination on the same page.
  const menu = document.querySelector(".menu");
  if (menu) menu.addEventListener("click", e => { if (e.target.closest("a")) menu.open = false; });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && menu && menu.open) { menu.open = false; menu.querySelector("summary").focus(); }
  });

  // Mark the section currently on screen in "On this page".
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map(a => [a.getAttribute("href").slice(1), a]));
    const visible = new Set();
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => (en.isIntersecting ? visible.add(en.target.id) : visible.delete(en.target.id)));
      const heads = [...byId.keys()].map(id => document.getElementById(id)).filter(Boolean);
      let current = heads.find(h => visible.has(h.id));
      if (!current) current = heads.filter(h => h.getBoundingClientRect().top < 120).pop() || heads[0];
      tocLinks.forEach(a => a.removeAttribute("aria-current"));
      if (current) byId.get(current.id).setAttribute("aria-current", "location");
    }, { rootMargin: "-70px 0px -55% 0px" });
    byId.forEach((_a, id) => { const h = document.getElementById(id); if (h) io.observe(h); });
  }
})();
