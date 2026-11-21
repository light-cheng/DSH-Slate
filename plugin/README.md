<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./assets/icon-dark.png" />
  <img src="./assets/icon-light.png" alt="DSH-Slate" width="64" height="64" />
</picture>

# DSH-Slate 生产插件

基于 [SPEC.md](../SPEC.md)（v0.2）为 DeepSeek Harness `0.2.2-rc.5` 构建的项目级进度侧栏插件。

## 核心能力

- **工作区隔离与跨进程安全存储**：按规范化工作区路径隔离状态，使用文件锁与原子写入支持 Web 与多 Headless 并发汇报。
- **权威身份与真实测试证据**：从 `exec.agent` 与会话事件日志直接获取真实 `sessionId`、`cwd` 及命令执行结果（FR-05 自动核对）。
- **认证通信与实时更新**：通过 `ctx.connection.rpc` 与 `ctx.connection.fetch` 接入 DSH 鉴权通道并支持 SSE 推送。
- **单色原生右侧栏**：遵循 DSH `--dsw-*` 语义变量、约 `420px` 初始栏宽（保留用户拖动）、手动编辑保护与「恢复会话汇报」、跨会话标签保持。

## 命令

```sh
npm run build   # 编译生成 lib/client.js
npm run verify  # 构建并运行单元与跨进程并发集成测试
```
