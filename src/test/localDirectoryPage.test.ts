import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readLocalDirectoryPage } from "../localDirectoryPage";

test("streams a bounded local directory page without retaining earlier pages", async () => {
  const directory = await mkdtemp(join(tmpdir(), "lazy-workspace-guard-"));
  try {
    await mkdir(join(directory, "folder"));
    await Promise.all(Array.from({ length: 25 }, (_, index) => writeFile(join(directory, `file-${index}`), "")));

    const first = await readLocalDirectoryPage(directory, 0, 10);
    const second = await readLocalDirectoryPage(directory, first.nextOffset ?? 0, 10);
    const third = await readLocalDirectoryPage(directory, second.nextOffset ?? 0, 10);

    assert.equal(first.items.length, 10);
    assert.equal(first.nextOffset, 10);
    assert.equal(second.items.length, 10);
    assert.equal(second.nextOffset, 20);
    assert.equal(third.items.length, 6);
    assert.equal(third.nextOffset, undefined);
    assert.equal(new Set([...first.items, ...second.items, ...third.items].map((item) => item.name)).size, 26);
    assert.equal(third.items.some((item) => item.name === "folder" && item.type === 2), true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
