/**
 * Triple AI Analysis — all models run SERVER-SIDE via Cloudflare Worker.
 * No model downloads in the browser. Just results.
 *
 * 1. Face detection + emotion analysis
 * 2. Vibe/aura classification (CLIP)
 * 3. Object/image classification
 */

// Worker URL — deployed on Cloudflare
const WORKER_URL = 'https://auralens-ai.skedgeloop.workers.dev';

/**
 * Send image to Cloudflare Worker for AI analysis.
 */
export const runTripleAnalysis = async (imageSrc) => {
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageSrc }),
    });

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    const data = await response.json();

    return {
      face: data.emotion || {
        hasFace: false, emotions: {}, faceCount: 0, faceBox: null,
      },
      vibe: data.vibe || {
        topLabel: 'unknown', topScore: 0, scores: {}, hasVibe: false,
      },
      objects: data.objects || { objects: [], hasObjects: false },
      summary: generateSummary(data),
    };
  } catch (err) {
    console.error('Worker AI error:', err);
    // Fallback to client-side analysis if worker fails
    return await fallbackAnalysis(imageSrc);
  }
};

/**
 * Fallback: simple client-side analysis if worker is down.
 */
const fallbackAnalysis = async (imageSrc) => {
  // Basic histogram analysis (no AI models needed)
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = Math.min(img.width, 200);
  canvas.height = Math.min(img.height, 200);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imageData.data;

  let totalR = 0, totalG = 0, totalB = 0;
  const count = d.length / 4;

  for (let i = 0; i < d.length; i += 4) {
    totalR += d[i]; totalG += d[i+1]; totalB += d[i+2];
  }

  const avgR = totalR / count;
  const avgG = totalG / count;
  const avgB = totalB / count;
  const warmth = (avgR - avgB) / 255;

  return {
    face: { hasFace: false, emotions: {}, faceCount: 0, faceBox: null },
    vibe: {
      topLabel: warmth > 0 ? 'warm tones' : 'cool tones',
      topScore: Math.round(Math.abs(warmth) * 100),
      scores: { 'warm tones': Math.round(Math.max(0, warmth) * 100), 'cool tones': Math.round(Math.max(0, -warmth) * 100) },
      hasVibe: true,
    },
    objects: { objects: [], hasObjects: false },
    summary: `warmth: ${Math.round(warmth * 100)}% · R:${Math.round(avgR)} G:${Math.round(avgG)} B:${Math.round(avgB)}`,
  };
};

/**
 * Generate human-readable summary.
 */
const generateSummary = (data) => {
  const parts = [];

  if (data.emotion?.hasFace) {
    parts.push(`${data.emotion.faceCount} face(s) detected`);
    if (data.emotion.emotions?.sassiness > 50) {
      parts.push(`sassiness: ${data.emotion.emotions.sassiness}%`);
    }
  } else {
    parts.push('no face');
  }

  if (data.vibe?.hasVibe) {
    parts.push(`aura: ${data.vibe.topLabel}`);
  }

  if (data.objects?.hasObjects) {
    const topObjects = data.objects.objects.slice(0, 3).map(o => o.label);
    parts.push(`objects: ${topObjects.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'analyzing...';
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export default { runTripleAnalysis };
