/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Runnable self-check for the median-cut palette core (no frameworks, no DOM).
 * Run: node scripts/medianCut.test.mjs
 */
import { medianCutPalette } from '../src/lib/medianCut.mjs';
import assert from 'node:assert/strict';

// Build a 12x12 image: left half pure red, right half pure blue.
const w = 12, h = 12;
const data = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (x < 6) { data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; }
    else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 255; }
    data[i + 3] = 255;
  }
}

const two = medianCutPalette(data, 5);
assert.equal(two.length, 2, 'only 2 distinct colors exist');
const hexes = two.map((c) => c.hex).sort();
assert.deepEqual(hexes, ['#0000ff', '#ff0000'], 'both red and blue found');
assert.ok(two.every((c) => Math.abs(c.share - 0.5) < 1e-9), 'red and blue are 50/50');

// Solid-color image collapses to a single swatch.
const solid = new Uint8ClampedArray(8 * 8 * 4);
solid.fill(200);
const one = medianCutPalette(solid, 5);
assert.equal(one.length, 1, 'solid image yields one color');
assert.equal(one[0].hex, '#c8c8c8');

// Transparent-only image yields no colors.
const transparent = new Uint8ClampedArray(8 * 8 * 4);
transparent.fill(0); // alpha = 0
assert.equal(medianCutPalette(transparent, 5).length, 0, 'no opaque pixels');

// Shares always sum to ~1.
const sum = two.reduce((n, c) => n + c.share, 0);
assert.ok(Math.abs(sum - 1) < 1e-9, 'shares sum to 1');

console.log('medianCut: all checks passed');
