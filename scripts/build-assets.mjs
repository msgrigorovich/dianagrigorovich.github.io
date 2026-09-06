import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { transform } from 'lightningcss';
import { minify } from 'terser';

const cssEntries = ['assets/css/style.css'];
const jsEntries = [
  'assets/js/main.js',
  'assets/js/projects.js',
  'assets/js/resume.js',
  'assets/js/contact.js',
  'assets/js/analytics.js'
];
const htmlEntries = ['index.html', 'projects.html', 'resume.html', 'contact.html'];
const vendorEntries = new Map([
  ['node_modules/gsap/dist/gsap.min.js', 'assets/vendor/gsap.min.js']
]);
const productionHashes = new Map();

function productionPath(path) {
  return path.replace(/\.(css|js)$/, '.min.$1');
}

for (const path of cssEntries) {
  const source = await readFile(path);
  const result = transform({ filename: path, code: source, minify: true });
  const output = productionPath(path);
  await writeFile(output, result.code);
  productionHashes.set(output, createHash('sha256').update(result.code).digest('hex').slice(0, 10));
}

for (const path of jsEntries) {
  const source = await readFile(path, 'utf8');
  const result = await minify(source, {
    compress: true,
    mangle: true,
    format: { comments: false }
  });
  if (!result.code) throw new Error(`Terser produced no output for ${path}`);
  const output = productionPath(path);
  const code = `${result.code}\n`;
  await writeFile(output, code);
  productionHashes.set(output, createHash('sha256').update(code).digest('hex').slice(0, 10));
}

for (const [sourcePath, output] of vendorEntries) {
  const code = await readFile(sourcePath);
  await mkdir(new URL('../assets/vendor/', import.meta.url), { recursive: true });
  await writeFile(output, code);
  productionHashes.set(output, createHash('sha256').update(code).digest('hex').slice(0, 10));
}

for (const page of htmlEntries) {
  let html = await readFile(page, 'utf8');
  for (const [path, hash] of productionHashes) {
    const publicPath = `/${path.replaceAll('\\', '/')}`;
    const escapedPath = publicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    html = html.replace(new RegExp(`${escapedPath}(?:\\?v=[^"']*)?`, 'g'), `${publicPath}?v=${hash}`);
  }
  await writeFile(page, html);
}

console.log(`Built and fingerprinted ${cssEntries.length} CSS, ${jsEntries.length} JavaScript and ${vendorEntries.size} vendor assets.`);
