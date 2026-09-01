import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import * as vscode from "vscode";
import { t } from "./i18n";
import { buildSshCommand, normalizeHostAlias, parseSshHostAliases } from "./sshConfig";

const profileStorageKey = "sshProfilesByRemoteMachine";

interface ProfileRequest {
  remoteMachineName?: string;
}

interface SshProfile {
  alias: string;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lazyWorkspaceGuardSshBridge.copyProfile",
      async (request?: ProfileRequest): Promise<SshProfile | undefined> => {
        const remoteMachineName = getRemoteMachineName(request);
        const configFile = getConfigFile();
        const defaultConfigFile = join(homedir(), ".ssh", "config");
        const savedProfiles = context.globalState.get<Record<string, string>>(profileStorageKey, {});
        const savedAlias = normalizeHostAlias(savedProfiles[remoteMachineName]);
        if (savedAlias) {
          return copyProfile(savedAlias, configFile, defaultConfigFile);
        }

        const aliases = await readAliases(configFile);
        const alias = await pickAlias(aliases, remoteMachineName);
        if (!alias) {
          return undefined;
        }

        await context.globalState.update(profileStorageKey, { ...savedProfiles, [remoteMachineName]: alias });
        return copyProfile(alias, configFile, defaultConfigFile);
      }
    )
  );
}

export function deactivate(): void {}

function getRemoteMachineName(request: ProfileRequest | undefined): string {
  const supplied = request?.remoteMachineName?.trim();
  return supplied && !/[\r\n]/.test(supplied) ? supplied : "manual";
}

function getConfigFile(): string {
  const configured = vscode.workspace.getConfiguration("remote.SSH").get<unknown>("configFile");
  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }
  return join(homedir(), ".ssh", "config");
}

async function readAliases(configFile: string): Promise<string[]> {
  try {
    return parseSshHostAliases(await readFile(configFile, "utf8"));
  } catch {
    return [];
  }
}

async function pickAlias(aliases: string[], remoteMachineName: string): Promise<string | undefined> {
  const manualLabel = t("manualAliasLabel");
  const choice = await vscode.window.showQuickPick(
    [
      ...aliases.map((alias) => ({ label: alias, description: t("sshConfigHostDescription") })),
      { label: manualLabel, description: t("manualAliasDescription") }
    ],
    {
      title: t("selectProfileTitle", remoteMachineName),
      placeHolder: t("selectProfilePlaceholder")
    }
  );
  if (!choice) {
    return undefined;
  }
  if (choice.label !== manualLabel) {
    return normalizeHostAlias(choice.label);
  }
  const input = await vscode.window.showInputBox({
    title: t("enterAliasTitle"),
    placeHolder: t("aliasPlaceholder"),
    prompt: t("enterAliasPrompt"),
    validateInput: (value) => normalizeHostAlias(value) ? undefined : t("aliasInvalid")
  });
  return normalizeHostAlias(input);
}

async function copyProfile(alias: string, configFile: string, defaultConfigFile: string): Promise<SshProfile> {
  const command = buildSshCommand(alias, configFile, defaultConfigFile);
  await vscode.env.clipboard.writeText(command);
  void vscode.window.showInformationMessage(t("commandCopied", command));
  return { alias };
}
