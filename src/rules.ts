export type BooleanRules = Record<string, boolean>;

export function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/$/, "");
}

export function toDirectoryGlob(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized || normalized === "." || normalized.startsWith("../")) {
    throw new Error("Only a directory inside a workspace folder can be excluded.");
  }
  if (/[*?\[\]{}]/.test(normalized)) {
    throw new Error("Directories with glob metacharacters cannot be converted to a safe exclusion rule.");
  }
  return `${normalized}/**`;
}

export function addBooleanRule(rules: BooleanRules, rule: string): { rules: BooleanRules; added: boolean } {
  if (Object.prototype.hasOwnProperty.call(rules, rule)) {
    return { rules: { ...rules }, added: false };
  }
  return { rules: { ...rules, [rule]: true }, added: true };
}

export function removeManagedBooleanRules(
  rules: BooleanRules,
  managedRules: readonly string[],
  originalValues: Readonly<Record<string, boolean | null>> = {}
): BooleanRules {
  const next = { ...rules };
  for (const rule of managedRules) {
    if (next[rule] === true) {
      const original = originalValues[rule];
      if (original === null || original === undefined) {
        delete next[rule];
      } else {
        next[rule] = original;
      }
    }
  }
  return next;
}

export function addArrayRule(rules: readonly string[], rule: string): { rules: string[]; added: boolean } {
  if (rules.includes(rule)) {
    return { rules: [...rules], added: false };
  }
  return { rules: [...rules, rule], added: true };
}

export function removeManagedArrayRules(
  rules: readonly string[],
  managedRules: readonly string[],
  originalValues: Readonly<Record<string, boolean>> = {}
): string[] {
  const managed = new Set(managedRules.filter((rule) => originalValues[rule] !== true));
  return rules.filter((rule) => !managed.has(rule));
}
