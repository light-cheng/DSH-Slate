# Release notes

English is the default; the Chinese version follows below.

## English

### Publishing

Creating a GitHub release publishes `plugin/` (`dsh-slate`) to npm automatically (`.github/workflows/release.yml`, npm trusted publishing via OIDC, no npm token or secret). Tag the release `vX.Y.Z`, matching `plugin/package.json`'s `version`; a mismatch fails the workflow before anything is published. A release marked **pre-release** is published to the `next` dist-tag; a stable release goes to `latest`.

### v0.1.0 — Initial Release Candidate

- **Workspace-isolated project store**: stores each canonical (`realpath`) workspace under `${DSH_HOME}/storages/dsh-slate/projects/` using an in-process serial queue, `O_EXCL` cross-process lock files, stale-lock eviction, atomic writes, and workspace file watchers. Concurrent Web and Headless sessions write safely without overwriting each other.
- **Authoritative identity & evidence verification (`project_progress_report`)**: resolves `sessionId` and `workspacePath` directly from DSH's `exec.agent` context (no spoofable `sessionId` input parameter) and cross-checks reported `passed` checks against actual `tool/call` and `tool/result` shell executions (`exitCode === 0`). Cross-session executed checks automatically clear stale unexecuted `todo` placeholders left on the same `taskId`.
- **Automatic reporting & compact guidance (`systemPrompt.section`)**: conditionally injects `dsh-slate:project-progress` when `systemPrompt` and the reporting tool are available in a session, carrying active `taskId`s, locked goal state, project acceptance criteria, and open issues so routine coding/testing sessions update progress automatically while read-only Q&A stays silent.
- **Zero-token bootstrap hints & bounded Quick Init**: empty projects surface read-only Git facts (`branch`, `latestTag`, uncommitted count, latest commit) and real sidebar session titles (from DSH `session/list`, filtering blank drafts) without spending model tokens, plus a bounded **快速初始化** button via `typertGateway`.
- **Manual overrides & cross-session navigation**: manual edits on project goal, acceptance criteria, task priority, per-task estimate, and next deliverable survive subsequent session reports until restored via **恢复会话汇报**. Clicking tasks or verified items opens the target `sessionId` while keeping the right sidebar tab active.
- **Native monochrome DSH UI & dual-theme icons**: built around `--dsw-*` semantic tokens with `16px` goal typography, initial ~`420px` width without clobbering user drags, and `16px` mineral slate light/dark tab icons.

---

## 中文

### 发布方式

发布 GitHub Release 会通过 `.github/workflows/release.yml` 自动把 [plugin/](plugin/)（包名 `dsh-slate`）发布到 npm（采用 npm OIDC Trusted Publishing，无需长期 `NPM_TOKEN`）。Release tag 需为 `vX.Y.Z`，且与 `plugin/package.json` 的 `version` 一致；勾选 **pre-release** 会发布到 `next` 标签，正式 Release 发布到 `latest`。

### v0.1.0 — 首个公开发布候选版

- **工作区隔离与跨进程安全存储**：按 `realpath` 规范化工作区路径隔离落盘至 `${DSH_HOME}/storages/dsh-slate/projects/`，结合进程内串行队列、`O_EXCL` 跨进程文件锁、陈旧锁回收与原子替换写入，多 Web / Headless 会话并发写入不丢更新。
- **权威身份与真实命令证据核对（`project_progress_report`）**：直接从 `exec.agent` 读取真实 `sessionId` 与工作区路径，不提供可伪造入参；声称 `passed` 必须匹配本会话真实的 `tool/call` 与 `tool/result` 执行记录（`exitCode === 0`），否则降级为 `todo` 或覆写为 `failed`。同一任务下后续会话跑出真实检查结果时，自动清理早期会话遗留的 `todo` 占位项。
- **日常会话主动汇报（`systemPrompt.section`）**：条件注入 `dsh-slate:project-progress` 动态提示段，同步已有 `taskId`、项目验收标准、目标锁定标记与未解决问题，明确要求子任务汇报保留既有项目级验收标准、仅在产生实质进展或测试结果后顺手汇报，纯只读问答不打扰。
- **0 token 工作区线索与可控「快速初始化」**：空项目零消耗读取本地 Git 状态与 DSH `session/list` 真实历史会话标题（过滤空白草稿会话），支持一键触发受控初始化新会话。
- **手动覆盖保护与跨会话保持**：手动修改项目目标、验收标准或任务预估/优先级/交付物后不被会话报告静默覆写，随时支持「恢复会话汇报」；点击任务直接跳转来源真实会话并保持右侧栏打开。
- **DSH 原生石墨单色界面与双主题图标**：全量跟随 `--dsw-*` 变量、收敛 `16px` 目标标题、保留约 `420px` 初始宽度且不覆写用户拖动宽度，并随深/浅色模式自动切换 `16px` 矿石板岩 Tab 图标。
