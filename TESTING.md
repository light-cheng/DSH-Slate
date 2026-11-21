# 测试基线与隔离验收报告

> **证据区分说明**：本文件同时记录两类材料——**本轮正式插件（`plugin/`）的新执行验收结果（`v1-*`）** 与 **早期原型阶段（`prototype-plugin/`）的历史基线**，两者严格区分，不以原型结果冒充正式实现验收。

## 隔离测试环境规范

正式插件（`plugin/`）的自动化端到端验收通过 `node plugin/scripts/e2e-dsh.mjs` 运行，严格遵守以下隔离边界：

- **宿主 CLI**：`/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`（`0.2.2-rc.5`）。
- **独立环境**：每次运行在 `.tmp/e2e-*` 下新建临时 `DSH_HOME`、全新 Profile（`slate-web` 与 `slate-headless`）及临时项目目录（`workspace-empty`、`workspace-bookstore`），通过 `link:` 仅挂载到临时 Profile。
- **零污染约束**：脚本启动前记录 `~/.dsh/profiles/desktop/package.json` 与 `~/.dsh/profiles/web/package.json` 的大小、修改时间与 SHA-256 哈希，结束后核对完全一致（`ac08IsolatedClean: true`）。
- **网络与模型**：临时 Web 服务绑定 `127.0.0.1`、随机空闲端口并传 `--no-open`；模型通过进程环境变量注入 `MAGPIE_GATEWAY_KEY` 使用 Magpie 默认 DeepSeek 路由组 `auto/deepseek-v4.1-flash`，凭据不落盘、不输出、不截图。
- **轮次清理**：结束时关闭浏览器与临时 DSH 服务进程，递归删除 `.tmp/e2e-*`。

## 正式实现测试执行结果（`plugin/` · 新执行）

### 1. 构建与单元 / 多进程并发测试（`cd plugin && npm run verify`）

- 客户端构建 `lib/client.js` 成功（`38624` bytes），语法解析与禁用原色（无绿/无蓝/无纸色）校验通过。
- `8/8` 自动化测试全部通过：
  - 空项目零计数与区块隐藏
  - `FR-04`：目标、验收标准、任务优先级/预估/下一交付物手动锁定防覆盖及「恢复会话汇报」立即还原
  - `FR-05` / `AC-04`：真实命令 `exitCode === 0` 通过验证；伪报通过当实际退出码非 0 时改判为 `failed`；无执行记录时降级为 `todo`；标记完成不增加已验收计数
  - `FR-06` / `FR-08`：稳定问题 ID 去重与自动解决、`P0 > 失败检查 > P1 > P2` 优先处理排序、多会话关联同一任务
  - `FR-02`：工具入参拒绝 `sessionId`、强制读取 `exec.agent` 权威会话身份与工作区
  - `RPC`：未识别工作区与非法动作错误处理
  - `FR-01` & 重启恢复：不同工作区严格隔离、软链 `realpath` 归并、受控输出路径安全校验
  - `AC-06`：6 个子进程并发写入同一工作区，`revision` 精确递增至 `6`、任务与问题 0 丢失

### 2. 真实 DSH `0.2.2-rc.5` 隔离端到端验收矩阵（`node plugin/scripts/e2e-dsh.mjs`）

测试汇总文件：[v1-e2e-report.json](test-results/v1-e2e-report.json)

| 验收编号 | 场景 | 实测结果 | 证据文件 / 截图 |
|---|---|---|---|
| `AC-01` | 空项目真实空状态与工作区隔离 | **PASS**（空会话 `session-459074c2...`：进行中 `0`、待验收 `0`、待修问题 `0`，优先处理与最近通过隐藏） | [v1-01-empty.png](previews/v1-01-empty.png) |
| `AC-02` | 真实多会话书店项目与权威汇报 | **PASS**（3 个真实会话：`#71ef59e2` 订单、`#5d988a85` 自取、`#c564cb14` 移动端检查；独立重跑订单+自取 `6/6` 通过、移动端 `1/1` 失败） | [v1-02-light-overview.png](previews/v1-02-light-overview.png)、[v1-orders-pickup-independent.txt](test-results/v1-orders-pickup-independent.txt)、[v1-mobile-independent.txt](test-results/v1-mobile-independent.txt) |
| `AC-03` | 手动调整防覆盖与恢复会话汇报 | **PASS**（自取调为 `65%` 且目标手动锁定；续跑 `#5d988a85` 汇报 `100%` 后动态更新仍保留 `65%` 与锁定目标；点击「恢复会话汇报」后即时复原） | [v1-04-edit-neutral.png](previews/v1-04-edit-neutral.png)、[v1-manual-preservation.txt](test-results/v1-manual-preservation.txt) |
| `AC-04` | 完成与验收失败分离 | **PASS**（移动端检查标记完成但测试失败，计入 `待验收: 1`、显示 `验收未通过`，未计入已通过） | [v1-02-light-overview.png](previews/v1-02-light-overview.png)、[v1-06-evidence-detail.png](previews/v1-06-evidence-detail.png) |
| `AC-05` | 会话导航与跨会话侧栏保持 | **PASS**（从订单会话点击「到店自取流程」跳转至 `#5d988a85`，标题切换为「实现到店自取时段校验 — DeepSeek Harness」，项目进度侧栏自动保持打开） | [v1-05-navigation.png](previews/v1-05-navigation.png) |
| `AC-06` | 刷新、DSH 重启恢复与并发写入 | **PASS**（`page.reload()` 及关闭并重启临时 Web 服务后 3 项任务与最新状态完整恢复；并发 6 进程与并行订单/自取会话 0 丢更新） | [v1-e2e-report.json](test-results/v1-e2e-report.json) |
| `AC-07` | 视觉、单色、栏宽保持与键盘可达性 | **PASS**（初始栏宽 `420px`，拖宽至 `514px` 后跨导航保持 `514px`；正文 `14px`、辅助 `12px`；编辑区暗底白字 `rgb(15,17,21)`/`rgb(255,255,255)` 无蓝色；浅色 `rgb(255,255,255)` 与深色 `rgb(21,21,23)` 均无错误；键盘 `Enter` 展开详情与聚焦态通过；未认证 RPC 返回 HTTP `401`） | [v1-03-dark-overview.png](previews/v1-03-dark-overview.png)、[v1-04-edit-neutral.png](previews/v1-04-edit-neutral.png)、[v1-06-evidence-detail.png](previews/v1-06-evidence-detail.png) |
| `AC-08` | 隔离与环境清理 | **PASS**（临时 `.tmp/e2e-*` 已清空，浏览器 `pageerror`/`console.error` 均为 `0`，原 `~/.dsh` `desktop`、`web` 校验前后一致） | [v1-e2e-report.json](test-results/v1-e2e-report.json) |

---

## 历史原型基线（`prototype-plugin/` · 仅作历史对照）

以下留档来自早先原型验证阶段（与正式 `plugin/` 分离）：

- 原型三会话快照：[live-real-sessions.json](test-results/live-real-sessions.json)
- 原型独立重跑记录：[live-orders-pickup-independent.txt](test-results/live-orders-pickup-independent.txt)、[live-mobile-independent.txt](test-results/live-mobile-independent.txt)
- 原型手动覆盖保留与导航记录：[live-manual-preservation.txt](test-results/live-manual-preservation.txt)、[session-navigation.json](test-results/session-navigation.json)
- 原型视觉校验与截图：[details-ui.json](test-results/details-ui.json)、[mono-light.json](test-results/mono-light.json)、[mono-dark.json](test-results/mono-dark.json)、`previews/mono-light.png`、`previews/mono-dark.png`、`previews/details-01-overview.png`、`previews/details-02-edit-neutral.png`、`previews/details-03-navigation.png`
