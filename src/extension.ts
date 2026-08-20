import * as vscode from "vscode";
import { LazyExplorerProvider } from "./lazyExplorer";
import type { ExplorerNode } from "./lazyExplorer";
import { SettingsManager } from "./settingsManager";

export function activate(context: vscode.ExtensionContext): void {
  const provider = new LazyExplorerProvider();
  const settingsManager = new SettingsManager(context.workspaceState);

  context.subscriptions.push(
    provider,
    vscode.window.registerTreeDataProvider("lazyWorkspaceGuard.explorer", provider),
    vscode.commands.registerCommand("lazyWorkspaceGuard.openResource", async (node: ExplorerNode) => {
      const document = await vscode.workspace.openTextDocument(node.uri);
      await vscode.window.showTextDocument(document, { preview: true });
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.refresh", (node?: ExplorerNode) => provider.refresh(node)),
    vscode.commands.registerCommand("lazyWorkspaceGuard.excludeFromWatchers", async (node: ExplorerNode) => {
      if (!node || (node.kind !== "folder" && node.kind !== "workspaceFolder")) {
        void vscode.window.showErrorMessage("Select a workspace subfolder to exclude.");
        return;
      }
      try {
        const glob = await settingsManager.excludeFolder(node.uri);
        void vscode.window.showInformationMessage(
          `Added ${glob} to managed watcher and search exclusions. Reload the window to rebuild VS Code watchers.`
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(`Lazy Workspace Guard: ${message}`);
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.restoreManagedRules", async () => {
      const choice = await vscode.window.showWarningMessage(
        "Remove all watcher, search, and optional Python exclusions managed by Lazy Workspace Guard?",
        { modal: true },
        "Restore"
      );
      if (choice !== "Restore") {
        return;
      }
      const removed = await settingsManager.restoreManagedRules();
      void vscode.window.showInformationMessage(
        `Removed ${removed} managed exclusion entries. Reload the window to rebuild VS Code watchers.`
      );
    })
  );
}

export function deactivate(): void {}
