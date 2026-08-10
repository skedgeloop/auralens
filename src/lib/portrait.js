/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Portrait retouching — skin smoothing, teeth whitening, red-eye correction.
 * Pure client-side pixel processing (no API calls). Uses face-api landmarks
 * (when available) to target the eyes and mouth; falls back to conservative
 * color heuristics when no face is detected.
 */

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

let faceapiMod = null;

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) / 100));

const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('face-api timeout')), ms)),
  ]);

// Classic OpenCV skin rule — works on a wide range of skin tones.
const isSkinPixel = (r, g, b) =>
  r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15;

/**
 * Best-effort face + landmark detection. Returns null on ANY failure so
 * callers can always fall back to color heuristics.
 */
async function detectFace(img) {
  if (!faceapiMod) {
    const faceapi = await import('@vladmandic/face-api');
    await withTimeout(faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL), 8000);
    await withTimeout(faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL), 8000);
    faceapiMod = faceapi;
  }
  const detection = await faceapiMod.detectSingleFace(img, new faceapiMod.TinyFaceDetectorOptions())
    .withFaceLandmarks();
  if (!detection) return null;

  const boxOf = (pts) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y);
      x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
    }
    return { x: Math.floor(x0), y: Math.floor(y0), width: Math.ceil(x1 - x0), height: Math.ceil(y1 - y0) };
  };

  const lm = detection.landmarks;
  const mouth = lm.getMouth(); // 20 pts: 0-11 outer lip, 12-19 inner lip
  return {
    mouthBox: boxOf(mouth),
    leftEyeBox: boxOf(lm.getLeftEye()),
    rightEyeBox: boxOf(lm.getRightEye()),
  };
}

/**
 * Downscaled skin mask (maxDim limits compute cost on huge uploads).
 * Feathers the mask so the smoothing blend has no hard edges.
 */
function buildSkinMask(d, w, h, maxDim = 600) {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const mw = Math.max(1, Math.round(w * scale));
  const mh = Math.max(1, Math.round(h * scale));
  const mask = new Uint8Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    const sy = Math.min(h - 1, Math.round(y / scale));
    for (let x = 0; x < mw; x++) {
      const sx = Math.min(w - 1, Math.round(x / scale));
      const i = (sy * w + sx) * 4;
      mask[y * mw + x] = isSkinPixel(d[i], d[i + 1], d[i + 2]) ? 255 : 0;
    }
  }
  // 3x3 box pass softens mask edges.
  const out = new Uint8Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    for (let x = 0; x < mw; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = Math.max(0, Math.min(mh - 1, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.max(0, Math.min(mw - 1, x + dx));
          sum += mask[yy * mw + xx];
        }
      }
      out[y * mw + x] = sum / 9;
    }
  }
  mask.set(out);
  return { mask, mw, mh, scale };
}

// Bilinear sample of the (downscaled) mask at image-space coordinates.
function sampleMask(mask, mw, mh, fx, fy) {
  const x = fx * mw - 0.5;
  const y = fy * mh - 0.5;
  const x0 = Math.max(0, Math.min(mw - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(mh - 1, Math.floor(y)));
  const x1 = Math.min(mw - 1, x0 + 1);
  const y1 = Math.min(mh - 1, y0 + 1);
  const xf = Math.max(0, Math.min(1, x - x0));
  const yf = Math.max(0, Math.min(1, y - y0));
  return mask[y0 * mw + x0] * (1 - xf) * (1 - yf)
    + mask[y0 * mw + x1] * xf * (1 - yf)
    + mask[y1 * mw + x0] * (1 - xf) * yf
    + mask[y1 * mw + x1] * xf * yf;
}

/**
 * Skin smoothing — light gaussian (native canvas blur) restricted to the skin
 * mask, blended back with the original texture so it never looks plasticky.
 * A mild edge-weight keeps strong edges sharp.
 */
function applySkinSmooth(d, w, h, canvas, skin, maskInfo) {
  if (skin <= 0) return;
  const { mask, mw, mh } = maskInfo;

  // Light gaussian copy via the browser's GPU-accelerated filter.
  const smooth = document.createElement('canvas');
  smooth.width = w; smooth.height = h;
  const sctx = smooth.getContext('2d');
  const radius = Math.max(2, Math.min(8, Math.round(Math.min(w, h) / 240)));
  sctx.filter = `blur(${radius}px)`;
  sctx.drawImage(canvas, 0, 0); // canvas still holds ORIGINAL pixels here
  sctx.filter = 'none';
  const sd = sctx.getImageData(0, 0, w, h).data;

  const strength = skin * 0.65;
  for (let y = 0; y < h; y++) {
    const fy = y / h;
    for (let x = 0; x < w; x++) {
      const mv = sampleMask(mask, mw, mh, x / w, fy) / 255;
      if (mv < 0.04) continue;
      const i = (y * w + x) * 4;
      const diff = Math.max(
        Math.abs(d[i] - sd[i]),
        Math.abs(d[i + 1] - sd[i + 1]),
        Math.abs(d[i + 2] - sd[i + 2])
      );
      const edgeW = Math.max(0.3, 1 - diff / 80); // strong edges get less smoothing
      const a = strength * mv * edgeW;
      if (a <= 0.01) continue;
      d[i] = d[i] * (1 - a) + sd[i] * a;
      d[i + 1] = d[i + 1] * (1 - a) + sd[i + 1] * a;
      d[i + 2] = d[i + 2] * (1 - a) + sd[i + 2] * a;
    }
  }
}

/**
 * Teeth whitening — within the mouth landmark box, bright desaturated pixels
 * (teeth) get de-yellowed and lifted. Needs a face; without landmarks there
 * is no way to locate a mouth safely, so this is skipped rather than risk
 * whitening whites anywhere in the frame.
 */
function applyTeethWhitening(d, w, h, face, teeth) {
  if (teeth <= 0 || !face?.mouthBox) return;
  const b = face.mouthBox;
  const x0 = Math.max(0, b.x), y0 = Math.max(0, b.y);
  const x1 = Math.min(w - 1, b.x + b.width), y1 = Math.min(h - 1, b.y + b.height);
  const strength = teeth * 0.85;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i + 1], bl = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl);
      if (lum < 110 || mx - mn > 90 || r - bl > 70) continue; // teeth-ish only
      const amount = strength * Math.min(1, (lum - 110) / 70); // brighter teeth get more
      const deYellow = Math.max(0, r - bl) * 0.7 * amount;
      const lift = 14 * amount;
      d[i] = Math.min(255, r + lift - deYellow * 0.3);
      d[i + 1] = Math.min(255, g + lift + deYellow * 0.2);
      d[i + 2] = Math.min(255, bl + lift + deYellow * 0.85);
    }
  }
}

// Downscaled luminance map used to decide "is this red spike inside a dark pupil?".
function buildDarkMap(d, w, h, maxDim = 240) {
  const scale = Math.min(1, maxDim / Math.max(w, h));
  const mw = Math.max(1, Math.round(w * scale));
  const mh = Math.max(1, Math.round(h * scale));
  const map = new Float32Array(mw * mh);
  for (let y = 0; y < mh; y++) {
    const sy = Math.min(h - 1, Math.round(y / scale));
    for (let x = 0; x < mw; x++) {
      const i = (sy * w + x) * 4;
      map[y * mw + x] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    }
  }
  return { map, mw, mh, scale };
}

function pupilLike(map, mw, mh, scale, x, y) {
  const cx = x * scale, cy = y * scale;
  let dark = 0, total = 0;
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -3; dx <= 3; dx++) {
      const mx = Math.max(0, Math.min(mw - 1, Math.round(cx + dx)));
      const my = Math.max(0, Math.min(mh - 1, Math.round(cy + dy)));
      if (map[my * mw + mx] < 70) dark++;
      total++;
    }
  }
  return dark / total > 0.25;
}

/**
 * Red-eye correction — red-channel spikes (R > 1.8G, R > 1.8B, R > 140) are
 * replaced with a natural dark, desaturated color. With landmarks we target
 * the two eye boxes exactly; without a face we require the spike to sit in
 * dark surroundings (a pupil), which stops red objects in bright scenes from
 * being touched.
 */
function applyRedEye(d, w, h, face, redEye) {
  if (redEye <= 0) return;
  const a = redEye;
  const isRedSpike = (r, g, b) => r > 140 && r > g * 1.8 && r > b * 1.8;

  const correct = (i) => {
    const g = d[i + 1], b = d[i + 2];
    const target = (g + b) / 2 * 0.95; // dark, desaturated
    d[i] = d[i] + (target - d[i]) * a;
    d[i + 1] = g + (target - g) * a;
    d[i + 2] = b + (target - b) * a;
  };

  if (face?.leftEyeBox && face?.rightEyeBox) {
    for (const b of [face.leftEyeBox, face.rightEyeBox]) {
      const x0 = Math.max(0, b.x - 2), y0 = Math.max(0, b.y - 2);
      const x1 = Math.min(w - 1, b.x + b.width + 2), y1 = Math.min(h - 1, b.y + b.height + 2);
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * w + x) * 4;
          if (isRedSpike(d[i], d[i + 1], d[i + 2])) correct(i);
        }
      }
    }
    return;
  }

  // No face — conservative global scan.
  const { map, mw, mh, scale } = buildDarkMap(d, w, h);
  for (let i = 0; i < d.length; i += 4) {
    if (!isRedSpike(d[i], d[i + 1], d[i + 2])) continue;
    const x = (i / 4) % w, y = Math.floor((i / 4) / w);
    if (pupilLike(map, mw, mh, scale, x, y)) correct(i);
  }
}

/**
 * Retouch a portrait image entirely in the browser.
 * @param {string} imageSrc - source image data URL
 * @param {object} opts - { skin, teeth, redEye } each 0-100 intensity
 * @returns {Promise<string>} new image data URL
 */
export const retouchPortrait = async (imageSrc, opts = {}) => {
  const skin = clamp01(opts.skin ?? 0);
  const teeth = clamp01(opts.teeth ?? 0);
  const redEye = clamp01(opts.redEye ?? 0);
  if (skin <= 0 && teeth <= 0 && redEye <= 0) return imageSrc;

  const img = await loadImage(imageSrc);
  const w = img.width, h = img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  // Face landmarks only matter for teeth + red-eye; skin uses pure heuristics,
  // so don't pay the model-load cost when only smoothing is requested.
  let face = null;
  if (teeth > 0 || redEye > 0) {
    try { face = await withTimeout(detectFace(img), 6000); } catch { face = null; }
  }

  if (skin > 0) {
    const maskInfo = buildSkinMask(d, w, h);
    applySkinSmooth(d, w, h, canvas, skin, maskInfo);
  }
  if (teeth > 0) applyTeethWhitening(d, w, h, face, teeth);
  if (redEye > 0) applyRedEye(d, w, h, face, redEye);

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
};

export default { retouchPortrait };
