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
  'research-launch.js', 'research-preview/index.html', 'research-preview/style.css',
  'research-preview/app.mjs', 'research-preview/model.mjs', 'research-preview/book.mjs',
  manifest.background.service_worker,
  ...(manifest.content_scripts ?? []).flatMap(script => script.js ?? []),
  ...(manifest.web_accessible_resources ?? []).flatMap(group => group.resources),
  ...[...html.matchAll(/(?:src|href)=["']\.\/([^"']+)["']/g)].map(match => match[1]),
]);
for (const file of files) await access(new URL(file, root));
await mkdir(new URL('dist/', root), {recursive: true});
for (const file of files) {
  const target=new URL(`dist/${file}`, root);
  await mkdir(new URL('./',target),{recursive:true});
  await copyFile(new URL(file, root),target);
}
console.log(`Packaged Slide Lab ${manifest.version}: ${files.size} files in dist/`);
