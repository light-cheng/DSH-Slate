# DSH-Slate · 实施交接

更新时间：2026-11-22  
当前阶段：**Release-ready 收口完成（暂未推送远端也未发布 npm）——已修复同一/跨会话 TDD 由红转绿任务复用与旧失败检查自动替换、相邻重复动态去重、插件市场中英双语简介与详情页、以及未初始化工作区纵向可展开历史会话，通过 `14/14` 单元及隔离 DSH 端到端实测，待用户重启桌面端完成第 4–5 步复测后发布。**

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

- **发布前逻辑修复与元数据收口**：
  - `src/domain.js`、`src/prompt.js` & `src/tool.js`：同一 `taskId` 收到后续实测 `passed`/`failed` 检查时自动清理同任务遗留未执行 `todo` 占位及已被同命令/同标题/实测通过并完成替代的旧 `failed` 检查；`resolveTaskId` 在同一会话已有唯一未验收任务且未传 `taskId` 时自动复用（修复 TDD 红转绿改名产生重复红灯卡片）；用户手动点击「验收通过」的任务，其历史 `failed` 检查从顶部「优先处理」与提示词「未通过检查」中忽略（同时在 `验收记录` 如实保留历史 `failed` 记录）；相邻重复动态去重；引导子任务汇报省略 `projectGoal`/`acceptanceCriteria`。
  - `src/bootstrap.js` & `src/client.js`：通过 `typertGateway` 查询 `session/list`（`8000ms` 超时），过滤 `workspaceRegistry.archivedSessionIds`、`blank` 草稿、`origin === 'subagent'` 与已缺失日志的旧会话 ID，并修复 newest-first `sessionIds` 截断排序；客户端同时直接订阅 `useSessions((s) => s?.byId)` 与 `useWorkspaces`（`items` / `archivedSessionIds`）同步左侧栏真实标题，空态历史会话改用全宽纵向行表展示并默认显示 3 条，支持 `展开其余 N 个` / `收起` 查看全部，Quick Init prompt 仍严格上限 5 条引用。
  - `locale/{en,zh}.json`、`docs/plugin-page.{en,zh-CN}.md`、双语 README、`RELEASE.md`、`MARKETPLACE.md`、`LICENSE`、`screenshots.json`（6 张）及 `.github/workflows/{ci,release}.yml` 就绪。
- `npm run verify && npm pack --dry-run`（最新运行）：构建 `lib/client.js`（`63476` bytes），发布元数据、`icon`、6 张截图、`screenshots.json`、单色规则与 `14/14` 单元/并发测试全部通过；打包产物不含 `prototype-plugin/`、`test/` 与临时文件。
- `node plugin/scripts/e2e-autoflow.mjs`（最新隔离真实 DSH 验收，[v2-autoflow-report.json](test-results/v2-autoflow-report.json)）：
  - 日常开发会话未提插件/汇报工具即主动调用 `project_progress_report` 并通过 `exitCode === 0` 证据核对；独立重跑 `node --test` `1/1` 通过（[v2-autoflow-independent.txt](test-results/v2-autoflow-independent.txt)）。
  - 空项目过滤空白草稿后显示 `已有 1 个历史会话` 与全宽单色纵向可点击列表（见 [v2-01-empty-hints.png](previews/v2-01-empty-hints.png)），且在 Playwright 中实测点击历史会话行成功跳转至目标会话并保持右侧「项目进度」打开；点击「快速初始化」写入 `16px` 目标；浅/深色 `16px` Tab 图标切换正常，浏览器错误 `0`。
- `node plugin/scripts/e2e-dsh.mjs`（全量 `AC-01`–`AC-08` 回归通过，[v1-e2e-report.json](test-results/v1-e2e-report.json)）：覆盖空态、三会话、手动锁定防覆盖与恢复（且子任务自动遵循不覆写项目目标与验收标准规则）、完成/验收分离、跨会话保持、重启恢复、拖宽保持与隔离清理（原 `~/.dsh` SHA-256 一致）。
- **正式环境安装状态**：`desktop` Profile 软链 `~/.dsh/profiles/desktop/node_modules/dsh-slate` 已指向更新后的 `plugin/`；`web` Profile 因既有 `dsh-worktable` 校验和冲突保持未改动；Git 仅本地提交，未推送未发布。

## 下一步（如后续迭代）

- 用户**重启 DeepSeek Harness 桌面端**打开 `pocket-ledger` 确认顶部遗留的「优先处理 · 失败」自动消退（可在 `pocket-ledger` 再确认是否需要清理测试面板），随后确认是否开始发布：创建 GitHub 公开仓库并推送 `main` → 配置 npm OIDC Trusted Publishing → 发布 `v0.1.0` Release 自动发布 npm → 向 `awesome-dsh-plugin` 提交 `light-cheng__DSH-Slate.yml`。
