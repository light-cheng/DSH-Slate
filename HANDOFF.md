# DSH-Slate · 实施交接

更新时间：2026-11-22  
当前阶段：**v0.1 正式插件实施与 `AC-01`–`AC-08` 隔离验收已完成，双主题（M1 深 / M2 浅）Slate 图标已接入并重验通过，已本地链接安装至 `desktop` Profile，待真实项目手动实测。**

## 从这里开始

```sh
cd /Users/light/Documents/Projects/Agent/DSH-Slate/plugin
npm run build
npm run verify
```

先读 [SPEC.md](SPEC.md) 和本文件。[AGENTS.md](AGENTS.md) 包含编码边界与 DSH 测试隔离规则，[TESTING.md](TESTING.md) 记录隔离测试矩阵、新执行证据与历史基线区分。

## 目录结构

- [plugin/](plugin/)：正式生产插件目录（`index.js`、`icon.png`、`assets/icon-{dark,light}.png`、`assets/tab-icon-{dark,light}.png`、`src/evidence.js`、`src/domain.js`、`src/store.js`、`src/tool.js`、`src/rpc.js`、`src/client.js`、`src/styles.css`、`lib/client.js`、`scripts/build.mjs`、`scripts/verify.mjs`、`scripts/e2e-dsh.mjs`、`test/*.test.mjs`）。
- [prototype-plugin/](prototype-plugin/)：早期原型代码（只作历史参考，未修改也未用于生产）。
- [SPEC.md](SPEC.md)：正式需求规格、领域模型与 `AC-01`–`AC-08` 验收标准（v0.2）。
- [AGENTS.md](AGENTS.md)：编码 Agent 约束与隔离测试约定。
- [direction-approved.md](direction-approved.md)：已批准的原生 DSH 石墨单色视觉基准。
- [TESTING.md](TESTING.md)：正式验收矩阵、新执行证据与历史原型基线记录。
- [previews/](previews/)：包含本轮正式实现新截获的 6 张截图（`v1-01-empty.png` 至 `v1-06-evidence-detail.png`）及原型阶段历史基线截图。
- [test-results/](test-results/)：包含本轮正式实现新执行输出（`v1-e2e-report.json`、`v1-orders-pickup-independent.txt`、`v1-mobile-independent.txt`、`v1-manual-preservation.txt`）及原型阶段历史基线记录。

## 已核实的 DSH `0.2.2-rc.5` 宿主接口与实测结论

1. **真实会话身份与工作区直接读取**：`exec.agent.id` / `exec.agent.session.header.id` 与 `exec.agent.session.header.cwd` 在 Web 与 Headless 均可靠提供。正式 `project_progress_report` 已彻底移除可伪造的 `sessionId` 参数。
2. **FR-05 自动证据核对已开启并验证**：DSH `tool/result` 事件的关联 ID 字段为 `message.toolCallId`（以及 `message.source.callId`），而非 `message.callId`。`plugin/src/evidence.js` 配对真实 `bash`/`pwsh`/`shell` 执行结果与退出码：仅匹配到 `exitCode === 0` 才标记 `verifiedBy: 'evidence'`，真实失败覆盖为 `failed`，缺失真实运行降级为 `todo`；同时长输出受控落盘为 `outputs/<hash>/chk-<hash>.txt`。
3. **认证通信通道实测边界**：`0.2.2-rc.5` 中 `ctx.connection.rpc.handle` 会因 `dsh-client-connection` 内部读取 `this.ctx.webServer` 抛出 `cannot get property "webServer" without inject`；因此正式实现采用与宿主内置插件一致的 `ctx.connection.fetch.register('/api/dsh-slate/rpc')` + `ctx.connection.fetch.register('/api/dsh-slate/events')`，复用 DSH `/api` 入口 `BrowserAuth`、Host/Origin 校验与 `owner` Peer 鉴权（实测未认证请求返回 HTTP `401`）。
4. **工作区隔离与跨进程锁**：状态按 `realpath` 规范化工作区路径哈希隔离在 `${DSH_HOME}/storages/dsh-slate/`，使用进程内串行队列 + `O_EXCL` 跨进程锁文件 + 原子写保护，并在 6 进程并发写入测试中 0 丢更新。
5. **栏宽保护与跨会话保持**：`0.2.2-rc.5` 的 `LayoutController` 未提供 `requestRightbarWidth`，回退 `panels.setRightbar(420)` 仅在首次打开时执行一次；实测初始栏宽 `420px`，拖动至 `514px` 后跨标签、跨会话导航仍保留 `514px`。通过 `ctx.sidebarRight.openTabIn` 与 `mounted` 监听，点击任务跳转目标会话后项目页自动保持打开。
6. **单色视觉与编辑区修复**：合并为单一 `src/styles.css`，清除所有蓝色/绿色残留；修复按钮选择器优先级使暗底白字（`rgb(15, 17, 21)` / `rgb(255, 255, 255)`）在编辑区清晰可读；正文 `>= 14px`、辅助文字 `>= 12px`。

## 本轮已验证项

- **图标与双主题集成**：接入定稿 M1（矿石青灰深色）与 M2（浅雾石板浅色）图标——`plugin/package.json` 声明默认 `"icon": "./icon.png"`（`256×256` RGBA），`plugin/assets/` 保存 `512×512` 与 `48×48` 双色资源；`plugin/README.md` 通过 `<picture>` 随 `prefers-color-scheme` 切换；`src/client.js` `TabTitle` 嵌入 `16×16` 图标并随宿主 `body[data-ds-dark-theme]` 自动切换。
- `npm run verify`（接入图标后最新重跑）：构建 `lib/client.js`（53417 bytes），PNG 幻数与 `package.json` `"icon"` 声明校验通过，单色正则校验通过，`8/8` 单元与 6 进程并发集成测试全部通过。
- **正式环境安装状态**：`desktop` Profile 已通过 `dsh plugin --profile desktop add link:/Users/light/Documents/Projects/Agent/DSH-Slate/plugin` 链接安装，`~/.dsh/profiles/desktop/node_modules/dsh-slate` 直接指向仓库 `plugin/`，更新文件与重构建实时生效；`web` Profile 因已有依赖 `dsh-worktable` 的浮动 GitHub release 校验和触发 `ERR_PNPM_TARBALL_INTEGRITY` 而保持未改动。
- `node plugin/scripts/e2e-dsh.mjs`（v0.1 接入图标前跑通的全新临时 `DSH_HOME`、`slate-web`、`slate-headless`、Magpie `auto/deepseek-v4.1-flash`）：
  - `AC-01`–`AC-08` 全部通过（[v1-e2e-report.json](test-results/v1-e2e-report.json)）。
  - 独立重跑订单与自取测试 `6/6` 通过（[v1-orders-pickup-independent.txt](test-results/v1-orders-pickup-independent.txt)）；移动端测试 `1/1` 如实失败（[v1-mobile-independent.txt](test-results/v1-mobile-independent.txt)）。
  - 手动调整保护与「恢复会话汇报」校验通过（[v1-manual-preservation.txt](test-results/v1-manual-preservation.txt)）。
  - 浏览器 `pageerror` 与 `console.error` 均为 `0`；未认证 RPC 被 HTTP `401` 拒绝；临时目录已清理，原 `~/.dsh` 的 `desktop`、`web` 未受任何影响。

## 下一步（如后续迭代）

- 用户在 **DeepSeek Harness 桌面端** 真实项目中实测右侧栏「项目进度」面板、深/浅色切换下的 `TabTitle` 图标以及工具真实汇报；如决定同时安装至 `web` Profile，需先经用户确认处理 `dsh-worktable` lockfile 校验和冲突。
- 若需接通端到端真实人类用户确认、任务依赖图或新 DSH 版本适配，按 `AGENTS.md` 在独立分支或新提交上扩展并重跑 `npm run verify` 与 `node plugin/scripts/e2e-dsh.mjs`。
