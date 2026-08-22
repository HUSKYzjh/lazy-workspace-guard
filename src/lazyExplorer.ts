import * as vscode from "vscode";
import { createDirectoryPage } from "./directoryPage";
import { sortDirectoryItems, type DirectorySortMode } from "./directorySort";
import { t } from "./i18n";
import type { LazyTreeMetrics } from "./metrics";
import { readPosixDirectoryPage } from "./remoteDirectoryPage";
import { addSafeRoot, removeSafeRoot } from "./safeRoots";

export type ExplorerNodeKind = "workspaceFolder" | "safeRoot" | "folder" | "file" | "error" | "loadMore";

export class ExplorerNode extends vscode.TreeItem {
  public constructor(
    public readonly uri: vscode.Uri,
    public readonly kind: ExplorerNodeKind,
    label?: string,
    public readonly offset = 0,
    description?: string,
    public readonly usesSafeRemoteBrowsing = false,
    public readonly isSymbolicLink = false
  ) {
    super(label ?? (vscode.workspace.asRelativePath(uri, false) || uri.path), ExplorerNode.collapsibleState(kind));
    this.resourceUri = uri;
    this.contextValue = kind === "folder" && usesSafeRemoteBrowsing
      ? "resourceSafeRemoteFolder"
      : `resource${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
    this.description = description;
    this.tooltip = getExplorerNodeTooltip(kind, uri, description, usesSafeRemoteBrowsing, isSymbolicLink);

    if (kind === "file") {
      this.command = {
        command: "lazyWorkspaceGuard.openResource",
        title: t("openResource"),
        arguments: [this]
      };
    }
  }

  private static collapsibleState(kind: ExplorerNodeKind): vscode.TreeItemCollapsibleState {
    return kind === "workspaceFolder" || kind === "safeRoot" || kind === "folder" || kind === "loadMore"
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
  }
}

export class LazyExplorerProvider implements vscode.TreeDataProvider<ExplorerNode> {
  private readonly changeEmitter = new vscode.EventEmitter<ExplorerNode | undefined>();
  private safeRootUris: vscode.Uri[];
  private sortMode: DirectorySortMode;
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public constructor(
    private readonly metrics: LazyTreeMetrics,
    safeRootUris: readonly vscode.Uri[] = [],
    sortMode: DirectorySortMode = "server"
  ) {
    this.safeRootUris = [...safeRootUris];
    this.sortMode = sortMode;
  }

  public getTreeItem(node: ExplorerNode): vscode.TreeItem {
    return node;
  }

  public async getChildren(node?: ExplorerNode): Promise<ExplorerNode[]> {
    if (!node) {
      const workspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(
        (folder) => new ExplorerNode(folder.uri, "workspaceFolder", folder.name)
      );
      const workspaceRootUris = new Set(workspaceRoots.map((root) => root.uri.toString()));
      const safeRoots = this.safeRootUris
        .filter((uri) => !workspaceRootUris.has(uri.toString()))
        .map((uri) => new ExplorerNode(uri, "safeRoot", uri.path, 0, undefined, true));
      return [...safeRoots, ...workspaceRoots];
    }
    if (node.kind === "file" || node.kind === "error") {
      return [];
    }

    const offset = node.kind === "loadMore" ? node.offset : 0;
    const startedAt = Date.now();
    try {
      if (node.usesSafeRemoteBrowsing) {
        return await this.getBoundedRemoteChildren(node, offset, startedAt);
      }
      const entries = await vscode.workspace.fs.readDirectory(node.uri);
      const durationMilliseconds = Date.now() - startedAt;
      this.metrics.recordDirectoryRead(entries.length, durationMilliseconds);
      const maximumVisibleEntries = getMaximumVisibleEntries(node.uri);
      const sortedEntries = sortDirectoryItems(
        entries.map(([name, fileType]) => ({ name, fileType, isDirectory: fileType === vscode.FileType.Directory })),
        this.sortMode
      );
      const page = createDirectoryPage(sortedEntries, offset, maximumVisibleEntries);
      const children = page.items.map(({ name, fileType }) => {
          const kind: ExplorerNodeKind = fileType === vscode.FileType.Directory ? "folder" : "file";
          return new ExplorerNode(vscode.Uri.joinPath(node.uri, name), kind, name);
        });
      if (page.nextOffset !== undefined) {
        children.push(new ExplorerNode(
          node.uri,
          "loadMore",
          t("loadMoreEntries", maximumVisibleEntries),
          page.nextOffset,
          t("directoryPageDescription", page.nextOffset, entries.length, formatMilliseconds(durationMilliseconds))
        ));
      }
      return children;
    } catch (error) {
      this.metrics.recordDirectoryReadFailure(Date.now() - startedAt);
      const message = error instanceof Error ? error.message : String(error);
      return [new ExplorerNode(node.uri, "error", t("directoryReadError", message))];
    }
  }

  public refresh(node?: ExplorerNode): void {
    this.changeEmitter.fire(node);
  }

  public getSortMode(): DirectorySortMode {
    return this.sortMode;
  }

  public setSortMode(sortMode: DirectorySortMode): void {
    if (this.sortMode === sortMode) {
      return;
    }
    this.sortMode = sortMode;
    this.refresh();
  }

  public addSafeRoot(uri: vscode.Uri): boolean {
    const next = addSafeRoot(this.safeRootUris.map((entry) => entry.toString()), uri.toString());
    if (next.length === this.safeRootUris.length) {
      return false;
    }
    this.safeRootUris = next.map((entry) => vscode.Uri.parse(entry));
    this.refresh();
    return true;
  }

  public removeSafeRoot(uri: vscode.Uri): boolean {
    const next = removeSafeRoot(this.safeRootUris.map((entry) => entry.toString()), uri.toString());
    if (next.length === this.safeRootUris.length) {
      return false;
    }
    this.safeRootUris = next.map((entry) => vscode.Uri.parse(entry));
    this.refresh();
    return true;
  }

  public getSafeRootUris(): readonly vscode.Uri[] {
    return [...this.safeRootUris];
  }

  private async getBoundedRemoteChildren(
    node: ExplorerNode,
    offset: number,
    startedAt: number
  ): Promise<ExplorerNode[]> {
    const maximumVisibleEntries = getMaximumVisibleEntries(node.uri);
    const page = await readPosixDirectoryPage(node.uri.path, offset, maximumVisibleEntries);
    const durationMilliseconds = Date.now() - startedAt;
    this.metrics.recordDirectoryRead(page.items.length, durationMilliseconds);
    const entries = sortDirectoryItems(
      page.items.map(({ name, type, isSymbolicLink }) => ({
        name,
        type,
        isDirectory: type === vscode.FileType.Directory,
        isSymbolicLink
      })),
      this.sortMode
    );
    const children = entries.map(({ name, type, isSymbolicLink }) => {
      const kind: ExplorerNodeKind = type === vscode.FileType.Directory ? "folder" : "file";
      return new ExplorerNode(
        vscode.Uri.joinPath(node.uri, name),
        kind,
        name,
        0,
        isSymbolicLink ? t("symbolicLinkDescription") : undefined,
        true,
        isSymbolicLink
      );
    });
    if (page.nextOffset !== undefined) {
      children.push(new ExplorerNode(
        node.uri,
        "loadMore",
        t("loadMoreEntries", maximumVisibleEntries),
        page.nextOffset,
        t("streamingPageDescription", offset + 1, offset + page.items.length, formatMilliseconds(durationMilliseconds)),
        true
      ));
    }
    return children;
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }
}

function getMaximumVisibleEntries(uri: vscode.Uri): number {
  const configured = vscode.workspace
    .getConfiguration("lazyWorkspaceGuard", uri)
    .get<number>("maximumVisibleDirectoryEntries", 1000);
  return Math.max(100, Math.min(configured, 10000));
}

function formatMilliseconds(milliseconds: number): string {
  return `${milliseconds.toFixed(0)} ms`;
}

function getExplorerNodeTooltip(
  kind: ExplorerNodeKind,
  uri: vscode.Uri,
  description: string | undefined,
  usesSafeRemoteBrowsing: boolean,
  isSymbolicLink: boolean
): string {
  switch (kind) {
    case "safeRoot":
      return t("safeRootTreeTooltip", uri.path);
    case "folder":
      if (usesSafeRemoteBrowsing && isSymbolicLink) {
        return t("safeRemoteSymbolicLinkFolderTooltip", uri.path);
      }
      return usesSafeRemoteBrowsing ? t("safeRemoteFolderTooltip", uri.path) : t("workspaceFolderTooltip", uri.path);
    case "workspaceFolder":
      return t("workspaceFolderTooltip", uri.path);
    case "file":
      return t("fileTreeTooltip", uri.path);
    case "loadMore":
      return `${description ?? ""}\n${t("loadMoreTooltip")}`.trim();
    case "error":
      return t("directoryErrorTooltip", uri.path);
  }
}
