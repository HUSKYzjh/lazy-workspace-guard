import * as vscode from "vscode";

export type ExplorerNodeKind = "workspaceFolder" | "folder" | "file" | "error";

export class ExplorerNode extends vscode.TreeItem {
  public constructor(
    public readonly uri: vscode.Uri,
    public readonly kind: ExplorerNodeKind,
    label?: string
  ) {
    super(label ?? (vscode.workspace.asRelativePath(uri, false) || uri.path), ExplorerNode.collapsibleState(kind));
    this.resourceUri = uri;
    this.contextValue = `resource${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;

    if (kind === "file") {
      this.command = {
        command: "lazyWorkspaceGuard.openResource",
        title: "Open Resource",
        arguments: [this]
      };
    }
  }

  private static collapsibleState(kind: ExplorerNodeKind): vscode.TreeItemCollapsibleState {
    return kind === "workspaceFolder" || kind === "folder"
      ? vscode.TreeItemCollapsibleState.Collapsed
      : vscode.TreeItemCollapsibleState.None;
  }
}

export class LazyExplorerProvider implements vscode.TreeDataProvider<ExplorerNode> {
  private readonly changeEmitter = new vscode.EventEmitter<ExplorerNode | undefined>();
  public readonly onDidChangeTreeData = this.changeEmitter.event;

  public getTreeItem(node: ExplorerNode): vscode.TreeItem {
    return node;
  }

  public async getChildren(node?: ExplorerNode): Promise<ExplorerNode[]> {
    if (!node) {
      return (vscode.workspace.workspaceFolders ?? []).map(
        (folder) => new ExplorerNode(folder.uri, "workspaceFolder", folder.name)
      );
    }
    if (node.kind === "file" || node.kind === "error") {
      return [];
    }

    try {
      const entries = await vscode.workspace.fs.readDirectory(node.uri);
      return entries
        .sort(([leftName, leftKind], [rightName, rightKind]) => {
          const kindOrder = Number(rightKind === vscode.FileType.Directory) - Number(leftKind === vscode.FileType.Directory);
          return kindOrder || leftName.localeCompare(rightName);
        })
        .map(([name, fileType]) => {
          const kind: ExplorerNodeKind = fileType === vscode.FileType.Directory ? "folder" : "file";
          return new ExplorerNode(vscode.Uri.joinPath(node.uri, name), kind, name);
        });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [new ExplorerNode(node.uri, "error", `Unable to read directory: ${message}`)];
    }
  }

  public refresh(node?: ExplorerNode): void {
    this.changeEmitter.fire(node);
  }

  public dispose(): void {
    this.changeEmitter.dispose();
  }
}
