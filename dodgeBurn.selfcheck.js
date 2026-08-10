/* Self-check for applyDodgeBurn.
 * Runs in Node with stubbed browser APIs. No frameworks.
 * Usage: node dodgeBurn.selfcheck.js
 */
const assert = require('assert');

// --- Browser stubs: a 3x3 canvas whose pixels we can inspect after putImageData ---
let outPixels = null;
const fakeCanvas = () => ({
  width: 3, height: 3,
  getContext: () => ({
    drawImage() {},
    getImageData() { return { data: new Uint8ClampedArray([
      20, 20, 20, 255,   50, 50, 50, 255,   20, 20, 20, 255,
      50, 50, 50, 255,  128, 128, 128, 255,  50, 50, 50, 255,
      20, 20, 20, 255,   50, 50, 50, 255,   20, 20, 20, 255,
    ]) }; },
    putImageData(imageData) { outPixels = Array.from(imageData.data); },
  }),
  toDataURL: () => 'data:image/png;base64,ok',
});
global.document = { createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}) };
global.Image = class {
  width = 3;
  height = 3;
  set src(v) { this.onload && this.onload(); }
  get src() { return ''; }
};

const { applyDodgeBurn } = require('./src/lib/imageFilters');

const px = (x, y) => outPixels[(y * 3 + x) * 4]; // R channel of pixel (x, y)

(async () => {
  // No strokes -> source unchanged.
  assert.strictEqual(await applyDodgeBurn('x', {}), 'x');
  assert.strictEqual(await applyDodgeBurn('x', { strokes: [] }), 'x');

  // Burn: full-strength stroke on the center pixel (mid gray 128), midtones only.
  // Falloff (1 - 0/radius) = 1, gate = 1, amount = 1 -> 128 * (1 - 1) = 0.
  await applyDodgeBurn('x', { strokes: [
    { x: 1, y: 1, radius: 2, strength: 1, mode: 'burn', range: 'midtones' },
  ] });
  assert.strictEqual(outPixels[(4) * 4], 0, 'burn midtones should zero the center');
  assert.strictEqual(outPixels[(1) * 4], 50, 'shadow pixel (lum 50) outside midtones gate untouched');

  // Dodge: full-strength stroke on a shadow pixel (lum 20), shadows only -> -> 255.
  await applyDodgeBurn('x', { strokes: [
    { x: 0, y: 0, radius: 2, strength: 1, mode: 'dodge', range: 'shadows' },
  ] });
  assert.strictEqual(px(0, 0), 255, 'dodge shadows should white-out the shadow pixel');
  assert.strictEqual(px(1, 1), 128, 'midtone pixel outside shadows gate untouched');

  // Range gating: dodge on a shadow pixel gated to highlights does nothing.
  await applyDodgeBurn('x', { strokes: [
    { x: 0, y: 0, radius: 2, strength: 1, mode: 'dodge', range: 'highlights' },
  ] });
  assert.strictEqual(px(0, 0), 20, 'highlights gate should exclude the shadow pixel');

  // Soft radial falloff: corner pixel (dx=1, dy=1, dist=sqrt(2)) of radius-2 stroke
  // gets amount = 1 * 1 * (1 - 1.414/2) ~= 0.293. Dodge on shadows: 20 + 235*0.293 ~= 89.
  await applyDodgeBurn('x', { strokes: [
    { x: 1, y: 1, radius: 2, strength: 1, mode: 'dodge', range: 'shadows' },
  ] });
  assert.ok(Math.abs(px(0, 0) - 89) < 3, `falloff corner dodge ~89, got ${px(0, 0)}`);

  console.log('dodgeBurn.selfcheck: OK (identity, burn, dodge, tonal gating, falloff)');
})().catch((e) => { console.error('dodgeBurn.selfcheck FAILED:', e.message); process.exit(1); });
