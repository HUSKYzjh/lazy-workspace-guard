import assert from "node:assert/strict";
import test from "node:test";
import { createDirectoryPage } from "../directoryPage";

test("splits an oversized directory into bounded display pages", () => {
  const entries = ["a", "b", "c", "d", "e"];
  assert.deepEqual(createDirectoryPage(entries, 0, 2), { items: ["a", "b"], nextOffset: 2 });
  assert.deepEqual(createDirectoryPage(entries, 2, 2), { items: ["c", "d"], nextOffset: 4 });
  assert.deepEqual(createDirectoryPage(entries, 4, 2), { items: ["e"], nextOffset: undefined });
});

test("normalizes invalid page offsets and limits", () => {
  assert.deepEqual(createDirectoryPage(["a", "b"], -3, 0), { items: ["a"], nextOffset: 1 });
});
