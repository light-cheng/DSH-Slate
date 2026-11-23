import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySessionReport,
  buildProjectView,
  completeTask,
  createEmptyProject,
  deleteTask,
  restoreGoal,
  restoreTask,
  setIssueStatus,
  updateGoal,
  updateTask,
  verifyTask,
} from '../src/domain.js';
import { extractShellExecutions, verifyReportedChecks } from '../src/evidence.js';

function makeSession(events) {
  return {
    seq: events.length,
    eventAt: (i) => events[i],
  };
}

test('empty project has zero summary counts and hidden priority/latest blocks', () => {
  const empty = createEmptyProject('/tmp/proj-a', '2026-11-21T10:00:00.000Z');
  const view = buildProjectView(empty);
  assert.equal(view.summary.inProgressCount, 0);
  assert.equal(view.summary.awaitingAcceptanceCount, 0);
  assert.equal(view.summary.openIssuesCount, 0);
  assert.equal(view.summary.verifiedCount, 0);
  assert.equal(view.priorityItem, null);
  assert.equal(view.latestVerified, null);
  assert.equal(view.tasks.length, 0);
});

test('FR-04: manual goal and task edits resist session overwrites until explicitly restored', () => {
  let project = createEmptyProject('/tmp/proj-a', '2026-11-21T10:00:00.000Z');
  ({ project } = applySessionReport(
    project,
    {
      projectGoal: '初始目标',
      acceptanceCriteria: ['标准 A'],
      task: '订单接口',
      priority: 'P1',
      workStatus: 'in_progress',
      progressEstimate: 40,
      nextDeliverable: '实现取消恢复库存',
      summary: '创建接口骨架',
    },
    { sessionId: 'session-11111111', workspacePath: '/tmp/proj-a', now: '2026-11-21T10:01:00.000Z' }
  ));

  const taskId = project.tasks[0].id;
  project = updateGoal(project, { goal: '用户锁定目标', acceptanceCriteria: '用户标准 1\n用户标准 2' }, '2026-11-21T10:02:00.000Z');
  project = updateTask(
    project,
    { taskId, priority: 'P0', progressEstimate: 65, nextDeliverable: '用户自定义交付' },
    '2026-11-21T10:02:10.000Z'
  );

  // Session reports new goal, criteria, priority, 100%, and deliverable
  ({ project } = applySessionReport(
    project,
    {
      projectGoal: '会话新目标',
      acceptanceCriteria: ['会话新标准'],
      taskId,
      task: '订单接口',
      priority: 'P2',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '会话最终交付',
      summary: '已完成全部开发',
    },
    { sessionId: 'session-11111111', workspacePath: '/tmp/proj-a', now: '2026-11-21T10:03:00.000Z' }
  ));

  let view = buildProjectView(project);
  assert.equal(view.goal, '用户锁定目标');
  assert.deepEqual(view.acceptanceCriteria, ['用户标准 1', '用户标准 2']);
  assert.equal(view.hasGoalOverride, true);
  assert.equal(view.tasks[0].priority, 'P0');
  assert.equal(view.tasks[0].progressEstimate, 65);
  assert.equal(view.tasks[0].nextDeliverable, '用户自定义交付');
  assert.equal(view.tasks[0].workStatus, 'done');
  assert.equal(view.tasks[0].hasManualOverride, true);

  // Restore task & goal back to latest session-reported snapshot
  project = restoreTask(project, { taskId }, '2026-11-21T10:04:00.000Z');
  project = restoreGoal(project, '2026-11-21T10:04:05.000Z');
  view = buildProjectView(project);

  assert.equal(view.goal, '会话新目标');
  assert.deepEqual(view.acceptanceCriteria, ['会话新标准']);
  assert.equal(view.hasGoalOverride, false);
  assert.equal(view.tasks[0].priority, 'P2');
  assert.equal(view.tasks[0].progressEstimate, 100);
  assert.equal(view.tasks[0].nextDeliverable, '会话最终交付');
  assert.equal(view.tasks[0].hasManualOverride, false);
});

test('FR-05 & AC-04: evidence verification enforces real exitCode===0 and separates completion from acceptance', async () => {
  const session = makeSession([
    {
      type: 'tool/call',
      seq: 0,
      data: { callId: 'c1', name: 'bash', arguments: JSON.stringify({ command: 'node --test test/orders.test.js' }) },
    },
    {
      type: 'tool/result',
      seq: 1,
      data: {
        message: { toolCallId: 'c1', source: { kind: 'tool', callId: 'c1' }, isError: false, content: [{ type: 'text', text: '✔ 3 passed\nℹ pass 3\nℹ fail 0' }] },
        meta: { cwd: '/tmp/proj-a' },
      },
    },
    {
      type: 'tool/call',
      seq: 2,
      data: { callId: 'c2', name: 'bash', arguments: JSON.stringify({ command: 'node --test test/mobile.test.js' }) },
    },
    {
      type: 'tool/result',
      seq: 3,
      data: {
        message: { toolCallId: 'c2', source: { kind: 'tool', callId: 'c2' }, isError: false, content: [{ type: 'text', text: '✖ fail 1\n[exit code: 1]' }] },
        meta: { cwd: '/tmp/proj-a' },
      },
    },
  ]);

  const execs = extractShellExecutions(session);
  assert.equal(execs.length, 2);
  assert.equal(execs[0].status, 'passed');
  assert.equal(execs[0].exitCode, 0);
  assert.equal(execs[1].status, 'failed');
  assert.equal(execs[1].exitCode, 1);

  const verified = await verifyReportedChecks(
    [
      { title: '订单测试', state: 'passed', command: 'node --test test/orders.test.js', note: '3 项通过' },
      { title: '虚假测试', state: 'passed', command: 'node --test test/nonexistent.test.js', note: '模型自报通过' },
      { title: '移动端伪报通过', state: 'passed', command: 'node --test test/mobile.test.js', note: '声称通过' },
    ],
    execs,
    { now: '2026-11-21T10:05:00.000Z' }
  );

  assert.equal(verified.checks[0].state, 'passed');
  assert.equal(verified.checks[0].verifiedBy, 'evidence');
  assert.equal(verified.checks[1].state, 'todo'); // downgraded due to no execution
  assert.equal(verified.checks[2].state, 'failed'); // overridden due to real exit code 1
  assert.equal(verified.checks[2].exitCode, 1);
  assert.equal(verified.downgradedCount, 1);
  assert.equal(verified.mismatchedCount, 1);

  // AC-04: completing a task does NOT mark it verified
  let project = createEmptyProject('/tmp/proj-a');
  ({ project } = applySessionReport(
    project,
    {
      projectGoal: '测试分离',
      task: '人工审查任务',
      workStatus: 'in_progress',
      progressEstimate: 80,
      nextDeliverable: '等待完成',
      summary: '开发中',
      checks: [verified.checks[2]],
    },
    { sessionId: 'session-22222222', workspacePath: '/tmp/proj-a' }
  ));

  const taskId = project.tasks[0].id;
  project = completeTask(project, { taskId });
  let view = buildProjectView(project);
  assert.equal(view.tasks[0].workStatus, 'done');
  assert.equal(view.tasks[0].verified, false);
  assert.equal(view.summary.awaitingAcceptanceCount, 1);
  assert.equal(view.summary.verifiedCount, 0);
  assert.equal(view.latestVerified, null);
  assert.equal(view.priorityItem?.kind, 'check');
  assert.equal(view.priorityItem?.severity, '失败');

  // Explicit user confirmation marks it verified and clears priority focus while keeping historical check honest
  project = verifyTask(project, { taskId });
  view = buildProjectView(project);
  assert.equal(view.tasks[0].verified, true);
  assert.equal(view.tasks[0].verifiedBy, 'user');
  assert.equal(view.summary.awaitingAcceptanceCount, 0);
  assert.equal(view.summary.verifiedCount, 1);
  assert.equal(view.latestVerified.taskId, taskId);
  assert.equal(view.priorityItem, null);
  assert.equal(project.checks[0].state, 'failed');

  // Masked exit codes (e.g. `|| true` or `; echo $?`) cannot forge `passed` or stamp `exitCode: 0` on `failed`
  const maskedSession = makeSession([
    {
      type: 'tool/call',
      seq: 0,
      data: { callId: 'cmask', name: 'bash', arguments: JSON.stringify({ command: 'node --test test/mobile.test.js || true' }) },
    },
    {
      type: 'tool/result',
      seq: 1,
      data: {
        message: { toolCallId: 'cmask', source: { kind: 'tool', callId: 'cmask' }, isError: false, content: [{ type: 'text', text: '✖ fail 1\n[exit code: 0]' }] },
      },
    },
  ]);
  const maskedExecs = extractShellExecutions(maskedSession);
  assert.equal(maskedExecs[0].status, 'masked');
  assert.equal(maskedExecs[0].exitCode, null);

  const maskedRes = await verifyReportedChecks(
    [
      { title: '掩码伪装通过', state: 'passed', command: 'node --test test/mobile.test.js || true', note: 'claimed' },
      { title: '掩码失败记录', state: 'failed', command: 'node --test test/mobile.test.js || true', note: 'failed' },
    ],
    maskedExecs
  );
  assert.equal(maskedRes.checks[0].state, 'todo');
  assert.equal(maskedRes.downgradedCount, 1);
  assert.equal(maskedRes.checks[1].state, 'failed');
  assert.equal(maskedRes.checks[1].exitCode, null);
});

test('FR-06 & FR-08: stable issue IDs deduplicate updates, rank priority focus, and support multi-session tasks', () => {
  let project = createEmptyProject('/tmp/proj-a');
  ({ project } = applySessionReport(
    project,
    {
      task: '移动端检查',
      priority: 'P1',
      workStatus: 'in_progress',
      progressEstimate: 50,
      nextDeliverable: '修复溢出',
      summary: '首次排查',
      issues: [
        { id: 'iss-overflow', severity: 'P1', title: '横向溢出', detail: '760px 固定宽' },
        { severity: 'P2', title: '弱测试', detail: '缺断言' },
      ],
    },
    { sessionId: 'session-aaaaaaaa', workspacePath: '/tmp/proj-a', now: '2026-11-21T10:00:00.000Z' }
  ));

  const taskId = project.tasks[0].id;

  // Second report by another session on same task updates iss-overflow & omits P2 issue -> resolves P2 without creating duplicates
  ({ project } = applySessionReport(
    project,
    {
      taskId,
      task: '移动端检查',
      priority: 'P1',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '等待验收',
      summary: '复核更新',
      issues: [
        { id: 'iss-overflow', severity: 'P0', title: '横向溢出（严重）', detail: '375px 下阻断下单' },
      ],
    },
    { sessionId: 'session-aaaaaaaa', workspacePath: '/tmp/proj-a', now: '2026-11-21T10:01:00.000Z' }
  ));

  // Different session collaborates on the same taskId
  ({ project } = applySessionReport(
    project,
    {
      taskId,
      task: '移动端检查',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '已联调',
      summary: '协同补充',
    },
    { sessionId: 'session-bbbbbbbb', workspacePath: '/tmp/proj-a', now: '2026-11-21T10:02:00.000Z' }
  ));

  let view = buildProjectView(project);
  assert.equal(view.tasks.length, 1);
  assert.deepEqual(view.tasks[0].sessionIds, ['session-aaaaaaaa', 'session-bbbbbbbb']);
  assert.equal(view.issues.length, 2);
  assert.equal(view.summary.openIssuesCount, 1);
  assert.equal(view.priorityItem.id, 'iss-overflow');
  assert.equal(view.priorityItem.severity, 'P0');

  project = setIssueStatus(project, { issueId: 'iss-overflow', status: 'resolved' });
  view = buildProjectView(project);
  assert.equal(view.summary.openIssuesCount, 0);
  assert.equal(view.priorityItem, null);
});

test('FR-06: cross-session executed checks replace stale todo placeholders while keeping real evidence checks', () => {
  let project = createEmptyProject('/tmp/proj-a');
  ({ project } = applySessionReport(
    project,
    {
      projectGoal: '发布前维护',
      task: 'v0.4.0 发布后维护',
      workStatus: 'in_progress',
      progressEstimate: 40,
      nextDeliverable: '跑全量测试',
      summary: '初始化基线',
      checks: [
        { id: 'chk-lint', title: '语法检查', state: 'todo', note: '尚未执行' },
        { title: '测试套件', state: 'todo', note: '尚未执行' },
      ],
    },
    { sessionId: 'session-init-1111', workspacePath: '/tmp/proj-a', now: '2026-11-22T09:00:00.000Z' }
  ));

  const taskId = project.tasks[0].id;
  assert.equal(project.checks.length, 2);

  // Second session passes real checks on the same taskId (updating chk-lint explicitly + adding npm test)
  ({ project } = applySessionReport(
    project,
    {
      taskId,
      task: 'v0.4.0 发布后维护',
      workStatus: 'in_progress',
      progressEstimate: 85,
      nextDeliverable: '发布核对',
      summary: '语法与测试均通过',
      checks: [
        {
          id: 'chk-lint',
          title: 'npm run check 语法检查',
          state: 'passed',
          command: 'npm run check',
          exitCode: 0,
          verifiedBy: 'evidence',
          evidenceMatched: true,
          note: '73/73 ok',
        },
        {
          title: 'npm test 全量测试',
          state: 'passed',
          command: 'npm test',
          exitCode: 0,
          verifiedBy: 'evidence',
          evidenceMatched: true,
          note: '478 passed',
        },
      ],
    },
    { sessionId: 'session-test-2222', workspacePath: '/tmp/proj-a', now: '2026-11-22T09:10:00.000Z' }
  ));

  // Stale todo placeholders from session-init-1111 must be gone; only 2 executed passed checks remain
  assert.equal(project.checks.length, 2);
  assert.equal(project.checks.every((c) => c.state === 'passed'), true);

  // Third session adding a todo check must NOT wipe earlier real passed checks from session-test-2222
  ({ project } = applySessionReport(
    project,
    {
      taskId,
      task: 'v0.4.0 发布后维护',
      workStatus: 'in_progress',
      progressEstimate: 90,
      nextDeliverable: 'Windows 烟测',
      summary: '登记补充检查',
      checks: [
        { title: 'Windows 真机烟测', state: 'todo', note: '待在 Windows 执行' },
      ],
    },
    { sessionId: 'session-doc-3333', workspacePath: '/tmp/proj-a', now: '2026-11-22T09:20:00.000Z' }
  ));

  assert.equal(project.checks.length, 3);
  assert.equal(project.checks.filter((c) => c.state === 'passed').length, 2);
  assert.equal(project.checks.filter((c) => c.state === 'todo').length, 1);
});

test('TDD red-to-green reuses unverified session task without taskId, clears superseded failed checks, and deduplicates activity', () => {
  let project = createEmptyProject('/tmp/proj-tdd');
  // 1. Same-session TDD red-to-green rename WITHOUT taskId
  ({ project } = applySessionReport(
    project,
    {
      task: '导出 CSV 测试（TDD 红）',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '实现 Ledger#exportCsv() 使 test/export.test.js 转绿',
      summary: '新增失败测试',
      checks: [
        { title: 'node --test 确认新导出测试失败', state: 'failed', command: 'node --test', exitCode: 1, note: '2 failed' },
      ],
    },
    { sessionId: 'session-tdd-1111', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:34:00.000Z' }
  ));
  assert.equal(project.tasks.length, 1);
  assert.equal(buildProjectView(project).priorityItem?.kind, 'check');

  // Same session fixes and renames task WITHOUT passing taskId
  ({ project } = applySessionReport(
    project,
    {
      task: '实现 Ledger#exportCsv（CSV 导出）',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '无，CSV 导出已完成',
      summary: '实现 exportCsv 并全部测试通过',
      checks: [
        { title: 'node --test 全部测试通过', state: 'passed', command: 'node --test', exitCode: 0, verifiedBy: 'evidence', evidenceMatched: true, note: '12 pass' },
      ],
    },
    { sessionId: 'session-tdd-1111', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:35:00.000Z' }
  ));

  let view = buildProjectView(project);
  assert.equal(view.tasks.length, 1);
  assert.equal(view.tasks[0].title, '实现 Ledger#exportCsv（CSV 导出）');
  assert.equal(view.tasks[0].verified, true);
  assert.equal(view.tasks[0].hasFailedCheck, false);
  assert.equal(view.priorityItem, null);
  assert.equal(project.checks.length, 1);
  assert.equal(project.checks[0].state, 'passed');

  // 2. Once task is verified, a subsequent unrelated report in the same session WITHOUT taskId starts a new task
  ({ project } = applySessionReport(
    project,
    {
      task: '补充文档',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '无',
      summary: '更新 README',
    },
    { sessionId: 'session-tdd-1111', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:36:00.000Z' }
  ));
  assert.equal(project.tasks.length, 2);

  // 3. Cross-session Red -> downgraded todo (must keep failed) -> Green on same taskId
  ({ project } = applySessionReport(
    project,
    {
      task: '修复筛选边界',
      workStatus: 'in_progress',
      progressEstimate: 30,
      nextDeliverable: '修复边界断言',
      summary: '复现失败',
      checks: [
        { title: '筛选测试', state: 'failed', command: 'node --test test/filter.test.js', exitCode: 1, note: '1 failed' },
      ],
    },
    { sessionId: 'session-b-2222', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:37:00.000Z' }
  ));
  const filterTaskId = project.tasks[2].id;

  // Session C reports a downgraded todo check -> must NOT clear Session B's failed check
  ({ project } = applySessionReport(
    project,
    {
      taskId: filterTaskId,
      task: '修复筛选边界',
      workStatus: 'done',
      progressEstimate: 90,
      nextDeliverable: '复跑筛选测试',
      summary: '口头汇报通过但未运行命令',
      checks: [
        { title: '筛选测试', state: 'todo', command: 'node --test test/filter.test.js', note: '未实际运行' },
      ],
    },
    { sessionId: 'session-c-3333', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:38:00.000Z' }
  ));
  view = buildProjectView(project);
  assert.equal(view.tasks[2].hasFailedCheck, true);
  assert.equal(view.tasks[2].verified, false);

  // Session D runs real passing check on filterTaskId -> supersedes failed check
  ({ project } = applySessionReport(
    project,
    {
      taskId: filterTaskId,
      task: '修复筛选边界',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '已完成',
      summary: '实测通过',
      checks: [
        { title: '全量测试', state: 'passed', command: 'node --test', exitCode: 0, verifiedBy: 'evidence', evidenceMatched: true, note: '14 pass' },
      ],
    },
    { sessionId: 'session-d-4444', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:39:00.000Z' }
  ));
  view = buildProjectView(project);
  assert.equal(view.tasks[2].verified, true);
  assert.equal(view.tasks[2].hasFailedCheck, false);
  assert.equal(view.priorityItem, null);

  // 4. Adjacent duplicate activity deduplication
  const countBefore = project.activity.length;
  ({ project } = applySessionReport(
    project,
    {
      taskId: filterTaskId,
      task: '修复筛选边界',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '已完成',
      summary: '实测通过',
    },
    { sessionId: 'session-d-4444', workspacePath: '/tmp/proj-tdd', now: '2026-11-22T11:40:00.000Z' }
  ));
  assert.equal(project.activity.length, countBefore);
});

test('deleteTask removes task and attached checks, detaches issues, recalculates view, and guards unknown taskId', () => {
  let project = createEmptyProject('/tmp/proj-del', '2026-11-23T01:00:00.000Z');

  // Task A: verified task with a failing check and a linked issue
  ({ project } = applySessionReport(
    project,
    {
      projectGoal: '清理过期任务验证',
      task: '待删除任务 A',
      priority: 'P1',
      workStatus: 'done',
      progressEstimate: 100,
      nextDeliverable: '已归档任务输出',
      summary: 'A 上报完成',
      checks: [
        { id: 'chk-a-pass', title: 'A 通过测试', state: 'passed', command: 'npm test', exitCode: 0, verifiedBy: 'evidence', evidenceMatched: true },
        { id: 'chk-a-fail', title: 'A 失败检查', state: 'failed', command: 'npm run lint', exitCode: 1, note: 'exit 1' },
      ],
      issues: [
        { id: 'iss-a-open', severity: 'P2', title: 'A 关联遗留问题', detail: '需要后续跟进' },
      ],
    },
    { sessionId: 'session-deadbeef', workspacePath: '/tmp/proj-del', now: '2026-11-23T01:01:00.000Z' }
  ));

  // Task B: active task that must remain untouched
  ({ project } = applySessionReport(
    project,
    {
      task: '保留任务 B',
      priority: 'P0',
      workStatus: 'in_progress',
      progressEstimate: 50,
      nextDeliverable: '继续开发',
      summary: 'B 开发中',
      checks: [
        { id: 'chk-b-todo', title: 'B 待检查', state: 'todo', note: '待执行' },
      ],
    },
    { sessionId: 'session-livebeef', workspacePath: '/tmp/proj-del', now: '2026-11-23T01:02:00.000Z' }
  ));

  const taskA = project.tasks.find((t) => t.title === '待删除任务 A');
  const taskB = project.tasks.find((t) => t.title === '保留任务 B');
  assert.ok(taskA && taskB);

  let view = buildProjectView(project);
  assert.equal(view.tasks.length, 2);
  assert.equal(view.checks.length, 3);
  assert.equal(view.priorityItem?.id, 'chk-a-fail');

  assert.throws(() => deleteTask(project, { taskId: 'task-missing' }), /Unknown task: task-missing/);

  project = deleteTask(project, { taskId: taskA.id }, '2026-11-23T01:03:00.000Z');
  view = buildProjectView(project);

  assert.equal(view.tasks.length, 1);
  assert.equal(view.tasks[0].id, taskB.id);
  assert.deepEqual(view.checks.map((c) => c.id), ['chk-b-todo']);
  assert.equal(view.issues.length, 1);
  assert.equal(view.issues[0].id, 'iss-a-open');
  assert.equal(view.issues[0].taskId, null);
  assert.equal(view.issues[0].taskTitle, '');
  assert.equal(view.summary.totalTasks, 1);
  assert.equal(view.summary.inProgressCount, 1);
  assert.equal(view.summary.awaitingAcceptanceCount, 0);
  assert.equal(view.summary.openIssuesCount, 1);
  assert.equal(view.latestVerified, null);
  assert.equal(view.priorityItem?.id, 'iss-a-open');
  assert.match(view.activity[0], /#deadbeef：你删除了任务「待删除任务 A」/);
});

test('FR-05: ops_bash, script_path, dsh-ops failure markers, background promotion, and Windows command matching', async () => {
  const session = makeSession([
    // 1. Clean ops_bash build success with [cwd: ...] prefix and no [exit code: N] marker
    {
      type: 'tool/call',
      seq: 0,
      data: {
        callId: 'ops-1',
        name: 'ops_bash',
        arguments: JSON.stringify({ command: 'npm run dist', workdir: 'C:\\repo\\blackhole' }),
      },
    },
    {
      type: 'tool/result',
      seq: 1,
      data: {
        message: {
          toolCallId: 'ops-1',
          source: { kind: 'tool', callId: 'ops-1' },
          isError: false,
          content: [{ type: 'text', text: '[cwd: resolvedFrom="C:\\repo\\blackhole"; cwdSource="workdir"]\nintegrity labels are Medium under C:\\repo\\blackhole\\dist' }],
        },
      },
    },
    // 2. ops_bash Windows icacls with double quotes & single backslashes, output includes [exit code: 0]
    {
      type: 'tool/call',
      seq: 2,
      data: {
        callId: 'ops-2',
        name: 'ops_bash',
        arguments: JSON.stringify({ command: 'icacls "C:\\Program Files\\Black Hole\\Black Hole.exe"' }),
      },
    },
    {
      type: 'tool/result',
      seq: 3,
      data: {
        message: {
          toolCallId: 'ops-2',
          source: { kind: 'tool', callId: 'ops-2' },
          isError: false,
          content: [{ type: 'text', text: 'Mandatory Label\\Medium Mandatory Level\n[exit code: 0]' }],
        },
      },
    },
    // 3. ops_bash via script_path
    {
      type: 'tool/call',
      seq: 4,
      data: {
        callId: 'ops-3',
        name: 'ops_bash',
        arguments: JSON.stringify({ script_path: 'scripts/check.sh' }),
      },
    },
    {
      type: 'tool/result',
      seq: 5,
      data: {
        message: {
          toolCallId: 'ops-3',
          source: { kind: 'tool', callId: 'ops-3' },
          isError: false,
          content: [{ type: 'text', text: 'all checks ok' }],
        },
      },
    },
    // 4. dsh-ops non-zero exit with structured failure line
    {
      type: 'tool/call',
      seq: 6,
      data: { callId: 'ops-fail-exit', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run fail-exit' }) },
    },
    {
      type: 'tool/result',
      seq: 7,
      data: {
        message: {
          toolCallId: 'ops-fail-exit',
          isError: false,
          content: [{ type: 'text', text: '[EXIT_CODE; effects: unknown; retry: after-input-change] Fix command.\n[exit code: 1]' }],
        },
      },
    },
    // 5. ops_bash [cancelled]
    {
      type: 'tool/call',
      seq: 8,
      data: { callId: 'ops-cancel', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run cancel-cmd' }) },
    },
    {
      type: 'tool/result',
      seq: 9,
      data: {
        message: { toolCallId: 'ops-cancel', isError: false, content: [{ type: 'text', text: '[cancelled]' }] },
      },
    },
    // 6. ops_bash [error: spawn EPERM]
    {
      type: 'tool/call',
      seq: 10,
      data: { callId: 'ops-err', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run eperm-cmd' }) },
    },
    {
      type: 'tool/result',
      seq: 11,
      data: {
        message: { toolCallId: 'ops-err', isError: false, content: [{ type: 'text', text: '[error: spawn EPERM]' }] },
      },
    },
    // 7. ops_bash [signal: SIGTERM]
    {
      type: 'tool/call',
      seq: 12,
      data: { callId: 'ops-sig', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run sig-cmd' }) },
    },
    {
      type: 'tool/result',
      seq: 13,
      data: {
        message: { toolCallId: 'ops-sig', isError: false, content: [{ type: 'text', text: '[signal: SIGTERM]' }] },
      },
    },
    // 8. dsh-ops [POLICY_DENIED; effects: none; retry: never]
    {
      type: 'tool/call',
      seq: 14,
      data: { callId: 'ops-policy', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run policy-cmd' }) },
    },
    {
      type: 'tool/result',
      seq: 15,
      data: {
        message: {
          toolCallId: 'ops-policy',
          isError: false,
          content: [{ type: 'text', text: '[POLICY_DENIED; effects: none; retry: never] Ask user to switch permission.' }],
        },
      },
    },
    // 9. dsh-ops [sandbox: file access denied under workspace-write mode]
    {
      type: 'tool/call',
      seq: 16,
      data: { callId: 'ops-sbx', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run sbx-cmd' }) },
    },
    {
      type: 'tool/result',
      seq: 17,
      data: {
        message: {
          toolCallId: 'ops-sbx',
          isError: false,
          content: [{ type: 'text', text: '[sandbox: file access denied under workspace-write mode]' }],
        },
      },
    },
    // 10. dsh-ops promoted background job
    {
      type: 'tool/call',
      seq: 18,
      data: { callId: 'ops-bg', name: 'ops_bash', arguments: JSON.stringify({ command: 'npm run long-build' }) },
    },
    {
      type: 'tool/result',
      seq: 19,
      data: {
        message: {
          toolCallId: 'ops-bg',
          isError: false,
          content: [{ type: 'text', text: 'building...\n[still running after 120000ms; moved to background job j1 ("build")]' }],
        },
      },
    },
  ]);

  const execs = extractShellExecutions(session);
  assert.equal(execs.length, 10);
  assert.equal(execs[0].status, 'passed');
  assert.equal(execs[0].exitCode, 0);
  assert.equal(execs[0].cwd, 'C:\\repo\\blackhole');
  assert.equal(execs[1].status, 'passed');
  assert.equal(execs[2].command, 'bash scripts/check.sh');
  assert.equal(execs[2].status, 'passed');
  assert.equal(execs[3].status, 'failed');
  assert.equal(execs[3].exitCode, 1);
  assert.equal(execs[4].status, 'failed');
  assert.equal(execs[4].exitCode, null);
  assert.equal(execs[5].status, 'failed');
  assert.equal(execs[6].status, 'failed');
  assert.equal(execs[7].status, 'failed');
  assert.equal(execs[8].status, 'failed');
  assert.equal(execs[9].status, 'running');
  assert.equal(execs[9].exitCode, null);

  const verified = await verifyReportedChecks(
    [
      { title: '打包构建', state: 'passed', command: 'npm run dist', note: '生成安装包' },
      { title: 'exe 完整性级别', state: 'passed', command: "icacls 'C:/Program Files/Black Hole/Black Hole.exe'", note: 'Medium' },
      { title: '脚本检查', state: 'passed', command: 'scripts/check.sh', note: 'ok' },
      { title: '未运行命令', state: 'passed', command: 'npm run never-ran', note: '口头' },
      { title: '非零退出误报通过', state: 'passed', command: 'npm run fail-exit', note: 'claimed' },
      { title: '取消命令误报通过', state: 'passed', command: 'npm run cancel-cmd', note: 'claimed' },
      { title: 'spawn EPERM 误报通过', state: 'passed', command: 'npm run eperm-cmd', note: 'claimed' },
      { title: '策略拒绝误报通过', state: 'passed', command: 'npm run policy-cmd', note: 'claimed' },
      { title: '后台任务未完成误报通过', state: 'passed', command: 'npm run long-build', note: 'claimed' },
    ],
    execs,
    { now: '2026-11-23T03:00:00.000Z' }
  );

  assert.equal(verified.checks[0].state, 'passed');
  assert.equal(verified.checks[0].verifiedBy, 'evidence');
  assert.equal(verified.checks[1].state, 'passed');
  assert.equal(verified.checks[1].verifiedBy, 'evidence');
  assert.equal(verified.checks[2].state, 'passed');
  assert.equal(verified.checks[2].verifiedBy, 'evidence');
  assert.equal(verified.checks[3].state, 'todo');
  assert.equal(verified.checks[4].state, 'failed');
  assert.equal(verified.checks[4].exitCode, 1);
  assert.equal(verified.checks[5].state, 'failed');
  assert.equal(verified.checks[6].state, 'failed');
  assert.equal(verified.checks[7].state, 'failed');
  assert.equal(verified.checks[8].state, 'todo');
  assert.equal(verified.downgradedCount, 2);
  assert.equal(verified.mismatchedCount, 4);
});
