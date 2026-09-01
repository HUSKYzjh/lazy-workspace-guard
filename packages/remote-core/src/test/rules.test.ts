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

test("rejects directory names that would broaden a glob exclusion", () => {
  assert.throws(() => toDirectoryGlob("results[*]"));
  assert.throws(() => toDirectoryGlob("runs?"));
  assert.throws(() => toDirectoryGlob("{training,testing}"));
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

test("restores a saved boolean value instead of deleting it", () => {
  const rules = removeManagedBooleanRules(
    { "11_train/**": true },
    ["11_train/**"],
    { "11_train/**": false }
  );
  assert.deepEqual(rules, { "11_train/**": false });
});

test("adds and restores array-based Python exclusions", () => {
  const added = addArrayRule(["generated/**"], "11_train/**");
  assert.equal(added.added, true);
  assert.deepEqual(
    removeManagedArrayRules(added.rules, ["11_train/**"]),
    ["generated/**"]
  );
});

test("keeps an array rule that existed before the plugin change", () => {
  assert.deepEqual(
    removeManagedArrayRules(["existing/**", "plugin/**"], ["existing/**", "plugin/**"], { "existing/**": true, "plugin/**": false }),
    ["existing/**"]
  );
});
