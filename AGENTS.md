# Repository Guidelines

## Project Structure & Scope

This directory currently contains product and technical planning documents for a VS Code extension that safely browses very large local or Remote-SSH workspaces:

- `VS Code Remote-SSH 大文件树内存问题：情况说明与插件规划.md` records the problem, MVP, API choices, and acceptance criteria.
- `HPC Lazy Explorer 阶段二—通用化产品计划.md` describes the broader product roadmap and release requirements.

There is no implementation, package manifest, test suite, or build configuration yet. When code is introduced, keep the conventional extension layout: `src/` for TypeScript, `test/` for tests, `.vscode/` for workspace/debug configuration, and `docs/` for user-facing design material. Do not mix generated output with plans.

## Development & Verification

No build or test commands are defined at present. Before adding commands to documentation or CI, confirm them from `package.json`; likely extension commands will include `npm run compile`, `npm run lint`, and `npm test`.

For planning-only changes, preview the Markdown in VS Code and verify that headings, JSON examples, paths, and cross-references are accurate. Keep claims about VS Code APIs and Remote-SSH behavior tied to the relevant design document.

## Documentation and Coding Style

Write Markdown with concise Chinese prose, `#`/`##` heading hierarchy, fenced blocks for JSON or shell examples, and backticks for file paths, settings keys, commands, and APIs. Preserve existing Chinese filenames; use descriptive filenames rather than abbreviations.

Future TypeScript should use two-space indentation, `camelCase` for variables/functions, `PascalCase` for classes and exported types, and descriptive command IDs such as `hpcLazyExplorer.refreshNode`. The extension must avoid recursive scans and `workspace.createFileSystemWatcher`; directory reads should be lazy and non-recursive.

## Testing Expectations

Add tests with each implementation feature. Cover settings-rule merge/restore behavior, whitelist/exclusion conflicts, lazy single-directory expansion, pagination, and remote URI error handling. Include a manual Remote-SSH check using a large fixture; verify that no recursive watcher is created and excluded files still open normally.

## Commits & Pull Requests

Recent history uses short Chinese summaries plus Conventional Commit-style prefixes such as `docs:` and `refactor:`. Use an imperative, scoped subject, for example `docs: clarify lazy browser acceptance criteria` or `feat: add lazy tree provider`.

PRs should explain the user-visible change, link related issues or planning sections, list validation performed, and include screenshots for Tree View or settings-diff UI changes. Call out any change that writes workspace settings or affects file-watching behavior.
