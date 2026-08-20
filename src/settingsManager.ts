import * as vscode from "vscode";
import {
  addArrayRule,
  addBooleanRule,
  removeManagedArrayRules,
  removeManagedBooleanRules,
  toDirectoryGlob,
  type BooleanRules
} from "./rules";

interface ManagedRules {
  watcherExclude: string[];
  searchExclude: string[];
  pythonAnalysisExclude: string[];
}

type ManagedRulesByFolder = Record<string, ManagedRules>;

const storageKey = "lazyWorkspaceGuard.managedRulesByFolder";

function emptyRules(): ManagedRules {
  return { watcherExclude: [], searchExclude: [], pythonAnalysisExclude: [] };
}

export class SettingsManager {
  public constructor(private readonly state: vscode.Memento) {}

  public async excludeFolder(uri: vscode.Uri): Promise<string> {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      throw new Error("Select a folder inside the active workspace.");
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const glob = toDirectoryGlob(relativePath);
    const rulesByFolder = this.getRulesByFolder();
    const managed = rulesByFolder[folder.uri.toString()] ?? emptyRules();
    const target = vscode.ConfigurationTarget.WorkspaceFolder;

    const watcherConfiguration = vscode.workspace.getConfiguration("files", folder.uri);
    const watcher = addBooleanRule(
      watcherConfiguration.get<BooleanRules>("watcherExclude") ?? {},
      glob
    );
    if (watcher.added) {
      await watcherConfiguration.update("watcherExclude", watcher.rules, target);
      managed.watcherExclude.push(glob);
    }

    const searchConfiguration = vscode.workspace.getConfiguration("search", folder.uri);
    const search = addBooleanRule(searchConfiguration.get<BooleanRules>("exclude") ?? {}, glob);
    if (search.added) {
      await searchConfiguration.update("exclude", search.rules, target);
      managed.searchExclude.push(glob);
    }

    const includePython = vscode.workspace
      .getConfiguration("lazyWorkspaceGuard", folder.uri)
      .get<boolean>("excludePythonAnalysis", false);
    if (includePython) {
      const pythonConfiguration = vscode.workspace.getConfiguration("python.analysis", folder.uri);
      const python = addArrayRule(pythonConfiguration.get<string[]>("exclude") ?? [], glob);
      if (python.added) {
        await pythonConfiguration.update("exclude", python.rules, target);
        managed.pythonAnalysisExclude.push(glob);
      }
    }

    rulesByFolder[folder.uri.toString()] = managed;
    await this.state.update(storageKey, rulesByFolder);
    return glob;
  }

  public async restoreManagedRules(): Promise<number> {
    const rulesByFolder = this.getRulesByFolder();
    let removed = 0;

    for (const [folderUri, managed] of Object.entries(rulesByFolder)) {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(folderUri));
      if (!folder) {
        continue;
      }
      const target = vscode.ConfigurationTarget.WorkspaceFolder;
      const watcherConfiguration = vscode.workspace.getConfiguration("files", folder.uri);
      const watcher = watcherConfiguration.get<BooleanRules>("watcherExclude") ?? {};
      await watcherConfiguration.update(
        "watcherExclude",
        removeManagedBooleanRules(watcher, managed.watcherExclude),
        target
      );
      removed += managed.watcherExclude.length;

      const searchConfiguration = vscode.workspace.getConfiguration("search", folder.uri);
      const search = searchConfiguration.get<BooleanRules>("exclude") ?? {};
      await searchConfiguration.update(
        "exclude",
        removeManagedBooleanRules(search, managed.searchExclude),
        target
      );
      removed += managed.searchExclude.length;

      const pythonConfiguration = vscode.workspace.getConfiguration("python.analysis", folder.uri);
      const python = pythonConfiguration.get<string[]>("exclude") ?? [];
      await pythonConfiguration.update(
        "exclude",
        removeManagedArrayRules(python, managed.pythonAnalysisExclude),
        target
      );
      removed += managed.pythonAnalysisExclude.length;
    }

    await this.state.update(storageKey, {});
    return removed;
  }

  private getRulesByFolder(): ManagedRulesByFolder {
    return this.state.get<ManagedRulesByFolder>(storageKey, {});
  }
}
