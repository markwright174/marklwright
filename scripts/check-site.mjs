import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const htmlFiles = [];
const hrefs = [];

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
  for (const match of text.matchAll(/href="([^"]+)"/g)) {
    const href = match[1];
    if (href.startsWith('/') && !href.includes('.')) hrefs.push({ file, href });
    if (href === '/assets/styles.css') hrefs.push({ file, href });
  }
}

for (const { file, href } of hrefs) {
  const target = href.endsWith('.css') ? path.join(root, href.replace(/^\//, '')) : routeToFile(href);
  try {
    await stat(target);
  } catch {
    throw new Error(`${file} links to missing local path ${href}`);
  }
}

console.log(`Checked ${htmlFiles.length} HTML files and ${hrefs.length} local links.`);
