export interface DirectoryPage<T> {
  items: T[];
  nextOffset: number | undefined;
}

export function createDirectoryPage<T>(entries: readonly T[], offset: number, limit: number): DirectoryPage<T> {
  const safeOffset = Math.max(0, offset);
  const safeLimit = Math.max(1, limit);
  const items = entries.slice(safeOffset, safeOffset + safeLimit);
  const nextOffset = safeOffset + items.length < entries.length
    ? safeOffset + items.length
    : undefined;
  return { items, nextOffset };
}
