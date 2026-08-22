# Lazy Workspace Guard

## English

Lazy Workspace Guard safely browses very large local and Remote-SSH directories without adding them to the VS Code workspace. Its tree reads only the direct children of an expanded node and never creates a file watcher.

Release information: [CHANGELOG](CHANGELOG.md), [security and privacy](SECURITY.md), [support](SUPPORT.md), and the maintainer [release checklist](RELEASE_CHECKLIST.md).

### Safe Remote Browsing

In an empty Linux Remote-SSH window, open the extension and run **Browse Remote Directory Safely**. Enter an absolute path, for example `/home/zhaijiahui/`. Completion lists up to 100 matching direct child directories. The extension applies the prefix filter itself, so candidates remain visible even though the typed path contains `/` characters. Choose a candidate to complete the path, then choose **Browse**.

Directory symbolic links are included and labelled. Expanding one follows only that selected link as the listing root; it does not recursively follow child links. Added roots are saved in extension storage and restored for future sessions on the same remote extension installation. Use the root's trash action to remove a saved path.

The command refuses to run if a workspace folder is open. It does not call **Open Folder**, add a workspace folder, or open a folder picker. For safe roots, every listing is a bounded, non-recursive server-side `find` operation.

### Sorting, Diagnostics, and Settings

Use the title-bar gear icon to choose server order or folders-first name order. The selected mode is saved in remote extension storage and automatically restored after reloads and later sessions on that remote installation. Safe remote sorting applies only to the loaded page. The Diagnostics view reports shared Extension Host memory and this extension's lazy-read counters; it cannot report native Explorer or core file-watcher memory.

The extension can add explicit, reversible `files.watcherExclude`, `search.exclude`, and optional `python.analysis.exclude` rules for a selected workspace subfolder. It never creates `workspace.createFileSystemWatcher`.

### First Remote-SSH Session

1. Connect to the target using **Remote-SSH: Connect to Host**. Do **not** use **Open Folder** for the large directory; the native Explorer should still say that no folder is open.
2. In Extensions, ensure Lazy Workspace Guard is installed under the `SSH: <host>` target, then run **Developer: Reload Window** once after installation or update.
3. Open the **Lazy Workspace Guard** view and select the folder icon in its title bar, or run **Browse Remote Directory Safely** from the Command Palette.
4. Enter an absolute remote path such as `/home/user/project/`. Select a completion if useful, then select **Browse**. Adding it creates a saved safe root, not a VS Code workspace folder.
5. Expand only the folders you need. Right-click files or non-root folders for open, copy, compare, terminal, and guarded file-management actions.

### Safety, Recovery, and Feedback

- The safe-root trash action removes only the saved entry from this view. It never deletes the remote directory.
- The **Delete** action is different: it changes the remote filesystem and may be permanent if that filesystem has no supported trash. The confirmation dialog shows the target path; verify it before confirming.
- If **Browse Remote Directory Safely** is missing, install or enable the extension on the remote `SSH: <host>` target, then reload the window. If no completion appears, type a valid absolute Linux path ending in `/`; candidates are deliberately limited to one bounded page.
- For a pre-release report, include the extension and VS Code versions, whether Remote-SSH is active, and a redacted error. See [SUPPORT.md](SUPPORT.md).

### Context Menu

The custom lazy tree cannot reuse VS Code's native Explorer menu: native commands require a workspace-backed Explorer item, and some actions such as **Find in Folder** would recursively scan the target. Right-clicking a file provides **Open Resource**, **Open Resource to the Side**, **Open With…**, **Select for Compare**, **Compare with Selected**, **Open Timeline**, and **Copy File Contents**. Every resource also supports direct **Copy Name**, **Copy Remote Path**, **Copy Relative Path**, **Copy VS Code Remote URI**, **Copy SSH Location**, **Open Terminal Here**, and **Show Properties**; these read only the selected resource and never scan a directory. Content copying accepts UTF-8 text only and is limited to 1 MiB. Timeline delegates to enabled VS Code providers, such as Git, for the selected file.

Directories offer **New File** and **New Folder**. Files and non-root directories offer **Rename** and **Delete**. Names must be a single path segment; creation and renaming never overwrite an existing resource. Delete displays the exact path in a modal confirmation. Deleting a folder is recursive and requests the remote trash when available, so treat it as destructive. Safe roots and workspace roots cannot be renamed or deleted; the safe-root trash action only removes the saved path from this view. Workspace-only exclusion actions appear only for real workspace subfolders, never for safely browsed remote roots.

### Install and Verify

Install `lazy-workspace-guard-0.1.12.vsix` while connected to `SSH: <host>`, then run **Developer: Reload Window**. Confirm that the extension page shows version `0.1.12` under the remote target. Type `/home/` in the safe-browse dialog: direct child directories, such as `zhaijiahui`, should be visible.

For development:

```sh
npm ci
npm run compile
npm run lint
npm test
npm run test:integration
npm run package
```

---

# 惰性工作区守卫

## 中文

惰性工作区守卫用于安全浏览超大的本地或 Remote-SSH 目录，而不会将它们加入 VS Code 工作区。文件树只在用户展开节点时读取其直接子项，并且绝不创建文件监听器。

发布信息：[更新记录](CHANGELOG.md)、[安全与隐私](SECURITY.md)、[支持渠道](SUPPORT.md) 和维护者用的[发布检查清单](RELEASE_CHECKLIST.md)。

### 安全浏览远程目录

在未打开任何工作区的 Linux Remote-SSH 窗口中，打开本扩展并运行**安全浏览远程目录**。输入绝对路径，例如 `/home/zhaijiahui/`。自动补全最多列出当前父目录中 100 个匹配的直接子目录。插件自行按路径前缀筛选，因此即使输入内容包含 `/`，候选项也不会被 VS Code 的名称筛选隐藏。选择候选项以补全路径，再选择“浏览”。

目标为目录的符号链接会被列出并标识。展开时只将用户选中的链接作为列举根目录，不会递归跟随其内部链接。已添加的根目录会保存到扩展存储，并在同一远程扩展安装后的后续会话中恢复；点击根目录的垃圾桶图标即可删除保存路径。

如果窗口已打开工作区文件夹，该命令会拒绝执行。它不会调用“打开文件夹”、不会添加工作区文件夹，也不会打开目录选择器。安全根目录始终使用服务端有界、非递归的 `find` 列举。

### 排序、诊断与设置

使用标题栏齿轮图标选择服务器返回顺序或“文件夹优先”的名称排序。所选方式会保存到远程扩展存储中，并在重载窗口及该远程安装后的后续会话中自动恢复。安全远程模式只排序当前已加载页。诊断视图展示共享 Extension Host 内存和本扩展的惰性读取指标；VS Code 未公开原生 Explorer 或核心文件监听器的内存数据。

用户可以对选定工作区子文件夹明确添加、并可还原 `files.watcherExclude`、`search.exclude` 和可选的 `python.analysis.exclude` 规则。本扩展绝不创建 `workspace.createFileSystemWatcher`。

### 首次 Remote-SSH 使用

1. 使用“**Remote-SSH: Connect to Host**”连接目标主机。不要对大型目录使用“打开文件夹”；原生 Explorer 仍应显示“尚未打开文件夹”。
2. 在扩展视图确认惰性工作区守卫已安装在 `SSH: <主机>` 目标下；首次安装或更新后执行一次“**开发人员：重新加载窗口**”。
3. 打开“**惰性工作区守卫**”视图，点击标题栏的文件夹图标；或在命令面板运行“**安全浏览远程目录**”。
4. 输入远程绝对路径，例如 `/home/用户名/项目目录/`。可选择候选项补全，然后选择“浏览”。加入的是保存的安全根，不是 VS Code 工作区文件夹。
5. 只展开当前需要的目录。右键文件或非根文件夹可执行打开、复制、比较、终端和受保护的文件管理操作。

### 安全、恢复与反馈

- 安全根的垃圾桶操作只会从本视图移除保存记录，绝不会删除远程目录。
- “删除”操作则会修改远程文件系统；若该文件系统不支持回收站，删除可能不可恢复。确认框会显示目标路径，确认前务必核对。
- 若找不到“安全浏览远程目录”，请确认插件已安装/启用于远程 `SSH: <主机>` 目标，然后重载窗口。若没有补全候选项，请输入以 `/` 开始并以 `/` 结尾的有效 Linux 绝对路径；候选项有意限制在一个有界页面内。
- 提交预发布反馈时，请提供插件和 VS Code 版本、是否在 Remote-SSH 环境及脱敏后的错误信息。详见 [SUPPORT.md](SUPPORT.md)。

### 右键菜单

自定义惰性树不能直接复用 VS Code 原生 Explorer 菜单：原生命令要求对象属于工作区 Explorer，而“在文件夹中查找”等操作还会递归扫描目标目录。右键单击文件会提供：**打开资源**、**在侧边打开资源**、**打开方式…**、**选择以进行比较**、**与已选项比较**、**打开时间线**和**复制文件内容**。所有资源还直接提供**复制名称**、**复制远程路径**、**复制相对路径**、**复制 VS Code 远程 URI**、**复制 SSH 地址**、**在此处打开终端**和**查看属性**；它们只操作所选资源，不会扫描目录。复制内容仅接受 UTF-8 文本，且上限为 1 MiB。时间线会交由已启用的 VS Code 提供程序（例如 Git）处理所选文件。

右键单击文件夹可使用**新建文件**和**新建文件夹**；文件和非根文件夹可使用**重命名**与**删除**。名称必须是单个路径片段；新建和重命名都不会覆盖已有资源。删除前会在模态确认框中显示准确路径。删除文件夹会递归删除其中的内容，并在远程端支持时请求使用回收站，因此仍应视为破坏性操作。安全根和工作区根不可重命名或删除；安全根的垃圾桶操作仅将保存的路径从本视图移除。排除规则操作仅对真正的工作区子目录显示，绝不会显示在安全浏览的远程根目录中。

### 安装与验证

在连接 `SSH: <主机>` 时安装 `lazy-workspace-guard-0.1.12.vsix`，然后执行“开发人员：重新加载窗口”。确认扩展页面在远程目标下显示版本 `0.1.12`。在安全浏览对话框输入 `/home/` 后，应能看到 `zhaijiahui` 等直接子目录。

开发命令：

```sh
npm ci
npm run compile
npm run lint
npm test
npm run test:integration
npm run package
```
