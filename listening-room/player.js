"use strict";
// Public, no-login YouTube queue. No provider player loads until a person explicitly presses Play.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", api.init, { once: true });
    else api.init();
  }
})(typeof self !== "undefined" ? self : this, function () {
  const DAYS = ["2026-11-06", "2026-11-07", "2026-11-08"];
  const MIX_NAMES = { all: "All tracks", "2026-11-06": "Friday", "2026-11-07": "Saturday", "2026-11-08": "Sunday" };
  function buildQueue(rows, performances, artists, scope) {
    // This reads only public-export fields. A featured collaborator credited on
    // a track can qualify that recording for the day they are booked.
    const selected = DAYS.includes(scope) ? scope : "all";
    const booked = selected === "all" ? null : new Set(
      (performances || []).filter(p => p.event_date === selected)
        .flatMap(p => Array.isArray(p.artist_ids) ? p.artist_ids : []));
    const displayNames = new Map((artists || []).map(a => [a.artist_id, a.display_name]));
    const groups = new Map();
    const seen = new Set();
    for (const song of rows || []) {
      const id = song && song.video_id;
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(id) ||
          song.url !== "https://www.youtube.com/watch?v=" + id || seen.has(id)) continue;
      const credits = [...new Set(Array.isArray(song.artist_ids) ? song.artist_ids : [song.artist_id])].filter(Boolean);
      if (!credits.length || (booked && !credits.some(a => booked.has(a)))) continue;
      seen.add(id);
      const lead = credits[0];
      if (!groups.has(lead)) groups.set(lead, []);
      groups.get(lead).push({
        video_id: id,
        title: String(song.title || "Untitled track"),
        artist: credits.map(a => displayNames.get(a) || a.replace(/^artist:/, "")).join(" · "),
      });
    }
    const queue = [];
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const group of groups.values()) {
        if (group.length) { queue.push(group.shift()); remaining = true; }
      }
    }
    return queue;
  }

  function shuffleQueue(queue, random = Math.random) {
    // Does not mutate the canonical breadth-first queue.
    const out = queue.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.max(0, Math.min(i, Math.floor(random() * (i + 1))));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function embedUrl(queue, startIndex = 0) {
    if (!Array.isArray(queue) || !queue.length || !Number.isInteger(startIndex) ||
        startIndex < 0 || startIndex >= queue.length) return null;
    const remaining = queue.slice(startIndex);
    // Provider-controlled sequential playback, not a published YouTube Music playlist.
    return "https://www.youtube-nocookie.com/embed/" + remaining[0].video_id +
      "?autoplay=1&playsinline=1&playlist=" +
      remaining.map(s => s.video_id).join(",");
  }

  function init() {
    const dock = document.getElementById("listening-player");
    const close = document.getElementById("close-player");
    const host = document.getElementById("player-frame");
    const status = document.getElementById("player-status");
    const link = document.getElementById("player-youtube-link");
    const count = document.getElementById("player-count");
    const heading = document.getElementById("player-mix-name");
    const showQueue = document.getElementById("player-queue-toggle");
    const queuePanel = document.getElementById("queue-panel");
    const queueList = document.getElementById("queue-list");
    const queueDescription = document.getElementById("queue-description");
    const shuffle = document.getElementById("queue-shuffle");
    const popout = document.getElementById("player-popout");
    if ([dock, close, host, status, link, count, heading, showQueue,
      queuePanel, queueList, queueDescription, shuffle].some(x => !x)) return;
    let catalogPromise;
    let requestVersion = 0;
    let queue = [];
    let scope = "all";
    let shuffled = false;
    let playing = false;
    let busy = false;
    let open = false;
    let startAt = 0;
    let selectedIds = null;
    let selectedLabel = MIX_NAMES[scope];
    let launchButton = null;
    let floatingWindow = null;
    let popoutPending = false;
    const dockHome = document.createComment("Player returns here after picture-in-picture");
    dock.before(dockHome);

    // No access to YouTube's cross-origin video element: use the browser's
    // public Document PiP API, or try its native fullscreen-to-PiP path.
    // Reparenting an iframe may reload it; we do not claim position continuity.
    if (popout) popout.addEventListener("click", async () => {
      if (popoutPending) return;
      if (floatingWindow && !floatingWindow.closed) {
        floatingWindow.close();
        return;
      }
      const frame = host.querySelector("iframe");
      if (!frame) {
        status.textContent = "Play a track first, then try pop-out.";
        return;
      }
      const version = requestVersion;
      popoutPending = true;
      try {
        if (window.documentPictureInPicture && window.documentPictureInPicture.requestWindow) {
          const pip = await window.documentPictureInPicture.requestWindow({ width: 440, height: 580 });
          if (version !== requestVersion || dock.hidden) { pip.close(); return; }
          floatingWindow = pip;
          pip.document.title = "Listening Room · Floating player";
          const referrer = pip.document.createElement("meta");
          referrer.name = "referrer";
          referrer.content = "strict-origin-when-cross-origin";
          pip.document.head.append(referrer);
          for (const sheet of document.querySelectorAll('link[rel="stylesheet"]')) {
            const copy = pip.document.createElement("link");
            copy.rel = "stylesheet";
            copy.href = sheet.href;
            pip.document.head.append(copy);
          }
          const style = pip.document.createElement("style");
          style.textContent = "body{margin:0;padding:8px;min-width:240px}.player-dock{position:static;width:100%;max-height:none;margin:0;box-shadow:none}.player-frame iframe{height:240px;min-width:200px;min-height:200px}";
          pip.document.head.append(style);
          pip.addEventListener("pagehide", () => {
            dockHome.after(dock);
            floatingWindow = null;
            popout.textContent = "▣ Try pop-out";
            if (!dock.hidden) {
              status.textContent = "Player returned to this tab. YouTube may restart playback after moving windows.";
              popout.focus();
            }
          }, { once: true });
          pip.document.body.append(dock);
          popout.textContent = "↙ Return to tab";
          status.textContent = "Floating window opened. Keep the original tab open. YouTube may restart playback; press Play inside the video if needed.";
        } else {
          const help = dock.querySelector(".popout-help");
          if (help) help.open = true;
          status.textContent = "Trying fullscreen. Keep the video playing, then go Home to test your browser’s floating player. If it does not float, try YouTube’s own fullscreen control. This is not a confirmed PiP session.";
          if (typeof frame.requestFullscreen === "function") await frame.requestFullscreen();
          else status.textContent = "This browser cannot open a floating window directly. Use the video’s fullscreen or picture-in-picture control, then go Home. See the steps above.";
        }
      } catch (_err) {
        status.textContent = "The browser could not open this player mode. Try YouTube’s fullscreen control, then go Home, or open the recording on YouTube.";
      } finally {
        popoutPending = false;
      }
    });

    function loadCatalog() {
      if (!catalogPromise) catalogPromise = Promise.all([
        "../data/listening-room/songs.json",
        "../data/edco-2026/performances.json",
        "../data/edco-2026/artists.json",
      ].map(async path => {
        const response = await fetch(path, { cache: "no-cache" });
        if (!response.ok) throw new Error("Public catalog unavailable");
        return response.json();
      })).then(([songs, appearances, artists]) => ({
        songs: songs.songs,
        performances: appearances.performances,
        artists: artists.artists,
      })).catch(err => { catalogPromise = null; throw err; });
      return catalogPromise;
    }
    function setBusy(value) {
      busy = value;
      shuffle.disabled = value;
      showQueue.disabled = value;
    }
    function reflectControls() {
      shuffle.setAttribute("aria-pressed", String(shuffled));
      shuffle.title = shuffled ? "Turn shuffle off; restarts current mix" : "Shuffle current mix; restarts current mix";
      showQueue.setAttribute("aria-expanded", String(open));
      showQueue.textContent = open ? "≡ Hide queue" : "≡ Show queue";
      queuePanel.hidden = !open;
      showQueue.hidden = !queue.length;
      heading.textContent = "Listening Room · " + selectedLabel;
      count.textContent = queue.length ? queue.length + " reviewed tracks" : "";
    }
    function renderQueue() {
      const fragment = document.createDocumentFragment();
      queue.forEach((song, i) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "queue-track";
        button.dataset.videoId = song.video_id;
        const title = document.createElement("strong");
        title.textContent = song.title;
        const artist = document.createElement("span");
        artist.textContent = song.artist;
        const number = document.createElement("span");
        number.className = "queue-number";
        number.textContent = String(i + 1).padStart(2, "0");
        button.append(number, title, artist);
        button.setAttribute("aria-label", "Play from track " + (i + 1) + ": " + song.title + " by " + song.artist);
        button.addEventListener("click", () => startPlayback(i));
        item.append(button);
        fragment.append(item);
      });
      queueList.replaceChildren(fragment);
      queueDescription.textContent = queue.length
        ? selectedLabel + " · " + queue.length + " tracks in " +
          (shuffled ? "shuffled" : "list") + " order. YouTube controls playback; this list does not follow its progress."
        : "No reviewed tracks available for this mix.";
    }
    function showDock(wantsQueue) {
      dock.hidden = false;
      if (typeof wantsQueue === "boolean") open = wantsQueue;
      reflectControls();
      dock.focus();
    }
    function startPlayback(i = 0) {
      if (busy || !queue.length) return;
      const url = embedUrl(queue, i);
      if (!url) return;
      // YouTube requires at least a 200 × 200 video viewport; at extreme zoom
      // show the provider link rather than rendering a noncompliant tiny frame.
      if (dock.ownerDocument.defaultView.innerWidth < 240) {
        host.replaceChildren();
        playing = false;
        link.href = "https://www.youtube.com/watch?v=" + queue[i].video_id;
        link.hidden = false;
        status.textContent = "This screen is too narrow for YouTube's video player. Open the selected track on YouTube instead.";
        showDock(open);
        return;
      }
      // Replacing the old iframe stops its audio before loading the chosen mix/track.
      const frame = document.createElement("iframe");
      frame.title = "YouTube video player for " + selectedLabel + " tracks";
      // Document PiP uses about:blank. Supply YouTube's documented client
      // identity as well as the referrer policy for that browser-owned window.
      frame.src = url + "&origin=" + encodeURIComponent(window.location.origin) +
        "&widget_referrer=" + encodeURIComponent(window.location.origin + "/listening-room/");
      frame.width = "420";
      frame.height = "240";
      frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
      frame.setAttribute("allowfullscreen", "");
      frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      host.replaceChildren(frame);
      playing = true;
      startAt = i;
      link.href = "https://www.youtube.com/watch?v=" + queue[i].video_id;
      link.hidden = false;
      status.textContent = "Started queue at track " + (i + 1) + " of " + queue.length +
        ". YouTube manages track changes; the queue display does not track playback position. " +
        "You may need to press play again on mobile.";
      showDock(open);
    }
    async function chooseMix(nextScope, doPlay, requestedIds = selectedIds, requestedLabel = selectedLabel, startId = null) {
      if (busy) return;
      const version = ++requestVersion;
      setBusy(true);
      // Close an existing player immediately so changing mixes never overlaps audio.
      if (doPlay) { host.replaceChildren(); playing = false; link.hidden = true; }
      status.textContent = "Loading " + (requestedLabel || MIX_NAMES[nextScope]) + " tracks…";
      dock.hidden = false;
      try {
        const data = await loadCatalog();
        if (version !== requestVersion) return;
        scope = nextScope;
        selectedIds = Array.isArray(requestedIds) ? new Set(requestedIds) : requestedIds instanceof Set ? requestedIds : null;
        selectedLabel = String(requestedLabel || MIX_NAMES[scope]).slice(0, 64);
        let ordered = buildQueue(data.songs, data.performances, data.artists, scope)
          .filter(song => selectedIds === null || selectedIds.has(song.video_id));
        if (Array.isArray(requestedIds)) {
          const positions = new Map(requestedIds.map((id, i) => [id, i]));
          ordered.sort((a, b) => positions.get(a.video_id) - positions.get(b.video_id));
        }
        queue = shuffled ? shuffleQueue(ordered) : ordered;
        startAt = 0;
        renderQueue();
        reflectControls();
        if (!queue.length) {
          host.replaceChildren();
          playing = false;
          link.hidden = true;
          status.textContent = "No reviewed tracks are available for " + MIX_NAMES[scope] + ".";
        } else if (doPlay) {
          setBusy(false);
          startPlayback(Math.max(0, queue.findIndex(song => song.video_id === startId)));
          return;
        } else {
          status.textContent = "Queue ready. Select a recording to start listening.";
        }
      } catch (_err) {
        if (version !== requestVersion) return;
        host.replaceChildren();
        playing = false;
        link.hidden = true;
        status.textContent = "Couldn’t load the tracks. Check your connection and try again.";
      } finally {
        if (version === requestVersion) setBusy(false);
      }
      showDock(open);
    }

    document.addEventListener("listening-room:play-results", event => {
      const detail = event.detail || {};
      if (!Array.isArray(detail.ids) || !detail.ids.length || busy) return;
      const scopeKey = DAYS.includes(detail.day) ? detail.day : "all";
      launchButton = detail.trigger || document.getElementById("play-filtered");
      chooseMix(scopeKey, true, detail.ids, detail.label || MIX_NAMES[scopeKey], detail.startId);
    });
    shuffle.addEventListener("click", async () => {
      if (busy) return;
      shuffled = !shuffled;
      reflectControls();
      // If already playing, changing order intentionally restarts the chosen mix.
      await chooseMix(scope, playing);
    });
    showQueue.addEventListener("click", () => {
      open = !open;
      reflectControls();
    });
    close.addEventListener("click", () => {
      requestVersion++;
      if (floatingWindow && !floatingWindow.closed) floatingWindow.close();
      setBusy(false);
      host.replaceChildren();
      dock.hidden = true;
      link.hidden = true;
      playing = false;
      startAt = 0;
      open = false;
      reflectControls();
      if (launchButton && launchButton.isConnected) launchButton.focus();
      else document.getElementById("tab-listen").focus();
    });
    reflectControls();
  }
  return { DAYS, MIX_NAMES, buildQueue, shuffleQueue, embedUrl, init };
});
