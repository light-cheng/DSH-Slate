import { registerPromptGuidance } from './src/prompt.js';
import { registerRpc } from './src/rpc.js';
import { createProjectStore } from './src/store.js';
import { registerReportTool } from './src/tool.js';

export const name = 'dsh-slate';
export const inject = ['tools'];

/**
 * Mount the DSH-Slate Host plugin:
 * - Always registers the authoritative `project_progress_report` tool (works in Headless, Web, Desktop).
 * - Conditionally mounts dynamic `systemPrompt` auto-report guidance when `systemPrompt` exists.
 * - Conditionally mounts authenticated Connection Fetch RPC + SSE routes when `connection` exists.
 */
export function apply(ctx) {
  const store = createProjectStore();
  ctx.effect(() => registerReportTool(ctx, store), 'dsh-slate: project_progress_report tool');
  registerPromptGuidance(ctx, store);

  ctx.inject(['connection'], (connCtx) => {
    registerRpc(connCtx, store);
  });
}
