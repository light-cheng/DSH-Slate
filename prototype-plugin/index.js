// Throwaway live prototype: real DSH tool calls persisted only inside the temporary DSH_HOME.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export const name = 'dsh-slate'
export const inject = ['tools']
const STATE_FILE = join(process.env.DSH_HOME || '/tmp/dsh-slate', 'storages', 'dsh-slate.json')
function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, 'utf8')) }
  catch { return { goal: '还没有设置项目目标', acceptance: '等待第一次会话汇报', tasks: [], checks: [], bugs: [], activity: [], updatedAt: null } }
}
const state = loadState()
function reload() { Object.assign(state, loadState()) }
function labelFor(sessionId) { return `#${String(sessionId).replace(/^session-/, '').slice(0, 8)}` }
for (const task of state.tasks) task.label = labelFor(task.sessionId)
function persist() { mkdirSync(dirname(STATE_FILE), { recursive: true }); writeFileSync(STATE_FILE, JSON.stringify(state, null, 2)) }
function touch() { state.updatedAt = new Date().toISOString(); persist() }
function send(res, value, status = 200) {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' })
  res.end(body)
}
async function body(req) {
  let text = ''
  for await (const chunk of req) {
    text += chunk
    if (text.length > 32768) throw new Error('Request too large')
  }
  return JSON.parse(text || '{}')
}
function allowed(req) {
  const origin = req.headers.origin
  return !origin || new URL(origin).host === req.headers.host
}
function rebuildDetails() {
  state.checks = state.tasks.flatMap(task => task.checks || [])
  state.bugs = state.tasks.flatMap(task => task.bugs || [])
}
function report(args, exec) {
  const realSessionId = exec.agent?.sessionId || args.sessionId || process.env.DSH_SESSION_ID
  if (!realSessionId || !String(realSessionId).startsWith('session-')) throw new Error('A real DSH session id is required')
  if (exec.agent?.sessionId && String(exec.agent.sessionId) !== String(realSessionId)) throw new Error('Session id mismatch')
  const sessionId = String(realSessionId)
  const label = labelFor(sessionId)
  const previous = state.tasks.find(task => task.sessionId === sessionId)
  const task = {
    sessionId, label, title: String(args.task), priority: args.priority || previous?.priority || 'P1',
    progress: Number(args.progress), status: String(args.status), next: String(args.next),
    completed: Boolean(args.completed), verified: Boolean(args.verified), manual: false,
    checks: args.checks || [], bugs: args.bugs || [],
  }
  if (previous?.manual) Object.assign(task, {
    progress: previous.progress, priority: previous.priority, next: previous.next, manual: true,
  })
  if (previous) Object.assign(previous, task)
  else state.tasks.push(task)
  state.goal = String(args.projectGoal)
  if (args.acceptance) state.acceptance = String(args.acceptance)
  rebuildDetails()
  state.activity.unshift(`${label}：${String(args.summary)}`)
  state.activity = state.activity.slice(0, 8)
  touch()
  return { ok: true, sessionId, taskCount: state.tasks.length }
}

const reportTool = {
  name: 'project_progress_report',
  description: '汇报当前真实会话在一个项目中的任务进度。开始、取得实质进展、运行测试或发现 Bug 后调用。完成和验收必须分别汇报。',
  parameters: {
    type: 'object', additionalProperties: false,
    required: ['sessionId', 'projectGoal', 'task', 'progress', 'status', 'next', 'summary'],
    properties: {
      sessionId: { type: 'string', description: '当前真实会话 ID；Web 会自动带入，headless 可从 DSH_SESSION_ID 读取' },
      projectGoal: { type: 'string' }, acceptance: { type: 'string' },
      task: { type: 'string' }, priority: { type: 'string', enum: ['P0', 'P1', 'P2'] },
      progress: { type: 'number', minimum: 0, maximum: 100 }, status: { type: 'string' },
      next: { type: 'string', description: '下一项具体、可检查的工作结果' },
      summary: { type: 'string', description: '本次实际完成的事情' },
      completed: { type: 'boolean' }, verified: { type: 'boolean', description: '只有已有实际测试或验收证据时才为 true' },
      checks: { type: 'array', items: { type: 'object', required: ['title', 'state', 'note'], properties: { title: { type: 'string' }, state: { type: 'string', enum: ['passed', 'failed', 'running', 'todo'] }, note: { type: 'string' } } } },
      bugs: { type: 'array', items: { type: 'object', required: ['priority', 'title', 'detail'], properties: { priority: { type: 'string', enum: ['P0', 'P1', 'P2'] }, title: { type: 'string' }, detail: { type: 'string' } } } },
    },
  },
  output: {
    schema: { type: 'object', required: ['ok', 'sessionId', 'taskCount'], properties: { ok: { type: 'boolean' }, sessionId: { type: 'string' }, taskCount: { type: 'number' } } },
    render: (_args, value) => [{ type: 'text', text: `已记录会话 ${value.sessionId} 的项目进度。` }],
  },
  execute: report,
}

export function apply(ctx) {
  ctx.tools.register(reportTool)
}

export function registerWeb(webCtx) {
  webCtx.effect(() => {
    const routes = [
      { kind: 'exact', path: '/dsh-slate/state', handler(req, res) {
        if (req.method !== 'GET') return send(res, { error: 'Method not allowed' }, 405)
        reload(); send(res, state)
      } },
      { kind: 'exact', path: '/dsh-slate/goal', handler: async (req, res) => {
        if (!allowed(req) || req.method !== 'POST') return send(res, { error: 'Rejected' }, 403)
        const input = await body(req)
        reload()
        state.goal = String(input.goal || state.goal)
        state.acceptance = String(input.acceptance || '')
        state.activity.unshift('你修改了项目目标和验收标准')
        touch(); send(res, state)
      } },
      { kind: 'exact', path: '/dsh-slate/task', handler: async (req, res) => {
        if (!allowed(req) || req.method !== 'POST') return send(res, { error: 'Rejected' }, 403)
        const input = await body(req)
        reload()
        const task = state.tasks.find(item => item.sessionId === input.sessionId)
        if (!task) return send(res, { error: 'Unknown session' }, 404)
        if (input.action === 'complete') Object.assign(task, { progress: 100, completed: true, status: '等待验收' })
        else if (input.action === 'verify') Object.assign(task, { verified: true, status: '验收通过' })
        else Object.assign(task, { progress: Number(input.progress), priority: input.priority, next: String(input.next), manual: true, status: '手动调整' })
        state.activity.unshift(`${task.label}：你更新了「${task.title}」`)
        touch(); send(res, state)
      } },
    ]
    const disposers = routes.map(route => webCtx.webServer.register(route))
    return () => disposers.reverse().forEach(dispose => dispose())
  }, 'project progress prototype HTTP routes')
}
