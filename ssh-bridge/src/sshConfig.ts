import { normalize, resolve } from "node:path";

const safeHostAliasPattern = /^[A-Za-z0-9_.@:[\]-]+$/;

/**
 * Reads only literal Host aliases. Wildcards, negated entries, and Match
 * blocks are intentionally excluded because they cannot identify one host.
 */
export function parseSshHostAliases(config: string): string[] {
  const aliases = new Set<string>();
  for (const line of config.split(/\r?\n/)) {
    const directive = line.replace(/#.*/, "").trim();
    const match = /^host\s+(.+)$/i.exec(directive);
    if (!match) {
      continue;
    }
    for (const candidate of match[1].trim().split(/\s+/)) {
      if (isSafeHostAlias(candidate) && !/[*!?]/.test(candidate)) {
        aliases.add(candidate);
      }
    }
  }
  return [...aliases].sort((left, right) => left.localeCompare(right));
}

export function normalizeHostAlias(value: string | undefined): string | undefined {
  const alias = value?.trim();
  return alias && isSafeHostAlias(alias) ? alias : undefined;
}

/**
 * Keeps a config alias intact instead of expanding port, user, keys, or proxy
 * settings. OpenSSH resolves those details correctly when the user runs it.
 */
export function buildSshCommand(alias: string, configFile: string, defaultConfigFile: string): string {
  const normalizedAlias = normalizeHostAlias(alias);
  if (!normalizedAlias) {
    throw new Error("Invalid SSH host alias.");
  }
  return sameConfigFile(configFile, defaultConfigFile)
    ? `ssh ${normalizedAlias}`
    : `ssh -F ${quoteShellArgument(configFile)} ${normalizedAlias}`;
}

function isSafeHostAlias(value: string): boolean {
  return safeHostAliasPattern.test(value);
}

function sameConfigFile(left: string, right: string): boolean {
  const normalizedLeft = normalize(resolve(left));
  const normalizedRight = normalize(resolve(right));
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function quoteShellArgument(value: string): string {
  return `"${value.replace(/["\r\n]/g, "")}"`;
}
