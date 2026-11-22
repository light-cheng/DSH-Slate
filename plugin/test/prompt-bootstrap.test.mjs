import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildQuickInitPrompt,
  collectGitSnapshot,
  collectWorkspaceContext,
  detectOverviewFiles,
} from '../src/bootstrap.js';
import { applySessionReport, createEmptyProject, updateGoal } from '../src/domain.js';
import {
  formatSlatePromptSection,
  PROMPT_SECTION_NAME,
  registerPromptGuidance,
} from '../src/prompt.js';
import { createRpcDispatcher } from '../src/rpc.js';
import { createProjectStore } from '../src/store.js';

function createServiceHostMock(servicesObj = {}, { supportsSystemPrompt = true } = {}) {
  const services = new Map(Object.entries(servicesObj));
  const registeredSections = [];
  const effects = [];

  const mockCtx = {
    get(key) {
      return services.get(key);
    },
    effect(fn) {
      const dispose = fn();
      effects.push(dispose);
      return dispose;
    },
    inject(deps, callback) {
      if (deps.includes('systemPrompt') && !supportsSystemPrompt) {
        return;
      }
      const sp = services.get('systemPrompt');
      if (deps.includes('systemPrompt') && sp) {
        const innerCtx = {
          systemPrompt: {
            getSectionOrder: sp.getSectionOrder,
            section(def) {
              registeredSections.push(def);
              return () => {};
            },
          },
          get: mockCtx.get,
          effect: mockCtx.effect,
        };
        callback(innerCtx);
      }
    },
    _registeredSections: registeredSections,
  };

  return mockCtx;
}

test('store.readSync handles empty, persisted, and corrupted state files', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-readsync-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const ws = join(tempRoot, 'repo');
    await mkdir(ws, { recursive: true });
    const store = createProjectStore({ dshHome });

    const empty = store.readSync(ws);
    assert.equal(empty.goal, '');
    assert.equal(empty.tasks.length, 0);

    await store.mutate(ws, (current, helpers) =>
      applySessionReport(
        current,
        {
          projectGoal: '快速校验读同步',
          task: '核心任务',
          workStatus: 'in_progress',
          progressEstimate: 45,
          nextDeliverable: '完成验证',
          summary: '正在实施',
        },
        { sessionId: 'session-sync-1', workspacePath: helpers.workspacePath, now: helpers.now }
      )
    );

    const persisted = store.readSync(ws);
    assert.equal(persisted.goal, '快速校验读同步');
    assert.equal(persisted.tasks.length, 1);

    // Corrupt file should gracefully return empty project rather than throw inside prompt hook
    const projDir = join(dshHome, 'storages', 'dsh-slate', 'projects');
    const { readdir } = await import('node:fs/promises');
    const jsonName = (await readdir(projDir)).find((f) => f.endsWith('.json'));
    await writeFile(join(projDir, jsonName), '{broken json', 'utf8');

    const recovered = store.readSync(ws);
    assert.equal(recovered.goal, '');
    assert.equal(recovered.tasks.length, 0);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('formatSlatePromptSection & registerPromptGuidance inject active state and obey tool gating', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-prompt-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const ws = join(tempRoot, 'my-app');
    await mkdir(ws, { recursive: true });
    const store = createProjectStore({ dshHome });

    // 1. Missing systemPrompt service is a graceful no-op (e.g., minimal Headless)
    const noSpHost = createServiceHostMock({}, { supportsSystemPrompt: false });
    registerPromptGuidance(noSpHost, store);
    assert.equal(noSpHost._registeredSections.length, 0);

    // 2. Active systemPrompt + tool gate
    let toolEnabled = true;
    const host = createServiceHostMock({
      systemPrompt: {
        getSectionOrder: (id) => (id === 'TOOL_BASH' ? 500 : 400),
      },
      tools: {
        get: (toolName) => (toolName === 'project_progress_report' && toolEnabled ? { name: toolName } : null),
      },
    });
    registerPromptGuidance(host, store);
    assert.equal(host._registeredSections.length, 1);
    const section = host._registeredSections[0];
    assert.equal(section.name, PROMPT_SECTION_NAME);
    assert.equal(section.order, 520);
    assert.equal(section.interpolate, false);

    // Empty workspace renders concise proactive guidance
    const emptyText = section.text({ agent: { id: 's1', session: { header: { id: 's1', cwd: ws } } } });
    assert.match(emptyText, /project_progress_report/);
    assert.match(emptyText, /建议 25 字以内/);
    assert.match(emptyText, /尚无项目进度记录/);

    // Persist populated project with manual lock & open issue
    await store.mutate(ws, (current, helpers) => {
      const step1 = applySessionReport(
        current,
        {
          projectGoal: '自动化桌面托盘工具',
          task: '构建发布流水线',
          priority: 'P0',
          workStatus: 'in_progress',
          progressEstimate: 60,
          nextDeliverable: '补齐签名脚本',
          summary: '完成基础打包',
          checks: [
            { id: 'chk-smoke', title: 'Windows 真机冒烟', state: 'todo', note: '待在 Windows 执行' },
          ],
          issues: [
            { severity: 'P1', title: '签名证书缺失', detail: '需要补充环境变量' },
          ],
        },
        { sessionId: 'session-work-1', workspacePath: helpers.workspacePath, now: helpers.now }
      ).project;
      return updateGoal(step1, { goal: '桌面托盘发布工具', acceptanceCriteria: ['双模式图标正常', '单测全通过'] }, helpers.now);
    });

    const populatedText = section.text({ agent: { id: 's2', session: { header: { id: 's2', cwd: ws } } } });
    assert.match(populatedText, /桌面托盘发布工具（用户已手动锁定/);
    assert.match(populatedText, /当前验收标准（项目级，子任务汇报请省略 `acceptanceCriteria`）/);
    assert.match(populatedText, /双模式图标正常/);
    assert.match(populatedText, /\[taskId: [^\]]+\] 构建发布流水线/);
    assert.match(populatedText, /\[checkId: chk-smoke\] Windows 真机冒烟/);
    assert.match(populatedText, /\[issueId: [^\]]+\] \[P1\] 签名证书缺失/);

    // Tool disabled in agent preset -> returns empty string
    toolEnabled = false;
    assert.equal(section.text({ agent: { id: 's3', session: { header: { id: 's3', cwd: ws } } } }), '');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('collectGitSnapshot, collectWorkspaceContext & buildQuickInitPrompt on git and non-git workspaces', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-bootstrap-'));
  try {
    const gitRepo = join(tempRoot, 'git-proj');
    const plainDir = join(tempRoot, 'plain-proj');
    await mkdir(gitRepo, { recursive: true });
    await mkdir(plainDir, { recursive: true });

    await writeFile(join(gitRepo, 'README.md'), '# Demo App\nLightweight sample.\n', 'utf8');
    await writeFile(join(gitRepo, 'package.json'), '{"name":"demo-app"}\n', 'utf8');
    execFileSync('git', ['init', '-b', 'main'], { cwd: gitRepo });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: gitRepo });
    execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: gitRepo });
    execFileSync('git', ['add', 'README.md', 'package.json'], { cwd: gitRepo });
    execFileSync('git', ['commit', '-m', 'chore: initial baseline'], { cwd: gitRepo });
    execFileSync('git', ['tag', 'v0.1.0'], { cwd: gitRepo });
    await writeFile(join(gitRepo, 'NOTES.md'), 'untracked change\n', 'utf8');

    const gitSnap = await collectGitSnapshot(gitRepo);
    assert.equal(gitSnap.branch, 'main');
    assert.equal(gitSnap.latestTag, 'v0.1.0');
    assert.equal(gitSnap.dirtyCount, 1);
    assert.equal(gitSnap.recentCommits[0].subject, 'chore: initial baseline');

    assert.equal(await collectGitSnapshot(plainDir), null);
    assert.deepEqual(detectOverviewFiles(gitRepo), ['README.md', 'package.json']);

    const mockCtx = createServiceHostMock({
      workspaceRegistry: {
        list: () => [
          {
            id: 'ws-git-1',
            path: gitRepo,
            sessionIds: ['ses-blank', 'ses-old-1', 'ses-old-2', 'ses-cur'],
          },
        ],
      },
      sessionPersistence: {
        async readHeader(id) {
          return {
            id,
            title: id === 'ses-old-1' ? '初始搭建' : '',
            updatedAt: '2026-11-21T01:00:00Z',
          };
        },
      },
      typertGateway: {
        async invoke(req) {
          if (req.namespace === 'session' && req.method === 'list') {
            return {
              items: [
                { sessionId: 'ses-blank', blank: true, lastActiveAt: 1795309999000, projections: { values: { title: '' } } },
                { sessionId: 'ses-old-1', blank: false, lastActiveAt: 1795300000000 },
                {
                  sessionId: 'ses-old-2',
                  blank: false,
                  lastActiveAt: 1795305000000,
                  projections: { values: { title: '发布检查与标签' } },
                },
              ],
            };
          }
          return {};
        },
      },
    });

    const wsCtx = await collectWorkspaceContext(mockCtx, gitRepo, 'ses-cur');
    assert.equal(wsCtx.workspaceId, 'ws-git-1');
    assert.equal(wsCtx.totalSessions, 2);
    assert.equal(wsCtx.canQuickInit, true);
    assert.equal(wsCtx.recentSessions[0].id, 'ses-old-2');
    assert.equal(wsCtx.recentSessions[0].title, '发布检查与标签');
    assert.equal(wsCtx.recentSessions[1].title, '初始搭建');
    assert.equal(wsCtx.recentSessions.some((s) => s.id === 'ses-blank'), false);

    const prompt = buildQuickInitPrompt(gitRepo, wsCtx);
    assert.match(prompt, /v0\.1\.0/);
    assert.match(prompt, /chore: initial baseline/);
    assert.match(prompt, /README\.md、package\.json/);
    assert.match(prompt, /禁止全库扫描源码/);
    assert.match(prompt, /建议 25 字以内/);
    assert.match(prompt, /务必全部标为 `todo`/);

    // Verify archived (Set & Array), missing-from-live-list ghost IDs, subagents, and >12 newest-first sessionIds
    const manyActiveIds = Array.from({ length: 14 }, (_, i) => `ses-active-${i + 1}`);
    const listItemsMany = manyActiveIds.map((id, idx) => ({
      sessionId: id,
      blank: false,
      updatedAt: 1795300000000 + (14 - idx) * 1000,
      displayTitle: `Active Session ${idx + 1}`,
    }));
    const listWithSpecials = [
      ...listItemsMany,
      { sessionId: 'ses-archived-1', blank: false, updatedAt: 1795399999000, displayTitle: '已归档会话' },
      { sessionId: 'ses-sub-1', blank: false, origin: 'subagent', updatedAt: 1795399998000, displayTitle: '子代理会话' },
    ];
    for (const archivedContainer of [new Set(['ses-archived-1']), ['ses-archived-1']]) {
      const ctxFiltered = createServiceHostMock({
        workspaceRegistry: {
          archivedSessionIds: archivedContainer,
          list: () => [
            {
              id: 'ws-filtered',
              path: gitRepo,
              // Newest-first order (> 12 entries), plus archived, ghost, subagent, blank, and current
              sessionIds: [
                'ses-cur',
                'ses-archived-1',
                'ses-ghost-missing',
                'ses-sub-1',
                ...manyActiveIds,
              ],
            },
          ],
        },
        typertGateway: {
          async invoke(req) {
            if (req.namespace === 'session' && req.method === 'list') {
              return { items: listWithSpecials };
            }
            return {};
          },
        },
      });
      const resFiltered = await collectWorkspaceContext(ctxFiltered, gitRepo, 'ses-cur');
      assert.equal(resFiltered.totalSessions, 14);
      assert.equal(resFiltered.recentSessions.length, 12);
      assert.equal(resFiltered.recentSessions[0].id, 'ses-active-1');
      assert.equal(resFiltered.recentSessions[0].title, 'Active Session 1');
      assert.equal(resFiltered.recentSessions.some((s) => s.id === 'ses-archived-1'), false);
      assert.equal(resFiltered.recentSessions.some((s) => s.id === 'ses-ghost-missing'), false);
      assert.equal(resFiltered.recentSessions.some((s) => s.id === 'ses-sub-1'), false);

      const boundedPrompt = buildQuickInitPrompt(gitRepo, resFiltered);
      assert.match(boundedPrompt, /Active Session 1/);
      assert.match(boundedPrompt, /Active Session 5/);
      assert.equal(boundedPrompt.includes('Active Session 6'), false);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('RPC getWorkspaceContext and quickInit enforce DSH wire contracts and fallback cleanly', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-qinit-rpc-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const ws = join(tempRoot, 'repo');
    await mkdir(ws, { recursive: true });
    await writeFile(join(ws, 'README.md'), '# Repo\n', 'utf8');
    const store = createProjectStore({ dshHome });

    // Case 1: gateway absent -> canQuickInit: false, quickInit returns slate/quick-init-unavailable
    const noGwDispatch = createRpcDispatcher(
      createServiceHostMock({
        workspaceRegistry: { list: () => [{ id: 'ws-1', path: ws, sessionIds: ['s1'] }] },
      }),
      store
    );
    const ctxNoGw = await noGwDispatch('getWorkspaceContext', { sessionId: 's1' });
    assert.equal(ctxNoGw.ok, true);
    assert.equal(ctxNoGw.value.canQuickInit, false);

    const errNoGw = await noGwDispatch('quickInit', { sessionId: 's1' });
    assert.equal(errNoGw.ok, false);
    assert.equal(errNoGw.error.code, 'slate/quick-init-unavailable');

    // Case 2: gateway + browserPeer present -> verifies exact session.create (workspaceId ONLY) and session.prompt wires
    const calls = [];
    const peerMarker = { kind: 'browser-owner', id: 'peer-1' };
    const gwDispatch = createRpcDispatcher(
      createServiceHostMock({
        workspaceRegistry: { list: () => [{ id: 'ws-1', path: ws, sessionIds: ['s1'] }] },
        connection: { browserPeer: peerMarker },
        typertGateway: {
          async invoke(req) {
            calls.push(req);
            if (req.namespace === 'session' && req.method === 'create') {
              return { sessionId: 'ses-init-created-99' };
            }
            return { accepted: true };
          },
        },
      }),
      store
    );

    const okRes = await gwDispatch('quickInit', { sessionId: 's1' });
    assert.equal(okRes.ok, true);
    assert.equal(okRes.value.sessionId, 'ses-init-created-99');
    assert.equal(calls.length, 3);

    const [listCall, createCall, promptCall] = calls;
    assert.equal(listCall.namespace, 'session');
    assert.equal(listCall.method, 'list');
    assert.equal(listCall.peer, peerMarker);
    assert.deepEqual(listCall.args, { _request: {} });

    assert.equal(createCall.namespace, 'session');
    assert.equal(createCall.method, 'create');
    assert.equal(createCall.peer, peerMarker);
    assert.deepEqual(createCall.args, { request: { workspaceId: 'ws-1' } });
    assert.equal('cwd' in createCall.args.request, false);

    assert.equal(promptCall.namespace, 'session');
    assert.equal(promptCall.method, 'prompt');
    assert.equal(promptCall.peer, peerMarker);
    assert.equal(promptCall.args.request.sessionId, 'ses-init-created-99');
    assert.equal(promptCall.args.request.mode, 'queue');
    assert.match(promptCall.args.request.requestId, /^slate-init-/);
    assert.equal(promptCall.args.request.content[0].type, 'text');
    assert.match(promptCall.args.request.content[0].text, /README\.md/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
