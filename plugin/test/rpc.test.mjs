import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRpcDispatcher } from '../src/rpc.js';
import { createProjectStore } from '../src/store.js';
import { createReportTool } from '../src/tool.js';
import { applySessionReport } from '../src/domain.js';

function createMockCtx(extra = {}) {
  const services = new Map(Object.entries(extra));
  return {
    get(key) {
      return services.get(key);
    },
  };
}

test('FR-02: project_progress_report rejects missing agent context and ignores spoofed params', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-tool-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const ws = join(tempRoot, 'repo');
    await mkdir(ws, { recursive: true });
    const store = createProjectStore({ dshHome });
    const tool = createReportTool(createMockCtx(), store);

    // Schema must NOT expose sessionId parameter
    assert.equal('sessionId' in tool.parameters.properties, false);

    await assert.rejects(
      () => tool.execute({ task: 'test', workStatus: 'in_progress', progressEstimate: 10, nextDeliverable: 'x', summary: 'y' }, {}),
      /authoritative session id/i
    );

    const exec = {
      agent: {
        id: 'session-real-head-1234',
        session: {
          id: 'session-real-head-1234',
          header: { id: 'session-real-head-1234', cwd: ws },
          seq: 2,
          eventAt(i) {
            return [
              { type: 'tool/call', seq: 0, data: { callId: 'call-1', name: 'bash', arguments: JSON.stringify({ command: 'npm test' }) } },
              { type: 'tool/result', seq: 1, data: { message: { toolCallId: 'call-1', source: { kind: 'tool', callId: 'call-1' }, isError: false, content: [{ type: 'text', text: '3 passed' }] } } },
            ][i];
          },
        },
      },
    };

    const output = await tool.execute(
      {
        projectGoal: '权威身份项目',
        task: '库存服务',
        priority: 'P0',
        workStatus: 'done',
        progressEstimate: 100,
        nextDeliverable: '发布',
        summary: '完成且测试通过',
        checks: [
          { title: '单元测试', state: 'passed', command: 'npm test', note: '3 项通过' },
          { title: '未运行检查', state: 'passed', command: 'npm run missing-test', note: '口头宣称通过' },
        ],
      },
      exec
    );

    assert.equal(output.ok, true);
    assert.equal(output.sessionId, 'session-real-head-1234');
    assert.equal(output.verifiedChecks, 1);
    assert.equal(output.downgradedChecks, 1);

    const persisted = await store.read(ws);
    assert.equal(persisted.tasks[0].primarySessionId, 'session-real-head-1234');
    assert.equal(persisted.checks[0].state, 'passed');
    assert.equal(persisted.checks[1].state, 'todo');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('RPC dispatcher handles getState, mutations, restore, and error responses cleanly', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-rpc-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const ws = join(tempRoot, 'repo');
    await mkdir(ws, { recursive: true });
    const store = createProjectStore({ dshHome });
    const ctx = createMockCtx({
      workspaceRegistry: {
        list: () => [{ path: ws, sessionIds: ['session-web-1'] }],
      },
    });
    const dispatch = createRpcDispatcher(ctx, store);

    // Unknown workspace returns null for getState, error for mutations
    const emptyNoWs = await dispatch('getState', {});
    assert.equal(emptyNoWs.ok, true);
    assert.equal(emptyNoWs.value, null);

    const mutNoWs = await dispatch('updateGoal', { goal: 'x' });
    assert.equal(mutNoWs.ok, false);
    assert.equal(mutNoWs.error.code, 'slate/invalid-workspace');

    // Bound session resolves workspace via workspaceRegistry
    const goalRes = await dispatch('updateGoal', {
      sessionId: 'session-web-1',
      goal: 'RPC 设置的目标',
      acceptanceCriteria: ['规则 1', '规则 2'],
    });
    assert.equal(goalRes.ok, true);
    assert.equal(goalRes.value.goal, 'RPC 设置的目标');
    assert.equal(goalRes.value.hasGoalOverride, true);

    const badEndpoint = await dispatch('nope', { sessionId: 'session-web-1' });
    assert.equal(badEndpoint.ok, false);
    assert.equal(badEndpoint.error.code, 'slate/unknown-endpoint');

    // deleteTask removes task & checks, detaches issues, and persists
    await store.mutate(ws, (current, helpers) =>
      applySessionReport(
        current,
        {
          task: '待移除初始化任务',
          workStatus: 'done',
          progressEstimate: 100,
          nextDeliverable: '无',
          summary: '测试插入',
          checks: [{ id: 'chk-rpc-del', title: '检查项', state: 'todo' }],
          issues: [{ id: 'iss-rpc-keep', severity: 'P1', title: '独立问题' }],
        },
        { sessionId: 'session-old-9999', workspacePath: ws, now: helpers.now }
      ).project
    );

    const beforeDel = await dispatch('getState', { sessionId: 'session-web-1' });
    assert.equal(beforeDel.value.tasks.length, 1);
    const delId = beforeDel.value.tasks[0].id;

    const delMissing = await dispatch('deleteTask', { sessionId: 'session-web-1', taskId: 'task-not-found' });
    assert.equal(delMissing.ok, false);
    assert.match(delMissing.error.message, /Unknown task/);

    const delRes = await dispatch('deleteTask', { sessionId: 'session-web-1', taskId: delId });
    assert.equal(delRes.ok, true);
    assert.equal(delRes.value.tasks.length, 0);
    assert.equal(delRes.value.checks.length, 0);
    assert.equal(delRes.value.issues.length, 1);
    assert.equal(delRes.value.issues[0].taskId, null);

    const afterReload = await store.read(ws);
    assert.equal(afterReload.tasks.length, 0);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
