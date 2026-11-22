import { basename } from 'node:path';
import { buildProjectView } from './domain.js';

export const PROMPT_SECTION_NAME = 'dsh-slate:project-progress';

const WORK_STATUS_RANK = {
  blocked: 0,
  in_progress: 1,
  planned: 2,
  done: 3,
};

/**
 * Render a compact Markdown section instructing the agent when and how to proactively
 * update DSH-Slate via `project_progress_report`, along with current workspace task IDs.
 * @param {object | null | undefined} project
 */
export function formatSlatePromptSection(project) {
  const view = project ? buildProjectView(project) : null;
  const wsName = view?.workspacePath ? basename(view.workspacePath) : '';

  const lines = [
    '# 项目进度面板（DSH-Slate）',
    '',
    '本工作区已启用「项目进度」侧栏（工具 `project_progress_report`），用于跨会话持久跟踪当前工作区的真实进展。',
    '',
    '## 主动汇报规则',
    '- 在当前工作区完成**实质性进展**（完成代码/文档改动、运行测试或构建得到结果、拆分或推进任务与交付物、发现明确阻塞或待修问题）后，在最终回复用户前**主动**调用一次 `project_progress_report` 同步进度，无需等待用户提醒。',
    '- 纯只读问答、闲聊或未产生实质项目变更时，**不要**调用 `project_progress_report`。',
    '- 继续推进已有任务时，务必传入下方对应的 `taskId`，避免重复创建同名任务。',
    '- 若下方已存在「当前目标」和「当前验收标准」，做单个子任务汇报时**省略** `projectGoal` 与 `acceptanceCriteria`（不要用单个子任务的标准覆盖整份项目级验收标准）；仅在首次初始化或整个项目范围变化时传入。',
    '- 任务阶段从「红灯/阻塞/筹备」推进到「实现完成/已验收」时，同步将 `task` 标题更新为准确的简洁名称（避免保留过时阶段后缀）。',
    '- `projectGoal` 保持**一句话简短概括（建议 25 字以内）**，只写项目核心目的，不要堆砌功能清单；`acceptanceCriteria` 控制在 2–5 条简短可验证标准。',
    '- 仅当**本会话**真实运行过对应测试/检查命令且退出码为 `0` 时，才可将检查项标为 `passed`；未在本会话执行的检查请如实标为 `todo`。',
    '',
    wsName ? `## 当前工作区状态（${wsName}）` : '## 当前工作区状态',
  ];

  const hasContent = Boolean(
    view &&
      (view.goal ||
        (view.acceptanceCriteria && view.acceptanceCriteria.length > 0) ||
        view.tasks.length > 0 ||
        view.checks.length > 0 ||
        view.issues.length > 0)
  );

  if (!hasContent) {
    lines.push('- 当前工作区尚无项目进度记录；如本轮完成实质进展，请在调用 `project_progress_report` 时顺带写入简短 `projectGoal`、`acceptanceCriteria` 与当前任务。');
    return lines.join('\n');
  }

  if (view.goal) {
    const lockNote = view.hasGoalOverride ? '（用户已手动锁定，汇报时无需重写目标）' : '';
    lines.push(`- 当前目标：${view.goal}${lockNote}`);
  }

  if (Array.isArray(view.acceptanceCriteria) && view.acceptanceCriteria.length > 0) {
    lines.push('- 当前验收标准（项目级，子任务汇报请省略 `acceptanceCriteria`）：');
    for (const criterion of view.acceptanceCriteria.slice(0, 6)) {
      lines.push(`  - ${criterion}`);
    }
  }

  if (view.tasks.length > 0) {
    const ordered = [...view.tasks].sort((a, b) => {
      if (Boolean(a.verified) !== Boolean(b.verified)) {
        return a.verified ? 1 : -1;
      }
      return (WORK_STATUS_RANK[a.workStatus] ?? 4) - (WORK_STATUS_RANK[b.workStatus] ?? 4);
    });
    lines.push('- 已有任务：');
    for (const task of ordered.slice(0, 8)) {
      const verifiedTag = task.verified ? ' · 已验收' : '';
      lines.push(`  - [taskId: ${task.id}] ${task.title}（${task.priority} · ${task.workStatus}${verifiedTag} · ${task.progressEstimate}%）`);
    }
  }

  const todoChecks = Array.isArray(view.checks)
    ? view.checks.filter((check) => check.state === 'todo')
    : [];
  if (todoChecks.length > 0) {
    lines.push('- 待检查项（后续会话实测通过后会自动替换同名任务下的未检查占位）：');
    for (const check of todoChecks.slice(0, 5)) {
      lines.push(`  - [checkId: ${check.id}] ${check.title}`);
    }
  }

  const openIssues = view.issues.filter((issue) => issue.status === 'open');
  if (openIssues.length > 0) {
    lines.push('- 待修问题：');
    for (const issue of openIssues.slice(0, 5)) {
      lines.push(`  - [issueId: ${issue.id}] [${issue.severity}] ${issue.title}`);
    }
    lines.push('  - 若本轮已解决上述问题，请在 `issues` 中传入对应 `id` 并标为 `resolved`。');
  }

  return lines.join('\n');
}

/**
 * Resolve the workspace cwd for the active agent turn inside `systemPrompt.section`.
 * @param {object} ctx
 * @param {object | undefined} context
 * @returns {string}
 */
export function resolvePromptWorkspace(ctx, context) {
  const agent = context?.agent ?? context?.scope;
  const headerCwd = agent?.session?.header?.cwd;
  if (typeof headerCwd === 'string' && headerCwd.trim()) {
    return headerCwd.trim();
  }

  const contextCwd = context?.cwd;
  if (typeof contextCwd === 'string' && contextCwd.trim()) {
    return contextCwd.trim();
  }

  const sessionId = agent?.id || agent?.session?.id || agent?.session?.header?.id;
  if (typeof sessionId === 'string' && sessionId) {
    const workspaces = ctx.get?.('workspaceRegistry')?.list?.();
    if (Array.isArray(workspaces)) {
      const owner = workspaces.find(
        (ws) => Array.isArray(ws?.sessionIds) && ws.sessionIds.includes(sessionId)
      );
      if (owner?.path && typeof owner.path === 'string' && owner.path.trim()) {
        return owner.path.trim();
      }
    }

    const liveCwd = ctx.get?.('sessions')?.get?.(sessionId)?.header?.cwd;
    if (typeof liveCwd === 'string' && liveCwd.trim()) {
      return liveCwd.trim();
    }
  }

  return '';
}

/**
 * Conditionally register DSH's dynamic `systemPrompt.section` without blocking plugin
 * startup in minimal/Headless hosts that omit `systemPrompt`.
 * @param {object} ctx
 * @param {ReturnType<import('./store.js').createProjectStore>} store
 */
export function registerPromptGuidance(ctx, store) {
  if (typeof ctx?.inject !== 'function') return;

  ctx.inject(['systemPrompt'], (promptCtx) => {
    const sp = promptCtx.systemPrompt;
    if (!sp || typeof sp.section !== 'function') return;

    let order = 520;
    try {
      const base = sp.getSectionOrder?.('TOOL_BASH');
      if (typeof base === 'number' && Number.isFinite(base)) {
        order = base + 20;
      }
    } catch {
      // Keep default section order when host API does not expose TOOL_BASH order.
    }

    promptCtx.effect(
      () =>
        sp.section({
          name: PROMPT_SECTION_NAME,
          order,
          interpolate: false,
          text: (context) => {
            const agent = context?.agent ?? context?.scope;
            const tools = promptCtx.get?.('tools');
            if (agent && tools && typeof tools.get === 'function') {
              try {
                if (!tools.get('project_progress_report', agent)) {
                  return '';
                }
              } catch {
                // Fail-open when a partial host/test context cannot evaluate tool filters.
              }
            }
            const cwd = resolvePromptWorkspace(promptCtx, context);
            const project = cwd ? store.readSync(cwd) : null;
            return formatSlatePromptSection(project);
          },
        }),
      'dsh-slate: systemPrompt auto-report guidance'
    );
  });
}
