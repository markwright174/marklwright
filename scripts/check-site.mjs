import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = [];
const localPaths = [];
const canonicalNav = (await readFile(path.join(root, 'index.html'), 'utf8'))
  .match(/<nav class="nav" aria-label="Primary navigation">([\s\S]*?)<\/nav>/)?.[1]
  .replace(/ aria-current="page"/g, '')
  .replace(/\s+/g, ' ')
  .trim();

if (!canonicalNav) throw new Error('Homepage is missing primary navigation');

async function walk(dir) {
  for (const entry of await readdir(dir)) {
    if (entry === '.git' || entry === '.tmp' || entry === 'node_modules' || entry === 'artifacts' || entry === 'dist') continue;
    const full = path.join(dir, entry);
    const info = await stat(full);
    if (info.isDirectory()) await walk(full);
    else if (entry.endsWith('.html')) htmlFiles.push(full);
  }
}

function routeToFile(href) {
  if (href === '/') return path.join(root, 'index.html');
  const clean = href.replace(/^\//, '').replace(/\/$/, '');
  return path.join(root, clean, 'index.html');
}

await walk(root);

for (const file of htmlFiles) {
  const text = await readFile(file, 'utf8');
  if (!text.includes('<title>')) throw new Error(`${file} is missing a title`);
  if (!text.includes('name="description"')) throw new Error(`${file} is missing a description`);

  if (text.includes('<header class="site-header">')) {
    const nav = text.match(/<nav class="nav" aria-label="Primary navigation">([\s\S]*?)<\/nav>/)?.[1];
    const normalized = nav?.replace(/ aria-current="page"/g, '').replace(/\s+/g, ' ').trim();
    if (normalized !== canonicalNav) throw new Error(`${file} has inconsistent primary navigation`);

    const route = '/' + path.relative(root, path.dirname(file)).replaceAll('\\', '/');
    const activeRoute = route === '/' ? null : route.startsWith('/portfolio') ? '/portfolio/' : `${route}/`;
    const activeLinks = [...nav.matchAll(/<a aria-current="page" href="([^"]+)"/g)].map((match) => match[1]);
    if (activeLinks.length !== (activeRoute ? 1 : 0) || (activeRoute && activeLinks[0] !== activeRoute)) {
      throw new Error(`${file} has incorrect active navigation`);
    }
  }

  for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (url.startsWith('/') && !url.startsWith('//')) localPaths.push({ file, url });
  }

  for (const match of text.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    if (!/rel="[^"]*noopener/.test(match[0])) throw new Error(`${file} opens a tab without noopener`);
  }
}

for (const { file, url } of localPaths) {
  const pathname = url.split(/[?#]/, 1)[0];
  const target = path.extname(pathname) ? path.join(root, pathname.slice(1)) : routeToFile(pathname);
  try {
    await stat(target);
  } catch {
    throw new Error(`${file} links to missing local path ${url}`);
  }
}

console.log(`Checked ${htmlFiles.length} HTML files and ${localPaths.length} local paths.`);
