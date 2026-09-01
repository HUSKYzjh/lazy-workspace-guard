# Lazy Workspace Guard / 惰性工作区守卫

Safely inspect a very large local or Remote-SSH directory **without opening it as a VS Code workspace**. The custom tree reads only the direct children that you expand; it never creates a file watcher or performs a recursive scan.

> **Preview** — Please report problems with a redacted error message and your VS Code/Remote-SSH versions in [SUPPORT.md](SUPPORT.md).

- [English](#english)
- [中文](#中文)
- [Changelog](CHANGELOG.md) · [Security & privacy](SECURITY.md) · [Release notes](RELEASE_CHECKLIST.md)

---

# English

## Is this for you?

Use this extension when a large directory could make the native Explorer, search, or file watching expensive. It is designed for an already connected **Linux Remote-SSH** window with **no workspace folder open**. It does not replace the native Explorer for ordinary projects.

## Install

1. Connect using **Remote-SSH: Connect to Host**. Do not open the large directory with **File: Open Folder**.
2. Install the extension under the `SSH: <host>` target, not only under Local.
3. Run **Developer: Reload Window** after installing or updating.
4. The three-step **Getting Started** walkthrough appears after installation. Reopen it with **Getting Started: Open Walkthrough** and select *Lazy Workspace Guard*.

For a VSIX build, install `lazy-workspace-guard-0.1.16.vsix` while the Remote-SSH window is active.

## First safe browse

1. Confirm the native Explorer says that no folder is open.
2. Open **Lazy Workspace Guard** in Explorer, then click its folder icon; alternatively run **Browse Remote Directory Safely** from the Command Palette.
3. Enter an absolute Linux path, such as `/home/user/project/`.
4. Select a suggested direct child directory when useful, then choose **Browse**.
5. Expand only the directories needed for the current task.

The entered path becomes a saved *safe root*, not a workspace folder. Saved roots and the selected sorting mode are restored on later sessions **for that Remote-SSH host only**. Roots stored by older releases are deliberately not migrated because they have no reliable host identity; add a root once again on each host. Use the root trash icon only to remove that saved entry.

### Completion and symbolic links

After an absolute path ending in `/`, the dialog offers at most 100 matching direct child directories. The extension applies prefix matching itself, so `/` in the query does not hide entries. If there are no suggestions, the typed path can still be browsed if it exists and is a directory.

Directory symbolic links appear with a label. Expanding one follows only that selected link as a listing root; nested links are not followed recursively.

## What the view can do

| Task | How | Scope |
| --- | --- | --- |
| Sort entries | Title-bar gear | Server order or folders-first name order; remembered per remote installation |
| Inspect cost | **Lazy Workspace Guard: Diagnostics** | Shared Extension Host memory and bounded read counters |
| Open and compare | File context menu | Open, Open to the Side, Open With, select/compare, Timeline |
| Copy data | Resource context menu | Name, remote/relative path, a VS Code remote link, a ready-to-run `ssh <host>` command, UTF-8 text contents (up to 1 MiB) |
| Work in a shell | **Open Terminal Here** | Opens a terminal at the selected resource location |
| Manage files | Context menu | Create file/folder, rename, delete after confirmation |

The custom tree cannot reuse every native Explorer command: some VS Code commands require a workspace-backed item, while actions such as **Find in Folder** could recursively scan the target.

### Sharing a resource location

**Copy VS Code Remote Link** copies a `vscode-remote://…` URI for the exact selected file or directory. Paste it into Markdown, an issue, or a message so a collaborator who is already connected to the **same Remote-SSH host** can open it from VS Code. It does not establish an SSH connection and is not a shell command. Use **Copy SSH Command** for a terminal-ready `ssh <host>` command and **Copy Remote Path** for the path after connecting.

## Safety model

- Lazy listings use bounded, non-recursive server-side reads. The extension never calls `workspace.createFileSystemWatcher`.
- **Remove saved root** only removes the stored path from this view. It never deletes the remote directory.
- **Delete** modifies the remote filesystem. Folder deletion is recursive; remote trash is requested when supported, but treat it as potentially permanent. Read the full path in the confirmation dialog.
- New names and renamed names must be one path segment; the extension refuses to overwrite an existing resource.
- Workspace exclusion actions apply only to real workspace subfolders. They add reversible `files.watcherExclude`, `search.exclude`, and optional `python.analysis.exclude` rules; they do not apply to safe roots.

## Troubleshooting

| Problem | Check |
| --- | --- |
| Command is missing | Install/enable the extension under `SSH: <host>`, then reload the window. |
| Browse is refused | Close every workspace folder first; safe browse runs only in an empty Remote-SSH window. |
| No completion results | Use an existing absolute Linux path ending in `/`; results are deliberately limited to 100 direct directories. |
| Native Explorer shows the directory | It was opened as a workspace. Close the folder/window, reconnect with Remote-SSH, and use safe browse instead. |
| Need memory details | Open Diagnostics. VS Code does not expose native Explorer or core file-watcher memory through the extension API. |

## Development

```sh
npm ci
npm run compile
npm run lint
npm test
npm run test:integration
npm run package
```

---

# 中文

## 适用场景

惰性工作区守卫用于**不将目录作为 VS Code 工作区打开**的前提下，检查超大的本地或 Remote-SSH 目录。自定义文件树仅在展开节点时读取其直接子项，不创建文件监听器，也不进行递归扫描。

当大型目录会让原生资源管理器、搜索或文件监听占用较多资源时使用它。远程安全浏览仅面向：已经连接的 **Linux Remote-SSH** 窗口，且窗口内**没有打开工作区文件夹**。普通项目仍建议使用原生 Explorer。

## 安装与开始

1. 使用“**Remote-SSH: Connect to Host**”连接主机；不要对大型目录执行“文件：打开文件夹”。
2. 在扩展页确认插件安装在 `SSH: <主机>` 目标下，而非仅安装在 Local。
3. 首次安装或更新后，执行一次“**开发人员：重新加载窗口**”。
4. 安装后会显示三步“入门”引导；需要再次查看时，运行 **Getting Started: Open Walkthrough**，并选择“惰性工作区守卫”。

使用 VSIX 时，请在 Remote-SSH 窗口中安装 `lazy-workspace-guard-0.1.16.vsix`。

## 第一次安全浏览远程目录

1. 确认原生 Explorer 仍显示“尚未打开文件夹”。
2. 在 Explorer 打开“**惰性工作区守卫**”视图，点击标题栏的文件夹图标；也可在命令面板运行“**安全浏览远程目录**”。
3. 输入远程 Linux 绝对路径，例如 `/home/用户名/项目目录/`。
4. 有需要时选择候选目录补全路径，再选择“浏览”。
5. 只展开当前确实需要查看的文件夹。

加入的目录是保存的“安全根”，不是工作区文件夹。安全根和排序方式会按当前 **Remote-SSH 主机** 分开保存，后续连接同一主机时自动恢复。旧版本保存的根目录不迁移，因为无法可靠判断它属于哪个主机；请在每台主机上重新添加一次。根目录的垃圾桶图标只会移除这条保存记录。

### 自动补全与符号链接

输入以 `/` 结尾的绝对路径后，插件至多显示 100 个匹配的直接子目录，并自行按前缀过滤，因此输入内容中的 `/` 不会让 VS Code 隐藏候选项。没有候选项时，只要输入路径存在且是目录，仍可直接选择“浏览”。

指向目录的符号链接会显示标识。展开后只将该链接本身作为列举根目录，不会递归跟随内部的其他链接。

## 常用功能

| 目标 | 操作方式 | 说明 |
| --- | --- | --- |
| 更改排序 | 标题栏齿轮 | 服务器顺序或“文件夹优先”的名称排序；会自动记忆 |
| 了解开销 | “惰性工作区守卫：诊断” | 查看共享 Extension Host 内存和有界读取计数 |
| 打开和比较 | 文件右键菜单 | 打开、侧边打开、打开方式、选择/与已选项比较、时间线 |
| 复制信息 | 资源右键菜单 | 名称、远程/相对路径、VS Code 远程链接、可直接运行的 `ssh <主机别名>` 命令、文件内容（UTF-8，最多 1 MiB） |
| 在终端操作 | “在此处打开终端” | 在所选资源所在位置打开终端 |
| 管理远程文件 | 右键菜单 | 新建文件/文件夹、重命名、确认后删除 |

惰性树不能照搬全部原生 Explorer 菜单：部分 VS Code 命令要求对象属于工作区 Explorer，“在文件夹中查找”等命令还可能递归扫描目标目录。

### 分享资源位置

“**复制 VS Code 远程链接**”会复制当前文件或目录的精确 `vscode-remote://…` URI。可将它粘贴到 Markdown、Issue 或聊天中；已经连接到**同一 Remote-SSH 主机**的协作者可在 VS Code 中打开该链接。它不会建立 SSH 连接，也不是终端命令。终端中直接连接主机请使用“**复制 SSH 命令**”得到 `ssh <主机别名>`；连接成功后需要路径时请使用“**复制远程路径**”。

## 安全边界

- 目录列举始终是有界、非递归的服务端读取；插件绝不调用 `workspace.createFileSystemWatcher`。
- “移除保存的根目录”只会从本视图删除存储路径，绝不删除远程目录。
- “删除”会修改远程文件系统。文件夹删除是递归的；即便远程端支持回收站，也应视为可能不可恢复。确认前请核对对话框中的完整路径。
- 新建和重命名仅接受单个路径片段，且不会覆盖已有资源。
- 排除规则只对真正的工作区子目录提供；它们可逆地写入 `files.watcherExclude`、`search.exclude` 和可选的 `python.analysis.exclude`，不会作用于安全根目录。

## 排障

| 现象 | 处理方法 |
| --- | --- |
| 找不到命令 | 确认插件已安装/启用于 `SSH: <主机>`，然后重载窗口。 |
| 命令拒绝执行 | 关闭所有工作区文件夹；安全浏览只允许在空的 Remote-SSH 窗口运行。 |
| 没有补全候选项 | 输入存在、以 `/` 开头并以 `/` 结尾的 Linux 绝对路径；候选项有意最多 100 个。 |
| 原生 Explorer 出现大目录 | 该目录已经作为工作区打开。关闭文件夹/窗口，重新用 Remote-SSH 连接后再使用安全浏览。 |
| 希望查看内存 | 打开“诊断”。VS Code 扩展 API 不提供原生 Explorer 或核心文件监听器的内存数据。 |

提交反馈时，请附上 VS Code 与插件版本、是否通过 Remote-SSH 运行，以及脱敏后的错误信息；详见 [SUPPORT.md](SUPPORT.md)。

## 开发

```sh
npm ci
npm run compile
npm run lint
npm test
npm run test:integration
npm run package
```
