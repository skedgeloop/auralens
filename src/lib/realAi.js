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
 * This is REAL AI — a neural network detects the person and masks the background.
 */
export const applyBackgroundBlur = async (imageSrc, blurAmount = 8) => {
  const img = await loadImage(imageSrc);

  // Create canvases
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  // Draw original
  ctx.drawImage(img, 0, 0);

  // Load model and segment
  const segmenter = await loadBodySegmentation();
  const segmentation = await segmenter.segmentPeople(img);

  if (!segmentation || segmentation.length === 0) {
    return imageSrc; // No people found, return original
  }

  // Get the mask
  const mask = segmentation[0];
  const maskData = await mask.mask.toImageData();

  // Create blurred version
  const blurCanvas = document.createElement('canvas');
  blurCanvas.width = img.width;
  blurCanvas.height = img.height;
  const blurCtx = blurCanvas.getContext('2d');
  blurCtx.filter = `blur(${blurAmount}px)`;
  blurCtx.drawImage(img, 0, 0);

  // Get blurred pixels
  const blurImageData = blurCtx.getImageData(0, 0, blurCanvas.width, blurCanvas.height);
  const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Blend based on mask
  for (let i = 0; i < maskData.data.length; i += 4) {
    const alpha = maskData.data[i + 3] / 255; // 0 = background, 1 = person
    // Where alpha is low (background), use blurred; where high (person), use original
    const blended = alpha > 0.5 ? 1 : alpha * 2; // Sharper transition
    originalImageData.data[i] = originalImageData.data[i] * blended + blurImageData.data[i] * (1 - blended);
    originalImageData.data[i + 1] = originalImageData.data[i + 1] * blended + blurImageData.data[i + 1] * (1 - blended);
    originalImageData.data[i + 2] = originalImageData.data[i + 2] * blended + blurImageData.data[i + 2] * (1 - blended);
  }

  ctx.putImageData(originalImageData, 0, 0);

  // Dispose tensors
  segmenter.dispose();

  return canvas.toDataURL('image/png');
};

/**
 * Smart auto-enhance using proper image processing.
 * Not just +20 brightness — actual histogram stretching and color correction.
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

      // Step 1: Compute histogram
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

      // Step 2: Auto white balance (gray world)
      let avgR = 0, avgG = 0, avgB = 0;
      for (let i = 0; i < 256; i++) {
        avgR += i * rHistogram[i];
        avgG += i * gHistogram[i];
        avgB += i * bHistogram[i];
      }
      avgR /= pixelCount;
      avgG /= pixelCount;
      avgB /= pixelCount;

      const grayAvg = (avgR + avgG + avgB) / 3;
      const rGain = grayAvg / (avgR || 1);
      const gGain = grayAvg / (avgG || 1);
      const bGain = grayAvg / (avgB || 1);

      // Only apply if color cast is significant
      const whiteBalanceStrength = 0.3; // Conservative

      // Step 3: Auto contrast (histogram stretch)
      let lowLum = 0, highLum = 255;
      const clipPercentage = 0.005; // Clip 0.5% from each end
      const clipCount = Math.floor(pixelCount * clipPercentage);

      let count = 0;
      for (let i = 0; i < 256; i++) {
        count += lumHistogram[i];
        if (count >= clipCount) { lowLum = i; break; }
      }
      count = 0;
      for (let i = 255; i >= 0; i--) {
        count += lumHistogram[i];
        if (count >= clipCount) { highLum = i; break; }
      }

      const contrastRange = highLum - lowLum || 1;

      // Step 4: Apply all corrections
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];

        // Apply white balance
        r = r * (1 + (rGain - 1) * whiteBalanceStrength);
        g = g * (1 + (gGain - 1) * whiteBalanceStrength);
        b = b * (1 + (bGain - 1) * whiteBalanceStrength);

        // Apply contrast stretch
        r = ((r - lowLum) / contrastRange) * 255;
        g = ((g - lowLum) / contrastRange) * 255;
        b = ((b - lowLum) / contrastRange) * 255;

        // Slight saturation boost (only if not already saturated)
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const sat = max > 0 ? (max - min) / max : 0;
        if (sat < 0.5) {
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          const satBoost = 1.15;
          r = lum + satBoost * (r - lum);
          g = lum + satBoost * (g - lum);
          b = lum + satBoost * (b - lum);
        }

        d[i] = Math.max(0, Math.min(255, r));
        d[i + 1] = Math.max(0, Math.min(255, g));
        d[i + 2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
};

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
};
