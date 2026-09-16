import assert from "node:assert/strict";
import test from "node:test";
import {
  isSameOrDescendantResourcePath,
  normalizeNewResourceName,
  prepareResourceMoveCandidates,
  wouldMoveDirectoryIntoDescendant
} from "../resourceMutation";

test("accepts only a single safe resource name", () => {
  assert.equal(normalizeNewResourceName("  result.txt "), "result.txt");
  assert.equal(normalizeNewResourceName("nested/result.txt"), undefined);
  assert.equal(normalizeNewResourceName(".."), undefined);
  assert.equal(normalizeNewResourceName(""), undefined);
  assert.equal(normalizeNewResourceName("bad\0name"), undefined);
});

test("keeps only top-level drag sources and removes no-op moves", () => {
  const candidates = prepareResourceMoveCandidates([
    { path: "/home/user/project/results", isDirectory: true },
    { path: "/home/user/project/results/plot.png", isDirectory: false },
    { path: "/home/user/project/notes.md", isDirectory: false },
    { path: "/home/user/archive/existing.md", isDirectory: false },
    { path: "/home/user/archive/existing.md", isDirectory: false }
  ], "/home/user/archive");

  assert.deepEqual(candidates, [
    { path: "/home/user/project/results", isDirectory: true },
    { path: "/home/user/project/notes.md", isDirectory: false }
  ]);
});

test("rejects a directory drop into itself or a descendant", () => {
  const candidates = [{ path: "/home/user/project/results", isDirectory: true }];
  assert.equal(wouldMoveDirectoryIntoDescendant(candidates, "/home/user/project/results"), true);
  assert.equal(wouldMoveDirectoryIntoDescendant(candidates, "/home/user/project/results/archive"), true);
  assert.equal(wouldMoveDirectoryIntoDescendant(candidates, "/home/user/project/archive"), false);
  assert.equal(isSameOrDescendantResourcePath("/home/user/project/file", "/home/user/project"), true);
  assert.equal(isSameOrDescendantResourcePath("/home/user/project-other", "/home/user/project"), false);
});
