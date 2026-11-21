window.__ModuleLoader__.load({
  id: "dsh-slate",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const STYLE_CSS = ".sl-root {\n  --slate-bg: var(--dsw-alias-bg-base, #ffffff);\n  --slate-surface: var(--dsw-alias-bg-layer-1, #f6f6f6);\n  --slate-surface-hover: var(--dsw-alias-bg-layer-2, #ededed);\n  --slate-ink: var(--dsw-alias-label-primary, #1f2328);\n  --slate-muted: var(--dsw-alias-label-secondary, #656d76);\n  --slate-dimmed: var(--dsw-alias-label-dimmed, #8b9199);\n  --slate-border: var(--dsw-alias-border-l1, #e5e5e5);\n  --slate-danger: var(--dsw-alias-state-error-primary, #b4534d);\n  --slate-warn: var(--dsw-alias-state-warn-primary, #a76d22);\n\n  box-sizing: border-box;\n  height: 100%;\n  overflow-y: auto;\n  overflow-x: hidden;\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  padding: 16px 20px 28px;\n  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"PingFang SC\", sans-serif);\n  font-size: max(14px, var(--dsh-content-font-size, 14px));\n  line-height: 1.5;\n  font-variant-numeric: tabular-nums;\n  color-scheme: inherit;\n}\n\n.sl-root *,\n.sl-root *::before,\n.sl-root *::after {\n  box-sizing: border-box;\n}\n\n.sl-root :where(button, input, textarea, select) {\n  font: inherit;\n  color: var(--slate-ink);\n}\n\n.sl-root button {\n  cursor: pointer;\n}\n\n.sl-root button:disabled {\n  cursor: not-allowed;\n  opacity: 0.55;\n}\n\n.sl-root button:focus-visible,\n.sl-root input:focus-visible,\n.sl-root textarea:focus-visible,\n.sl-root select:focus-visible {\n  outline: 2px solid var(--slate-ink);\n  outline-offset: 2px;\n}\n\n.sl-mast {\n  display: flex;\n  align-items: baseline;\n  gap: 10px;\n  padding-bottom: 10px;\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-mast-title {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 600;\n  line-height: 1.35;\n}\n\n.sl-workspace-tag {\n  font-size: 12px;\n  color: var(--slate-muted);\n  max-width: 190px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.sl-text-btn {\n  border: 0;\n  background: none;\n  padding: 2px 0;\n  font-size: 12px;\n  color: var(--slate-muted);\n  text-decoration: none;\n}\n\n.sl-text-btn:hover {\n  color: var(--slate-ink);\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n\n.sl-mast .sl-refresh {\n  margin-left: auto;\n}\n\n.sl-notice {\n  margin-top: 8px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-notice.is-error {\n  color: var(--slate-danger);\n  background: var(--slate-surface);\n  border-left: 2px solid var(--slate-danger);\n  padding: 6px 10px;\n}\n\n.sl-goal {\n  padding: 16px 0;\n}\n\n.sl-kicker {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-kicker-actions {\n  margin-left: auto;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.sl-goal-title {\n  margin: 8px 0 8px;\n  font-size: 20px;\n  font-weight: 600;\n  line-height: 1.45;\n  text-wrap: pretty;\n}\n\n.sl-goal-empty {\n  color: var(--slate-muted);\n  font-weight: 500;\n}\n\n.sl-criteria-list {\n  margin: 0;\n  padding-left: 18px;\n  font-size: 14px;\n  line-height: 1.6;\n  color: var(--slate-muted);\n}\n\n.sl-criteria-list li + li {\n  margin-top: 3px;\n}\n\n.sl-override-chip {\n  display: inline-block;\n  font-size: 12px;\n  color: var(--slate-warn);\n}\n\n.sl-summary {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 8px;\n  padding: 13px 0 14px;\n  border-top: 1px solid var(--slate-border);\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-summary-item {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.sl-summary-item strong {\n  font-size: 18px;\n  font-weight: 600;\n  line-height: 1.25;\n}\n\n.sl-summary-item span {\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-focus {\n  padding: 14px 0;\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-focus-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-focus-severity {\n  color: var(--slate-danger);\n  font-weight: 600;\n}\n\n.sl-focus-title {\n  margin: 6px 0 8px;\n  font-size: 14px;\n  line-height: 1.55;\n}\n\n.sl-focus-link {\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 13px;\n  color: var(--slate-ink);\n  font-weight: 500;\n}\n\n.sl-focus-link:hover {\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n\n.sl-latest {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 13px 0;\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-latest-label {\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-latest-link {\n  border: 0;\n  background: none;\n  padding: 0;\n  text-align: left;\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--slate-ink);\n}\n\n.sl-latest-link:hover {\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n\n.sl-latest-evidence {\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--slate-muted);\n}\n\n.sl-section-head {\n  display: flex;\n  align-items: baseline;\n  margin: 20px 0 12px;\n}\n\n.sl-section-head h3 {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n}\n\n.sl-section-count {\n  margin-left: auto;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-timeline {\n  border-left: 1px solid var(--slate-border);\n  margin-left: 5px;\n}\n\n.sl-task {\n  position: relative;\n  padding: 0 0 20px 20px;\n}\n\n.sl-task:last-child {\n  padding-bottom: 8px;\n}\n\n.sl-task::before {\n  content: \"\";\n  position: absolute;\n  left: -4px;\n  top: 7px;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--slate-dimmed);\n}\n\n.sl-task.is-done::before {\n  background: var(--slate-muted);\n}\n\n.sl-task.is-waiting::before {\n  background: var(--slate-bg);\n  border: 2px solid var(--slate-warn);\n  left: -5px;\n  top: 6px;\n}\n\n.sl-task.is-failed::before {\n  background: var(--slate-danger);\n}\n\n.sl-task.is-verified::before {\n  content: \"✓\";\n  display: grid;\n  place-items: center;\n  width: 13px;\n  height: 13px;\n  left: -7px;\n  top: 4px;\n  background: var(--slate-ink);\n  color: var(--slate-bg);\n  font-size: 9px;\n  font-weight: 700;\n  line-height: 1;\n}\n\n.sl-task-head {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n}\n\n.sl-task-head-main {\n  min-width: 0;\n  flex: 1;\n}\n\n.sl-task-title {\n  display: block;\n  width: 100%;\n  border: 0;\n  background: none;\n  padding: 0;\n  text-align: left;\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 1.4;\n  color: var(--slate-ink);\n}\n\n.sl-task-title:hover {\n  text-decoration: underline;\n  text-decoration-thickness: 1px;\n  text-underline-offset: 4px;\n}\n\n.sl-task-meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  margin-top: 4px;\n  font-size: 12px;\n  line-height: 1.45;\n  color: var(--slate-muted);\n}\n\n.sl-status-warn {\n  color: var(--slate-warn);\n}\n\n.sl-status-danger {\n  color: var(--slate-danger);\n}\n\n.sl-status-verified {\n  color: var(--slate-ink);\n  font-weight: 500;\n}\n\n.sl-task-pct {\n  font-size: 16px;\n  font-weight: 500;\n  white-space: nowrap;\n  color: var(--slate-ink);\n}\n\n.sl-deliverable {\n  margin-top: 7px;\n  font-size: 14px;\n  line-height: 1.55;\n}\n\n.sl-deliverable-label {\n  font-size: 12px;\n  color: var(--slate-muted);\n  margin-right: 6px;\n}\n\n.sl-track {\n  height: 2px;\n  background: var(--slate-border);\n  margin-top: 10px;\n  overflow: hidden;\n}\n\n.sl-track-fill {\n  display: block;\n  height: 100%;\n  background: var(--slate-muted);\n  transition: width 0.2s ease;\n}\n\n.sl-task.is-verified .sl-track-fill {\n  background: var(--slate-ink);\n}\n\n.sl-task-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n  margin-top: 9px;\n}\n\n.sl-editor {\n  margin: 12px 0 4px;\n  padding: 12px;\n  background: var(--slate-surface);\n  border: 1px solid var(--slate-border);\n}\n\n.sl-goal-editor {\n  margin: 12px 0;\n}\n\n.sl-editor-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  font-size: 13px;\n  font-weight: 500;\n  color: var(--slate-ink);\n  margin-bottom: 10px;\n}\n\n.sl-field {\n  display: block;\n  margin-bottom: 10px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-field input[type=\"text\"],\n.sl-field textarea,\n.sl-field select {\n  display: block;\n  width: 100%;\n  margin-top: 5px;\n  padding: 7px 9px;\n  border: 1px solid var(--slate-border);\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  font-size: 14px;\n  line-height: 1.45;\n  border-radius: 0;\n}\n\n.sl-field textarea {\n  resize: vertical;\n}\n\n.sl-editor input[type=\"range\"] {\n  display: block;\n  width: 100%;\n  margin: 8px 0 12px;\n  accent-color: var(--slate-ink);\n}\n\n.sl-field-grid {\n  display: grid;\n  grid-template-columns: 74px 1fr;\n  gap: 8px;\n}\n\n.sl-editor-note {\n  font-size: 12px;\n  color: var(--slate-muted);\n  margin-top: 4px;\n}\n\n.sl-editor-actions {\n  display: flex;\n  justify-content: flex-end;\n  gap: 8px;\n  margin-top: 12px;\n}\n\n.sl-btn {\n  border: 1px solid var(--slate-border);\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  padding: 5px 11px;\n  font-size: 13px;\n}\n\n.sl-btn:hover {\n  background: var(--slate-surface-hover);\n}\n\n.sl-root .sl-btn-primary {\n  border-color: var(--slate-ink);\n  background: var(--slate-ink);\n  color: var(--slate-bg);\n  padding: 5px 12px;\n  font-size: 13px;\n}\n\n.sl-btn-primary:hover {\n  opacity: 0.88;\n}\n\n.sl-section-rule {\n  border-top: 1px solid var(--slate-border);\n  margin-top: 16px;\n}\n\n.sl-list-row {\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-row-trigger {\n  display: grid;\n  grid-template-columns: auto 1fr auto;\n  align-items: baseline;\n  gap: 8px;\n  width: 100%;\n  padding: 10px 0;\n  border: 0;\n  background: none;\n  text-align: left;\n  font-size: 14px;\n  line-height: 1.45;\n}\n\n.sl-row-trigger:hover {\n  background: var(--slate-surface);\n}\n\n.sl-check-glyph {\n  font-weight: 600;\n  width: 16px;\n  text-align: center;\n}\n\n.sl-check.is-passed .sl-check-glyph {\n  color: var(--slate-ink);\n}\n\n.sl-check.is-failed .sl-check-glyph {\n  color: var(--slate-danger);\n}\n\n.sl-check.is-running .sl-check-glyph {\n  color: var(--slate-warn);\n}\n\n.sl-check.is-todo .sl-check-glyph {\n  color: var(--slate-muted);\n}\n\n.sl-row-label {\n  font-size: 12px;\n  color: var(--slate-muted);\n  white-space: nowrap;\n}\n\n.sl-issue-sev {\n  font-size: 12px;\n  font-weight: 600;\n}\n\n.sl-issue-sev.is-high {\n  color: var(--slate-danger);\n}\n\n.sl-issue-sev.is-low {\n  color: var(--slate-muted);\n}\n\n.sl-issue.is-resolved .sl-row-title {\n  color: var(--slate-muted);\n  text-decoration: line-through;\n}\n\n.sl-detail-panel {\n  padding: 4px 0 12px 24px;\n  font-size: 13px;\n  line-height: 1.6;\n  color: var(--slate-muted);\n}\n\n.sl-detail-meta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  margin-top: 6px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-code-line {\n  margin: 6px 0;\n  padding: 6px 8px;\n  background: var(--slate-surface);\n  border-left: 2px solid var(--slate-border);\n  font-family: var(--dsh-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 12px;\n  color: var(--slate-ink);\n  word-break: break-all;\n}\n\n.sl-empty {\n  padding: 14px 0;\n  font-size: 14px;\n  color: var(--slate-muted);\n}\n\n.sl-activity {\n  margin-top: 18px;\n  padding-top: 14px;\n  border-top: 1px solid var(--slate-border);\n}\n\n.sl-activity h3 {\n  margin: 0 0 10px;\n  font-size: 15px;\n  font-weight: 600;\n}\n\n.sl-activity-item {\n  padding: 0 0 8px 12px;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--slate-muted);\n}\n\n@media (max-width: 340px) {\n  .sl-root {\n    padding: 14px;\n  }\n  .sl-workspace-tag {\n    display: none;\n  }\n  .sl-field-grid {\n    grid-template-columns: 1fr;\n  }\n}\n";
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

  const [project, setProject] = useState(EMPTY_VIEW);
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

  const applyView = useCallback((view) => {
    if (!view) return;
    latestRevisionRef.current = view.revision ?? 0;
    latestWorkspaceRef.current = view.workspacePath || '';
    setProject(view);
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

  useEffect(() => {
    latestRevisionRef.current = -1;
    setError('');
    refresh();
  }, [refresh]);

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
        onClick: refresh,
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
            : h('div', { className: 'sl-editor-note' }, '等待第一次会话汇报或手动填写验收标准')
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
  return h('span', null, tab?.title || '项目进度');
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
    return module.exports;
  }
});
