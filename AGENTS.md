# Repository Guidelines

## Project Structure & Scope

This is a three-package VS Code extension repository:

- `packages/lazy-workspace-guard/` is the public Suite and installation guide.
- `packages/remote-core/` runs on the Remote-SSH extension host; its source and tests are in `src/` and `src/test/`.
- `packages/local-bridge/` runs on the local UI extension host and resolves local OpenSSH configuration.
- `docs/` contains product plans and architecture notes; `.vscode/` launches Remote Core. `out/` and `node_modules/` are generated and must not be committed.

## Development & Verification

Run `npm run compile` to transpile both runtime packages, `npm run lint` for ESLint, `npm test` for the Node unit suites, and `npm run test:integration` for the Remote Core Extension Development Host suite. Run `npm run package:all` to build all three VSIX files. Press `F5` to launch Remote Core.

For planning-only changes, preview the Markdown in VS Code and verify that headings, JSON examples, paths, and cross-references are accurate. Keep claims about VS Code APIs and Remote-SSH behavior tied to the relevant design document.

## Documentation and Coding Style

Write concise Markdown with `#`/`##` headings, fenced JSON or shell examples, and backticks for paths, settings, commands, and APIs. Use descriptive package names: `lazy-workspace-guard` (Suite), `lazy-workspace-guard-remote-core`, and `lazy-workspace-guard-local-bridge`.

TypeScript uses two-space indentation, `camelCase` for variables/functions, `PascalCase` for classes and exported types, and scoped command IDs. Localize manifest strings through each package's `package.nls*.json` and runtime strings through `src/i18n.ts`. Remote Core must avoid recursive scans and `workspace.createFileSystemWatcher`; directory reads remain lazy and non-recursive.

## Testing Expectations

Add tests with each implementation feature. Cover settings-rule merge/restore behavior, whitelist/exclusion conflicts, lazy single-directory expansion, pagination, and remote URI error handling. Include a manual Remote-SSH check using a large fixture; verify that no recursive watcher is created and excluded files still open normally.

## Commits & Pull Requests

Recent history uses short Chinese summaries plus Conventional Commit-style prefixes such as `docs:` and `refactor:`. Use an imperative, scoped subject, for example `docs: clarify lazy browser acceptance criteria` or `feat: add lazy tree provider`.

PRs should explain the user-visible change, link related issues or planning sections, list validation performed, and include screenshots for Tree View or settings-diff UI changes. Call out any change that writes workspace settings or affects file-watching behavior.
