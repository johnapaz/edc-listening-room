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
      remaining.slice(1).map(s => s.video_id).join(",");
  }

  function init() {
    const dock = document.getElementById("listening-player");
    const close = document.getElementById("close-player");
    const host = document.getElementById("player-frame");
    const status = document.getElementById("player-status");
    const link = document.getElementById("player-youtube-link");
    const count = document.getElementById("player-count");
    const heading = document.getElementById("player-mix-name");
    const toggleQueue = document.getElementById("queue-toggle");
    const showQueue = document.getElementById("player-queue-toggle");
    const queuePanel = document.getElementById("queue-panel");
    const queueList = document.getElementById("queue-list");
    const queueDescription = document.getElementById("queue-description");
    const shuffle = document.getElementById("queue-shuffle");
    const playButtons = new Map([
      ["all", document.getElementById("play-all")],
      [DAYS[0], document.getElementById("play-friday")],
      [DAYS[1], document.getElementById("play-saturday")],
      [DAYS[2], document.getElementById("play-sunday")],
    ]);
    if ([dock, close, host, status, link, count, heading, toggleQueue, showQueue,
      queuePanel, queueList, queueDescription, shuffle, ...playButtons.values()].some(x => !x)) return;
    let catalogPromise;
    let queue = [];
    let scope = "all";
    let shuffled = false;
    let playing = false;
    let busy = false;
    let open = false;
    let startAt = 0;

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
      playButtons.forEach(button => { button.disabled = value; });
      toggleQueue.disabled = value;
      shuffle.disabled = value;
    }
    function reflectControls() {
      playButtons.forEach((button, key) => button.setAttribute("aria-pressed", String(playing && key === scope)));
      shuffle.setAttribute("aria-pressed", String(shuffled));
      toggleQueue.setAttribute("aria-expanded", String(open));
      showQueue.setAttribute("aria-expanded", String(open));
      toggleQueue.setAttribute("aria-label", open ? "Hide queue" : "View queue");
      showQueue.textContent = open ? "Hide queue" : "Show queue";
      queuePanel.hidden = !open;
      showQueue.hidden = !queue.length;
      heading.textContent = "Listening Room · " + MIX_NAMES[scope];
      count.textContent = queue.length ? queue.length + " reviewed tracks" : "";
    }
    function renderQueue() {
      const fragment = document.createDocumentFragment();
      queue.forEach((song, i) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "queue-track";
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
        ? MIX_NAMES[scope] + " · " + queue.length + " tracks in " +
          (shuffled ? "shuffled" : "artist-balanced") + " order. YouTube controls playback; this list does not follow its progress."
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
      if (window.innerWidth < 240) {
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
      frame.title = "YouTube video player for " + MIX_NAMES[scope] + " tracks";
      frame.src = url;
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
    async function chooseMix(nextScope, doPlay) {
      if (busy) return;
      setBusy(true);
      // Close an existing player immediately so changing mixes never overlaps audio.
      if (doPlay) { host.replaceChildren(); playing = false; link.hidden = true; }
      status.textContent = "Loading " + MIX_NAMES[nextScope] + " tracks…";
      dock.hidden = false;
      try {
        const data = await loadCatalog();
        scope = nextScope;
        const ordered = buildQueue(data.songs, data.performances, data.artists, scope);
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
          startPlayback();
          return;
        } else {
          status.textContent = "Queue ready. Pick Play all or a festival day to start listening.";
        }
      } catch (_err) {
        host.replaceChildren();
        playing = false;
        link.hidden = true;
        status.textContent = "Couldn’t load the tracks. Check your connection and try again.";
      } finally {
        setBusy(false);
      }
      showDock(open);
    }

    playButtons.forEach((button, key) => {
      button.addEventListener("click", () => {
        if (playing && key === scope) { showDock(open); return; }
        chooseMix(key, true);
      });
    });
    shuffle.addEventListener("click", async () => {
      if (busy) return;
      shuffled = !shuffled;
      reflectControls();
      // If already playing, changing order intentionally restarts the chosen mix.
      await chooseMix(scope, playing);
    });
    toggleQueue.addEventListener("click", async () => {
      if (busy) return;
      if (!queue.length) {
        open = true;
        await chooseMix(scope, false);
      } else {
        open = !open;
        showDock(open);
      }
    });
    showQueue.addEventListener("click", () => {
      open = !open;
      showDock(open);
    });
    close.addEventListener("click", () => {
      host.replaceChildren();
      dock.hidden = true;
      link.hidden = true;
      playing = false;
      startAt = 0;
      open = false;
      reflectControls();
      playButtons.get(scope).focus();
    });
    reflectControls();
  }
  return { DAYS, MIX_NAMES, buildQueue, shuffleQueue, embedUrl, init };
});
