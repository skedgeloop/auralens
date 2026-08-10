/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Multi-model AI analysis with full result breakdown.
 * Shows ALL model results, not just the first that works.
 */

const WORKER_URL = '/api/ai'; // same-origin Pages Function at auralens.pages.dev/api/ai

export const runTripleAnalysis = async (imageSrc) => {
  const results = {
    models: [], // Track which models ran and what they found
    face: null,
    vibe: null,
    objects: null,
    tier: 'none',
  };

  // === SERVER AI ===
  try {
    const serverResult = await serverAI(imageSrc);
    if (serverResult.success) {
      results.models.push({ name: 'DETR (server)', status: 'ok', detail: serverResult.data.face?.hasFace ? `Found ${serverResult.data.face.faceCount} face(s)` : 'No face' });
      results.models.push({ name: 'CLIP (server)', status: 'ok', detail: serverResult.data.vibe?.topLabel || 'unknown' });
      results.face = serverResult.data.face;
      results.vibe = serverResult.data.vibe;
      results.objects = serverResult.data.objects;
      results.tier = 'server';
    }
  } catch (e) {
    results.models.push({ name: 'DETR (server)', status: 'failed', detail: e.message });
  }

  // === CLIENT AI — run ALL models in PARALLEL, combine results ===
  // (was sequential ~3x; now takes only the slowest model's time)
  const [faceApiResult, blazefaceResult, objectResult] = await Promise.allSettled([
    faceApiDetect(imageSrc),
    blazefaceDetect(imageSrc),
    cocoSsdDetect(imageSrc),
  ]);

  // Model 1: face-api
  if (faceApiResult.status === 'fulfilled') {
    const r = faceApiResult.value;
    results.models.push({ name: 'face-api', status: 'ok', detail: r.hasFace ? `Found face, happy=${r.emotions.happiness}%` : 'No face' });
  } else {
    results.models.push({ name: 'face-api', status: 'failed', detail: String(faceApiResult.reason).substring(0, 50) });
  }

  // Model 2: blazeface
  if (blazefaceResult.status === 'fulfilled') {
    const r = blazefaceResult.value;
    results.models.push({ name: 'blazeface', status: 'ok', detail: r.hasFace ? `Found ${r.faceCount} face(s)` : 'No face' });
  } else {
    results.models.push({ name: 'blazeface', status: 'failed', detail: String(blazefaceResult.reason).substring(0, 50) });
  }

  // Model 3: COCO-SSD objects
  if (objectResult.status === 'fulfilled') {
    const r = objectResult.value;
    results.models.push({ name: 'COCO-SSD', status: 'ok', detail: r.hasObjects ? `${r.objects.length} objects` : 'No objects' });
  } else {
    results.models.push({ name: 'COCO-SSD', status: 'failed', detail: String(objectResult.reason).substring(0, 50) });
  }

  // Normalize allSettled results back to plain values for the combine step
  const faceApiValue = faceApiResult.status === 'fulfilled' ? faceApiResult.value : null;
  const blazefaceValue = blazefaceResult.status === 'fulfilled' ? blazefaceResult.value : null;
  const objectValue = objectResult.status === 'fulfilled' ? objectResult.value : null;

  // === COMBINE RESULTS — best face + emotions from any model ===
  // face-api is most proven on drawn faces; server CLIP emotion is real;
  // blazeface only supplies a face box. Prefer in that order.
  const serverFace = results.face; // real CLIP emotion from server
  const serverHasEmotions = serverFace?.hasFace && serverFace.emotions &&
    Object.keys(serverFace.emotions).length > 0;
  const faceSource = faceApiValue?.hasFace ? faceApiValue
    : serverHasEmotions ? serverFace
    : blazefaceValue?.hasFace ? blazefaceValue
    : null;

  if (faceSource) {
    results.face = { ...faceSource };
    // Blazeface knows where the face is even when emotions come from elsewhere
    if (blazefaceValue?.hasFace && !results.face.faceBox) {
      results.face.faceBox = blazefaceValue.faceBox;
      results.face.faceCount = Math.max(results.face.faceCount || 1, blazefaceValue.faceCount);
    }
  } else {
    results.face = { hasFace: false, emotions: {}, faceCount: 0 };
  }

  // Objects from COCO-SSD
  if (objectValue?.hasObjects && !results.objects?.hasObjects) {
    results.objects = objectValue;
  }

  // Generate vibe from combined results
  if (!results.vibe?.hasVibe) {
    results.vibe = generateVibeFromResults(results.face, results.objects);
  }

  // Pixel analysis as final fallback for vibe
  if (!results.vibe?.hasVibe) {
    results.vibe = await pixelVibe(imageSrc);
  }

  results.summary = generateSummary(results);

  return results;
};

// ═══════════════════════════════════════════
// SERVER AI
// ═══════════════════════════════════════════
async function serverAI(imageSrc) {
  // Retry once on transient failure so the fixed server models are preferred
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
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
        },
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

// ═══════════════════════════════════════════
// FACE-API (best emotion detection)
// ═══════════════════════════════════════════
async function faceApiDetect(imageSrc) {
  const faceapi = await import('@vladmandic/face-api');
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

  const img = await loadImage(imageSrc);
  const detection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceExpressions();

  if (!detection) return { hasFace: false, emotions: {}, faceCount: 0 };

  const expr = detection.expressions;
  const box = detection.detection.box;
  const mouth = detection.landmarks.getMouth();
  const mouthAsymmetry = Math.abs(mouth[0].y - mouth[6].y);

  return {
    hasFace: true,
    faceCount: 1,
    faceBox: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) },
    confidence: Math.round(detection.detection.score * 100),
    emotions: {
      happiness: Math.round((expr.happy || 0) * 100),
      sadness: Math.round((expr.sad || 0) * 100),
      anger: Math.round((expr.angry || 0) * 100),
      surprise: Math.round((expr.surprised || 0) * 100),
      neutral: Math.round((expr.neutral || 0) * 100),
      sassiness: Math.min(95, Math.round(
        (expr.surprised || 0) * 30 + (expr.neutral || 0) * 20 +
        (1 - (expr.happy || 0)) * 25 + Math.min(mouthAsymmetry * 50, 25)
      )),
    },
  };
}

// ═══════════════════════════════════════════
// BLAZEFAST (fast face detection)
// ═══════════════════════════════════════════
async function blazefaceDetect(imageSrc) {
  const blazeface = await import('@tensorflow-models/blazeface');
  const tf = await import('@tensorflow/tfjs');
  try { await tf.setBackend('webgl'); } catch { await tf.setBackend('wasm'); }
  await tf.ready();

  const model = await blazeface.load();
  const img = await loadImage(imageSrc);
  const predictions = await model.estimateFaces(img, false);

  if (!predictions || predictions.length === 0) return { hasFace: false, emotions: {}, faceCount: 0 };

  const pred = predictions[0];
  const topLeft = pred.topLeft;
  const bottomRight = pred.bottomRight;

  return {
    hasFace: true,
    faceCount: predictions.length,
    faceBox: {
      x: Math.round(topLeft[0]),
      y: Math.round(topLeft[1]),
      width: Math.round(bottomRight[0] - topLeft[0]),
      height: Math.round(bottomRight[1] - topLeft[1]),
    },
    confidence: Math.round((pred.probability?.[0] || 0.9) * 100),
    // blazeface only detects boxes — no real emotions. Empty on purpose.
    emotions: {},
  };
}

// ═══════════════════════════════════════════
// COCO-SSD (object detection)
// ═══════════════════════════════════════════
async function cocoSsdDetect(imageSrc) {
  const cocoSSD = await import('@tensorflow-models/coco-ssd');
  const tf = await import('@tensorflow/tfjs');
  try { await tf.setBackend('webgl'); } catch { await tf.setBackend('wasm'); }
  await tf.ready();

  const model = await cocoSSD.load({ base: 'lite_mobilenet_v2' });
  const img = await loadImage(imageSrc);
  const predictions = await model.detect(img);

  if (!predictions || predictions.length === 0) return { objects: [], hasObjects: false };

  return {
    objects: predictions.slice(0, 10).map(p => ({ label: p.class, score: Math.round(p.score * 100) })),
    hasObjects: true,
  };
}

// ═══════════════════════════════════════════
// VIBE GENERATION
// ═══════════════════════════════════════════
function generateVibeFromResults(face, objects) {
  if (face?.hasFace) {
    const e = face.emotions || {};
    if (e.happiness > 60) return { topLabel: 'handsome', topScore: e.happiness, scores: { handsome: e.happiness }, hasVibe: true };
    if (e.sassiness > 50) return { topLabel: 'hot', topScore: e.sassiness, scores: { hot: e.sassiness }, hasVibe: true };
    if (e.anger > 40) return { topLabel: 'alpha energy', topScore: e.anger, scores: { 'alpha energy': e.anger }, hasVibe: true };
    if (e.sadness > 40) return { topLabel: 'mysterious', topScore: e.sadness, scores: { mysterious: e.sadness }, hasVibe: true };
    // Real neutral signal — never fabricate a score
    if (e.neutral > 0) return { topLabel: 'aesthetic', topScore: e.neutral, scores: { aesthetic: e.neutral }, hasVibe: true };
    return { hasVibe: false };
  }
  if (objects?.hasObjects) {
    const labels = objects.objects.map(o => o.label);
    if (labels.some(l => ['cat', 'dog'].includes(l))) {
      const s = Math.round(Math.max(...objects.objects.filter(o => ['cat', 'dog'].includes(o.label)).map(o => o.score)));
      return { topLabel: 'cute', topScore: s, scores: { cute: s }, hasVibe: true };
    }
    if (labels.some(l => ['car', 'truck'].includes(l))) {
      const s = Math.round(Math.max(...objects.objects.filter(o => ['car', 'truck'].includes(o.label)).map(o => o.score)));
      return { topLabel: 'aesthetic', topScore: s, scores: { aesthetic: s }, hasVibe: true };
    }
  }
  return { hasVibe: false };
}

async function pixelVibe(imageSrc) {
  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = 200; canvas.height = 200;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, 200, 200);
  const d = ctx.getImageData(0, 0, 200, 200).data;
  let totalR = 0, totalG = 0, totalB = 0;
  for (let i = 0; i < d.length; i += 4) { totalR += d[i]; totalG += d[i+1]; totalB += d[i+2]; }
  const count = d.length / 4;
  const warmth = (totalR / count - totalB / count) / 255;
  // Score derives from the measured warmth, never fabricated
  const warmthScore = (v) => Math.min(95, Math.round(Math.abs(v) * 200 + 55));
  if (warmth > 0.15) {
    const s = warmthScore(warmth);
    return { topLabel: 'gorgeous', topScore: s, scores: { gorgeous: s }, hasVibe: true };
  }
  if (warmth < -0.1) {
    const s = warmthScore(warmth);
    return { topLabel: 'cool vibes', topScore: s, scores: { 'cool vibes': s }, hasVibe: true };
  }
  return { hasVibe: false };
}

function generateSummary(results) {
  const parts = [];
  if (results.face?.hasFace) parts.push(`${results.face.faceCount} face(s)`);
  if (results.vibe?.hasVibe) parts.push(`aura: ${results.vibe.topLabel}`);
  if (results.objects?.hasObjects) parts.push(`${results.objects.objects.length} objects`);
  const modelsRun = results.models.filter(m => m.status === 'ok').length;
  parts.push(`${modelsRun} models ran`);
  return parts.join(' · ');
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

export default { runTripleAnalysis };
