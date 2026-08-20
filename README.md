# Lazy Workspace Guard

Lazy Workspace Guard is a Remote-SSH-friendly VS Code extension for huge workspaces. It offers a lazy Explorer view that reads only the directory a user expands, while helping users exclude selected folders from VS Code file watching and text search.

## What it does

- Lists workspace folders without recursively scanning them.
- Reads only direct children when a tree item is expanded.
- Opens files with VS Code's ordinary editor.
- Adds precise, reversible `files.watcherExclude` and `search.exclude` rules for selected folders.
- Never creates a `FileSystemWatcher`.

## Development

```sh
npm install
npm run compile
npm run lint
npm test
```

Press `F5` in VS Code to launch an Extension Development Host. In the Explorer, open **Lazy Workspace Guard**, then right-click a folder to exclude it from watching and search. Use the view's restore action to remove only rules added by the extension.

## Safety

Rules are managed per workspace folder and are only written after the user invokes the explicit exclusion command. The extension leaves pre-existing settings untouched and does not collect or transmit directory data.
