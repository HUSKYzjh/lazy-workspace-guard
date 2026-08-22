# Release Checklist

## English

Before publishing a Marketplace version:

- [ ] Review [CHANGELOG.md](CHANGELOG.md), [SECURITY.md](SECURITY.md), and [SUPPORT.md](SUPPORT.md).
- [ ] Run `npm ci`, `npm run lint`, `npm test`, `npm run test:integration`, and `npm run package`.
- [ ] Install the generated VSIX in a real empty Linux Remote-SSH window and verify path completion, root persistence after reload, a symbolic-link directory, a permission failure, and a directory with more than 100 entries.
- [ ] Verify create, rename, and delete against disposable remote test files; verify the remote provider's trash behavior separately.
- [ ] Inspect the VSIX to confirm it contains only intended runtime files and public metadata.
- [ ] Commit all release changes, create a unique version and Git tag, and confirm the `hpc-tools` publisher account has publishing rights.
- [ ] Publish the first public build with `--pre-release`; never place Marketplace credentials in source control.

## 中文

发布 Marketplace 版本前：

- [ ] 检查 [CHANGELOG.md](CHANGELOG.md)、[SECURITY.md](SECURITY.md) 和 [SUPPORT.md](SUPPORT.md)。
- [ ] 运行 `npm ci`、`npm run lint`、`npm test`、`npm run test:integration` 和 `npm run package`。
- [ ] 在真实、未打开工作区的 Linux Remote-SSH 窗口安装生成的 VSIX，验证路径补全、重载后的根目录恢复、目录符号链接、权限错误以及超过 100 条目的目录。
- [ ] 在可丢弃的远程测试文件上验证新建、重命名和删除；单独确认远程提供方的回收站行为。
- [ ] 检查 VSIX，只允许预期的运行文件和公开元数据进入包内。
- [ ] 提交所有发布改动，创建唯一版本与 Git tag，并确认 `hpc-tools` Publisher 账户有发布权限。
- [ ] 首个公开构建使用 `--pre-release`；绝不将 Marketplace 凭据写入源代码管理。
