import assert from "node:assert/strict";
import test from "node:test";
import { DirectoryLimitWarningGate } from "../directoryLimitWarning";

test("warns once for a directory across page loads and refreshes", () => {
  const warnings = new DirectoryLimitWarningGate();

  assert.equal(warnings.shouldWarn("vscode-remote://ssh-remote+cluster/home/user/huge"), true);
  assert.equal(warnings.shouldWarn("vscode-remote://ssh-remote+cluster/home/user/huge"), false);
  assert.equal(warnings.shouldWarn("vscode-remote://ssh-remote+cluster/home/user/other"), true);
});
