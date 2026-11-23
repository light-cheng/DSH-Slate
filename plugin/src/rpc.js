import { collectWorkspaceContext, triggerQuickInit } from './bootstrap.js';
import {
  buildProjectView,
  completeTask,
  deleteTask,
  restoreGoal,
  restoreTask,
  setIssueStatus,
  updateGoal,
  updateTask,
  verifyTask,
} from './domain.js';

export const RPC_PATH = '/api/dsh-slate/rpc';
export const SSE_PATH = '/api/dsh-slate/events';

function rpcSuccess(value) {
  return { ok: true, value };
}

function rpcFailure(code, message, details = {}) {
  return { ok: false, error: { code, message: String(message), details } };
}

/**
 * Authoritatively resolve the target workspace path for a sidebar RPC or SSE request.
 * Prefers Host registries (`workspaceRegistry`, `sessions`, `sessionPersistence`) when a
 * `sessionId` is provided, falling back to `payload.workspacePath` when the session is new
 * or only path-scoped.
 *
 * @param {object} ctx
 * @param {{ sessionId?: unknown, workspacePath?: unknown } | null | undefined} input
 * @returns {Promise<string>}
 */
export async function resolveRequestWorkspace(ctx, input) {
  const sessionId = typeof input?.sessionId === 'string' ? input.sessionId.trim() : '';
  const fallbackPath = typeof input?.workspacePath === 'string' ? input.workspacePath.trim() : '';

  if (sessionId) {
    const registry = ctx.get?.('workspaceRegistry');
    const workspaces = registry?.list?.();
    if (Array.isArray(workspaces)) {
      const owner = workspaces.find((ws) => Array.isArray(ws.sessionIds) && ws.sessionIds.includes(sessionId));
      if (owner?.path) return owner.path;
    }

    const sessions = ctx.get?.('sessions');
    const liveSession = sessions?.get?.(sessionId);
    if (liveSession?.header?.cwd) return liveSession.header.cwd;

    const persistence = ctx.get?.('sessionPersistence');
    if (typeof persistence?.readHeader === 'function') {
      try {
        const header = await persistence.readHeader(sessionId);
        if (header?.cwd) return header.cwd;
      } catch {
        // Ignore missing persisted header for brand-new blank sessions.
      }
    }
  }

  return fallbackPath;
}

/**
 * Build the pure RPC endpoint dispatcher for `/dsh-slate`.
 * @param {object} ctx
 * @param {ReturnType<import('./store.js').createProjectStore>} store
 */
export function createRpcDispatcher(ctx, store) {
  return async function handleRpc(endpoint, rawPayload) {
    const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {};
    const rawWorkspace = await resolveRequestWorkspace(ctx, payload);
    const canonical = store.canonicalizeWorkspacePath(rawWorkspace);

    if (endpoint === 'getState') {
      if (!canonical) return rpcSuccess(null);
      try {
        const project = await store.read(canonical);
        return rpcSuccess(buildProjectView(project));
      } catch (error) {
        return rpcFailure('slate/read-failed', error.message);
      }
    }

    if (endpoint === 'getWorkspaceContext') {
      if (!canonical) return rpcSuccess(null);
      try {
        const wsContext = await collectWorkspaceContext(
          ctx,
          canonical,
          typeof payload.sessionId === 'string' ? payload.sessionId : ''
        );
        return rpcSuccess(wsContext);
      } catch (error) {
        return rpcFailure('slate/context-failed', error.message);
      }
    }

    if (!canonical) {
      return rpcFailure('slate/invalid-workspace', '未识别当前工作区路径，无法保存修改');
    }

    try {
      switch (endpoint) {
        case 'updateGoal': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            updateGoal(current, {
              goal: payload.goal,
              acceptanceCriteria: payload.acceptanceCriteria,
            }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'restoreGoal': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            restoreGoal(current, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'updateTask': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            updateTask(current, {
              taskId: String(payload.taskId || ''),
              priority: payload.priority,
              progressEstimate: payload.progressEstimate,
              nextDeliverable: payload.nextDeliverable,
            }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'restoreTask': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            restoreTask(current, {
              taskId: String(payload.taskId || ''),
              fields: Array.isArray(payload.fields) ? payload.fields : undefined,
            }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'completeTask': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            completeTask(current, { taskId: String(payload.taskId || '') }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'verifyTask': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            verifyTask(current, { taskId: String(payload.taskId || '') }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'deleteTask': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            deleteTask(current, { taskId: String(payload.taskId || '') }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'setIssueStatus': {
          const { project } = await store.mutate(canonical, (current, helpers) =>
            setIssueStatus(current, {
              issueId: String(payload.issueId || ''),
              status: payload.status === 'resolved' ? 'resolved' : 'open',
            }, helpers.now)
          );
          return rpcSuccess(buildProjectView(project));
        }

        case 'quickInit': {
          const started = await triggerQuickInit(ctx, store, {
            workspacePath: canonical,
            sessionId: typeof payload.sessionId === 'string' ? payload.sessionId : '',
          });
          return rpcSuccess(started);
        }

        default:
          return rpcFailure('slate/unknown-endpoint', `Unknown RPC endpoint: ${endpoint}`);
      }
    } catch (error) {
      return rpcFailure(error?.code || 'slate/mutation-failed', error?.message || String(error));
    }
  };
}

/**
 * Register DSH-authenticated Connection Fetch RPC (`/api/dsh-slate/rpc`) and SSE live stream (`/api/dsh-slate/events`).
 * Both run behind DSH's `/api` handler (`BrowserAuth`, Host/Origin fence, and `owner` Peer validation).
 * @param {object} connCtx
 * @param {ReturnType<import('./store.js').createProjectStore>} store
 */
export function registerRpc(connCtx, store) {
  const dispatcher = createRpcDispatcher(connCtx, store);

  connCtx.effect(
    () =>
      connCtx.connection.fetch.register({
        path: RPC_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        async fetch(request) {
          let body;
          try {
            body = await request.json();
          } catch {
            return Response.json(rpcFailure('slate/bad-request', 'Invalid JSON request body'), {
              status: 400,
              headers: { 'cache-control': 'no-store' },
            });
          }
          const endpoint = typeof body?.endpoint === 'string' ? body.endpoint.trim() : '';
          if (!endpoint) {
            return Response.json(rpcFailure('slate/bad-request', 'Missing RPC endpoint'), {
              status: 400,
              headers: { 'cache-control': 'no-store' },
            });
          }
          const result = await dispatcher(endpoint, body.payload);
          return Response.json(result, {
            status: 200,
            headers: { 'cache-control': 'no-store' },
          });
        },
      }),
    'dsh-slate: authenticated RPC route'
  );

  connCtx.effect(
    () =>
      connCtx.connection.fetch.register({
        path: SSE_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        async fetch(request) {
          const url = new URL(request.url, 'http://dsh.internal');
          const rawWorkspace = await resolveRequestWorkspace(connCtx, {
            sessionId: url.searchParams.get('sessionId') || '',
            workspacePath: url.searchParams.get('workspacePath') || '',
          });
          const canonical = store.canonicalizeWorkspacePath(rawWorkspace);
          if (!canonical) {
            return new Response('missing workspacePath', { status: 400 });
          }

          const encoder = new TextEncoder();
          let cleanup = null;

          const stream = new ReadableStream({
            async start(controller) {
              let closed = false;
              let lastRevision = -1;

              const sendState = (project) => {
                if (closed) return;
                const view = buildProjectView(project);
                if (view.revision === lastRevision) return;
                lastRevision = view.revision;
                controller.enqueue(encoder.encode(`event: state\ndata: ${JSON.stringify(view)}\n\n`));
              };

              try {
                const initial = await store.read(canonical);
                sendState(initial);
              } catch (error) {
                if (!closed) {
                  controller.enqueue(
                    encoder.encode(`event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`)
                  );
                }
              }

              const unwatch = store.watchWorkspace(canonical, sendState);
              const heartbeat = setInterval(() => {
                if (!closed) {
                  try {
                    controller.enqueue(encoder.encode(': keepalive\n\n'));
                  } catch {
                    // Stream closed concurrently.
                  }
                }
              }, 20000);
              if (typeof heartbeat.unref === 'function') heartbeat.unref();

              cleanup = () => {
                if (closed) return;
                closed = true;
                clearInterval(heartbeat);
                unwatch();
              };

              if (request.signal) {
                request.signal.addEventListener('abort', () => {
                  cleanup?.();
                  try {
                    controller.close();
                  } catch {
                    // Already closed.
                  }
                }, { once: true });
              }
            },
            cancel() {
              cleanup?.();
            },
          });

          return new Response(stream, {
            status: 200,
            headers: {
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-cache, no-transform',
              connection: 'keep-alive',
            },
          });
        },
      }),
    'dsh-slate: authenticated SSE feed'
  );
}
