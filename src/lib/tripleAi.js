/**
 * Triple-tier AI analysis with fallbacks:
 * 1. Server-side (Cloudflare Worker → Hugging Face)
 * 2. Client-side (TensorFlow.js models in browser)
 * 3. Pixel-based (histogram + color math, always works)
 */

const WORKER_URL = 'https://auralens-ai.skedgeloop.workers.dev';

/**
 * Main entry — tries all three tiers in order.
 */
export const runTripleAnalysis = async (imageSrc) => {
  // Tier 1: Server-side AI
  try {
    const result = await serverAI(imageSrc);
    if (result.success) return { ...result.data, tier: 'server' };
  } catch (e) { console.log('Server AI failed:', e.message); }

  // Tier 2: Client-side AI
  try {
    const result = await clientAI(imageSrc);
    if (result.success) return { ...result.data, tier: 'browser' };
  } catch (e) { console.log('Client AI failed:', e.message); }

  // Tier 3: Pixel-based (always works)
  return { ...pixelAnalysis(imageSrc), tier: 'pixel' };
};

// ═══════════════════════════════════════════
// TIER 1: Server-side AI
// ═══════════════════════════════════════════
async function serverAI(imageSrc) {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageSrc }),
  });

  if (!response.ok) throw new Error(`Worker ${response.status}`);

  const data = await response.json();

  return {
    success: true,
    data: {
      face: data.emotion || { hasFace: false, emotions: {}, faceCount: 0 },
      vibe: data.vibe || { topLabel: 'unknown', topScore: 0, scores: {}, hasVibe: false },
      objects: data.objects || { objects: [], hasObjects: false },
      summary: generateSummary(data),
    },
  };
}

// ═══════════════════════════════════════════
// TIER 2: Client-side AI (TensorFlow.js)
// ═══════════════════════════════════════════
async function clientAI(imageSrc) {
  // Try face-api
  let faceResult = { hasFace: false, emotions: {}, faceCount: 0 };
  try {
    const faceapi = await import('@vladmandic/face-api');
    const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

    const img = await loadImage(imageSrc);
    const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();

    if (detection) {
      const expr = detection.expressions;
      faceResult = {
        hasFace: true,
        faceCount: 1,
        emotions: {
          happiness: Math.round((expr.happy || 0) * 100),
          sadness: Math.round((expr.sad || 0) * 100),
          anger: Math.round((expr.angry || 0) * 100),
          surprise: Math.round((expr.surprised || 0) * 100),
          neutral: Math.round((expr.neutral || 0) * 100),
          sassiness: Math.round(((expr.surprised || 0) + (expr.neutral || 0)) * 50),
        },
      };
    }
  } catch (e) { console.log('face-api failed:', e.message); }

  // Try COCO-SSD for objects
  let objectResult = { objects: [], hasObjects: false };
  try {
    const cocoSSD = await import('@tensorflow-models/coco-ssd');
    const tf = await import('@tensorflow/tfjs');
    try { await tf.setBackend('webgl'); } catch { await tf.setBackend('wasm'); }
    await tf.ready();

    const model = await cocoSSD.load({ base: 'lite_mobilenet_v2' });
    const img = await loadImage(imageSrc);
    const predictions = await model.detect(img);

    if (predictions.length > 0) {
      objectResult = {
        objects: predictions.slice(0, 10).map(p => ({ label: p.class, score: Math.round(p.score * 100) })),
        hasObjects: true,
      };
    }
  } catch (e) { console.log('COCO-SSD failed:', e.message); }

  // Generate vibe from face + objects
  const vibe = generateVibeFromResults(faceResult, objectResult);

  return {
    success: faceResult.hasFace || objectResult.hasObjects,
    data: {
      face: faceResult,
      vibe,
      objects: objectResult,
      summary: generateSummary({ emotion: faceResult, vibe, objects: objectResult }),
    },
  };
}

// ═══════════════════════════════════════════
// TIER 3: Pixel-based (always works, no AI)
// ═══════════════════════════════════════════
function pixelAnalysis(imageSrc) {
  // Synchronous placeholder — actual analysis happens async
  return {
    face: { hasFace: false, emotions: {}, faceCount: 0 },
    vibe: { topLabel: 'analyzing...', topScore: 0, scores: {}, hasVibe: false },
    objects: { objects: [], hasObjects: false },
    summary: 'pixel analysis ready',
    _pending: true, // Flag for async pixel analysis
  };
}

/**
 * Run pixel analysis asynchronously (called after initial render).
 */
export const runPixelAnalysis = async (imageSrc) => {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const size = 200;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;

  let totalR = 0, totalG = 0, totalB = 0, totalLum = 0;
  let darkPixels = 0, brightPixels = 0;
  const count = d.length / 4;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    totalR += r; totalG += g; totalB += b;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    totalLum += lum;
    if (lum < 85) darkPixels++;
    if (lum > 170) brightPixels++;
  }

  const avgR = totalR / count;
  const avgG = totalG / count;
  const avgB = totalB / count;
  const avgLum = totalLum / count;
  const warmth = (avgR - avgB) / 255;
  const darkRatio = darkPixels / count;
  const brightRatio = brightPixels / count;

  // Determine vibe from colors
  let vibeLabel = 'balanced';
  if (warmth > 0.15 && avgLum > 120) vibeLabel = 'bright cheerful';
  else if (warmth > 0.1) vibeLabel = 'warm tones';
  else if (warmth < -0.1) vibeLabel = 'cool tones';
  else if (darkRatio > 0.6) vibeLabel = 'dark mysterious';
  else if (brightRatio > 0.6) vibeLabel = 'bright airy';
  else if (avgLum < 80) vibeLabel = 'moody dramatic';

  // Determine mood
  let mood = 'neutral';
  if (warmth > 0.1) mood = 'warm';
  if (warmth < -0.1) mood = 'cool';
  if (darkRatio > 0.6) mood = 'dark';
  if (brightRatio > 0.6) mood = 'bright';

  return {
    face: { hasFace: false, emotions: {}, faceCount: 0 },
    vibe: {
      topLabel: vibeLabel,
      topScore: Math.round(Math.abs(warmth) * 100 + 30),
      scores: {
        [vibeLabel]: Math.round(Math.abs(warmth) * 100 + 30),
        'warm tones': Math.round(Math.max(0, warmth) * 100),
        'cool tones': Math.round(Math.max(0, -warmth) * 100),
        'dark mysterious': Math.round(darkRatio * 100),
        'bright cheerful': Math.round(brightRatio * 100),
      },
      hasVibe: true,
    },
    objects: { objects: [], hasObjects: false },
    summary: `mood: ${mood} · warmth: ${Math.round(warmth * 100)}% · R:${Math.round(avgR)} G:${Math.round(avgG)} B:${Math.round(avgB)}`,
  };
};

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function generateVibeFromResults(face, objects) {
  if (face.hasFace) {
    if (face.emotions.happiness > 60) return { topLabel: 'happy energy', topScore: face.emotions.happiness, scores: { happy: face.emotions.happiness }, hasVibe: true };
    if (face.emotions.sadness > 40) return { topLabel: 'sad mood', topScore: face.emotions.sadness, scores: { sad: face.emotions.sadness }, hasVibe: true };
    if (face.emotions.sassiness > 50) return { topLabel: 'sassy aura', topScore: face.emotions.sassiness, scores: { sassy: face.emotions.sassiness }, hasVibe: true };
    if (face.emotions.anger > 40) return { topLabel: 'raw intense', topScore: face.emotions.anger, scores: { intense: face.emotions.anger }, hasVibe: true };
  }

  if (objects.hasObjects) {
    const labels = objects.objects.map(o => o.label);
    if (labels.some(l => ['cat', 'dog', 'bird'].includes(l))) return { topLabel: 'playful fun', topScore: 70, scores: { playful: 70 }, hasVibe: true };
    if (labels.some(l => ['car', 'truck', 'motorcycle'].includes(l))) return { topLabel: 'raw intense', topScore: 65, scores: { intense: 65 }, hasVibe: true };
    if (labels.some(l => ['cup', 'wine glass', 'fork', 'knife'].includes(l))) return { topLabel: 'elegant sophisticated', topScore: 60, scores: { elegant: 60 }, hasVibe: true };
  }

  return { topLabel: 'balanced', topScore: 50, scores: { balanced: 50 }, hasVibe: true };
}

function generateSummary(data) {
  const parts = [];
  if (data.emotion?.hasFace) parts.push(`${data.emotion.faceCount} face(s)`);
  if (data.vibe?.hasVibe) parts.push(`aura: ${data.vibe.topLabel}`);
  if (data.objects?.hasObjects) parts.push(`${data.objects.objects.length} objects`);
  return parts.length > 0 ? parts.join(' · ') : 'analyzing...';
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export default { runTripleAnalysis, runPixelAnalysis };
