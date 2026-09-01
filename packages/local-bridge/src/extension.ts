import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import * as vscode from "vscode";
import { t } from "./i18n";
import {
  buildResolvedScpDownloadCommand,
  buildResolvedSshCommand,
  normalizeHostAlias,
  parseEffectiveSshConfiguration,
  parseSshHostAliases,
  type EffectiveSshConfiguration
} from "./sshConfig";

const profileStorageKey = "sshProfilesByRemoteMachine";
const execFileAsync = promisify(execFile);

interface ProfileRequest {
  remoteMachineName?: string;
  action?: "ssh" | "download";
  remotePath?: string;
}

interface SshProfile {
  alias: string;
}

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "lazyWorkspaceGuardLocalBridge.copyProfile",
      async (request?: ProfileRequest): Promise<SshProfile | undefined> => {
        const remoteMachineName = getRemoteMachineName(request);
        const configFile = getConfigFile();
        const defaultConfigFile = join(homedir(), ".ssh", "config");
        const savedProfiles = context.globalState.get<Record<string, string>>(profileStorageKey, {});
        const savedAlias = normalizeHostAlias(savedProfiles[remoteMachineName]);
        if (savedAlias) {
          return copyProfile(savedAlias, configFile, defaultConfigFile, request);
        }

        const aliases = await readAliases(configFile);
        const alias = await pickAlias(aliases, remoteMachineName);
        if (!alias) {
          return undefined;
        }

        await context.globalState.update(profileStorageKey, { ...savedProfiles, [remoteMachineName]: alias });
        return copyProfile(alias, configFile, defaultConfigFile, request);
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

async function copyProfile(
  alias: string,
  configFile: string,
  defaultConfigFile: string,
  request: ProfileRequest | undefined
): Promise<SshProfile> {
  const configuration = await readEffectiveConfiguration(alias, configFile, defaultConfigFile);
  const result = request?.action === "download" && request.remotePath
    ? buildResolvedScpDownloadCommand(alias, configFile, defaultConfigFile, request.remotePath, configuration)
    : buildResolvedSshCommand(alias, configFile, defaultConfigFile, configuration);
  await vscode.env.clipboard.writeText(result.command);
  void vscode.window.showInformationMessage(
    result.usesConfigFallback ? t("commandCopiedConfigFallback", result.command) : t("commandCopied", result.command)
  );
  return { alias };
}

/**
 * Resolves the selected alias only in the local UI extension host. `ssh -G`
 * performs no network connection; it lets OpenSSH apply Include, Host, and
 * Match rules before a compact explicit command is copied to the clipboard.
 */
async function readEffectiveConfiguration(
  alias: string,
  configFile: string,
  defaultConfigFile: string
): Promise<EffectiveSshConfiguration | undefined> {
  const args = ["-G"];
  if (configFile !== defaultConfigFile) {
    args.push("-F", configFile);
  }
  args.push(alias);
  try {
    const { stdout } = await execFileAsync("ssh", args, {
      windowsHide: true,
      timeout: 5000,
      maxBuffer: 1024 * 1024
    });
    return parseEffectiveSshConfiguration(stdout);
  } catch {
    // A config-backed command remains correct when OpenSSH is unavailable or
    // a complex directive cannot be evaluated on the local client.
    return undefined;
  }
}
