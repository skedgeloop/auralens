/**
 * Runnable self-check for the frequency-separation layer math (no frameworks, no DOM).
 * Run: node scripts/frequencySep.test.mjs
 */
import { frequencyLayers } from '../src/lib/frequencyLayers.mjs';
import assert from 'node:assert/strict';

// Small random RGBA pair.
const w = 4, h = 3, n = w * h * 4;
const orig = new Uint8ClampedArray(n);
const low = new Uint8ClampedArray(n);
for (let i = 0; i < n; i++) {
  orig[i] = Math.floor(Math.random() * 256);
  low[i] = Math.floor(Math.random() * 256);
}

// amt=1 → combined is exactly the original (round-trips through the two layers).
const { high, combined } = frequencyLayers(orig, low, 1);
assert.deepEqual(combined, orig, 'combined at amt=1 equals original');

// high = orig - low + 128, clamped to 0-255.
for (let i = 0; i < n; i += 4) {
  assert.equal(high[i], Math.max(0, Math.min(255, orig[i] - low[i] + 128)), `high R clamp at ${i}`);
  assert.equal(high[i + 1], Math.max(0, Math.min(255, orig[i + 1] - low[i + 1] + 128)), `high G clamp at ${i}`);
  assert.equal(high[i + 2], Math.max(0, Math.min(255, orig[i + 2] - low[i + 2] + 128)), `high B clamp at ${i}`);
  assert.equal(high[i + 3], orig[i + 3], `high alpha passes through at ${i}`);
}

// amt=0 → combined RGB equals the low layer.
const { combined: c0 } = frequencyLayers(orig, low, 0);
for (let i = 0; i < n; i += 4) {
  assert.equal(c0[i], low[i], `amt=0 R at ${i}`);
  assert.equal(c0[i + 1], low[i + 1], `amt=0 G at ${i}`);
  assert.equal(c0[i + 2], low[i + 2], `amt=0 B at ${i}`);
}

// Mid amount is a strict blend between the endpoints, never outside them.
const { combined: cMid } = frequencyLayers(orig, low, 0.5);
for (let i = 0; i < n; i += 4) {
  for (let c = 0; c < 3; c++) {
    const v = cMid[i + c];
    assert.ok(v >= Math.min(orig[i + c], low[i + c]) && v <= Math.max(orig[i + c], low[i + c]), `mid blend within endpoints at ${i}+${c}`);
  }
}

// Identical layers → zero detail (high all 128) and combined == orig.
const flat = new Uint8ClampedArray(orig.length);
flat.set(orig);
const { high: hFlat, combined: cFlat } = frequencyLayers(orig, flat, 1);
for (let i = 0; i < n; i += 4) {
  assert.equal(hFlat[i], 128, `no-detail high R is neutral at ${i}`);
  assert.equal(cFlat[i], orig[i], `no-detail combined equals orig at ${i}`);
}

console.log('frequencySep: all checks passed');
