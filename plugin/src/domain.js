import { createHash } from 'node:crypto';

const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2']);
const VALID_WORK_STATUS = new Set(['planned', 'in_progress', 'blocked', 'done']);
const VALID_CHECK_STATE = new Set(['todo', 'running', 'passed', 'failed']);
const PRIORITY_RANK = { P0: 0, P1: 1, P2: 2 };
const MAX_ACTIVITY_ENTRIES = 20;
const MAX_REPORT_EVENTS = 100;

/**
 * Derive a stable short SHA-256 hex prefix.
 * @param {string} input
 * @param {number} [len]
 * @returns {string}
 */
export function shortHash(input, len = 12) {
  return createHash('sha256').update(String(input)).digest('hex').slice(0, len);
}

/**
 * Format a DSH session id into a compact `#xxxxxxxx` display label.
 * @param {string} sessionId
 * @returns {string}
 */
export function sessionLabel(sessionId) {
  const clean = String(sessionId || '').replace(/^session-/, '');
  return `#${clean.slice(0, 8)}`;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeCommandKey(cmd) {
  return String(cmd || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizePriority(value, fallback = 'P1') {
  return VALID_PRIORITIES.has(value) ? value : fallback;
}

function normalizeWorkStatus(value, fallback = 'in_progress') {
  return VALID_WORK_STATUS.has(value) ? value : fallback;
}

function clampProgress(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

/**
 * Normalize acceptance criteria from either string or string[].
 * @param {unknown} raw
 * @returns {Array<string>}
 */
export function normalizeAcceptanceCriteria(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || '').trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\r?\n|；|;/)
      .map((item) => item.replace(/^[-*•\d.]+\s*/, '').trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Clone a project state safely before mutation.
 * @param {object} project
 * @returns {object}
 */
export function cloneProject(project) {
  return structuredClone(project);
}

/**
 * Create an empty project state scoped to one canonical workspace path.
 * @param {string} workspacePath
 * @param {string} [now]
 */
export function createEmptyProject(workspacePath, now = new Date().toISOString()) {
  return {
    schemaVersion: 1,
    id: `proj-${shortHash(workspacePath, 16)}`,
    workspacePath,
    goal: '',
    acceptanceCriteria: [],
    manualOverrides: {
      goal: false,
      acceptanceCriteria: false,
    },
    sessionGoal: '',
    sessionAcceptanceCriteria: [],
    tasks: [],
    checks: [],
    issues: [],
    reportEvents: [],
    activity: [],
    revision: 0,
    createdAt: now,
    updatedAt: null,
  };
}

function prependActivity(project, entry) {
  if (project.activity[0] === entry) return;
  project.activity.unshift(entry);
  if (project.activity.length > MAX_ACTIVITY_ENTRIES) {
    project.activity.length = MAX_ACTIVITY_ENTRIES;
  }
}

function resolveTaskId(project, input, sessionId) {
  const requestedId = typeof input.taskId === 'string' ? input.taskId.trim() : '';
  if (requestedId) {
    const byId = project.tasks.find((task) => task.id === requestedId);
    if (byId) return byId.id;
    return requestedId;
  }
  const titleKey = normalizeText(input.task);
  if (titleKey) {
    const byTitle = project.tasks.find((task) => normalizeText(task.title) === titleKey);
    if (byTitle) return byTitle.id;
  }
  const ownUnverified = project.tasks.filter(
    (task) =>
      task.primarySessionId === sessionId &&
      !evaluateTaskVerification(project, task).verified
  );
  if (ownUnverified.length === 1) {
    return ownUnverified[0].id;
  }
  const seed = `${sessionId}::${titleKey || `task-${project.tasks.length + 1}`}`;
  return `task-${shortHash(seed, 10)}`;
}

function stableCheckId(taskId, sessionId, rawCheck, index) {
  if (typeof rawCheck.id === 'string' && rawCheck.id.trim()) {
    return rawCheck.id.trim();
  }
  return `chk-${shortHash(`${taskId}::${sessionId}::${normalizeText(rawCheck.title)}::${index}`, 10)}`;
}

function stableIssueId(taskId, sessionId, rawIssue, index) {
  if (typeof rawIssue.id === 'string' && rawIssue.id.trim()) {
    return rawIssue.id.trim();
  }
  const titleKey = normalizeText(rawIssue.title) || `issue-${index + 1}`;
  return `iss-${shortHash(`${taskId}::${sessionId}::${titleKey}`, 10)}`;
}

/**
 * Determine whether a task is verified based on FR-05 rules:
 * either explicit user confirmation OR at least one evidence-backed passed check
 * with zero failing checks for that task.
 * @param {object} project
 * @param {object} task
 * @returns {{ verified: boolean, verifiedBy: 'evidence' | 'user' | null, hasFailedCheck: boolean }}
 */
export function evaluateTaskVerification(project, task) {
  const taskChecks = project.checks.filter((check) => check.taskId === task.id);
  const hasFailedCheck = taskChecks.some((check) => check.state === 'failed');
  const hasEvidencePass = taskChecks.some(
    (check) => check.state === 'passed' && check.verifiedBy === 'evidence'
  );

  if (task.userVerified) {
    return { verified: true, verifiedBy: 'user', hasFailedCheck };
  }
  if (hasEvidencePass && !hasFailedCheck) {
    return { verified: true, verifiedBy: 'evidence', hasFailedCheck: false };
  }
  return { verified: false, verifiedBy: null, hasFailedCheck };
}

/**
 * Apply an authoritative session progress report to a project without overriding
 * any fields locked by user manual edits.
 *
 * @param {object} current
 * @param {object} input
 * @param {{ sessionId: string, workspacePath: string, now?: string }} context
 */
export function applySessionReport(current, input, context) {
  const project = cloneProject(current);
  const now = context.now || new Date().toISOString();
  const sessionId = String(context.sessionId);
  const label = sessionLabel(sessionId);
  const changedFields = [];

  if (typeof input.projectGoal === 'string' && input.projectGoal.trim()) {
    const incomingGoal = input.projectGoal.trim();
    project.sessionGoal = incomingGoal;
    if (!project.manualOverrides.goal && project.goal !== incomingGoal) {
      project.goal = incomingGoal;
      changedFields.push('goal');
    }
  }

  if (input.acceptanceCriteria !== undefined) {
    const incomingCriteria = normalizeAcceptanceCriteria(input.acceptanceCriteria);
    if (incomingCriteria.length > 0) {
      project.sessionAcceptanceCriteria = incomingCriteria;
      if (!project.manualOverrides.acceptanceCriteria) {
        project.acceptanceCriteria = incomingCriteria;
        changedFields.push('acceptanceCriteria');
      }
    }
  }

  const taskId = resolveTaskId(project, input, sessionId);
  const existingTask = project.tasks.find((task) => task.id === taskId);
  const incomingTitle = String(input.task || existingTask?.title || '未命名任务').trim();
  const incomingPriority = normalizePriority(input.priority, existingTask?.sessionSnapshot?.priority || 'P1');
  const incomingProgress = clampProgress(input.progressEstimate, existingTask?.sessionSnapshot?.progressEstimate ?? 0);
  const incomingNext = typeof input.nextDeliverable === 'string' && input.nextDeliverable.trim()
    ? input.nextDeliverable.trim()
    : (existingTask?.sessionSnapshot?.nextDeliverable || '待定');
  const incomingWorkStatus = normalizeWorkStatus(
    input.workStatus,
    incomingProgress >= 100 ? 'done' : 'in_progress'
  );

  let task;
  if (existingTask) {
    task = existingTask;
    if (!task.sessionIds.includes(sessionId)) {
      task.sessionIds.push(sessionId);
      changedFields.push('sessionIds');
    }
    task.primarySessionId = sessionId;
    task.title = incomingTitle;
    task.workStatus = incomingWorkStatus;
    task.sessionSnapshot = {
      priority: incomingPriority,
      progressEstimate: incomingProgress,
      nextDeliverable: incomingNext,
    };
    if (!task.manualOverrides.priority) {
      task.priority = incomingPriority;
    }
    if (!task.manualOverrides.progressEstimate) {
      task.progressEstimate = incomingProgress;
    }
    if (!task.manualOverrides.nextDeliverable) {
      task.nextDeliverable = incomingNext;
    }
    task.updatedAt = now;
    changedFields.push('task');
  } else {
    task = {
      id: taskId,
      projectId: project.id,
      title: incomingTitle,
      priority: incomingPriority,
      workStatus: incomingWorkStatus,
      progressEstimate: incomingProgress,
      nextDeliverable: incomingNext,
      sessionIds: [sessionId],
      primarySessionId: sessionId,
      userVerified: false,
      userVerifiedAt: null,
      manualOverrides: {
        priority: false,
        progressEstimate: false,
        nextDeliverable: false,
      },
      sessionSnapshot: {
        priority: incomingPriority,
        progressEstimate: incomingProgress,
        nextDeliverable: incomingNext,
      },
      createdAt: now,
      updatedAt: now,
    };
    project.tasks.push(task);
    changedFields.push('taskCreated');
  }

  if (Array.isArray(input.checks)) {
    const incomingCheckIds = new Set(
      input.checks.map((c) => (typeof c?.id === 'string' ? c.id.trim() : '')).filter(Boolean)
    );
    const incomingExecutedCommands = new Set(
      input.checks
        .filter((c) => (c?.state === 'passed' || c?.state === 'failed') && c?.command)
        .map((c) => normalizeCommandKey(c.command))
        .filter(Boolean)
    );
    const incomingExecutedTitles = new Set(
      input.checks
        .filter((c) => (c?.state === 'passed' || c?.state === 'failed') && c?.title)
        .map((c) => normalizeText(c.title))
        .filter(Boolean)
    );
    const hasExecutedCheck = input.checks.some(
      (c) => c?.state === 'passed' || c?.state === 'failed'
    );
    const hasEvidencePass = input.checks.some(
      (c) => c?.state === 'passed' && c?.verifiedBy === 'evidence'
    );
    const hasIncomingFailure = input.checks.some((c) => c?.state === 'failed');
    project.checks = project.checks.filter((check) => {
      if (check.taskId === taskId && check.sourceSessionId === sessionId) return false;
      if (check.taskId === taskId && incomingCheckIds.has(check.id)) return false;
      if (
        hasExecutedCheck &&
        check.taskId === taskId &&
        check.state === 'todo' &&
        !check.evidenceMatched
      ) {
        return false;
      }
      if (check.taskId === taskId && check.state === 'failed') {
        const cmdKey = normalizeCommandKey(check.command);
        const titleKey = normalizeText(check.title);
        if (
          (cmdKey && incomingExecutedCommands.has(cmdKey)) ||
          (titleKey && incomingExecutedTitles.has(titleKey)) ||
          (hasEvidencePass && !hasIncomingFailure && incomingWorkStatus === 'done')
        ) {
          return false;
        }
      }
      return true;
    });
    input.checks.forEach((rawCheck, index) => {
      const checkId = stableCheckId(taskId, sessionId, rawCheck, index);
      const state = VALID_CHECK_STATE.has(rawCheck.state) ? rawCheck.state : 'todo';
      project.checks.push({
        id: checkId,
        projectId: project.id,
        taskId,
        title: String(rawCheck.title || `检查 ${index + 1}`).trim(),
        state,
        ...(rawCheck.command ? { command: String(rawCheck.command) } : {}),
        ...(rawCheck.exitCode !== undefined ? { exitCode: rawCheck.exitCode } : {}),
        outputSummary: String(rawCheck.outputSummary || rawCheck.note || '').trim(),
        ...(rawCheck.outputRef ? { outputRef: String(rawCheck.outputRef) } : {}),
        sourceSessionId: sessionId,
        ...(rawCheck.verifiedBy ? { verifiedBy: rawCheck.verifiedBy } : {}),
        evidenceMatched: Boolean(rawCheck.evidenceMatched),
        startedAt: rawCheck.startedAt || now,
        finishedAt: rawCheck.finishedAt ?? (state === 'passed' || state === 'failed' ? now : null),
      });
    });
    changedFields.push('checks');
  }

  if (Array.isArray(input.issues)) {
    const incomingIds = new Set();
    input.issues.forEach((rawIssue, index) => {
      const issueId = stableIssueId(taskId, sessionId, rawIssue, index);
      incomingIds.add(issueId);
      const status = rawIssue.status === 'resolved' ? 'resolved' : 'open';
      const existingIssue = project.issues.find((item) => item.id === issueId);
      if (existingIssue) {
        existingIssue.taskId = taskId;
        existingIssue.severity = normalizePriority(rawIssue.severity, existingIssue.severity);
        existingIssue.title = String(rawIssue.title || existingIssue.title).trim();
        existingIssue.detail = String(rawIssue.detail ?? existingIssue.detail).trim();
        existingIssue.status = status;
        existingIssue.sourceSessionId = sessionId;
        existingIssue.resolvedAt = status === 'resolved' ? (existingIssue.resolvedAt || now) : null;
      } else {
        project.issues.push({
          id: issueId,
          projectId: project.id,
          taskId,
          severity: normalizePriority(rawIssue.severity, 'P1'),
          title: String(rawIssue.title || '未命名问题').trim(),
          detail: String(rawIssue.detail || '').trim(),
          status,
          sourceSessionId: sessionId,
          createdAt: now,
          resolvedAt: status === 'resolved' ? now : null,
        });
      }
    });

    // Mark previously open issues from this same (taskId, sessionId) omitted in the new snapshot as resolved.
    for (const issue of project.issues) {
      if (
        issue.taskId === taskId &&
        issue.sourceSessionId === sessionId &&
        issue.status === 'open' &&
        !incomingIds.has(issue.id)
      ) {
        issue.status = 'resolved';
        issue.resolvedAt = now;
      }
    }
    changedFields.push('issues');
  }

  const summary = typeof input.summary === 'string' && input.summary.trim()
    ? input.summary.trim()
    : `更新「${task.title}」`;

  project.reportEvents.push({
    id: `evt-${shortHash(`${sessionId}::${now}::${project.revision + 1}`, 10)}`,
    sessionId,
    taskId,
    changedFields,
    timestamp: now,
  });
  if (project.reportEvents.length > MAX_REPORT_EVENTS) {
    project.reportEvents.splice(0, project.reportEvents.length - MAX_REPORT_EVENTS);
  }

  prependActivity(project, `${label}：${summary}`);
  project.revision += 1;
  project.updatedAt = now;

  return { project, taskId };
}

/**
 * Edit project goal and acceptance criteria manually and lock them against silent overwrite.
 */
export function updateGoal(current, { goal, acceptanceCriteria }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  if (typeof goal === 'string') {
    project.goal = goal.trim();
    project.manualOverrides.goal = true;
  }
  if (acceptanceCriteria !== undefined) {
    project.acceptanceCriteria = normalizeAcceptanceCriteria(acceptanceCriteria);
    project.manualOverrides.acceptanceCriteria = true;
  }
  prependActivity(project, '你更新了项目目标与验收标准');
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Clear manual overrides on project goal and acceptance criteria and restore session values if present.
 */
export function restoreGoal(current, now = new Date().toISOString()) {
  const project = cloneProject(current);
  project.manualOverrides.goal = false;
  project.manualOverrides.acceptanceCriteria = false;
  if (project.sessionGoal) {
    project.goal = project.sessionGoal;
  }
  if (project.sessionAcceptanceCriteria.length > 0) {
    project.acceptanceCriteria = [...project.sessionAcceptanceCriteria];
  }
  prependActivity(project, '已恢复项目目标与验收标准的会话汇报值');
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Manually adjust task priority, progressEstimate, and/or nextDeliverable.
 */
export function updateTask(current, { taskId, priority, progressEstimate, nextDeliverable }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  if (priority !== undefined && VALID_PRIORITIES.has(priority)) {
    task.priority = priority;
    task.manualOverrides.priority = true;
  }
  if (progressEstimate !== undefined) {
    task.progressEstimate = clampProgress(progressEstimate, task.progressEstimate);
    task.manualOverrides.progressEstimate = true;
  }
  if (nextDeliverable !== undefined) {
    task.nextDeliverable = String(nextDeliverable).trim() || task.nextDeliverable;
    task.manualOverrides.nextDeliverable = true;
  }

  task.updatedAt = now;
  prependActivity(project, `${sessionLabel(task.primarySessionId)}：你手动调整了「${task.title}」`);
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Revert manual overrides for a task back to the latest session-reported snapshot.
 */
export function restoreTask(current, { taskId, fields }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  const targets = Array.isArray(fields) && fields.length > 0
    ? fields
    : ['priority', 'progressEstimate', 'nextDeliverable'];

  for (const field of targets) {
    if (field in task.manualOverrides) {
      task.manualOverrides[field] = false;
      if (task.sessionSnapshot && task.sessionSnapshot[field] !== undefined) {
        task[field] = task.sessionSnapshot[field];
      }
    }
  }

  task.updatedAt = now;
  prependActivity(project, `${sessionLabel(task.primarySessionId)}：已恢复「${task.title}」的会话汇报`);
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Mark a task as work-completed (`workStatus = 'done'`).
 * Per FR-05 and AC-04, completion NEVER automatically verifies the task.
 */
export function completeTask(current, { taskId }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  task.workStatus = 'done';
  task.updatedAt = now;
  prependActivity(project, `${sessionLabel(task.primarySessionId)}：你标记「${task.title}」已完成工作`);
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Explicitly record user acceptance confirmation for a task.
 */
export function verifyTask(current, { taskId }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  const task = project.tasks.find((item) => item.id === taskId);
  if (!task) throw new Error(`Unknown task: ${taskId}`);

  task.userVerified = true;
  task.userVerifiedAt = now;
  task.updatedAt = now;
  prependActivity(project, `${sessionLabel(task.primarySessionId)}：你确认「${task.title}」验收通过`);
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Delete a task and remove its attached verification checks while preserving
 * workspace issues (detaching any matching `issue.taskId` back to `null`).
 */
export function deleteTask(current, { taskId }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  const index = project.tasks.findIndex((item) => item.id === taskId);
  if (index < 0) throw new Error(`Unknown task: ${taskId}`);

  const [removed] = project.tasks.splice(index, 1);
  project.checks = project.checks.filter((check) => check.taskId !== taskId);
  for (const issue of project.issues) {
    if (issue.taskId === taskId) {
      issue.taskId = null;
    }
  }
  prependActivity(project, `${sessionLabel(removed.primarySessionId)}：你删除了任务「${removed.title}」`);
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

/**
 * Toggle issue resolution status (`open` or `resolved`).
 */
export function setIssueStatus(current, { issueId, status }, now = new Date().toISOString()) {
  const project = cloneProject(current);
  const issue = project.issues.find((item) => item.id === issueId);
  if (!issue) throw new Error(`Unknown issue: ${issueId}`);

  const nextStatus = status === 'resolved' ? 'resolved' : 'open';
  issue.status = nextStatus;
  issue.resolvedAt = nextStatus === 'resolved' ? now : null;
  prependActivity(project, `${sessionLabel(issue.sourceSessionId)}：问题「${issue.title}」已标记为${nextStatus === 'resolved' ? '已解决' : '待修'}`);
  project.revision += 1;
  project.updatedAt = now;
  return project;
}

function selectPriorityFocus(project, tasksById) {
  const candidates = [];

  for (const issue of project.issues) {
    if (issue.status !== 'open') continue;
    const rank = issue.severity === 'P0' ? 0 : issue.severity === 'P1' ? 2 : 3;
    candidates.push({
      rank,
      kind: 'issue',
      id: issue.id,
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      taskId: issue.taskId || null,
      taskTitle: issue.taskId ? (tasksById.get(issue.taskId)?.title || '') : '',
      sourceSessionId: issue.sourceSessionId,
      sourceLabel: sessionLabel(issue.sourceSessionId),
      timestamp: issue.createdAt || '',
    });
  }

  for (const check of project.checks) {
    if (check.state !== 'failed') continue;
    const ownerTask = check.taskId ? tasksById.get(check.taskId) : null;
    if (ownerTask?.verified) continue;
    candidates.push({
      rank: 1,
      kind: 'check',
      id: check.id,
      severity: '失败',
      title: check.title,
      detail: check.outputSummary || '检查未通过',
      taskId: check.taskId || null,
      taskTitle: check.taskId ? (tasksById.get(check.taskId)?.title || '') : '',
      sourceSessionId: check.sourceSessionId,
      sourceLabel: sessionLabel(check.sourceSessionId),
      timestamp: check.finishedAt || check.startedAt || '',
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.rank - b.rank || b.timestamp.localeCompare(a.timestamp));
  const top = candidates[0];
  return {
    kind: top.kind,
    id: top.id,
    severity: top.severity,
    title: top.title,
    detail: top.detail,
    taskId: top.taskId,
    taskTitle: top.taskTitle,
    sourceSessionId: top.sourceSessionId,
    sourceLabel: top.sourceLabel,
  };
}

/**
 * Project the persisted domain record into the UI-ready view object consumed by the sidebar.
 * @param {object} project
 */
export function buildProjectView(project) {
  const tasksById = new Map();
  const enrichedTasks = project.tasks.map((task) => {
    const verification = evaluateTaskVerification(project, task);
    const hasManualOverride = Boolean(
      task.manualOverrides?.priority ||
      task.manualOverrides?.progressEstimate ||
      task.manualOverrides?.nextDeliverable
    );
    const enriched = {
      ...task,
      primaryLabel: sessionLabel(task.primarySessionId),
      sessionLabels: (task.sessionIds || []).map((id) => ({ id, label: sessionLabel(id) })),
      verified: verification.verified,
      verifiedBy: verification.verifiedBy,
      hasFailedCheck: verification.hasFailedCheck,
      hasManualOverride,
    };
    tasksById.set(task.id, enriched);
    return enriched;
  });

  enrichedTasks.sort((a, b) => {
    const pDiff = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    if (pDiff !== 0) return pDiff;
    return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
  });

  const enrichedChecks = project.checks.map((check) => ({
    ...check,
    sourceLabel: sessionLabel(check.sourceSessionId),
    taskTitle: tasksById.get(check.taskId)?.title || '',
  }));

  const enrichedIssues = project.issues.map((issue) => ({
    ...issue,
    sourceLabel: sessionLabel(issue.sourceSessionId),
    taskTitle: issue.taskId ? (tasksById.get(issue.taskId)?.title || '') : '',
  }));
  enrichedIssues.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'open' ? -1 : 1;
    const pDiff = (PRIORITY_RANK[a.severity] ?? 9) - (PRIORITY_RANK[b.severity] ?? 9);
    if (pDiff !== 0) return pDiff;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
  });

  const inProgressCount = enrichedTasks.filter((t) => t.workStatus !== 'done').length;
  const awaitingAcceptanceCount = enrichedTasks.filter((t) => t.workStatus === 'done' && !t.verified).length;
  const openIssuesCount = enrichedIssues.filter((i) => i.status === 'open').length;
  const verifiedCount = enrichedTasks.filter((t) => t.verified).length;

  const verifiedTasks = enrichedTasks.filter((t) => t.verified);
  let latestVerified = null;
  if (verifiedTasks.length > 0) {
    const scored = verifiedTasks.map((task) => {
      const passedChecks = enrichedChecks.filter((c) => c.taskId === task.id && c.state === 'passed');
      const latestCheck = passedChecks.at(-1);
      const stamp = task.userVerifiedAt || latestCheck?.finishedAt || task.updatedAt || '';
      return { task, latestCheck, stamp };
    });
    scored.sort((a, b) => String(b.stamp).localeCompare(String(a.stamp)));
    const winner = scored[0];
    latestVerified = {
      taskId: winner.task.id,
      title: winner.task.title,
      sessionId: winner.task.primarySessionId,
      sessionLabel: winner.task.primaryLabel,
      evidence: winner.latestCheck?.outputSummary || (winner.task.verifiedBy === 'user' ? '已由用户确认验收通过' : '已有通过证据'),
    };
  }

  return {
    id: project.id,
    workspacePath: project.workspacePath,
    goal: project.goal,
    acceptanceCriteria: project.acceptanceCriteria,
    manualOverrides: project.manualOverrides,
    hasGoalOverride: Boolean(project.manualOverrides?.goal || project.manualOverrides?.acceptanceCriteria),
    tasks: enrichedTasks,
    checks: enrichedChecks,
    issues: enrichedIssues,
    activity: project.activity,
    summary: {
      inProgressCount,
      awaitingAcceptanceCount,
      openIssuesCount,
      verifiedCount,
      totalTasks: enrichedTasks.length,
    },
    priorityItem: selectPriorityFocus(project, tasksById),
    latestVerified,
    revision: project.revision,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}
