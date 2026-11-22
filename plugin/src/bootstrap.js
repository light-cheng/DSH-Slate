import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { sessionLabel } from './domain.js';
import { canonicalizeWorkspacePath } from './store.js';

const execFileAsync = promisify(execFile);

const GIT_TIMEOUT_MS = 1500;
const GIT_MAX_BUFFER = 64 * 1024;
const OVERVIEW_CANDIDATES = [
  'README.md',
  'README',
  'SPEC.md',
  'package.json',
  'Cargo.toml',
  'pyproject.toml',
  'go.mod',
];
const MAX_CANDIDATE_SESSIONS = 12;
const MAX_RECENT_SESSIONS = 5;
const QUICK_INIT_TIMEOUT_MS = 15000;

async function runGit(workspacePath, args) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: workspacePath,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: GIT_MAX_BUFFER,
  });
  return String(stdout || '').trim();
}

/**
 * Collect read-only Git facts for a workspace without invoking shell interpolation.
 * Returns `null` when the workspace is not a Git repository or Git is unavailable.
 * @param {string} workspacePath
 */
export async function collectGitSnapshot(workspacePath) {
  if (!workspacePath || !existsSync(workspacePath)) return null;

  let branch = '';
  try {
    branch = await runGit(workspacePath, ['rev-parse', '--abbrev-ref', 'HEAD']);
  } catch {
    try {
      branch = await runGit(workspacePath, ['symbolic-ref', '--short', 'HEAD']);
    } catch {
      return null;
    }
  }

  const [statusRes, tagRes, logRes] = await Promise.allSettled([
    runGit(workspacePath, ['status', '--porcelain=v1']),
    runGit(workspacePath, ['describe', '--tags', '--abbrev=0']),
    runGit(workspacePath, ['log', '-n', '3', '--pretty=format:%h%x09%s']),
  ]);

  const dirtyCount =
    statusRes.status === 'fulfilled' && statusRes.value
      ? statusRes.value.split(/\r?\n/).filter(Boolean).length
      : 0;
  const latestTag = tagRes.status === 'fulfilled' ? tagRes.value : '';
  const recentCommits =
    logRes.status === 'fulfilled' && logRes.value
      ? logRes.value
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => {
            const tab = line.indexOf('\t');
            return {
              sha: tab >= 0 ? line.slice(0, tab) : line,
              subject: tab >= 0 ? line.slice(tab + 1).trim() : '',
            };
          })
      : [];

  return {
    branch: branch || 'HEAD',
    dirtyCount,
    latestTag,
    recentCommits,
  };
}

/**
 * Return up to 4 root overview filenames present in the workspace.
 * @param {string} workspacePath
 * @returns {string[]}
 */
export function detectOverviewFiles(workspacePath) {
  if (!workspacePath || !existsSync(workspacePath)) return [];
  return OVERVIEW_CANDIDATES.filter((name) => existsSync(join(workspacePath, name))).slice(0, 4);
}

/**
 * Collect matching workspaceId and up to 5 recent session headers (newest first).
 * @param {object} ctx
 * @param {string} canonicalWorkspacePath
 * @param {string} [excludeSessionId]
 */
export async function collectWorkspaceSessions(ctx, rawWorkspacePath, excludeSessionId = '') {
  const targetPath = canonicalizeWorkspacePath(rawWorkspacePath);
  const workspaces = ctx.get?.('workspaceRegistry')?.list?.();
  const matched = Array.isArray(workspaces)
    ? workspaces.find((ws) => canonicalizeWorkspacePath(ws?.path) === targetPath)
    : null;

  const workspaceId = typeof matched?.id === 'string' ? matched.id : '';
  const rawIds = Array.isArray(matched?.sessionIds) ? matched.sessionIds : [];
  const seen = new Set();
  const filteredIds = [];
  for (const id of rawIds) {
    if (typeof id !== 'string' || !id || id === excludeSessionId || seen.has(id)) continue;
    seen.add(id);
    filteredIds.push(id);
  }

  const candidateIds = filteredIds.slice(-MAX_CANDIDATE_SESSIONS);
  const sessions = ctx.get?.('sessions');
  const persistence = ctx.get?.('sessionPersistence');

  const resolved = await Promise.all(
    candidateIds.map(async (id) => {
      let header = sessions?.get?.(id)?.header || null;
      if (!header && typeof persistence?.readHeader === 'function') {
        try {
          header = await persistence.readHeader(id);
        } catch {
          header = null;
        }
      }
      const title =
        String(header?.title || header?.name || '').trim() || `会话 ${sessionLabel(id)}`;
      const updatedAt = String(header?.updatedAt || header?.createdAt || '');
      return {
        id,
        label: sessionLabel(id),
        title,
        updatedAt,
      };
    })
  );

  resolved.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));

  return {
    workspaceId,
    totalSessions: filteredIds.length,
    recentSessions: resolved.slice(0, MAX_RECENT_SESSIONS),
  };
}

/**
 * Gather zero-token workspace context (Git snapshot, root overview files, recent sessions,
 * and whether quick-init via `typertGateway` is available).
 * @param {object} ctx
 * @param {string} canonicalWorkspacePath
 * @param {string} [currentSessionId]
 */
export async function collectWorkspaceContext(ctx, rawWorkspacePath, currentSessionId = '') {
  const canonical = canonicalizeWorkspacePath(rawWorkspacePath);
  const [git, sessionInfo] = await Promise.all([
    collectGitSnapshot(canonical),
    collectWorkspaceSessions(ctx, canonical, currentSessionId),
  ]);

  return {
    workspacePath: canonical,
    git,
    overviewFiles: detectOverviewFiles(canonical),
    workspaceId: sessionInfo.workspaceId,
    totalSessions: sessionInfo.totalSessions,
    recentSessions: sessionInfo.recentSessions,
    canQuickInit: Boolean(ctx.get?.('typertGateway')),
  };
}

/**
 * Build a strictly bounded quick-init prompt embedding already-collected Git and doc facts
 * so cold-start initialization finishes in seconds instead of rescanning the repository.
 * @param {string} canonicalWorkspacePath
 * @param {object} wsContext
 * @returns {string}
 */
export function buildQuickInitPrompt(canonicalWorkspacePath, wsContext) {
  const lines = [
    `请为当前工作区（${canonicalWorkspacePath}）完成一次性、轻量级的「项目进度（DSH-Slate）」初始化，不要展开慢速全库排查。`,
    '',
    '## 已收集的工作区事实（无需重复执行 git 探测）',
  ];

  if (wsContext?.git) {
    const { branch, dirtyCount, latestTag, recentCommits } = wsContext.git;
    const parts = [`分支：${branch}`];
    if (latestTag) parts.push(`最新标签：${latestTag}`);
    parts.push(`未提交改动：${dirtyCount} 处`);
    lines.push(`- Git：${parts.join(' · ')}`);
    if (recentCommits?.length > 0) {
      lines.push(
        `- 最近提交：${recentCommits.map((c) => `${c.sha} ${c.subject}`).join('；')}`
      );
    }
  } else {
    lines.push('- Git：当前目录不是 Git 仓库或尚无提交');
  }

  if (wsContext?.overviewFiles?.length > 0) {
    lines.push(`- 根目录概览文件：${wsContext.overviewFiles.join('、')}`);
  } else {
    lines.push('- 根目录概览文件：未发现常见 README / manifest');
  }

  if (wsContext?.recentSessions?.length > 0) {
    lines.push(
      `- 历史会话标题参考：${wsContext.recentSessions.map((s) => `${s.label}「${s.title}」`).join('；')}`
    );
  }

  lines.push(
    '',
    '## 严格约束',
    '1. 禁止全库扫描源码、禁止修改任何代码或配置、禁止运行耗时构建或完整测试套件。',
    '2. 如需了解项目定位，最多只读取上述根目录概览文件中的 **1–2 个文件（每个只看前 150 行）**。',
    '3. 立即调用 **一次** `project_progress_report` 完成初始化：',
    '   - `projectGoal`：一句话简短概括（建议 25 字以内），只写核心目的，不堆砌功能清单；',
    '   - `acceptanceCriteria`：2–4 条简短可验证标准；',
    '   - 1 条当前阶段任务（合理给出 `workStatus`、`progressEstimate`、`nextDeliverable`、`summary`）；',
    '   - 如有需记录的检查项，**务必全部标为 `todo`**（绝对不要将本会话未实际运行且退出码为 0 的检查标为 `passed`）。',
    '4. 调用完成后，仅用 2–3 句话简要向用户说明已初始化的目标与当前阶段任务。'
  );

  return lines.join('\n');
}

/**
 * Create a clean session inside the target workspace and launch one bounded quick-init turn
 * via DSH's `typertGateway`.
 * @param {object} ctx
 * @param {object} _store
 * @param {{ workspacePath: string, sessionId?: string }} input
 */
export async function triggerQuickInit(ctx, _store, { workspacePath, sessionId = '' }) {
  const gateway = ctx.get?.('typertGateway');
  if (!gateway || typeof gateway.invoke !== 'function') {
    const error = new Error('当前宿主环境未启用快速初始化网关，请手动填写目标或直接在会话中让助手汇报。');
    error.code = 'slate/quick-init-unavailable';
    throw error;
  }

  const canonical = canonicalizeWorkspacePath(workspacePath);
  if (!canonical) {
    const error = new Error('未识别当前工作区路径，无法启动快速初始化');
    error.code = 'slate/invalid-workspace';
    throw error;
  }

  const wsContext = await collectWorkspaceContext(ctx, canonical, sessionId);
  const promptText = buildQuickInitPrompt(canonical, wsContext);

  const connection = ctx.get?.('connection');
  const peer = connection?.browserPeer && typeof connection.browserPeer === 'object'
    ? connection.browserPeer
    : null;

  const createRequest = wsContext.workspaceId
    ? { workspaceId: wsContext.workspaceId }
    : { cwd: canonical };

  const created = await gateway.invoke({
    namespace: 'session',
    method: 'create',
    args: { request: createRequest },
    signal: AbortSignal.timeout(QUICK_INIT_TIMEOUT_MS),
    ...(peer ? { peer } : {}),
  });

  const createdSessionId =
    (typeof created?.sessionId === 'string' && created.sessionId) ||
    (typeof created?.id === 'string' && created.id) ||
    '';

  if (!createdSessionId) {
    throw new Error('新建初始化会话失败：宿主未返回 sessionId');
  }

  await gateway.invoke({
    namespace: 'session',
    method: 'prompt',
    args: {
      request: {
        sessionId: createdSessionId,
        content: [{ type: 'text', text: promptText }],
        mode: 'queue',
        requestId: `slate-init-${randomUUID()}`,
      },
    },
    signal: AbortSignal.timeout(QUICK_INIT_TIMEOUT_MS),
    ...(peer ? { peer } : {}),
  });

  return {
    sessionId: createdSessionId,
    workspacePath: canonical,
  };
}
