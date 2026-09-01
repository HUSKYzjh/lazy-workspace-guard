import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileTypeFromFind, readPosixDirectoryPage } from "../remoteDirectoryPage";

test("maps only real directories to the directory file type", () => {
  assert.equal(fileTypeFromFind("d"), 2);
  assert.equal(fileTypeFromFind("f"), 1);
  assert.equal(fileTypeFromFind("l"), 1);
  assert.equal(fileTypeFromFind("l", "d"), 2);
});

test("includes a direct symbolic link whose target is a directory", { skip: process.platform !== "linux" }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "lazy-workspace-guard-"));
  try {
    await mkdir(join(directory, "target"));
    await symlink("target", join(directory, "linked-target"));

    const page = await readPosixDirectoryPage(directory, 0, 10);
    assert.deepEqual(page.items.find((item) => item.name === "linked-target"), {
      name: "linked-target",
      type: 2,
      isSymbolicLink: true
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("streams a bounded direct directory page on Linux", { skip: process.platform !== "linux" }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "lazy-workspace-guard-"));
  try {
    await Promise.all(["a", "b", "c"].map((name) => writeFile(join(directory, name), name)));
    const first = await readPosixDirectoryPage(directory, 0, 2);
    const second = await readPosixDirectoryPage(directory, first.nextOffset ?? 0, 2);

    assert.equal(first.items.length, 2);
    assert.equal(first.nextOffset, 2);
    assert.equal(second.items.length, 1);
    assert.equal(second.nextOffset, undefined);
    assert.deepEqual(
      new Set([...first.items, ...second.items].map((item) => item.name)),
      new Set(["a", "b", "c"])
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
