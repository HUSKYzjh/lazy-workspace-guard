# Security and Privacy

## English

Lazy Workspace Guard runs in the VS Code Extension Host. In a Remote-SSH window, that host runs on the connected remote machine and uses the permissions of the connected SSH account.

The extension stores only its safe-root absolute paths and the selected sort mode in VS Code extension storage. It does not send telemetry, collect credentials, or make network requests to third-party services. Safe remote listing invokes a bounded, non-recursive command on the already connected Linux host. The diagnostic export intentionally omits workspace paths.

The optional **SSH Bridge** is a separate local UI extension. It reads only literal `Host` aliases from the configured local SSH config file and writes an `ssh <alias>` command to the local clipboard. It never reads private-key contents, executes SSH, transmits config content or config-file paths to the remote extension, or resolves `Match exec` rules. Its remembered mapping contains only the remote machine name and selected alias.

Context-menu actions can read, create, rename, or delete remote resources. Copy File Contents reads at most 1 MiB of UTF-8 text into the clipboard. Creating and renaming never overwrite an existing target. Folder deletion is recursive and asks the remote provider to use a trash location when available; some remote filesystems may delete permanently. Confirm the shown path before approving deletion.

Report a suspected vulnerability through the repository's private security-advisory channel when available. Do not include passwords, private keys, access tokens, hostnames, or sensitive file paths in a public issue.

## 中文

惰性工作区守卫运行于 VS Code Extension Host；在 Remote-SSH 窗口中，该进程运行在已连接的远程机器上，并使用当前 SSH 账户的权限。

插件仅在 VS Code 扩展存储中保存安全根的绝对路径和所选排序方式；不会发送遥测数据、收集凭据或向第三方服务发起网络请求。安全远程列举只会在已连接的 Linux 主机上执行有界、非递归命令；导出的诊断报告刻意不包含工作区路径。

可选的 **SSH 桥接**是独立的本机 UI 扩展。它只从已配置的本机 SSH config 中读取字面量 `Host` 别名，并将 `ssh <别名>` 命令写入本机剪贴板；不会读取私钥内容、执行 SSH、把 config 内容或 config 文件路径传输给远端扩展，也不会解析可能执行本机命令的 `Match exec` 规则。其记忆映射只包含远端机器名和用户选择的别名。

右键菜单可读取、新建、重命名或删除远程资源。“复制文件内容”最多将 1 MiB UTF-8 文本读入剪贴板。新建和重命名不会覆盖已有目标。删除文件夹会递归删除其内容，并请求远端在支持时使用回收站；部分远程文件系统仍可能永久删除。确认前请仔细核对显示的路径。

发现疑似安全漏洞时，请优先使用仓库的私密安全公告渠道（如已启用）。不要在公开 Issue 中提交密码、私钥、访问令牌、主机名或敏感路径。
