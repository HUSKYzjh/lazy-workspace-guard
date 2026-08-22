import assert from "node:assert/strict";
import * as vscode from "vscode";

const extensionId = "hpc-tools.lazy-workspace-guard";
const requiredCommands = [
  "lazyWorkspaceGuard.browseRemoteDirectory",
  "lazyWorkspaceGuard.removeRemoteDirectory",
  "lazyWorkspaceGuard.refresh",
  "lazyWorkspaceGuard.configureSort",
  "lazyWorkspaceGuard.refreshDiagnostics",
  "lazyWorkspaceGuard.resetDiagnostics",
  "lazyWorkspaceGuard.restoreManagedRules",
  "lazyWorkspaceGuard.applyRuleTemplate"
];

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension(extensionId);
  assert.ok(extension, `Extension ${extensionId} must be discoverable.`);

  await extension.activate();
  assert.equal(extension.isActive, true, "Extension must activate successfully.");

  const commands = await vscode.commands.getCommands(true);
  for (const command of requiredCommands) {
    assert.ok(commands.includes(command), `Command ${command} must be registered.`);
  }

  await vscode.commands.executeCommand("lazyWorkspaceGuard.refresh");
  await vscode.commands.executeCommand("lazyWorkspaceGuard.refreshDiagnostics");
  await vscode.commands.executeCommand("lazyWorkspaceGuard.resetDiagnostics");
}
