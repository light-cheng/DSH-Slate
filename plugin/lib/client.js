window.__ModuleLoader__.load({
  id: "dsh-slate",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const STYLE_CSS = ".sl-root {\n  --slate-bg: var(--dsw-alias-bg-base, #ffffff);\n  --slate-surface: var(--dsw-alias-bg-layer-1, #f6f6f6);\n  --slate-surface-hover: var(--dsw-alias-bg-layer-2, #ededed);\n  --slate-ink: var(--dsw-alias-label-primary, #1f2328);\n  --slate-muted: var(--dsw-alias-label-secondary, #656d76);\n  --slate-dimmed: var(--dsw-alias-label-dimmed, #8b9199);\n  --slate-border: var(--dsw-alias-border-l1, #e5e5e5);\n  --slate-danger: var(--dsw-alias-state-error-primary, #b4534d);\n  --slate-warn: var(--dsw-alias-state-warn-primary, #a76d22);\n\n  box-sizing: border-box;\n  height: 100%;\n  overflow-y: auto;\n  overflow-x: hidden;\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  padding: 16px 20px 28px;\n  font-family: var(--dsw-font-family, -apple-system, BlinkMacSystemFont, \"PingFang SC\", sans-serif);\n  font-size: max(14px, var(--dsh-content-font-size, 14px));\n  line-height: 1.5;\n  font-variant-numeric: tabular-nums;\n  color-scheme: inherit;\n}\n\n.sl-root *,\n.sl-root *::before,\n.sl-root *::after {\n  box-sizing: border-box;\n}\n\n.sl-root :where(button, input, textarea, select) {\n  font: inherit;\n  color: var(--slate-ink);\n}\n\n.sl-root button {\n  cursor: pointer;\n}\n\n.sl-root button:disabled {\n  cursor: not-allowed;\n  opacity: 0.55;\n}\n\n.sl-root button:focus-visible,\n.sl-root input:focus-visible,\n.sl-root textarea:focus-visible,\n.sl-root select:focus-visible {\n  outline: 2px solid var(--slate-ink);\n  outline-offset: 2px;\n}\n\n.sl-mast {\n  display: flex;\n  align-items: baseline;\n  gap: 10px;\n  padding-bottom: 10px;\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-mast-title {\n  margin: 0;\n  font-size: 16px;\n  font-weight: 600;\n  line-height: 1.35;\n}\n\n.sl-workspace-tag {\n  font-size: 12px;\n  color: var(--slate-muted);\n  max-width: 190px;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.sl-text-btn {\n  border: 0;\n  background: none;\n  padding: 2px 0;\n  font-size: 12px;\n  color: var(--slate-muted);\n  text-decoration: none;\n}\n\n.sl-text-btn:hover {\n  color: var(--slate-ink);\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n\n.sl-mast .sl-refresh {\n  margin-left: auto;\n}\n\n.sl-notice {\n  margin-top: 8px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-notice.is-error {\n  color: var(--slate-danger);\n  background: var(--slate-surface);\n  border-left: 2px solid var(--slate-danger);\n  padding: 6px 10px;\n}\n\n.sl-goal {\n  padding: 16px 0;\n}\n\n.sl-kicker {\n  display: flex;\n  align-items: center;\n  gap: 10px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-kicker-actions {\n  margin-left: auto;\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n\n.sl-goal-title {\n  margin: 8px 0 6px;\n  font-size: 16px;\n  font-weight: 600;\n  line-height: 1.45;\n  text-wrap: pretty;\n}\n\n.sl-goal-empty {\n  color: var(--slate-muted);\n  font-weight: 500;\n}\n\n.sl-criteria-list {\n  margin: 6px 0 0;\n  padding-left: 18px;\n  font-size: 14px;\n  line-height: 1.5;\n  color: var(--slate-muted);\n}\n\n.sl-criteria-list li + li {\n  margin-top: 3px;\n}\n\n.sl-bootstrap {\n  margin-top: 10px;\n  padding: 12px;\n  background: var(--slate-surface);\n  border: 1px solid var(--slate-border);\n}\n\n.sl-bootstrap-desc {\n  margin: 0 0 8px;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--slate-muted);\n}\n\n.sl-bootstrap-meta {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-bottom: 10px;\n  font-size: 12px;\n  line-height: 1.45;\n  color: var(--slate-muted);\n}\n\n.sl-bootstrap-sessions {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n}\n\n.sl-session-chip {\n  display: inline-block;\n  vertical-align: middle;\n  max-width: 196px;\n  padding: 2px 7px;\n  border: 1px solid var(--slate-border);\n  border-radius: 4px;\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  font-size: 12px;\n  line-height: 1.4;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  text-decoration: none;\n}\n\n.sl-session-chip:hover {\n  background: var(--slate-surface-hover);\n  border-color: var(--slate-muted);\n  color: var(--slate-ink);\n  text-decoration: none;\n}\n\n.sl-bootstrap-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 8px;\n}\n\n.sl-override-chip {\n  display: inline-block;\n  font-size: 12px;\n  color: var(--slate-warn);\n}\n\n.sl-summary {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 8px;\n  padding: 13px 0 14px;\n  border-top: 1px solid var(--slate-border);\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-summary-item {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n\n.sl-summary-item strong {\n  font-size: 18px;\n  font-weight: 600;\n  line-height: 1.25;\n}\n\n.sl-summary-item span {\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-focus {\n  padding: 14px 0;\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-focus-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-focus-severity {\n  color: var(--slate-danger);\n  font-weight: 600;\n}\n\n.sl-focus-title {\n  margin: 6px 0 8px;\n  font-size: 14px;\n  line-height: 1.55;\n}\n\n.sl-focus-link {\n  border: 0;\n  background: none;\n  padding: 0;\n  font-size: 13px;\n  color: var(--slate-ink);\n  font-weight: 500;\n}\n\n.sl-focus-link:hover {\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n\n.sl-latest {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  padding: 13px 0;\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-latest-label {\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-latest-link {\n  border: 0;\n  background: none;\n  padding: 0;\n  text-align: left;\n  font-size: 14px;\n  font-weight: 600;\n  color: var(--slate-ink);\n}\n\n.sl-latest-link:hover {\n  text-decoration: underline;\n  text-underline-offset: 3px;\n}\n\n.sl-latest-evidence {\n  font-size: 12px;\n  line-height: 1.5;\n  color: var(--slate-muted);\n}\n\n.sl-section-head {\n  display: flex;\n  align-items: baseline;\n  margin: 20px 0 12px;\n}\n\n.sl-section-head h3 {\n  margin: 0;\n  font-size: 15px;\n  font-weight: 600;\n}\n\n.sl-section-count {\n  margin-left: auto;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-timeline {\n  border-left: 1px solid var(--slate-border);\n  margin-left: 5px;\n}\n\n.sl-task {\n  position: relative;\n  padding: 0 0 20px 20px;\n}\n\n.sl-task:last-child {\n  padding-bottom: 8px;\n}\n\n.sl-task::before {\n  content: \"\";\n  position: absolute;\n  left: -4px;\n  top: 7px;\n  width: 7px;\n  height: 7px;\n  border-radius: 50%;\n  background: var(--slate-dimmed);\n}\n\n.sl-task.is-done::before {\n  background: var(--slate-muted);\n}\n\n.sl-task.is-waiting::before {\n  background: var(--slate-bg);\n  border: 2px solid var(--slate-warn);\n  left: -5px;\n  top: 6px;\n}\n\n.sl-task.is-failed::before {\n  background: var(--slate-danger);\n}\n\n.sl-task.is-verified::before {\n  content: \"✓\";\n  display: grid;\n  place-items: center;\n  width: 13px;\n  height: 13px;\n  left: -7px;\n  top: 4px;\n  background: var(--slate-ink);\n  color: var(--slate-bg);\n  font-size: 9px;\n  font-weight: 700;\n  line-height: 1;\n}\n\n.sl-task-head {\n  display: flex;\n  align-items: flex-start;\n  gap: 10px;\n}\n\n.sl-task-head-main {\n  min-width: 0;\n  flex: 1;\n}\n\n.sl-task-title {\n  display: block;\n  width: 100%;\n  border: 0;\n  background: none;\n  padding: 0;\n  text-align: left;\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 1.4;\n  color: var(--slate-ink);\n}\n\n.sl-task-title:hover {\n  text-decoration: underline;\n  text-decoration-thickness: 1px;\n  text-underline-offset: 4px;\n}\n\n.sl-task-meta {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  margin-top: 4px;\n  font-size: 12px;\n  line-height: 1.45;\n  color: var(--slate-muted);\n}\n\n.sl-status-warn {\n  color: var(--slate-warn);\n}\n\n.sl-status-danger {\n  color: var(--slate-danger);\n}\n\n.sl-status-verified {\n  color: var(--slate-ink);\n  font-weight: 500;\n}\n\n.sl-task-pct {\n  font-size: 16px;\n  font-weight: 500;\n  white-space: nowrap;\n  color: var(--slate-ink);\n}\n\n.sl-deliverable {\n  margin-top: 7px;\n  font-size: 14px;\n  line-height: 1.55;\n}\n\n.sl-deliverable-label {\n  font-size: 12px;\n  color: var(--slate-muted);\n  margin-right: 6px;\n}\n\n.sl-track {\n  height: 2px;\n  background: var(--slate-border);\n  margin-top: 10px;\n  overflow: hidden;\n}\n\n.sl-track-fill {\n  display: block;\n  height: 100%;\n  background: var(--slate-muted);\n  transition: width 0.2s ease;\n}\n\n.sl-task.is-verified .sl-track-fill {\n  background: var(--slate-ink);\n}\n\n.sl-task-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n  margin-top: 9px;\n}\n\n.sl-editor {\n  margin: 12px 0 4px;\n  padding: 12px;\n  background: var(--slate-surface);\n  border: 1px solid var(--slate-border);\n}\n\n.sl-goal-editor {\n  margin: 12px 0;\n}\n\n.sl-editor-head {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  font-size: 13px;\n  font-weight: 500;\n  color: var(--slate-ink);\n  margin-bottom: 10px;\n}\n\n.sl-field {\n  display: block;\n  margin-bottom: 10px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-field input[type=\"text\"],\n.sl-field textarea,\n.sl-field select {\n  display: block;\n  width: 100%;\n  margin-top: 5px;\n  padding: 7px 9px;\n  border: 1px solid var(--slate-border);\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  font-size: 14px;\n  line-height: 1.45;\n  border-radius: 0;\n}\n\n.sl-field textarea {\n  resize: vertical;\n}\n\n.sl-editor input[type=\"range\"] {\n  display: block;\n  width: 100%;\n  margin: 8px 0 12px;\n  accent-color: var(--slate-ink);\n}\n\n.sl-field-grid {\n  display: grid;\n  grid-template-columns: 74px 1fr;\n  gap: 8px;\n}\n\n.sl-editor-note {\n  font-size: 12px;\n  color: var(--slate-muted);\n  margin-top: 4px;\n}\n\n.sl-editor-actions {\n  display: flex;\n  justify-content: flex-end;\n  gap: 8px;\n  margin-top: 12px;\n}\n\n.sl-btn {\n  border: 1px solid var(--slate-border);\n  background: var(--slate-bg);\n  color: var(--slate-ink);\n  padding: 5px 11px;\n  font-size: 13px;\n}\n\n.sl-btn:hover {\n  background: var(--slate-surface-hover);\n}\n\n.sl-root .sl-btn-primary {\n  border: 1px solid var(--slate-ink);\n  background: var(--slate-ink);\n  color: var(--slate-bg);\n  padding: 5px 12px;\n  font-size: 13px;\n}\n\n.sl-btn-primary:hover {\n  opacity: 0.88;\n}\n\n.sl-section-rule {\n  border-top: 1px solid var(--slate-border);\n  margin-top: 16px;\n}\n\n.sl-list-row {\n  border-bottom: 1px solid var(--slate-border);\n}\n\n.sl-row-trigger {\n  display: grid;\n  grid-template-columns: auto 1fr auto;\n  align-items: baseline;\n  gap: 8px;\n  width: 100%;\n  padding: 10px 0;\n  border: 0;\n  background: none;\n  text-align: left;\n  font-size: 14px;\n  line-height: 1.45;\n}\n\n.sl-row-trigger:hover {\n  background: var(--slate-surface);\n}\n\n.sl-check-glyph {\n  font-weight: 600;\n  width: 16px;\n  text-align: center;\n}\n\n.sl-check.is-passed .sl-check-glyph {\n  color: var(--slate-ink);\n}\n\n.sl-check.is-failed .sl-check-glyph {\n  color: var(--slate-danger);\n}\n\n.sl-check.is-running .sl-check-glyph {\n  color: var(--slate-warn);\n}\n\n.sl-check.is-todo .sl-check-glyph {\n  color: var(--slate-muted);\n}\n\n.sl-row-label {\n  font-size: 12px;\n  color: var(--slate-muted);\n  white-space: nowrap;\n}\n\n.sl-issue-sev {\n  font-size: 12px;\n  font-weight: 600;\n}\n\n.sl-issue-sev.is-high {\n  color: var(--slate-danger);\n}\n\n.sl-issue-sev.is-low {\n  color: var(--slate-muted);\n}\n\n.sl-issue.is-resolved .sl-row-title {\n  color: var(--slate-muted);\n  text-decoration: line-through;\n}\n\n.sl-detail-panel {\n  padding: 4px 0 12px 24px;\n  font-size: 13px;\n  line-height: 1.6;\n  color: var(--slate-muted);\n}\n\n.sl-detail-meta {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 10px;\n  margin-top: 6px;\n  font-size: 12px;\n  color: var(--slate-muted);\n}\n\n.sl-code-line {\n  margin: 6px 0;\n  padding: 6px 8px;\n  background: var(--slate-surface);\n  border-left: 2px solid var(--slate-border);\n  font-family: var(--dsh-font-family-code, ui-monospace, SFMono-Regular, Menlo, monospace);\n  font-size: 12px;\n  color: var(--slate-ink);\n  word-break: break-all;\n}\n\n.sl-empty {\n  padding: 14px 0;\n  font-size: 14px;\n  color: var(--slate-muted);\n}\n\n.sl-activity {\n  margin-top: 18px;\n  padding-top: 14px;\n  border-top: 1px solid var(--slate-border);\n}\n\n.sl-activity h3 {\n  margin: 0 0 10px;\n  font-size: 15px;\n  font-weight: 600;\n}\n\n.sl-activity-item {\n  padding: 0 0 8px 12px;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--slate-muted);\n}\n\n@media (max-width: 340px) {\n  .sl-root {\n    padding: 14px;\n  }\n  .sl-workspace-tag {\n    display: none;\n  }\n  .sl-field-grid {\n    grid-template-columns: 1fr;\n  }\n}\n\n.sl-tab-title {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  line-height: 1;\n}\n\n.sl-tab-icon {\n  width: 16px;\n  height: 16px;\n  flex: none;\n  display: block;\n  object-fit: contain;\n}\n\n.sl-tab-icon-dark {\n  display: none;\n}\n\nbody[data-ds-dark-theme] .sl-tab-icon-light {\n  display: none;\n}\n\nbody[data-ds-dark-theme] .sl-tab-icon-dark {\n  display: block;\n}\n";
    const ICON_DARK_DATA_URL = "data:image/png;base64,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";
    const ICON_LIGHT_DATA_URL = "data:image/png;base64,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";
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
    return module.exports;
  }
});
