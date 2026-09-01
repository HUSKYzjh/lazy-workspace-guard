import * as vscode from "vscode";
import { mkdir, open } from "node:fs/promises";
import { hostname } from "node:os";
import { posix } from "node:path";
import { DiagnosticsProvider } from "./diagnostics";
import { t } from "./i18n";
import { LazyExplorerProvider } from "./lazyExplorer";
import type { ExplorerNode } from "./lazyExplorer";
import { isDirectorySortMode, type DirectorySortMode } from "./directorySort";
import { LazyTreeMetrics } from "./metrics";
import { readPosixDirectoryPage } from "./remoteDirectoryPage";
import { normalizeNewResourceName } from "./resourceMutation";
import { openResourceWithDefaultEditor, openResourceWithEditorPicker, type ExecuteCommand } from "./resourceOpen";
import {
  getRemoteScopedStorageKey,
  getSshCommand,
  getSshCommandForHost,
  normalizeSshHostAlias
} from "./remoteIdentity";
import { findTemplateDirectories, ruleTemplates, type RuleTemplate } from "./ruleTemplates";
import { SettingsManager } from "./settingsManager";
import { SettingsPreviewProvider } from "./settingsPreview";
import {
  canStartSafeRemoteBrowse,
  getRemoteDirectoryCompletionContext,
  normalizeSafeRemoteDirectoryPath,
  restoreSafeRemoteDirectoryPaths,
  supportsSafeRemoteBackend
} from "./safeRoots";

const maximumRemoteDirectoryCompletions = 100;
const maximumClipboardTextBytes = 1024 * 1024;
const safeRemoteDirectoryStorageKey = "safeRemoteDirectoryPaths";
const directorySortModeStorageKey = "directorySortMode";
const sshHostAliasStorageKey = "sshHostAlias";
const sshBridgeCopyProfileCommand = "lazyWorkspaceGuardSshBridge.copyProfile";

interface RemoteDirectoryPick extends vscode.QuickPickItem {
  pickKind: "browse" | "directory" | "message";
  directoryPath?: string;
}

interface DirectorySortPick extends vscode.QuickPickItem {
  sortMode: DirectorySortMode;
}

export function activate(context: vscode.ExtensionContext): void {
  const metrics = new LazyTreeMetrics();
  const remoteMachineName = hostname();
  const safeRemoteDirectoryStorageScope = getRemoteScopedStorageKey(
    safeRemoteDirectoryStorageKey,
    vscode.env.remoteName,
    remoteMachineName
  );
  const directorySortModeStorageScope = getRemoteScopedStorageKey(
    directorySortModeStorageKey,
    vscode.env.remoteName,
    remoteMachineName
  );
  const sshHostAliasStorageScope = getRemoteScopedStorageKey(
    sshHostAliasStorageKey,
    vscode.env.remoteName,
    remoteMachineName
  );
  const canRestoreSafeRoots = canStartSafeRemoteBrowse(
    vscode.env.remoteName,
    vscode.workspace.workspaceFolders?.length ?? 0
  ) && supportsSafeRemoteBackend(process.platform);
  const savedSortMode = context.globalState.get<unknown>(directorySortModeStorageScope);
  const provider = new LazyExplorerProvider(
    metrics,
    canRestoreSafeRoots
      ? restoreSafeRemoteDirectoryPaths(context.globalState.get<unknown>(safeRemoteDirectoryStorageScope)).map((path) => vscode.Uri.file(path))
      : [],
    isDirectorySortMode(savedSortMode) ? savedSortMode : "server"
  );
  const settingsManager = new SettingsManager(context.workspaceState);
  const diagnosticsProvider = new DiagnosticsProvider(metrics, () => settingsManager.getManagedRuleCount());
  const settingsPreviewProvider = new SettingsPreviewProvider();
  const executeCommand: ExecuteCommand = (command, ...arguments_) => vscode.commands.executeCommand(command, ...arguments_);
  let comparisonSource: vscode.Uri | undefined;
  void vscode.commands.executeCommand("setContext", "lazyWorkspaceGuard.hasCompareSource", false);

  context.subscriptions.push(
    provider,
    diagnosticsProvider,
    settingsPreviewProvider,
    vscode.window.registerTreeDataProvider("lazyWorkspaceGuard.explorer", provider),
    vscode.window.registerTreeDataProvider("lazyWorkspaceGuard.diagnostics", diagnosticsProvider),
    vscode.workspace.registerTextDocumentContentProvider("lazy-workspace-guard-settings", settingsPreviewProvider),
    vscode.commands.registerCommand("lazyWorkspaceGuard.openResource", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      await openResourceWithDefaultEditor(executeCommand, node.uri, { preview: true });
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.openResourceToSide", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      await openResourceWithDefaultEditor(executeCommand, node.uri, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside
      });
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.openResourceWith", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      await openResourceWithEditorPicker(executeCommand, node.uri);
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.selectResourceForCompare", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      comparisonSource = node.uri;
      await vscode.commands.executeCommand("setContext", "lazyWorkspaceGuard.hasCompareSource", true);
      void vscode.window.showInformationMessage(t("compareSourceSelected", node.uri.path));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.compareResourceWithSelected", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file" || !comparisonSource) {
        return;
      }
      if (comparisonSource.toString() === node.uri.toString()) {
        void vscode.window.showWarningMessage(t("compareSameResource"));
        return;
      }
      const left = comparisonSource;
      comparisonSource = undefined;
      await vscode.commands.executeCommand("setContext", "lazyWorkspaceGuard.hasCompareSource", false);
      await vscode.commands.executeCommand("vscode.diff", left, node.uri, t("compareTitle", left.path, node.uri.path));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.openResourceTimeline", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      try {
        await vscode.commands.executeCommand("workbench.action.openTimeline", node.uri);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copyResourceContents", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      try {
        const bytes = await vscode.workspace.fs.readFile(node.uri);
        if (bytes.byteLength > maximumClipboardTextBytes) {
          void vscode.window.showWarningMessage(t("clipboardContentTooLarge", maximumClipboardTextBytes / 1024));
          return;
        }
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        await vscode.env.clipboard.writeText(text);
        void vscode.window.showInformationMessage(t("resourceContentsCopied", bytes.byteLength));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copyResourceName", async (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      await copyResourceValue(posix.basename(node.uri.path), t("resourceNameLabel"));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.openResourceTerminal", (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      const directoryUri = node.kind === "file"
        ? node.uri.with({ path: posix.dirname(node.uri.path) })
        : node.uri;
      const terminal = vscode.window.createTerminal({
        name: t("terminalName", posix.basename(directoryUri.path) || "/"),
        cwd: directoryUri
      });
      terminal.show();
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.showResourceProperties", async (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      try {
        const stat = await vscode.workspace.fs.stat(node.uri);
        void vscode.window.showInformationMessage(
          t("resourceProperties", node.uri.path, formatResourceSize(stat.size), new Date(stat.mtime).toLocaleString())
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.createResourceFile", async (node: ExplorerNode) => {
      const target = await pickNewResourceUri(node, t("newFileTitle"));
      if (!target) {
        return;
      }
      try {
        const handle = await open(target.fsPath, "wx");
        await handle.close();
        provider.refresh(node);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.createResourceDirectory", async (node: ExplorerNode) => {
      const target = await pickNewResourceUri(node, t("newFolderTitle"));
      if (!target) {
        return;
      }
      try {
        await mkdir(target.fsPath);
        provider.refresh(node);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.renameResource", async (node: ExplorerNode) => {
      if (!canMutateExistingResource(node)) {
        return;
      }
      const name = await pickResourceName(t("renameTitle"), posix.basename(node.uri.path));
      if (!name || name === posix.basename(node.uri.path)) {
        return;
      }
      try {
        const destination = vscode.Uri.joinPath(node.uri.with({ path: posix.dirname(node.uri.path) }), name);
        await vscode.workspace.fs.rename(node.uri, destination, { overwrite: false });
        provider.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.deleteResource", async (node: ExplorerNode) => {
      if (!canMutateExistingResource(node)) {
        return;
      }
      const choice = await vscode.window.showWarningMessage(
        t("deleteResourcePrompt", node.uri.path),
        { modal: true },
        t("deleteResourceConfirm")
      );
      if (choice !== t("deleteResourceConfirm")) {
        return;
      }
      try {
        await vscode.workspace.fs.delete(node.uri, {
          recursive: node.kind === "folder",
          useTrash: true
        });
        provider.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copyResourcePath", async (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      await copyResourceValue(node.uri.path, t("remotePathLabel"));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copyResourceRelativePath", async (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      await copyResourceValue(getResourceRelativePath(node.uri, provider), t("relativePathLabel"));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copyResourceUri", async (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      await copyResourceValue(getRemoteResourceUri(node.uri), t("remoteUriLabel"));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copySshLocation", async (node: ExplorerNode) => {
      if (!node) {
        return;
      }
      const bridgedAlias = await copySshCommandUsingLocalBridge(remoteMachineName, "ssh");
      if (bridgedAlias) {
        try {
          await context.globalState.update(sshHostAliasStorageScope, bridgedAlias);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(t("sshCommandPersistenceError", message));
        }
        return;
      }
      const sshCommand = await getCurrentRemoteSshCommand(context.globalState, sshHostAliasStorageScope);
      if (sshCommand) {
        await copyResourceValue(sshCommand, t("sshCommandLabel"));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.copySshDownloadCommand", async (node: ExplorerNode) => {
      if (!node || node.kind !== "file") {
        return;
      }
      const bridgedAlias = await copySshCommandUsingLocalBridge(remoteMachineName, "download", node.uri.path);
      if (bridgedAlias) {
        try {
          await context.globalState.update(sshHostAliasStorageScope, bridgedAlias);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          void vscode.window.showErrorMessage(t("sshCommandPersistenceError", message));
        }
        return;
      }
      const sshCommand = await getCurrentRemoteSshCommand(context.globalState, sshHostAliasStorageScope);
      if (sshCommand) {
        const alias = sshCommand.slice("ssh ".length);
        await copyResourceValue(`scp \"${alias}:${node.uri.path}\" .`, t("sshDownloadCommandLabel"));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.browseRemoteDirectory", async () => {
      const workspaceFolderCount = vscode.workspace.workspaceFolders?.length ?? 0;
      if (!canStartSafeRemoteBrowse(vscode.env.remoteName, workspaceFolderCount)) {
        if (workspaceFolderCount > 0) {
          void vscode.window.showErrorMessage(t("safeRootEmptyWindowOnly"));
          return;
        }
        void vscode.window.showErrorMessage(t("safeRootRemoteOnly"));
        return;
      }
      if (!supportsSafeRemoteBackend(process.platform)) {
        void vscode.window.showErrorMessage(t("safeRootLinuxOnly"));
        return;
      }
      const directoryPath = await pickSafeRemoteDirectory();
      if (!directoryPath) {
        return;
      }
      const root = vscode.Uri.file(directoryPath);
      if (!provider.addSafeRoot(root)) {
        void vscode.window.showInformationMessage(t("safeRootAlreadyAdded"));
        return;
      }
      try {
        await persistSafeRemoteDirectories(context.globalState, provider, safeRemoteDirectoryStorageScope);
        void vscode.window.showInformationMessage(t("safeRootAdded"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("safeRootPersistenceError", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.removeRemoteDirectory", async (node: ExplorerNode) => {
      if (!node || node.kind !== "safeRoot" || !provider.removeSafeRoot(node.uri)) {
        return;
      }
      try {
        await persistSafeRemoteDirectories(context.globalState, provider, safeRemoteDirectoryStorageScope);
        void vscode.window.showInformationMessage(t("safeRootRemoved"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("safeRootPersistenceError", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.refresh", (node?: ExplorerNode) => provider.refresh(node)),
    vscode.commands.registerCommand("lazyWorkspaceGuard.configureSort", async () => {
      const sortMode = provider.getSortMode();
      const choice = await vscode.window.showQuickPick<DirectorySortPick>([
        {
          label: t("sortModeServer"),
          description: sortMode === "server" ? t("sortModeCurrent") : undefined,
          detail: t("sortModeServerDetail"),
          sortMode: "server"
        },
        {
          label: t("sortModeNameAscending"),
          description: sortMode === "nameAscending" ? t("sortModeCurrent") : undefined,
          detail: t("sortModePageOnlyDetail"),
          sortMode: "nameAscending"
        },
        {
          label: t("sortModeNameDescending"),
          description: sortMode === "nameDescending" ? t("sortModeCurrent") : undefined,
          detail: t("sortModePageOnlyDetail"),
          sortMode: "nameDescending"
        }
      ], {
        title: t("sortDialogTitle"),
        placeHolder: t("sortDialogPlaceholder")
      });
      if (!choice) {
        return;
      }
      provider.setSortMode(choice.sortMode);
      try {
        await context.globalState.update(directorySortModeStorageScope, choice.sortMode);
        void vscode.window.showInformationMessage(t("sortModeChanged", choice.label));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("sortPersistenceError", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.excludeFromWatchers", async (node: ExplorerNode) => {
      if (!node || node.usesSafeRemoteBrowsing || (node.kind !== "folder" && node.kind !== "workspaceFolder")) {
        void vscode.window.showErrorMessage(t("selectWorkspaceSubfolder"));
        return;
      }
      try {
        const plan = settingsManager.planExclusion(node.uri);
        if (!settingsManager.hasChanges(plan)) {
          void vscode.window.showInformationMessage(t("exclusionNoChanges"));
          return;
        }
        await settingsPreviewProvider.show(plan.plan);
        const choice = await vscode.window.showWarningMessage(
          t("exclusionPreviewPrompt", plan.plan.glob),
          { modal: true },
          t("apply")
        );
        if (choice !== t("apply")) {
          return;
        }
        const glob = await settingsManager.applyRulePlan(plan);
        void vscode.window.showInformationMessage(
          t("exclusionAdded", glob)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.restoreManagedRules", async () => {
      const choice = await vscode.window.showWarningMessage(
        t("restoreQuestion"),
        { modal: true },
        t("restore")
      );
      if (choice !== t("restore")) {
        return;
      }
      try {
        const removed = await settingsManager.restoreManagedRules();
        void vscode.window.showInformationMessage(
          t("exclusionsRemoved", removed)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.refreshDiagnostics", () => diagnosticsProvider.refresh()),
    vscode.commands.registerCommand("lazyWorkspaceGuard.resetDiagnostics", () => {
      diagnosticsProvider.reset();
      void vscode.window.showInformationMessage(t("diagnosticsReset"));
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.applyRuleTemplate", async () => {
      const workspaceFolder = await pickWorkspaceFolder();
      if (!workspaceFolder) {
        return;
      }
      const template = await pickRuleTemplate();
      if (!template) {
        return;
      }
      try {
        const entries = await vscode.workspace.fs.readDirectory(workspaceFolder.uri);
        const directories = findTemplateDirectories(entries, template);
        if (directories.length === 0) {
          void vscode.window.showInformationMessage(t("templateNoMatches", t(`template${template.id}`)));
          return;
        }
        const globs = directories.map((directory) => `${directory}/**`);
        const plan = settingsManager.planExclusionGlobs(workspaceFolder.uri, globs);
        if (!settingsManager.hasChanges(plan)) {
          void vscode.window.showInformationMessage(t("exclusionNoChanges"));
          return;
        }
        await settingsPreviewProvider.show(plan.plan);
        const choice = await vscode.window.showWarningMessage(
          t("templatePreviewPrompt", t(`template${template.id}`), directories.length),
          { modal: true },
          t("apply")
        );
        if (choice !== t("apply")) {
          return;
        }
        await settingsManager.applyRulePlan(plan);
        void vscode.window.showInformationMessage(t("templateApplied", directories.length));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.includeFolder", async (node: ExplorerNode) => {
      if (!node || node.usesSafeRemoteBrowsing || (node.kind !== "folder" && node.kind !== "workspaceFolder")) {
        void vscode.window.showErrorMessage(t("selectWorkspaceSubfolder"));
        return;
      }
      try {
        const plan = settingsManager.planInclusion(node.uri);
        if (!settingsManager.hasChanges(plan)) {
          void vscode.window.showInformationMessage(t("inclusionNoChanges"));
          return;
        }
        await settingsPreviewProvider.show(plan.plan);
        const choice = await vscode.window.showWarningMessage(
          t("inclusionPreviewPrompt", plan.plan.glob),
          { modal: true },
          t("apply")
        );
        if (choice !== t("apply")) {
          return;
        }
        const glob = await settingsManager.applyRulePlan(plan);
        void vscode.window.showInformationMessage(t("inclusionApplied", glob));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    }),
    vscode.commands.registerCommand("lazyWorkspaceGuard.exportDiagnostics", async () => {
      const defaultUri = vscode.workspace.workspaceFolders?.[0]
        ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, "lazy-workspace-guard-diagnostics.json")
        : undefined;
      const destination = await vscode.window.showSaveDialog({
        defaultUri,
        filters: { JSON: ["json"] },
        saveLabel: t("exportDiagnostics")
      });
      if (!destination) {
        return;
      }
      try {
        const report = `${JSON.stringify(diagnosticsProvider.createReport(), null, 2)}\n`;
        await vscode.workspace.fs.writeFile(destination, new TextEncoder().encode(report));
        void vscode.window.showInformationMessage(t("diagnosticsExported"));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(t("errorPrefix", message));
      }
    })
  );
}

export function deactivate(): void {}

async function persistSafeRemoteDirectories(
  storage: vscode.Memento,
  provider: LazyExplorerProvider,
  storageKey: string
): Promise<void> {
  const paths = restoreSafeRemoteDirectoryPaths(provider.getSafeRootUris().map((uri) => uri.path));
  await storage.update(storageKey, paths);
}

async function getCurrentRemoteSshCommand(
  storage: vscode.Memento,
  storageKey: string
): Promise<string | undefined> {
  const automaticCommand = getSshCommand(vscode.env.remoteName);
  if (automaticCommand) {
    return automaticCommand;
  }

  const storedAlias = storage.get<unknown>(storageKey);
  const storedCommand = getSshCommandForHost(typeof storedAlias === "string" ? storedAlias : undefined);
  if (storedCommand) {
    return storedCommand;
  }

  const input = await vscode.window.showInputBox({
    title: t("sshCommandHostTitle"),
    prompt: t("sshCommandHostPrompt"),
    placeHolder: t("sshCommandHostPlaceholder"),
    validateInput: (value) => normalizeSshHostAlias(value) ? undefined : t("sshCommandHostInvalid")
  });
  const alias = normalizeSshHostAlias(input);
  if (!alias) {
    return undefined;
  }
  try {
    await storage.update(storageKey, alias);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(t("sshCommandPersistenceError", message));
  }
  return getSshCommandForHost(alias);
}

interface SshBridgeProfile {
  alias: string;
}

async function copySshCommandUsingLocalBridge(
  remoteMachineName: string,
  action: "ssh" | "download",
  remotePath?: string
): Promise<string | undefined> {
  try {
    const result = await vscode.commands.executeCommand<unknown>(sshBridgeCopyProfileCommand, {
      remoteMachineName,
      action,
      remotePath
    });
    return isSshBridgeProfile(result) ? result.alias : undefined;
  } catch {
    // The bridge is optional. A manual alias prompt remains available when it
    // has not been installed on the local VS Code client.
    return undefined;
  }
}

function isSshBridgeProfile(value: unknown): value is SshBridgeProfile {
  if (!value || typeof value !== "object") {
    return false;
  }
  const profile = value as { alias?: unknown };
  return normalizeSshHostAlias(typeof profile.alias === "string" ? profile.alias : undefined) !== undefined;
}

async function pickNewResourceUri(node: ExplorerNode | undefined, title: string): Promise<vscode.Uri | undefined> {
  if (!canCreateResourceIn(node)) {
    return undefined;
  }
  const name = await pickResourceName(title);
  return name ? vscode.Uri.joinPath(node.uri, name) : undefined;
}

function canCreateResourceIn(node: ExplorerNode | undefined): node is ExplorerNode {
  if (!node || node.uri.scheme !== "file") {
    void vscode.window.showErrorMessage(t("resourceMutationFileOnly"));
    return false;
  }
  if (node.kind === "safeRoot" || node.kind === "workspaceFolder" || node.kind === "folder") {
    return true;
  }
  void vscode.window.showErrorMessage(t("resourceMutationFolderOnly"));
  return false;
}

function canMutateExistingResource(node: ExplorerNode | undefined): node is ExplorerNode {
  if (!node || node.uri.scheme !== "file") {
    void vscode.window.showErrorMessage(t("resourceMutationFileOnly"));
    return false;
  }
  if (node.kind === "folder" || node.kind === "file") {
    return true;
  }
  void vscode.window.showErrorMessage(t("resourceMutationRootProtected"));
  return false;
}

async function pickResourceName(title: string, value?: string): Promise<string | undefined> {
  const raw = await vscode.window.showInputBox({
    title,
    value,
    prompt: t("resourceNamePrompt"),
    validateInput: (candidate) => normalizeNewResourceName(candidate) ? undefined : t("resourceNameInvalid")
  });
  return raw === undefined ? undefined : normalizeNewResourceName(raw);
}

async function copyResourceValue(value: string, label: string): Promise<void> {
  try {
    await vscode.env.clipboard.writeText(value);
    void vscode.window.showInformationMessage(t("resourceValueCopied", label, value));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    void vscode.window.showErrorMessage(t("errorPrefix", message));
  }
}

function getResourceRelativePath(uri: vscode.Uri, provider: LazyExplorerProvider): string {
  const roots = [
    ...provider.getSafeRootUris(),
    ...(vscode.workspace.workspaceFolders ?? []).map((folder) => folder.uri)
  ]
    .filter((root) => uri.scheme === root.scheme && isSameOrDescendantPath(uri.path, root.path))
    .sort((left, right) => right.path.length - left.path.length);
  return roots[0] ? posix.relative(roots[0].path, uri.path) || "." : uri.path;
}

function isSameOrDescendantPath(path: string, parentPath: string): boolean {
  const normalizedParent = parentPath === "/" ? parentPath : parentPath.replace(/\/+$/, "");
  return path === normalizedParent || path.startsWith(`${normalizedParent}/`);
}

function getRemoteResourceUri(uri: vscode.Uri): string {
  const authority = vscode.env.remoteName;
  return authority
    ? vscode.Uri.from({ scheme: "vscode-remote", authority, path: uri.path }).toString()
    : uri.toString();
}

function formatResourceSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

async function pickSafeRemoteDirectory(): Promise<string | undefined> {
  return new Promise((resolve) => {
    const picker = vscode.window.createQuickPick<RemoteDirectoryPick>();
    const disposables: vscode.Disposable[] = [];
    let completed = false;
    let requestId = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (directoryPath: string | undefined): void => {
      if (completed) {
        return;
      }
      completed = true;
      picker.hide();
      resolve(directoryPath);
    };

    const updateSuggestions = async (value: string): Promise<void> => {
      const currentRequest = ++requestId;
      const context = getRemoteDirectoryCompletionContext(value);
      if (!context) {
        picker.items = [{ label: t("safeRootAutocompleteInvalid"), pickKind: "message", alwaysShow: true }];
        return;
      }

      picker.busy = true;
      try {
        const page = await readPosixDirectoryPage(context.parentPath, 0, maximumRemoteDirectoryCompletions);
        if (currentRequest !== requestId) {
          return;
        }
        const prefix = context.prefix.toLocaleLowerCase();
        const directories = page.items
          .filter((entry) => entry.type === vscode.FileType.Directory)
          .filter((entry) => entry.name.toLocaleLowerCase().startsWith(prefix))
          .sort((left, right) => left.name.localeCompare(right.name))
          .map<RemoteDirectoryPick>((entry) => {
            const directoryPath = posix.join(context.parentPath, entry.name);
            return {
              label: `$(folder) ${entry.name}`,
              description: entry.isSymbolicLink ? t("safeRootAutocompleteSymbolicLinkDirectory") : undefined,
              pickKind: "directory",
              directoryPath,
              // Quick Pick would otherwise filter `zhaijiahui` against `/home/`
              // and hide it. This extension already applies the path-prefix filter.
              alwaysShow: true
            };
          });
        const normalizedValue = normalizeSafeRemoteDirectoryPath(value);
        const items: RemoteDirectoryPick[] = normalizedValue
          ? [{
            label: t("safeRootAutocompleteBrowse", normalizedValue),
            description: t("safeRootAutocompleteBrowseDescription"),
            pickKind: "browse",
            directoryPath: normalizedValue,
            alwaysShow: true
          }]
          : [];
        if (directories.length === 0) {
          items.push({ label: t("safeRootAutocompleteNoMatches"), pickKind: "message", alwaysShow: true });
        } else {
          items.push(...directories);
        }
        if (page.nextOffset !== undefined) {
          items.push({ label: t("safeRootAutocompleteMore", maximumRemoteDirectoryCompletions), pickKind: "message", alwaysShow: true });
        }
        picker.items = items;
      } catch (error) {
        if (currentRequest === requestId) {
          const message = error instanceof Error ? error.message : String(error);
          picker.items = [{ label: t("safeRootAutocompleteReadError", message), pickKind: "message", alwaysShow: true }];
        }
      } finally {
        if (currentRequest === requestId) {
          picker.busy = false;
        }
      }
    };

    disposables.push(
      picker.onDidChangeValue((value) => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => void updateSuggestions(value), 150);
      }),
      picker.onDidAccept(() => {
        const selected = picker.activeItems[0];
        if (selected?.pickKind === "directory" && selected.directoryPath) {
          picker.value = `${selected.directoryPath}/`;
          return;
        }
        const directoryPath = normalizeSafeRemoteDirectoryPath(picker.value);
        if (selected?.pickKind === "browse" && directoryPath) {
          finish(directoryPath);
        }
      }),
      picker.onDidHide(() => {
        if (!completed) {
          completed = true;
          resolve(undefined);
        }
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        for (const disposable of disposables) {
          disposable.dispose();
        }
        picker.dispose();
      })
    );

    picker.title = t("safeRootDialogTitle");
    picker.placeholder = t("safeRootPlaceholder");
    picker.prompt = t("safeRootAutocompletePrompt", maximumRemoteDirectoryCompletions);
    picker.matchOnDescription = true;
    picker.matchOnDetail = true;
    picker.show();
    void updateSuggestions("");
  });
}

async function pickWorkspaceFolder(): Promise<vscode.WorkspaceFolder | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  if (folders.length === 1) {
    return folders[0];
  }
  const choice = await vscode.window.showQuickPick(
    folders.map((folder) => ({ label: folder.name, folder })),
    { title: t("templateSelectWorkspace") }
  );
  return choice?.folder;
}

async function pickRuleTemplate(): Promise<RuleTemplate | undefined> {
  const choice = await vscode.window.showQuickPick(
    ruleTemplates.map((template) => ({
      label: t(`template${template.id}`),
      description: template.directoryNames.join(", "),
      template
    })),
    { title: t("templateSelect") }
  );
  return choice?.template;
}
