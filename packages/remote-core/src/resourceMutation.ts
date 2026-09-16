import { posix } from "node:path";

export interface ResourceMoveCandidate {
  path: string;
  isDirectory: boolean;
}

export function normalizeNewResourceName(value: string): string | undefined {
  const name = value.trim();
  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    return undefined;
  }
  return name;
}

/**
 * Return whether `path` is `parentPath` itself or is contained by it. Paths
 * here come from VS Code URIs and therefore always use POSIX separators, even
 * when the client that initiated Remote-SSH is running on Windows.
 */
export function isSameOrDescendantResourcePath(path: string, parentPath: string): boolean {
  const normalizedParent = parentPath === "/" ? parentPath : parentPath.replace(/\/+$/, "");
  return path === normalizedParent || path.startsWith(`${normalizedParent}/`);
}

/**
 * Reduce a drag selection to the resources that need a rename operation.
 * Descendants of another selected directory move with that directory, and a
 * resource already directly inside the drop target would be a no-op.
 */
export function prepareResourceMoveCandidates(
  candidates: readonly ResourceMoveCandidate[],
  destinationPath: string
): ResourceMoveCandidate[] {
  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.path, candidate])).values()];
  return uniqueCandidates
    .filter((candidate) => !uniqueCandidates.some(
      (ancestor) => ancestor !== candidate
        && ancestor.isDirectory
        && isSameOrDescendantResourcePath(candidate.path, ancestor.path)
    ))
    .filter((candidate) => posix.dirname(candidate.path) !== destinationPath);
}

/**
 * Moving a directory into itself (or one of its descendants) is invalid and
 * can otherwise be surprisingly expensive for a remote filesystem provider.
 */
export function wouldMoveDirectoryIntoDescendant(
  candidates: readonly ResourceMoveCandidate[],
  destinationPath: string
): boolean {
  return candidates.some((candidate) => candidate.isDirectory && isSameOrDescendantResourcePath(destinationPath, candidate.path));
}
