import assert from "node:assert/strict";
import test from "node:test";
import { findTemplateDirectories, ruleTemplates } from "../ruleTemplates";

test("matches only configured top-level directories and ignores files", () => {
  const hpc = ruleTemplates.find((template) => template.id === "hpc");
  assert.ok(hpc);
  assert.deepEqual(
    findTemplateDirectories([
      ["src", 2],
      ["logs", 2],
      ["archive", 2],
      ["output", 1]
    ], hpc),
    ["archive", "logs"]
  );
});
