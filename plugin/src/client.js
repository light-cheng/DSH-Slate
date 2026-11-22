const React = require('react');
const h = React.createElement;
const { useCallback, useEffect, useMemo, useRef, useState } = React;

const name = 'dsh-slate';
const inject = [
  'sidebarRightTabs',
  'sidebarRight',
  'slots',
  'layout',
  'uiWorkspace',
  'connection',
];

const TYPE_ID = 'dsh-slate';
const RPC_ENDPOINT = '/api/dsh-slate/rpc';
const SSE_ENDPOINT = '/api/dsh-slate/events';

const EMPTY_VIEW = {
  id: '',
  workspacePath: '',
  goal: '',
  acceptanceCriteria: [],
  manualOverrides: { goal: false, acceptanceCriteria: false },
  hasGoalOverride: false,
  tasks: [],
  checks: [],
  issues: [],
  activity: [],
  summary: {
    inProgressCount: 0,
    awaitingAcceptanceCount: 0,
    openIssuesCount: 0,
    verifiedCount: 0,
    totalTasks: 0,
  },
  priorityItem: null,
  latestVerified: null,
  revision: 0,
  createdAt: null,
  updatedAt: null,
};

let initialWidthApplied = false;

function workspaceDisplayName(workspacePath) {
  const clean = String(workspacePath || '').replace(/\/+$/, '');
  if (!clean) return '当前项目';
  const parts = clean.split('/');
  return parts.at(-1) || clean;
}

function workStatusText(task) {
  if (task.verified) return '已验收';
  if (task.hasFailedCheck) return '验收未通过';
  if (task.workStatus === 'done') return '待验收';
  if (task.workStatus === 'blocked') return '阻塞中';
  if (task.workStatus === 'planned') return '待开始';
  return '进行中';
}

function taskStateClass(task) {
  if (task.verified) return 'is-verified';
  if (task.hasFailedCheck) return 'is-failed';
  if (task.workStatus === 'blocked' || task.workStatus === 'done') return 'is-waiting';
  if (task.workStatus === 'done') return 'is-done';
  return '';
}

function checkGlyph(state) {
  if (state === 'passed') return '✓';
  if (state === 'failed') return '×';
  if (state === 'running') return '◌';
  return '○';
}

function checkStateLabel(check) {
  if (check.state === 'passed') return check.verifiedBy === 'user' ? '已确认' : '已通过';
  if (check.state === 'failed') return '未通过';
  if (check.state === 'running') return '验收中';
  return '未检查';
}

function App(props) {
  const {
    sessionId,
    useTabInfo,
    useSessions,
    useWorkspaces,
    callRpc,
    requestWidth,
    openSession,
    isLiveHttp,
  } = props;

  const { sidebar, panel, tab } = useTabInfo();
  const sessionCwd = useSessions ? useSessions((s) => s?.byId?.[sessionId]?.cwd) : '';
  const boundWorkspacePath = useWorkspaces
    ? useWorkspaces((w) => w?.items?.find((item) => item.sessionIds?.includes(sessionId))?.path)
    : '';
  const workspacePath = boundWorkspacePath || sessionCwd || '';

  const sessionsById = useSessions ? useSessions((s) => s?.byId) : null;
  const workspaceItems = useWorkspaces ? useWorkspaces((w) => w?.items) : null;
  const archivedSessionIds = useWorkspaces ? useWorkspaces((w) => w?.archivedSessionIds) : null;

  const liveSessionSnapshot = useMemo(() => {
    if (
      !sessionsById ||
      typeof sessionsById !== 'object' ||
      Object.keys(sessionsById).length === 0 ||
      !Array.isArray(workspaceItems)
    ) {
      return null;
    }

    const normalizePath = (p) => {
      if (typeof p !== 'string') return '';
      const trimmed = p.replace(/[/\\]+$/, '');
      return trimmed || (p ? '/' : '');
    };
    const targetPath = normalizePath(workspacePath);
    const matched =
      workspaceItems.find((item) => Array.isArray(item?.sessionIds) && item.sessionIds.includes(sessionId)) ||
      (targetPath ? workspaceItems.find((item) => normalizePath(item?.path) === targetPath) : null);

    if (!matched || !Array.isArray(matched.sessionIds)) {
      return null;
    }

    const archivedSet = new Set(
      archivedSessionIds && typeof archivedSessionIds[Symbol.iterator] === 'function'
        ? [...archivedSessionIds]
        : []
    );
    const seen = new Set();
    const items = [];

    for (const id of matched.sessionIds) {
      if (typeof id !== 'string' || !id || id === sessionId || seen.has(id)) continue;
      if (archivedSet.has(id)) continue;
      const summary = sessionsById[id];
      if (!summary || summary.blank === true || summary.origin === 'subagent') continue;
      seen.add(id);
      const label = `#${id.replace(/^session-/, '').slice(0, 8)}`;
      const title =
        String(
          summary.displayTitle ||
            summary.projections?.values?.title ||
            summary.title ||
            ''
        ).trim() || `会话 ${label}`;
      const rawTs = summary.updatedAt ?? summary.lastActiveAt ?? summary.createdAt;
      const ts =
        typeof rawTs === 'number' && Number.isFinite(rawTs)
          ? rawTs
          : (typeof rawTs === 'string' && rawTs ? Date.parse(rawTs) || 0 : 0);
      items.push({ id, label, title, ts });
    }

    items.sort((a, b) => b.ts - a.ts);
    return {
      totalSessions: items.length,
      recentSessions: items.slice(0, 5),
    };
  }, [sessionsById, workspaceItems, archivedSessionIds, sessionId, workspacePath]);

  const [project, setProject] = useState(EMPTY_VIEW);
  const [workspaceContext, setWorkspaceContext] = useState(null);
  const [initStatus, setInitStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [criteriaDraft, setCriteriaDraft] = useState('');

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [taskDraft, setTaskDraft] = useState({ priority: 'P1', progressEstimate: 0, nextDeliverable: '' });

  const [openCheckId, setOpenCheckId] = useState(null);
  const [openIssueId, setOpenIssueId] = useState(null);

  const rootRef = useRef(null);
  const latestRevisionRef = useRef(-1);
  const latestWorkspaceRef = useRef('');
  const contextSeqRef = useRef(0);

  const applyView = useCallback((view) => {
    if (!view) return;
    latestRevisionRef.current = view.revision ?? 0;
    latestWorkspaceRef.current = view.workspacePath || '';
    setProject(view);
    if (view.goal || (view.tasks && view.tasks.length > 0)) {
      setInitStatus('');
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const view = await callRpc('getState', { sessionId, workspacePath });
      if (view) applyView(view);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, [callRpc, sessionId, workspacePath, applyView]);

  const loadWorkspaceContext = useCallback(async () => {
    const seq = ++contextSeqRef.current;
    if (!workspacePath && !sessionId) {
      setWorkspaceContext(null);
      return;
    }
    try {
      const ctxInfo = await callRpc('getWorkspaceContext', { sessionId, workspacePath });
      if (seq === contextSeqRef.current) {
        setWorkspaceContext(ctxInfo || null);
      }
    } catch {
      // Zero-token workspace context is advisory only; keep empty state interactive on failure.
    }
  }, [callRpc, sessionId, workspacePath]);

  useEffect(() => {
    latestRevisionRef.current = -1;
    setError('');
    setInitStatus('');
    setWorkspaceContext(null);
    refresh();
    loadWorkspaceContext();
  }, [refresh, loadWorkspaceContext]);

  useEffect(() => {
    let source = null;
    if (isLiveHttp && workspacePath && typeof EventSource !== 'undefined') {
      const qs = new URLSearchParams({ sessionId: sessionId || '', workspacePath });
      source = new EventSource(`${SSE_ENDPOINT}?${qs.toString()}`);
      source.addEventListener('state', (event) => {
        try {
          const next = JSON.parse(event.data);
          applyView(next);
          setError('');
        } catch {
          // Ignore malformed SSE chunk; fallback poll keeps state fresh.
        }
      });
      source.addEventListener('error', () => {
        // Silent reconnect handled by EventSource + fallback interval below.
      });
    }

    const timer = setInterval(async () => {
      try {
        const next = await callRpc('getState', { sessionId, workspacePath });
        if (!next) return;
        if (
          next.revision !== latestRevisionRef.current ||
          next.workspacePath !== latestWorkspaceRef.current
        ) {
          applyView(next);
        }
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }, 1500);

    return () => {
      source?.close();
      clearInterval(timer);
    };
  }, [isLiveHttp, sessionId, workspacePath, callRpc, applyView]);

  useEffect(() => {
    if (
      !tab.visible ||
      !sidebar.expanded ||
      sidebar.fullscreen ||
      panel.isFloating ||
      panel.isSoleDockedPane === false
    ) {
      return;
    }
    return requestWidth(420);
  }, [
    tab.visible,
    sidebar.expanded,
    sidebar.fullscreen,
    panel.isFloating,
    panel.isSoleDockedPane,
    requestWidth,
  ]);

  const runMutation = useCallback(async (endpoint, payload, onSuccess) => {
    setBusy(true);
    try {
      const next = await callRpc(endpoint, { sessionId, workspacePath, ...payload });
      if (next) applyView(next);
      setError('');
      onSuccess?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, [callRpc, sessionId, workspacePath, applyView]);

  const openGoalEditor = () => {
    setGoalDraft(project.goal || '');
    setCriteriaDraft((project.acceptanceCriteria || []).join('\n'));
    setGoalEditing(true);
  };

  const saveGoal = () =>
    runMutation(
      'updateGoal',
      { goal: goalDraft, acceptanceCriteria: criteriaDraft },
      () => setGoalEditing(false)
    );

  const restoreGoal = () => runMutation('restoreGoal', {});

  const runQuickInit = useCallback(async () => {
    setBusy(true);
    try {
      const res = await callRpc('quickInit', { sessionId, workspacePath });
      setError('');
      setInitStatus('已发起快速初始化，正在读取项目概览…');
      if (res?.sessionId) {
        openSession(res.sessionId);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }, [callRpc, sessionId, workspacePath, openSession]);

  const startTaskEdit = (task) => {
    setEditingTaskId(task.id);
    setTaskDraft({
      priority: task.priority,
      progressEstimate: task.progressEstimate,
      nextDeliverable: task.nextDeliverable || '',
    });
  };

  const saveTask = () =>
    runMutation(
      'updateTask',
      {
        taskId: editingTaskId,
        priority: taskDraft.priority,
        progressEstimate: taskDraft.progressEstimate,
        nextDeliverable: taskDraft.nextDeliverable,
      },
      () => setEditingTaskId(null)
    );

  const focusPriorityTarget = (item) => {
    if (!item) return;
    if (item.kind === 'issue') {
      setOpenIssueId(item.id);
      setTimeout(() => {
        rootRef.current?.querySelector(`[data-issue-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ block: 'center' });
      }, 0);
      return;
    }
    if (item.kind === 'check') {
      setOpenCheckId(item.id);
      setTimeout(() => {
        rootRef.current?.querySelector(`[data-check-id="${CSS.escape(item.id)}"]`)?.scrollIntoView({ block: 'center' });
      }, 0);
    }
  };

  const tasks = project.tasks || [];
  const checks = project.checks || [];
  const issues = project.issues || [];
  const summary = project.summary || EMPTY_VIEW.summary;

  const updatedText = useMemo(() => {
    if (!project.updatedAt) return '等待会话汇报';
    const time = new Date(project.updatedAt).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `更新于 ${time}`;
  }, [project.updatedAt]);

  const goalEditor = h('div', {
    className: 'sl-editor sl-goal-editor',
    onKeyDown: (e) => {
      if (e.key === 'Escape') setGoalEditing(false);
    },
  },
    h('div', { className: 'sl-editor-head' }, h('span', null, '编辑项目目标')),
    h('label', { className: 'sl-field' },
      '项目目标',
      h('textarea', {
        rows: 3,
        value: goalDraft,
        placeholder: '一句话说明项目要达成的业务目标',
        onChange: (e) => setGoalDraft(e.target.value),
      })
    ),
    h('label', { className: 'sl-field' },
      '验收标准（每行一条）',
      h('textarea', {
        rows: 3,
        value: criteriaDraft,
        placeholder: '例如：顾客能下单并正确扣减库存',
        onChange: (e) => setCriteriaDraft(e.target.value),
      })
    ),
    h('div', { className: 'sl-editor-note' }, '手动修改后，后续会话汇报不会覆盖目标和验收标准'),
    h('div', { className: 'sl-editor-actions' },
      h('button', { type: 'button', className: 'sl-btn', disabled: busy, onClick: () => setGoalEditing(false) }, '取消'),
      h('button', { type: 'button', className: 'sl-btn-primary', disabled: busy, onClick: saveGoal }, '保存目标')
    )
  );

  const renderTask = (task) => {
    const isEditing = editingTaskId === task.id;
    const statusLabel = workStatusText(task);
    const statusClass = task.verified
      ? 'sl-status-verified'
      : task.hasFailedCheck
        ? 'sl-status-danger'
        : (task.workStatus === 'blocked' || task.workStatus === 'done')
          ? 'sl-status-warn'
          : '';

    return h('article', {
      key: task.id,
      className: `sl-task ${taskStateClass(task)}`,
      'data-task-id': task.id,
    },
      h('div', { className: 'sl-task-head' },
        h('div', { className: 'sl-task-head-main' },
          h('button', {
            type: 'button',
            className: 'sl-task-title',
            title: `打开会话 ${task.primaryLabel}`,
            onClick: () => openSession(task.primarySessionId),
          }, task.title),
          h('div', { className: 'sl-task-meta', title: (task.sessionIds || []).join(', ') },
            h('span', null, task.priority),
            h('span', null, '·'),
            h('span', null, (task.sessionLabels || []).map((s) => s.label).join(' ') || task.primaryLabel),
            h('span', null, '·'),
            h('span', { className: statusClass }, statusLabel),
            task.hasManualOverride ? h('span', { className: 'sl-override-chip' }, '· 手动调整') : null
          )
        ),
        h('strong', { className: 'sl-task-pct' }, `${task.progressEstimate}%`)
      ),
      h('div', { className: 'sl-deliverable' },
        h('span', { className: 'sl-deliverable-label' }, '下一交付'),
        task.nextDeliverable || '待定'
      ),
      h('div', { className: 'sl-track', 'aria-hidden': 'true' },
        h('span', { className: 'sl-track-fill', style: { width: `${task.progressEstimate}%` } })
      ),
      h('div', { className: 'sl-task-actions' },
        h('button', {
          type: 'button',
          className: 'sl-text-btn',
          disabled: busy,
          onClick: () => startTaskEdit(task),
        }, '编辑任务'),
        task.hasManualOverride ? h('button', {
          type: 'button',
          className: 'sl-text-btn',
          disabled: busy,
          onClick: () => runMutation('restoreTask', { taskId: task.id }),
        }, '恢复会话汇报') : null,
        task.workStatus !== 'done' ? h('button', {
          type: 'button',
          className: 'sl-text-btn',
          disabled: busy,
          onClick: () => runMutation('completeTask', { taskId: task.id }),
        }, '标记完成') : null,
        !task.verified ? h('button', {
          type: 'button',
          className: 'sl-text-btn',
          disabled: busy,
          onClick: () => runMutation('verifyTask', { taskId: task.id }),
        }, '验收通过') : null
      ),
      isEditing ? h('div', {
        className: 'sl-editor',
        onKeyDown: (e) => {
          if (e.key === 'Escape') setEditingTaskId(null);
        },
      },
        h('div', { className: 'sl-editor-head' },
          h('span', null, '调整任务'),
          h('strong', null, `${taskDraft.progressEstimate}%`)
        ),
        h('label', { className: 'sl-field' },
          '单项预估进度',
          h('input', {
            type: 'range',
            min: 0,
            max: 100,
            'aria-label': '单项预估进度',
            value: taskDraft.progressEstimate,
            onChange: (e) => setTaskDraft({ ...taskDraft, progressEstimate: Number(e.target.value) }),
          })
        ),
        h('div', { className: 'sl-field-grid' },
          h('label', { className: 'sl-field' },
            '优先级',
            h('select', {
              'aria-label': '优先级',
              value: taskDraft.priority,
              onChange: (e) => setTaskDraft({ ...taskDraft, priority: e.target.value }),
            },
              h('option', { value: 'P0' }, 'P0'),
              h('option', { value: 'P1' }, 'P1'),
              h('option', { value: 'P2' }, 'P2')
            )
          ),
          h('label', { className: 'sl-field' },
            '下一交付物',
            h('input', {
              type: 'text',
              'aria-label': '下一交付物',
              value: taskDraft.nextDeliverable,
              onChange: (e) => setTaskDraft({ ...taskDraft, nextDeliverable: e.target.value }),
            })
          )
        ),
        h('div', { className: 'sl-editor-note' }, '手动调整后，后续会话汇报不会覆盖以上字段；可随时恢复会话汇报'),
        h('div', { className: 'sl-editor-actions' },
          h('button', { type: 'button', className: 'sl-btn', disabled: busy, onClick: () => setEditingTaskId(null) }, '取消'),
          h('button', { type: 'button', className: 'sl-btn-primary', disabled: busy, onClick: saveTask }, '保存调整')
        )
      ) : null
    );
  };

  return h('div', { className: 'sl-root', ref: rootRef, 'data-slate-workspace': project.workspacePath || workspacePath },
    h('header', { className: 'sl-mast' },
      h('h2', { className: 'sl-mast-title' }, '项目进度'),
      h('span', { className: 'sl-workspace-tag', title: project.workspacePath || workspacePath },
        workspaceDisplayName(project.workspacePath || workspacePath)
      ),
      h('button', {
        type: 'button',
        className: 'sl-text-btn sl-refresh',
        disabled: busy,
        onClick: () => {
          refresh();
          loadWorkspaceContext();
        },
      }, '刷新')
    ),
    h('div', { className: `sl-notice ${error ? 'is-error' : ''}`, role: error ? 'alert' : undefined }, error || updatedText),

    goalEditing
      ? goalEditor
      : h('section', { className: 'sl-goal' },
          h('div', { className: 'sl-kicker' },
            h('span', null, '项目目标'),
            project.hasGoalOverride ? h('span', { className: 'sl-override-chip' }, '· 手动调整') : null,
            h('div', { className: 'sl-kicker-actions' },
              project.hasGoalOverride ? h('button', {
                type: 'button',
                className: 'sl-text-btn',
                disabled: busy,
                onClick: restoreGoal,
              }, '恢复会话汇报') : null,
              h('button', {
                type: 'button',
                className: 'sl-text-btn',
                disabled: busy,
                onClick: openGoalEditor,
              }, '编辑')
            )
          ),
          h('h1', { className: `sl-goal-title ${project.goal ? '' : 'sl-goal-empty'}` },
            project.goal || '还没有设置项目目标'
          ),
          (project.acceptanceCriteria || []).length > 0
            ? h('ul', { className: 'sl-criteria-list' },
                project.acceptanceCriteria.map((criterion, idx) => h('li', { key: `${idx}-${criterion}` }, criterion))
              )
            : (!project.goal && tasks.length === 0 && checks.length === 0 && issues.length === 0)
              ? (() => {
                  const historicalTotal = liveSessionSnapshot
                    ? liveSessionSnapshot.totalSessions
                    : (workspaceContext?.totalSessions || 0);
                  const historicalSessions = liveSessionSnapshot
                    ? liveSessionSnapshot.recentSessions
                    : (workspaceContext?.recentSessions || []);
                  return h('div', { className: 'sl-bootstrap' },
                    h('p', { className: 'sl-bootstrap-desc' }, '尚未记录项目进度。日常开发与测试会话会自动汇报，也可立即初始化当前工作区：'),
                    (workspaceContext?.git || historicalSessions.length > 0)
                      ? h('div', { className: 'sl-bootstrap-meta' },
                          workspaceContext?.git
                            ? h('div', null, [
                                `分支 ${workspaceContext.git.branch}`,
                                workspaceContext.git.latestTag ? `标签 ${workspaceContext.git.latestTag}` : '',
                                workspaceContext.git.dirtyCount > 0 ? `${workspaceContext.git.dirtyCount} 处未提交改动` : '',
                              ].filter(Boolean).join(' · '))
                            : null,
                          workspaceContext?.git?.recentCommits?.[0]
                            ? h('div', null, `最近提交：${workspaceContext.git.recentCommits[0].sha} ${workspaceContext.git.recentCommits[0].subject}`)
                            : null,
                          historicalSessions.length > 0
                            ? h('div', { className: 'sl-bootstrap-sessions' },
                                h('span', null, `已有 ${historicalTotal} 个历史会话：`),
                                historicalSessions.slice(0, 3).map((item) =>
                                  h('button', {
                                    key: item.id,
                                    type: 'button',
                                    className: 'sl-session-chip',
                                    title: `${item.title} (${item.label})`,
                                    onClick: () => openSession(item.id),
                                  }, item.title)
                                )
                              )
                            : null
                        )
                      : null,
                    h('div', { className: 'sl-bootstrap-actions' },
                      workspaceContext?.canQuickInit
                        ? h('button', {
                            type: 'button',
                            className: 'sl-btn-primary',
                            disabled: busy,
                            onClick: runQuickInit,
                          }, '快速初始化')
                        : null,
                      h('button', {
                        type: 'button',
                        className: 'sl-btn',
                        disabled: busy,
                        onClick: openGoalEditor,
                      }, '手动填写目标')
                    ),
                    initStatus ? h('div', { className: 'sl-editor-note' }, initStatus) : null
                  );
                })()
              : h('div', { className: 'sl-editor-note' }, '暂无验收标准，可点击「编辑」补充')
        ),

    h('section', { className: 'sl-summary', 'aria-label': '任务概况' },
      h('div', { className: 'sl-summary-item', 'data-summary-key': 'inProgress' },
        h('strong', null, summary.inProgressCount),
        h('span', null, '进行中')
      ),
      h('div', { className: 'sl-summary-item', 'data-summary-key': 'awaitingAcceptance' },
        h('strong', null, summary.awaitingAcceptanceCount),
        h('span', null, '待验收')
      ),
      h('div', { className: 'sl-summary-item', 'data-summary-key': 'openIssues' },
        h('strong', null, summary.openIssuesCount),
        h('span', null, '待修问题')
      )
    ),

    project.priorityItem ? h('section', { className: 'sl-focus' },
      h('div', { className: 'sl-focus-head' },
        h('span', null, '优先处理'),
        h('span', { className: 'sl-focus-severity' }, project.priorityItem.severity)
      ),
      h('p', { className: 'sl-focus-title' }, project.priorityItem.title),
      h('button', {
        type: 'button',
        className: 'sl-focus-link',
        onClick: () => focusPriorityTarget(project.priorityItem),
      }, project.priorityItem.kind === 'check' ? '查看检查  →' : '查看问题  →')
    ) : null,

    project.latestVerified ? h('section', { className: 'sl-latest' },
      h('span', { className: 'sl-latest-label' }, '最近通过'),
      h('button', {
        type: 'button',
        className: 'sl-latest-link',
        onClick: () => openSession(project.latestVerified.sessionId),
      }, project.latestVerified.title),
      h('span', { className: 'sl-latest-evidence' }, project.latestVerified.evidence)
    ) : null,

    h('section', { className: 'sl-tasks' },
      h('div', { className: 'sl-section-head' },
        h('h3', null, '任务'),
        h('span', { className: 'sl-section-count' }, `${tasks.length} 项`)
      ),
      tasks.length > 0
        ? h('div', { className: 'sl-timeline' }, tasks.map(renderTask))
        : h('div', { className: 'sl-empty' }, '还没有会话汇报任务')
    ),

    h('section', { className: 'sl-section-rule' },
      h('div', { className: 'sl-section-head' },
        h('h3', null, '验收记录'),
        h('span', { className: 'sl-section-count' }, `${checks.length} 项`)
      ),
      checks.length > 0
        ? checks.map((check) => {
            const expanded = openCheckId === check.id;
            return h('div', {
              key: check.id,
              className: `sl-list-row sl-check is-${check.state}`,
              'data-check-id': check.id,
            },
              h('button', {
                type: 'button',
                className: 'sl-row-trigger',
                'aria-expanded': expanded,
                onClick: () => setOpenCheckId(expanded ? null : check.id),
              },
                h('span', { className: 'sl-check-glyph', 'aria-hidden': 'true' }, checkGlyph(check.state)),
                h('span', { className: 'sl-row-title' }, check.title),
                h('span', { className: 'sl-row-label' }, checkStateLabel(check))
              ),
              expanded ? h('div', { className: 'sl-detail-panel' },
                h('div', null, check.outputSummary || '无详细输出'),
                check.command ? h('div', { className: 'sl-code-line' }, check.command) : null,
                h('div', { className: 'sl-detail-meta' },
                  check.exitCode !== undefined && check.exitCode !== null
                    ? h('span', null, `退出码：${check.exitCode}`)
                    : null,
                  check.outputRef ? h('span', null, `输出引用：${check.outputRef}`) : null,
                  h('button', {
                    type: 'button',
                    className: 'sl-text-btn',
                    onClick: () => openSession(check.sourceSessionId),
                  }, `打开来源会话 ${check.sourceLabel}`)
                )
              ) : null
            );
          })
        : h('div', { className: 'sl-empty' }, '还没有验收记录')
    ),

    h('section', { className: 'sl-section-rule' },
      h('div', { className: 'sl-section-head' },
        h('h3', null, '待修问题'),
        h('span', { className: 'sl-section-count' }, `${summary.openIssuesCount} 个未解决`)
      ),
      issues.length > 0
        ? issues.map((issue) => {
            const expanded = openIssueId === issue.id;
            const isHigh = issue.severity === 'P0' || issue.severity === 'P1';
            return h('div', {
              key: issue.id,
              className: `sl-list-row sl-issue ${issue.status === 'resolved' ? 'is-resolved' : ''}`,
              'data-issue-id': issue.id,
            },
              h('button', {
                type: 'button',
                className: 'sl-row-trigger',
                'aria-expanded': expanded,
                onClick: () => setOpenIssueId(expanded ? null : issue.id),
              },
                h('span', { className: `sl-issue-sev ${isHigh && issue.status === 'open' ? 'is-high' : 'is-low'}` }, issue.severity),
                h('span', { className: 'sl-row-title' }, issue.title),
                h('span', { className: 'sl-row-label' }, issue.status === 'resolved' ? '已解决' : '详情')
              ),
              expanded ? h('div', { className: 'sl-detail-panel' },
                h('div', null, issue.detail || '无补充说明'),
                h('div', { className: 'sl-detail-meta' },
                  issue.taskTitle ? h('span', null, `任务：${issue.taskTitle}`) : null,
                  h('button', {
                    type: 'button',
                    className: 'sl-text-btn',
                    onClick: () => openSession(issue.sourceSessionId),
                  }, `打开来源会话 ${issue.sourceLabel}`),
                  h('button', {
                    type: 'button',
                    className: 'sl-text-btn',
                    disabled: busy,
                    onClick: () => runMutation('setIssueStatus', {
                      issueId: issue.id,
                      status: issue.status === 'resolved' ? 'open' : 'resolved',
                    }),
                  }, issue.status === 'resolved' ? '重新打开' : '标记已解决')
                )
              ) : null
            );
          })
        : h('div', { className: 'sl-empty' }, '目前没有待修问题')
    ),

    (project.activity || []).length > 0
      ? h('section', { className: 'sl-activity' },
          h('h3', null, '最近动态'),
          project.activity.map((item, idx) => h('div', { key: `${idx}-${item}`, className: 'sl-activity-item' }, item))
        )
      : null
  );
}

function TabTitle({ useTabInfo }) {
  const { tab } = useTabInfo();
  const icons = [
    ['light', typeof ICON_LIGHT_DATA_URL === 'string' ? ICON_LIGHT_DATA_URL : ''],
    ['dark', typeof ICON_DARK_DATA_URL === 'string' ? ICON_DARK_DATA_URL : ''],
  ];
  return h(
    'span',
    { className: 'sl-tab-title' },
    icons.map(([variant, src]) =>
      src
        ? h('img', {
            key: variant,
            className: `sl-tab-icon sl-tab-icon-${variant}`,
            src,
            alt: '',
            'aria-hidden': 'true',
            width: 16,
            height: 16,
          })
        : null
    ),
    h('span', null, tab?.title || '项目进度')
  );
}

function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.dshSlateStyles = 'true';
    style.textContent = typeof STYLE_CSS === 'string' ? STYLE_CSS : '';
    document.head.appendChild(style);
    return () => style.remove();
  }, 'dsh-slate: monochrome sidebar styles');

  let pendingNav = null;
  let retryTimer = null;

  const stopRetryTimer = () => {
    if (retryTimer !== null) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
  };

  const reconcileNavigation = () => {
    if (!pendingNav) return;
    if (Date.now() > pendingNav.deadline) {
      pendingNav = null;
      stopRetryTimer();
      return;
    }
    const targetId = pendingNav.sessionId;
    const mountedId = ctx.sidebarRight?.mounted?.getSnapshot?.();
    if (mountedId !== targetId) return;

    const tabs = ctx.sidebarRight?.tabsIn?.(targetId) || [];
    const hasSlateTab = tabs.some((t) => t.kind === TYPE_ID);
    if (!pendingNav.calledOnMounted) {
      pendingNav.calledOnMounted = true;
      ctx.sidebarRight?.openTabIn?.(targetId, TYPE_ID);
      return;
    }
    if (!hasSlateTab) {
      ctx.sidebarRight?.openTabIn?.(targetId, TYPE_ID);
      return;
    }
    if (!pendingNav.confirmedWithTabs) {
      pendingNav.confirmedWithTabs = true;
      ctx.sidebarRight?.openTabIn?.(targetId, TYPE_ID);
      return;
    }
    pendingNav = null;
    stopRetryTimer();
  };

  ctx.effect(() => {
    const unsubMounted = ctx.sidebarRight?.mounted?.subscribe?.(reconcileNavigation);
    const unsubTabs = ctx.sidebarRight?.openTabs?.subscribe?.(reconcileNavigation);
    return () => {
      pendingNav = null;
      stopRetryTimer();
      unsubMounted?.();
      unsubTabs?.();
    };
  }, 'dsh-slate: cross-session sidebar persistence');

  const isLiveHttp = typeof location !== 'undefined' && /^https?:/.test(location.protocol);

  const callRpc = async (endpoint, payload) => {
    const response = await fetch(RPC_ENDPOINT, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint, payload }),
    });
    if (!response.ok) {
      throw new Error(`请求失败 (${endpoint}): HTTP ${response.status}`);
    }
    const res = await response.json();
    if (!res || !res.ok) {
      throw new Error(res?.error?.message || `请求失败 (${endpoint})`);
    }
    return res.value;
  };

  const openSession = (targetSessionId) => {
    if (!targetSessionId) return;
    pendingNav = {
      sessionId: targetSessionId,
      deadline: Date.now() + 8000,
      calledOnMounted: false,
      confirmedWithTabs: false,
    };
    ctx.uiWorkspace.openSession(targetSessionId);
    reconcileNavigation();
    stopRetryTimer();
    retryTimer = setInterval(reconcileNavigation, 60);
  };

  const requestWidth = (width) => {
    if (typeof ctx.layout?.requestRightbarWidth === 'function') {
      const handle = ctx.layout.requestRightbarWidth(width);
      return () => handle?.dispose?.();
    }
    if (!initialWidthApplied) {
      initialWidthApplied = true;
      ctx.layout?.panels?.setRightbar?.(width);
    }
  };

  ctx.effect(
    () =>
      ctx.sidebarRightTabs.register({
        id: TYPE_ID,
        kind: TYPE_ID,
        title: () => '项目进度',
        keepMounted: true,
        guide: [
          {
            id: 'overview',
            order: 10,
            title: () => '项目进度',
            description: () => '项目目标、任务进展、测试验收与待修问题',
          },
        ],
      }),
    'dsh-slate: sidebarRightTab registration'
  );

  ctx.effect(
    () =>
      ctx.slots.inject('sidebar.right.pane.tab', () =>
        ctx.slots.register(
          {
            name: 'sidebar.right.pane.tab',
            key: TYPE_ID,
            inject: () => ({
              callRpc,
              openSession,
              requestWidth,
              isLiveHttp,
            }),
          },
          App
        )
      ),
    'dsh-slate: sidebar right pane tab body'
  );

  ctx.effect(
    () =>
      ctx.slots.inject('sidebar.right.pane.tab.title', () =>
        ctx.slots.register(
          {
            name: 'sidebar.right.pane.tab.title',
            key: TYPE_ID,
          },
          TabTitle
        )
      ),
    'dsh-slate: sidebar right pane tab title'
  );
}

module.exports = { name, inject, apply };
