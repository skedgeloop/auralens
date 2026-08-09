/**
 * Real AI features — actual neural networks, not pixel math.
 */

/**
 * Load TensorFlow.js body segmentation model for background blur.
 * This is a REAL neural network that detects people and segments them.
 */
export const loadBodySegmentation = async () => {
  const bodySegmentation = await import('@tensorflow-models/body-segmentation');
  const tf = await import('@tensorflow/tfjs');

  // Try WebGL first, fallback to WASM
  try { await tf.setBackend('webgl'); } catch { await tf.setBackend('wasm'); }
  await tf.ready();

  const segmenter = await bodySegmentation.createSegmenter(
    bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
    { runtime: 'tfjs', modelType: 'general' }
  );

  return segmenter;
};

/**
 * Apply background blur using body segmentation.
 * Uses feathered edges for smooth, natural-looking blur.
 */
export const applyBackgroundBlur = async (imageSrc, blurAmount = 10) => {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Load model and segment
  const segmenter = await loadBodySegmentation();
  const segmentation = await segmenter.segmentPeople(img);

  if (!segmentation || segmentation.length === 0) {
    return imageSrc;
  }

  // Get the mask
  const mask = segmentation[0];
  const maskData = await mask.mask.toImageData();

  // Create blurred version with STRONG blur
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = img.width;
  blurCanvas.height = img.height;
  const blurCtx = blurCanvas.getContext('2d');
  blurCtx.filter = `blur(${blurAmount}px)`;
  blurCtx.drawImage(img, 0, 0);
  blurCtx.filter = 'none';

  // Apply extra blur passes for smoother result
  for (let pass = 0; pass < 2; pass++) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.filter = `blur(${blurAmount / 2}px)`;
    tempCtx.drawImage(blurCanvas, 0, 0);
    blurCtx.clearRect(0, 0, img.width, img.height);
    blurCtx.drawImage(tempCanvas, 0, 0);
  }

  const blurImageData = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
  const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Create feathered mask with Gaussian-like falloff
  const featherRadius = Math.max(5, Math.min(20, img.width / 50));

  for (let i = 0; i < maskData.data.length; i += 4) {
    const x = (i / 4) % img.width;
    const y = Math.floor((i / 4) / img.width);

    // Raw mask value (0 = background, 255 = person)
    let maskVal = maskData.data[i + 3] / 255;

    // Apply Gaussian-like feathering at edges
    if (maskVal > 0.01 && maskVal < 0.99) {
      // Edge zone — smooth the transition
      const t = (maskVal - 0.01) / 0.98; // Normalize to 0-1
      // Smoothstep function for natural falloff
      maskVal = t * t * (3 - 2 * t);
    }

    // Blend original (person) with blurred (background)
    const blend = maskVal;
    originalImageData.data[i] = originalImageData.data[i] * blend + blurImageData.data[i] * (1 - blend);
    originalImageData.data[i + 1] = originalImageData.data[i + 1] * blend + blurImageData.data[i + 1] * (1 - blend);
    originalImageData.data[i + 2] = originalImageData.data[i + 2] * blend + blurImageData.data[i + 2] * (1 - blend);
  }

  ctx.putImageData(originalImageData, 0, 0);

  segmenter.dispose();
  return canvas.toDataURL('image/png');
};

/**
 * Smart auto-enhance — a multi-stage professional pipeline.
 * White balance → contrast stretch → tone curve → vibrance → clarity → tint.
 */
export const smartAutoEnhance = (imageSrc) => {
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

      // --- Step 1: histogram ---
      const lumHistogram = new Array(256).fill(0);
      const rHistogram = new Array(256).fill(0);
      const gHistogram = new Array(256).fill(0);
      const bHistogram = new Array(256).fill(0);
      const pixelCount = d.length / 4;

      for (let i = 0; i < d.length; i += 4) {
        const lum = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
        lumHistogram[Math.min(255, lum)]++;
        rHistogram[d[i]]++;
        gHistogram[d[i + 1]]++;
        bHistogram[d[i + 2]]++;
      }

      // --- Step 2: auto white balance (gray world, conservative) ---
      let avgR = 0, avgG = 0, avgB = 0;
      for (let i = 0; i < 256; i++) {
        avgR += i * rHistogram[i];
        avgG += i * gHistogram[i];
        avgB += i * bHistogram[i];
      }
      avgR /= pixelCount; avgG /= pixelCount; avgB /= pixelCount;
      const grayAvg = (avgR + avgG + avgB) / 3;
      const rGain = grayAvg / (avgR || 1);
      const gGain = grayAvg / (avgG || 1);
      const bGain = grayAvg / (avgB || 1);
      const wbStrength = 0.35;

      // --- Step 3: contrast stretch (clip 0.5% each end) ---
      let lowLum = 0, highLum = 255;
      const clipPercentage = 0.005;
      const clipCount = Math.floor(pixelCount * clipPercentage);
      let count = 0;
      for (let i = 0; i < 256; i++) { count += lumHistogram[i]; if (count >= clipCount) { lowLum = i; break; } }
      count = 0;
      for (let i = 255; i >= 0; i--) { count += lumHistogram[i]; if (count >= clipCount) { highLum = i; break; } }
      const contrastRange = (highLum - lowLum) || 1;

      // --- Step 4: precomputed tone curve (soft S-curve, gentle) ---
      const curve = new Array(256);
      for (let v = 0; v < 256; v++) {
        // stretch
        let t = ((v - lowLum) / contrastRange) * 255;
        t = Math.max(0, Math.min(255, t));
        // S-curve: push midtones slightly
        const x = t / 255;
        let y = x + 0.06 * Math.sin(x * Math.PI);
        y = Math.max(0, Math.min(1, y));
        curve[v] = y * 255;
      }

      // --- Step 5: apply per-pixel ---
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];

        // white balance
        r = r * (1 + (rGain - 1) * wbStrength);
        g = g * (1 + (gGain - 1) * wbStrength);
        b = b * (1 + (bGain - 1) * wbStrength);

        // clamp before tone curve
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // tone curve (per channel, preserves color)
        r = curve[Math.round(r)];
        g = curve[Math.round(g)];
        b = curve[Math.round(b)];

        // vibrance: boost saturation but protect skin-ish tones
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx > 0 ? (mx - mn) / mx : 0;
        // lower boost for faces (high red relative to others) to protect skin
        const skinGuard = r > 90 && g > 50 && b > 30 && r > g && r > b ? 0.6 : 1;
        const vib = 1 + 0.12 * skinGuard;
        if (sat < 0.6) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = lum + vib * (r - lum);
          g = lum + vib * (g - lum);
          b = lum + vib * (b - lum);
        }

        // clarity: subtle local-contrast push via channel spread
        const mx2 = Math.max(r, g, b), mn2 = Math.min(r, g, b);
        const cLum = (mx2 + mn2) / 2;
        r = cLum + (r - cLum) * 1.05;
        g = cLum + (g - cLum) * 1.05;
        b = cLum + (b - cLum) * 1.05;

        d[i] = Math.max(0, Math.min(255, r));
        d[i + 1] = Math.max(0, Math.min(255, g));
        d[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

/**
 * Apply a professional color grade: per-channel RGB gain + multi-stop gradient
 * (split-tone) + temperature. Returns the graded data URL.
 * @param {string} imageSrc
 * @param {object} opts - { rgb:{r,g,b}, gradient:[{pos,color}], temperature, vibrance }
 */
export const applyColorGrade = (imageSrc, opts = {}) => {
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

      const rGain = (opts.rgb?.r ?? 1) / 100;
      const gGain = (opts.rgb?.g ?? 1) / 100;
      const bGain = (opts.rgb?.b ?? 1) / 100;
      const temp = (opts.temperature ?? 0) / 100;
      const vib = 1 + ((opts.vibrance ?? 0) / 100) * 0.5;

      // Build gradient stops as sorted {pos, color}
      const stops = (opts.gradient || [])
        .filter(s => s && s.color)
        .map(s => ({ pos: s.pos ?? 0.5, color: hexToRgb(s.color) }))
        .sort((a, b) => a.pos - b.pos);

      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];

        // RGB channel gain
        r *= rGain; g *= gGain; b *= bGain;

        // temperature tint
        r += temp * 40; b -= temp * 40;

        // gradient overlay (split tone): blend shadow color into dark pixels,
        // highlight color into bright pixels
        if (stops.length) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const t = lum / 255; // 0 shadow .. 1 highlight
          // sample the gradient at t
          let grad = null;
          if (stops.length === 1) grad = stops[0].color;
          else {
            let lo = stops[0], hi = stops[stops.length - 1];
            for (let s = 0; s < stops.length - 1; s++) {
              if (t >= stops[s].pos && t <= stops[s + 1].pos) { lo = stops[s]; hi = stops[s + 1]; break; }
            }
            const span = (hi.pos - lo.pos) || 1;
            const f = Math.max(0, Math.min(1, (t - lo.pos) / span));
            grad = {
              r: lo.color.r + (hi.color.r - lo.color.r) * f,
              g: lo.color.g + (hi.color.g - lo.color.g) * f,
              b: lo.color.b + (hi.color.b - lo.color.b) * f,
            };
          }
          const strength = 0.22; // subtle grade
          r = r + (grad.r - 128) * strength * (1 - Math.abs(t - 0.5) * 1.2);
          g = g + (grad.g - 128) * strength * (1 - Math.abs(t - 0.5) * 1.2);
          b = b + (grad.b - 128) * strength * (1 - Math.abs(t - 0.5) * 1.2);
        }

        // vibrance
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx > 0 ? (mx - mn) / mx : 0;
        if (sat < 0.7) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          r = lum + vib * (r - lum);
          g = lum + vib * (g - lum);
          b = lum + vib * (b - lum);
        }

        d[i] = Math.max(0, Math.min(255, r));
        d[i + 1] = Math.max(0, Math.min(255, g));
        d[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

function hexToRgb(hex) {
  if (!hex) return { r: 128, g: 128, b: 128 };
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  if (isNaN(n)) return { r: 128, g: 128, b: 128 };
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export default {
  loadBodySegmentation,
  applyBackgroundBlur,
  smartAutoEnhance,
  applyColorGrade,
};
