import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createProjectStore } from '../src/store.js';

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

const activeChildren = new Set();

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

function runHeadless({ label, dshHome, magpieKey, cwd, prompt, permissionMode = 'workspace-write' }) {
  return new Promise((resolvePromise, rejectPromise) => {
    console.log(`[e2e-autoflow] headless start: ${label}`);
    const args = [
      '--profile',
      'slate-headless',
      '--json',
      '--permission-mode',
      permissionMode,
      '--approval-policy',
      'never',
      prompt,
    ];

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
            console.log(`[e2e-autoflow]   ${label} -> ${ev.tool}`);
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
      rejectPromise(new Error(`Headless "${label}" timed out after 300s\nstderr: ${stderr.slice(-500)}\ntail: ${stdout.slice(-800)}`));
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

      if (code !== 0) {
        rejectPromise(new Error(`Headless "${label}" exited with ${code}\nstderr: ${stderr}\nfinal: ${JSON.stringify(finalEvent)}`));
        return;
      }

      const sessionId = sessionEvent?.sessionId || finalEvent?.sessionId;
      console.log(`[e2e-autoflow] headless done: ${label} (${sessionId}) reports=${reportCalls.length}`);
      resolvePromise({
        sessionId,
        events,
        finalText: finalEvent?.text || '',
        reportCalls,
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
    const tabBtn = page.locator('button:has-text("项目进度")').first();
    if (await tabBtn.isVisible().catch(() => false)) {
      await tabBtn.click();
    }
  }
  await slateRoot.waitFor({ state: 'visible', timeout: 15000 });
  return slateRoot;
}

async function setupFixtures(wsAuto, wsCold) {
  // Scenario A workspace: failing calc module without any Slate instructions
  await mkdir(join(wsAuto, 'src'), { recursive: true });
  await mkdir(join(wsAuto, 'test'), { recursive: true });
  await writeFile(
    join(wsAuto, 'package.json'),
    JSON.stringify({ name: 'auto-calc-demo', type: 'module', private: true, scripts: { test: 'node --test' } }, null, 2),
    'utf8'
  );
  await writeFile(
    join(wsAuto, 'src', 'calc.js'),
    'export function add(a, b) {\n  return 0;\n}\n',
    'utf8'
  );
  await writeFile(
    join(wsAuto, 'test', 'calc.test.js'),
    `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { add } from '../src/calc.js';\n\ntest('add sums two numbers', () => {\n  assert.equal(add(2, 3), 5);\n  assert.equal(add(-4, 9), 5);\n});\n`,
    'utf8'
  );

  // Scenario B workspace: cold git repo with README, package.json, commit & tag
  await mkdir(wsCold, { recursive: true });
  await writeFile(
    join(wsCold, 'README.md'),
    '# Tray Utility\n\nMinimal macOS/Windows desktop tray utility for quick window positioning and hotkeys.\n\n## Core Goals\n- Single binary distribution\n- Reliable unit tests and tag releases\n',
    'utf8'
  );
  await writeFile(
    join(wsCold, 'package.json'),
    JSON.stringify({ name: 'tray-utility', version: '0.1.0', private: true }, null, 2),
    'utf8'
  );
  execFileSync('git', ['init', '-b', 'main'], { cwd: wsCold });
  execFileSync('git', ['config', 'user.email', 'tester@example.com'], { cwd: wsCold });
  execFileSync('git', ['config', 'user.name', 'Tester'], { cwd: wsCold });
  execFileSync('git', ['add', 'README.md', 'package.json'], { cwd: wsCold });
  execFileSync('git', ['commit', '-m', 'chore: release v0.1.0 baseline'], { cwd: wsCold });
  execFileSync('git', ['tag', 'v0.1.0'], { cwd: wsCold });
}

async function main() {
  const preSnapshot = snapshotExistingDsh();
  const magpieKey = readMagpieKey();

  const tmpBase = join(REPO_ROOT, '.tmp');
  await mkdir(tmpBase, { recursive: true });
  const runDir = await mkdtemp(join(tmpBase, 'e2e-autoflow-'));
  const dshHome = join(runDir, 'dsh-home');
  const wsAuto = join(runDir, 'ws-auto');
  const wsCold = join(runDir, 'ws-cold');

  let webServer = null;
  let browser = null;
  const pageErrors = [];
  const consoleErrors = [];

  try {
    console.log('[e2e-autoflow] preparing isolated profiles and fixtures...');
    await setupFixtures(wsAuto, wsCold);

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

    // Scenario A: Real session with NO mention of Slate or project_progress_report
    const autoSession = await runHeadless({
      label: 'auto-report',
      dshHome,
      magpieKey,
      cwd: wsAuto,
      permissionMode: 'workspace-write',
      prompt: '修复 src/calc.js 中的 add(a, b) 实现使其正确返回两数之和，然后运行 bash 命令 `node --test` 确认全部测试通过。',
    });

    assert.ok(autoSession.sessionId, 'autoSession must produce a sessionId');
    assert.ok(autoSession.reportCalls.length >= 1, 'Model must proactively call project_progress_report via systemPrompt.section without being asked');

    const store = createProjectStore({ dshHome });
    const autoProject = await store.read(wsAuto);
    assert.ok(autoProject.revision >= 1, `Expected autoProject revision >= 1, got ${autoProject.revision}`);
    assert.ok(Boolean(autoProject.goal), 'autoProject must have a goal');
    assert.ok(autoProject.tasks.length >= 1, 'autoProject must have at least 1 task');
    const verifiedEvidenceChecks = autoProject.checks.filter(
      (c) => c.state === 'passed' && c.verifiedBy === 'evidence' && c.exitCode === 0
    );
    assert.ok(verifiedEvidenceChecks.length >= 1, 'autoProject must contain at least 1 evidence-verified passed check');

    const indOut = execFileSync(process.execPath, ['--test'], { cwd: wsAuto, encoding: 'utf8' });
    await writeFile(join(REPO_ROOT, 'test-results', 'v2-autoflow-independent.txt'), `${indOut}\n`, 'utf8');

    // Scenario B prerequisites: 2 read-only sessions in ws-cold (neither should trigger reporting)
    const priorSession = await runHeadless({
      label: 'cold-prior',
      dshHome,
      magpieKey,
      cwd: wsCold,
      permissionMode: 'read-only',
      prompt: 'Reply ONLY with PRIOR_OK. Do not call any tools and do not modify files.',
    });
    const uiSession = await runHeadless({
      label: 'cold-ui',
      dshHome,
      magpieKey,
      cwd: wsCold,
      permissionMode: 'read-only',
      prompt: 'Reply ONLY with COLD_READY. Do not call any tools and do not modify files.',
    });

    const coldBefore = await store.read(wsCold);
    assert.equal(coldBefore.revision, 0, 'Read-only cold sessions must leave wsCold revision at 0');

    console.log('[e2e-autoflow] starting isolated DSH web server and Playwright...');
    webServer = await startWebServer({ dshHome, magpieKey });

    const { chromium } = await import(pathToFileURL(PLAYWRIGHT_ENTRY).href);
    const executablePath = resolveChromiumExecutable();
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, colorScheme: 'light' });
    const page = await context.newPage();

    page.on('pageerror', (err) => pageErrors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto(webServer.url, { waitUntil: 'networkidle' });
    await openSessionInUi(page, uiSession.sessionId);
    const coldSlate = await ensureSlateTabOpen(page, uiSession.sessionId);

    // Verify empty-state hints card, git info, prior session count, and light-mode 16px tab icon
    await coldSlate.locator('.sl-bootstrap').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForFunction(
      (rootSel) => {
        const meta = document.querySelector(`${rootSel} .sl-bootstrap-meta`);
        return Boolean(meta && meta.textContent.includes('v0.1.0') && meta.textContent.includes('历史会话'));
      },
      `[data-sidebar-right-session="${uiSession.sessionId}"]`,
      { timeout: 10000 }
    );

    const lightIconState = await page.evaluate(() => {
      const light = document.querySelector('.sl-tab-icon-light');
      const dark = document.querySelector('.sl-tab-icon-dark');
      return {
        lightDisplay: light ? getComputedStyle(light).display : null,
        lightLoaded: Boolean(light && light.complete && light.naturalWidth > 0),
        darkDisplay: dark ? getComputedStyle(dark).display : null,
      };
    });
    assert.equal(lightIconState.lightDisplay, 'block', 'Light tab icon should be visible in light mode');
    assert.equal(lightIconState.lightLoaded, true, 'Light tab icon image must be loaded');
    assert.equal(lightIconState.darkDisplay, 'none', 'Dark tab icon should be hidden in light mode');

    const emptyHintsText = await coldSlate.locator('.sl-bootstrap').textContent();
    const priorShortLabel = `#${priorSession.sessionId.replace(/^session-/, '').slice(0, 8)}`;
    assert.match(emptyHintsText, /main/);
    assert.match(emptyHintsText, /v0\.1\.0/);
    assert.match(emptyHintsText, /release v0\.1\.0 baseline/);
    assert.match(emptyHintsText, /已有 [1-9]\d* 个历史会话/);
    assert.ok(emptyHintsText.includes(priorShortLabel), `Expected prior session ${priorShortLabel} in ${emptyHintsText}`);

    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v2-01-empty-hints.png') });

    // Click one-click 快速初始化!
    console.log('[e2e-autoflow] clicking 快速初始化 in Playwright...');
    const quickInitBtn = coldSlate.getByRole('button', { name: '快速初始化' });
    await quickInitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await quickInitBtn.click();

    // Wait for created session to open & quick-init turn to populate goal and >= 1 task cleanly
    await page.waitForFunction(
      () => {
        const title = document.querySelector('.sl-root .sl-goal-title:not(.sl-goal-empty)');
        const tasks = document.querySelectorAll('.sl-root .sl-task');
        return Boolean(title && title.textContent.trim().length > 0 && tasks.length >= 1);
      },
      null,
      { timeout: 120000 }
    );
    await page.waitForTimeout(300);

    const afterInitMetrics = await page.evaluate(() => {
      const title = document.querySelector('.sl-root .sl-goal-title');
      const tasks = document.querySelectorAll('.sl-root .sl-task');
      const criteria = document.querySelectorAll('.sl-root .sl-criteria-list li');
      return {
        goalText: title ? title.textContent.trim() : '',
        goalFontSize: title ? parseFloat(getComputedStyle(title).fontSize) : 0,
        taskCount: tasks.length,
        criteriaCount: criteria.length,
        bootstrapStillVisible: Boolean(document.querySelector('.sl-root .sl-bootstrap')),
      };
    });

    assert.equal(afterInitMetrics.goalFontSize, 16, `Expected tightened goal font size 16px, got ${afterInitMetrics.goalFontSize}`);
    assert.ok(afterInitMetrics.goalText.length > 0, 'Initialized goal must be non-empty');
    assert.ok(afterInitMetrics.taskCount >= 1, 'Initialized project must display >= 1 task');
    assert.equal(afterInitMetrics.bootstrapStillVisible, false, 'Empty-state bootstrap card must disappear once initialized');

    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v2-02-after-quick-init-light.png') });

    // Switch to dark mode and verify dark 16px tab icon swaps in + dark surface applies
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.body.hasAttribute('data-ds-dark-theme'), null, { timeout: 8000 });
    await page.waitForTimeout(200);

    const darkIconState = await page.evaluate(() => {
      const light = document.querySelector('.sl-tab-icon-light');
      const dark = document.querySelector('.sl-tab-icon-dark');
      const rootBg = getComputedStyle(document.querySelector('.sl-root')).backgroundColor;
      return {
        lightDisplay: light ? getComputedStyle(light).display : null,
        darkDisplay: dark ? getComputedStyle(dark).display : null,
        darkLoaded: Boolean(dark && dark.complete && dark.naturalWidth > 0),
        rootBg,
      };
    });
    assert.equal(darkIconState.lightDisplay, 'none', 'Light tab icon should hide in dark mode');
    assert.equal(darkIconState.darkDisplay, 'block', 'Dark tab icon should show in dark mode');
    assert.equal(darkIconState.darkLoaded, true, 'Dark tab icon image must be loaded');
    assert.notEqual(darkIconState.rootBg, 'rgb(255, 255, 255)', 'Dark background should be active');

    await page.screenshot({ path: join(REPO_ROOT, 'previews', 'v2-03-after-quick-init-dark.png') });

    assert.equal(pageErrors.length, 0, `Browser page errors detected: ${pageErrors.join('; ')}`);
    assert.equal(consoleErrors.length, 0, `Browser console errors detected: ${consoleErrors.join('; ')}`);

    await browser.close();
    browser = null;
    await stopProcess(webServer.child);
    webServer = null;

    await rm(runDir, { recursive: true, force: true });
    const postSnapshot = snapshotExistingDsh();
    assert.deepEqual(postSnapshot, preSnapshot, 'Existing ~/.dsh desktop/web profiles must remain untouched');

    const report = {
      status: 'PASS',
      hostVersion: '0.2.2-rc.5',
      model: 'magpie / auto/deepseek-v4.1-flash',
      scenarioA: {
        sessionId: autoSession.sessionId,
        proactiveReportCalls: autoSession.reportCalls.length,
        revision: autoProject.revision,
        goal: autoProject.goal,
        taskCount: autoProject.tasks.length,
        evidenceVerifiedChecks: verifiedEvidenceChecks.length,
      },
      scenarioB: {
        priorSessionId: priorSession.sessionId,
        uiSessionId: uiSession.sessionId,
        afterInitMetrics,
        lightIconState,
        darkIconState,
      },
      browserErrors: [...pageErrors, ...consoleErrors],
      isolatedProfilesUntouched: true,
      capturedAt: new Date().toISOString(),
    };
    await writeFile(join(REPO_ROOT, 'test-results', 'v2-autoflow-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log('[e2e-autoflow] ALL SCENARIOS PASSED');
  } finally {
    await browser?.close().catch(() => {});
    await Promise.allSettled([...activeChildren].map((child) => stopProcess(child)));
    await stopProcess(webServer?.child).catch(() => {});
    await rm(runDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
}

main().catch((error) => {
  console.error('[e2e-autoflow] FAILED:', error);
  process.exitCode = 1;
});
