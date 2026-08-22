import {
  addArrayRule,
  addBooleanRule,
  type BooleanRules
} from "./rules";

export interface ExclusionSettings {
  watcherExclude: BooleanRules;
  searchExclude: BooleanRules;
  pythonAnalysisExclude: string[];
}

export interface ExclusionPlan {
  action: "exclude" | "include";
  glob: string;
  before: ExclusionSettings;
  after: ExclusionSettings;
  addedRules: {
    watcherExclude: string[];
    searchExclude: string[];
    pythonAnalysisExclude: string[];
  };
  removedRules: {
    watcherExclude: string[];
    searchExclude: string[];
    pythonAnalysisExclude: string[];
  };
}

export interface ManagedRuleReferences {
  watcherExclude: readonly string[];
  searchExclude: readonly string[];
  pythonAnalysisExclude: readonly string[];
  originalValues: {
    watcherExclude: Readonly<Record<string, boolean | null>>;
    searchExclude: Readonly<Record<string, boolean | null>>;
    pythonAnalysisExclude: Readonly<Record<string, boolean>>;
  };
}

export function createExclusionPlan(
  settings: ExclusionSettings,
  glob: string,
  includePythonAnalysis: boolean
): ExclusionPlan {
  return createExclusionPlanForGlobs(settings, [glob], includePythonAnalysis);
}

export function createExclusionPlanForGlobs(
  settings: ExclusionSettings,
  globs: readonly string[],
  includePythonAnalysis: boolean
): ExclusionPlan {
  const uniqueGlobs = [...new Set(globs)];
  let current = cloneSettings(settings);
  const addedRules = {
    watcherExclude: [] as string[],
    searchExclude: [] as string[],
    pythonAnalysisExclude: [] as string[]
  };

  for (const glob of uniqueGlobs) {
    const watcher = addBooleanRule(current.watcherExclude, glob);
    const search = addBooleanRule(current.searchExclude, glob);
    const python = includePythonAnalysis
      ? addArrayRule(current.pythonAnalysisExclude, glob)
      : { rules: [...current.pythonAnalysisExclude], added: false };
    current = {
      watcherExclude: watcher.rules,
      searchExclude: search.rules,
      pythonAnalysisExclude: python.rules
    };
    if (watcher.added) {
      addedRules.watcherExclude.push(glob);
    }
    if (search.added) {
      addedRules.searchExclude.push(glob);
    }
    if (python.added) {
      addedRules.pythonAnalysisExclude.push(glob);
    }
  }

  return {
    action: "exclude",
    glob: uniqueGlobs.join(", "),
    before: cloneSettings(settings),
    after: current,
    addedRules,
    removedRules: emptyRuleLists()
  };
}

export function createInclusionPlan(
  settings: ExclusionSettings,
  glob: string,
  managed: ManagedRuleReferences
): ExclusionPlan {
  const watcher = restoreBooleanRule(settings.watcherExclude, glob, managed.watcherExclude, managed.originalValues.watcherExclude);
  const search = restoreBooleanRule(settings.searchExclude, glob, managed.searchExclude, managed.originalValues.searchExclude);
  const python = restoreArrayRule(settings.pythonAnalysisExclude, glob, managed.pythonAnalysisExclude, managed.originalValues.pythonAnalysisExclude);
  return {
    action: "include",
    glob,
    before: cloneSettings(settings),
    after: {
      watcherExclude: watcher.rules,
      searchExclude: search.rules,
      pythonAnalysisExclude: python.rules
    },
    addedRules: emptyRuleLists(),
    removedRules: {
      watcherExclude: watcher.changed ? [glob] : [],
      searchExclude: search.changed ? [glob] : [],
      pythonAnalysisExclude: python.changed ? [glob] : []
    }
  };
}

export function hasPlannedChanges(plan: ExclusionPlan): boolean {
  return [plan.addedRules, plan.removedRules].some(
    (ruleLists) => Object.values(ruleLists).some((rules) => rules.length > 0)
  );
}

export function serializeExclusionSettings(settings: ExclusionSettings): string {
  return `${JSON.stringify({
    "files.watcherExclude": sortRules(settings.watcherExclude),
    "search.exclude": sortRules(settings.searchExclude),
    "python.analysis.exclude": [...settings.pythonAnalysisExclude].sort()
  }, null, 2)}\n`;
}

function cloneSettings(settings: ExclusionSettings): ExclusionSettings {
  return {
    watcherExclude: { ...settings.watcherExclude },
    searchExclude: { ...settings.searchExclude },
    pythonAnalysisExclude: [...settings.pythonAnalysisExclude]
  };
}

function sortRules(rules: BooleanRules): BooleanRules {
  return Object.fromEntries(Object.entries(rules).sort(([left], [right]) => left.localeCompare(right)));
}

function emptyRuleLists(): ExclusionPlan["addedRules"] {
  return { watcherExclude: [], searchExclude: [], pythonAnalysisExclude: [] };
}

function restoreBooleanRule(
  rules: BooleanRules,
  glob: string,
  managedRules: readonly string[],
  originals: Readonly<Record<string, boolean | null>>
): { rules: BooleanRules; changed: boolean } {
  if (!managedRules.includes(glob) || rules[glob] !== true) {
    return { rules: { ...rules }, changed: false };
  }
  const next = { ...rules };
  const original = originals[glob];
  if (original === null || original === undefined) {
    delete next[glob];
  } else {
    next[glob] = original;
  }
  return { rules: next, changed: true };
}

function restoreArrayRule(
  rules: readonly string[],
  glob: string,
  managedRules: readonly string[],
  originals: Readonly<Record<string, boolean>>
): { rules: string[]; changed: boolean } {
  if (!managedRules.includes(glob) || originals[glob] === true || !rules.includes(glob)) {
    return { rules: [...rules], changed: false };
  }
  return { rules: rules.filter((rule) => rule !== glob), changed: true };
}
