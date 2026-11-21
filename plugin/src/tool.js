import { applySessionReport, buildProjectView } from './domain.js';
import { extractShellExecutions, verifyReportedChecks } from './evidence.js';

/**
 * Resolve the authoritative session id directly from DSH's execution context.
 * Never reads or trusts any user/model-supplied `sessionId` parameter.
 * @param {object | undefined} exec
 * @returns {string}
 */
export function resolveAuthoritativeSessionId(exec) {
  const id = exec?.agent?.id || exec?.agent?.session?.id || exec?.agent?.session?.header?.id;
  if (!id || typeof id !== 'string') {
    throw new Error('DSH execution context did not provide an authoritative session id');
  }
  return id;
}

/**
 * Resolve the authoritative workspace path from the active session header or workingDirectory service.
 * @param {object} ctx
 * @param {object | undefined} exec
 * @returns {Promise<string>}
 */
export async function resolveAuthoritativeWorkspacePath(ctx, exec) {
  const headerCwd = exec?.agent?.session?.header?.cwd;
  if (typeof headerCwd === 'string' && headerCwd.trim()) {
    return headerCwd.trim();
  }
  const wd = ctx.get?.('workingDirectory');
  if (wd && exec?.agent) {
    const ensured = await wd.ensure(exec.agent, exec.signal);
    if (typeof ensured === 'string' && ensured.trim()) {
      return ensured.trim();
    }
  }
  throw new Error('DSH execution context did not provide a workspace path');
}

export const reportToolParameters = {
  type: 'object',
  additionalProperties: false,
  required: ['task', 'workStatus', 'progressEstimate', 'nextDeliverable', 'summary'],
  properties: {
    taskId: {
      type: 'string',
      description: '已有任务的稳定 ID（继续更新同一任务时可传入）；首次创建任务可省略。',
    },
    projectGoal: {
      type: 'string',
      description: '一句话描述当前项目的总体目标（如已知请提供）。',
    },
    acceptanceCriteria: {
      type: 'array',
      items: { type: 'string' },
      description: '项目级验收标准列表。',
    },
    task: {
      type: 'string',
      description: '当前任务名称，简短明确（例如「订单与库存接口」）。',
    },
    priority: {
      type: 'string',
      enum: ['P0', 'P1', 'P2'],
      description: '任务优先级。',
    },
    workStatus: {
      type: 'string',
      enum: ['planned', 'in_progress', 'blocked', 'done'],
      description: '当前工作状态，与测试验收是否通过分开记录。',
    },
    progressEstimate: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      description: '仅针对本任务的单项预估进度（0-100）。',
    },
    nextDeliverable: {
      type: 'string',
      description: '下一项具体、可检查的工作结果。',
    },
    summary: {
      type: 'string',
      description: '本次真实完成的工作摘要，用于最近动态记录。',
    },
    checks: {
      type: 'array',
      description: '本会话运行或关注的验收检查项；若标记为 passed，宿主会自动核对本会话真实命令执行记录与退出码。',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'state', 'note'],
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          state: { type: 'string', enum: ['todo', 'running', 'passed', 'failed'] },
          command: { type: 'string', description: '实际在本会话执行的测试或检查命令。' },
          note: { type: 'string', description: '简短真实结果摘要。' },
        },
      },
    },
    issues: {
      type: 'array',
      description: '发现或更新的待修问题；传入数组时会同步更新同一来源任务的未解决问题（未包含的旧问题自动标为已解决）。',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'title', 'detail'],
        properties: {
          id: { type: 'string', description: '稳定问题 ID（可选；若省略则按来源任务与标题生成稳定 ID）。' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          status: { type: 'string', enum: ['open', 'resolved'] },
        },
      },
    },
  },
};

/**
 * Create the `project_progress_report` tool handler bound to `ctx` and `store`.
 * @param {object} ctx
 * @param {ReturnType<import('./store.js').createProjectStore>} store
 */
export function createReportTool(ctx, store) {
  return {
    name: 'project_progress_report',
    description:
      '汇报当前真实会话在所在工作区项目中的任务进展、测试结果与待修问题。会话身份与工作区由宿主自动绑定；若将检查项标为 passed，宿主会核对当前会话真实命令执行记录与退出码。',
    parameters: reportToolParameters,
    output: {
      schema: {
        type: 'object',
        required: ['ok', 'sessionId', 'workspacePath', 'taskId', 'revision', 'verifiedChecks', 'downgradedChecks'],
        properties: {
          ok: { type: 'boolean' },
          sessionId: { type: 'string' },
          workspacePath: { type: 'string' },
          taskId: { type: 'string' },
          revision: { type: 'number' },
          verifiedChecks: { type: 'number' },
          downgradedChecks: { type: 'number' },
        },
      },
      render: (_args, value) => {
        const extra = value.downgradedChecks > 0
          ? `（注意：${value.downgradedChecks} 项检查未匹配到退出码为 0 的真实执行记录，已按规则降级，未计为通过）`
          : '';
        return [{
          type: 'text',
          text: `已记录会话 ${value.sessionId} 对任务 [taskId: ${value.taskId}] 的项目进展（版本 r${value.revision}）。${extra}`,
        }];
      },
    },
    async execute(args, exec) {
      const sessionId = resolveAuthoritativeSessionId(exec);
      const rawWorkspacePath = await resolveAuthoritativeWorkspacePath(ctx, exec);
      const executions = extractShellExecutions(exec?.agent?.session);

      const { project, result } = await store.mutate(rawWorkspacePath, async (current, helpers) => {
        let verifiedChecks = 0;
        let downgradedChecks = 0;
        let nextChecks = args.checks;

        if (Array.isArray(args.checks)) {
          const verified = await verifyReportedChecks(args.checks, executions, {
            now: helpers.now,
            sessionId,
            taskId: args.taskId || args.task,
            writeOutput: helpers.writeOutput,
          });
          nextChecks = verified.checks;
          downgradedChecks = verified.downgradedCount + verified.mismatchedCount;
          verifiedChecks = verified.checks.filter((c) => c.state === 'passed' && c.verifiedBy === 'evidence').length;
        }

        const applied = applySessionReport(
          current,
          { ...args, ...(nextChecks !== undefined ? { checks: nextChecks } : {}) },
          { sessionId, workspacePath: helpers.workspacePath, now: helpers.now }
        );

        const view = buildProjectView(applied.project);
        return {
          project: applied.project,
          result: {
            taskId: applied.taskId,
            revision: view.revision,
            verifiedChecks,
            downgradedChecks,
            workspacePath: helpers.workspacePath,
          },
        };
      });

      return {
        ok: true,
        sessionId,
        workspacePath: result.workspacePath,
        taskId: result.taskId,
        revision: project.revision,
        verifiedChecks: result.verifiedChecks,
        downgradedChecks: result.downgradedChecks,
      };
    },
  };
}

/**
 * Register `project_progress_report` on `ctx.tools`.
 */
export function registerReportTool(ctx, store) {
  return ctx.tools.register(createReportTool(ctx, store));
}
