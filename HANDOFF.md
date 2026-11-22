# DSH-Slate · 实施交接

更新时间：2026-11-22  
当前阶段：**v0.2 主动汇报引导、零 token 工作区线索与一键「快速初始化」及目标排版收敛已实施并完成真机隔离 E2E 验收；`desktop` Profile 软链实时生效。**

## 从这里开始

```sh
cd /Users/light/Documents/Projects/Agent/DSH-Slate/plugin
npm run build
npm run verify
```

先读 [SPEC.md](SPEC.md) 和本文件。[AGENTS.md](AGENTS.md) 包含编码边界与 DSH 测试隔离规则，[TESTING.md](TESTING.md) 记录隔离测试矩阵、新执行证据与历史基线区分。

## 目录结构

- [plugin/](plugin/)：正式生产插件目录（`index.js`、`icon.png`、`assets/icon-{dark,light}.png`、`assets/tab-icon-{dark,light}.png`、`src/evidence.js`、`src/domain.js`、`src/store.js`、`src/prompt.js`、`src/bootstrap.js`、`src/tool.js`、`src/rpc.js`、`src/client.js`、`src/styles.css`、`lib/client.js`、`scripts/build.mjs`、`scripts/verify.mjs`、`scripts/e2e-dsh.mjs`、`scripts/e2e-autoflow.mjs`、`test/*.test.mjs`）。
- [prototype-plugin/](prototype-plugin/)：早期原型代码（只作历史参考，未修改也未用于生产）。
- [SPEC.md](SPEC.md)：正式需求规格、领域模型与 `AC-01`–`AC-08` 验收标准（v0.2，含 `FR-09`）。
- [AGENTS.md](AGENTS.md)：编码 Agent 约束与隔离测试约定。
- [direction-approved.md](direction-approved.md)：已批准的原生 DSH 石墨单色视觉基准。
- [TESTING.md](TESTING.md)：正式验收矩阵、新执行证据与历史原型基线记录。
- [previews/](previews/)：包含 `v1-01`–`v1-06` 与本轮 `v2-01`–`v2-03` 正式实测截图，及原型阶段历史基线截图。
- [test-results/](test-results/)：包含 `v1-*` 与本轮 `v2-autoflow-report.json`、`v2-autoflow-independent.txt` 正式输出，及原型阶段历史基线记录。

## 已核实的 DSH `0.2.2-rc.5` 宿主接口与实测结论

1. **真实会话身份与工作区直接读取**：`exec.agent.id` / `exec.agent.session.header.id` 与 `exec.agent.session.header.cwd` 在 Web 与 Headless 均可靠提供。正式 `project_progress_report` 已彻底移除可伪造的 `sessionId` 参数。
2. **FR-05 自动证据核对已开启并验证**：DSH `tool/result` 事件的关联 ID 字段为 `message.toolCallId`（以及 `message.source.callId`），而非 `message.callId`。`plugin/src/evidence.js` 配对真实 `bash`/`pwsh`/`shell` 执行结果与退出码：仅匹配到 `exitCode === 0` 才标记 `verifiedBy: 'evidence'`，真实失败覆盖为 `failed`，缺失真实运行降级为 `todo`；同时长输出受控落盘为 `outputs/<hash>/chk-<hash>.txt`。
3. **认证通信通道实测边界**：`0.2.2-rc.5` 中 `ctx.connection.rpc.handle` 会因 `dsh-client-connection` 内部读取 `this.ctx.webServer` 抛出 `cannot get property "webServer" without inject`；因此正式实现采用与宿主内置插件一致的 `ctx.connection.fetch.register('/api/dsh-slate/rpc')` + `ctx.connection.fetch.register('/api/dsh-slate/events')`，复用 DSH `/api` 入口 `BrowserAuth`、Host/Origin 校验与 `owner` Peer 鉴权（实测未认证请求返回 HTTP `401`）。
4. **工作区隔离与跨进程锁**：状态按 `realpath` 规范化工作区路径哈希隔离在 `${DSH_HOME}/storages/dsh-slate/`，使用进程内串行队列 + `O_EXCL` 跨进程锁文件 + 原子写保护，并在 6 进程并发写入测试中 0 丢更新。
5. **栏宽保护与跨会话保持**：`0.2.2-rc.5` 的 `LayoutController` 未提供 `requestRightbarWidth`，回退 `panels.setRightbar(420)` 仅在首次打开时执行一次；实测初始栏宽 `420px`，拖动至 `514px` 后跨标签、跨会话导航仍保留 `514px`。通过 `ctx.sidebarRight.openTabIn` 与 `mounted` 监听，点击任务跳转目标会话后项目页自动保持打开。
6. **单色视觉与编辑区修复**：合并为单一 `src/styles.css`，清除所有蓝色/绿色残留；修复按钮选择器优先级使暗底白字（`rgb(15, 17, 21)` / `rgb(255, 255, 255)`）在编辑区清晰可读；正文 `>= 14px`、辅助文字 `>= 12px`。

## 本轮已验证项

- **v0.2 自动汇报、冷启动线索与紧凑排版**：
  - `src/prompt.js` 通过 `ctx.inject(['systemPrompt'], ...)` 条件注册 `dsh-slate:project-progress` 动态片段，携带工作区 `taskId`、目标锁定状态与开放问题，并在 `tools.get('project_progress_report', agent)` 不可用时自动退避。
  - `src/bootstrap.js` 通过 `git` 只读快照（`execFile` 无 shell 拼接）与会话注册表提供零 token 工作区线索，并通过受控单步提示与 `typertGateway`（`session/create` + `session/prompt` 携带 `connection.browserPeer`）实现一键「快速初始化」。
  - `src/tool.js` 与 `src/styles.css` 收敛 `projectGoal` 一句话简短描述（建议 25 字以内）与 `16px` 标题字号，空项目卡片保持纯单色。
- `npm run verify`（最新运行）：构建 `lib/client.js`（`58221` bytes），PNG 幻数与 `package.json` `"icon"` 声明校验通过，单色正则校验通过，`12/12` 单元、Prompt/冷启动与 6 进程并发集成测试全部通过。
- `node plugin/scripts/e2e-autoflow.mjs`（最新隔离真实 DSH 验收，[v2-autoflow-report.json](test-results/v2-autoflow-report.json)）：
  - 日常开发会话在**未提及插件/汇报工具**下主动触发 `project_progress_report` 并完成证据核对；独立重跑 `node --test` `1/1` 通过（[v2-autoflow-independent.txt](test-results/v2-autoflow-independent.txt)）。
  - 空项目正确展示零 token Git/历史会话提示，点击「快速初始化」通过真实 `typertGateway` 以 2 步完成项目初始化；浅/深色 `16px` Tab 图标自动切换正常，浏览器错误为 `0`（[v2-01-empty-hints.png](previews/v2-01-empty-hints.png)、[v2-02-after-quick-init-light.png](previews/v2-02-after-quick-init-light.png)、[v2-03-after-quick-init-dark.png](previews/v2-03-after-quick-init-dark.png)）。
- **正式环境安装状态**：`desktop` Profile 已通过 `dsh plugin --profile desktop add link:/Users/light/Documents/Projects/Agent/DSH-Slate/plugin` 链接安装，`~/.dsh/profiles/desktop/node_modules/dsh-slate` 直接指向仓库 `plugin/`，更新文件与重构建实时生效；`web` Profile 因已有依赖 `dsh-worktable` 的浮动 GitHub release 校验和触发 `ERR_PNPM_TARBALL_INTEGRITY` 而保持未改动。
- `node plugin/scripts/e2e-dsh.mjs`（v0.1 `AC-01`–`AC-08` 基线验收，[v1-e2e-report.json](test-results/v1-e2e-report.json)）：覆盖空态、三会话、手动调整保护、完成/验收分离、跨会话保持、重启恢复、栏宽保持与隔离清理。

## 下一步（如后续迭代）

- 用户在 **DeepSeek Harness 桌面端** 重启后可直接在旧项目侧栏体验「快速初始化」及后续会话的自动进度汇报。
- 如决定同时安装至 `web` Profile，需先经用户确认处理 `dsh-worktable` lockfile 校验和冲突；若需再次全量核对 `AC-01`–`AC-08`，可重跑 `node plugin/scripts/e2e-dsh.mjs`。
