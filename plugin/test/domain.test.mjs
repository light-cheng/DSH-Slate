import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applySessionReport,
  buildProjectView,
  completeTask,
  createEmptyProject,
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

  // Explicit user confirmation marks it verified
  project = verifyTask(project, { taskId });
  view = buildProjectView(project);
  assert.equal(view.tasks[0].verified, true);
  assert.equal(view.tasks[0].verifiedBy, 'user');
  assert.equal(view.summary.awaitingAcceptanceCount, 0);
  assert.equal(view.summary.verifiedCount, 1);
  assert.equal(view.latestVerified.taskId, taskId);
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
