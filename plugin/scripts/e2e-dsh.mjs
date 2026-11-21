import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = resolve(PLUGIN_ROOT, '..');
const DSH_BIN = '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh';
const PLAYWRIGHT_ENTRY = '/Users/light/.npm/_npx/41b79885fbdb2a18/node_modules/playwright/index.mjs';

function resolveChromiumExecutable() {
  const candidates = [
    join(homedir(), 'Library', 'Caches', 'ms-playwright', 'chromium_headless_shell-1234', 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
    join(homedir(), 'Library', 'Caches', 'ms-playwright', 'chromium-1234', 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  return candidates.find((p) => existsSync(p));
}

function readMagpieKey() {
  if (process.env.MAGPIE_GATEWAY_KEY?.trim()) {
    return process.env.MAGPIE_GATEWAY_KEY.trim();
  }
  const envPath = join(homedir(), '.dsh', '.env');
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, 'utf8');
    const match = raw.match(/^\s*MAGPIE_GATEWAY_KEY\s*=\s*["']?([^\s"']+)["']?/m);
    if (match?.[1]) return match[1].trim();
  }
  const credPath = join(homedir(), '.dsh', '.credentials.yaml');
  if (existsSync(credPath)) {
    const raw = readFileSync(credPath, 'utf8');
    const match = raw.match(/^\s*MAGPIE_GATEWAY_KEY:\s*["']?([^\s"'\n]+)["']?/m);
    if (match?.[1]) return match[1].trim();
  }
  throw new Error('Could not locate MAGPIE_GATEWAY_KEY in ~/.dsh/.credentials.yaml or ~/.dsh/.env');
}

function snapshotExistingDsh() {
  const targets = [
    join(homedir(), '.dsh', 'profiles', 'desktop', 'package.json'),
    join(homedir(), '.dsh', 'profiles', 'web', 'package.json'),
  ];
  return targets.map((target) => {
    if (!existsSync(target)) return { target, exists: false };
    const s = statSync(target);
    const sha256 = createHash('sha256').update(readFileSync(target)).digest('hex');
    return { target, exists: true, mtimeMs: s.mtimeMs, size: s.size, sha256 };
  });
}

function buildPatchYaml({ includeWebNotice = false } = {}) {
  const rows = [];
  if (includeWebNotice) {
    rows.push(`- id: ui-settings-general
  name: "@deepseek-ai/dsh-client-ui-settings-general"
  config:
    welcomeNoticeVersion: "2026-09-28.1"`);
  }
  rows.push(`- id: llm-pi-ai
  name: "@deepseek-ai/dsh-llm-pi-ai"
  config:
    providers:
      magpie:
        displayName: Magpie
        apiKeyEnv: MAGPIE_GATEWAY_KEY
        api: openai-completions
        baseURL: http://127.0.0.1:3425/v1
        models:
          - id: auto/deepseek-v4.1-flash
            name: DeepSeek V4.1 Flash · routing group
            contextWindow: 1000000
            maxTokens: 384000
            input: [text, image]
            reasoningEfforts:
              max: max
        streamIdleTimeoutMs: 600000
- id: agent-default-model
  config:
    provider: magpie
    model: "auto/deepseek-v4.1-flash"
    reasoningEffort: "max"`);
  return `${rows.join('\n')}\n`;
}

async function setupBookstoreFixtures(wsEmpty, wsBookstore) {
  await mkdir(wsEmpty, { recursive: true });
  await writeFile(join(wsEmpty, 'README.md'), '# Empty Sandbox Workspace\n', 'utf8');

  await mkdir(join(wsBookstore, 'src'), { recursive: true });
  await mkdir(join(wsBookstore, 'public'), { recursive: true });
  await mkdir(join(wsBookstore, 'test'), { recursive: true });

  await writeFile(
    join(wsBookstore, 'package.json'),
    JSON.stringify({ name: 'north-window-bookstore', type: 'module', private: true, scripts: { test: 'node --test' } }, null, 2),
    'utf8'
  );

  await writeFile(
    join(wsBookstore, 'src', 'orders.js'),
    `export function createOrder() {\n  throw new Error('Not implemented');\n}\nexport function cancelOrder() {\n  throw new Error('Not implemented');\n}\n`,
    'utf8'
  );

  await writeFile(
    join(wsBookstore, 'src', 'pickup.js'),
    `export function validatePickup() {\n  throw new Error('Not implemented');\n}\n`,
    'utf8'
  );

  await writeFile(
    join(wsBookstore, 'public', 'booking.css'),
    `.booking { width: 760px; margin: 24px auto; }\n.pickup-time { display: inline-block; min-width: 180px; }\n/* Existing issue: no narrow-screen treatment. */\n`,
    'utf8'
  );

  await writeFile(
    join(wsBookstore, 'test', 'orders.test.js'),
    `import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrder, cancelOrder } from '../src/orders.js';

test('creating an order deducts available stock', () => {
  const inventory = { 'book-1': 5 };
  const order = createOrder(inventory, { sku: 'book-1', qty: 2 });
  assert.equal(order.status, 'created');
  assert.equal(inventory['book-1'], 3);
});

test('cancelling restores stock exactly once', () => {
  const inventory = { 'book-1': 5 };
  const order = createOrder(inventory, { sku: 'book-1', qty: 2 });
  cancelOrder(inventory, order);
  cancelOrder(inventory, order);
  assert.equal(order.status, 'cancelled');
  assert.equal(inventory['book-1'], 5);
});

test('out-of-stock orders are rejected', () => {
  const inventory = { 'book-1': 1 };
  assert.throws(() => createOrder(inventory, { sku: 'book-1', qty: 3 }), /stock/i);
});
`,
    'utf8'
  );

  await writeFile(
    join(wsBookstore, 'test', 'pickup.test.js'),
    `import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePickup } from '../src/pickup.js';

test('accepts a complete pickup selection', () => {
  const res = validatePickup({ store: '北窗主馆', date: '2026-11-25', slot: '14:00-16:00' });
  assert.equal(res.ok, true);
});

test('rejects a missing store', () => {
  const res = validatePickup({ store: '', date: '2026-11-25', slot: '14:00-16:00' });
  assert.equal(res.ok, false);
});

test('rejects an invalid time slot', () => {
  const res = validatePickup({ store: '北窗主馆', date: '2026-11-25', slot: '23:00-25:00' });
  assert.equal(res.ok, false);
});
`,
    'utf8'
  );

  await writeFile(
    join(wsBookstore, 'test', 'mobile.test.js'),
    `import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('booking layout has a narrow-screen rule', () => {
  const css = readFileSync(new URL('../public/booking.css', import.meta.url), 'utf8');
  assert.match(css, /@media\\s*\\(max-width:\\s*480px\\)/);
});
`,
    'utf8'
  );
}

const activeChildren = new Set();

function runHeadless({ label = 'session', dshHome, magpieKey, cwd, prompt, permissionMode = 'workspace-write', sessionId }) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`[e2e] headless start: ${label}`);
    const args = [
      '--profile',
      'slate-headless',
      '--json',
      '--permission-mode',
      permissionMode,
      '--approval-policy',
      'never',
    ];
    if (sessionId) args.push('--session-id', sessionId);
    args.push(prompt);

    const child = spawn(DSH_BIN, args, {
      cwd,
      env: {
        ...process.env,
        DSH_HOME: dshHome,
        MAGPIE_GATEWAY_KEY: magpieKey,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    activeChildren.add(child);

    let stdout = '';
    let stderr = '';
    let lineBuf = '';
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      lineBuf += text;
      const lines = lineBuf.split('\n');
      lineBuf = lines.pop() ?? '';
      for (const raw of lines) {
        try {
          const ev = JSON.parse(raw);
          if (ev.type === 'tool_call') {
            console.log(`[e2e]   ${label} -> ${ev.tool}`);
          }
        } catch {
          // ignore non-json lines
        }
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timeout = setTimeout(async () => {
      await stopProcess(child);
      rejectPromise(new Error(`Headless session "${label}" timed out after 300s in ${cwd}\nstderr: ${stderr.slice(-500)}\ntail: ${stdout.slice(-800)}`));
    }, 300000);

    child.on('exit', (code) => {
      clearTimeout(timeout);
      activeChildren.delete(child);
      const events = stdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return { type: 'raw', line };
          }
        });

      const sessionEvent = events.find((e) => e.type === 'session' && e.sessionId);
      const finalEvent = events.find((e) => e.type === 'final');
      const reportCalls = events.filter((e) => e.type === 'tool_call' && e.tool === 'project_progress_report');
      const reportResults = events.filter(
        (e) => e.type === 'tool_result' && reportCalls.some((c) => c.callId === e.callId)
      );

      if (code !== 0) {
        rejectPromise(
          new Error(`Headless "${label}" exited with ${code}\nstderr: ${stderr}\nfinal: ${JSON.stringify(finalEvent)}`)
        );
        return;
      }

      const resolvedId = sessionEvent?.sessionId || finalEvent?.sessionId;
      console.log(`[e2e] headless done: ${label} (${resolvedId})`);
      resolvePromise({
        sessionId: resolvedId,
        events,
        finalText: finalEvent?.text || '',
        reportCalls,
        reportResults,
      });
    });
  });
}

function startWebServer({ dshHome, magpieKey }) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(
      DSH_BIN,
      ['--profile', 'slate-web', '--host', '127.0.0.1', '--port', '0', '--no-open'],
      {
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          DSH_HOME: dshHome,
          MAGPIE_GATEWAY_KEY: magpieKey,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let output = '';
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        child.kill('SIGTERM');
        rejectPromise(new Error(`Web server startup timeout. Output:\n${output}`));
      }
    }, 45000);

    const onChunk = (chunk) => {
      const text = chunk.toString();
      output += text;
      const match = output.match(/dsh web:\s*(http:\/\/127\.0\.0\.1:\d+\S*)/);
      if (match?.[1] && !settled) {
        settled = true;
        clearTimeout(timeout);
        resolvePromise({ url: match[1].trim(), child });
      }
    };

    child.stdout.on('data', onChunk);
    child.stderr.on('data', onChunk);
    child.on('exit', (code) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        rejectPromise(new Error(`Web server exited early (${code}). Output:\n${output}`));
      }
    });
  });
}

async function stopProcess(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolvePromise();
    }, 5000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
    child.kill('SIGTERM');
  });
}

function runIndependentTest(cwd, files) {
  try {
    const out = execFileSync(process.execPath, ['--test', ...files], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { exitCode: 0, output: out };
  } catch (error) {
    return {
      exitCode: error.status ?? 1,
      output: `${error.stdout || ''}\n${error.stderr || ''}`.trim(),
    };
  }
}

async function openSessionInUi(page, sessionId) {
  const row = page.locator(`[data-row-key="session:${sessionId}"]`).first();
  const visible = await row.isVisible().catch(() => false);
  if (!visible) {
    const appeared = await row.waitFor({ state: 'visible', timeout: 2000 }).then(() => true).catch(() => false);
    if (!appeared) {
      const collapsed = page.locator('[data-sidebar-list-area] [aria-expanded="false"]');
      const count = await collapsed.count();
      for (let i = 0; i < count; i++) {
        await collapsed.nth(i).click().catch(() => {});
      }
      await page.waitForTimeout(250);
    }
  }
  await row.waitFor({ state: 'visible', timeout: 15000 });
  await row.click();
  await page.waitForTimeout(250);
}

async function ensureSlateTabOpen(page, sessionId) {
  const slateRoot = sessionId
    ? page.locator(`[data-sidebar-right-session="${sessionId}"] .sl-root`).first()
    : page.locator('.sl-root').first();

  if (await slateRoot.isVisible().catch(() => false)) {
    return slateRoot;
  }

  const expandBtn = page.locator('[data-sidebar-right-expand]').first();
  if (await expandBtn.isVisible().catch(() => false)) {
    await expandBtn.click();
    await page.waitForTimeout(250);
  }

  if (await slateRoot.isVisible().catch(() => false)) {
    return slateRoot;
  }

  const guideBtn = page.locator('[data-sidebar-right-guide-entry="dsh-slate"]').first();
  if (await guideBtn.isVisible().catch(() => false)) {
    await guideBtn.click();
  } else {
    // Open guide via sidebar tab if guide entry isn't immediately visible
    const tabBtn = page.locator('button:has-text("项目进度")').first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
    }
  }
  await slateRoot.waitFor({ state: 'visible', timeout: 15000 });
  return slateRoot;
}

async function main() {
  const preSnapshot = snapshotExistingDsh();
  const magpieKey = readMagpieKey();

  const tmpBase = join(REPO_ROOT, '.tmp');
  await mkdir(tmpBase, { recursive: true });
  const runDir = await mkdtemp(join(tmpBase, 'e2e-'));
  const dshHome = join(runDir, 'dsh-home');
  const wsEmpty = join(runDir, 'workspace-empty');
  const wsBookstore = join(runDir, 'workspace-bookstore');

  let webServer = null;
  let browser = null;
  const pageErrors = [];
  const consoleErrors = [];

  try {
    console.log('[e2e] setting up fixtures and isolated profiles...');
    await setupBookstoreFixtures(wsEmpty, wsBookstore);

    // Initialize isolated slate-web & slate-headless profiles
    for (const [profile, baseProfile, includeWebNotice] of [
      ['slate-web', 'web', true],
      ['slate-headless', 'headless', false],
    ]) {
      execFileSync(DSH_BIN, ['--profile', profile, '--from-default-profile', baseProfile, '--help'], {
        env: { ...process.env, DSH_HOME: dshHome },
        stdio: 'ignore',
      });
      execFileSync(DSH_BIN, ['plugin', '--profile', profile, 'add', `link:${PLUGIN_ROOT}`], {
        env: { ...process.env, DSH_HOME: dshHome },
        stdio: 'ignore',
      });
      await writeFile(
        join(dshHome, 'profiles', profile, 'cordis.patch.yml'),
        buildPatchYaml({ includeWebNotice }),
        'utf8'
      );
    }

    console.log('[e2e] launching real headless sessions (empty + parallel orders/pickup + mobile)...');
    const emptySession = await runHeadless({
      label: 'empty',
      dshHome,
      magpieKey,
      cwd: wsEmpty,
      permissionMode: 'read-only',
      prompt: 'Reply ONLY with the word READY. Do not call any tools and do not modify files.',
    });
    assert.ok(emptySession.sessionId, 'empty session must have sessionId');

    const [ordersSession, pickupSession] = await Promise.all([
      runHeadless({
        label: 'orders',
        dshHome,
        magpieKey,
        cwd: wsBookstore,
        permissionMode: 'workspace-write',
        prompt: [
          '只读取并修改 src/orders.js，参考 test/orders.test.js 实现 createOrder(inventory, { sku, qty }) 与 cancelOrder(inventory, order)（取消需幂等恢复库存，库存不足抛出包含 stock 的错误）。不要读取或运行其他测试文件。',
          '实现后运行 bash 命令 `node --test test/orders.test.js` 确认 3 项测试全部通过。',
          '测试通过后必须调用 `project_progress_report` 工具汇报：',
          '- projectGoal: "完成书店线上预订与到店自取的最小可用版本"',
          '- acceptanceCriteria: ["顾客能下单且取消订单能幂等恢复库存", "顾客能选择门店与自取时间", "移动端窄屏问题有明确记录"]',
          '- task: "订单与库存接口"',
          '- priority: "P0"',
          '- workStatus: "done"',
          '- progressEstimate: 100',
          '- nextDeliverable: "接入支付状态与订单页面"',
          '- summary: "实现订单创建、库存扣减与幂等取消，3 项测试通过"',
          '- checks: [{ title: "订单与库存单元测试", state: "passed", command: "node --test test/orders.test.js", note: "3 项单元测试通过" }]',
          '- issues: []',
        ].join('\n'),
      }),
      runHeadless({
        label: 'pickup',
        dshHome,
        magpieKey,
        cwd: wsBookstore,
        permissionMode: 'workspace-write',
        prompt: [
          '只读取并修改 src/pickup.js，参考 test/pickup.test.js 实现 validatePickup({ store, date, slot })（要求 store/date 非空，且 slot 格式为 HH:MM-HH:MM 并处于 09:00-21:00 合法时段内，返回 { ok: boolean, reason?: string }）。不要读取或运行其他测试文件。',
          '实现后运行 bash 命令 `node --test test/pickup.test.js` 确认 3 项测试全部通过。',
          '测试通过后必须调用 `project_progress_report` 工具汇报：',
          '- projectGoal: "完成书店线上预订与到店自取的最小可用版本"',
          '- acceptanceCriteria: ["顾客能下单且取消订单能幂等恢复库存", "顾客能选择门店与自取时间", "移动端窄屏问题有明确记录"]',
          '- task: "到店自取流程"',
          '- priority: "P0"',
          '- workStatus: "done"',
          '- progressEstimate: 100',
          '- nextDeliverable: "接入门店自取时间选择界面"',
          '- summary: "实现门店与自取时段校验，3 项测试通过"',
          '- checks: [{ title: "到店自取校验测试", state: "passed", command: "node --test test/pickup.test.js", note: "3 项单元测试通过" }]',
          '- issues: []',
        ].join('\n'),
      }),
    ]);

    const mobileSession = await runHeadless({
      label: 'mobile',
      dshHome,
      magpieKey,
      cwd: wsBookstore,
      permissionMode: 'read-only',
      prompt: [
        '不要修改任何文件。请读取 public/booking.css 与 test/mobile.test.js，并运行 bash 命令 `node --test test/mobile.test.js` 查看真实结果（预期失败）。',
        '运行后必须调用 `project_progress_report` 工具汇报真实结果：',
        '- projectGoal: "完成书店线上预订与到店自取的最小可用版本"',
        '- task: "移动端页面检查"',
        '- priority: "P1"',
        '- workStatus: "done"',
        '- progressEstimate: 100',
        '- nextDeliverable: "为 480px 以下屏幕增加自适应布局并重跑移动端测试"',
        '- summary: "移动端检查完成，测试 1 项失败并记录页面溢出问题"',
        '- checks: [{ title: "移动端窄屏检查", state: "failed", command: "node --test test/mobile.test.js", note: "1 项失败：缺少 480px 媒体查询" }]',
        '- issues: 请根据实际读到的 public/booking.css 汇报发现的问题（例如固定 width: 760px 导致窄屏溢出、.pickup-time min-width: 180px 溢出风险），severity 用 P1/P2，并提供稳定 id（如 "iss-mobile-760px"）。',
      ].join('\n'),
    });

    assert.notEqual(ordersSession.sessionId, pickupSession.sessionId);
    assert.notEqual(ordersSession.sessionId, mobileSession.sessionId);
    assert.notEqual(pickupSession.sessionId, mobileSession.sessionId);
    assert.ok(ordersSession.reportCalls.length >= 1, 'orders session must call project_progress_report');
    assert.ok(pickupSession.reportCalls.length >= 1, 'pickup session must call project_progress_report');
    assert.ok(mobileSession.reportCalls.length >= 1, 'mobile session must call project_progress_report');

    // Independent test re-runs
    const ordersPickupInd = runIndependentTest(wsBookstore, ['test/orders.test.js', 'test/pickup.test.js']);
    assert.equal(ordersPickupInd.exitCode, 0, `Independent orders/pickup tests must pass:\n${ordersPickupInd.output}`);
    await writeFile(join(REPO_ROOT, 'test-results', 'v1-orders-pickup-independent.txt'), `${ordersPickupInd.output}\n`, 'utf8');

    const mobileInd = runIndependentTest(wsBookstore, ['test/mobile.test.js']);
    assert.notEqual(mobileInd.exitCode, 0, 'Independent mobile test must fail as expected');
    await writeFile(join(REPO_ROOT, 'test-results', 'v1-mobile-independent.txt'), `${mobileInd.output}\n`, 'utf8');

    console.log('[e2e] starting isolated DSH web server and Playwright...');
    webServer = await startWebServer({ dshHome, magpieKey });

    // Verify DSH BrowserAuth blocks unauthenticated requests to /api/dsh-slate/rpc with HTTP 401
    const unauthOrigin = new URL(webServer.url).origin;
    const unauthRes = await fetch(`${unauthOrigin}/api/dsh-slate/rpc`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint: 'getState', payload: {} }),
    });
    assert.equal(unauthRes.status, 401, `Expected 401 for unauthenticated RPC call, got ${unauthRes.status}`);

    const { chromium } = await import(pathToFileURL(PLAYWRIGHT_ENTRY).href);
    const executablePath = resolveChromiumExecutable();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' });
    const page = await context.newPage();

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') pageErrors.push(`console.error: ${msg.text()}`);
    });

    await page.goto(webServer.url, { waitUntil: 'networkidle' });

    // AC-01: Empty workspace project view
    await openSessionInUi(page, emptySession.sessionId);
    const emptySlate = await ensureSlateTabOpen(page, emptySession.sessionId);
    await emptySlate.locator('.sl-empty').first().waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await emptySlate.locator('[data-summary-key="inProgress"] strong').textContent(), '0');
    assert.equal(await emptySlate.locator('[data-summary-key="awaitingAcceptance"] strong').textContent(), '0');
    assert.equal(await emptySlate.locator('[data-summary-key="openIssues"] strong').textContent(), '0');
    assert.equal(await emptySlate.locator('.sl-focus').count(), 0);
    assert.equal(await emptySlate.locator('.sl-latest').count(), 0);
    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v1-01-empty.png') });

    // AC-02, AC-04, AC-07: Bookstore multi-session overview
    await openSessionInUi(page, ordersSession.sessionId);
    const slate = await ensureSlateTabOpen(page, ordersSession.sessionId);
    await page.waitForFunction(
      (rootSel) => document.querySelectorAll(`${rootSel} .sl-task`).length === 3,
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 15000 }
    );

    const overviewText = await slate.textContent();
    for (const sid of [ordersSession.sessionId, pickupSession.sessionId, mobileSession.sessionId]) {
      const label = `#${sid.replace(/^session-/, '').slice(0, 8)}`;
      assert.ok(overviewText.includes(label), `Missing real session label ${label}`);
    }
    assert.equal(await slate.locator('[data-summary-key="inProgress"] strong').textContent(), '0');
    assert.equal(await slate.locator('[data-summary-key="awaitingAcceptance"] strong').textContent(), '1');
    const openIssuesCount = Number(await slate.locator('[data-summary-key="openIssues"] strong').textContent());
    assert.ok(openIssuesCount >= 1, 'Expected at least 1 open mobile issue');
    assert.equal(await slate.locator('.sl-focus').count(), 1);
    assert.equal(await slate.locator('.sl-latest').count(), 1);
    const summaryText = await slate.locator('.sl-summary').textContent();
    assert.equal(summaryText.includes('%'), false, 'Summary must not display total project percentage');

    // Verify computed geometry, typography, monochrome colors
    const styleMetrics = await page.evaluate(() => {
      const rightbar = document.querySelector('[data-rightbar-col]');
      const deliverable = document.querySelector('.sl-deliverable');
      const meta = document.querySelector('.sl-task-meta');
      const titleBtn = document.querySelector('.sl-task-title');
      const refreshBtn = document.querySelector('.sl-refresh');
      return {
        rightbarWidth: rightbar ? Math.round(rightbar.getBoundingClientRect().width) : 0,
        deliverableFont: deliverable ? parseFloat(getComputedStyle(deliverable).fontSize) : 0,
        metaFont: meta ? parseFloat(getComputedStyle(meta).fontSize) : 0,
        titleColor: titleBtn ? getComputedStyle(titleBtn).color : '',
        refreshColor: refreshBtn ? getComputedStyle(refreshBtn).color : '',
        bodyBg: getComputedStyle(document.querySelector('.sl-root')).backgroundColor,
      };
    });
    assert.ok(styleMetrics.rightbarWidth >= 395 && styleMetrics.rightbarWidth <= 445, `Expected ~420px rightbar, got ${styleMetrics.rightbarWidth}`);
    assert.ok(styleMetrics.deliverableFont >= 14, `Body text must be >=14px, got ${styleMetrics.deliverableFont}`);
    assert.ok(styleMetrics.metaFont >= 12, `Secondary text must be >=12px, got ${styleMetrics.metaFont}`);

    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v1-02-light-overview.png') });

    // AC-02 / AC-04: Verify evidence-backed check command & exit codes (passed=0, failed=1)
    const passedChecks = slate.locator('.sl-check.is-passed .sl-row-trigger');
    assert.equal(await passedChecks.count(), 2, 'Expected 2 evidence-passed checks (Orders + Pickup)');
    await passedChecks.first().click();
    const passedDetailText = await slate.locator('.sl-check.is-passed .sl-detail-panel').first().textContent();
    assert.ok(passedDetailText.includes('退出码：0'), `Passed check should show 退出码：0, got: ${passedDetailText}`);
    await passedChecks.first().click();

    // AC-07 Keyboard expand on failed check & issue
    const firstFailedCheckBtn = slate.locator('.sl-check.is-failed .sl-row-trigger').first();
    await firstFailedCheckBtn.focus();
    await page.keyboard.press('Enter');
    assert.equal(await firstFailedCheckBtn.getAttribute('aria-expanded'), 'true');
    const failedDetailText = await slate.locator('.sl-check.is-failed .sl-detail-panel').first().textContent();
    assert.ok(failedDetailText.includes('node --test test/mobile.test.js'), `Failed check should show command, got: ${failedDetailText}`);
    assert.ok(failedDetailText.includes('退出码：1'), `Failed check should show 退出码：1, got: ${failedDetailText}`);
    if (failedDetailText.includes('输出引用：')) {
      assert.match(failedDetailText, /outputs\/[0-9a-f]+\/chk-[0-9a-f]+\.txt/, `Expected clean alphanumeric outputRef, got: ${failedDetailText}`);
    }
    const firstIssueBtn = slate.locator('.sl-issue .sl-row-trigger').first();
    await firstIssueBtn.focus();
    await page.keyboard.press('Enter');
    assert.equal(await firstIssueBtn.getAttribute('aria-expanded'), 'true');
    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v1-06-evidence-detail.png') });
    // Collapse back cleanly
    await firstFailedCheckBtn.click();
    await firstIssueBtn.click();

    // AC-07 Drag rightbar handle wider and verify width is NOT reset back to 420
    const handle = page.locator('[data-side="rightbar"]').first();
    const hBox = await handle.boundingBox();
    assert.ok(hBox, 'Rightbar drag handle must exist');
    await page.mouse.move(hBox.x + hBox.width / 2, hBox.y + 200);
    await page.mouse.down();
    await page.mouse.move(hBox.x - 90, hBox.y + 200, { steps: 6 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const draggedWidth = Math.round((await page.locator('[data-rightbar-col]').boundingBox()).width);
    assert.ok(draggedWidth >= 475, `Dragged width should widen (>=475px), got ${draggedWidth}`);

    // AC-03: Grayscale editor + manual adjustment + session override protection + restore
    const pickupTask = slate.locator('.sl-task', { hasText: '到店自取流程' }).first();
    await pickupTask.getByRole('button', { name: '编辑任务' }).click();
    const editorColors = await page.evaluate(() => {
      const saveBtn = document.querySelector('.sl-editor .sl-btn-primary');
      const range = document.querySelector('.sl-editor input[type="range"]');
      return {
        saveBg: saveBtn ? getComputedStyle(saveBtn).backgroundColor : '',
        saveColor: saveBtn ? getComputedStyle(saveBtn).color : '',
        accentColor: range ? getComputedStyle(range).accentColor : '',
      };
    });
    assert.notEqual(editorColors.saveBg, 'rgb(65, 118, 230)', 'Save button must not be blue');
    assert.notEqual(editorColors.saveColor, editorColors.saveBg, 'Save button text color must contrast with its background');
    assert.notEqual(editorColors.accentColor, 'rgb(65, 118, 230)', 'Range slider must not be blue');
    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v1-04-edit-neutral.png') });

    await pickupTask.locator('input[type="range"]').fill('65');
    await pickupTask.getByRole('button', { name: '保存调整' }).click();
    await page.waitForFunction(
      (rootSel) => {
        const card = [...document.querySelectorAll(`${rootSel} .sl-task`)].find((el) => el.textContent.includes('到店自取流程'));
        return card?.querySelector('.sl-task-pct')?.textContent === '65%' && card.textContent.includes('手动调整');
      },
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 8000 }
    );

    // Also edit project goal manually
    await slate.locator('.sl-goal').getByRole('button', { name: '编辑' }).click();
    await slate.locator('.sl-goal-editor textarea').first().fill('手动锁定目标：书店优先验收');
    await slate.getByRole('button', { name: '保存目标' }).click();
    await page.waitForFunction(
      (rootSel) => document.querySelector(`${rootSel} .sl-goal-title`)?.textContent === '手动锁定目标：书店优先验收',
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 8000 }
    );

    // Resume pickup headless session attempting to report 100% and new goal
    const resumeStart = Date.now();
    await runHeadless({
      label: 'pickup-resume',
      dshHome,
      magpieKey,
      cwd: wsBookstore,
      sessionId: pickupSession.sessionId,
      permissionMode: 'workspace-write',
      prompt: [
        '请再运行一次 `node --test test/pickup.test.js`，然后调用 `project_progress_report` 汇报：',
        '- projectGoal: "会话尝试覆盖项目目标"',
        '- task: "到店自取流程"',
        '- priority: "P0"',
        '- workStatus: "done"',
        '- progressEstimate: 100',
        '- nextDeliverable: "接入门店自取时间选择界面"',
        '- summary: "二次复跑并汇报 100%"',
        '- checks: [{ title: "到店自取校验测试", state: "passed", command: "node --test test/pickup.test.js", note: "二次复跑 3 项通过" }]',
      ].join('\n'),
    });

    // Wait for live update (< 3s) on open page without reloading
    await page.waitForFunction(
      (rootSel) => document.querySelector(`${rootSel} .sl-activity`)?.textContent?.includes('二次复跑'),
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 6000 }
    );
    const liveSyncElapsedMs = Date.now() - resumeStart;

    // Verify manual overrides stayed intact!
    assert.equal(await pickupTask.locator('.sl-task-pct').textContent(), '65%');
    assert.equal(await slate.locator('.sl-goal-title').textContent(), '手动锁定目标：书店优先验收');

    // Now click 恢复会话汇报 on Pickup task & Goal
    await pickupTask.getByRole('button', { name: '恢复会话汇报' }).click();
    await page.waitForFunction(
      (rootSel) => {
        const card = [...document.querySelectorAll(`${rootSel} .sl-task`)].find((el) => el.textContent.includes('到店自取流程'));
        return card?.querySelector('.sl-task-pct')?.textContent === '100%' && !card.textContent.includes('手动调整');
      },
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 8000 }
    );
    await slate.locator('.sl-goal').getByRole('button', { name: '恢复会话汇报' }).click();
    await page.waitForFunction(
      (rootSel) => document.querySelector(`${rootSel} .sl-goal-title`)?.textContent === '完成书店线上预订与到店自取的最小可用版本',
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 8000 }
    );

    const manualLog = [
      `PASS: pickup edited to 65% and goal locked; resumed session ${pickupSession.sessionId} reported 100% + new goal`,
      `After live sync (total headless + UI sync ${liveSyncElapsedMs}ms): pickup remained 65%, goal remained locked`,
      'After clicking 恢复会话汇报: pickup restored to 100%, goal restored to session value',
    ].join('\n');
    await writeFile(join(REPO_ROOT, 'test-results', 'v1-manual-preservation.txt'), `${manualLog}\n`, 'utf8');

    // AC-05: Session navigation + cross-session rightbar persistence (switch to Pickup session via task click)
    const beforeTitle = await page.title();
    await pickupTask.locator('.sl-task-title').click();
    const pickupSlate = page.locator(`[data-sidebar-right-session="${pickupSession.sessionId}"] .sl-root`).first();
    await pickupSlate.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(
      (sid) => {
        const mainText = document.body.innerText || '';
        const rightOwner = document.querySelector(`[data-sidebar-right-session="${sid}"]`);
        return Boolean(rightOwner) && (mainText.includes('validatePickup') || mainText.includes('pickup.js') || mainText.includes('到店自取'));
      },
      pickupSession.sessionId,
      { timeout: 10000 }
    );
    await page.waitForTimeout(400);
    const afterTitle = await page.title();
    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v1-05-navigation.png') });

    // Also verify dragged rightbar width remained > 470px across navigation!
    const widthAfterNav = Math.round((await page.locator('[data-rightbar-col]').boundingBox()).width);
    assert.ok(widthAfterNav >= 475, `Rightbar width should stay ${draggedWidth}px after navigation, got ${widthAfterNav}px`);

    // AC-07 Dark mode screenshot
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.body.hasAttribute('data-ds-dark-theme'), null, { timeout: 8000 });
    await page.waitForTimeout(200);
    const darkBg = await page.evaluate(() => getComputedStyle(document.querySelector('.sl-root')).backgroundColor);
    assert.notEqual(darkBg, 'rgb(255, 255, 255)', `Expected dark mode background, got ${darkBg}`);
    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v1-03-dark-overview.png') });

    // AC-06: Page reload + full DSH server restart persistence
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload({ waitUntil: 'networkidle' });
    const afterReload = await ensureSlateTabOpen(page, pickupSession.sessionId);
    assert.equal(await afterReload.locator('.sl-task').count(), 3);

    await browser.close();
    browser = null;
    await stopProcess(webServer.child);
    webServer = null;

    // Restart server on same DSH_HOME
    webServer = await startWebServer({ dshHome, magpieKey });
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const ctx2 = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' });
    const page2 = await ctx2.newPage();
    page2.on('pageerror', (err) => pageErrors.push(String(err)));
    page2.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    await page2.goto(webServer.url, { waitUntil: 'networkidle' });
    await openSessionInUi(page2, ordersSession.sessionId);
    const restartedSlate = await ensureSlateTabOpen(page2, ordersSession.sessionId);
    await page2.waitForFunction(
      (rootSel) => document.querySelectorAll(`${rootSel} .sl-task`).length === 3,
      `[data-sidebar-right-session="${ordersSession.sessionId}"]`,
      { timeout: 15000 }
    );
    assert.equal(await restartedSlate.locator('.sl-goal-title').textContent(), '完成书店线上预订与到店自取的最小可用版本');

    assert.equal(pageErrors.length, 0, `Browser page errors detected: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Browser console errors detected: ${consoleErrors.join('; ')}`);

    await browser.close();
    browser = null;
    await stopProcess(webServer.child);
    webServer = null;

    // Clean temp directory BEFORE AC-08 snapshot check
    await rm(runDir, { recursive: true, force: true });
    const postSnapshot = snapshotExistingDsh();
    assert.deepEqual(postSnapshot, preSnapshot, 'Existing ~/.dsh desktop/web profiles must remain untouched');

    const report = {
      status: 'PASS',
      hostVersion: '0.2.2-rc.5',
      model: 'magpie / auto/deepseek-v4.1-flash',
      sessions: {
        empty: emptySession.sessionId,
        orders: ordersSession.sessionId,
        pickup: pickupSession.sessionId,
        mobile: mobileSession.sessionId,
      },
      styleMetrics: {
        ...styleMetrics,
        draggedWidth,
        widthAfterNav,
        darkBg,
        editorColors,
      },
      navigation: {
        beforeTitle,
        afterTitle,
        crossSessionSidebarPersisted: true,
      },
      restartedTasks: 3,
      unauthenticatedRpcBlockedStatus: unauthRes.status,
      browserErrors: [...pageErrors, ...consoleErrors],
      ac08IsolatedClean: true,
      capturedAt: new Date().toISOString(),
    };
    await writeFile(join(REPO_ROOT, 'test-results', 'v1-e2e-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('[e2e] ALL AC-01..AC-08 PASSED');
  } finally {
    await browser?.close().catch(() => {});
    await Promise.allSettled([...activeChildren].map((child) => stopProcess(child)));
    await stopProcess(webServer?.child).catch(() => {});
    await rm(runDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
}

main().catch((error) => {
  console.error('[e2e] FAILED:', error);
  process.exitCode = 1;
});
