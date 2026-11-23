# DSH-Slate · 实施交接

更新时间：2026-11-23  
当前阶段：**线上最新正式版为 `v0.1.2`（npm `@lightcheng/dsh-slate@0.1.2` `latest` + GitHub Release `v0.1.2`，已在 Windows DSH 实机完成 `ops_bash`、`icacls` 与删卡闭环验证）；`main` 在 `v0.1.2` 之后另有 1 个已验证未发版提交（`85bd948`：去重问题标题 `[P0]`–`[P2]` 冗余前缀，`18/18` 单测通过），按用户要求暂攒入后续版本一起发布；`awesome-dsh-plugin` PR #17699 等待满 24 小时门禁自动放行。**

## 从这里开始

```sh
cd /Users/light/Documents/Projects/Agent/DSH-Slate/plugin
npm run build
npm run verify
npm pack --dry-run
```

先读 [SPEC.md](SPEC.md) 和本文件。[AGENTS.md](AGENTS.md) 包含编码边界与 DSH 测试隔离规则，[TESTING.md](TESTING.md) 记录隔离测试矩阵、新执行证据与历史基线区分，[RELEASE.md](RELEASE.md) 与 [MARKETPLACE.md](MARKETPLACE.md) 记录 GitHub Release 联动 npm 与插件市场提交流程。

## 目录结构

- [plugin/](plugin/)：正式生产插件目录（`package.json` 已设为 `private: false`、`MIT` 许可、发布包白名单与 `screenshots.json`，含 `locale/{en,zh}.json`、`docs/plugin-page.{en,zh-CN}.md`、`assets/screenshots/01`–`06`、`README.md`、`README.zh-CN.md`、`RELEASE.md`、`MARKETPLACE.md`、`LICENSE`、`index.js`、`icon.png`、`assets/icon-{dark,light}.png`、`assets/tab-icon-{dark,light}.png`、`src/*.js`、`src/styles.css`、`lib/client.js`、`scripts/*.mjs`、`test/*.test.mjs`）。
- [.github/workflows/](.github/workflows/)：`ci.yml`（三平台 CI + pack 检查）与 `release.yml`（GitHub Release 触发 OIDC `npm publish`）。
- 根目录发布与文档：[README.md](README.md)、[README.zh-CN.md](README.zh-CN.md)、[RELEASE.md](RELEASE.md)、[MARKETPLACE.md](MARKETPLACE.md)、[LICENSE](LICENSE)、[screenshots.json](screenshots.json)。
- [prototype-plugin/](prototype-plugin/)：早期原型代码（只作历史参考，未修改也未用于生产与打包）。
- [SPEC.md](SPEC.md)：正式需求规格、领域模型与 `AC-01`–`AC-08` 验收标准（v0.2，含 `FR-09`）。
- [AGENTS.md](AGENTS.md)：编码 Agent 约束与隔离测试约定。
- [direction-approved.md](direction-approved.md)：已批准的原生 DSH 石墨单色视觉基准。
- [TESTING.md](TESTING.md)：正式验收矩阵、新执行证据与历史原型基线记录。
- [previews/](previews/)：包含 `v1-01`–`v1-06`、`v2-01`–`v2-03` 与 `v3-missing-session-delete.png` 正式实测截图，及原型阶段历史基线截图。
- [test-results/](test-results/)：包含 `v1-*` 与本轮 `v2-autoflow-report.json`、`v2-autoflow-independent.txt` 正式输出，及原型阶段历史基线记录。

## 已核实的 DSH `0.2.2-rc.5` 宿主接口与实测结论

1. **真实会话身份与工作区直接读取**：`exec.agent.id` / `exec.agent.session.header.id` 与 `exec.agent.session.header.cwd` 在 Web 与 Headless 均可靠提供。正式 `project_progress_report` 已彻底移除可伪造的 `sessionId` 参数。
2. **FR-05 自动证据核对已开启并验证**：DSH `tool/result` 事件的关联 ID 字段为 `message.toolCallId`（以及 `message.source.callId`），而非 `message.callId`。`plugin/src/evidence.js` 兼容宿主内置 `bash`/`pwsh`/`shell`/`powershell`/`cmd` 与 `dsh-ops` 的 `ops_bash`/`ops_pwsh`/`ops_shell`（含 `script_path`、`workdir`、`[cancelled]` / `[signal: ...]` / `[error: ...]` / `[POLICY_DENIED: ...]` / 结构化失败标记、后台升级任务及 Windows 引号/反斜杠归一化匹配）：仅匹配到 `exitCode === 0` 且无掩码或失败标记时才标记 `verifiedBy: 'evidence'`，真实失败覆盖为 `failed`，缺失真实运行或运行中降级为 `todo`；长输出受控落盘为 `outputs/<hash>/chk-<hash>.txt`。
3. **认证通信通道实测边界**：`0.2.2-rc.5` 中 `ctx.connection.rpc.handle` 会因 `dsh-client-connection` 内部读取 `this.ctx.webServer` 抛出 `cannot get property "webServer" without inject`；因此正式实现采用与宿主内置插件一致的 `ctx.connection.fetch.register('/api/dsh-slate/rpc')` + `ctx.connection.fetch.register('/api/dsh-slate/events')`，复用 DSH `/api` 入口 `BrowserAuth`、Host/Origin 校验与 `owner` Peer 鉴权（实测未认证请求返回 HTTP `401`）。
4. **工作区隔离与跨进程锁**：状态按 `realpath` 规范化工作区路径哈希隔离在 `${DSH_HOME}/storages/dsh-slate/`，使用进程内串行队列 + `O_EXCL` 跨进程锁文件 + 原子写保护，并在 6 进程并发写入测试中 0 丢更新。
5. **栏宽保护与跨会话保持**：`0.2.2-rc.5` 的 `LayoutController` 未提供 `requestRightbarWidth`，回退 `panels.setRightbar(420)` 仅在首次打开时执行一次；实测初始栏宽 `420px`，拖动至 `514px` 后跨标签、跨会话导航仍保留 `514px`。通过 `ctx.sidebarRight.openTabIn` 与 `mounted` 监听，点击任务跳转目标会话后项目页自动保持打开。
6. **单色视觉与编辑区修复**：合并为单一 `src/styles.css`，清除所有蓝色/绿色残留；修复按钮选择器优先级使暗底白字（`rgb(15, 17, 21)` / `rgb(255, 255, 255)`）在编辑区清晰可读；正文 `>= 14px`、辅助文字 `>= 12px`。

## 本轮已验证项

- **`main` 尚未发版的增量改动（commit `85bd948`，暂攒至下一版 `v0.1.3` 一起发布，未改版本号与 Tag）**：
  - `plugin/src/domain.js`：新增 `sanitizeIssueTitle`（剥离标题开头重复携带的 `[P0]`–`[P2]`、`【P0–P2】` 或 `P0:`/`P1：`/`P2-` 等前缀，不误伤 `P2P ...` 正常标题），在 `stableIssueId` 哈希、`applySessionReport` 写入及 `buildProjectView` / `selectPriorityFocus` 投影展示阶段统一清洗（历史持久化中的重复前缀条目也会即时显示干净）。
  - `plugin/src/prompt.js`：待修问题上下文注入格式由 `[issueId: ...] [P1] 标题` 调整为 `[issueId: ...] 标题（P1）`，与任务行格式对齐，减少模型复写标题时连带抄入级别标签。
  - `npm run verify`（commit `85bd948` 最新运行）：构建 `lib/client.js`（`71194` bytes），`18/18` 单元与多进程/拒绝恢复测试全部通过（含 `domain.test.mjs` 新增前缀清洗与 `P2P` 保护用例、`prompt-bootstrap.test.mjs` 新格式断言）。

- **`v0.1.2` `ops_bash` 与 Windows 证据核对修复（已发布至 npm `latest`）**：
  - GitHub Release `v0.1.2`：<https://github.com/light-cheng/DSH-Slate/releases/tag/v0.1.2>；`release` 工作流（<https://github.com/light-cheng/DSH-Slate/actions/runs/45104353063>，Sigstore Provenance logIndex `4049991176`）与三平台 `ci`（<https://github.com/light-cheng/DSH-Slate/actions/runs/45104352187>）均已绿，`npm view` 已确认 `@lightcheng/dsh-slate@0.1.2` 在 `latest` 生效。
  - Windows DSH 实机验证通过：用户升级至 `@lightcheng/dsh-slate@0.1.2` 后在原会话重跑 `ops_bash` 构建（`npm run dist`）与带引号路径检查（`icacls "dist/win-unpacked/Black Hole Screensaver.exe"`），两项验收记录均自动匹配为「已通过」，孤立初始化任务已用界面「删除任务」移除，任务切换为「已验收」并更新「最近通过」。
  - `plugin/src/evidence.js`：将 `ops_bash` / `ops_pwsh` / `ops_shell` / `powershell` / `cmd` 与 `script_path` 纳入 `extractShellExecutions`；严格识别 `[cancelled]`、`[signal: ...]`、`[error: ...]`、结构化 `[CODE; effects: ...; retry: ...]`、`[POLICY_DENIED: ...]`、沙箱拒绝及 `dsh-ops` 后台升级标记（`[still running after ...ms; moved to background job ...]`）；在 `findMatchingExecution` 新增引号与斜杠（`\` / `/`）归一化兜底匹配，修复装有 `dsh-ops` 时构建与 Windows `icacls` 检查误降级为「未检查」的问题。
  - `plugin/test/domain.test.mjs`：新增 `ops_bash` 成功/失败/取消/策略拒绝/后台升级/`script_path` 与 Windows `icacls` 跨引号反斜杠匹配回归测试。
  - `npm run verify && npm pack --dry-run`（最新运行）：构建 `lib/client.js`（`71194` bytes），语法、单色检查、`17/17` 单元与多进程/拒绝恢复测试全通过；打包校验产出 `lightcheng-dsh-slate-0.1.2.tgz`（`34` 个文件，`2.3 MB`）。
- **`v0.1.1` 发布链路与 Windows 实测问题修复（已发布至 npm `latest`）**：
  - GitHub Release `v0.1.1`：<https://github.com/light-cheng/DSH-Slate/releases/tag/v0.1.1>；`release` 工作流（<https://github.com/light-cheng/DSH-Slate/actions/runs/45099888378>，Sigstore Provenance logIndex `4049913122`）与三平台 `ci`（<https://github.com/light-cheng/DSH-Slate/actions/runs/45099888357>）均已绿，`npm view` 已确认 `@lightcheng/dsh-slate@0.1.1` 在 `latest` 生效。
  - `plugin/src/client.js` & `plugin/src/styles.css`：
    - 会话跳转守卫（`resolveSessionTarget` / `safeOpenSession`）：任务标题、最近通过、检查/问题来源按钮及历史会话跳转均先核对实时 `useSessions((s) => s?.byId)` 与 `archivedSessionIds`，若多会话任务主会话缺失但同任务仍有其他未归档会话则回退跳转；若均已删除或归档则禁止调用 `ctx.uiWorkspace.openSession`（避免主区域误跳回“探索未至之境”空页），就地展示 `.sl-notice.is-warn` 提示，并在任务元信息与详情按钮明确标注 `会话已删除` / `会话已归档`。`openSession` 外层同时加 `try/catch` 兜底；轮询 `getState` 恢复正常时自动清除瞬时 `Failed to fetch` 错误横幅。
    - Windows 工作区名称与路径兼容：`workspaceDisplayName` 按 `/` 与 `\` 双分隔符提取末段目录名（修复 Windows 标题栏显示 `C:\Users\...\C...`）；`liveSessionSnapshot` 路径归一化统一斜杠并规范 Windows 盘符大小写。
    - 任务行内二次删除：在 `.sl-task-actions` 增加 `删除任务` -> `确认删除`（`--slate-danger`）/ `取消` 行内二次确认交互，清理因旧初始化或已删会话残留的任务卡。
  - `plugin/src/domain.js` & `plugin/src/rpc.js`：新增 `deleteTask` 领域函数与 `deleteTask` RPC 端点（移除目标任务与绑定检查，将关联问题 `taskId` 置为 `null` 保留跟进，记录动态并重算统计、优先处理与最近通过）。
  - `plugin/src/bootstrap.js`：增加 `pathsEqual`（Windows 盘符大小写不敏感比较）并优先通过 `excludeSessionId` 在 `workspaceRegistry` 中反查所属工作区。
  - `plugin/src/store.js`：修复 `enqueueInProcess` 中 `next.finally(...)` 在 `updater` 抛错时产生未捕获拒绝（`unhandledRejection`）的潜在隐患，改为 `.then(cleanup, cleanup)`。
- `npm run verify && npm pack --dry-run`（`v0.1.1` 发布基线运行）：构建 `lib/client.js`（`71194` bytes），语法、单色检查、`16/16` 单元与多进程/拒绝恢复测试全通过；打包校验产出 `lightcheng-dsh-slate-0.1.1.tgz`（`34` 个文件，`2.3 MB`）。
- 隔离 DSH Web + Playwright 失效会话实测（最新运行，使用临时 `DSH_HOME` 并在测试后彻底清理 `.tmp/`）：
  - 真实活跃会话（`#6ff57aa9`）与已删会话任务（`#35cbd432`）同屏渲染，任务卡准确标记 `· 会话已删除`；
  - 点击已删会话任务标题不再跳回主页或报错，页面保留在活跃会话并展示黄色单色提示栏「会话 #35cbd432 已删除或不存在，无法跳转；如不再需要，可点击该任务下的「删除任务」移除。」，浏览器控制台与页面错误 `0`；
  - 点击 `删除任务` -> `确认删除` 后任务数由 `2` 降为 `1`、关联待检清除、关联问题独立保留，刷新页面后保持一致；实测截图已保存至 [v3-missing-session-delete.png](previews/v3-missing-session-delete.png)（原 `~/.dsh` SHA-256 前后一致）。

- **v0.1.0 基线发布前已验证项**（历史已发版本证据）：
  - `src/domain.js`、`src/prompt.js` & `src/tool.js`：同一 `taskId` 收到后续实测 `passed`/`failed` 检查时自动清理同任务遗留未执行 `todo` 占位及已被同命令/同标题/实测通过并完成替代的旧 `failed` 检查；`resolveTaskId` 在同一会话已有唯一未验收任务且未传 `taskId` 时自动复用（修复 TDD 红转绿改名产生重复红灯卡片）；用户手动点击「验收通过」的任务，其历史 `failed` 检查从顶部「优先处理」与提示词「未通过检查」中忽略（同时在 `验收记录` 如实保留历史 `failed` 记录）；相邻重复动态去重；引导子任务汇报省略 `projectGoal`/`acceptanceCriteria`。
  - `src/bootstrap.js` & `src/client.js`：通过 `typertGateway` 查询 `session/list`（`8000ms` 超时），过滤 `workspaceRegistry.archivedSessionIds`、`blank` 草稿、`origin === 'subagent'` 与已缺失日志的旧会话 ID，并修复 newest-first `sessionIds` 截断排序；客户端同时直接订阅 `useSessions((s) => s?.byId)` 与 `useWorkspaces`（`items` / `archivedSessionIds`）同步左侧栏真实标题，空态历史会话改用全宽纵向行表展示并默认显示 3 条，支持 `展开其余 N 个` / `收起` 查看全部，Quick Init prompt 仍严格上限 5 条引用。
  - `src/evidence.js`：增加壳命令退出码掩码检测（禁止 `|| true`、`; echo` 等将失败命令伪造为 `exitCode === 0` 通过，且 `failed` 检查不输出自相矛盾的 `退出码：0`）。
  - `package.json`、`cordis.patch.yml`、`scripts/verify.mjs`、`.github/workflows/release.yml`、`locale/{en,zh}.json`、`docs/plugin-page.{en,zh-CN}.md`、更新版 [03-empty-bootstrap.png](plugin/assets/screenshots/03-empty-bootstrap.png)、npm 绝对链接版 `plugin/README*.md`、`RELEASE.md`、`MARKETPLACE.md`、`LICENSE`、`screenshots.json`（6 张）及 `.github/workflows/{ci,release}.yml` 就绪；包名采用 `@lightcheng/dsh-slate`（与 `cordis.patch.yml` 一致校验），内部存储、Tab ID 与 RPC 路由仍兼容 `dsh-slate`。
- `npm run verify && npm pack --dry-run`（最新运行）：构建 `lib/client.js`（`63488` bytes），发布元数据、`cordis.patch.yml` 包名校验、`icon`、6 张截图、`screenshots.json`、单色规则与 `14/14` 单元/并发测试全部通过；打包产物为 `lightcheng-dsh-slate-0.1.0.tgz`（`34` 个文件，`2.3 MB`），并在隔离临时 `DSH_HOME` 中实测 `dsh plugin add link:.../plugin` 挂载 `@lightcheng/dsh-slate` 零报错。
- `node plugin/scripts/e2e-autoflow.mjs`（隔离真实 DSH 主动汇报与空态端到端通过，[v2-autoflow-report.json](test-results/v2-autoflow-report.json)）：
  - 日常开发会话未提插件/汇报工具即主动调用 `project_progress_report` 并通过 `exitCode === 0` 证据核对；独立重跑 `node --test` `1/1` 通过（[v2-autoflow-independent.txt](test-results/v2-autoflow-independent.txt)）。
  - 空项目过滤空白草稿后显示 `已有 1 个历史会话` 与全宽单色纵向可点击列表（见 [v2-01-empty-hints.png](previews/v2-01-empty-hints.png)），点击历史会话行跳转正常；点击「快速初始化」写入 `16px` 目标；浅/深色 `16px` Tab 图标 DOM 切换正常，浏览器错误 `0`。
- `node plugin/scripts/e2e-dsh.mjs`（全量 `AC-01`–`AC-08` 回归通过，[v1-e2e-report.json](test-results/v1-e2e-report.json)）：覆盖空态、三会话（含真实失败 `退出码：1` 核对与输出引用）、手动锁定防覆盖与恢复、完成/验收分离、跨会话保持、重启恢复、拖宽保持（`420px → 514px`）、未鉴权 RPC 返回 `401` 与隔离清理（原 `~/.dsh` SHA-256 一致）。
- **GitHub 与 npm 发布链路已闭环**：
  - GitHub 公开仓库：<https://github.com/light-cheng/DSH-Slate>（三平台 CI 全绿：<https://github.com/light-cheng/DSH-Slate/actions/runs/44985305716>）。
  - GitHub Release `v0.1.0`：<https://github.com/light-cheng/DSH-Slate/releases/tag/v0.1.0>；`.github/workflows/release.yml` 已通过 npm OIDC Trusted Publishing 成功发布 `@lightcheng/dsh-slate@0.1.0` 至 `latest`（<https://github.com/light-cheng/DSH-Slate/actions/runs/44985774016>，Sigstore Provenance logIndex `4035687924`），npm 包页：<https://www.npmjs.com/package/@lightcheng/dsh-slate>。
  - 插件市场 PR：<https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/17699>（已提交 `data/plugins/light-cheng__DSH-Slate--plugin.yml`，`category: workflow`，等待满 24 小时后由 `held-rescan` 自动重检通过）。
- **正式环境安装状态**：Windows 端已实机升级并验证至 `@lightcheng/dsh-slate@0.1.2`；本机 macOS `desktop` Profile 上次安装记录为 `@lightcheng/dsh-slate@0.1.0`（已在 `desktop/pnpm-workspace.yaml` 放行 `dsh-mobile-plugin@0.5.94`，可执行升级更新到 `0.1.2`），现有 `~/.dsh/storages/dsh-slate/` 项目进度数据完整保留。

## 下一步（新会话可直接接手）

1. **攒齐改动后再发版（例如 `v0.1.3`）**：`main` 当前已有 commit `85bd948`（未包含在 `v0.1.2` 内），待后续一并积累其他改动需要发版时，统一修改 [plugin/package.json](plugin/package.json) `version`、同步 [RELEASE.md](RELEASE.md) 与 [plugin/RELEASE.md](plugin/RELEASE.md)，运行 `cd plugin && npm run verify && npm pack --dry-run`，推送 `main` 后通过 `gh release create v0.1.3 --target main` 发布（自动 OIDC 推 npm `latest`）。
2. **插件市场跟进**：[awesome-dsh-plugin PR #17699](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/17699) 满 24 小时门禁（约 `2026-11-23 12:25`）后，复查 `Submission gate` 是否转绿并跟进合入状态。
3. **可选清理**：若不再需要早期占位包，在发布 72 小时内执行 `npm unpublish @lightcheng/dsh-slate@0.0.1-init.0` 或使用 `npm deprecate` 标弃。
