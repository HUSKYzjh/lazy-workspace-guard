import * as path from "node:path";
import { runTests } from "@vscode/test-electron";

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, "../../..");
  const extensionTestsPath = path.resolve(__dirname, "suite/index.js");

  await runTests({
    version: "1.85.0",
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ["--disable-workspace-trust"]
  });
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
