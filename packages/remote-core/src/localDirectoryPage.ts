import { opendir, stat } from "node:fs/promises";
import { join } from "node:path";

export interface LocalDirectoryEntry {
  name: string;
  type: number;
  isSymbolicLink: boolean;
}

export interface LocalDirectoryPage {
  items: LocalDirectoryEntry[];
  nextOffset: number | undefined;
}

/**
 * Read one direct page without materialising a directory's complete entry list.
 *
 * Node's `opendir()` iterator consumes entries incrementally. We intentionally
 * skip earlier pages instead of retaining them, then inspect one look-ahead
 * entry to determine whether the tree should offer "Load more". This keeps the
 * extension-host allocation bounded by the configured page size even when the
 * directory itself contains millions of entries.
 */
export async function readLocalDirectoryPage(
  directoryPath: string,
  offset: number,
  maximumEntries: number
): Promise<LocalDirectoryPage> {
  const normalizedOffset = Math.max(0, Math.floor(offset));
  const normalizedMaximum = Math.max(1, Math.floor(maximumEntries));
  const directory = await opendir(directoryPath);
  const items: LocalDirectoryEntry[] = [];
  let seen = 0;
  let hasMore = false;

  for await (const entry of directory) {
    if (seen < normalizedOffset) {
      seen += 1;
      continue;
    }
    if (items.length >= normalizedMaximum) {
      hasMore = true;
      break;
    }

    const isSymbolicLink = entry.isSymbolicLink();
    const isDirectory = entry.isDirectory() || (isSymbolicLink && await isDirectorySymbolicLink(directoryPath, entry.name));
    items.push({
      name: entry.name,
      type: isDirectory ? 2 : 1,
      isSymbolicLink
    });
    seen += 1;
  }

  return {
    items,
    nextOffset: hasMore ? normalizedOffset + items.length : undefined
  };
}

async function isDirectorySymbolicLink(directoryPath: string, name: string): Promise<boolean> {
  try {
    return (await stat(join(directoryPath, name))).isDirectory();
  } catch {
    // A broken or concurrently removed link is represented as a non-directory.
    return false;
  }
}
