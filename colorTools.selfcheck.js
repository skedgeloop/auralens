/* Self-check for applyHSL / applyColorBalance / applyHueBand.
 * Runs in Node with stubbed browser APIs. No frameworks.
 * Usage: node colorTools.selfcheck.js
 */
const assert = require('assert');

// --- Browser stubs ---
const pixels = new Uint8ClampedArray([255, 0, 0, 255]); // one red pixel
const fakeCanvas = () => ({
  width: 1, height: 1,
  getContext: () => ({
    drawImage() {},
    getImageData() { return { data: pixels }; },
    putImageData() {},
  }),
  toDataURL: () => 'data:image/jpeg;base64,ok',
});
global.document = { createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}) };
global.Image = class {
  set src(v) { this.onload && this.onload(); }
  get src() { return ''; }
};
global.HTMLCanvasElement = function () {};
global.HTMLImageElement = function () {};
global.OffscreenCanvas = function () {};

const { applyHSL, applyColorBalance, applyHueBand } = require('./src/lib/imageFilters');

(async () => {
  // Identity: neutral HSL params must return source unchanged.
  assert.strictEqual(await applyHSL('x', {}), 'x');
  assert.strictEqual(await applyColorBalance('x', {}), 'x');
  assert.strictEqual(await applyHueBand('x', {}), 'x');

  // Non-neutral must process (returns stubbed data URL).
  const hsl = await applyHSL('x', { hue: 45 });
  assert.strictEqual(hsl, 'data:image/jpeg;base64,ok');

  const bal = await applyColorBalance('x', { shadows: { c: 50, m: 0, y: 0 } });
  assert.strictEqual(bal, 'data:image/jpeg;base64,ok');

  const band = await applyHueBand('x', { hueStart: 330, hueEnd: 30, satScale: 1.5, lightScale: 1 });
  assert.strictEqual(band, 'data:image/jpeg;base64,ok');

  console.log('colorTools.selfcheck: OK (identity + processing paths)');
})().catch((e) => { console.error('colorTools.selfcheck FAILED:', e.message); process.exit(1); });
