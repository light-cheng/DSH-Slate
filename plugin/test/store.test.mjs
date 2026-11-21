import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applySessionReport, buildProjectView } from '../src/domain.js';
import { createProjectStore } from '../src/store.js';

const PLUGIN_ROOT = resolve(import.meta.dirname, '..');

test('FR-01 & restart recovery: isolates distinct workspaces and canonicalizes symlinks', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-store-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const wsA = join(tempRoot, 'ws-alpha');
    const wsB = join(tempRoot, 'ws-beta');
    const wsALink = join(tempRoot, 'ws-alpha-link');
    await mkdir(wsA, { recursive: true });
    await mkdir(wsB, { recursive: true });
    await symlink(wsA, wsALink);

    const store1 = createProjectStore({ dshHome });
    await store1.mutate(wsA, (current, helpers) =>
      applySessionReport(
        current,
        {
          projectGoal: 'Alpha 目标',
          task: 'Alpha 任务',
          workStatus: 'in_progress',
          progressEstimate: 30,
          nextDeliverable: 'Alpha 下一步',
          summary: 'Alpha 启动',
        },
        { sessionId: 'session-alpha001', workspacePath: helpers.workspacePath, now: helpers.now }
      )
    );

    await store1.mutate(wsB, (current, helpers) =>
      applySessionReport(
        current,
        {
          projectGoal: 'Beta 目标',
          task: 'Beta 任务',
          workStatus: 'done',
          progressEstimate: 100,
          nextDeliverable: 'Beta 交付',
          summary: 'Beta 完成',
        },
        { sessionId: 'session-beta0001', workspacePath: helpers.workspacePath, now: helpers.now }
      )
    );

    // Fresh store instance (simulates DSH restart) + symlinked path reads Alpha, never Beta
    const store2 = createProjectStore({ dshHome });
    const viewALink = buildProjectView(await store2.read(wsALink));
    const viewB = buildProjectView(await store2.read(wsB));

    assert.equal(viewALink.goal, 'Alpha 目标');
    assert.equal(viewALink.tasks.length, 1);
    assert.equal(viewALink.tasks[0].title, 'Alpha 任务');

    assert.equal(viewB.goal, 'Beta 目标');
    assert.equal(viewB.tasks.length, 1);
    assert.equal(viewB.tasks[0].title, 'Beta 任务');

    // Controlled output spill keeps artifact inside DSH_HOME/storages/dsh-slate/outputs
    const huge = 'line\n'.repeat(20000);
    const ref = await store2.writeOutputArtifact(wsA, '../evil/check:1', huge);
    assert.match(ref, /^outputs\/[0-9a-f]+\/evil_check_1\.txt$/);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});

test('AC-06: 6 concurrent child processes mutating the same workspace lose zero updates', async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), 'dsh-slate-conc-'));
  try {
    const dshHome = join(tempRoot, 'dsh-home');
    const ws = join(tempRoot, 'shared-ws');
    await mkdir(ws, { recursive: true });

    const workerScript = `
      import { createProjectStore } from ${JSON.stringify(join(PLUGIN_ROOT, 'src', 'store.js'))};
      import { applySessionReport } from ${JSON.stringify(join(PLUGIN_ROOT, 'src', 'domain.js'))};
      const [dshHome, ws, idx] = process.argv.slice(2);
      const store = createProjectStore({ dshHome });
      await store.mutate(ws, (current, helpers) =>
        applySessionReport(
          current,
          {
            projectGoal: '并发项目',
            task: '并发任务 ' + idx,
            workStatus: 'done',
            progressEstimate: 100,
            nextDeliverable: '产物 ' + idx,
            summary: '子进程 ' + idx + ' 完成',
            issues: [{ id: 'iss-' + idx, severity: 'P2', title: '问题 ' + idx, detail: '明细 ' + idx }],
          },
          { sessionId: 'session-worker-' + idx, workspacePath: helpers.workspacePath, now: helpers.now }
        )
      );
    `;

    const workerFile = join(tempRoot, 'worker.mjs');
    await writeFile(workerFile, workerScript, 'utf8');

    const workers = Array.from({ length: 6 }, (_, i) =>
      new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(
          process.execPath,
          [workerFile, dshHome, ws, String(i + 1)],
          { stdio: ['ignore', 'pipe', 'pipe'] }
        );
        let stderr = '';
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
        child.on('exit', (code) => {
          if (code === 0) resolvePromise();
          else rejectPromise(new Error(`Worker ${i + 1} exited with ${code}: ${stderr}`));
        });
      })
    );

    await Promise.all(workers);

    const store = createProjectStore({ dshHome });
    const finalProject = await store.read(ws);
    assert.equal(finalProject.revision, 6);
    assert.equal(finalProject.tasks.length, 6);
    assert.equal(finalProject.issues.length, 6);
    assert.equal(finalProject.reportEvents.length, 6);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
