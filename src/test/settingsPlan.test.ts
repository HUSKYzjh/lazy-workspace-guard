import assert from "node:assert/strict";
import test from "node:test";
import {
  createExclusionPlan,
  createInclusionPlan,
  hasPlannedChanges,
  serializeExclusionSettings
} from "../settingsPlan";

test("plans only absent exclusion rules and preserves user-owned entries", () => {
  const plan = createExclusionPlan({
    watcherExclude: { "src/**": true, "11_train/**": false },
    searchExclude: { "src/**": true },
    pythonAnalysisExclude: [".venv/**"]
  }, "11_train/**", true);

  assert.deepEqual(plan.after, {
    watcherExclude: { "src/**": true, "11_train/**": false },
    searchExclude: { "src/**": true, "11_train/**": true },
    pythonAnalysisExclude: [".venv/**", "11_train/**"]
  });
  assert.equal(plan.action, "exclude");
  assert.deepEqual(plan.addedRules, {
    watcherExclude: [],
    searchExclude: ["11_train/**"],
    pythonAnalysisExclude: ["11_train/**"]
  });
  assert.equal(hasPlannedChanges(plan), true);
});

test("does not change Python analysis settings unless requested", () => {
  const plan = createExclusionPlan({
    watcherExclude: {},
    searchExclude: {},
    pythonAnalysisExclude: ["existing/**"]
  }, "14_test/**", false);

  assert.deepEqual(plan.after.pythonAnalysisExclude, ["existing/**"]);
  assert.deepEqual(plan.addedRules.pythonAnalysisExclude, []);
});

test("plans inclusion only for rules previously managed by the extension", () => {
  const plan = createInclusionPlan({
    watcherExclude: { "11_train/**": true, "user/**": true },
    searchExclude: { "11_train/**": true },
    pythonAnalysisExclude: ["11_train/**"]
  }, "11_train/**", {
    watcherExclude: ["11_train/**"],
    searchExclude: ["11_train/**"],
    pythonAnalysisExclude: ["11_train/**"],
    originalValues: {
      watcherExclude: { "11_train/**": null },
      searchExclude: { "11_train/**": null },
      pythonAnalysisExclude: { "11_train/**": false }
    }
  });

  assert.deepEqual(plan.after, {
    watcherExclude: { "user/**": true },
    searchExclude: {},
    pythonAnalysisExclude: []
  });
  assert.deepEqual(plan.removedRules, {
    watcherExclude: ["11_train/**"],
    searchExclude: ["11_train/**"],
    pythonAnalysisExclude: ["11_train/**"]
  });
  assert.equal(plan.action, "include");
});

test("serializes a stable, relevant settings diff", () => {
  const text = serializeExclusionSettings({
    watcherExclude: { "z/**": true, "a/**": true },
    searchExclude: {},
    pythonAnalysisExclude: ["z/**", "a/**"]
  });

  assert.equal(text, [
    "{",
    "  \"files.watcherExclude\": {",
    "    \"a/**\": true,",
    "    \"z/**\": true",
    "  },",
    "  \"search.exclude\": {},",
    "  \"python.analysis.exclude\": [",
    "    \"a/**\",",
    "    \"z/**\"",
    "  ]",
    "}",
    ""
  ].join("\n"));
});
