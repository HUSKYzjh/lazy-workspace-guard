# VS Code Remote-SSH 大文件树内存问题：情况说明与插件规划

## 1. 背景与问题确认

在 HPC 登录节点通过 VS Code Remote-SSH 打开项目
`/home/zhaijiahui/workdir_wlu-liushi/zhaijiahui/DP/BiFeO3` 后，远端
`.vscode-server` 的 Node 进程出现数 GiB 内存占用，并触发 OOM 风险。

已完成的对照验证表明：

- 空工作区中，`fileWatcher` 稳定在约 60 MiB；
- 原项目中 `fileWatcher` 可增长到约 1 GiB；
- 原先还同时存在两个远程工作区会话，导致两个 watcher 各自占用接近 1 GiB；
- 项目顶层 `11_train` 约有 669,744 个文件，`14_test` 约有 38,349 个文件；整个项目约 71.7 万个文件。

结论：根因是 VS Code 对超大训练/测试结果目录进行递归文件监听、搜索和语言服务索引，而不是 HPC 节点总内存不足。

## 2. 现有内置设置与局限

VS Code 可用以下工作区设置降低开销：

```json
{
  "files.watcherExclude": {
    "**/11_train/**": true,
    "**/14_test/**": true,
    "**/10_data/**": true
  },
  "search.exclude": {
    "**/11_train/**": true,
    "**/14_test/**": true,
    "**/10_data/**": true
  },
  "python.analysis.exclude": [
    "**/11_train/**",
    "**/14_test/**",
    "**/10_data/**"
  ]
}
```

其中：

- `files.watcherExclude` 停止自动监听文件变化，减少 Remote-SSH watcher 内存；
- `search.exclude` 禁止“在文件中查找”递归扫描指定目录；
- `python.analysis.exclude` 防止 Python/Pylance 索引这些目录。

但内置 Explorer 不能按“用户当前展开的目录”动态控制监听范围；它的文件监听是工作区级行为。直接将大目录排除后，文件仍可手动打开，但目录中的外部新文件不会自动显示，需要刷新。

## 3. 插件目标

开发一个远程优先的 VS Code 扩展，暂定名为 **HPC Lazy Explorer**。

目标是在不递归扫描或监听超大目录树的前提下，提供接近资源管理器的按需浏览体验：

1. 自动维护 `files.watcherExclude`、`search.exclude` 与可选的 `python.analysis.exclude`；
2. 通过白名单保留少量活动目录的自动刷新；
3. 对不在白名单中的大目录，只有在用户展开时才读取该目录的直接子项；
4. 点击文件可用 VS Code 的普通编辑器打开；
5. 不创建递归 `FileSystemWatcher`，避免重新引入内存问题。

## 4. 白名单与排除策略

### 4.1 白名单定义

白名单包含：

- 当前在原生资源管理器中打开并被标记为“活动”的目录；
- 用户主动添加的目录；
- 上述目录的所有下级目录。

白名单目录允许被 `files.watcherExclude` 排除规则的例外覆盖，因此可自动刷新。

### 4.2 默认行为

默认将工作区中所有目录视为不监听，再将白名单目录从排除项中移除。概念配置为：

```text
默认：排除工作区中的大目录/规则匹配目录
白名单：不排除 selected-path/**
```

需要注意：VS Code 的设置合并规则和 glob 优先级不能稳定表达“先排除全部、再精确反排除”的通用逻辑。因此首个版本采用更安全的策略：

- 用户选择需要排除的顶层目录（如 `11_train`、`14_test`）；
- 用户选择需要监听的顶层目录（如 `05_templates`、`01_docs`）；
- 插件生成精确的目录规则，而不是写入过宽的 `**/*` 全局规则。

这能保留白名单目录的原生自动刷新，同时避免误关闭源码目录的监听。

### 4.3 建议初始规则

对 BiFeO3 项目，初始排除候选：

- `11_train`
- `14_test`
- `10_data`
- `13_logs`
- `00_archive_pre_rebuild_20260624`

建议监听白名单：

- `01_docs`
- `03_reference`
- `05_templates`
- `06_relax`
- `07_aimd`
- `08_single_point`
- `09_convergence`

是否监听 `12_models`、`02_QA` 与 `04_structures` 由用户根据实际编辑频率决定。

## 5. 功能规划

### MVP（第一版）

1. **HPC Lazy Explorer 侧栏**
   - 作为 Explorer 内的自定义 Tree View；
   - 根目录由用户选择；
   - 目录初始折叠；只在展开节点时调用 `workspace.fs.readDirectory()` 读取直接子项；
   - 不预扫描、不递归枚举、不注册 `FileSystemWatcher`。

2. **文件操作**
   - 单击或双击文件：以普通 VS Code 文本编辑器打开；
   - 支持“在终端中打开此目录”；
   - 支持“刷新当前节点”和“刷新已展开节点”。

3. **规则管理**
   - 右键目录：`加入监听白名单`、`从监听白名单移除`；
   - 右键目录：`从搜索中排除`、`取消搜索排除`；
   - 预览即将写入 `.vscode/settings.json` 的差异；
   - 用户确认后修改工作区级 `files.watcherExclude`、`search.exclude`，可选修改 `python.analysis.exclude`。

4. **安全措施**
   - 不覆盖用户已有的设置对象，只合并插件管理的规则；
   - 记录插件写入的规则，卸载或“还原”时仅撤销这些规则；
   - 对超过设定阈值的目录显示提示，例如“该目录含大量文件，建议保持排除”。

### 第二版

- 目录文件数估算与热区报告；
- 基于规则模板的一键配置（DeepMD/VASP/CP2K/LAMMPS）；
- 快捷搜索：仅搜索白名单或当前展开的子树；
- 可选的目录级短时刷新：用户打开目录后，在限定时间内轮询该目录的直接子项；
- 导入/导出项目规则。

## 6. 技术实现

### 6.1 运行位置

扩展应声明为远端工作区扩展：

```json
"extensionKind": ["workspace"]
```

这样在 Remote-SSH 场景中逻辑运行于 HPC 上，目录枚举和文件打开使用远端文件系统 URI，不需要把文件列表传回本地后再处理。

### 6.2 核心 API

- `vscode.window.createTreeView` / `registerTreeDataProvider`：提供自定义树；
- `vscode.workspace.fs.readDirectory(uri)`：按展开节点读取直接子项；
- `vscode.workspace.openTextDocument(uri)` 与 `vscode.window.showTextDocument`：正常打开文件；
- `vscode.workspace.getConfiguration().update(...)`：合并、写入工作区设置；
- `onDidChangeTreeData`：仅在用户手动刷新时更新树。

扩展不调用 `vscode.workspace.createFileSystemWatcher`。核心 VS Code Explorer 的 watcher 也不能由扩展按展开状态重新配置，因此大目录必须通过 `files.watcherExclude` 排除。

### 6.3 规则写入原则

插件为每个管理目录生成精确 glob，例如：

```json
"files.watcherExclude": {
  "**/11_train/**": true,
  "**/14_test/**": true
}
```

白名单目录不写入排除规则，保持 VS Code 原生 watcher 与自动刷新。若目录同时处于“排除”和“白名单”，以白名单为准，插件删除该目录对应的排除项并提示用户重载窗口。

## 7. 用户流程

1. 用户在 Remote-SSH 中打开项目；
2. 打开 `HPC Lazy Explorer`；
3. 插件展示顶层目录、文件计数估算和建议；
4. 用户将 `11_train`、`14_test` 标记为“懒浏览/排除监听”；
5. 用户将常改的代码、模板目录标记为“监听白名单”；
6. 插件预览并应用设置变更；
7. 用户执行 `Developer: Reload Window`；
8. 后续通过自定义树按需展开训练结果目录，点击文件仍可正常打开。

## 8. 验收标准

- 打开含数十万文件的项目后，`fileWatcher` 内存不再增长至 GiB 级；
- 监听白名单目录中的外部文件变更能够自动反映；
- 排除目录可在 HPC Lazy Explorer 中按需展开、打开文件；
- 插件不执行递归 `find`、全量 `readDirectory` 或全树文件监听；
- 修改/还原设置不会破坏原有 VS Code 设置。

## 9. 风险与边界

- 无法让原生 Explorer 仅监听展开目录；这是 VS Code 核心机制的边界；
- 若在排除目录中依赖 Git 状态、Pylance 分析或全局搜索，相关体验会受限；
- 目录初次展开仍可能因单目录子项极多而变慢，应提供分页/最大显示条数；
- 修改工作区设置前应总是显示差异并征得用户确认。

## 10. 推荐执行顺序

1. 先手动配置 `11_train`、`14_test` 的 watcher/search 排除规则，立即缓解 OOM；
2. 实现 MVP 的懒加载浏览器与规则管理；
3. 在实际 DeepMD 项目上测试 watcher 内存、目录展开速度和设置还原；
4. 再加入模板、一键规则和目录统计功能。
