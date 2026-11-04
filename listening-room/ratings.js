"use strict";
// Listener-only reactions to reviewed recordings. No account, telemetry or provider writes.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    let storage = null;
    try { storage = root.localStorage; } catch (_err) { /* blocked storage: memory fallback */ }
    root.RoomRatings = api.createStore(storage, (videoId, rating) => {
      document.dispatchEvent(new CustomEvent("listening-room:rating-changed", { detail: { videoId, rating } }));
    });
    root.addEventListener("storage", event => {
      if (event.key === api.STORAGE_KEY) root.RoomRatings.reload();
    });
  }
})(typeof self !== "undefined" ? self : this, function () {
  const STORAGE_KEY = "listening-room-reactions-v1";
  const validId = id => typeof id === "string" && /^[A-Za-z0-9_-]{11}$/.test(id);
  const validRating = value => value === "like" || value === "dislike";
  function createStore(storage, changed) {
    let ratings = Object.create(null);
    function reload() {
      if (!storage) return;
      try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
        const safe = Object.create(null);
        if (parsed && parsed.version === 1 && parsed.ratings && typeof parsed.ratings === "object" && !Array.isArray(parsed.ratings)) {
          for (const [id, rating] of Object.entries(parsed.ratings)) {
            if (validId(id) && validRating(rating)) safe[id] = rating;
          }
        }
        ratings = safe;
      } catch (_err) { /* Malformed or blocked storage: keep available in-memory choices. */ }
    }
    reload();
    function get(id) { return validId(id) ? ratings[id] || null : null; }
    function set(id, rating) {
      if (!validId(id) || (rating !== null && !validRating(rating))) return null;
      if (rating) ratings[id] = rating;
      else delete ratings[id];
      try { storage?.setItem(STORAGE_KEY, JSON.stringify({ version: 1, ratings })); }
      catch (_err) { /* Reactions still work for this page view. */ }
      if (changed) changed(id, rating);
      return rating;
    }
    function toggle(id, rating) {
      if (!validRating(rating)) return get(id);
      return set(id, get(id) === rating ? null : rating);
    }
    return { get, set, toggle, reload };
  }
  return { STORAGE_KEY, validId, createStore };
});
