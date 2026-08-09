/**
 * Image filter utilities for applying real-time filters using canvas.
 */

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
 * Suggest filters based on detected objects
 * @param {Array} detectedObjects - The detected objects from AI
 * @returns {Array} - List of suggested filter names
 */
export const suggestFilters = (detectedObjects) => {
  if (!detectedObjects || detectedObjects.length === 0) {
    return ['vintage', 'warm'];
  }

  const suggestions = [];
  const hasPerson = detectedObjects.some(obj => obj.label === 'person');
  const hasSky = detectedObjects.some(obj => obj.label === 'sky' || obj.label === 'cloud');
  const hasNature = detectedObjects.some(obj =>
    ['tree', 'plant', 'mountain', 'grass', 'flower'].includes(obj.label)
  );

  if (hasPerson) {
    suggestions.push('warm', 'vintage');
  }
  if (hasSky) {
    suggestions.push('cool', 'highContrast');
  }
  if (hasNature) {
    suggestions.push('vintage', 'sepia');
  }

  // Always have at least one suggestion
  if (suggestions.length === 0) {
    suggestions.push('vintage');
  }

  return [...new Set(suggestions)];
};

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
  blendImages,
  rotateImage,
  flipImage,
  cropImage,
  getImageDimensions,
  applyFilterToDataUrl,
  loadImage,
  createFilterPreviews,
  suggestFilters,
  FILTERS,
  FILTER_CATEGORIES,
  prepareCanvas,
};
