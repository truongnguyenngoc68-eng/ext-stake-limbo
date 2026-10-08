import {mkdir, readFile, copyFile, access} from 'node:fs/promises';
// The supplied release is authoritative; src/ contains older sources.
const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
const html = await readFile(new URL('index.html', root), 'utf8');
const files = new Set([
  'manifest.json', 'index.html', 'app.js', 'index.css', 'INSTALL.txt',
  'sidepanel.html', 'sidepanel.js',
  'wallet-reader.js', 'content.js', 'recovery-monitor.js', 'progress-checkpoint-view.js',
  'content-lifecycle.js',
  'telegram-editor.js', 'round-archive.js', 'status-icons.js',
  manifest.background.service_worker,
  ...(manifest.content_scripts ?? []).flatMap(script => script.js ?? []),
  ...(manifest.web_accessible_resources ?? []).flatMap(group => group.resources),
  ...[...html.matchAll(/(?:src|href)=["']\.\/([^"']+)["']/g)].map(match => match[1]),
]);
for (const file of files) await access(new URL(file, root));
await mkdir(new URL('dist/', root), {recursive: true});
for (const file of files) await copyFile(new URL(file, root), new URL(`dist/${file}`, root));
console.log(`Packaged Slide Lab ${manifest.version}: ${files.size} files in dist/`);
