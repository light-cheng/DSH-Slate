# Release notes

English is the default; the Chinese version follows below.

## English

### Publishing

Creating a GitHub release publishes `plugin/` (`@lightcheng/dsh-slate`) to npm automatically (`.github/workflows/release.yml`, npm trusted publishing via OIDC, no npm token or secret). Tag the release `vX.Y.Z`, matching `plugin/package.json`'s `version`; a mismatch fails the workflow before anything is published. A release marked **pre-release** is published to the `next` dist-tag; a stable release goes to `latest`.

### v0.1.2 — `ops_bash` Evidence Verification & Windows Command Matching

- **Support `dsh-ops` shell tools in FR-05 verifier**: `extractShellExecutions` now inspects `ops_bash` (`ops_pwsh`, `ops_shell`, `powershell`, `cmd`) in addition to built-in `bash`/`pwsh`/`shell`, including `script_path` invocations and `workdir` metadata.
- **Strict `dsh-ops` failure & background detection**: `parseShellOutputStatus` recognizes `[cancelled]`, `[signal: ...]`, `[error: ...]`, structured `[CODE; effects: ...; retry: ...]` markers, `[POLICY_DENIED: ...]` / sandbox refusal markers, and `dsh-ops` promoted background jobs (`[still running after ...ms; moved to background job ...]`) so aborted/denied/running commands are never counted as passed.
- **Windows path/quote command matching**: `findMatchingExecution` adds normalized slash/quote fallback matching (`\` / `\\` / `/` and `"` / `'`) so Windows commands like `icacls "C:\..."` match reported checks reliably.

### v0.1.1 — Missing-Session Guard, Task Deletion & Windows Fixes

- **Missing / archived session navigation guard**: clicking task titles, `最近通过`, check/issue source buttons, or bootstrap session chips validates session availability against live `useSessions` and `archivedSessionIds`. Multi-session tasks automatically fall back to another surviving live session; deleted or archived sessions stay on the current view without kicking DSH back to the Home screen, showing an inline notice plus `会话已删除` / `会话已归档` cues.
- **Inline two-step task deletion**: added `删除任务` → `确认删除` / `取消` (`deleteTask` RPC) so obsolete or orphaned quick-init tasks can be removed cleanly, clearing task-bound checks while detaching linked issues to workspace level.
- **Windows path & workspace matching**: fixed `workspaceDisplayName` and path normalization to handle `\` separators and Windows drive-letter casing in both client headers and Quick Init workspace matching (`collectWorkspaceSessions`).
- **Polling & store queue resilience**: transient `Failed to fetch` notices automatically clear once `getState` polling recovers, and `store.mutate` queue cleanup now handles updater rejections cleanly without emitting Node `unhandledRejection`.

### v0.1.0 — Initial Release Candidate

- **Workspace-isolated project store**: stores each canonical (`realpath`) workspace under `${DSH_HOME}/storages/dsh-slate/projects/` using an in-process serial queue, `O_EXCL` cross-process lock files, stale-lock eviction, atomic writes, and workspace file watchers. Concurrent Web and Headless sessions write safely without overwriting each other.
- **Authoritative identity & evidence verification (`project_progress_report`)**: resolves `sessionId` and `workspacePath` directly from DSH's `exec.agent` context (no spoofable `sessionId` input parameter) and cross-checks reported `passed` checks against actual `tool/call` and `tool/result` shell executions (`exitCode === 0`). Cross-session executed checks automatically clear stale unexecuted `todo` placeholders and resolved `failed` checks on the same `taskId`; same-session TDD red-to-green renames reuse the active unverified task automatically; user-verified tasks clear stale top priority alerts while preserving honest historical check records.
- **Automatic reporting & compact guidance (`systemPrompt.section`)**: conditionally injects `dsh-slate:project-progress` when `systemPrompt` and the reporting tool are available in a session, carrying active `taskId`s, locked goal state, project acceptance criteria, failing checks, and open issues so routine coding/testing sessions update progress automatically while read-only Q&A stays silent.
- **Zero-token bootstrap hints & bounded Quick Init**: empty projects surface read-only Git facts (`branch`, `latestTag`, uncommitted count, latest commit) and an expandable full-width vertical list of real sidebar sessions (excluding archived, blank, deleted, and subagent sessions) without spending model tokens, plus a bounded **快速初始化** button via `typertGateway`.
- **Manual overrides & cross-session navigation**: manual edits on project goal, acceptance criteria, task priority, per-task estimate, and next deliverable survive subsequent session reports until restored via **恢复会话汇报**. Clicking historical sessions, tasks, or verified items opens the target `sessionId` while keeping the right sidebar tab active.
- **Native monochrome DSH UI, dual-theme icons & localized Plugin Manager entry**: built around `--dsw-*` semantic tokens with `16px` goal typography, initial ~`420px` width without clobbering user drags, `16px` mineral slate light/dark tab icons, and concise en/zh plugin detail pages.

---

## 中文

### 发布方式

发布 GitHub Release 会通过 `.github/workflows/release.yml` 自动把 [plugin/](plugin/)（包名 `@lightcheng/dsh-slate`）发布到 npm（采用 npm OIDC Trusted Publishing，无需长期 `NPM_TOKEN`）。Release tag 需为 `vX.Y.Z`，且与 `plugin/package.json` 的 `version` 一致；勾选 **pre-release** 会发布到 `next` 标签，正式 Release 发布到 `latest`。

### v0.1.2 — 兼容 `ops_bash` 证据核验与 Windows 命令匹配

- **自动证据核验支持 `dsh-ops` 工具链**：`extractShellExecutions` 在原有内置 `bash`/`pwsh`/`shell` 基础上纳入 `ops_bash`（及 `ops_pwsh`/`ops_shell`/`powershell`/`cmd`），并支持读取 `script_path` 与 `workdir`。
- **补全 `dsh-ops` 失败与后台标记识别**：`parseShellOutputStatus` 识别 `[cancelled]`、`[signal: ...]`、`[error: ...]`、结构化 `[CODE; effects: ...; retry: ...]`、`[POLICY_DENIED: ...]` / 沙箱拒绝标记及后台升级标记（`[still running after ...ms; moved to background job ...]`），确保中断、报错或策略拒绝绝不会被误判为通过。
- **Windows 引号与路径斜杠兼容匹配**：`findMatchingExecution` 增加引号/斜杠归一化兜底匹配，解决类似带双引号或反斜杠的 Windows 命令（如 `icacls`）因汇报口径差异导致的漏配问题。

### v0.1.1 — 失效会话跳转保护、任务删除与 Windows 兼容修复

- **失效 / 已归档会话跳转保护**：任务标题、「最近通过」、验收记录/待修问题来源按钮与空态历史会话跳转前均先核对实时会话状态；多会话任务主会话缺失时自动回退至同任务其他活跃会话；目标已删除或归档时阻止误跳回「探索未至之境」空主界面并原地展示引导提示，同时标注 `会话已删除` / `会话已归档`。
- **行内二次确认删除任务**：新增 `deleteTask` 领域与 RPC 接口，并在任务操作区提供 `删除任务` → `确认删除` / `取消`，清理旧初始化或已删会话残留的任务卡及其绑定检查项，保留关联问题为工作区级跟进项。
- **Windows 路径与盘符大小写兼容**：修复侧栏顶栏按 `/` 和 `\` 提取项目名称，修复 `collectWorkspaceSessions` 与客户端工作区快照对 Windows 盘符大小写不一致导致的匹配遗漏。
- **轮询恢复与存储队列异常处理**：后台 `getState` 轮询恢复后自动清除瞬时 `Failed to fetch` 提示，同时修复 `store.mutate` 拒绝路径中 `Promise.prototype.finally` 产生的未捕获拒绝隐患。

### v0.1.0 — 首个公开发布候选版

- **工作区隔离与跨进程安全存储**：按 `realpath` 规范化工作区路径隔离落盘至 `${DSH_HOME}/storages/dsh-slate/projects/`，结合进程内串行队列、`O_EXCL` 跨进程文件锁、陈旧锁回收与原子替换写入，多 Web / Headless 会话并发写入不丢更新。
- **权威身份与真实命令证据核对（`project_progress_report`）**：直接从 `exec.agent` 读取真实 `sessionId` 与工作区路径，不提供可伪造入参；声称 `passed` 必须匹配本会话真实的 `tool/call` 与 `tool/result` 执行记录（`exitCode === 0`），否则降级为 `todo` 或覆写为 `failed`。同一任务下后续实测通过后，自动清理早期遗留的 `todo` 占位与已解决的旧 `failed` 检查；同会话 TDD 由红转绿改名自动复用未验收任务；人工确认「验收通过」后清除顶部优先告警并诚实保留历史检查记录。
- **日常会话主动汇报（`systemPrompt.section`）**：条件注入 `dsh-slate:project-progress` 动态提示段，同步已有 `taskId`、项目验收标准、目标锁定标记、未通过检查与未解决问题，明确要求子任务汇报保留既有项目级验收标准、仅在产生实质进展或测试结果后顺手汇报，纯只读问答不打扰。
- **0 token 工作区线索与可控「快速初始化」**：空项目零消耗读取本地 Git 状态与全宽纵向可展开的真实历史会话列表（过滤已归档、空白草稿、失效与子代理会话），支持一键触发受控初始化新会话。
- **手动覆盖保护与跨会话保持**：手动修改项目目标、验收标准或任务预估/优先级/交付物后不被会话报告静默覆写，随时支持「恢复会话汇报」；点击历史会话或任务直接跳转来源真实会话并保持右侧栏打开。
- **DSH 原生石墨单色界面、双主题图标与双语插件详情**：全量跟随 `--dsw-*` 变量、收敛 `16px` 目标标题、保留约 `420px` 初始宽度且不覆写用户拖动宽度，随深/浅色模式自动切换 `16px` 矿石板岩 Tab 图标，并在插件页提供精简中英说明。
