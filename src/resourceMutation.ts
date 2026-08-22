export function normalizeNewResourceName(value: string): string | undefined {
  const name = value.trim();
  if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\") || name.includes("\0")) {
    return undefined;
  }
  return name;
}
