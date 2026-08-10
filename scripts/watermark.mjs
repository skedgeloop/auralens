// Aura provenance watermarker — run with `node scripts/watermark.mjs`.
// Idempotent: skips any file that already contains the marker string.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARK = 'AURA-ORIGIN:skedgeloop@proton.me';
const HEADER = `/* ${MARK}|github:skedgeloop|auralens */\n`;
const HTML_MARK = '<!-- AURA-PROVENANCE:skedgeloop@proton.me|github:skedgeloop|auralens -->';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = ['src', 'pages', 'functions', 'scripts'];
const skipDirs = new Set(['node_modules', '.git', '.next', 'out', 'goodversion']);
const EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.css', '.json']);

let stamped = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTS.has(extname(entry.name))) stamp(full);
  }
}

function stamp(file) {
  let content = readFileSync(file, 'utf8');
  if (content.includes(MARK)) return; // already stamped
  if (file.endsWith('.json')) return; // JSON can't hold a comment
  writeFileSync(file, HEADER + content, 'utf8');
  stamped++;
  console.log(`stamped ${file}`);
}

for (const d of dirs) {
  try { walk(join(root, d)); } catch { console.log(`skipping ${d} (not present)`); }
}

// Stamp the built HTML after a `next build`.
try {
  const htmlPath = join(root, 'out', 'index.html');
  let html = readFileSync(htmlPath, 'utf8');
  if (!html.includes(HTML_MARK)) {
    if (html.includes('<head>')) {
      html = html.replace('<head>', '<head>' + HTML_MARK);
      writeFileSync(htmlPath, html, 'utf8');
      stamped++;
      console.log(`stamped ${htmlPath}`);
    } else {
      console.log('out/index.html: no <head> found, skipping');
    }
  }
} catch {
  console.log('out/index.html not found, skipping');
}

console.log(`stamped ${stamped} files`);
