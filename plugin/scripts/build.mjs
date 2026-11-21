import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');
const body = await readFile(join(root, 'src', 'client.js'), 'utf8');
const iconDarkDataUrl = `data:image/png;base64,${(await readFile(join(root, 'assets', 'tab-icon-dark.png'))).toString('base64')}`;
const iconLightDataUrl = `data:image/png;base64,${(await readFile(join(root, 'assets', 'tab-icon-light.png'))).toString('base64')}`;

const artifact = [
  'window.__ModuleLoader__.load({',
  `  id: ${JSON.stringify(pkg.name)},`,
  '  factory: (require) => {',
  '    var module = { exports: {} };',
  '    var exports = module.exports;',
  `    const STYLE_CSS = ${JSON.stringify(css)};`,
  `    const ICON_DARK_DATA_URL = ${JSON.stringify(iconDarkDataUrl)};`,
  `    const ICON_LIGHT_DATA_URL = ${JSON.stringify(iconLightDataUrl)};`,
  body.replace(/\n$/, ''),
  '    return module.exports;',
  '  }',
  '});',
  '',
].join('\n');

await mkdir(join(root, 'lib'), { recursive: true });
await writeFile(join(root, 'lib', 'client.js'), artifact, 'utf8');
console.log(`[dsh-slate build] wrote lib/client.js (${artifact.length} bytes)`);
