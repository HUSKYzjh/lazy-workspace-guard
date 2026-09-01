import { Buffer } from "node:buffer";

const remoteSshPrefix = "ssh-remote+";
const safeSshHostPattern = /^[A-Za-z0-9_.@:[\]-]+$/;

/**
 * Returns a storage key that is stable for one Remote-SSH host but cannot be
 * shared accidentally with another connected host. The old unscoped key is
 * intentionally not read: it has no trustworthy host identity to migrate.
 */
export function getRemoteScopedStorageKey(baseKey: string, remoteName: string | undefined): string {
  const scope = getRemoteSshHost(remoteName) ?? remoteName ?? "local";
  return `${baseKey}:${encodeURIComponent(scope)}`;
}

/**
 * Extracts the SSH config host/alias from both legacy and current Remote-SSH
 * identifiers. Current VS Code builds may serialize the authority as JSON or
 * hexadecimal JSON, while older builds use the host name directly.
 */
export function getRemoteSshHost(remoteName: string | undefined): string | undefined {
  if (!remoteName?.startsWith(remoteSshPrefix)) {
    return undefined;
  }

  const authority = remoteName.slice(remoteSshPrefix.length);
  const fromObject = getHostNameFromJson(authority)
    ?? getHostNameFromJson(decodeUriComponent(authority))
    ?? getHostNameFromJson(decodeHex(authority));
  return fromObject ?? (isSafeSshHost(authority) ? authority : undefined);
}

/** Returns a terminal-ready SSH command for the active Remote-SSH host. */
export function getSshCommand(remoteName: string | undefined): string | undefined {
  const host = getRemoteSshHost(remoteName);
  return host ? `ssh ${host}` : undefined;
}

function getHostNameFromJson(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as { hostName?: unknown };
    return typeof parsed.hostName === "string" && isSafeSshHost(parsed.hostName)
      ? parsed.hostName
      : undefined;
  } catch {
    return undefined;
  }
}

function decodeUriComponent(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function decodeHex(value: string): string | undefined {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(value)) {
    return undefined;
  }
  return Buffer.from(value, "hex").toString("utf8");
}

function isSafeSshHost(value: string): boolean {
  return value.length > 0 && safeSshHostPattern.test(value);
}
