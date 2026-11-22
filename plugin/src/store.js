import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, watch } from 'node:fs';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createEmptyProject } from './domain.js';

const LOCK_TIMEOUT_MS = 15000;
const STALE_LOCK_MS = 15000;
const MAX_OUTPUT_BYTES = 64 * 1024;

/**
 * Canonicalize a workspace path via ancestor `realpath` so symlink aliases
 * (e.g. `/tmp` vs `/private/tmp` on macOS) always map to the same project store.
 * @param {string} rawPath
 * @returns {string}
 */
export function canonicalizeWorkspacePath(rawPath) {
  const input = String(rawPath || '').trim();
  if (!input) return '';

  let current = resolve(input);
  const missing = [];
  while (true) {
    if (existsSync(current)) {
      try {
        const canonical = realpathSync(current);
        return missing.length > 0 ? join(canonical, ...missing.reverse()) : canonical;
      } catch {
        return missing.length > 0 ? join(current, ...missing.reverse()) : current;
      }
    }
    const parent = dirname(current);
    if (parent === current) {
      return missing.length > 0 ? join(current, ...missing.reverse()) : current;
    }
    missing.push(basename(current));
    current = parent;
  }
}

/**
 * Derive a stable filename-safe hash for one canonical workspace path.
 * @param {string} canonicalPath
 * @returns {string}
 */
export function workspaceKey(canonicalPath) {
  return createHash('sha256').update(canonicalPath).digest('hex').slice(0, 24);
}

/**
 * Resolve the storage root inside the active DSH_HOME.
 * @param {string | undefined} dshHome
 * @returns {string}
 */
export function resolveStorageRoot(dshHome) {
  const base = dshHome && String(dshHome).trim()
    ? String(dshHome).trim()
    : (process.env.DSH_HOME && process.env.DSH_HOME.trim()
      ? process.env.DSH_HOME.trim()
      : join(homedir(), '.dsh'));
  return join(base, 'storages', 'dsh-slate');
}

function sleep(ms) {
  return new Promise((done) => setTimeout(done, ms));
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

async function fsyncDirectory(dirPath) {
  if (process.platform === 'win32') return;
  try {
    const handle = await open(dirPath, 'r');
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch {
    // Some virtual filesystems reject O_RDONLY fsync on directories; rename already succeeded.
  }
}

async function writeAtomicJson(filePath, value) {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
  const tmpPath = join(dir, `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  const payload = `${JSON.stringify(value, null, 2)}\n`;
  try {
    const handle = await open(tmpPath, 'wx', 0o600);
    try {
      await handle.writeFile(payload, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmpPath, filePath);
    await fsyncDirectory(dir);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function acquireFileLock(lockPath) {
  await mkdir(dirname(lockPath), { recursive: true });
  const started = Date.now();
  while (true) {
    try {
      const handle = await open(lockPath, 'wx', 0o600);
      try {
        await handle.writeFile(JSON.stringify({ pid: process.pid, ts: Date.now() }), 'utf8');
      } finally {
        await handle.close();
      }
      return async () => {
        await rm(lockPath, { force: true }).catch(() => {});
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;

      let shouldEvict = false;
      try {
        const raw = await readFile(lockPath, 'utf8');
        const info = JSON.parse(raw);
        const age = Date.now() - Number(info?.ts || 0);
        if (age > STALE_LOCK_MS || !isProcessAlive(Number(info?.pid))) {
          shouldEvict = true;
        }
      } catch {
        const lockStat = await stat(lockPath).catch(() => null);
        if (!lockStat || Date.now() - lockStat.mtimeMs > STALE_LOCK_MS) {
          shouldEvict = true;
        }
      }

      if (shouldEvict) {
        await rm(lockPath, { force: true }).catch(() => {});
        continue;
      }

      if (Date.now() - started > LOCK_TIMEOUT_MS) {
        throw new Error(`Timed out waiting for project lock: ${lockPath}`);
      }
      await sleep(8 + Math.floor(Math.random() * 24));
    }
  }
}

function sanitizeFilenameSegment(raw) {
  return String(raw || 'output')
    .replace(/\.\.+/g, '_')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'output';
}

/**
 * Create a workspace-isolated, cross-process lock-protected project store.
 * @param {{ dshHome?: string }} [options]
 */
export function createProjectStore(options = {}) {
  const inProcessTails = new Map();

  function pathsFor(rawWorkspacePath) {
    const canonical = canonicalizeWorkspacePath(rawWorkspacePath);
    if (!canonical) {
      throw new Error('A valid workspacePath is required');
    }
    const root = resolveStorageRoot(options.dshHome);
    const key = workspaceKey(canonical);
    const projectsDir = join(root, 'projects');
    return {
      canonical,
      key,
      root,
      projectsDir,
      filePath: join(projectsDir, `${key}.json`),
      lockPath: join(projectsDir, `${key}.lock`),
      outputsDir: join(root, 'outputs', key),
    };
  }

  async function readExistingOrEmpty(filePath, canonical) {
    try {
      const text = await readFile(filePath, 'utf8');
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && parsed.workspacePath) {
        return parsed;
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        throw new Error(`Failed to read project state at ${filePath}: ${error.message}`);
      }
    }
    return createEmptyProject(canonical);
  }

  function enqueueInProcess(key, fn) {
    const prev = inProcessTails.get(key) || Promise.resolve();
    const next = prev.then(fn, fn);
    const settled = next.finally(() => {
      if (inProcessTails.get(key) === settled) {
        inProcessTails.delete(key);
      }
    });
    inProcessTails.set(key, settled);
    return next;
  }

  return {
    canonicalizeWorkspacePath,

    /**
     * Read the latest persisted project state for a workspace.
     * @param {string} rawWorkspacePath
     */
    async read(rawWorkspacePath) {
      const { canonical, filePath } = pathsFor(rawWorkspacePath);
      return readExistingOrEmpty(filePath, canonical);
    },

    /**
     * Synchronously read the persisted project state for prompt section rendering.
     * Falls back to an empty project view if missing or unreadable.
     * @param {string} rawWorkspacePath
     */
    readSync(rawWorkspacePath) {
      const { canonical, filePath } = pathsFor(rawWorkspacePath);
      try {
        const text = readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && parsed.workspacePath) {
          return parsed;
        }
      } catch {
        // Return empty project snapshot when state file is missing or unreadable.
      }
      return createEmptyProject(canonical);
    },

    /**
     * Write a bounded test-output artifact under the project's controlled output directory.
     * @param {string} rawWorkspacePath
     * @param {string} checkId
     * @param {string} text
     * @returns {Promise<string>}
     */
    async writeOutputArtifact(rawWorkspacePath, checkId, text) {
      const { key, outputsDir } = pathsFor(rawWorkspacePath);
      await mkdir(outputsDir, { recursive: true });
      const safeName = `${sanitizeFilenameSegment(checkId)}.txt`;
      const target = join(outputsDir, safeName);
      let body = String(text || '');
      if (Buffer.byteLength(body, 'utf8') > MAX_OUTPUT_BYTES) {
        body = `${Buffer.from(body, 'utf8').subarray(0, MAX_OUTPUT_BYTES).toString('utf8')}\n...[truncated at 64KiB]\n`;
      }
      const tmp = join(outputsDir, `.${safeName}.${process.pid}.${randomUUID()}.tmp`);
      try {
        const handle = await open(tmp, 'wx', 0o600);
        try {
          await handle.writeFile(body, 'utf8');
          await handle.sync();
        } finally {
          await handle.close();
        }
        await rename(tmp, target);
      } catch (error) {
        await rm(tmp, { force: true }).catch(() => {});
        throw error;
      }
      return `outputs/${key}/${safeName}`;
    },

    /**
     * Perform an atomic, cross-process serialized read-modify-write on one workspace project.
     * @param {string} rawWorkspacePath
     * @param {(project: object, helpers: { workspacePath: string, now: string, writeOutput: (checkId: string, text: string) => Promise<string> }) => Promise<{ project: object, result?: unknown } | object>} updater
     */
    async mutate(rawWorkspacePath, updater) {
      const { canonical, key, filePath, lockPath } = pathsFor(rawWorkspacePath);
      return enqueueInProcess(key, async () => {
        const release = await acquireFileLock(lockPath);
        try {
          const current = await readExistingOrEmpty(filePath, canonical);
          const now = new Date().toISOString();
          const outcome = await updater(current, {
            workspacePath: canonical,
            now,
            writeOutput: (checkId, text) => this.writeOutputArtifact(canonical, checkId, text),
          });
          const nextProject = outcome && typeof outcome === 'object' && 'project' in outcome
            ? outcome.project
            : outcome;
          const result = outcome && typeof outcome === 'object' && 'result' in outcome
            ? outcome.result
            : undefined;
          await writeAtomicJson(filePath, nextProject);
          return { project: nextProject, result };
        } finally {
          await release();
        }
      });
    },

    /**
     * Watch one workspace's project file for cross-process changes (e.g. Headless writes).
     * @param {string} rawWorkspacePath
     * @param {(project: object) => void} listener
     * @returns {() => void}
     */
    watchWorkspace(rawWorkspacePath, listener) {
      const { canonical, key, projectsDir, filePath } = pathsFor(rawWorkspacePath);
      mkdirSync(projectsDir, { recursive: true });
      const targetName = `${key}.json`;
      let closed = false;
      let lastRevision = -1;
      let lastMtimeMs = -1;
      let timer = null;

      const checkChange = async () => {
        if (closed) return;
        try {
          const info = await stat(filePath).catch(() => null);
          const mtimeMs = info ? info.mtimeMs : 0;
          if (mtimeMs === lastMtimeMs) return;
          lastMtimeMs = mtimeMs;
          const project = await readExistingOrEmpty(filePath, canonical);
          if (project.revision !== lastRevision || mtimeMs > 0) {
            lastRevision = project.revision;
            if (!closed) listener(project);
          }
        } catch {
          // Ignore transient read during concurrent rotation; next event or poll retries.
        }
      };

      const scheduleCheck = () => {
        if (closed || timer) return;
        timer = setTimeout(() => {
          timer = null;
          checkChange();
        }, 60);
      };

      let watcher = null;
      try {
        watcher = watch(projectsDir, (_eventType, filename) => {
          if (!filename || String(filename) === targetName) {
            scheduleCheck();
          }
        });
        watcher.on('error', () => {});
      } catch {
        // Fallback polling below keeps updates reliable even without native fs.watch.
      }

      const pollTimer = setInterval(checkChange, 1200);
      if (typeof pollTimer.unref === 'function') pollTimer.unref();

      return () => {
        closed = true;
        if (timer) clearTimeout(timer);
        clearInterval(pollTimer);
        watcher?.close();
      };
    },
  };
}
