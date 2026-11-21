import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// 1. Build lib/client.js
execFileSync(process.execPath, [join(root, 'scripts', 'build.mjs')], { stdio: 'inherit' });

// 2. Validate built client bundle syntax & monochrome rules
const builtClient = await readFile(join(root, 'lib', 'client.js'), 'utf8');
assert.ok(builtClient.includes('window.__ModuleLoader__.load'), 'client bundle must use __ModuleLoader__');
new Function('window', builtClient);

const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');
assert.equal(/#(?:338a65|4e745d|4176e6|5268c7|f5f1e9)/i.test(css), false, 'styles.css must not retain prototype green, blue, or paper colors');

// 3. Execute all unit & multi-process integration tests
execFileSync(process.execPath, ['--test', 'test/domain.test.mjs', 'test/store.test.mjs', 'test/rpc.test.mjs'], {
  cwd: root,
  stdio: 'inherit',
});

console.log('[dsh-slate verify] build, syntax, monochrome check, and unit/concurrency tests PASSED');
