# DSH-Slate · 实施交接

更新时间：2026-11-22  
当前阶段：**`v0.1.0` 已正式发布到 GitHub、npm 与提交插件市场 PR——GitHub 仓库 `light-cheng/DSH-Slate`、GitHub Release `v0.1.0`、npm `@lightcheng/dsh-slate@0.1.0`（OIDC Provenance）均已上线，桌面端已切换为 `@lightcheng/dsh-slate@0.1.0`，且 `awesome-dsh-plugin` PR #17699 已提交等待 24 小时新仓门禁自动放行。**

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
- **正式环境安装状态**：`desktop` Profile 已移除旧本地链接 `dsh-slate`，改为安装正式 npm 包 `@lightcheng/dsh-slate@0.1.0`（并在 `desktop/pnpm-workspace.yaml` 同步放行已安装的 `dsh-mobile-plugin@0.5.94`）；现有 `~/.dsh/storages/dsh-slate/` 项目进度数据完整保留。

## 下一步（如后续迭代）

- **可选清理**：在 72 小时内执行 `npm unpublish @lightcheng/dsh-slate@0.0.1-init.0`（或 `npm deprecate`）移除或标弃早期 OIDC 占位版本。
- **插件市场跟进**：PR #17699 满 24 小时（约 `2026-11-23 12:25`）后确认 `Submission gate` 转绿等待维护者合入。
