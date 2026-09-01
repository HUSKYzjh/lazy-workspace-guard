import * as vscode from "vscode";
import {
  removeManagedArrayRules,
  removeManagedBooleanRules,
  toDirectoryGlob,
  type BooleanRules
} from "./rules";
import {
  createExclusionPlanForGlobs,
  createInclusionPlan,
  hasPlannedChanges,
  type ExclusionPlan,
  type ExclusionSettings,
  type ManagedRuleReferences
} from "./settingsPlan";
import { runTransaction, type TransactionOperation } from "./transaction";

interface ManagedRules {
  watcherExclude: string[];
  searchExclude: string[];
  pythonAnalysisExclude: string[];
  originalValues: OriginalRuleValues;
}

type ManagedRulesByFolder = Record<string, ManagedRules>;

interface OriginalRuleValues {
  watcherExclude: Record<string, boolean | null>;
  searchExclude: Record<string, boolean | null>;
  pythonAnalysisExclude: Record<string, boolean>;
}

const storageKey = "lazyWorkspaceGuard.managedRulesByFolder";

function emptyRules(): ManagedRules {
  return {
    watcherExclude: [],
    searchExclude: [],
    pythonAnalysisExclude: [],
    originalValues: {
      watcherExclude: {},
      searchExclude: {},
      pythonAnalysisExclude: {}
    }
  };
}

export class SettingsManager {
  public constructor(private readonly state: vscode.Memento) {}

  public planExclusion(uri: vscode.Uri): WorkspaceExclusionPlan {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      throw new Error("Select a folder inside the active workspace.");
    }

    const relativePath = vscode.workspace.asRelativePath(uri, false);
    const glob = toDirectoryGlob(relativePath);
    return this.planExclusionGlobs(uri, [glob]);
  }

  public planExclusionGlobs(uri: vscode.Uri, globs: readonly string[]): WorkspaceExclusionPlan {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      throw new Error("Select a folder inside the active workspace.");
    }
    const watcherConfiguration = vscode.workspace.getConfiguration("files", folder.uri);
    const searchConfiguration = vscode.workspace.getConfiguration("search", folder.uri);
    const includePython = vscode.workspace
      .getConfiguration("lazyWorkspaceGuard", folder.uri)
      .get<boolean>("excludePythonAnalysis", false);
    const pythonConfiguration = vscode.workspace.getConfiguration("python.analysis", folder.uri);
    const settings: ExclusionSettings = {
      watcherExclude: watcherConfiguration.get<BooleanRules>("watcherExclude") ?? {},
      searchExclude: searchConfiguration.get<BooleanRules>("exclude") ?? {},
      pythonAnalysisExclude: pythonConfiguration.get<string[]>("exclude") ?? []
    };

    return {
      folder,
      plan: createExclusionPlanForGlobs(settings, globs, includePython)
    };
  }

  public planInclusion(uri: vscode.Uri): WorkspaceExclusionPlan {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) {
      throw new Error("Select a folder inside the active workspace.");
    }
    const glob = toDirectoryGlob(vscode.workspace.asRelativePath(uri, false));
    const watcherConfiguration = vscode.workspace.getConfiguration("files", folder.uri);
    const searchConfiguration = vscode.workspace.getConfiguration("search", folder.uri);
    const pythonConfiguration = vscode.workspace.getConfiguration("python.analysis", folder.uri);
    const settings: ExclusionSettings = {
      watcherExclude: watcherConfiguration.get<BooleanRules>("watcherExclude") ?? {},
      searchExclude: searchConfiguration.get<BooleanRules>("exclude") ?? {},
      pythonAnalysisExclude: pythonConfiguration.get<string[]>("exclude") ?? []
    };
    const managed = this.getRulesByFolder()[folder.uri.toString()] ?? emptyRules();
    return {
      folder,
      plan: createInclusionPlan(settings, glob, asManagedRuleReferences(managed))
    };
  }

  public hasChanges(plan: WorkspaceExclusionPlan): boolean {
    return hasPlannedChanges(plan.plan);
  }

  public async applyRulePlan(workspacePlan: WorkspaceExclusionPlan): Promise<string> {
    const { folder, plan } = workspacePlan;
    const rulesByFolder = this.getRulesByFolder();
    const currentManaged = rulesByFolder[folder.uri.toString()] ?? emptyRules();
    const nextManaged = mergeManagedRules(currentManaged, plan);
    const nextRulesByFolder = { ...rulesByFolder, [folder.uri.toString()]: nextManaged };
    const target = vscode.ConfigurationTarget.WorkspaceFolder;
    const watcherConfiguration = vscode.workspace.getConfiguration("files", folder.uri);
    const searchConfiguration = vscode.workspace.getConfiguration("search", folder.uri);
    const pythonConfiguration = vscode.workspace.getConfiguration("python.analysis", folder.uri);
    const operations: TransactionOperation[] = [
      createConfigurationOperation(watcherConfiguration, "watcherExclude", plan.before.watcherExclude, plan.after.watcherExclude, target),
      createConfigurationOperation(searchConfiguration, "exclude", plan.before.searchExclude, plan.after.searchExclude, target),
      createConfigurationOperation(pythonConfiguration, "exclude", plan.before.pythonAnalysisExclude, plan.after.pythonAnalysisExclude, target),
      {
        label: "managed rule registry",
        apply: () => this.state.update(storageKey, nextRulesByFolder),
        rollback: () => this.state.update(storageKey, rulesByFolder)
      }
    ].filter((operation) => operation.label === "managed rule registry" || operation.label.endsWith("changed"));

    await runTransaction(operations);
    return plan.glob;
  }

  public async restoreManagedRules(): Promise<number> {
    const rulesByFolder = this.getRulesByFolder();
    let removed = 0;
    const operations: TransactionOperation[] = [];

    for (const [folderUri, managed] of Object.entries(rulesByFolder)) {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.parse(folderUri));
      if (!folder) {
        continue;
      }
      const target = vscode.ConfigurationTarget.WorkspaceFolder;
      const watcherConfiguration = vscode.workspace.getConfiguration("files", folder.uri);
      const watcher = watcherConfiguration.get<BooleanRules>("watcherExclude") ?? {};
      operations.push(createConfigurationOperation(
        watcherConfiguration,
        "watcherExclude",
        watcher,
        removeManagedBooleanRules(watcher, managed.watcherExclude, managed.originalValues.watcherExclude),
        target
      ));
      removed += managed.watcherExclude.length;

      const searchConfiguration = vscode.workspace.getConfiguration("search", folder.uri);
      const search = searchConfiguration.get<BooleanRules>("exclude") ?? {};
      operations.push(createConfigurationOperation(
        searchConfiguration,
        "exclude",
        search,
        removeManagedBooleanRules(search, managed.searchExclude, managed.originalValues.searchExclude),
        target
      ));
      removed += managed.searchExclude.length;

      const pythonConfiguration = vscode.workspace.getConfiguration("python.analysis", folder.uri);
      const python = pythonConfiguration.get<string[]>("exclude") ?? [];
      operations.push(createConfigurationOperation(
        pythonConfiguration,
        "exclude",
        python,
        removeManagedArrayRules(python, managed.pythonAnalysisExclude, managed.originalValues.pythonAnalysisExclude),
        target
      ));
      removed += managed.pythonAnalysisExclude.length;
    }

    operations.push({
      label: "managed rule registry",
      apply: () => this.state.update(storageKey, {}),
      rollback: () => this.state.update(storageKey, rulesByFolder)
    });
    await runTransaction(operations.filter((operation) => operation.label === "managed rule registry" || operation.label.endsWith("changed")));
    return removed;
  }

  public getManagedRuleCount(): number {
    return Object.values(this.getRulesByFolder()).reduce(
      (count, rules) => count + rules.watcherExclude.length + rules.searchExclude.length + rules.pythonAnalysisExclude.length,
      0
    );
  }

  private getRulesByFolder(): ManagedRulesByFolder {
    const stored = this.state.get<Record<string, Partial<ManagedRules>>>(storageKey, {});
    return Object.fromEntries(
      Object.entries(stored).map(([folder, rules]) => [folder, {
        ...emptyRules(),
        ...rules,
        watcherExclude: rules.watcherExclude ?? [],
        searchExclude: rules.searchExclude ?? [],
        pythonAnalysisExclude: rules.pythonAnalysisExclude ?? [],
        originalValues: {
          ...emptyRules().originalValues,
          ...rules.originalValues,
          watcherExclude: rules.originalValues?.watcherExclude ?? {},
          searchExclude: rules.originalValues?.searchExclude ?? {},
          pythonAnalysisExclude: rules.originalValues?.pythonAnalysisExclude ?? {}
        }
      }])
    );
  }
}

export interface WorkspaceExclusionPlan {
  folder: vscode.WorkspaceFolder;
  plan: ExclusionPlan;
}

function mergeManagedRules(managed: ManagedRules, plan: ExclusionPlan): ManagedRules {
  return {
    watcherExclude: removeRuleNames(
      mergeRuleNames(managed.watcherExclude, plan.addedRules.watcherExclude),
      plan.removedRules.watcherExclude
    ),
    searchExclude: removeRuleNames(
      mergeRuleNames(managed.searchExclude, plan.addedRules.searchExclude),
      plan.removedRules.searchExclude
    ),
    pythonAnalysisExclude: removeRuleNames(
      mergeRuleNames(managed.pythonAnalysisExclude, plan.addedRules.pythonAnalysisExclude),
      plan.removedRules.pythonAnalysisExclude
    ),
    originalValues: {
      watcherExclude: recordBooleanOriginals(
        removeOriginals(managed.originalValues.watcherExclude, plan.removedRules.watcherExclude),
        plan.addedRules.watcherExclude,
        plan.before.watcherExclude
      ),
      searchExclude: recordBooleanOriginals(
        removeOriginals(managed.originalValues.searchExclude, plan.removedRules.searchExclude),
        plan.addedRules.searchExclude,
        plan.before.searchExclude
      ),
      pythonAnalysisExclude: recordArrayOriginals(
        removeOriginals(managed.originalValues.pythonAnalysisExclude, plan.removedRules.pythonAnalysisExclude),
        plan.addedRules.pythonAnalysisExclude,
        plan.before.pythonAnalysisExclude
      )
    }
  };
}

function mergeRuleNames(existing: string[], added: string[]): string[] {
  return [...new Set([...existing, ...added])];
}

function removeRuleNames(existing: string[], removed: string[]): string[] {
  const removedRules = new Set(removed);
  return existing.filter((rule) => !removedRules.has(rule));
}

function removeOriginals<T>(originals: Record<string, T>, removed: string[]): Record<string, T> {
  const next = { ...originals };
  for (const rule of removed) {
    delete next[rule];
  }
  return next;
}

function asManagedRuleReferences(managed: ManagedRules): ManagedRuleReferences {
  return managed;
}

function recordBooleanOriginals(
  existing: Record<string, boolean | null>,
  added: string[],
  before: BooleanRules
): Record<string, boolean | null> {
  const originals = { ...existing };
  for (const rule of added) {
    if (!Object.prototype.hasOwnProperty.call(originals, rule)) {
      originals[rule] = Object.prototype.hasOwnProperty.call(before, rule) ? before[rule] : null;
    }
  }
  return originals;
}

function recordArrayOriginals(
  existing: Record<string, boolean>,
  added: string[],
  before: string[]
): Record<string, boolean> {
  const originals = { ...existing };
  for (const rule of added) {
    if (!Object.prototype.hasOwnProperty.call(originals, rule)) {
      originals[rule] = before.includes(rule);
    }
  }
  return originals;
}

function createConfigurationOperation<T>(
  configuration: vscode.WorkspaceConfiguration,
  key: string,
  before: T,
  after: T,
  target: vscode.ConfigurationTarget
): TransactionOperation {
  const changed = JSON.stringify(before) !== JSON.stringify(after);
  return {
    label: changed ? `${configuration.section}.${key} changed` : `${configuration.section}.${key} unchanged`,
    apply: () => configuration.update(key, after, target),
    rollback: () => configuration.update(key, before, target)
  };
}
