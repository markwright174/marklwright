import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const outputDir = resolve('dist');
const staticPaths = [
  'about',
  'artifacts',
  'assets',
  'contact',
  'experience',
  'portfolio',
  'study',
  '_redirects',
  'index.html',
];

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}

mkdirSync(outputDir, { recursive: true });

for (const path of staticPaths) {
  const source = resolve(path);
  if (!existsSync(source)) continue;
  cpSync(source, join(outputDir, path), { recursive: true });
}

console.log(`Built Cloudflare Pages assets in ${outputDir}`);
