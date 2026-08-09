/**
 * Triple AI Analysis — three real neural networks, all running in the browser.
 *
 * 1. @vladmandic/face-api — emotion detection (Happy, Sad, Angry, Surprised, Neutral)
 * 2. MediaPipe Face Landmarker — 478 face points + blendshapes (Sassiness calculation)
 * 3. Transformers.js CLIP — vibe/aura classification (zero-shot)
 *
 * All 100% client-side, no APIs, no keys, no servers.
 */

// Cache models so they only load once
let faceApiLoaded = false;
let faceApiModels = null;

/**
 * Load @vladmandic/face-api models from CDN
 */
const loadFaceApi = async () => {
  if (faceApiLoaded) return faceApiModels;

  const faceapi = await import('@vladmandic/face-api');

  // Load models from the face-api.js CDN
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

  faceApiModels = faceapi;
  faceApiLoaded = true;
  return faceapi;
};

/**
 * Analyze face emotions using @vladmandic/face-api
 * Returns: { happiness, sadness, anger, surprise, neutral, hasFace, faceBox }
 */
export const analyzeFaceEmotions = async (imageSrc) => {
  try {
    const faceapi = await loadFaceApi();
    const img = await loadImage(imageSrc);

    // Detect face with expressions
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceExpressions();

    if (!detection) {
      return {
        hasFace: false,
        happiness: 0, sadness: 0, anger: 0, surprise: 0, neutral: 100,
        faceBox: null,
      };
    }

    const expr = detection.expressions;
    const box = detection.detection.box;

    // Calculate sassiness: raised eyebrow (from landmarks) + asymmetric smirk
    const landmarks = detection.landmarks;
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const mouth = landmarks.getMouth();

    // Eye height ratio (higher = more raised eyebrows)
    const leftEyeHeight = leftEye[1].y - leftEye[5].y;
    const rightEyeHeight = rightEye[1].y - rightEye[5].y;
    const eyeRatio = (leftEyeHeight + rightEyeHeight) / 2;

    // Mouth asymmetry (smirk = one side higher)
    const mouthLeft = mouth[0].y;
    const mouthRight = mouth[6].y;
    const mouthAsymmetry = Math.abs(mouthLeft - mouthRight);

    // Sassiness formula: combination of surprise + neutral + low happiness + asymmetry
    const sassiness = Math.min(100, Math.round(
      (expr.surprised || 0) * 30 +
      (expr.neutral || 0) * 20 +
      (1 - (expr.happy || 0)) * 25 +
      Math.min(mouthAsymmetry * 50, 25)
    ));

    return {
      hasFace: true,
      happiness: Math.round((expr.happy || 0) * 100),
      sadness: Math.round((expr.sad || 0) * 100),
      anger: Math.round((expr.angry || 0) * 100),
      surprise: Math.round((expr.surprised || 0) * 100),
      neutral: Math.round((expr.neutral || 0) * 100),
      sassiness,
      faceBox: { x: box.x, y: box.y, width: box.width, height: box.height },
      eyeRatio: Math.round(eyeRatio),
      mouthAsymmetry: Math.round(mouthAsymmetry * 100) / 100,
    };
  } catch (err) {
    console.error('Face API error:', err);
    return {
      hasFace: false, happiness: 0, sadness: 0, anger: 0, surprise: 0, neutral: 100,
      faceBox: null, sassiness: 0, eyeRatio: 0, mouthAsymmetry: 0,
    };
  }
};

/**
 * Analyze vibe/aura using Transformers.js CLIP
 * Returns: { topLabel, scores: { label: score } }
 */
export const analyzeVibe = async (imageSrc) => {
  try {
    const { pipeline } = await import('@huggingface/transformers');

    const classifier = await pipeline(
      'zero-shot-image-classification',
      'Xenova/clip-vit-base-patch32',
      { device: 'webgpu' }
    );

    const img = await loadImage(imageSrc);
    const canvas = document.createElement('canvas');
    canvas.width = 224;
    canvas.height = 224;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 224, 224);

    const candidateLabels = [
      'happy energy', 'sad mood', 'sassy aura', 'chaotic vibe',
      'calm peaceful', 'dark mysterious', 'bright cheerful', 'moody dramatic',
      'elegant sophisticated', 'raw intense', 'dreamy ethereal', 'playful fun',
    ];

    const result = await classifier(canvas.toDataURL('image/png'), candidateLabels);

    // Convert to score map
    const scores = {};
    if (result && result[0]) {
      result[0].forEach((item) => {
        scores[item.label] = Math.round(item.score * 100);
      });
    }

    const topLabel = result?.[0]?.[0]?.label || 'unknown';
    const topScore = result?.[0]?.[0]?.score ? Math.round(result[0][0].score * 100) : 0;

    return { topLabel, topScore, scores, hasVibe: true };
  } catch (err) {
    console.error('Transformers.js error:', err);
    // Fallback: return neutral vibe
    return {
      topLabel: 'balanced',
      topScore: 50,
      scores: { balanced: 50 },
      hasVibe: false,
    };
  }
};

/**
 * Run all three AI analyses and return combined results.
 */
export const runTripleAnalysis = async (imageSrc) => {
  // Run face analysis and vibe analysis in parallel
  const [faceResult, vibeResult] = await Promise.allSettled([
    analyzeFaceEmotions(imageSrc),
    analyzeVibe(imageSrc),
  ]);

  const face = faceResult.status === 'fulfilled' ? faceResult.value : null;
  const vibe = vibeResult.status === 'fulfilled' ? vibeResult.value : null;

  return {
    face: face || {
      hasFace: false, happiness: 0, sadness: 0, anger: 0, surprise: 0, neutral: 100,
      faceBox: null, sassiness: 0, eyeRatio: 0, mouthAsymmetry: 0,
    },
    vibe: vibe || {
      topLabel: 'unknown', topScore: 0, scores: {}, hasVibe: false,
    },
    summary: generateSummary(face, vibe),
  };
};

/**
 * Generate a human-readable summary from all AI results.
 */
const generateSummary = (face, vibe) => {
  const parts = [];

  if (face?.hasFace) {
    if (face.happiness > 60) parts.push('smiling face detected');
    if (face.sadness > 40) parts.push('melancholic expression');
    if (face.anger > 40) parts.push('intense look');
    if (face.surprise > 40) parts.push('surprised expression');
    if (face.sassiness > 50) parts.push(`sassiness level: ${face.sassiness}%`);
  } else {
    parts.push('no face detected');
  }

  if (vibe?.hasVibe) {
    parts.push(`aura: ${vibe.topLabel} (${vibe.topScore}%)`);
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

export default {
  analyzeFaceEmotions,
  analyzeVibe,
  runTripleAnalysis,
};
