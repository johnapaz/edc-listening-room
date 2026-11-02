"use strict";
// Optional, user-initiated YouTube playback. No YouTube request until Play all is pressed.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", api.init, { once: true });
    else api.init();
  }
})(typeof self !== "undefined" ? self : this, function () {
  function buildQueue(rows) {
    // Give each credited lead artist a turn before adding their second recording.
    // Stable manifest order, one occurrence per exact reviewed YouTube video ID.
    const groups = new Map();
    const seen = new Set();
    for (const song of rows || []) {
      const id = song && song.video_id;
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(id) ||
          song.url !== "https://www.youtube.com/watch?v=" + id || seen.has(id)) continue;
      const lead = (Array.isArray(song.artist_ids) && song.artist_ids[0]) || song.artist_id;
      if (typeof lead !== "string" || !lead) continue;
      seen.add(id);
      if (!groups.has(lead)) groups.set(lead, []);
      groups.get(lead).push({ video_id: id, title: String(song.title || "Untitled track") });
    }
    const queue = [];
    let remaining = true;
    while (remaining) {
      remaining = false;
      for (const group of groups.values()) {
        if (group.length) {
          queue.push(group.shift());
          remaining = true;
        }
      }
    }
    return queue;
  }

  function embedUrl(queue) {
    if (!queue.length) return null;
    // YouTube's documented playlist parameter plays the remaining video IDs
    // after the first video. This does not create a provider-hosted playlist.
    return "https://www.youtube-nocookie.com/embed/" + queue[0].video_id +
      "?autoplay=1&playsinline=1&playlist=" +
      queue.slice(1).map(s => s.video_id).join(",");
  }

  function init() {
    const play = document.getElementById("play-all");
    const dock = document.getElementById("listening-player");
    const close = document.getElementById("close-player");
    const frameHost = document.getElementById("player-frame");
    const note = document.getElementById("player-status");
    const youtube = document.getElementById("player-youtube-link");
    const count = document.getElementById("player-count");
    if (!play || !dock || !close || !frameHost || !note || !youtube || !count) return;
    let busy = false;
    let active = false;

    play.addEventListener("click", async () => {
      if (active) { dock.focus(); return; }
      if (busy) return;
      busy = true;
      play.disabled = true;
      note.textContent = "Loading the reviewed track queue…";
      dock.hidden = false;
      dock.focus();
      try {
        const response = await fetch("../data/listening-room/songs.json", { cache: "no-cache" });
        if (!response.ok) throw new Error("Catalog unavailable");
        const data = await response.json();
        const queue = buildQueue(data.songs);
        const url = embedUrl(queue);
        if (!url) throw new Error("No reviewed videos available");
        const frame = document.createElement("iframe");
        frame.title = "YouTube playback for the Listening Room reviewed track collection";
        frame.src = url;
        frame.width = "420";
        frame.height = "240";
        frame.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture; fullscreen");
        frame.setAttribute("allowfullscreen", "");
        frame.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        frameHost.replaceChildren(frame);
        youtube.href = "https://www.youtube.com/watch?v=" + queue[0].video_id;
        youtube.hidden = false;
        count.textContent = queue.length + " reviewed tracks";
        note.textContent = "YouTube handles playback and the next track. If playback is blocked, use the YouTube link. Playback may need another tap on phones.";
        active = true;
        play.setAttribute("aria-pressed", "true");
      } catch (_e) {
        frameHost.replaceChildren();
        count.textContent = "Playback unavailable";
        note.textContent = "Couldn’t load the music queue. Check your connection and try Play all again.";
        youtube.hidden = true;
      } finally {
        play.disabled = false;
        busy = false;
      }
    });
    close.addEventListener("click", () => {
      // Removing the iframe stops playback; do not hide an audio-only player.
      frameHost.replaceChildren();
      dock.hidden = true;
      youtube.hidden = true;
      active = false;
      count.textContent = "";
      play.setAttribute("aria-pressed", "false");
      play.focus();
    });
  }
  return { buildQueue, embedUrl, init };
});
