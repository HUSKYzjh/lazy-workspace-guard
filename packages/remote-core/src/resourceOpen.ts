export interface ResourceOpenOptions {
  preview: boolean;
  viewColumn?: number;
}

export type ExecuteCommand = (command: string, ...arguments_: unknown[]) => PromiseLike<unknown>;

/**
 * Delegate opening to VS Code instead of constructing a TextDocument ourselves.
 * `vscode.open` picks the registered editor for the resource, so images and other
 * binary files open in their native preview rather than failing in the text editor.
 */
export async function openResourceWithDefaultEditor(
  executeCommand: ExecuteCommand,
  resource: unknown,
  options: ResourceOpenOptions
): Promise<void> {
  await executeCommand("vscode.open", resource, options);
}

/**
 * Open through the default association first, then show VS Code's native editor
 * picker for the active resource. This keeps the picker aligned with installed
 * image, notebook, hex, and custom editors without enumerating them ourselves.
 */
export async function openResourceWithEditorPicker(
  executeCommand: ExecuteCommand,
  resource: unknown
): Promise<void> {
  await openResourceWithDefaultEditor(executeCommand, resource, { preview: true });
  await executeCommand("workbench.action.reopenTextEditorWith");
}
