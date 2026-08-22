import { spawn } from "node:child_process";

export interface RemoteDirectoryEntry {
  name: string;
  type: number;
  isSymbolicLink: boolean;
}

export interface RemoteDirectoryPage {
  items: RemoteDirectoryEntry[];
  nextOffset: number | undefined;
}

export async function readPosixDirectoryPage(
  directoryPath: string,
  offset: number,
  maximumEntries: number
): Promise<RemoteDirectoryPage> {
  const normalizedOffset = Math.max(0, Math.floor(offset));
  const normalizedMaximum = Math.max(1, Math.floor(maximumEntries));

  return new Promise<RemoteDirectoryPage>((resolve, reject) => {
    const child = spawn(
      "find",
      // -H follows only a symbolic link supplied as the starting path. Child links
      // are not traversed, while a selected directory link can still be expanded.
      ["-H", directoryPath, "-mindepth", "1", "-maxdepth", "1", "-printf", "%f\\0%y\\0%Y\\0"],
      { shell: false, windowsHide: true }
    );
    const items: RemoteDirectoryEntry[] = [];
    let fields: Buffer[] = [];
    let pending = Buffer.alloc(0);
    let seen = 0;
    let hasMore = false;
    let stopped = false;
    let stderr = "";
    let settled = false;

    const fail = (error: Error): void => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    const stop = (): void => {
      if (!stopped) {
        stopped = true;
        child.kill();
      }
    };

    const consumeField = (field: Buffer): void => {
      if (stopped) {
        return;
      }
      fields.push(field);
      if (fields.length !== 3) {
        return;
      }
      const [name, type, targetType] = fields;
      fields = [];
      if (seen < normalizedOffset) {
        seen += 1;
        return;
      }
      if (items.length < normalizedMaximum) {
        const linkType = type.toString("utf8");
        items.push({
          name: name.toString("utf8"),
          type: fileTypeFromFind(linkType, targetType.toString("utf8")),
          isSymbolicLink: linkType === "l"
        });
        seen += 1;
        return;
      }
      hasMore = true;
      stop();
    };

    child.stdout.on("data", (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk]);
      let separator = pending.indexOf(0);
      while (separator >= 0) {
        consumeField(pending.subarray(0, separator));
        pending = pending.subarray(separator + 1);
        separator = pending.indexOf(0);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < 4096) {
        stderr += chunk.toString("utf8").slice(0, 4096 - stderr.length);
      }
    });
    child.once("error", (error) => fail(new Error(`Unable to start bounded directory listing: ${error.message}`)));
    child.once("close", (code) => {
      if (settled) {
        return;
      }
      if (!stopped && code !== 0) {
        fail(new Error(stderr || `Bounded directory listing failed with exit code ${code}.`));
        return;
      }
      settled = true;
      resolve({
        items,
        nextOffset: hasMore ? normalizedOffset + items.length : undefined
      });
    });
  });
}

export function fileTypeFromFind(type: string, symbolicLinkTargetType?: string): number {
  return type === "d" || (type === "l" && symbolicLinkTargetType === "d") ? 2 : 1;
}
