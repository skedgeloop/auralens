/**
 * Image filter utilities for applying real-time filters using canvas.
 */
import { floodFill } from './floodFill.mjs';
import { medianCutPalette } from './medianCut.mjs';
import { frequencyLayers } from './frequencyLayers.mjs';

/**
 * Create a canvas with the image drawn on it
 * @param {string|HTMLImageElement} imageSrc - The image source or element
 * @returns {Object} - { canvas, ctx, img }
 */
const prepareCanvas = (imageSrc) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve({ canvas, ctx, img });
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
};

/**
 * Apply a grayscale filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyGrayscale = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a sepia filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applySepia = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a high contrast filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyHighContrast = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const newValue = avg > 128 ? 250 : 0;
    data[i] = newValue;
    data[i + 1] = newValue;
    data[i + 2] = newValue;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a vintage filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyVintage = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189 + 20);
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168 + 10);
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131 - 10);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a blur filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyBlur = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const inputImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
  ctx.filter = 'blur(3px)';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.filter = 'none';

  const offscreen = new OffscreenCanvas(canvas.width, canvas.height);
  const octx = offscreen.getContext('2d');
  octx.putImageData(inputImage, 0, 0);

  ctx.filter = 'blur(3px)';
  ctx.drawImage(offscreen, 0, 0);
  ctx.filter = 'none';

  return canvas.toDataURL('image/png');
};

/**
 * Shared helper: draw an image (optionally downscaled for speed) into a canvas,
 * run a per-pixel processor, scale back up, and return a new data URL.
 * @param {string} imageSrc - Image data URL
 * @param {{ radius: number, downscaleAt?: number }} opts - When radius > downscaleAt the working canvas is drawn at 50%.
 * @param {(p: { imageData: ImageData, w: number, h: number, scale: number }) => ImageData} process
 * @returns {Promise<string>}
 */
const blurWorker = (imageSrc, { radius, downscaleAt = 8 }, process) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const scale = radius > downscaleAt ? 0.5 : 1;
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      const imageData = process({ imageData: ctx.getImageData(0, 0, w, h), w, h, scale });
      ctx.putImageData(imageData, 0, 0);
      if (scale < 1) {
        const full = document.createElement('canvas');
        full.width = img.width;
        full.height = img.height;
        full.getContext('2d').drawImage(canvas, 0, 0, img.width, img.height);
        resolve(full.toDataURL('image/png'));
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Single-pass separable box blur on an RGBA pixel buffer (edge-clamped).
 * Returns a new buffer; leaves `src` untouched.
 */
const boxBlur = (src, w, h, radius) => {
  const r = Math.max(1, radius);
  const div = 2 * r + 1;
  const tmp = new Uint8ClampedArray(src.length);
  const out = new Uint8ClampedArray(src.length);

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    let accR = 0, accG = 0, accB = 0, accA = 0;
    for (let k = -r; k <= r; k++) {
      const xx = k < 0 ? 0 : k >= w ? w - 1 : k;
      const i = row + xx * 4;
      accR += src[i]; accG += src[i + 1]; accB += src[i + 2]; accA += src[i + 3];
    }
    for (let x = 0; x < w; x++) {
      const o = row + x * 4;
      tmp[o] = accR / div; tmp[o + 1] = accG / div; tmp[o + 2] = accB / div; tmp[o + 3] = accA / div;
      const addX = x + r + 1 < w ? x + r + 1 : w - 1;
      const remX = x - r > 0 ? x - r : 0;
      const ai = row + addX * 4;
      const ri = row + remX * 4;
      accR += src[ai] - src[ri];
      accG += src[ai + 1] - src[ri + 1];
      accB += src[ai + 2] - src[ri + 2];
      accA += src[ai + 3] - src[ri + 3];
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let accR = 0, accG = 0, accB = 0, accA = 0;
    for (let k = -r; k <= r; k++) {
      const yy = k < 0 ? 0 : k >= h ? h - 1 : k;
      const i = (yy * w + x) * 4;
      accR += tmp[i]; accG += tmp[i + 1]; accB += tmp[i + 2]; accA += tmp[i + 3];
    }
    for (let y = 0; y < h; y++) {
      const o = (y * w + x) * 4;
      out[o] = accR / div; out[o + 1] = accG / div; out[o + 2] = accB / div; out[o + 3] = accA / div;
      const addY = y + r + 1 < h ? y + r + 1 : h - 1;
      const remY = y - r > 0 ? y - r : 0;
      const ai = (addY * w + x) * 4;
      const ri = (remY * w + x) * 4;
      accR += tmp[ai] - tmp[ri];
      accG += tmp[ai + 1] - tmp[ri + 1];
      accB += tmp[ai + 2] - tmp[ri + 2];
      accA += tmp[ai + 3] - tmp[ri + 3];
    }
  }

  return out;
};

/**
 * Approximate a disk (bokeh) blur with three cascaded box passes.
 */
const blurDisk = (src, w, h, radius) => {
  let current = src;
  for (let pass = 0; pass < 3; pass++) {
    current = boxBlur(current, w, h, radius);
  }
  return current;
};

/**
 * 1-D Gaussian kernel for unsharp masking. `radius` maps to sigma (clamped to
 * at least 0.5 so the kernel is never degenerate).
 */
const gaussianKernel1D = (radius) => {
  const sigma = Math.max(0.5, radius);
  const half = Math.max(1, Math.round(radius));
  const size = half * 2 + 1;
  const kernel = new Float32Array(size);
  let sum = 0;
  for (let i = -half; i <= half; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + half] = v;
    sum += v;
  }
  for (let i = 0; i < size; i++) kernel[i] /= sum;
  return kernel;
};

/**
 * Separable Gaussian blur on an RGBA pixel buffer (edge-clamped).
 * Returns a new buffer; leaves `src` untouched.
 */
const gaussianBlur1D = (src, w, h, kernel) => {
  const half = (kernel.length - 1) >> 1;
  const len = src.length;
  const tmp = new Float32Array(len);
  const out = new Uint8ClampedArray(len);

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kernel.length; k++) {
        const sx = x + k - half;
        const i = (row + (sx < 0 ? 0 : sx >= w ? w - 1 : sx)) * 4;
        const wt = kernel[k];
        r += src[i] * wt; g += src[i + 1] * wt; b += src[i + 2] * wt; a += src[i + 3] * wt;
      }
      const o = (row + x) * 4;
      tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b; tmp[o + 3] = a;
    }
  }

  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let k = 0; k < kernel.length; k++) {
        const sy = y + k - half;
        const i = ((sy < 0 ? 0 : sy >= h ? h - 1 : sy) * w + x) * 4;
        const wt = kernel[k];
        r += tmp[i] * wt; g += tmp[i + 1] * wt; b += tmp[i + 2] * wt; a += tmp[i + 3] * wt;
      }
      const o = (y * w + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
    }
  }

  return out;
};

/**
 * Apply a depth-of-field bokeh blur. A radial gradient depth mask keeps the
 * focus point sharp while pixels farther away fall off into a disk-blurred
 * background. Downscales to 50% for the blur pass when radius > 8.
 * @param {string} imageSrc - Image data URL
 * @param {{ radius?: number, intensity?: number, centerX?: number, centerY?: number }} opts
 *   radius 1-20 (blur strength, px at full scale), intensity 0-1 (blend toward full blur),
 *   centerX/centerY focus point in normalized 0-1 coords (default 0.5, 0.5).
 * @returns {Promise<string>} - Blurred image data URL
 */
export const applyBokehBlur = (imageSrc, { radius = 12, intensity = 0.85, centerX = 0.5, centerY = 0.5 } = {}) => {
  const r = Math.max(1, Math.min(20, radius));
  return blurWorker(imageSrc, { radius: r }, ({ imageData, w, h, scale }) => {
    const src = new Uint8ClampedArray(imageData.data);
    const blurred = blurDisk(src, w, h, Math.max(1, Math.round(r * scale)));
    const out = imageData.data;
    const cx = w * (centerX ?? 0.5);
    const cy = h * (centerY ?? 0.5);
    const maxDist = Math.sqrt(
      Math.max(cx, w - 1 - cx) ** 2 + Math.max(cy, h - 1 - cy) ** 2
    ) || 1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        let t = Math.min(1, dist / maxDist);
        t = t * t * (3 - 2 * t); // smoothstep: sharp center → blurred edges
        const alpha = t * intensity;
        out[i]     = src[i]     * (1 - alpha) + blurred[i]     * alpha;
        out[i + 1] = src[i + 1] * (1 - alpha) + blurred[i + 1] * alpha;
        out[i + 2] = src[i + 2] * (1 - alpha) + blurred[i + 2] * alpha;
        out[i + 3] = src[i + 3];
      }
    }
    return imageData;
  });
};

/**
 * Apply a directional motion blur: for each pixel, sample along the line at
 * `angle` degrees over `distance` px, weighted by a Gaussian falloff, clamped
 * to image bounds. Downscales to 50% for the blur pass when distance > 16.
 * @param {string} imageSrc - Image data URL
 * @param {{ angle?: number, distance?: number }} opts - angle 0-360°, distance 0-100px
 * @returns {Promise<string>} - Blurred image data URL
 */
export const applyMotionBlur = (imageSrc, { angle = 0, distance = 20 } = {}) => {
  const dist = Math.max(0, Math.min(100, distance));
  return blurWorker(imageSrc, { radius: dist, downscaleAt: 16 }, ({ imageData, w, h, scale }) => {
    const d = dist * scale;
    if (d < 0.5) return imageData;

    const src = new Uint8ClampedArray(imageData.data);
    const out = imageData.data;
    const rad = (angle % 360) * Math.PI / 180;
    const dirX = Math.cos(rad);
    const dirY = Math.sin(rad);
    const half = d / 2;
    const steps = Math.max(3, Math.ceil(d));
    const sigma = Math.max(0.6, d / 3);

    // Precompute Gaussian weights (centered on the pixel, fall off with distance)
    const weights = new Float32Array(steps);
    let wsum = 0;
    for (let s = 0; s < steps; s++) {
      const t = (s / (steps - 1)) * d - half;
      const wgt = Math.exp(-(t * t) / (2 * sigma * sigma));
      weights[s] = wgt;
      wsum += wgt;
    }
    for (let s = 0; s < steps; s++) weights[s] /= wsum;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let accR = 0, accG = 0, accB = 0, accA = 0;
        for (let s = 0; s < steps; s++) {
          const t = (s / (steps - 1)) * d - half;
          let sx = Math.round(x + t * dirX);
          let sy = Math.round(y + t * dirY);
          sx = sx < 0 ? 0 : sx >= w ? w - 1 : sx;
          sy = sy < 0 ? 0 : sy >= h ? h - 1 : sy;
          const i = (sy * w + sx) * 4;
          const wt = weights[s];
          accR += src[i] * wt;
          accG += src[i + 1] * wt;
          accB += src[i + 2] * wt;
          accA += src[i + 3] * wt;
        }
        const o = (y * w + x) * 4;
        out[o] = accR; out[o + 1] = accG; out[o + 2] = accB; out[o + 3] = accA;
      }
    }
    return imageData;
  });
};

/**
 * Frequency separation: split an image into a color/lighting (low-frequency)
 * layer and a detail/texture (high-frequency) layer, plus a reconstruction.
 * `low` is a gaussian-approximated (3 cascaded box passes) blurred copy;
 * `high` is the per-pixel difference orig - low offset by +128 so it renders
 * as a neutral-gray detail image; `combined` recombines them with
 * `textureAmount` (0-100) scaling how much high-frequency detail is kept
 * (100 = the original image).
 * @param {string} imageSrc - Image data URL
 * @param {{ blurRadius?: number, textureAmount?: number }} opts
 *   blurRadius 1-20 (low-layer blur strength), textureAmount 0-100 (high-layer amount)
 * @returns {Promise<{ low: string, high: string, combined: string }>}
 */
export const frequencySeparate = (imageSrc, { blurRadius = 5, textureAmount = 100 } = {}) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        if (!w || !h) return resolve({ low: imageSrc, high: imageSrc, combined: imageSrc });

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const sctx = srcCanvas.getContext('2d');
        sctx.drawImage(img, 0, 0);
        const orig = new Uint8ClampedArray(sctx.getImageData(0, 0, w, h).data);

        const radius = Math.max(1, Math.min(20, Math.round(blurRadius || 5)));
        const lowPixels = blurDisk(orig, w, h, radius); // color/lighting layer

        // high = orig - low + 128, combined = low + (high - 128) * amt
        const amt = Math.max(0, Math.min(1, (textureAmount ?? 100) / 100));
        const { high: highPixels, combined: combinedPixels } = frequencyLayers(orig, lowPixels, amt);

        const toDataUrl = (pixels) => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').putImageData(new ImageData(pixels, w, h), 0, 0);
          return canvas.toDataURL('image/png');
        };

        resolve({
          low: toDataUrl(lowPixels),
          high: toDataUrl(highPixels),
          combined: toDataUrl(combinedPixels),
        });
      } catch (e) {
        resolve({ low: imageSrc, high: imageSrc, combined: imageSrc });
      }
    };
    img.onerror = () => resolve({ low: imageSrc, high: imageSrc, combined: imageSrc });
    img.src = imageSrc;
  });

/**
 * Classic unsharp mask: sharp = orig + amount * (orig - gaussian(orig)).
 * Threshold (0-255, pixel-diff) suppresses enhancement in smooth/noisy areas.
 * For big images the Gaussian is computed on a downscaled copy and upscaled —
 * blur is low-frequency so the loss is invisible, and it keeps the UI snappy.
 * @param {string} imageSrc - Image data URL
 * @param {{ amount?: number, radius?: number, threshold?: number }} opts
 *   amount 0-3 (e.g. 0.5), radius 0.5-5 (Gaussian sigma in px), threshold 0-100
 * @returns {Promise<string>} - Sharpened image data URL
 */
export const applyUnsharpMask = (imageSrc, { amount = 0.5, radius = 1, threshold = 0 } = {}) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        if (!w || !h) return resolve(imageSrc);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, w, h);
        const src = imageData.data;
        const kernel = gaussianKernel1D(radius);
        let blurred;

        if (w * h <= 1500000) {
          blurred = gaussianBlur1D(src, w, h, kernel);
        } else {
          const factor = Math.sqrt(1500000 / (w * h));
          const sw = Math.max(16, Math.round(w * factor));
          const sh = Math.max(16, Math.round(h * factor));
          const small = document.createElement('canvas');
          small.width = sw;
          small.height = sh;
          const sctx = small.getContext('2d');
          sctx.drawImage(img, 0, 0, sw, sh);
          const smallBlur = gaussianBlur1D(sctx.getImageData(0, 0, sw, sh).data, sw, sh, kernel);
          blurred = new Uint8ClampedArray(src.length);
          for (let y = 0; y < h; y++) {
            const sy = (y * sh) / h;
            for (let x = 0; x < w; x++) {
              sampleBilinear(smallBlur, sw, sh, (x * sw) / w, sy, blurred, (y * w + x) * 4);
            }
          }
        }

        const a = amount;
        const t = threshold;
        for (let i = 0; i < src.length; i += 4) {
          for (let c = 0; c < 3; c++) {
            const orig = src[i + c];
            const diff = orig - blurred[i + c];
            if (Math.abs(diff) > t) {
              const val = orig + a * diff;
              src[i + c] = val < 0 ? 0 : val > 255 ? 255 : val;
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });

/**
 * Apply a brightness boost filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyBrightness = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] + 40);
    data[i + 1] = Math.min(255, data[i + 1] + 40);
    data[i + 2] = Math.min(255, data[i + 2] + 40);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a cool tone filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyCoolTone = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, data[i] - 20);
    data[i + 1] = Math.max(0, data[i + 1] - 10);
    data[i + 2] = Math.min(255, data[i + 2] + 30);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a warm tone filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyWarmTone = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] + 30);
    data[i + 1] = Math.max(0, data[i + 1] - 10);
    data[i + 2] = Math.max(0, data[i + 2] - 20);
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply an invert filter
 * @param {string|HTMLCanvasElement} imageSrc - Image data URL or canvas
 * @returns {string} - Filtered image data URL
 */
export const applyInvert = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Reset filter - return original image
 * @param {string|HTMLImageElement} originalImage - Original image source
 * @param {HTMLCanvasElement} canvas - Canvas to draw the image on
 * @returns {string} - Original image data URL
 */
export const resetFilter = (originalImage) => {
  return originalImage instanceof HTMLImageElement ? originalImage.src : originalImage;
};

/**
 * Apply a dreamy soft-glow filter
 */
export const applyDreamy = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  // Soft glow overlay
  const origData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Slight warm tint
  const data = origData.data;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] + 10);
    data[i+1] = Math.min(255, data[i+1] + 5);
    data[i+2] = Math.min(255, data[i+2] + 15);
  }
  ctx.putImageData(origData, 0, 0);

  // Add soft glow via blur overlay
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(8px)';
  ctx.globalAlpha = 0.25;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/png');
};

/**
 * Apply a neon glow effect
 */
export const applyNeon = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  // Boost saturation and contrast heavily
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
    const sat = 2.0;
    let r = gray + sat * (d[i] - gray);
    let g = gray + sat * (d[i+1] - gray);
    let b = gray + sat * (d[i+2] - gray);

    // Push toward vibrant colors
    const avg = (r + g + b) / 3;
    if (avg > 128) {
      r = Math.min(255, r * 1.1 + 10);
      g = Math.min(255, g * 1.1);
      b = Math.min(255, b * 1.1 + 15);
    }

    d[i] = Math.max(0, Math.min(255, r));
    d[i+1] = Math.max(0, Math.min(255, g));
    d[i+2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(imageData, 0, 0);

  // Slight glow
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = 'blur(4px)';
  ctx.globalAlpha = 0.15;
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  return canvas.toDataURL('image/png');
};

/**
 * Apply a matte/film look (lifted blacks, desaturated)
 */
export const applyMatte = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    // Lift blacks
    let r = d[i] * 0.85 + 35;
    let g = d[i+1] * 0.85 + 30;
    let b = d[i+2] * 0.85 + 40;

    // Slight desaturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = r * 0.75 + gray * 0.25;
    g = g * 0.75 + gray * 0.25;
    b = b * 0.75 + gray * 0.25;

    d[i] = Math.min(255, r);
    d[i+1] = Math.min(255, g);
    d[i+2] = Math.min(255, b);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a cinematic teal-orange look
 */
export const applyCinematic = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const lum = (d[i] + d[i+1] + d[i+2]) / 3;

    let r = d[i], g = d[i+1], b = d[i+2];

    // Shadows → teal
    if (lum < 100) {
      b += (100 - lum) * 0.15;
      g += (100 - lum) * 0.05;
      r -= (100 - lum) * 0.08;
    }
    // Highlights → warm
    if (lum > 155) {
      r += (lum - 155) * 0.12;
      g += (lum - 155) * 0.03;
      b -= (lum - 155) * 0.05;
    }

    // Slight contrast boost
    r = ((r / 255 - 0.5) * 1.15 + 0.5) * 255;
    g = ((g / 255 - 0.5) * 1.15 + 0.5) * 255;
    b = ((b / 255 - 0.5) * 1.15 + 0.5) * 255;

    d[i] = Math.max(0, Math.min(255, r));
    d[i+1] = Math.max(0, Math.min(255, g));
    d[i+2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a classic black & white with richer contrast
 */
export const applyBw = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    // Richer B&W weights
    let gray = 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2];

    // S-curve contrast
    gray = gray / 255;
    gray = gray * gray * (3 - 2 * gray); // smoothstep
    gray = gray * 255;

    d[i] = gray; d[i+1] = gray; d[i+2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply an HDR pop effect (local contrast enhancement)
 */
export const applyHdrPop = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];

    // Aggressive contrast stretch
    r = ((r / 255 - 0.5) * 1.4 + 0.5) * 255;
    g = ((g / 255 - 0.5) * 1.4 + 0.5) * 255;
    b = ((b / 255 - 0.5) * 1.4 + 0.5) * 255;

    // Boost saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const sat = 1.3;
    r = gray + sat * (r - gray);
    g = gray + sat * (g - gray);
    b = gray + sat * (b - gray);

    d[i] = Math.max(0, Math.min(255, r));
    d[i+1] = Math.max(0, Math.min(255, g));
    d[i+2] = Math.max(0, Math.min(255, b));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a Polaroid-style look (faded, warm, slight border feel)
 */
export const applyPolaroid = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    // Warm tone + faded blacks
    let r = d[i] * 0.9 + 25;
    let g = d[i+1] * 0.88 + 20;
    let b = d[i+2] * 0.82 + 30;

    // Slight desaturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = r * 0.8 + gray * 0.2;
    g = g * 0.8 + gray * 0.2;
    b = b * 0.8 + gray * 0.2;

    d[i] = Math.min(255, r);
    d[i+1] = Math.min(255, g);
    d[i+2] = Math.min(255, b);
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply a noir look (high contrast B&W with grain)
 */
export const applyNoir = (imageSrc) => {
  const canvas = imageSrc instanceof HTMLCanvasElement ? imageSrc : null;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return imageSrc;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    let gray = 0.2126 * d[i] + 0.7152 * d[i+1] + 0.0722 * d[i+2];

    // High contrast S-curve
    gray = gray / 255;
    gray = gray < 0.5
      ? 2 * gray * gray
      : 1 - 2 * (1 - gray) * (1 - gray);
    gray = gray * 255;

    // Add subtle grain
    const grain = (Math.random() - 0.5) * 12;
    gray = Math.max(0, Math.min(255, gray + grain));

    d[i] = gray; d[i+1] = gray; d[i+2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Blend two image data URLs together based on a ratio (0=original, 1=filtered).
 * Returns the blended result as a data URL.
 */
export const blendImages = async (originalSrc, filteredSrc, intensity) => {
  if (intensity >= 1) return filteredSrc;
  if (intensity <= 0) return originalSrc;

  return new Promise((resolve) => {
    let loaded = 0;
    const origImg = new Image();
    const filtImg = new Image();
    origImg.crossOrigin = 'Anonymous';
    filtImg.crossOrigin = 'Anonymous';

    const onLoad = () => {
      loaded++;
      if (loaded < 2) return;

      const canvas = document.createElement('canvas');
      canvas.width = origImg.width;
      canvas.height = origImg.height;
      const ctx = canvas.getContext('2d');

      // Draw filtered at full, then overlay original at (1-intensity) with screen blending
      ctx.globalAlpha = 1;
      ctx.drawImage(filtImg, 0, 0);

      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1 - intensity;
      ctx.drawImage(origImg, 0, 0);

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      resolve(canvas.toDataURL('image/png'));
    };

    origImg.onload = onLoad;
    filtImg.onload = onLoad;
    origImg.onerror = () => resolve(originalSrc);
    filtImg.onerror = () => resolve(filteredSrc);

    origImg.src = originalSrc;
    filtImg.src = filteredSrc;
  });
};

/**
 * Apply a rotation to an image data URL.
 * @param {string} imageSrc - Source image
 * @param {number} degrees - Rotation in degrees (90, 180, 270)
 * @returns {Promise<string>} - Rotated image data URL
 */
export const rotateImage = async (imageSrc, degrees) => {
  if (!imageSrc || !degrees) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const rad = (degrees * Math.PI) / 180;
      const abs = Math.abs(degrees % 360);

      if (abs === 90 || abs === 270) {
        canvas.width = img.height;
        canvas.height = img.width;
      } else {
        canvas.width = img.width;
        canvas.height = img.height;
      }

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Flip an image horizontally or vertically.
 * @param {string} imageSrc - Source image
 * @param {string} direction - 'h' for horizontal, 'v' for vertical
 * @returns {Promise<string>} - Flipped image data URL
 */
export const flipImage = async (imageSrc, direction) => {
  if (!imageSrc || !direction) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (direction === 'h') {
        ctx.translate(img.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, img.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Crop an image to a specified rectangle.
 * @param {string} imageSrc - Source image
 * @param {{ x, y, width, height }} area - Crop area in image pixels
 * @returns {Promise<string>} - Cropped image data URL
 */
export const cropImage = async (imageSrc, area) => {
  if (!imageSrc || !area) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = area.width;
      canvas.height = area.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Solve an NxN linear system A·x = b via Gauss-Jordan elimination with
 * partial pivoting. Returns the solution vector, or null if singular.
 */
export function solveLinearSystem(A, b) {
  const n = b.length;
  const M = A.map((row, i) => row.concat(b[i]));

  for (let col = 0; col < n; col++) {
    // Partial pivot: bring the row with the largest |value| in this column up.
    let best = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[best][col])) best = r;
    }
    if (Math.abs(M[best][col]) < 1e-12) return null;
    [M[col], M[best]] = [M[best], M[col]];

    const piv = M[col][col];
    for (let c = col; c <= n; c++) M[col][c] /= piv;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Compute a 3x3 projective homography that maps the 4 points in `src`
 * (as [x, y] pairs) onto the 4 points in `dst`. Uses the standard DLT
 * (direct linear transform): each correspondence yields 2 linear equations
 * in the 8 unknowns (h33 is fixed at 1). Returns the matrix as a nested
 * array, or null if the solve fails (degenerate point set).
 */
export function computeHomography(src, dst) {
  const A = [];
  const b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const [u, v] = dst[i];
    // u = (h00·x + h01·y + h02) / (h20·x + h21·y + 1)  →  h00·x + h01·y + h02 - u·h20·x - u·h21·y = u
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(u, v);
  }
  const h = solveLinearSystem(A, b);
  if (!h) return null;
  return [
    [h[0], h[1], h[2]],
    [h[3], h[4], h[5]],
    [h[6], h[7], 1],
  ];
}

/**
 * Invert a 3x3 matrix, or return null when it is singular.
 */
export function invert3x3(m) {
  const [a, b, c] = m[0];
  const [d, e, f] = m[1];
  const [g, h, i] = m[2];
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  if (Math.abs(det) < 1e-10) return null;
  const inv = 1 / det;
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ];
}

/**
 * Bilinearly sample RGBA from `data` (a Uint8ClampedArray in row-major
 * order) at fractional coordinates (sx, sy) into out[i]..out[i+3].
 */
function sampleBilinear(data, w, h, sx, sy, out, o) {
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(x0 + 1, w - 1);
  const y1 = Math.min(y0 + 1, h - 1);
  const fx = sx - x0;
  const fy = sy - y0;
  const i00 = (y0 * w + x0) * 4;
  const i01 = (y0 * w + x1) * 4;
  const i10 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  for (let c = 0; c < 4; c++) {
    out[o + c] =
      data[i00 + c] * (1 - fx) * (1 - fy) +
      data[i01 + c] * fx * (1 - fy) +
      data[i10 + c] * (1 - fx) * fy +
      data[i11 + c] * fx * fy;
  }
}

/**
 * Apply a perspective (projective) warp to an image.
 * The image's four corners are mapped to the given destination quad and the
 * result is rendered back into a canvas of the original size. Pixels that
 * fall outside the warped quad stay transparent.
 * @param {string} imageSrc - Source image data URL
 * @param {{ topLeft: [number, number], topRight: [number, number], bottomRight: [number, number], bottomLeft: [number, number] }} opts
 * @returns {Promise<string>} - Warped image data URL
 */
export const applyPerspective = async (imageSrc, opts) => {
  if (!imageSrc || !opts) return imageSrc;
  const { topLeft, topRight, bottomRight, bottomLeft } = opts;
  if (!topLeft || !topRight || !bottomRight || !bottomLeft) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        if (!w || !h) return resolve(imageSrc);

        // Homography from image corners -> destination quad; sample via inverse.
        const H = computeHomography(
          [[0, 0], [w, 0], [w, h], [0, h]],
          [topLeft, topRight, bottomRight, bottomLeft]
        );
        if (!H) return resolve(imageSrc);
        const Hinv = invert3x3(H);
        if (!Hinv) return resolve(imageSrc);

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const sctx = srcCanvas.getContext('2d');
        sctx.drawImage(img, 0, 0);
        const srcData = sctx.getImageData(0, 0, w, h).data;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const out = ctx.createImageData(w, h);
        const outData = out.data;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const den = Hinv[2][0] * x + Hinv[2][1] * y + Hinv[2][2];
            if (Math.abs(den) < 1e-9) continue;
            const sx = (Hinv[0][0] * x + Hinv[0][1] * y + Hinv[0][2]) / den;
            const sy = (Hinv[1][0] * x + Hinv[1][1] * y + Hinv[1][2]) / den;
            if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) continue;
            sampleBilinear(srcData, w, h, sx, sy, outData, (y * w + x) * 4);
          }
        }
        ctx.putImageData(out, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Apply a smooth mesh warp to an image.
 * The image is subdivided into an N×N grid (N inferred from `grid`); each
 * node carries a normalized displacement [dx, dy] (fraction of the image
 * width/height). Every output pixel bilinearly interpolates the displacement
 * of its containing cell and samples the source pixel at that offset.
 * @param {string} imageSrc - Source image data URL
 * @param {{ grid: [[number, number], ...], warp: [[number, number], ...] }} opts
 * @returns {Promise<string>} - Warped image data URL
 */
export const applyMeshWarp = async (imageSrc, opts) => {
  if (!imageSrc || !opts) return imageSrc;
  const { grid, warp } = opts;
  if (!grid || !warp || grid.length !== warp.length) return imageSrc;
  const N = Math.round(Math.sqrt(grid.length));
  if (N < 2) return imageSrc;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const w = img.width;
        const h = img.height;
        if (!w || !h) return resolve(imageSrc);

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = w;
        srcCanvas.height = h;
        const sctx = srcCanvas.getContext('2d');
        sctx.drawImage(img, 0, 0);
        const srcData = sctx.getImageData(0, 0, w, h).data;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        const out = ctx.createImageData(w, h);
        const outData = out.data;

        const maxI = N - 1;
        for (let y = 0; y < h; y++) {
          const gy = (y / h) * maxI;
          const j = Math.floor(gy);
          const ty = Math.min(gy - j, 1);
          const j1 = Math.min(j + 1, maxI);
          for (let x = 0; x < w; x++) {
            const gx = (x / w) * maxI;
            const i = Math.floor(gx);
            const tx = Math.min(gx - i, 1);
            const i1 = Math.min(i + 1, maxI);

            const idx = (j * N + i) * 2;
            const idxR = (j * N + i1) * 2;
            const idxB = (j1 * N + i) * 2;
            const idxBR = (j1 * N + i1) * 2;
            const dx =
              (warp[idx] * (1 - tx) + warp[idxR] * tx) * (1 - ty) +
              (warp[idxB] * (1 - tx) + warp[idxBR] * tx) * ty;
            const dy =
              (warp[idx + 1] * (1 - tx) + warp[idxR + 1] * tx) * (1 - ty) +
              (warp[idxB + 1] * (1 - tx) + warp[idxBR + 1] * tx) * ty;

            const sx = x + dx * w;
            const sy = y + dy * h;
            if (sx < 0 || sy < 0 || sx > w - 1 || sy > h - 1) continue;
            sampleBilinear(srcData, w, h, sx, sy, outData, (y * w + x) * 4);
          }
        }
        ctx.putImageData(out, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        resolve(imageSrc);
      }
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Get image dimensions from a data URL.
 * @param {string} imageSrc
 * @returns {Promise<{ width: number, height: number }>}
 */
export const getImageDimensions = (imageSrc) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = imageSrc;
  });

/**
 * Compute 256-bin luminance + RGB histograms for an image.
 * The image is downscaled to at most 512px on its longest edge so the
 * analysis stays instant even on huge photos.
 * @param {string} imageSrc - Image data URL
 * @returns {Promise<{ luminance: number[], r: number[], g: number[], b: number[], avgLuminance: number, darkRatio: number, midRatio: number, brightRatio: number } | null>}
 *   dark/mid/bright ratios are fractions of all pixels (0-1); dark <85, mid 85-170, bright >170.
 */
export const computeHistogram = (imageSrc) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, 512 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;

        const luminance = new Array(256).fill(0);
        const r = new Array(256).fill(0);
        const g = new Array(256).fill(0);
        const b = new Array(256).fill(0);
        let sum = 0;
        let count = 0;

        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const lum = Math.round(0.299 * R + 0.587 * G + 0.114 * B);
          luminance[lum]++;
          r[R]++; g[G]++; b[B]++;
          sum += lum;
          count++;
        }

        const total = count || 1;
        let dark = 0, mid = 0, bright = 0;
        for (let v = 0; v < 256; v++) {
          if (v < 85) dark += luminance[v];
          else if (v <= 170) mid += luminance[v];
          else bright += luminance[v];
        }

        resolve({
          luminance, r, g, b,
          avgLuminance: sum / total,
          darkRatio: dark / total,
          midRatio: mid / total,
          brightRatio: bright / total,
        });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });

/**
 * Compute a 2D chroma vectorscope (R-Y vs B-Y scatter) as a 256×256 PNG data URL.
 * Pixels are sampled on a grid capped at 128px so this stays fast; each grid
 * cell's density is shown on a log scale, tinted by its chroma hue.
 * @param {string} imageSrc - Image data URL
 * @returns {Promise<string>} - 256×256 scope PNG, or '' on failure
 */
export const computeVectorscope = (imageSrc) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, 128 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const d = ctx.getImageData(0, 0, w, h).data;

        const S = 256;
        const grid = new Float32Array(S * S);
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2];
          const Y = 0.299 * R + 0.587 * G + 0.114 * B;
          const u = B - Y; // -255..255
          const v = R - Y; // -255..255
          const xx = Math.min(S - 1, Math.max(0, Math.round(((u / 255) + 1) * (S - 1) / 2)));
          const yy = Math.min(S - 1, Math.max(0, Math.round(((v / 255) + 1) * (S - 1) / 2)));
          grid[yy * S + xx]++;
        }

        let max = 0;
        for (let i = 0; i < grid.length; i++) max = Math.max(max, grid[i]);
        const logMax = Math.log(Math.max(1, max));

        const scope = document.createElement('canvas');
        scope.width = S;
        scope.height = S;
        const sctx = scope.getContext('2d');
        const out = sctx.createImageData(S, S);
        const od = out.data;
        for (let yy = 0; yy < S; yy++) {
          for (let xx = 0; xx < S; xx++) {
            const c = grid[yy * S + xx];
            if (c <= 0) continue;
            const i = (yy * S + xx) * 4;
            const t = Math.max(0, Math.min(1, Math.log(1 + c) / logMax));
            const hue = Math.atan2((2 * yy / (S - 1)) - 1, (2 * xx / (S - 1)) - 1); // -PI..PI
            const [rr, gg, bb] = hslToRgb(((hue * 180 / Math.PI) + 360) % 360, 1, 0.25 + 0.55 * t);
            od[i] = rr; od[i + 1] = gg; od[i + 2] = bb;
            od[i + 3] = Math.round(255 * t);
          }
        }
        sctx.putImageData(out, 0, 0);
        resolve(scope.toDataURL('image/png'));
      } catch (e) {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = imageSrc;
  });

/**
 * Magic wand / selective selection: flood-fill from (startX, startY) using
 * Euclidean RGB distance from the seed pixel. Uses an explicit 8-way stack
 * (see floodFill.mjs) so large images never overflow the call stack.
 * @param {string} imageSrc - Image data URL
 * @param {number} startX - Seed x in image pixels
 * @param {number} startY - Seed y in image pixels
 * @param {number} tolerance - 0-100 (0 = exact match, 100 = entire image)
 * @returns {Promise<{ mask: Uint8Array, width: number, height: number }>}
 */
export const magicWandSelect = async (imageSrc, startX, startY, tolerance = 30) => {
  const { canvas, ctx } = await prepareCanvas(imageSrc);
  const width = canvas.width;
  const height = canvas.height;
  const t = Math.min(100, Math.max(0, tolerance)) / 100;
  const thresholdSq = (255 * 255 * 3) * t * t; // squared max RGB distance, scaled by tolerance
  const mask = floodFill(ctx.getImageData(0, 0, width, height), startX, startY, thresholdSq);
  return { mask, width, height };
};

/**
 * Apply an effect only inside the selection mask.
 * For 'blur' the whole image is blurred first, then blurred pixels are
 * blended in only where mask = 1 (original pixels kept everywhere else).
 * @param {string} imageSrc - Image data URL (must match the mask dimensions)
 * @param {Uint8Array} mask - 1 = selected, 0 = not
 * @param {number} width - Mask width (= image width)
 * @param {number} height - Mask height (= image height)
 * @param {string} effect - 'blur' | 'desaturate' | 'brighten'
 * @returns {Promise<string>} - New image data URL
 */
export const applyMaskedEffect = async (imageSrc, mask, width, height, effect) => {
  const { canvas, ctx } = await prepareCanvas(imageSrc);
  const original = ctx.getImageData(0, 0, width, height);
  const src = original.data;
  let effectData;

  if (effect === 'blur') {
    const offscreen = new OffscreenCanvas(width, height);
    const octx = offscreen.getContext('2d');
    octx.filter = 'blur(3px)';
    octx.drawImage(canvas, 0, 0);
    octx.filter = 'none';
    effectData = octx.getImageData(0, 0, width, height).data;
  } else {
    const effectImage = ctx.getImageData(0, 0, width, height);
    const d = effectImage.data;
    for (let i = 0; i < d.length; i += 4) {
      if (effect === 'desaturate') {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = gray; d[i + 1] = gray; d[i + 2] = gray;
      } else if (effect === 'brighten') {
        d[i] = Math.min(255, d[i] + 40);
        d[i + 1] = Math.min(255, d[i + 1] + 40);
        d[i + 2] = Math.min(255, d[i + 2] + 40);
      }
    }
    effectData = d;
  }

  for (let p = 0; p < width * height; p++) {
    if (!mask[p]) continue;
    const i = p * 4;
    src[i] = effectData[i];
    src[i + 1] = effectData[i + 1];
    src[i + 2] = effectData[i + 2];
  }
  ctx.putImageData(original, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Flip a selection mask (select everything currently unselected).
 * @param {Uint8Array} mask - Input mask
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @returns {Uint8Array} - Inverted mask
 */
export const invertMask = (mask, width, height) => {
  const inverted = new Uint8Array(width * height);
  for (let i = 0; i < inverted.length; i++) inverted[i] = mask[i] ? 0 : 1;
  return inverted;
};

/**
 * Render a selection mask as a low-res tinted PNG data URL (overlay highlight).
 * @param {Uint8Array} mask - 1 = selected, 0 = not
 * @param {number} width - Mask width
 * @param {number} height - Mask height
 * @param {number} scale - Downscale factor (e.g. 0.25 keeps the overlay fast)
 * @returns {string} - PNG data URL (transparent where unselected, pink where selected)
 */
export const maskToDataUrl = (mask, width, height, scale = 0.25) => {
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(sw, sh);
  const d = imageData.data;
  for (let y = 0; y < sh; y++) {
    const sy = Math.min(height - 1, Math.round(y / scale));
    const row = y * sw;
    const srcRow = sy * width;
    for (let x = 0; x < sw; x++) {
      if (mask[srcRow + Math.min(width - 1, Math.round(x / scale))]) {
        const i = (row + x) * 4;
        d[i] = 255; d[i + 1] = 45; d[i + 2] = 111; d[i + 3] = 150;
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Dictionary of all available filters
 */
export const FILTERS = {
  none: { name: 'Original', fn: resetFilter, category: 'basic' },
  grayscale: { name: 'Grayscale', fn: applyGrayscale, category: 'classic' },
  bw: { name: 'Black & White', fn: applyBw, category: 'classic' },
  sepia: { name: 'Sepia', fn: applySepia, category: 'classic' },
  vintage: { name: 'Vintage', fn: applyVintage, category: 'film' },
  polaroid: { name: 'Polaroid', fn: applyPolaroid, category: 'film' },
  cinematic: { name: 'Cinematic', fn: applyCinematic, category: 'film' },
  noir: { name: 'Noir', fn: applyNoir, category: 'film' },
  dreamy: { name: 'Dreamy', fn: applyDreamy, category: 'artistic' },
  neon: { name: 'Neon', fn: applyNeon, category: 'artistic' },
  matte: { name: 'Matte', fn: applyMatte, category: 'artistic' },
  hdrPop: { name: 'HDR Pop', fn: applyHdrPop, category: 'artistic' },
  highContrast: { name: 'High Contrast', fn: applyHighContrast, category: 'mood' },
  blur: { name: 'Blur', fn: applyBlur, category: 'mood' },
  brightness: { name: 'Brightness Boost', fn: applyBrightness, category: 'mood' },
  cool: { name: 'Cool Tone', fn: applyCoolTone, category: 'mood' },
  warm: { name: 'Warm Tone', fn: applyWarmTone, category: 'mood' },
  invert: { name: 'Invert', fn: applyInvert, category: 'mood' },
};

/**
 * Helper: create a canvas from an image data URL and apply a filter
 * @param {string} imageSrc - Image data URL
 * @param {string} filterName - Name of the filter to apply
 * @returns {string} - Filtered image data URL
 */
export const applyFilterToDataUrl = async (imageSrc, filterName) => {
  if (!imageSrc || filterName === 'none') return imageSrc;

  const filter = FILTERS[filterName];
  if (!filter || !filter.fn) return imageSrc;

  try {
    const { canvas, ctx, img } = await prepareCanvas(imageSrc);
    return filter.fn(canvas);
  } catch (error) {
    console.error('Error applying filter:', error);
    return imageSrc;
  }
};

/**
 * ---- Color Balance & HSL (pure Canvas 2D pixel ops) ----
 */

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const clampByte = (v) => Math.max(0, Math.min(255, v));

const rgbToHsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [(h / 6) * 360, s, l];
};

const hslToRgb = (h, s, l) => {
  h = (((h % 360) + 360) % 360) / 360;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
};

const inHueRange = (h, start, end) => (start <= end ? h >= start && h <= end : h >= start || h <= end);

/**
 * Load a data URL, run a per-pixel transform, return a new data URL.
 * @returns {Promise<string>}
 */
const processPixels = (imageSrc, perPixel) =>
  new Promise((resolve) => {
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
      for (let i = 0; i < d.length; i += 4) perPixel(d, i);
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });

/**
 * Shift hue in degrees (wraps 0-360) and scale saturation/lightness (100 = unchanged).
 * @param {string} imageSrc - Image data URL
 * @param {{ hue: number, saturation: number, lightness: number }} opts
 * @returns {Promise<string>}
 */
export const applyHSL = (imageSrc, { hue = 0, saturation = 100, lightness = 100 } = {}) => {
  if (hue === 0 && saturation === 100 && lightness === 100) return Promise.resolve(imageSrc);
  return processPixels(imageSrc, (d, i) => {
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    const [r, g, b] = hslToRgb(h + hue, clamp01(s * (saturation / 100)), clamp01(l * (lightness / 100)));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  });
};

/**
 * Adjust cyan/magenta/yellow per luminance band (shadow <85, midtone 85-170, highlight >170).
 * Each slider is -100..100 (negative = cyan/magenta/yellow, positive = red/green/blue).
 * @param {string} imageSrc - Image data URL
 * @param {{ shadows: {c,m,y}, midtones: {c,m,y}, highlights: {c,m,y} }} opts
 * @returns {Promise<string>}
 */
export const applyColorBalance = (imageSrc, { shadows = {}, midtones = {}, highlights = {} } = {}) => {
  const offsets = [
    { max: 85, r: (shadows.c || 0) * 0.5, g: (shadows.m || 0) * 0.5, b: (shadows.y || 0) * 0.5 },
    { max: 170, r: (midtones.c || 0) * 0.5, g: (midtones.m || 0) * 0.5, b: (midtones.y || 0) * 0.5 },
    { max: 256, r: (highlights.c || 0) * 0.5, g: (highlights.m || 0) * 0.5, b: (highlights.y || 0) * 0.5 },
  ];
  if (!offsets.some((o) => o.r || o.g || o.b)) return Promise.resolve(imageSrc);
  return processPixels(imageSrc, (d, i) => {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const off = offsets[lum < 85 ? 0 : lum < 170 ? 1 : 2];
    d[i] = clampByte(d[i] + off.r);
    d[i + 1] = clampByte(d[i + 1] + off.g);
    d[i + 2] = clampByte(d[i + 2] + off.b);
  });
};

/**
 * Only affect pixels whose hue falls in [hueStart, hueEnd] degrees (wraps 0-360, e.g. Reds 330-30),
 * scaling their saturation/lightness.
 * @param {string} imageSrc - Image data URL
 * @param {{ hueStart: number, hueEnd: number, satScale: number, lightScale: number }} opts
 * @returns {Promise<string>}
 */
export const applyHueBand = (imageSrc, { hueStart = 0, hueEnd = 360, satScale = 1, lightScale = 1 } = {}) => {
  if (satScale === 1 && lightScale === 1) return Promise.resolve(imageSrc);
  return processPixels(imageSrc, (d, i) => {
    const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (!inHueRange(h, hueStart, hueEnd)) return;
    const [r, g, b] = hslToRgb(h, clamp01(s * satScale), clamp01(l * lightScale));
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  });
};

/**
 * Deterministic seeded PRNG output in [0,1) from an integer seed (no Math.random).
 */
const seededRandom = (seed) => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Apply a radial vignette: pixels darken toward the edges. Each pixel's
 * darkening = strength * smoothstep over the band [radius, radius + feather]
 * of the normalized distance from center (0 at center, 1 at the corners).
 * @param {string} imageSrc - Image data URL
 * @param {{ strength?: number, radius?: number, feather?: number }} opts
 *   strength 0-100 (darkening amount), radius 0-1 (where vignette starts),
 *   feather 0-1 (softness of the falloff).
 * @returns {Promise<string>} - Vignetted image data URL
 */
export const applyVignette = async (imageSrc, { strength = 40, radius = 0.5, feather = 0.7 } = {}) => {
  if (!imageSrc) return imageSrc;
  const { canvas, ctx } = await prepareCanvas(imageSrc);
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return imageSrc;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const amt = clamp01(strength / 100);
  const start = clamp01(radius);
  const soft = Math.max(0.001, clamp01(feather));
  const maxDist = Math.SQRT1_2; // sqrt(0.5^2 + 0.5^2) — center to a corner
  for (let y = 0; y < h; y++) {
    const ny = y / h - 0.5;
    for (let x = 0; x < w; x++) {
      const nx = x / w - 0.5;
      const dist = Math.sqrt(nx * nx + ny * ny) / maxDist;
      const t = clamp01((dist - start) / soft);
      const m = 1 - amt * t * t * (3 - 2 * t); // smoothstep
      const i = (y * w + x) * 4;
      d[i] *= m;
      d[i + 1] *= m;
      d[i + 2] *= m;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Apply deterministic per-pixel film grain (±amount). Noise is seeded by pixel
 * position so previews match the committed result exactly. `size` groups the
 * noise into size×size blocks for chunkier grain.
 * @param {string} imageSrc - Image data URL
 * @param {{ amount?: number, size?: number }} opts
 *   amount 0-100 (noise amplitude), size 1-3 (grain block size).
 * @returns {Promise<string>} - Grained image data URL
 */
export const applyFilmGrain = async (imageSrc, { amount = 20, size = 1 } = {}) => {
  if (!imageSrc) return imageSrc;
  const { canvas, ctx } = await prepareCanvas(imageSrc);
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return imageSrc;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;
  const amp = clamp01(amount / 100) * 255;
  const sz = Math.max(1, Math.min(3, Math.round(size) || 1));
  for (let y = 0; y < h; y++) {
    const by = Math.floor(y / sz);
    for (let x = 0; x < w; x++) {
      const seed = (by * 73856093) ^ (Math.floor(x / sz) * 19349663);
      const noise = (seededRandom(seed) - 0.5) * 2 * amp;
      const i = (y * w + x) * 4;
      d[i] = clampByte(d[i] + noise);
      d[i + 1] = clampByte(d[i + 1] + noise);
      d[i + 2] = clampByte(d[i + 2] + noise);
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png');
};

/**
 * Soft tonal-range gate for dodge & burn: returns 1 deep inside the chosen
 * band (shadows <85, midtones 85-170, highlights >170) and fades to 0 across
 * a ~30-luma transition at each band edge.
 */
const toneGate = (lum, range) => {
  const FADE = 30;
  if (range === 'shadows') {
    return lum <= 85 ? 1 : lum < 85 + FADE ? 1 - (lum - 85) / FADE : 0;
  }
  if (range === 'highlights') {
    return lum >= 170 ? 1 : lum > 170 - FADE ? (lum - (170 - FADE)) / FADE : 0;
  }
  // midtones
  if (lum < 85 - FADE) return 0;
  if (lum <= 85) return (lum - (85 - FADE)) / FADE;
  if (lum <= 170) return 1;
  if (lum < 170 + FADE) return 1 - (lum - 170) / FADE;
  return 0;
};

/**
 * Dodge & Burn — lighten (dodge) or darken (burn) pixels within radial brush
 * strokes, gated to a tonal range with soft edges. For each stroke, every
 * pixel inside the brush radius is pushed toward white (dodge) or black
 * (burn) by `strength`, scaled by a soft radial falloff and the tonal gate.
 * @param {string} imageSrc - Image data URL
 * @param {{ strokes: Array<{ x, y, radius, strength, mode: 'dodge'|'burn', range: 'shadows'|'midtones'|'highlights' }> }} opts
 * @returns {Promise<string>} - New image data URL
 */
export const applyDodgeBurn = (imageSrc, { strokes = [] } = {}) => {
  if (!strokes.length) return Promise.resolve(imageSrc);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const w = img.width;
      const h = img.height;
      if (!w || !h) return resolve(imageSrc);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, w, h);
      const d = imageData.data;

      for (const s of strokes) {
        const radius = Math.max(1, s.radius || 40);
        const strength = Math.max(0, Math.min(1, s.strength ?? 0.5));
        const mode = s.mode === 'burn' ? 'burn' : 'dodge';
        const range = s.range || 'midtones';
        const cx = s.x;
        const cy = s.y;
        const r2 = radius * radius;

        // Only walk the stroke's bounding box.
        const x0 = Math.max(0, Math.floor(cx - radius));
        const x1 = Math.min(w - 1, Math.ceil(cx + radius));
        const y0 = Math.max(0, Math.floor(cy - radius));
        const y1 = Math.min(h - 1, Math.ceil(cy + radius));

        for (let y = y0; y <= y1; y++) {
          const dy = y - cy;
          const dy2 = dy * dy;
          for (let x = x0; x <= x1; x++) {
            const dx = x - cx;
            const dist2 = dx * dx + dy2;
            if (dist2 > r2) continue;
            const i = (y * w + x) * 4;
            const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            const gate = toneGate(lum, range);
            if (gate <= 0) continue;
            const amount = strength * gate * (1 - Math.sqrt(dist2) / radius);
            if (amount <= 0) continue;
            if (mode === 'dodge') {
              d[i]     = d[i]     + (255 - d[i]) * amount;
              d[i + 1] = d[i + 1] + (255 - d[i + 1]) * amount;
              d[i + 2] = d[i + 2] + (255 - d[i + 2]) * amount;
            } else {
              d[i]     = d[i]     * (1 - amount);
              d[i + 1] = d[i + 1] * (1 - amount);
              d[i + 2] = d[i + 2] * (1 - amount);
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Load an image element from a source (data URL or URL)
 * @param {string} src - Image source
 * @returns {Promise<HTMLImageElement>}
 */
export const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Generate small preview thumbnails for every filter
 * @param {string} imageSrc - Original image data URL
 * @param {number} width - Thumbnail width in px
 * @returns {Promise<Object>} - Map of filterKey -> thumbnail data URL
 */
export const createFilterPreviews = async (imageSrc, width = 100) => {
  const previews = { none: null };
  if (!imageSrc) return previews;

  try {
    const img = await loadImage(imageSrc);
    const height = Math.max(1, Math.round((img.height / img.width) * width));

    for (const [key, filter] of Object.entries(FILTERS)) {
      if (key === 'none') continue;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      try {
        filter.fn(canvas);
        previews[key] = canvas.toDataURL('image/png');
      } catch {
        previews[key] = null;
      }
    }
  } catch (error) {
    console.error('Failed to generate filter previews:', error);
  }

  return previews;
};

/**
 * Extract the `count` most dominant colors from an image.
 * Median-cut quantization over a downscaled (max 100×100) pixel buffer so
 * huge images stay fast.
 * @param {string} imageSrc - Image data URL
 * @param {number} count - Number of colors to extract (default 5)
 * @returns {Promise<{ hex: string, rgb: [number, number, number], share: number }[]>}
 *   Dominant colors sorted by share (descending).
 */
export const extractPalette = (imageSrc, count = 5) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const scale = Math.min(1, 100 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(medianCutPalette(ctx.getImageData(0, 0, w, h).data, count));
      } catch (e) {
        resolve([]);
      }
    };
    img.onerror = () => resolve([]);
    img.src = imageSrc;
  });

export const FILTER_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'classic', label: 'Classic' },
  { key: 'film', label: 'Film' },
  { key: 'artistic', label: 'Artistic' },
  { key: 'mood', label: 'Mood' },
];

export default {
  applyGrayscale,
  applySepia,
  applyHighContrast,
  applyVintage,
  applyBlur,
  applyBrightness,
  applyCoolTone,
  applyWarmTone,
  applyInvert,
  applyDreamy,
  applyNeon,
  applyMatte,
  applyCinematic,
  applyBw,
  applyHdrPop,
  applyPolaroid,
  applyNoir,
  resetFilter,
  applyBokehBlur,
  applyMotionBlur,
  blendImages,
  rotateImage,
  flipImage,
  frequencySeparate,
  applyUnsharpMask,
  cropImage,
  applyPerspective,
  applyMeshWarp,
  getImageDimensions,
  magicWandSelect,
  applyMaskedEffect,
  invertMask,
  maskToDataUrl,
  applyFilterToDataUrl,
  computeHistogram,
  computeVectorscope,
  applyHSL,
  applyColorBalance,
  applyHueBand,
  applyVignette,
  applyFilmGrain,
  applyDodgeBurn,
  loadImage,
  createFilterPreviews,
  extractPalette,
  FILTERS,
  FILTER_CATEGORIES,
  prepareCanvas,
};
