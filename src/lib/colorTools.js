/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Curves & Levels color tools — pure Canvas 2D, no dependencies.
 * Follows the same Image→canvas→pixels→dataURL pattern as imageFilters.js.
 */

const clamp255 = (v) => Math.max(0, Math.min(255, v));

const identityPoints = () => [[0, 0], [255, 255]];

/**
 * Build a 256-entry LUT from control points using monotone cubic
 * (Fritsch–Carlson) interpolation. Points are [[in,out],...] with 0-255.
 * @param {number[][]} points
 * @returns {Uint8ClampedArray} - 256 values
 */
export const buildCurveLut = (points) => {
  const lut = new Uint8ClampedArray(256);

  const pts = (points || [])
    .filter((p) => Array.isArray(p) && p.length >= 2 && isFinite(p[0]) && isFinite(p[1]))
    .map((p) => [clamp255(Math.round(p[0])), clamp255(Math.round(p[1]))])
    .sort((a, b) => a[0] - b[0]);

  // Dedupe x values (keep last y) so a zero-width segment can't occur.
  const xs = [];
  const ys = [];
  for (const [x, y] of pts) {
    if (xs.length && xs[xs.length - 1] === x) ys[ys.length - 1] = y;
    else { xs.push(x); ys.push(y); }
  }

  if (xs.length < 2) {
    for (let i = 0; i < 256; i++) lut[i] = i;
    return lut;
  }

  const n = xs.length;

  // Secant slopes
  const m = new Array(n - 1);
  for (let i = 0; i < n - 1; i++) m[i] = (ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]);

  // Tangents (Fritsch–Carlson)
  const d = new Array(n);
  d[0] = m[0];
  d[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    d[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  }

  let seg = 0;
  for (let x = 0; x < 256; x++) {
    while (seg < n - 2 && x >= xs[seg + 1]) seg++;

    let y;
    if (x <= xs[0]) {
      y = ys[0] + (x - xs[0]) * d[0]; // linear extrapolation before first point
    } else if (x >= xs[n - 1]) {
      y = ys[n - 1] + (x - xs[n - 1]) * d[n - 1]; // linear extrapolation past last point
    } else {
      const h = xs[seg + 1] - xs[seg];
      const t = (x - xs[seg]) / h;
      const t2 = t * t, t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      y = h00 * ys[seg] + h10 * h * d[seg] + h01 * ys[seg + 1] + h11 * h * d[seg + 1];
    }

    lut[x] = clamp255(Math.round(y));
  }
  return lut;
};

const composeLuts = (a, b) => {
  const out = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) out[i] = b[a[i]];
  return out;
};

const isIdentity = (lut) => {
  for (let i = 0; i < 256; i++) if (lut[i] !== i) return false;
  return true;
};

/**
 * Apply per-channel curves.
 * @param {string} imageSrc - Image data URL
 * @param {object} opts - { master, r, g, b } — each an array of [[in,out],...]
 * @returns {Promise<string>} - Curved image data URL
 */
export const applyCurves = (imageSrc, opts = {}) => {
  // Master applies to all channels; per-channel curves compose on top.
  const master = buildCurveLut(opts.master || identityPoints());
  const rLUT = composeLuts(master, buildCurveLut(opts.r));
  const gLUT = composeLuts(master, buildCurveLut(opts.g));
  const bLUT = composeLuts(master, buildCurveLut(opts.b));

  if (isIdentity(rLUT) && isIdentity(gLUT) && isIdentity(bLUT)) {
    return Promise.resolve(imageSrc);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        d[i] = rLUT[d[i]];
        d[i + 1] = gLUT[d[i + 1]];
        d[i + 2] = bLUT[d[i + 2]];
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Apply levels (black/white point + gamma remap).
 * @param {string} imageSrc - Image data URL
 * @param {object} opts - { blackPoint, whitePoint, gamma }
 * @returns {Promise<string>} - Adjusted image data URL
 */
export const applyLevels = (imageSrc, { blackPoint = 0, whitePoint = 255, gamma = 1 } = {}) => {
  blackPoint = clamp255(Number(blackPoint) || 0);
  whitePoint = clamp255(Number(whitePoint) || 255);
  gamma = Number(gamma) || 1;
  if (gamma <= 0) gamma = 1;
  const range = whitePoint - blackPoint;
  if (range <= 0) return Promise.resolve(imageSrc);

  const lut = new Uint8ClampedArray(256);
  const invGamma = 1 / gamma;
  for (let v = 0; v < 256; v++) {
    const t = Math.max(0, Math.min(1, (v - blackPoint) / range));
    lut[v] = clamp255(Math.pow(t, invGamma) * 255);
  }

  if (isIdentity(lut)) return Promise.resolve(imageSrc);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      for (let i = 0; i < d.length; i += 4) {
        d[i] = lut[d[i]];
        d[i + 1] = lut[d[i + 1]];
        d[i + 2] = lut[d[i + 2]];
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

export default { buildCurveLut, applyCurves, applyLevels };
