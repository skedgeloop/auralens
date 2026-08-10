/**
 * Runnable self-check for the flood-fill core (no frameworks, no DOM).
 * Run: node scripts/floodFill.test.mjs
 */
import { floodFill } from '../src/lib/floodFill.mjs';
import assert from 'node:assert/strict';

// Build a 8x6 RGBA image: red left half, blue right half.
const w = 8, h = 6;
const data = new Uint8ClampedArray(w * h * 4);
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (x < 4) { data[i] = 255; data[i + 1] = 0; data[i + 2] = 0; }
    else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 255; }
    data[i + 3] = 255;
  }
}
const img = { data, width: w, height: h };

// tolerance=0 (exact match) from a red pixel selects exactly the 4 red columns.
const exact = floodFill(img, 0, 0, 0);
assert.equal(exact.length, w * h);
assert.equal(exact.reduce((n, v) => n + v, 0), 4 * h, 'exact select covers the red half');

// tolerance=100 selects the whole image.
const all = floodFill(img, 0, 0, 255 * 255 * 3);
assert.equal(all.reduce((n, v) => n + v, 0), w * h, 'tolerance=100 selects everything');

// Blue seed selects the blue half only.
const blue = floodFill(img, 7, 5, 0);
assert.equal(blue.reduce((n, v) => n + v, 0), 4 * h, 'blue seed covers the blue half');

// Out-of-bounds seed returns an empty mask without throwing.
const oob = floodFill(img, -1, -1, 100);
assert.equal(oob.reduce((n, v) => n + v, 0), 0, 'out-of-bounds seed selects nothing');

// Big image (4000x3000 solid) must not overflow the stack.
const bigW = 4000, bigH = 3000;
const big = new Uint8ClampedArray(bigW * bigH * 4);
big.fill(128);
const bigSel = floodFill({ data: big, width: bigW, height: bigH }, 0, 0, 255 * 255 * 3);
assert.equal(bigSel.reduce((n, v) => n + v, 0), bigW * bigH, 'large image fills without stack overflow');

console.log('floodFill: all checks passed');
