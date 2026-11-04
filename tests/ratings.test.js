"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { STORAGE_KEY, createStore } = require("../listening-room/ratings.js");

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), values };
}
const ID = "xk9pQ2fTmA_";

test("reactions are mutually exclusive and toggle back to neutral across store instances", () => {
  const storage = memoryStorage(), notices = [];
  const store = createStore(storage, (id, rating) => notices.push([id, rating]));
  assert.equal(store.get(ID), null);
  assert.equal(store.toggle(ID, "like"), "like");
  assert.equal(store.toggle(ID, "dislike"), "dislike");
  assert.equal(store.toggle(ID, "dislike"), null);
  assert.deepEqual(notices, [[ID, "like"], [ID, "dislike"], [ID, null]]);
  store.toggle(ID, "like");
  assert.equal(createStore(storage).get(ID), "like");
  assert.equal(JSON.parse(storage.values.get(STORAGE_KEY)).version, 1);
});

test("storage errors, corrupted data and invalid IDs do not crash", () => {
  const blocked = { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); } };
  const store = createStore(blocked);
  assert.equal(store.toggle(ID, "like"), "like");
  assert.equal(store.get(ID), "like");
  assert.equal(store.toggle("../escape", "dislike"), null);
  const storage = memoryStorage();
  storage.values.set(STORAGE_KEY, "{bad");
  assert.equal(createStore(storage).get(ID), null);
  storage.values.set(STORAGE_KEY, JSON.stringify({ version: 1, ratings: { [ID]: "invalid", "bad": "like" } }));
  assert.equal(createStore(storage).get(ID), null);
});

test("same video ID shares one rating regardless of collaborations", () => {
  const store = createStore(memoryStorage());
  store.set(ID, "like");
  assert.equal(store.get(ID), "like");
  store.set(ID, null);
  assert.equal(store.get(ID), null);
});
