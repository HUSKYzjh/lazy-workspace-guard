export type RuleTemplateId = "hpc" | "deepmd" | "python" | "node" | "data";

export interface RuleTemplate {
  id: RuleTemplateId;
  directoryNames: readonly string[];
}

export const ruleTemplates: readonly RuleTemplate[] = [
  {
    id: "hpc",
    directoryNames: ["results", "output", "outputs", "scratch", "logs", "archive"]
  },
  {
    id: "deepmd",
    directoryNames: ["10_data", "11_train", "13_logs", "14_test", "models", "checkpoints", "wandb"]
  },
  {
    id: "python",
    directoryNames: [".venv", ".conda", "__pycache__", ".ipynb_checkpoints", ".pytest_cache"]
  },
  {
    id: "node",
    directoryNames: ["node_modules", "dist", "build", "coverage", ".next"]
  },
  {
    id: "data",
    directoryNames: ["data", "datasets", "cache", ".cache", "tmp", "temp"]
  }
];

export function findTemplateDirectories(
  entries: readonly [string, number][],
  template: RuleTemplate
): string[] {
  const candidateNames = new Set(template.directoryNames);
  return entries
    .filter(([name, type]) => type === 2 && candidateNames.has(name))
    .map(([name]) => name)
    .sort((left, right) => left.localeCompare(right));
}
