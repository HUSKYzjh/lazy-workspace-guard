import assert from "node:assert/strict";
import test from "node:test";
import { openResourceWithDefaultEditor, openResourceWithEditorPicker, type ExecuteCommand } from "../resourceOpen";

test("opens a resource through VS Code's binary-aware editor command", async () => {
  const calls: unknown[][] = [];
  const executeCommand: ExecuteCommand = async (command, ...arguments_) => {
    calls.push([command, ...arguments_]);
  };

  await openResourceWithDefaultEditor(executeCommand, "vscode-remote://image.png", {
    preview: true,
    viewColumn: 2
  });

  assert.deepEqual(calls, [[
    "vscode.open",
    "vscode-remote://image.png",
    { preview: true, viewColumn: 2 }
  ]]);
});

test("opens the native editor picker after opening the selected resource", async () => {
  const calls: unknown[][] = [];
  const executeCommand: ExecuteCommand = async (command, ...arguments_) => {
    calls.push([command, ...arguments_]);
  };

  await openResourceWithEditorPicker(executeCommand, "vscode-remote://image.png");

  assert.deepEqual(calls, [
    ["vscode.open", "vscode-remote://image.png", { preview: true }],
    ["workbench.action.reopenTextEditorWith"]
  ]);
});
