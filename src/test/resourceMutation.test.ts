import assert from "node:assert/strict";
import test from "node:test";
import { normalizeNewResourceName } from "../resourceMutation";

test("accepts only a single safe resource name", () => {
  assert.equal(normalizeNewResourceName("  result.txt "), "result.txt");
  assert.equal(normalizeNewResourceName("nested/result.txt"), undefined);
  assert.equal(normalizeNewResourceName(".."), undefined);
  assert.equal(normalizeNewResourceName(""), undefined);
  assert.equal(normalizeNewResourceName("bad\0name"), undefined);
});
