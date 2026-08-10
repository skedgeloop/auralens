import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'crypto';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'out');
const htmlPath = join(outDir, 'index.html');
if (!existsSync(htmlPath)) {
  console.log('no index.html — skipping');
  process.exit(0);
}

let html = readFileSync(htmlPath, 'utf8');

// 1. Inline internal CSS links
const cssLinks = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/_next\/static\/css\/[^"]+\.css)"[^>]*>/g)];
let inlinedCount = 0;
for (const m of cssLinks) {
  const href = m[1];
  const filePath = join(outDir, href.replace(/^\//, ''));
  if (!existsSync(filePath)) { console.log('missing css:', href); continue; }
  const css = readFileSync(filePath, 'utf8');
  html = html.replace(m[0], `<style data-inline-css>${css}</style>`);
  inlinedCount++;
}

// 2. Remove the now-dead preload to the inlined CSS
html = html.replace(/<link[^>]*rel="preload"[^>]*\/_next\/static\/css\/[^"]+\.css"[^>]*>/g, '');

// 3. Remove the external Google Fonts stylesheet link — Next already inlines its
// @font-face rules, so the network request is redundant and render-blocking.
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '');

// 4. Remove the legacy polyfills chunk script (91KB) — modern browsers have
// flat/flatMap/fromEntries/trimStart/trimEnd natively.
html = html.replace(/<script[^>]*nomodule[^>]*src="[^"]*polyfills-[^"]*"[^>]*><\/script>/g, '');

// 6. Inject provenance comment in <head>
const watermark = `<!-- AURA-PROVENANCE:${Buffer.from(
  JSON.stringify({
    origin: 'AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens',
    build: new Date().toISOString(),
    license: 'AGPL-3.0 OR Commercial'
  }).toString('base64')
)} -->\n`;

html = html.replace(/<head[^>]*>/, match => match + '\n' + watermark);

writeFileSync(htmlPath, html, 'utf8');
console.log(`inlined ${inlinedCount} CSS file(s), removed dead preload + fonts link + polyfills`);