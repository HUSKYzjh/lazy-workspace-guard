import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

interface PackageManifest {
  activationEvents: string[];
  contributes: {
    commands: Array<{ command: string; title: string; icon?: string }>;
    views: Record<string, Array<{ id: string; name: string }>>;
    menus: Record<string, Array<{ command?: string; submenu?: string; when?: string; group?: string }>>;
  };
}

function readJson<T>(filename: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, "../..", filename), "utf8")) as T;
}

test("declares both tree views and localizes their commands", () => {
  const manifest = readJson<PackageManifest>("package.json");
  const english = readJson<Record<string, string>>("package.nls.json");
  const chinese = readJson<Record<string, string>>("package.nls.zh-cn.json");
  const viewIds = manifest.contributes.views.explorer.map((view) => view.id);

  assert.deepEqual(viewIds, ["lazyWorkspaceGuard.explorer", "lazyWorkspaceGuard.diagnostics"]);
  for (const command of manifest.contributes.commands) {
    const key = command.title.match(/^%(.+)%$/)?.[1];
    assert.ok(key, `Command ${command.command} must use a localized title.`);
    assert.ok(english[key], `English localization is missing ${key}.`);
    assert.ok(chinese[key], `Chinese localization is missing ${key}.`);
  }
});

test("keeps localized context-menu labels compact", () => {
  const english = readJson<Record<string, string>>("package.nls.json");
  const chinese = readJson<Record<string, string>>("package.nls.zh-cn.json");

  for (const dictionary of [english, chinese]) {
    for (const [key, value] of Object.entries(dictionary)) {
      if (key.startsWith("command.")) {
        assert.doesNotMatch(value, /^(Lazy Workspace Guard:|惰性工作区守卫：)/);
      }
    }
  }
  assert.equal(english["submenu.copyAddress"], undefined);
  assert.equal(chinese["submenu.copyAddress"], undefined);
});

test("uses compact themed icons for tree view toolbar commands", () => {
  const manifest = readJson<PackageManifest>("package.json");
  const icons = new Map(manifest.contributes.commands.map((command) => [command.command, command.icon]));

  assert.deepEqual(
    Object.fromEntries(
      [
        "lazyWorkspaceGuard.browseRemoteDirectory",
        "lazyWorkspaceGuard.refresh",
        "lazyWorkspaceGuard.restoreManagedRules",
        "lazyWorkspaceGuard.applyRuleTemplate",
        "lazyWorkspaceGuard.configureSort",
        "lazyWorkspaceGuard.refreshDiagnostics",
        "lazyWorkspaceGuard.resetDiagnostics",
        "lazyWorkspaceGuard.exportDiagnostics"
      ].map((command) => [command, icons.get(command)])
    ),
    {
      "lazyWorkspaceGuard.browseRemoteDirectory": "$(folder-opened)",
      "lazyWorkspaceGuard.refresh": "$(refresh)",
      "lazyWorkspaceGuard.restoreManagedRules": "$(history)",
      "lazyWorkspaceGuard.applyRuleTemplate": "$(list-selection)",
      "lazyWorkspaceGuard.configureSort": "$(settings-gear)",
      "lazyWorkspaceGuard.refreshDiagnostics": "$(refresh)",
      "lazyWorkspaceGuard.resetDiagnostics": "$(debug-restart)",
      "lazyWorkspaceGuard.exportDiagnostics": "$(export)"
    }
  );
});

test("activates every contributed command explicitly", () => {
  const manifest = readJson<PackageManifest>("package.json");
  assert.ok(manifest.activationEvents.includes("onStartupFinished"));
  for (const command of manifest.contributes.commands) {
    assert.ok(
      manifest.activationEvents.includes(`onCommand:${command.command}`),
      `Command ${command.command} must have an explicit activation event.`
    );
  }
});

test("provides direct copy and guarded mutation context-menu actions", () => {
  const manifest = readJson<PackageManifest>("package.json");
  const items = manifest.contributes.menus["view/item/context"];
  const contextEntry = (command: string) => items.find((item) => item.command === command);

  for (const command of [
    "lazyWorkspaceGuard.copyResourcePath",
    "lazyWorkspaceGuard.copyResourceRelativePath",
    "lazyWorkspaceGuard.copyResourceUri",
    "lazyWorkspaceGuard.copySshLocation"
  ]) {
    assert.match(contextEntry(command)?.when ?? "", /SafeRemoteFolder/, `${command} must be directly available for safe remote resources.`);
  }
  assert.equal(items.some((item) => item.submenu), false);
  assert.equal(contextEntry("lazyWorkspaceGuard.excludeFromWatchers")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFolder");
  assert.equal(contextEntry("lazyWorkspaceGuard.includeFolder")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFolder");
  assert.equal(contextEntry("lazyWorkspaceGuard.openResourceToSide")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFile");
  assert.equal(contextEntry("lazyWorkspaceGuard.openResourceWith")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFile");
  assert.equal(contextEntry("lazyWorkspaceGuard.selectResourceForCompare")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFile");
  assert.match(contextEntry("lazyWorkspaceGuard.compareResourceWithSelected")?.when ?? "", /lazyWorkspaceGuard\.hasCompareSource/);
  assert.equal(contextEntry("lazyWorkspaceGuard.openResourceTimeline")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFile");
  assert.equal(contextEntry("lazyWorkspaceGuard.copyResourceContents")?.when, "view == lazyWorkspaceGuard.explorer && viewItem == resourceFile");
  assert.match(contextEntry("lazyWorkspaceGuard.copyResourceName")?.when ?? "", /SafeRemoteFolder/);
  assert.match(contextEntry("lazyWorkspaceGuard.openResourceTerminal")?.when ?? "", /SafeRemoteFolder/);
  assert.match(contextEntry("lazyWorkspaceGuard.showResourceProperties")?.when ?? "", /SafeRemoteFolder/);
  assert.match(contextEntry("lazyWorkspaceGuard.createResourceFile")?.when ?? "", /resource\(SafeRoot\|WorkspaceFolder\|Folder\|SafeRemoteFolder\)/);
  assert.match(contextEntry("lazyWorkspaceGuard.createResourceDirectory")?.when ?? "", /resource\(SafeRoot\|WorkspaceFolder\|Folder\|SafeRemoteFolder\)/);
  assert.match(contextEntry("lazyWorkspaceGuard.renameResource")?.when ?? "", /resource\(Folder\|SafeRemoteFolder\|File\)/);
  assert.match(contextEntry("lazyWorkspaceGuard.deleteResource")?.when ?? "", /resource\(Folder\|SafeRemoteFolder\|File\)/);
});

test("ships every compiled runtime module imported by the extension", () => {
  const packagingAllowlist = readFileSync(resolve(__dirname, "../..", ".vscodeignore"), "utf8");

  for (const runtimeModule of [
    "out/directorySort.js",
    "out/resourceMutation.js",
    "CHANGELOG.md",
    "SECURITY.md",
    "SUPPORT.md",
    "RELEASE_CHECKLIST.md",
    "assets/lazy-workspace-guard-icon.png"
  ]) {
    assert.ok(
      packagingAllowlist.includes(`!${runtimeModule}`),
      `${runtimeModule} must be included in the VSIX runtime allowlist.`
    );
  }
});

test("defines release metadata, a prepublish build, and public release documents", () => {
  const manifest = readJson<{
    license: string;
    icon: string;
    pricing: string;
    galleryBanner: { color: string; theme: string };
    scripts: Record<string, string>;
  }>("package.json");

  assert.equal(manifest.license, "MIT");
  assert.equal(manifest.icon, "assets/lazy-workspace-guard-icon.png");
  const icon = readFileSync(resolve(__dirname, "../..", manifest.icon));
  assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "Marketplace icon must be a PNG.");
  assert.ok(icon.readUInt32BE(16) >= 128 && icon.readUInt32BE(20) >= 128, "Marketplace icon must be at least 128×128.");
  assert.equal(manifest.pricing, "Free");
  assert.match(manifest.galleryBanner.color, /^#[0-9a-f]{6}$/i);
  assert.equal(manifest.galleryBanner.theme, "dark");
  assert.equal(manifest.scripts["vscode:prepublish"], "npm run compile");
  for (const filename of [
    "CHANGELOG.md",
    "SECURITY.md",
    "SUPPORT.md",
    "RELEASE_CHECKLIST.md",
    "assets/lazy-workspace-guard-icon.png"
  ]) {
    assert.ok(existsSync(resolve(__dirname, "../..", filename)), `${filename} must be present for a public release.`);
  }
});
