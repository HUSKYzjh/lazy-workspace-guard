# HPC Lazy Explorer 阶段二：通用化产品计划

## 定位

将阶段一针对单个 HPC 项目的文件监听治理方案，发展为可供科研、机器学习、数据工程和远程开发用户安装的通用 VS Code 扩展。

产品暂定名：**Large Workspace Guard for VS Code**。

核心承诺：识别超大目录、降低 Remote-SSH 文件监听和搜索开销、保留按需打开文件的能力；不删除用户文件、不上传目录清单、不创建新的递归 watcher。

## 目标用户

| 用户群 | 高风险目录 | 典型问题 |
|---|---|---|
| HPC 科研用户 | 计算输出、轨迹、checkpoint、Slurm 日志 | Remote-SSH 卡顿、fileWatcher OOM |
| 机器学习用户 | datasets、runs、wandb、缓存 | 语言服务与搜索扫描大量产物 |
| 数据工程用户 | parquet 分区、ETL 输出、临时数据 | 网络文件系统元数据访问缓慢 |
| 大型代码仓库用户 | node_modules、build、vendor、生成代码 | 编辑源码时资源管理器和搜索变慢 |
| 远程存储用户 | NFS、Lustre、Ceph、SMB、SSHFS | 递归扫描增加延迟及元数据服务器压力 |

## 功能目标

### 1. 大目录风险检测

- 首次启动向导仅枚举工作区顶层及受限深度目录；
- 显示目录大小、估算文件数、文件系统类型及风险等级；
- 不执行全树 `find` 或预扫描；
- 对可疑目录提供“排除监听”“保持监听”“稍后决定”。

### 2. 排除规则与白名单

插件可以以用户确认的方式修改以下工作区设置：

- `files.watcherExclude`：停止自动监听文件变化，降低 VS Code watcher 内存；
- `search.exclude`：禁止“在文件中查找”递归扫描指定目录；
- `python.analysis.exclude`：可选，防止 Python/Pylance 分析训练结果、数据和缓存。

白名单目录保持原生 VS Code 的自动刷新；排除目录不会被插件递归监听。所有变更均预览 JSON diff，且可一键还原插件写入的规则。

### 3. 懒加载目录浏览器

- 在 Explorer 侧栏提供 `HPC Lazy Explorer` 自定义 Tree View；
- 根目录和子目录默认折叠；
- 仅在用户展开节点时读取该目录的直接子项；
- 点击文件以正常 VS Code 编辑器打开；
- 支持当前节点刷新、分页、名称过滤和“在终端中打开”；
- 不注册 `FileSystemWatcher`，不进行递归目录枚举。

这不是替换原生 Explorer，而是为被排除的大目录提供低开销的按需访问通道。

### 4. 模板与推荐规则

内置、可编辑并需用户确认的规则模板：

- 通用 HPC：`results`、`output`、`scratch`、`logs`、archive；
- DeepMD / ML 势：训练轮次、模型 checkpoint、训练日志、数据缓存；
- VASP / QE / CP2K：计算输出、波函数、轨迹、临时文件；
- Python / Jupyter：`.venv`、`.conda`、`__pycache__`、Notebook checkpoint；
- Node / Rust / Java：`node_modules`、`target`、`build`、`dist`、`vendor`；
- 数据工程：分区数据、下载、缓存、临时目录。

## 白名单设计边界

目标体验是：用户常编辑的代码、模板目录及其子目录保持自动刷新；大训练/测试目录采用懒加载。

由于 VS Code 原生 `files.watcherExclude` 是静态 glob 设置，插件无法可靠实现“资源管理器展开时自动取消排除、折叠时重新排除”。第一版采用稳定策略：

1. 用户选择需长期排除的顶层目录；
2. 用户选择需保持监听的顶层目录；
3. 插件仅写入精确排除规则，白名单目录不写入排除；
4. 懒加载视图负责访问排除目录；
5. 若用户想临时实时刷新某目录，可在插件中启用短时、仅单目录的刷新模式，并设置超时自动关闭。

## 技术方案

### 扩展运行与 API

- 使用稳定 VS Code Extension API；
- 声明 `extensionKind: ["workspace"]`，确保 Remote-SSH 下目录操作运行在远端；
- `vscode.window.createTreeView` / `registerTreeDataProvider`：自定义树；
- `vscode.workspace.fs.readDirectory(uri)`：展开时读取直接子项；
- `vscode.workspace.openTextDocument(uri)` 与 `showTextDocument`：正常打开文件；
- `workspace.getConfiguration().update(...)`：合并、写入工作区设置；
- `onDidChangeTreeData`：仅在用户主动刷新时更新视图。

禁止调用 `vscode.workspace.createFileSystemWatcher`，避免插件自身新增监听负担。

### 设置写入安全

- 默认在工作区 `.vscode/settings.json` 写入，允许用户改选 Remote User 作用域；
- 合并对象键，不覆盖用户已有 `files.watcherExclude` 或 `search.exclude`；
- 保存插件管理规则清单，撤销时只删除这些条目；
- 写入前展示 diff；
- 写入后提示执行 `Developer: Reload Window` 以重建核心 watcher。

## 版本路线图

### M2.1：通用 MVP（2–3 周）

- 目录排除/白名单选择；
- `files.watcherExclude`、`search.exclude`、可选 Python 排除规则的预览、应用与还原；
- 懒加载 Tree View、文件打开、当前节点刷新；
- Remote-SSH 与本地工作区测试；
- 中文、英文基础界面。

### M2.2：检测与模板（2 周）

- 限深目录风险扫描与文件数估算；
- 通用 HPC、Python、Node、数据工程模板；
- 首次使用向导；
- 规则冲突检测、恢复建议及设置备份提示。

### M2.3：发布质量（2–3 周）

- Linux/NFS、Remote-SSH、WSL、Dev Container 测试矩阵；
- 目录分页、取消、超时和大目录错误处理；
- 单元测试、端到端测试、性能基准、CI；
- 隐私说明、使用文档、Issue 模板；
- 发布 VSIX，之后发布至 VS Code Marketplace 与可选 Open VSX。

## 用户流程

1. 用户在本地或 Remote-SSH 打开项目；
2. 插件提示发现可能的超大目录；
3. 用户选择“排除监听”或“保持监听”；
4. 插件展示 settings.json 差异；
5. 用户确认，插件写入规则并提示重载窗口；
6. 用户在原生 Explorer 中处理白名单目录；
7. 用户在 HPC Lazy Explorer 中按需查看、展开和打开被排除目录的文件。

## 验收标准

- 大工作区应用规则后，`fileWatcher` 内存较无规则基线下降至少 70%；
- 不重新纳入全树监听也能打开排除目录中的任意文件；
- 白名单目录外部文件变更可自动反映；
- 插件自身不进行全树扫描、不创建递归 watcher；
- 规则撤销后用户原有 settings.json 内容不被破坏；
- 对项目目录、共享盘和远程 URI 的失败情形给出清晰提示。

## 隐私、开源与发布

- 默认不联网、不上传文件名、代码内容、目录路径、集群身份或进程信息；
- 可选导出由用户主动发起的匿名诊断摘要；
- 推荐 MIT 许可证，公开源代码和无敏感数据的压力测试仓库；
- 社区贡献重点放在规则模板、远程文件系统兼容性和性能复现案例。

## 发布前决策门槛

只有在下列条件满足后才进入 Marketplace 发布：

1. 已在真实 HPC 项目验证能显著降低 watcher 内存；
2. 设置写入、规则合并、撤销和异常恢复均有自动化测试；
3. 不依赖未稳定的 VS Code API；
4. 已验证插件不会重新创建导致 OOM 的递归 watcher；
5. 文档明确说明：自定义懒加载树是原生 Explorer 的低开销补充，而非完全替代。
