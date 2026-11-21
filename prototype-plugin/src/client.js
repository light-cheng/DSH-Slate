// THROWAWAY PROTOTYPE — renders reports from real DSH sessions; no fixture projects.
const React = require('react')
const h = React.createElement
const { useEffect, useState } = React
const name = 'dsh-slate'
const inject = ['sidebarRightTabs', 'slots', 'layout', 'uiWorkspace']
const TYPE_ID = 'dsh-slate'
const API = '/dsh-slate'
const EMPTY = { goal: '还没有设置项目目标', acceptance: '等待第一次会话汇报', tasks: [], checks: [], bugs: [], activity: [], updatedAt: null }

async function request(path, body) {
  const response = await fetch(`${API}/${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

function App({ useTabInfo, requestWidth, openSession }) {
  const { sidebar, panel, tab } = useTabInfo()
  const [project, setProject] = useState(EMPTY)
  const [goalEditing, setGoalEditing] = useState(false)
  const [goalDraft, setGoalDraft] = useState('')
  const [acceptanceDraft, setAcceptanceDraft] = useState('')
  const [taskEditing, setTaskEditing] = useState(null)
  const [draft, setDraft] = useState(null)
  const [openBug, setOpenBug] = useState(null)
  const [error, setError] = useState('')

  const refresh = async () => {
    try { setProject(await request('state')); setError('') }
    catch (cause) { setError(String(cause)) }
  }
  useEffect(() => {
    refresh()
    const timer = setInterval(refresh, 2000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!tab.visible || !sidebar.expanded || sidebar.fullscreen || panel.isFloating || panel.isSoleDockedPane === false) return
    return requestWidth(420)
  }, [tab.visible, sidebar.expanded, sidebar.fullscreen, panel.isFloating, panel.isSoleDockedPane, requestWidth])

  const tasks = project.tasks || []
  const completed = tasks.filter(task => task.completed).length
  const verified = tasks.filter(task => task.verified).length
  const waiting = tasks.filter(task => task.completed && !task.verified).length
  const latestVerified = tasks.filter(task => task.verified).at(-1)
  const priorityBug = project.bugs.find(bug => bug.priority === 'P0' || bug.priority === 'P1') || project.bugs[0]
  const showBug = (title) => {
    setOpenBug(title)
    setTimeout(() => Array.from(document.querySelectorAll('.pp-bug')).find(element => element.textContent.includes(title))?.scrollIntoView({ block: 'center' }), 0)
  }
  const saveGoal = async () => {
    setProject(await request('goal', { goal: goalDraft, acceptance: acceptanceDraft }))
    setGoalEditing(false)
  }
  const saveTask = async () => {
    setProject(await request('task', { sessionId: taskEditing, ...draft }))
    setTaskEditing(null)
  }
  const taskAction = async (sessionId, action) => setProject(await request('task', { sessionId, action }))

  const goalEditor = h('div', { className: 'pp-goal-editor' },
    h('label', null, '项目目标', h('textarea', { value: goalDraft, onChange: event => setGoalDraft(event.target.value), rows: 3 })),
    h('label', null, '验收标准', h('input', { value: acceptanceDraft, onChange: event => setAcceptanceDraft(event.target.value) })),
    h('div', { className: 'pp-editor-actions' }, h('button', { onClick: () => setGoalEditing(false) }, '取消'), h('button', { className: 'pp-primary', onClick: saveGoal }, '保存目标')))

  const renderTask = task => h('article', { className: `pp-task ${task.manual ? 'is-manual' : ''} ${task.verified ? 'is-verified' : ''}`, key: task.sessionId },
    h('div', { className: 'pp-task-head' }, h('div', null,
      h('button', { className: 'pp-task-title pp-task-link', title: `打开会话 ${task.label}`, onClick: () => openSession(task.sessionId) }, task.title),
      h('div', { className: 'pp-task-meta', title: task.sessionId }, `${task.priority} · ${task.label} · ${task.status}`)),
      h('strong', null, `${task.progress}%`)),
    h('div', { className: 'pp-deliver' }, h('span', null, '接下来 /'), task.next),
    h('div', { className: 'pp-mini-track' }, h('i', { style: { width: `${task.progress}%` } })),
    task.manual ? h('div', { className: 'pp-manual-badge' }, '手动调整') : null,
    h('div', { className: 'pp-task-actions' },
      h('button', { onClick: () => { setTaskEditing(task.sessionId); setDraft({ progress: task.progress, priority: task.priority, next: task.next }) } }, '编辑任务'),
      !task.completed ? h('button', { onClick: () => taskAction(task.sessionId, 'complete') }, '标记完成') : null,
      task.completed && !task.verified ? h('button', { onClick: () => taskAction(task.sessionId, 'verify') }, '验收通过') : null),
    taskEditing === task.sessionId ? h('div', { className: 'pp-task-editor' },
      h('div', { className: 'pp-editor-title' }, '调整任务', h('span', null, `${draft.progress}%`)),
      h('input', { 'aria-label': '预估进度', type: 'range', min: 0, max: 100, value: draft.progress, onChange: event => setDraft({ ...draft, progress: Number(event.target.value) }) }),
      h('div', { className: 'pp-field-row' },
        h('select', { 'aria-label': '优先级', value: draft.priority, onChange: event => setDraft({ ...draft, priority: event.target.value }) }, h('option', null, 'P0'), h('option', null, 'P1'), h('option', null, 'P2')),
        h('input', { 'aria-label': '接下来要完成', value: draft.next, onChange: event => setDraft({ ...draft, next: event.target.value }) })),
      h('div', { className: 'pp-manual-note' }, '手动调整后，会话汇报不会改动这些字段'),
      h('div', { className: 'pp-editor-actions' }, h('button', { onClick: () => setTaskEditing(null) }, '取消'), h('button', { className: 'pp-primary', onClick: saveTask }, '保存调整'))) : null)

  return h('div', { className: 'pp-root' },
    h('div', { className: 'pp-mast' }, h('div', null, h('h2', null, '项目进度'), h('span', null, '当前项目')), h('button', { className: 'pp-refresh', onClick: refresh }, '刷新')),
    h('div', { className: 'pp-notice' }, error || (project.updatedAt ? `更新于 ${new Date(project.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '等待会话汇报')),
    goalEditing ? goalEditor : h('section', { className: 'pp-goal' },
      h('div', { className: 'pp-kicker' }, '项目目标', h('button', { onClick: () => { setGoalDraft(project.goal); setAcceptanceDraft(project.acceptance); setGoalEditing(true) } }, '编辑')),
      h('h1', null, project.goal), h('p', null, project.acceptance)),
    h('section', { className: 'pp-summary' },
      h('div', null, h('strong', null, tasks.length - completed), h('span', null, '进行中')),
      h('div', null, h('strong', null, waiting), h('span', null, '待验收')),
      h('div', null, h('strong', null, project.bugs.length), h('span', null, '待修问题'))),
    priorityBug ? h('section', { className: 'pp-focus' },
      h('div', { className: 'pp-focus-label' }, '优先处理', h('span', null, priorityBug.priority)),
      h('p', null, priorityBug.title),
      h('button', { onClick: () => showBug(priorityBug.title) }, '查看问题  →')) : null,
    latestVerified ? h('section', { className: 'pp-latest' },
      h('span', null, '最近通过'),
      h('button', { onClick: () => openSession(latestVerified.sessionId) }, latestVerified.title),
      h('small', null, latestVerified.checks?.[0]?.note || '已有验收记录')) : null,
    h('section', { className: 'pp-execution' },
      h('div', { className: 'pp-section-head' }, h('h3', null, '任务'), h('span', null, `${tasks.length} 项`)),
      tasks.length ? h('div', { className: 'pp-timeline' }, tasks.map(renderTask)) : h('div', { className: 'pp-empty' }, '还没有会话汇报任务')),
    h('section', { className: 'pp-checks' },
      h('div', { className: 'pp-section-head' }, h('h3', null, '验收记录')),
      project.checks.length ? h('div', { className: 'pp-check-grid' }, project.checks.map((check, index) => h('div', { className: `pp-check ${check.state}`, key: `${check.title}-${index}` }, h('div', null, check.title), h('span', null, check.note)))) : h('div', { className: 'pp-empty' }, '还没有验收记录')),
    h('section', { className: 'pp-bugs' },
      h('div', { className: 'pp-section-head' }, h('h3', null, '待修问题'), h('span', null, `${project.bugs.length} 个`)),
      project.bugs.length ? project.bugs.map((bug, index) => h('div', { className: 'pp-bug-wrap', key: `${bug.title}-${index}` },
        h('button', { className: 'pp-bug', onClick: () => setOpenBug(openBug === bug.title ? null : bug.title) }, h('b', { 'data-priority': bug.priority }, bug.priority), h('span', null, bug.title), h('small', null, '详情')),
        openBug === bug.title ? h('div', { className: 'pp-bug-detail' }, bug.detail) : null)) : h('div', { className: 'pp-empty' }, '目前没有汇报问题')),
    project.activity.length ? h('section', { className: 'pp-activity' }, h('h3', null, '最近动态'), project.activity.map((item, index) => h('div', { key: `${item}-${index}` }, item))) : null)
}

const CSS = `
.pp-root{--paper:#f5f1e9;--ink:#302e29;--muted:#7c766b;--rule:#d8d0c3;--accent:#aa593e;--green:#4e745d;--amber:#9a6b2f;box-sizing:border-box;height:100%;overflow:auto;background:var(--paper);color:var(--ink);padding:24px 25px 32px;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;font-size:14px;color-scheme:light}.pp-root *{box-sizing:border-box}.pp-root button,.pp-root input,.pp-root textarea,.pp-root select{font:inherit}.pp-root button{cursor:pointer}.pp-mast{display:flex;align-items:center;border-bottom:2px solid var(--ink);padding-bottom:12px}.pp-mast>div{display:flex;align-items:baseline;gap:14px}.pp-mast h2{font-family:"Songti SC","STSong",serif;font-size:21px;letter-spacing:.08em;margin:0}.pp-mast span{font-size:10px;color:var(--muted)}.pp-refresh{margin-left:auto;border:0;background:none;color:var(--muted);font-size:11px}.pp-notice{font-size:11px;color:var(--green);padding:9px 0 0}.pp-goal{padding:22px 0 20px}.pp-kicker{display:flex;align-items:center;color:var(--accent);font-size:11px;letter-spacing:.1em}.pp-kicker button{margin-left:auto;border:0;background:none;color:var(--muted);font-size:11px}.pp-goal h1{font-family:"Songti SC","STSong",serif;font-weight:600;font-size:26px;line-height:1.45;margin:12px 0 9px;text-wrap:pretty}.pp-goal p{font-size:12px;line-height:1.6;color:var(--muted);margin:0}.pp-overview{display:grid;grid-template-columns:1fr auto;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);padding:20px 0}.pp-overview h3{font-size:13px;margin:0 0 5px}.pp-overview span{font-size:10px;color:var(--muted)}.pp-big{font-family:Georgia,serif;font-size:53px;line-height:1;color:var(--accent)}.pp-big sup{font-size:19px}.pp-segments{grid-column:1/3;display:grid;gap:4px;margin:18px 0 11px}.pp-segments i{height:7px;background:#dcd5ca}.pp-segments i.done{background:#4a4740}.pp-segments i.verified{background:var(--green)}.pp-legend{grid-column:1/3;display:flex;justify-content:space-between}.pp-legend b{color:var(--ink)}.pp-section-head{display:flex;align-items:baseline;margin:23px 0 13px}.pp-section-head h3{font-family:"Songti SC","STSong",serif;font-size:17px;margin:0}.pp-section-head>span{margin-left:auto;color:var(--muted);font-size:10px}.pp-timeline{border-left:1px solid var(--rule);margin-left:4px}.pp-task{position:relative;padding:2px 0 23px 22px}.pp-task:before{content:"";position:absolute;left:-4px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--accent)}.pp-task.is-manual:before{background:var(--paper);border:2px solid var(--green);left:-5px;top:7px}.pp-task-head{display:flex;gap:10px;align-items:start}.pp-task-title{font-family:"Songti SC","STSong",serif;font-size:16px;font-weight:600;line-height:1.45}.pp-task-meta{font-size:10px;color:var(--muted);margin-top:5px}.pp-task-head>strong{margin-left:auto;font-family:Georgia,serif;font-size:19px;color:var(--accent);font-weight:400;white-space:nowrap}.pp-deliver{font-size:12px;line-height:1.55;margin-top:8px}.pp-deliver span{color:var(--muted);margin-right:5px}.pp-mini-track{height:2px;background:#ddd5c8;margin-top:11px}.pp-mini-track i{height:100%;display:block;background:var(--accent);transition:width .25s ease}.pp-task-actions{display:flex;gap:12px;margin-top:9px}.pp-task-actions button{padding:0;border:0;background:none;color:var(--muted);font-size:10px}.pp-task-actions button:hover{color:var(--accent)}.pp-manual-badge{font-size:10px;color:var(--green);margin-top:7px}.pp-task-editor{margin:12px 0 4px;padding:13px;background:#ece6dc;border:1px solid #c9bdad}.pp-editor-title{display:flex;justify-content:space-between;font-size:11px;color:var(--accent)}.pp-task-editor input[type=range]{width:100%;accent-color:var(--accent);margin:15px 0}.pp-field-row{display:grid;grid-template-columns:58px 1fr;gap:7px}.pp-field-row input,.pp-field-row select,.pp-goal-editor input,.pp-goal-editor textarea{width:100%;border:1px solid #c9bdad;background:var(--paper);color:var(--ink);padding:7px;font-size:11px;border-radius:0}.pp-manual-note{font-size:10px;color:var(--muted);margin-top:9px}.pp-editor-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:11px}.pp-editor-actions button{border:0;background:none;color:var(--muted);padding:5px 9px;font-size:11px}.pp-editor-actions .pp-primary{background:var(--accent);color:white}.pp-goal-editor{padding:20px 0;border-bottom:1px solid var(--rule)}.pp-goal-editor label{display:block;color:var(--muted);font-size:11px;margin-bottom:11px}.pp-goal-editor textarea{display:block;resize:vertical;margin-top:6px;line-height:1.5}.pp-goal-editor input{display:block;margin-top:6px}.pp-checks,.pp-bugs{border-top:1px solid var(--rule)}.pp-check-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.pp-check{padding:9px 0;border-bottom:1px solid #ded7cb;font-size:11px;line-height:1.4}.pp-check>div:before{margin-right:5px}.pp-check.passed>div:before{content:"✓";color:var(--green)}.pp-check.failed>div:before{content:"×";color:#a34e48}.pp-check.running>div:before{content:"◌";color:var(--amber)}.pp-check.todo>div:before{content:"○";color:var(--muted)}.pp-check span{display:block;color:var(--muted);font-size:9px;margin-top:4px}.pp-bug-wrap{border-bottom:1px solid #ded7cb}.pp-bug{display:grid;grid-template-columns:25px 1fr auto;gap:6px;width:100%;padding:9px 0;border:0;background:none;text-align:left;color:var(--ink);font-size:11px}.pp-bug b{color:var(--accent)}.pp-bug small{color:var(--muted)}.pp-bug-detail{padding:2px 0 11px 31px;color:var(--muted);font-size:11px;line-height:1.7}.pp-activity{margin-top:22px;border-top:1px solid var(--rule);padding-top:16px}.pp-activity h3{font-family:"Songti SC","STSong",serif;font-size:15px;margin:0 0 10px}.pp-activity>div{padding:0 0 9px 13px;color:var(--muted);font-size:10px;line-height:1.45}.pp-empty{border-top:1px solid var(--rule);padding:16px 0;color:var(--muted);font-size:12px}@media(max-width:360px){.pp-root{padding:18px}.pp-goal h1{font-size:23px}.pp-check-grid{grid-template-columns:1fr}.pp-mast span{display:none}}
`

// Native DSH appearance: semantic colors, user font preferences, and denser geometry.
const NATIVE_CSS = `
.pp-root{--paper:var(--dsw-alias-bg-base,#fff);--ink:var(--dsw-alias-label-primary,#242424);--muted:var(--dsw-alias-label-secondary,#6f7073);--rule:var(--dsw-alias-border-l1,#e5e5e5);--accent:var(--dsw-alias-state-business-primary,#4176e6);--green:var(--dsw-alias-state-success-primary,#338a65);--amber:var(--dsw-alias-state-warn-primary,#a76d22);background:var(--paper);color:var(--ink);padding:16px 20px 24px;font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif);font-size:var(--dsh-content-font-size,14px);color-scheme:inherit}
.pp-mast{padding-bottom:11px}.pp-mast h2,.pp-goal h1,.pp-section-head h3,.pp-task-title,.pp-activity h3{font-family:var(--dsw-font-family,-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif);letter-spacing:0}.pp-mast h2{font-size:17px;font-weight:650}.pp-mast span{font-size:12px}.pp-notice{font-size:12px;padding-top:7px}.pp-goal{padding:17px 0 16px}.pp-kicker{font-size:12px;letter-spacing:0}.pp-kicker button,.pp-refresh{font-size:12px}.pp-goal h1{font-size:22px;line-height:1.45;font-weight:600;margin:9px 0 7px}.pp-goal p{font-size:13px;line-height:1.6}.pp-overview{padding:16px 0}.pp-overview h3{font-size:14px}.pp-overview span{font-size:12px}.pp-big{font-family:var(--dsw-font-family,sans-serif);font-size:46px;font-weight:550;letter-spacing:-.04em}.pp-big sup{font-size:18px}.pp-segments{margin:14px 0 9px}.pp-legend{font-size:12px}.pp-section-head{margin:18px 0 10px}.pp-section-head h3{font-size:16px;font-weight:650}.pp-section-head>span{font-size:12px}.pp-task{padding-bottom:19px}.pp-task-title{font-size:16px;font-weight:600;line-height:1.4}.pp-task-meta{font-size:12px;line-height:1.5}.pp-task-head>strong{font-family:var(--dsw-font-family,sans-serif);font-size:18px;font-weight:550}.pp-deliver{font-size:13px;line-height:1.55}.pp-task-actions{gap:14px}.pp-task-actions button,.pp-manual-badge{font-size:12px}.pp-editor-title{font-size:13px}.pp-manual-note{font-size:12px}.pp-field-row input,.pp-field-row select,.pp-goal-editor input,.pp-goal-editor textarea{font-size:13px}.pp-editor-actions button{font-size:12px}.pp-task-editor,.pp-goal-editor input,.pp-goal-editor textarea{background:var(--dsw-alias-bg-layer-1,#f6f6f6);border-color:var(--rule)}.pp-field-row input,.pp-field-row select{background:var(--paper)}.pp-check-grid{gap:0 14px}.pp-check{font-size:13px;padding:10px 0}.pp-check span{font-size:11px;line-height:1.5}.pp-bug{font-size:13px;padding:10px 0}.pp-bug-detail{font-size:12px;line-height:1.65}.pp-activity h3{font-size:15px;font-weight:650}.pp-activity>div{font-size:12px;line-height:1.5}.pp-empty{font-size:13px}.pp-segments i{background:var(--rule)}.pp-segments i.done{background:var(--muted)}.pp-check-grid,.pp-check,.pp-bug-wrap{border-color:var(--rule)}
`

const PALETTE_CSS = `
.pp-root{--accent:var(--dsw-alias-brand-primary,#5268c7);--green:color-mix(in srgb,var(--dsw-alias-state-success-primary) 58%,var(--paper))}
.pp-mast{border-bottom:1px solid var(--rule)}.pp-kicker,.pp-notice{color:var(--muted)}
.pp-big,.pp-task-head>strong{color:var(--ink)}
.pp-task:before{background:var(--dsw-alias-label-dimmed,#8b9199)}
.pp-mini-track i{background:color-mix(in srgb,var(--ink) 52%,var(--paper))}
.pp-task.is-verified:before{background:var(--green)}
.pp-task.is-verified .pp-mini-track i{background:var(--green)}
.pp-segments i.done{background:color-mix(in srgb,var(--ink) 62%,var(--paper))}
.pp-bug b{color:var(--dsw-alias-state-error-primary,#b45f59)}
.pp-simulate button:hover,.pp-task-actions button:hover{color:var(--accent)}
`

const MONO_CSS = `
.pp-root{--green:var(--ink);font-variant-numeric:tabular-nums}
.pp-mast h2{font-size:16px;font-weight:600}.pp-goal h1{font-size:21px;font-weight:600;line-height:1.5}
.pp-big{font-size:44px;font-weight:400;letter-spacing:-.035em}.pp-task-head>strong{font-weight:500}
.pp-section-head h3{font-size:15px;font-weight:600}
.pp-segments i{height:5px;border-radius:1px}.pp-segments i.verified{background:var(--ink)}.pp-segments i.done{background:color-mix(in srgb,var(--ink) 45%,var(--paper))}
.pp-task.is-verified:before{content:"✓";display:grid;place-items:center;width:12px;height:12px;left:-7px;top:4px;background:var(--ink);color:var(--paper);font-size:8px;line-height:1}
.pp-task.is-verified .pp-mini-track i{background:var(--ink)}
.pp-check.passed>div:before{color:var(--ink)}.pp-check.failed>div:before{color:var(--dsw-alias-state-error-primary,#b45f59)}
.pp-bug b{font-weight:500}.pp-bug b[data-priority="P2"]{color:var(--muted)}
`

const DETAILS_CSS = `
.pp-summary{display:grid;grid-template-columns:repeat(3,1fr);padding:13px 0 15px;border-top:1px solid var(--rule);border-bottom:1px solid var(--rule)}
.pp-summary>div{display:flex;flex-direction:column;gap:3px}.pp-summary strong{font-size:18px;font-weight:550}.pp-summary span{font-size:12px;color:var(--muted)}
.pp-focus{padding:15px 0;border-bottom:1px solid var(--rule)}.pp-focus-label{display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
.pp-focus p{font-size:13px;line-height:1.6;margin:8px 0}.pp-focus button{padding:0;border:0;background:none;color:var(--ink);font-size:12px}
.pp-latest{display:flex;flex-direction:column;gap:5px;padding:13px 0;border-bottom:1px solid var(--rule)}
.pp-latest>span{font-size:12px;color:var(--muted)}.pp-latest>button{padding:0;border:0;background:none;text-align:left;color:var(--ink);font-size:13px;font-weight:550}.pp-latest>small{font-size:11px;line-height:1.5;color:var(--muted)}
.pp-task-link{display:block;width:100%;padding:0;border:0;background:none;text-align:left;color:var(--ink)}
.pp-task-link:hover{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:4px}
.pp-editor-title{color:var(--ink)}.pp-task-editor input[type=range]{accent-color:var(--ink)}
.pp-editor-actions .pp-primary{background:var(--ink);color:var(--paper)}.pp-field-row select{color:var(--ink)}
`

function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.projectProgressPrototype = 'true'
    style.textContent = CSS + NATIVE_CSS + PALETTE_CSS + MONO_CSS + DETAILS_CSS
    document.head.appendChild(style)
    return () => style.remove()
  }, 'project progress prototype styles')
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: TYPE_ID, kind: 'dsh-slate', title: () => '项目进度', keepMounted: true,
    guide: [{ id: 'overview', order: 10, title: () => '项目进度', description: () => '目标、任务、接下来要完成的工作和验收' }],
  }), 'project progress prototype tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: TYPE_ID,
    inject: () => ({
      openSession(sessionId) { ctx.uiWorkspace.openSession(sessionId) },
      requestWidth(width) {
        if (typeof ctx.layout.requestRightbarWidth === 'function') {
          const handle = ctx.layout.requestRightbarWidth(width)
          return () => handle.dispose()
        }
        // Prototype-only compatibility with versions before the public width request API.
        ctx.layout.panels?.setRightbar?.(width)
      },
    }),
  }, App)), 'project progress prototype body')
}
module.exports = { name, inject, apply }
