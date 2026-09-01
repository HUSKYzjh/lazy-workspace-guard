import assert from "node:assert/strict";
import test from "node:test";
import { isDirectorySortMode, sortDirectoryItems } from "../directorySort";

const entries = [
  { name: "z-file", isDirectory: false },
  { name: "beta", isDirectory: true },
  { name: "a-file", isDirectory: false },
  { name: "alpha", isDirectory: true }
];

test("keeps server order without sorting", () => {
  assert.deepEqual(sortDirectoryItems(entries, "server").map((entry) => entry.name), [
    "z-file", "beta", "a-file", "alpha"
  ]);
});

test("accepts only persisted directory sort modes", () => {
  assert.equal(isDirectorySortMode("server"), true);
  assert.equal(isDirectorySortMode("nameAscending"), true);
  assert.equal(isDirectorySortMode("invalid"), false);
});

test("sorts directories before files by name in either direction", () => {
  assert.deepEqual(sortDirectoryItems(entries, "nameAscending").map((entry) => entry.name), [
    "alpha", "beta", "a-file", "z-file"
  ]);
  assert.deepEqual(sortDirectoryItems(entries, "nameDescending").map((entry) => entry.name), [
    "beta", "alpha", "z-file", "a-file"
  ]);
});
