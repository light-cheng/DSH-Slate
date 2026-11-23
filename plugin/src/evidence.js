/**
 * Session shell-execution extraction and FR-05 automatic evidence verification
 * for DeepSeek Harness 0.2.2-rc.5.
 */

import { createHash } from 'node:crypto';

const SHELL_TOOL_NAMES = new Set([
  'bash',
  'pwsh',
  'shell',
  'powershell',
  'cmd',
  'ops_bash',
  'ops_pwsh',
  'ops_shell',
]);
const MAX_SUMMARY_CHARS = 360;

/**
 * Iterate session events regardless of whether the session exposes `eventAt(seq)`
 * (real DSH Session) or an `events` array (unit-test fixture).
 * @param {object | undefined} session
 * @returns {Array<object>}
 */
function readSessionEvents(session) {
  if (!session) return [];
  if (typeof session.seq === 'number' && typeof session.eventAt === 'function') {
    const out = [];
    for (let seq = 0; seq < session.seq; seq++) {
      const event = session.eventAt(seq);
      if (event) out.push(event);
    }
    return out;
  }
  if (Array.isArray(session.events)) {
    return session.events;
  }
  return [];
}

/**
 * Safely parse JSON tool arguments into a plain object.
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
function parseArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Extract plain text from tool result message content blocks.
 * @param {unknown} content
 * @returns {string}
 */
function extractResultText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('\n');
}

function hasMaskedExitCode(command) {
  const cmd = String(command || '').trim();
  if (!cmd) return false;
  return /(?:\|\||;)\s*(?:true\b|:|exit\s+0\b|echo\b)/i.test(cmd);
}

/**
 * Parse rendered bash/pwsh tool output markers produced by `dsh-tool-bash`.
 * @param {string} text
 * @param {boolean} isError
 * @param {string} [command]
 * @returns {{ status: 'passed' | 'failed' | 'running' | 'masked', exitCode: number | null }}
 */
export function parseShellOutputStatus(text, isError, command = '') {
  const exitMatch = text.match(/\[exit code:\s*(-?\d+)\]/m);
  const parsedExitCode = exitMatch ? Number(exitMatch[1]) : null;
  if (isError) {
    return { status: 'failed', exitCode: parsedExitCode };
  }
  if (/^started background job /m.test(text) || /\[still running after \d+ms\b[^\]]*\]/m.test(text)) {
    return { status: 'running', exitCode: null };
  }
  const hasFailureMarker =
    /\[timed out after \d+ms\]/m.test(text) ||
    /\[(?:killed by )?signal:\s*[^\]]+\]/m.test(text) ||
    /\[stopped:\s*[^\]]+\]/m.test(text) ||
    /\[cancelled\]/m.test(text) ||
    /\[error:\s*[^\]]+\]/m.test(text) ||
    /\[[A-Z][A-Z0-9_]+;\s*effects:\s*(?:none|unknown);\s*retry:\s*[^\]]+\]/m.test(text) ||
    /\[(?:POLICY_DENIED|EXECUTION_RESTRICTED|AUTHORITY_CHANGED|INVALID_BASH_ARGUMENT|STATUS_DLL_INIT_FAILED|PERMISSION_DENIED):[^\]]*\]/m.test(text) ||
    /\[(?:workspace-write|read-only|sandbox)[^\]]*denied/im.test(text);
  if (hasFailureMarker) {
    return {
      status: 'failed',
      exitCode: parsedExitCode !== null && parsedExitCode !== 0 ? parsedExitCode : null,
    };
  }
  if (parsedExitCode !== null) {
    if (parsedExitCode === 0 && hasMaskedExitCode(command)) {
      return { status: 'masked', exitCode: null };
    }
    return { status: parsedExitCode === 0 ? 'passed' : 'failed', exitCode: parsedExitCode };
  }
  if (hasMaskedExitCode(command)) {
    return { status: 'masked', exitCode: null };
  }
  return { status: 'passed', exitCode: 0 };
}

/**
 * Create a compact single-screen summary for sidebar display without flooding the panel.
 * @param {string} text
 * @returns {string}
 */
export function summarizeOutput(text) {
  const clean = String(text || '').trim().replace(/\r\n/g, '\n');
  if (!clean) return '(无输出)';
  if (clean.length <= MAX_SUMMARY_CHARS) return clean;
  const lines = clean.split('\n').filter((line) => line.trim().length > 0);
  const head = lines.slice(0, 3).join('\n');
  const tail = lines.slice(-4).join('\n');
  const combined = lines.length <= 7 ? clean : `${head}\n...\n${tail}`;
  if (combined.length <= MAX_SUMMARY_CHARS) return combined;
  return `${combined.slice(0, MAX_SUMMARY_CHARS - 3)}...`;
}

/**
 * Extract ordered shell executions from a DSH Session object.
 * @param {object | undefined} session
 * @returns {Array<{
 *   callId: string,
 *   seq: number,
 *   toolName: string,
 *   command: string,
 *   cwd: string | undefined,
 *   status: 'passed' | 'failed' | 'running',
 *   exitCode: number | null,
 *   outputText: string,
 *   outputSummary: string
 * }>}
 */
export function extractShellExecutions(session) {
  const events = readSessionEvents(session);
  const pendingCalls = new Map();
  const executions = [];

  for (const event of events) {
    if (event.type === 'tool/call' && event.data && SHELL_TOOL_NAMES.has(event.data.name)) {
      const args = parseArgs(event.data.arguments);
      const rawCommand = typeof args.command === 'string' ? args.command.trim() : '';
      const rawScriptPath = typeof args.script_path === 'string' ? args.script_path.trim() : '';
      const command = rawCommand || (rawScriptPath ? `bash ${rawScriptPath}` : '');
      const workdir = typeof args.workdir === 'string' && args.workdir.trim() ? args.workdir.trim() : undefined;
      if (event.data.callId && command) {
        pendingCalls.set(event.data.callId, {
          callId: event.data.callId,
          seq: event.seq ?? executions.length,
          toolName: event.data.name,
          command,
          workdir,
        });
      }
      continue;
    }

    const resultCallId =
      event.data?.message?.toolCallId ||
      event.data?.message?.source?.callId ||
      event.data?.message?.callId;

    if (event.type === 'tool/result' && resultCallId) {
      const call = pendingCalls.get(resultCallId);
      if (!call) continue;
      pendingCalls.delete(resultCallId);

      const outputText = extractResultText(event.data.message.content);
      const isError = Boolean(event.data.message.isError);
      const parsed = parseShellOutputStatus(outputText, isError, call.command);
      executions.push({
        callId: call.callId,
        seq: event.seq ?? call.seq,
        toolName: call.toolName,
        command: call.command,
        cwd: typeof event.data.meta?.cwd === 'string' ? event.data.meta.cwd : call.workdir,
        status: parsed.status,
        exitCode: parsed.exitCode,
        outputText,
        outputSummary: summarizeOutput(outputText),
      });
    }
  }

  return executions;
}

function normalizeCommand(cmd) {
  return String(cmd || '').trim().replace(/\s+/g, ' ');
}

function normalizeCommandLoose(cmd) {
  return normalizeCommand(cmd)
    .replace(/\\+/g, '/')
    .replace(/['"`]/g, '')
    .toLowerCase();
}

function extractTestPathTokens(cmd) {
  const matches = normalizeCommand(cmd)
    .replace(/\\+/g, '/')
    .toLowerCase()
    .match(/[a-z0-9_./-]+\.(?:test|spec)\.[a-z0-9]+/g);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Find the most recent shell execution matching a reported command (or latest completed
 * execution when command was omitted).
 * @param {string} command
 * @param {Array<ReturnType<typeof extractShellExecutions>[number]>} executions
 */
function findMatchingExecution(command, executions) {
  const norm = normalizeCommand(command);
  const completed = executions.filter((item) => item.status === 'passed' || item.status === 'failed');

  if (!norm) {
    return completed.at(-1) || executions.at(-1) || null;
  }

  for (let i = executions.length - 1; i >= 0; i--) {
    const execNorm = normalizeCommand(executions[i].command);
    if (execNorm === norm || execNorm.includes(norm) || norm.includes(execNorm)) {
      return executions[i];
    }
  }

  const normLoose = normalizeCommandLoose(norm);
  const tokens = extractTestPathTokens(norm);
  for (let i = executions.length - 1; i >= 0; i--) {
    const execLoose = normalizeCommandLoose(executions[i].command);
    if (
      normLoose.length >= 4 &&
      (execLoose === normLoose || execLoose.includes(normLoose) || normLoose.includes(execLoose))
    ) {
      return executions[i];
    }
    if (tokens.length > 0 && tokens.every((tok) => execLoose.includes(tok))) {
      return executions[i];
    }
  }
  return null;
}

/**
 * Enforce FR-05 automatic evidence verification on model-reported verification checks.
 * Model claims of `passed` require a matching real shell command in the session with exitCode === 0.
 *
 * @param {Array<object>} reportedChecks
 * @param {Array<ReturnType<typeof extractShellExecutions>[number]>} shellExecutions
 * @param {{ writeOutput?: (checkId: string, text: string) => Promise<string | undefined>, now?: string, taskId?: string, sessionId?: string }} [options]
 * @returns {Promise<{ checks: Array<object>, downgradedCount: number, mismatchedCount: number }>}
 */
export async function verifyReportedChecks(reportedChecks, shellExecutions, options = {}) {
  const checks = [];
  let downgradedCount = 0;
  let mismatchedCount = 0;
  const now = options.now || new Date().toISOString();

  for (let i = 0; i < (reportedChecks || []).length; i++) {
    const raw = reportedChecks[i] || {};
    const title = String(raw.title || `检查 ${i + 1}`).trim();
    const reportedState = raw.state === 'passed' || raw.state === 'failed' || raw.state === 'running' ? raw.state : 'todo';
    const reportedCommand = typeof raw.command === 'string' ? raw.command.trim() : '';
    const note = typeof raw.note === 'string' ? raw.note.trim() : '';
    const matched = findMatchingExecution(reportedCommand, shellExecutions);
    const stableSeed = `${options.sessionId || ''}::${options.taskId || ''}::${title}::${i}`;
    const checkIdHint = raw.id
      ? String(raw.id)
      : `chk-${createHash('sha256').update(stableSeed).digest('hex').slice(0, 10)}`;

    let outputRef;
    if (matched && matched.outputText.length > 320 && typeof options.writeOutput === 'function') {
      outputRef = await options.writeOutput(checkIdHint, matched.outputText);
    }

    if (reportedState === 'passed') {
      if (matched && matched.status === 'passed' && matched.exitCode === 0) {
        checks.push({
          id: raw.id ? String(raw.id) : undefined,
          title,
          state: 'passed',
          command: reportedCommand || matched.command,
          exitCode: 0,
          outputSummary: note || matched.outputSummary,
          ...(outputRef ? { outputRef } : {}),
          verifiedBy: 'evidence',
          evidenceMatched: true,
          startedAt: now,
          finishedAt: now,
        });
      } else if (matched && matched.status === 'failed') {
        mismatchedCount += 1;
        const codeLabel = matched.exitCode === null ? '异常' : String(matched.exitCode);
        checks.push({
          id: raw.id ? String(raw.id) : undefined,
          title,
          state: 'failed',
          command: reportedCommand || matched.command,
          exitCode: matched.exitCode,
          outputSummary: `宿主核对未通过（实际退出码 ${codeLabel}）：${matched.outputSummary}`,
          ...(outputRef ? { outputRef } : {}),
          verifiedBy: undefined,
          evidenceMatched: true,
          startedAt: now,
          finishedAt: now,
        });
      } else {
        downgradedCount += 1;
        const detail = note ? `；原汇报：${note}` : '';
        checks.push({
          id: raw.id ? String(raw.id) : undefined,
          title,
          state: 'todo',
          ...(reportedCommand ? { command: reportedCommand } : {}),
          exitCode: null,
          outputSummary: `未在当前会话找到真实通过的测试执行记录（已降级为未验收）${detail}`,
          verifiedBy: undefined,
          evidenceMatched: false,
          startedAt: now,
          finishedAt: null,
        });
      }
      continue;
    }

    if (reportedState === 'failed') {
      const failedExitCode =
        matched && matched.status === 'failed'
          ? matched.exitCode
          : (typeof raw.exitCode === 'number' && raw.exitCode !== 0 ? raw.exitCode : null);
      checks.push({
        id: raw.id ? String(raw.id) : undefined,
        title,
        state: 'failed',
        ...(reportedCommand || matched?.command ? { command: reportedCommand || matched.command } : {}),
        exitCode: failedExitCode,
        outputSummary: note || matched?.outputSummary || '检查失败',
        ...(outputRef ? { outputRef } : {}),
        verifiedBy: undefined,
        evidenceMatched: Boolean(matched),
        startedAt: now,
        finishedAt: now,
      });
      continue;
    }

    checks.push({
      id: raw.id ? String(raw.id) : undefined,
      title,
      state: reportedState,
      ...(reportedCommand || matched?.command ? { command: reportedCommand || matched.command } : {}),
      exitCode: null,
      outputSummary: note || matched?.outputSummary || (reportedState === 'running' ? '执行中' : '待检查'),
      ...(outputRef ? { outputRef } : {}),
      verifiedBy: undefined,
      evidenceMatched: Boolean(matched),
      startedAt: now,
      finishedAt: null,
    });
  }

  return { checks, downgradedCount, mismatchedCount };
}
