import assert from "node:assert/strict";
import test from "node:test";
import {
  addArrayRule,
  addBooleanRule,
  removeManagedArrayRules,
  removeManagedBooleanRules,
  toDirectoryGlob
} from "../rules";

test("converts a workspace-relative directory to a glob", () => {
  assert.equal(toDirectoryGlob("11_train\\round_1"), "11_train/round_1/**");
});

test("rejects a workspace root or path outside the workspace", () => {
  assert.throws(() => toDirectoryGlob(""));
  assert.throws(() => toDirectoryGlob("../outside"));
});

test("does not claim a user-owned boolean rule", () => {
  const result = addBooleanRule({ "11_train/**": true }, "11_train/**");
  assert.equal(result.added, false);
  assert.deepEqual(result.rules, { "11_train/**": true });
});

test("removes only managed boolean rules that remain enabled", () => {
  const rules = removeManagedBooleanRules(
    { "11_train/**": true, "14_test/**": false, "src/**": true },
    ["11_train/**", "14_test/**"]
  );
  assert.deepEqual(rules, { "14_test/**": false, "src/**": true });
});

test("adds and restores array-based Python exclusions", () => {
  const added = addArrayRule(["generated/**"], "11_train/**");
  assert.equal(added.added, true);
  assert.deepEqual(
    removeManagedArrayRules(added.rules, ["11_train/**"]),
    ["generated/**"]
  );
});
