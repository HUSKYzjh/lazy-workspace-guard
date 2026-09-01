# Lazy Workspace Guard / 惰性工作区守卫

Browse a huge Remote-SSH directory **without opening it as a VS Code workspace**. The lazy tree reads only direct children you expand; it does not recursively scan the target or add a file watcher.

## English

Install **[Lazy Workspace Guard](https://marketplace.visualstudio.com/items?itemName=hpc-tools.lazy-workspace-guard)** from Marketplace. This single entry-point Suite installs and places two components automatically:

| Component | Extension ID | Host |
| --- | --- | --- |
| Remote Core | `hpc-tools.lazy-workspace-guard-remote-core` | Remote-SSH host |
| Local Bridge | `hpc-tools.lazy-workspace-guard-local-bridge` | Local VS Code client |

Connect with Remote-SSH but leave the large target unopened. Run **Browse Remote Directory Safely**, enter an absolute path, and expand only the folders needed. Right-click files to open, compare, copy paths/URIs/contents, or copy a local-config-aware `scp` download command. Local Bridge uses `ssh -G` on your own computer; it never reads private-key contents or sends local SSH configuration to the remote host.

See the detailed bilingual Marketplace guide in [packages/lazy-workspace-guard/README.md](packages/lazy-workspace-guard/README.md) and the [architecture note](docs/architecture.md).

## 中文

请从 Marketplace 安装 **Lazy Workspace Guard / 惰性工作区守卫**。这是唯一需要安装的入口 Suite；VS Code 会自动安装并放置两个组件：远端核心运行在 `SSH: <主机>`，本机桥接运行在 `Local`。

通过 Remote-SSH 连接主机后，不要对大型目标目录执行“打开文件夹”。运行 **安全浏览远程目录**，输入绝对路径，只展开需要查看的目录。文件右键菜单可打开、比较、复制路径/URI/内容，也能生成结合本机 SSH 配置的 `scp` 下载命令。本机桥接仅在你的电脑上运行 `ssh -G`，不会读取私钥内容，也不会把本机 SSH 配置发送给远端。

完整中英双语安装、操作、诊断和安全边界说明见 [packages/lazy-workspace-guard/README.md](packages/lazy-workspace-guard/README.md)。

## Development / 开发

Run `npm ci`, then `npm run compile`, `npm run lint`, `npm test`, and `npm run test:integration`. `npm run package:all` builds the three VSIX packages; press `F5` to debug Remote Core. Package sources are in `packages/`; product plans and architecture are in `docs/`.
