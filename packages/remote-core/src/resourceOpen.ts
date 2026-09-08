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
 * Ask the Files Explorer contribution for its native "Open With..." picker.
 * It accepts the selected resource directly and discovers installed image,
 * notebook, hex, and custom editors itself. This avoids undocumented
 * active-editor commands and never reads a binary resource as text.
 */
export async function openResourceWithEditorPicker(
  executeCommand: ExecuteCommand,
  resource: unknown
): Promise<void> {
  await executeCommand("explorer.openWith", resource);
}
