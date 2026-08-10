// Post-build performance cleanup for the static export:
//  1. Inline the small critical CSS into index.html (kills the render-blocking
//     stylesheet request — Lighthouse "Render-blocking resources").
//  2. Remove the now-dead <link rel="preload"> to the inlined CSS.
//  3. Remove the external Google Fonts stylesheet link — Next already inlines
//     its @font-face rules, so the network request is redundant.
//  4. Remove the legacy <script nomodule> polyfills chunk (91KB) — modern
//     browsers have flat/flatMap/fromEntries/trimStart/trimEnd natively.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

// 2. Remove dead preload to the now-inlined CSS
html = html.replace(/<link[^>]*rel="preload"[^>]*\/_next\/static\/css\/[^"]+\.css"[^>]*>/g, '');

// 3. Remove external Google Fonts link (redundant — @font-face already inline)
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="https:\/\/fonts\.googleapis\.com[^>]*>/g, '');

// 4. Remove the legacy polyfills script tag
html = html.replace(/<script[^>]*nomodule[^>]*src="[^"]*polyfills-[^"]*"[^>]*><\/script>/g, '');

writeFileSync(htmlPath, html, 'utf8');
console.log(`inlined ${inlinedCount} CSS file(s); removed dead preload + fonts link + polyfills script`);
