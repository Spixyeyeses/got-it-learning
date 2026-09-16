# 学会啦 · Got It Learning

[English](README.md)

通过微课、练习、学习记录、成就和限时游戏，让学习更有动力。这个独立仓库为现有浏览器程序补充了开发、检查和打包工具，支持本机网页与 Windows 桌面程序两种运行方式。

原程序的 **96 个应用文件按字节原样保留在 `web/`**。题库、积分、游戏规则和既有功能没有重写；原有问题也记录下来，留待单独修复。原始程序包仍可保留在原位置，这个仓库拥有独立的 Git 历史。

## 本机网页运行

安装 **Node.js 24 LTS**，在本仓库目录执行：

```sh
npm ci
npm start
```

打开 **http://127.0.0.1:4173**。运行期间保持终端开启，按 Ctrl+C 停止。该命令先构建网页文件，再启动仅供本机访问的服务器。请一直使用同一地址：浏览器按来源（包含端口）分别保存数据。

启动桌面开发版：

```sh
npm run desktop
```

它将同一网页程序放入 Electron 窗口运行，内部地址为 **http://127.0.0.1:4174**，学习记录可在下次启动时继续使用。请确保 4174 端口未被其他程序占用。

## 构建 Windows 程序

在 Windows x64 上执行 `npm ci` 后运行：

```sh
npm run build:win
```

`dist/desktop/` 中会生成免安装 `.exe` 和 NSIS 安装程序。学生电脑运行这些程序**不需要安装 Node.js**。首次安装依赖与构建需要联网下载 Electron 和打包工具。

目前生成的程序**没有代码签名**，Windows 可能显示发布者或 SmartScreen 提示。代码签名属于后续发布工作；本仓库没有自动更新服务，也不会自动上传或发布。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm start` | 构建网页并在本机 4173 端口运行。 |
| `npm run desktop` | 构建并启动 Electron 桌面开发版。 |
| `npm run build:web` | 生成 `dist/web/` 静态网页文件。 |
| `npm run build:data` | 修改 JSON 后重新生成内嵌题库和课程完整性信息。 |
| `npm test` | 运行自动化测试。 |
| `npm run check` | 运行仓库检查。 |
| `npm run verify:original` | 根据原始文件哈希检查 `web/` 是否仍与原包一致。 |
| `npm run build:win` | 生成 Windows x64 免安装程序和安装程序。 |
| `npm run test:e2e` | 用 Playwright 测试构建后的网页。 |
| `npm run test:desktop` | 测试 Electron 和重启后的进度保存。 |

以后有意修改应用文件时，`verify:original` 出现差异是正常的。原始哈希清单用于追溯，不应为了消除差异而重写。开发流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

网页测试前先执行 `npm run build:web` 与 `npx playwright install chromium`；Windows 上也支持已安装的 Edge。桌面测试使用独立的模拟用户存储，不影响日常存档。设置 `GOT_IT_EXECUTABLE` 为打包后的程序路径可测试构建产物。仓库已配置 GitHub Actions，用于检查并构建两种版本，但不会发布 GitHub Release。每次提交的远程构建是否成功，以对应的工作流结果为准。

## 目录与可编辑内容

| 目录 | 内容 |
| --- | --- |
| `web/` | 可直接修改的 HTML、CSS、JavaScript、题库和素材。 |
| `desktop/` | Electron 桌面程序封装。 |
| `tools/` | 构建、本机服务器和检查工具。 |
| `tests/` | 自动化测试。 |
| `docs/` | 架构、限制、来源和权利说明。 |
| `dist/web/` | 生成的网页文件，不提交到 Git。 |
| `dist/desktop/` | 生成的 Windows 程序，不提交到 Git。 |

现有内容包括数学、英语、科学、一年级数学试验课程、错题订正、复习计划、本机报告、15 个成就称号和 11 款可见游戏。默认启用课程共包含 4,860 道有效题目；沿用原规则，2 积分兑换 1 分钟游戏时间。

这是一份可维护的源码仓库。修改 `web/` 后重新构建即可验证效果，无需重写成其他框架。依赖和构建产物不属于源文件。

## 数据和功能边界

学习数据保存在本机浏览器存储中。网页、桌面程序和原来直接打开的 HTML 使用不同的存储环境，**不会自动迁移已有进度**。桌面数据位于 `%APPDATA%/GotItLearning`；仅移动免安装 `.exe` 不会同时移动这些数据。

“隐私与数据”页面可导出 JSON 学习档案，但当前程序**没有对应的学习档案恢复/导入入口**。“安装正式课程包”导入的是课程内容，不是学生存档。若旧程序或浏览器中已有需要保留的记录，请继续保留它们。

云端账号、同步、好友和排行榜依赖 8787 端口的服务，交付包中没有该服务的源码。远程 AI 地址为空，目前使用本机规则提示；在线游戏匹配已停用。本次新增的静态服务器与桌面封装不提供这些缺失服务。详见 [已知限制](docs/known-limitations.md) 和 [架构说明](docs/architecture.md)。

## GitHub 与发布

[开发仓库](https://github.com/Spixyeyeses/got-it-learning)为私有仓库。源码与修改历史通过 Git 管理，`node_modules/` 与 `dist/` 不提交到 Git。Windows 免安装程序、安装程序与 SHA-256 校验文件作为 [Release 草稿](https://github.com/Spixyeyeses/got-it-learning/releases)附件，供维护者审核和下载；查看草稿需要相应的仓库权限。

构建命令与 CI 不会自动推送提交或发布版本。正式发布 Release 草稿需要单独执行。

原包没有提供整个项目的开源许可证。既有声明已保留，其中课程包明确写有未授予再分发权利；公开分享前需要由项目所有者确认发布权利。详见 [第三方与原有权利声明](docs/THIRD_PARTY_NOTICES.md)。

已执行的检查与验证范围见 [验证记录](docs/verification.md)。
