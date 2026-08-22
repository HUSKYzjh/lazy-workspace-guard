import * as vscode from "vscode";
import { serializeExclusionSettings, type ExclusionPlan } from "./settingsPlan";
import { t } from "./i18n";

const previewScheme = "lazy-workspace-guard-settings";
const maximumPreviewDocuments = 20;

export class SettingsPreviewProvider implements vscode.TextDocumentContentProvider, vscode.Disposable {
  private readonly content = new Map<string, string>();

  public async show(plan: ExclusionPlan): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const before = vscode.Uri.parse(`${previewScheme}:/${id}/before.json`);
    const after = vscode.Uri.parse(`${previewScheme}:/${id}/after.json`);
    this.content.set(before.toString(), serializeExclusionSettings(plan.before));
    this.content.set(after.toString(), serializeExclusionSettings(plan.after));
    this.trimPreviews();

    await vscode.commands.executeCommand(
      "vscode.diff",
      before,
      after,
      plan.action === "exclude"
        ? t("exclusionPreviewTitle", plan.glob)
        : t("inclusionPreviewTitle", plan.glob),
      { preview: true }
    );
  }

  public provideTextDocumentContent(uri: vscode.Uri): string {
    return this.content.get(uri.toString()) ?? "";
  }

  public dispose(): void {
    this.content.clear();
  }

  private trimPreviews(): void {
    while (this.content.size > maximumPreviewDocuments * 2) {
      const firstKey = this.content.keys().next().value;
      if (!firstKey) {
        return;
      }
      this.content.delete(firstKey);
    }
  }
}
