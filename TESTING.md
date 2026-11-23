# 测试基线与隔离验收报告

> **证据区分说明**：本文件同时记录两类材料——**正式插件（`plugin/`）的新执行验收结果（`v1-*`、`v2-*` 与 `v3-*`）** 与 **早期原型阶段（`prototype-plugin/`）的历史基线**，两者严格区分，不以原型结果冒充正式实现验收。

## 隔离测试环境规范

正式插件（`plugin/`）的自动化端到端验收通过 `node plugin/scripts/e2e-dsh.mjs` 与 `node plugin/scripts/e2e-autoflow.mjs` 运行，严格遵守以下隔离边界：

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

### 2. 真实 DSH `0.2.2-rc.5` 隔离端到端验收矩阵（`node plugin/scripts/e2e-dsh.mjs` · 最新重跑通过）

测试汇总文件：[v1-e2e-report.json](test-results/v1-e2e-report.json)

| 验收编号 | 场景 | 实测结果 | 证据文件 / 截图 |
|---|---|---|---|
| `AC-01` | 空项目真实空状态与工作区隔离 | **PASS**（空会话 `session-3fb12f78...`：进行中 `0`、待验收 `0`、待修问题 `0`，优先处理与最近通过隐藏） | [v1-01-empty.png](previews/v1-01-empty.png) |
| `AC-02` | 真实多会话书店项目与权威汇报 | **PASS**（3 个真实会话：`#3c0b3e18` 订单、`#48c35c3a` 自取、`#f18b6bde` 移动端检查；独立重跑订单+自取 `6/6` 通过、移动端 `1/1` 失败） | [v1-02-light-overview.png](previews/v1-02-light-overview.png)、[v1-orders-pickup-independent.txt](test-results/v1-orders-pickup-independent.txt)、[v1-mobile-independent.txt](test-results/v1-mobile-independent.txt) |
| `AC-03` | 手动调整防覆盖与恢复会话汇报 | **PASS**（自取调为 `65%` 且目标手动锁定；续跑 `#48c35c3a` 汇报 `100%` 且不覆盖锁定目标与项目级验收标准；点击「恢复会话汇报」后即时复原） | [v1-04-edit-neutral.png](previews/v1-04-edit-neutral.png)、[v1-manual-preservation.txt](test-results/v1-manual-preservation.txt) |
| `AC-04` | 完成与验收失败分离 | **PASS**（移动端检查标记完成但测试失败，计入 `待验收: 1`、显示 `验收未通过`，未计入已通过） | [v1-02-light-overview.png](previews/v1-02-light-overview.png)、[v1-06-evidence-detail.png](previews/v1-06-evidence-detail.png) |
| `AC-05` | 会话导航与跨会话侧栏保持 | **PASS**（从订单会话点击「到店自取流程」跳转至 `#48c35c3a`，标题切换为「实现门店自取时段校验 — DeepSeek Harness」，项目进度侧栏自动保持打开） | [v1-05-navigation.png](previews/v1-05-navigation.png) |
| `AC-06` | 刷新、DSH 重启恢复与并发写入 | **PASS**（`page.reload()` 及关闭并重启临时 Web 服务后 3 项任务与最新状态完整恢复；并发 6 进程与并行订单/自取会话 0 丢更新） | [v1-e2e-report.json](test-results/v1-e2e-report.json) |
| `AC-07` | 视觉、单色、栏宽保持与键盘可达性 | **PASS**（初始栏宽 `420px`，拖宽至 `514px` 后跨导航保持 `514px`；正文 `14px`、辅助 `12px`；编辑区暗底白字 `rgb(15,17,21)`/`rgb(255,255,255)` 无蓝色；浅色 `rgb(255,255,255)` 与深色 `rgb(21,21,23)` 均无错误；键盘 `Enter` 展开详情与聚焦态通过；未认证 RPC 返回 HTTP `401`） | [v1-03-dark-overview.png](previews/v1-03-dark-overview.png)、[v1-04-edit-neutral.png](previews/v1-04-edit-neutral.png)、[v1-06-evidence-detail.png](previews/v1-06-evidence-detail.png) |
| `AC-08` | 隔离与环境清理 | **PASS**（临时 `.tmp/e2e-*` 已清空，浏览器 `pageerror`/`console.error` 均为 `0`，原 `~/.dsh` `desktop`、`web` 校验前后一致） | [v1-e2e-report.json](test-results/v1-e2e-report.json) |

### 3. v0.2 / Release-Ready 增量验证（最新新执行）

- **构建、发布元数据与单测重跑（`cd plugin && npm run verify && npm pack --dry-run`）**：
  - 生成 `lib/client.js`（`58430` bytes），校验 `private: false`、`license: MIT`、`keywords`（含 `dsh-plugin`）、`publishConfig.access: public`、`icon`、PNG 幻数、`screenshots.json` 6 张截图与单色规则全部通过。
  - `13/13` 自动化测试全部通过（新增 `FR-06` 跨会话实测替换 `todo` 占位与保护已有证据测试、`systemPrompt` 项目验收标准与待检查列表注入、以及 `session/list` 真实标题提取与空白草稿过滤测试）。
- **真实 DSH `0.2.2-rc.5` 端到端自动汇报与快速初始化（`node plugin/scripts/e2e-autoflow.mjs`）**：[v2-autoflow-report.json](test-results/v2-autoflow-report.json)

| 场景 | 实测结果 | 证据文件 / 截图 |
|---|---|---|
| 场景 A · 日常会话零提示词主动汇报 | **PASS**（普通提示让真实会话修复 `src/calc.js` 并跑 `node --test`，未提及 Slate 或汇报工具；模型通过 `systemPrompt.section` 主动调用 `project_progress_report` `1` 次，写入 `revision: 1`、目标「修复 add 函数并保证测试全部通过」及 `1` 项真实退出码为 `0` 的证据通过记录；独立重跑 `node --test` `1/1` 通过） | [v2-autoflow-report.json](test-results/v2-autoflow-report.json)、[v2-autoflow-independent.txt](test-results/v2-autoflow-independent.txt) |
| 场景 B · 空项目真实历史标题 + 零 token 线索 + 快速初始化 + 双主题图标 | **PASS**（两段纯只读会话保持 `revision: 0`；空项目侧栏过滤空白草稿后准确展示 `已有 1 个历史会话：PRIOR_OK verification request` 与 Git `main` / `v0.1.0` / `6857dd7`；点击「快速初始化」仅用 2 步完成并写入 `16px` 紧凑目标「交付轻量跨平台托盘工具，支持单二进制分发」；切暗色后自动切换 `.sl-tab-icon-dark`（`rgb(21, 21, 23)`）；`0` 浏览器错误，临时环境已清空且原 `~/.dsh` 一致） | [v2-01-empty-hints.png](previews/v2-01-empty-hints.png)、[v2-02-after-quick-init-light.png](previews/v2-02-after-quick-init-light.png)、[v2-03-after-quick-init-dark.png](previews/v2-03-after-quick-init-dark.png) |

### 4. `v0.1.1` / `v0.1.2` 及 `main` 增量回归验证（最新新执行）

- **全量单元与并发测试（`cd plugin && npm run verify`，`18/18` 通过）**：
  - 在原有 `13` 项测试基础上，陆续补齐并全部通过：同会话 TDD 红转绿复用及跨会话失败覆盖、`deleteTask` 删除任务/绑定检查及问题解绑、`store.mutate` 异常队列无 `unhandledRejection`、Windows 工作区按 `sessionId`/路径匹配、`ops_bash` / `script_path` / `dsh-ops` 失败与后台升级标记识别及 Windows `icacls` 引号反斜杠归一化匹配、以及 `sanitizeIssueTitle` 去重前缀（含 `P2P` 保护）。
  - 三平台 GitHub Actions（`macos-latest` / `ubuntu-latest` / `windows-latest`）随发布与提交同步通过 `npm run verify` 与 `npm pack --dry-run`。
- **隔离 DSH Web + Playwright 失效会话跳转与任务删除实测**：
  - 在临时 `DSH_HOME`、`127.0.0.1` 随机端口隔离环境中，活跃会话 `#6ff57aa9` 与引用已删会话 `#35cbd432` 的任务卡同屏渲染并标注 `· 会话已删除`；
  - 点击已删会话任务标题停留在当前活跃会话并展示 `.sl-notice.is-warn` 就地提示（未跳回「探索未至之境」主页，`0` 浏览器错误）；点击「删除任务」→「确认删除」后任务数从 `2` 降至 `1`、绑定待检清除、关联问题独立保留，刷新页面保持一致（见 [v3-missing-session-delete.png](previews/v3-missing-session-delete.png)），测试后 `.tmp/` 完整清理且 `~/.dsh` 校验未变。
- **Windows DSH 实机验证（`@lightcheng/dsh-slate@0.1.2`）**：
  - 用户在实际 Windows 桌面端运行 `ops_bash` 执行 `npm run dist`（退出码 `0`）与 `icacls "dist/win-unpacked/Black Hole Screensaver.exe"`（`Mandatory Label\Medium Mandatory Level`），两条验收记录由自动证据核对判定为「已通过」，孤立初始化任务已通过「删除任务」移除。

---

## 历史原型基线（`prototype-plugin/` · 仅作历史对照）

以下留档来自早先原型验证阶段（与正式 `plugin/` 分离）：

- 原型三会话快照：[live-real-sessions.json](test-results/live-real-sessions.json)
- 原型独立重跑记录：[live-orders-pickup-independent.txt](test-results/live-orders-pickup-independent.txt)、[live-mobile-independent.txt](test-results/live-mobile-independent.txt)
- 原型手动覆盖保留与导航记录：[live-manual-preservation.txt](test-results/live-manual-preservation.txt)、[session-navigation.json](test-results/session-navigation.json)
- 原型视觉校验与截图：[details-ui.json](test-results/details-ui.json)、[mono-light.json](test-results/mono-light.json)、[mono-dark.json](test-results/mono-dark.json)、`previews/mono-light.png`、`previews/mono-dark.png`、`previews/details-01-overview.png`、`previews/details-02-edit-neutral.png`、`previews/details-03-navigation.png`
