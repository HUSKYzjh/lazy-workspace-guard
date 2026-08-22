export type DirectorySortMode = "server" | "nameAscending" | "nameDescending";

export function isDirectorySortMode(value: unknown): value is DirectorySortMode {
  return value === "server" || value === "nameAscending" || value === "nameDescending";
}

export interface SortableDirectoryItem {
  name: string;
  isDirectory: boolean;
}

export function sortDirectoryItems<T extends SortableDirectoryItem>(
  items: readonly T[],
  mode: DirectorySortMode
): T[] {
  if (mode === "server") {
    return [...items];
  }
  const direction = mode === "nameAscending" ? 1 : -1;
  return [...items].sort((left, right) => {
    const directoryOrder = Number(right.isDirectory) - Number(left.isDirectory);
    return directoryOrder || direction * left.name.localeCompare(right.name);
  });
}
