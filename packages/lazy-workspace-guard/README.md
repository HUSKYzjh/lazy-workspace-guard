# Lazy Workspace Guard / 惰性工作区守卫

Safely inspect a huge Remote-SSH directory **without opening it as a VS Code workspace**. The custom Explorer reads only the direct children that you expand; it never recursively scans the target or creates a file watcher.

> **Preview** — Please report problems with a redacted error message and your VS Code and Remote-SSH versions in [SUPPORT.md](https://github.com/HUSKYzjh/lazy-workspace-guard/blob/main/packages/remote-core/SUPPORT.md).

- [English](#english)
- [中文](#中文)
- [Architecture](#architecture--安全边界)

## English

### Install

Install **Lazy Workspace Guard** from Marketplace. It is the single public entry point and automatically installs two matching components:

| Component | Runs on | What it does |
| --- | --- | --- |
| **Lazy Workspace Guard Remote Core** | Remote-SSH extension host | Provides the lazy tree, diagnostics, and guarded file actions. |
| **Lazy Workspace Guard Local Bridge** | Local VS Code client | Resolves your local OpenSSH profile and copies usable `ssh`/`scp` commands. |

In **Extensions**, check that Remote Core is enabled under `SSH: <host>` and Local Bridge is enabled under `Local`. VS Code chooses the host automatically; do not manually configure an HPC as a "core" or "bridge" machine.

### First safe browse

1. Connect with **Remote-SSH: Connect to Host**. Do **not** use **File: Open Folder** for the huge target directory.
2. Confirm native Explorer still says no folder is open.
3. Open Explorer and select **Browse Remote Directory Safely** from the Lazy Workspace Guard title bar or Command Palette.
4. Enter an absolute remote path, such as `/home/user/project`. Choose a suggested direct child to complete the path, then select **Browse**.
5. Expand only the directories you need. The saved root appears again in later sessions on the same remote host.

The tree supports opening files, opening to the side or with a selected editor, compare, timeline, copy contents, copy absolute/relative paths, copy a VS Code remote URI, create, rename, and delete. Destructive actions use VS Code confirmation. Binary files should be opened with an appropriate VS Code editor rather than copied as text.

### Local-config-aware SSH commands

Right-click a remote file and select **Copy SSH Download Command**; on a folder or file use **Copy SSH Location**. The first use asks Local Bridge to choose a local `~/.ssh/config` host alias. It runs local `ssh -G` and copies an explicit command with the effective host, user, port, identity file, and representable `ProxyJump` settings. The alias is remembered per remote host. Private-key contents are never read.

### Diagnostics and limits

Open **Lazy Workspace Guard: Diagnostics** to see extension-host memory and bounded read metrics. If a directory reaches the configured visible-entry limit, the extension warns once for that root and keeps paging results instead of attempting a huge list.

## 中文

### 安装

在 Marketplace 安装 **惰性工作区守卫 / Lazy Workspace Guard**。这是唯一需要用户安装的入口，它会自动安装两个协作组件：

| 组件 | 运行位置 | 职责 |
| --- | --- | --- |
| **惰性工作区守卫：远端核心** | `SSH: <主机>` 的远端扩展主机 | 提供按需文件树、诊断和受控文件操作。 |
| **惰性工作区守卫：本机桥接** | `Local` 本机 VS Code 客户端 | 读取本机 OpenSSH 配置并生成可用的 `ssh`/`scp` 命令。 |

在“扩展”页确认远端核心显示在 `SSH: <主机>` 并启用、本机桥接显示在 `Local` 并启用。VS Code 会自动决定组件位置；不需要、也不能手动指定哪台 HPC 是“核心”或“桥接”。

### 首次安全浏览

1. 使用 **Remote-SSH: Connect to Host** 连接主机；不要对大型目录执行 **文件：打开文件夹**。
2. 确认原生资源管理器仍显示“尚未打开文件夹”。
3. 在资源管理器的惰性工作区守卫标题栏点击 **安全浏览远程目录**，或从命令面板运行同名命令。
4. 输入远端绝对路径，例如 `/home/user/project`；可选择直接子目录候选来补全路径，然后选择“浏览”。
5. 只展开需要的目录。该根路径会保存在同一远端主机的后续会话中。

右键文件树可打开文件、在侧边或指定编辑器打开、比较、时间线、复制内容、复制绝对/相对路径和 VS Code 远程 URI，以及新建、重命名和删除。写入类操作由 VS Code 二次确认；二进制文件请使用合适的编辑器打开，不应作为文本复制。

### 依据本机 SSH 配置生成命令

右键远端文件选择 **复制 SSH 下载命令**；对目录或文件可选择 **复制 SSH 地址**。首次使用时，本机桥接会要求选择本机 `~/.ssh/config` 中的主机别名；它在本机运行 `ssh -G`，复制包含实际主机、用户、端口、密钥路径及可表达 `ProxyJump` 设置的命令。每个远端主机会记住已选别名，且绝不会读取私钥内容。

### 诊断与限制

打开 **惰性工作区守卫：诊断** 可查看扩展主机内存和有界目录读取指标。当目录达到可见条目上限时，插件会对该根目录只提醒一次，并继续以分页方式显示，不会尝试加载整个超大目录。

## Architecture / 安全边界

The Suite itself does not scan files. Remote Core has `extensionKind: ["workspace"]`; Local Bridge has `extensionKind: ["ui"]`. This division matches VS Code's Remote-SSH architecture: filesystem access stays remote, while private local SSH configuration stays local. The extension neither opens the selected path as a workspace nor creates a recursive watcher.

Suite 本身不扫描文件。远端核心采用 `extensionKind: ["workspace"]`，本机桥接采用 `extensionKind: ["ui"]`：文件系统访问留在远端，本机 SSH 配置留在本机。插件不会把选择的路径加入工作区，也不会建立递归文件监听。
