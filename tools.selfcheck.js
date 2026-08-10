/* Self-check for the hand-rolled EXIF reader (src/lib/exif.js) and the
 * unsharp-mask sharpen (applyUnsharpMask in src/lib/imageFilters.js).
 * Runs in Node with stubbed browser APIs. No frameworks.
 * Usage: node tools.selfcheck.js
 */
const assert = require('assert');

// ---- Browser stubs ----
let imageDims = { width: 3, height: 3 };
const state = { pixels: null, out: null };

global.document = {
  createElement: (tag) => {
    if (tag !== 'canvas') return {};
    return {
      width: 0, height: 0,
      getContext: () => ({
        drawImage() {},
        getImageData() { return { data: state.pixels }; },
        putImageData(id) { state.out = id.data; },
      }),
      toDataURL: () => 'data:image/png;base64,out',
    };
  },
};
global.Image = class {
  constructor() {
    this.width = imageDims.width;
    this.height = imageDims.height;
  }
  set src(v) { this.onload && this.onload(); }
  get src() { return ''; }
};
global.HTMLCanvasElement = function () {};
global.HTMLImageElement = function () {};
global.OffscreenCanvas = function () {};

// ---- EXIF: synthetic JPEG with a real APP1/Exif segment ----
const { parseExifBytes, readExif } = require('./src/lib/exif');

const buildJpegWithExif = () => {
  // TIFF is built standalone so all its internal offsets are correct; the
  // JPEG then wraps it right after "Exif\0\0".
  const tiff = new Uint8Array(184);
  const td = new DataView(tiff.buffer);
  const u16 = (o, v) => td.setUint16(o, v, true);
  const u32 = (o, v) => td.setUint32(o, v, true);
  const ascii = (o, s) => { for (let i = 0; i < s.length; i++) tiff[o + i] = s.charCodeAt(i); };

  tiff[0] = 0x49; tiff[1] = 0x49;      // 'II'
  u16(2, 42);
  u32(4, 8);                           // IFD0 offset = 8
  // IFD0 (3 entries) at offset 8
  u16(8, 3);
  u16(10, 0x010f); u16(12, 2); u32(14, 6); u32(18, 50);   // Make  -> @50
  u16(22, 0x0110); u16(24, 2); u32(26, 6); u32(30, 56);   // Model -> @56
  u16(34, 0x8769); u16(36, 4); u32(38, 1); u32(42, 62);   // Exif IFD -> @62
  u32(46, 0);
  ascii(50, 'Canon\0');
  ascii(56, 'EOS R\0');
  // Exif sub-IFD (5 entries) at offset 62
  u16(62, 5);
  u16(64, 0x8827); u16(66, 3); u32(68, 1); u16(72, 100);       // ISO 100
  u16(76, 0x829a); u16(78, 5); u32(80, 1); u32(84, 128);       // ExposureTime @128
  u16(88, 0x829d); u16(90, 5); u32(92, 1); u32(96, 136);       // FNumber @136
  u16(100, 0x920a); u16(102, 5); u32(104, 1); u32(108, 144);   // FocalLength @144
  u16(112, 0x9003); u16(114, 2); u32(116, 20); u32(120, 152);  // DateTime @152
  u32(124, 0);
  // Rationals + DateTime
  u32(128, 1); u32(132, 125);   // 1/125 s
  u32(136, 2); u32(140, 1);     // f/2
  u32(144, 50); u32(148, 1);    // 50 mm
  ascii(152, '2024:01:02 03:04:05\0');

  // JPEG wrapper: SOI + APP1(len=2+"Exif\0\0"+tiff) + "Exif\0\0" + tiff
  const jpeg = new Uint8Array(12 + tiff.length);
  jpeg[0] = 0xff; jpeg[1] = 0xd8;              // SOI
  jpeg[2] = 0xff; jpeg[3] = 0xe1;              // APP1
  new DataView(jpeg.buffer).setUint16(4, 2 + 6 + tiff.length, false); // big-endian
  for (let i = 0; i < 6; i++) jpeg[6 + i] = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00][i];
  jpeg.set(tiff, 12);
  return jpeg;
};

(async () => {
  // ---- EXIF parse (pure bytes) ----
  const jpeg = buildJpegWithExif();
  const exif = parseExifBytes(jpeg);
  assert.ok(exif, 'EXIF should parse');
  assert.strictEqual(exif.make, 'Canon');
  assert.strictEqual(exif.model, 'EOS R');
  assert.strictEqual(exif.iso, 100);
  assert.strictEqual(exif.exposureTime, 1 / 125);
  assert.strictEqual(exif.fNumber, 2);
  assert.strictEqual(exif.focalLength, 50);
  assert.strictEqual(exif.dateTime, '2024:01:02 03:04:05');

  // JPEG with no EXIF segment (APP0 JFIF only) -> null
  const noExif = new Uint8Array([
    0xff, 0xd8,
    0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0,
    0xff, 0xd9,
  ]);
  assert.strictEqual(parseExifBytes(noExif), null);

  // ---- readExif (data URL + Image stub) ----
  imageDims = { width: 640, height: 480 };
  const dataUrl = `data:image/jpeg;base64,${btoa(String.fromCharCode(...jpeg))}`;
  const r = await readExif(dataUrl);
  assert.strictEqual(r.make, 'Canon');
  assert.strictEqual(r.iso, 100);
  assert.strictEqual(r.width, 640);
  assert.strictEqual(r.height, 480);

  // PNG data URL (no EXIF) -> null
  assert.strictEqual(await readExif('data:image/png;base64,abc'), null);

  // ---- Unsharp mask ----
  const { applyUnsharpMask } = require('./src/lib/imageFilters');
  const makeGrid = () => new Uint8ClampedArray([
    100, 100, 100, 255, 100, 100, 100, 255, 100, 100, 100, 255,
    100, 100, 100, 255, 200, 200, 200, 255, 100, 100, 100, 255,
    100, 100, 100, 255, 100, 100, 100, 255, 100, 100, 100, 255,
  ]);

  imageDims = { width: 3, height: 3 };

  // amount 0 -> pixels untouched
  state.pixels = makeGrid();
  await applyUnsharpMask('x', { amount: 0, radius: 1, threshold: 0 });
  assert.strictEqual(state.out[16], 200);
  assert.strictEqual(state.out[4], 100);

  // amount 1 -> edge boosted (center clamps to 255, neighbors dim)
  state.pixels = makeGrid();
  await applyUnsharpMask('x', { amount: 1, radius: 1, threshold: 0 });
  assert.strictEqual(state.out[16], 255);
  assert.ok(state.out[4] < 100, `neighbor should dim, got ${state.out[4]}`);
  assert.ok(state.out[0] < 100, `corner should dim, got ${state.out[0]}`);

  // threshold 100 suppresses the ~79.6 center diff -> unchanged
  state.pixels = makeGrid();
  await applyUnsharpMask('x', { amount: 1, radius: 1, threshold: 100 });
  assert.strictEqual(state.out[16], 200);

  console.log('tools.selfcheck: OK (exif parse + unsharp mask)');
})().catch((e) => { console.error('tools.selfcheck FAILED:', e.message); process.exit(1); });
