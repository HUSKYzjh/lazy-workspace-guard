# Changelog

All notable changes to Lazy Workspace Guard are documented here.

## 0.1.17 — 2026-09-01

- Use the remote machine name to isolate saved data when VS Code exposes only the generic `ssh-remote` provider name.
- Prompt once for the SSH alias when VS Code does not expose it, then copy a usable `ssh <alias>` command for that remote server.

## 0.1.16 — 2026-09-01

- Isolated saved safe roots and directory sorting per Remote-SSH host, preventing paths from one HPC from appearing on another.
- Replaced **Copy SSH Location** with **Copy SSH Command**, which copies a terminal-ready `ssh <host>` command.
- Renamed **Copy VS Code Remote URI** to **Copy VS Code Remote Link** and documented that it shares an exact resource link for VS Code users already connected to the same host.

## 0.1.15 — 2026-08-31

- Fixed the VSIX runtime allowlist so the binary-aware editor-opening module is included and the remote extension host can activate.
- Added a packaging test that verifies every direct runtime module imported by the extension entry point is shipped.

## 0.1.14 — 2026-08-31

- Fixed resource opening to delegate binary files, including images, to VS Code's registered editor.
- Fixed **Open With…** to display VS Code's native editor picker after opening the selected resource.

## 0.1.13 — 2026-08-23

- Added a localized three-step in-product Getting Started walkthrough for safe Remote-SSH browsing.
- Reworked the bilingual README into an installation, first-use, feature, safety, and troubleshooting guide.
- Enlarged the Marketplace icon artwork while retaining its transparent background.

## 0.1.12 — 2026-08-22

Initial public-preview release.

- Added a bilingual lazy tree for local and Remote-SSH directories.
- Added safe remote roots that are stored locally and restored per remote extension installation.
- Added bounded directory pages, path completion, persisted sorting, and diagnostics.
- Added guarded context-menu operations: open, compare, timeline, copy, create, rename, and delete.
- Added reversible workspace watcher/search exclusion rules and exclusion templates.
- Added Marketplace metadata, a PNG icon, release documentation, and a packaging prepublish check.
- Added a three-step in-product Getting Started walkthrough for safe Remote-SSH browsing.

## 中文说明

### 0.1.17 — 2026-09-01

- 当 VS Code 只暴露通用的 `ssh-remote` 提供程序名称时，使用远程机器名隔离保存的数据。
- 当 VS Code 未暴露 SSH 别名时，首次复制会要求输入一次别名，随后为该远程服务器复制可用的 `ssh <别名>` 命令。

### 0.1.16 — 2026-09-01

- 按 Remote-SSH 主机隔离保存的安全根目录与排序方式，避免一个 HPC 的路径显示在另一个 HPC 中。
- 将“复制 SSH 地址”改为“复制 SSH 命令”，现在会复制可直接在终端运行的 `ssh <主机别名>` 命令。
- 将“复制 VS Code 远程 URI”改为“复制 VS Code 远程链接”，并说明它用于向已连接同一主机的 VS Code 用户分享精确资源位置。

### 0.1.15 — 2026-08-31

- 修复 VSIX 运行时白名单：包含二进制文件打开模块，使远程扩展主机能够正常激活。
- 增加打包测试，确保扩展入口直接导入的每个运行时模块都会随包发布。

### 0.1.14 — 2026-08-31

- 修复资源打开：二进制文件（包括图片）现在交由 VS Code 已注册的编辑器处理。
- 修复“打开方式…”：打开选中资源后显示 VS Code 原生编辑器选择器。

### 0.1.13 — 2026-08-23

- 增加中英文本地化的三步扩展内“入门”引导，用于安全浏览 Remote-SSH 目录。
- 重新编排双语 README，提供安装、首次使用、功能、安全边界和排障说明。
- 放大 Marketplace 图标主体，同时保留透明背景。

### 0.1.12 — 2026-08-22

首个公开预览版本。

- 提供中英双语的本地与 Remote-SSH 惰性目录树。
- 支持按远程扩展安装保存和恢复安全远程根目录。
- 提供有界分页、路径补全、记忆排序和诊断视图。
- 提供受保护的打开、比较、时间线、复制、新建、重命名和删除右键菜单。
- 提供可还原的工作区监听/搜索排除规则及模板。
- 补充 Marketplace 元数据、PNG 图标、发布文档和打包前编译检查。
- 增加三步的扩展内“入门”引导，帮助安全浏览 Remote-SSH 目录。
