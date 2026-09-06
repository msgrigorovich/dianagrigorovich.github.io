import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const rootPath = fileURLToPath(root);
const pages = ['index.html', 'projects.html', 'resume.html', 'contact.html'];
const scripts = [
  'assets/js/main.js',
  'assets/js/projects.js',
  'assets/js/resume.js',
  'assets/js/contact.js',
  'assets/js/analytics.js'
];
const productionAssets = [
  'assets/css/style.min.css',
  'assets/vendor/gsap.min.js',
  ...scripts.map(path => path.replace(/\.js$/, '.min.js'))
];
const failures = [];

function source(path) {
  return readFileSync(new URL(path, root), 'utf8');
}

for (const page of pages) {
  const html = source(page);
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]);
  const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicates.length) failures.push(`${page}: duplicate ids: ${duplicates.join(', ')}`);

  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
    .map(match => match[1].split(/[?#]/)[0])
    .filter(value => value.startsWith('/') && value !== '/');

  for (const reference of references) {
    const localPath = reference.slice(1);
    if (!extname(localPath)) continue;
    if (!existsSync(join(rootPath, localPath))) {
      failures.push(`${page}: missing ${reference}`);
    }
  }

  const productionReferences = [...html.matchAll(/\b(?:src|href)=["'](\/assets\/(?:css|js|vendor)\/[^"']+)["']/g)]
    .map(match => match[1]);
  for (const reference of productionReferences) {
    if (!reference.includes('?v=')) failures.push(`${page}: unversioned production asset ${reference}`);
    const [pathname, query = ''] = reference.split('?');
    const version = new URLSearchParams(query).get('v');
    const assetPath = join(rootPath, pathname.slice(1));
    if (existsSync(assetPath) && version) {
      const expected = createHash('sha256').update(readFileSync(assetPath)).digest('hex').slice(0, 10);
      if (version !== expected) failures.push(`${page}: stale fingerprint for ${pathname}`);
    }
  }
}

const css = source('assets/css/style.css').replace(/\/\*[\s\S]*?\*\//g, '');
let braceBalance = 0;
for (const character of css) {
  if (character === '{') braceBalance += 1;
  if (character === '}') braceBalance -= 1;
  if (braceBalance < 0) break;
}
if (braceBalance !== 0) failures.push(`assets/css/style.css: brace balance ${braceBalance}`);

for (const script of scripts) {
  if (!existsSync(new URL(script, root))) failures.push(`missing ${script}`);
}
for (const asset of productionAssets) {
  if (!existsSync(new URL(asset, root))) failures.push(`missing production asset ${asset}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Verified ${pages.length} pages, ${scripts.length} scripts and local asset references.`);
}
