# DSH-Slate · 编码 Agent 工作约定

## 先读什么

- 继续实施：先读 [HANDOFF.md](HANDOFF.md) 获取当前进度、已验证的宿主接口和实施顺序。
- 修改行为、数据或验收：读 [SPEC.md](SPEC.md)，保持需求编号（`FR-*` / `AC-*`）可追踪。
- 修改视觉：读 [direction-approved.md](direction-approved.md)；最新方向是原生 DSH 的石墨单色版。
- 运行测试：读 [TESTING.md](TESTING.md)，区分历史原型基线与正式实现的新执行证据。

## 修改边界

- 正式生产插件源码一律放在 [plugin/](plugin/) 中开发。
- [prototype-plugin/](prototype-plugin/) 仅作为历史原型参考保留；**不要**向 `prototype-plugin/` 继续叠加补丁或充当正式产物。
- 当前目录已初始化为 Git 仓库（`main` 分支）；未实际执行 `git commit` / 推送前，不要声称已提交或已推送。
- 本机 DSH CLI（`0.2.2-rc.5`）可执行文件位于 `/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh`；临时测试默认使用 Magpie 的 DeepSeek 路由组。

## 产品约束

- 会话、代码修改、测试、进度和问题必须来自真实执行；不能用硬编码数据代替测试。
- 完成与验收分开；模型文字声明不能单独代替测试执行证据。
- 用户手动调整的字段（项目目标、验收标准、优先级、预估、下一交付物）不得被后续汇报静默覆盖，必须提供“恢复会话汇报”。
- 项目状态按规范化工作区路径隔离，不允许把不同项目写进同一份全局状态。
- 使用正常项目文案，不写面向实现的 AI 黑话。
- 不显示项目总完成度百分比；单项任务预估可以保留。
- 使用 DSH 原生 token、字体与字号；不使用绿色，交互与编辑区保持灰阶（无蓝色）。红色只用于失败/严重问题，黄色只用于等待/阻塞。
- 保留约 `420px` 初始栏宽（但不覆盖用户手动调整）、纵向任务轴和文字化状态。

## 原型不可复用的部分

`prototype-plugin/` 中的以下实现已在 `SPEC.md` 中淘汰，禁止搬入 `plugin/`：

- 单一共享 JSON 文件与无锁并发读写（且不能直接使用单进程假设的 `dsh-storage-json`）。
- 仅校验 Origin 的无鉴权 HTTP 路由（必须替换为 `ctx.connection.rpc` / `ctx.connection.fetch`）。
- 工具参数传入可伪造的 `sessionId`（必须由 Host 直接从 `exec.agent.id` / `exec.agent.session.header` 取真实会话与工作区）。
- `requestRightbarWidth` 缺失时在每次渲染强行覆写 `setRightbar(420)` 的逻辑。
- 5 段拼接的层叠 CSS、未捕获异常的编辑请求以及缺失“恢复会话汇报”的数据模型。

## DSH 测试隔离

每次测试都创建项目内新的临时 `DSH_HOME` 和新 Profile，只向该环境安装插件：

- 不安装、修改或重启用户现有的 `~/.dsh`、`desktop`、`web`。
- 服务器绑定 `127.0.0.1`、随机空闲端口并使用 `--no-open`。
- Magpie 凭据只从已有配置读取到临时进程环境；不输出、不保存到任何文件、日志或截图。
- 测试项目、会话、状态文件和运行时都位于临时目录（由 `.gitignore` 忽略并在测试后清理）。
- 历史截图和测试输出只作为基线参考，不得冒充本轮新执行。

## 完成一轮工作的条件

1. `plugin/` 构建成功，自动化单元与集成断言通过，浏览器无新增错误。
2. 涉及真实项目行为时，实际创建真实 DSH 会话并独立重跑对应项目测试；保存真实输出。
3. 涉及界面时，保存本轮浅色/深色或相关状态截图，注明数据来自新执行还是历史基线。
4. 停止临时服务器，删除临时 `DSH_HOME`、Profile、会话、项目和运行时。
5. 更新 [HANDOFF.md](HANDOFF.md) 的当前状态、已验证项、新发现的问题和下一步；行为变化同步 [SPEC.md](SPEC.md)。

不要以“页面能打开”代替完整验收。
