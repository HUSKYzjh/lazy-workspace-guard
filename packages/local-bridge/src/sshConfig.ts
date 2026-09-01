import { normalize, resolve } from "node:path";

const safeHostAliasPattern = /^[A-Za-z0-9_.@:[\]-]+$/;
const safeSshUserPattern = /^[A-Za-z0-9_.-]+$/;
const noValue = "none";

export interface EffectiveSshConfiguration {
  hostname?: string;
  user?: string;
  port?: string;
  identityFiles: string[];
  proxyJump?: string;
  proxyCommand?: string;
  identitiesOnly?: string;
}

export interface BuiltSshCommand {
  command: string;
  /** True when an option cannot be reproduced safely outside OpenSSH config. */
  usesConfigFallback: boolean;
}

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

/** Returns a config-backed command that preserves every OpenSSH option. */
export function buildSshCommand(alias: string, configFile: string, defaultConfigFile: string): string {
  const normalizedAlias = normalizeHostAlias(alias);
  if (!normalizedAlias) {
    throw new Error("Invalid SSH host alias.");
  }
  return sameConfigFile(configFile, defaultConfigFile)
    ? `ssh ${normalizedAlias}`
    : `ssh -F ${quoteShellArgument(configFile)} ${normalizedAlias}`;
}

/**
 * Parses the small, relevant subset of `ssh -G` output used to create an
 * explicit terminal command. `ssh -G` resolves Host, Include, and Match rules
 * without opening a network connection.
 */
export function parseEffectiveSshConfiguration(output: string): EffectiveSshConfiguration {
  const values = new Map<string, string[]>();
  for (const line of output.split(/\r?\n/)) {
    const match = /^([a-z][a-z0-9]*)\s+(.*)$/i.exec(line.trim());
    if (!match) {
      continue;
    }
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (value) {
      values.set(key, [...(values.get(key) ?? []), value]);
    }
  }

  return {
    hostname: firstValue(values, "hostname"),
    user: firstValue(values, "user"),
    port: firstValue(values, "port"),
    identityFiles: (values.get("identityfile") ?? []).filter((value) => value.toLowerCase() !== noValue),
    proxyJump: firstValue(values, "proxyjump"),
    proxyCommand: firstValue(values, "proxycommand"),
    identitiesOnly: firstValue(values, "identitiesonly")
  };
}

/**
 * Builds an explicit SSH command from the effective local OpenSSH settings.
 * A ProxyCommand cannot be faithfully or safely embedded in a copied shell
 * command, so it deliberately falls back to `ssh -F … <alias>` in that case.
 */
export function buildResolvedSshCommand(
  alias: string,
  configFile: string,
  defaultConfigFile: string,
  configuration: EffectiveSshConfiguration | undefined
): BuiltSshCommand {
  const endpoint = getEndpoint(configuration);
  if (!configuration || !endpoint || requiresConfigFallback(configuration)) {
    return { command: buildSshCommand(alias, configFile, defaultConfigFile), usesConfigFallback: true };
  }
  return {
    command: `ssh ${buildConnectionOptions(configuration, "ssh")} ${endpoint}`,
    usesConfigFallback: false
  };
}

/** Builds an `scp` download command for one absolute remote file path. */
export function buildResolvedScpDownloadCommand(
  alias: string,
  configFile: string,
  defaultConfigFile: string,
  remotePath: string,
  configuration: EffectiveSshConfiguration | undefined
): BuiltSshCommand {
  const normalizedAlias = normalizeHostAlias(alias);
  if (!normalizedAlias) {
    throw new Error("Invalid SSH host alias.");
  }
  if (!isAbsoluteRemotePath(remotePath)) {
    throw new Error("A download command requires an absolute remote path.");
  }

  const endpoint = getEndpoint(configuration);
  if (!configuration || !endpoint || requiresConfigFallback(configuration)) {
    const configArgument = sameConfigFile(configFile, defaultConfigFile)
      ? ""
      : `-F ${quoteShellArgument(configFile)} `;
    return {
      command: `scp ${configArgument}${quoteShellArgument(`${normalizedAlias}:${remotePath}`)} .`,
      usesConfigFallback: true
    };
  }
  return {
    command: `scp ${buildConnectionOptions(configuration, "scp")} ${quoteShellArgument(`${endpoint}:${remotePath}`)} .`,
    usesConfigFallback: false
  };
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

function firstValue(values: Map<string, string[]>, key: string): string | undefined {
  return values.get(key)?.[0];
}

function getEndpoint(configuration: EffectiveSshConfiguration | undefined): string | undefined {
  if (!configuration || !configuration.hostname || !isSafeSshHost(configuration.hostname)) {
    return undefined;
  }
  const host = configuration.hostname.includes(":") && !configuration.hostname.startsWith("[")
    ? `[${configuration.hostname}]`
    : configuration.hostname;
  if (!configuration.user) {
    return host;
  }
  return safeSshUserPattern.test(configuration.user) ? `${configuration.user}@${host}` : undefined;
}

function requiresConfigFallback(configuration: EffectiveSshConfiguration | undefined): boolean {
  const proxyCommand = configuration?.proxyCommand?.toLowerCase();
  return Boolean(proxyCommand && proxyCommand !== noValue);
}

function buildConnectionOptions(configuration: EffectiveSshConfiguration, command: "ssh" | "scp"): string {
  const options: string[] = [];
  if (configuration.port && isSafePort(configuration.port)) {
    options.push(command === "scp" ? "-P" : "-p", configuration.port);
  }
  for (const identityFile of configuration.identityFiles) {
    if (!/[\r\n]/.test(identityFile)) {
      options.push("-i", quoteShellArgument(identityFile));
    }
  }
  if (configuration.proxyJump && configuration.proxyJump.toLowerCase() !== noValue && !/[\r\n]/.test(configuration.proxyJump)) {
    options.push("-J", quoteShellArgument(configuration.proxyJump));
  }
  if (configuration.identitiesOnly && /^(yes|no)$/i.test(configuration.identitiesOnly)) {
    options.push("-o", `IdentitiesOnly=${configuration.identitiesOnly.toLowerCase()}`);
  }
  return options.join(" ");
}

function isSafeSshHost(value: string): boolean {
  return safeHostAliasPattern.test(value) || /^[0-9a-fA-F:.]+$/.test(value);
}

function isSafePort(value: string): boolean {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

function isAbsoluteRemotePath(value: string): boolean {
  return value.startsWith("/") && !/[\r\n]/.test(value);
}

function quoteShellArgument(value: string): string {
  if (/[\r\n]/.test(value)) {
    throw new Error("Shell arguments cannot contain line breaks.");
  }
  // The bridge runs in VS Code's local UI extension host. Double quotes work
  // for the Windows OpenSSH client and keep paths with spaces as one argument.
  return `"${value.replace(/(\\*)"/g, "$1$1\\\"").replace(/(\\*)$/, "$1$1")}"`;
}
