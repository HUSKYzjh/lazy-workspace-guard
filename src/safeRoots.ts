import { posix } from "node:path";

export interface RemoteDirectoryCompletionContext {
  parentPath: string;
  prefix: string;
}

const maximumPersistedSafeRoots = 50;

export function addSafeRoot(existing: readonly string[], root: string): string[] {
  return existing.includes(root) ? [...existing] : [...existing, root];
}

export function removeSafeRoot(existing: readonly string[], root: string): string[] {
  return existing.filter((entry) => entry !== root);
}

export function normalizeSafeRemoteDirectoryPath(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.includes("\0")) {
    return undefined;
  }
  return posix.normalize(trimmed);
}

export function getRemoteDirectoryCompletionContext(value: string): RemoteDirectoryCompletionContext | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.includes("\0")) {
    return undefined;
  }
  const separator = trimmed.lastIndexOf("/");
  const parentCandidate = separator === 0 ? "/" : trimmed.slice(0, separator);
  const parentPath = normalizeSafeRemoteDirectoryPath(parentCandidate);
  if (!parentPath) {
    return undefined;
  }
  return {
    parentPath,
    prefix: separator === trimmed.length - 1 ? "" : trimmed.slice(separator + 1)
  };
}

export function restoreSafeRemoteDirectoryPaths(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const paths: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== "string") {
      continue;
    }
    const normalized = normalizeSafeRemoteDirectoryPath(candidate);
    if (normalized && !paths.includes(normalized)) {
      paths.push(normalized);
    }
    if (paths.length === maximumPersistedSafeRoots) {
      break;
    }
  }
  return paths;
}

export function canStartSafeRemoteBrowse(remoteName: string | undefined, workspaceFolderCount: number): boolean {
  return remoteName === "ssh-remote" && workspaceFolderCount === 0;
}

export function supportsSafeRemoteBackend(platform: NodeJS.Platform): boolean {
  return platform === "linux";
}
