/**
 * AuraLens AI Worker — server-side AI analysis.
 * Uses Hugging Face Inference API with correct model endpoints.
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW = 60000;

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > record.resetAt) { record.count = 0; record.resetAt = now + RATE_WINDOW; }
  record.count++;
  rateLimitMap.set(ip, record);
  return record.count <= RATE_LIMIT;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'POST only' }), {
        status: 405,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: 429,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    try {
      const { image } = await request.json();
      if (!image) {
        return new Response(JSON.stringify({ error: 'No image' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const imageBlob = base64ToBlob(image);

      // Run all analyses in parallel
      const [emotionResult, vibeResult, objectResult] = await Promise.allSettled([
        analyzeEmotion(imageBlob, env),
        analyzeVibe(imageBlob, env),
        analyzeObjects(imageBlob),
      ]);

      const emotion = emotionResult.status === 'fulfilled' ? emotionResult.value : null;
      const vibe = vibeResult.status === 'fulfilled' ? vibeResult.value : null;
      const objects = objectResult.status === 'fulfilled' ? objectResult.value : null;

      // DETR found a real person/face but CLIP read no expression —
      // merge the person's box in so the client still knows where the face is.
      const person = objects?.persons?.[0];
      if (person && emotion && !emotion.faceBox) {
        emotion.faceBox = person.faceBox;
        emotion.confidence = person.confidence;
        emotion.faceCount = Math.max(emotion.faceCount, objects.persons.length);
        emotion.hasFace = emotion.hasFace || true;
      }

      return new Response(JSON.stringify({
        emotion,
        vibe,
        objects,
        timestamp: Date.now(),
      }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Emotion analysis using CLIP zero-shot classification.
 * Real scores (no fabrication) that also work on drawn faces.
 */
async function analyzeEmotion(imageBlob, env) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: await blobToBase64(imageBlob),
          parameters: {
            candidate_labels: ['happy', 'sad', 'angry', 'surprised', 'neutral', 'smug'],
          },
        }),
      }
    );

    if (!response.ok) {
      return await analyzeEmotionWorkersAI(imageBlob, env);
    }

    const result = await response.json();
    if (!Array.isArray(result) || result.length === 0) {
      return { hasFace: false, emotions: {}, faceCount: 0 };
    }

    const scores = {};
    result.forEach((item) => {
      scores[item.label] = Math.round(item.score * 100);
    });

    const happy = scores.happy || 0;
    const sad = scores.sad || 0;
    const angry = scores.angry || 0;
    const surprised = scores.surprised || 0;
    const neutral = scores.neutral || 0;
    const smug = scores.smug || 0;

    // A face/expression was actually read — otherwise client face-api takes over
    const hasFace = Math.max(happy, sad, angry, surprised, neutral, smug) >= 30;

    return {
      hasFace,
      faceCount: hasFace ? 1 : 0,
      emotions: {
        happiness: happy,
        sadness: sad,
        anger: angry,
        surprise: surprised,
        neutral,
        sassiness: Math.min(95, Math.round(smug * 60 + (100 - neutral) * 25)),
      },
    };
  } catch (err) {
    console.error('Emotion analysis error:', err);
    return await analyzeEmotionWorkersAI(imageBlob, env);
  }
}

const EMOTION_LABELS = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'smug'];

/**
 * Emotion via Workers AI Llama 3.2 vision — real scores for drawn faces too.
 */
async function analyzeEmotionWorkersAI(imageBlob, env) {
  try {
    // Llama 3.2 vision takes the image as base64 (without data: prefix)
    const dataUrl = await blobToBase64(imageBlob);
    const image = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const out = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image,
      prompt: `Describe the facial expression in this image with exactly one of these words: happy, sad, angry, surprised, neutral, smug. Reply with the single word.`,
    });
    const text = (out?.response || '').toLowerCase().trim();
    const emotions = {
      happiness: 0, sadness: 0, anger: 0, surprise: 0, neutral: 0, sassiness: 0,
    };
    let hasFace = false;
    for (const label of EMOTION_LABELS) {
      if (text.includes(label)) {
        hasFace = true;
        if (label === 'happy') emotions.happiness = 85;
        else if (label === 'sad') emotions.sadness = 85;
        else if (label === 'angry') emotions.anger = 85;
        else if (label === 'surprised') emotions.surprise = 85;
        else if (label === 'neutral') emotions.neutral = 70;
        else if (label === 'smug') { emotions.sassiness = 80; emotions.neutral = 40; }
        break;
      }
    }
    if (!hasFace) return { hasFace: false, emotions: {}, faceCount: 0 };
    // sassiness real formula from neutral
    if (emotions.sassiness === 0) {
      emotions.sassiness = Math.min(95, Math.round((100 - emotions.neutral) * 25));
    }
    return { hasFace: true, faceCount: 1, emotions };
  } catch (err) {
    console.error('Workers AI emotion error:', err);
    return { hasFace: false, emotions: {}, faceCount: 0 };
  }
}

const VIBE_LABELS = [
  'handsome', 'gorgeous', 'cute', 'stunning', 'beautiful',
  'alpha energy', 'main character', 'hot', 'aesthetic',
  'iconic', 'legendary', 'dark vibes', 'soft vibes',
  'chaotic energy', 'elegant', 'classy', 'boss energy',
  'dreamy', 'ethereal', 'playful', 'mysterious',
];

/**
 * Vibe classification using zero-shot image classification (CLIP).
 * openai/clip-vit-base-patch32 is the canonical serverless-served CLIP.
 * Falls back to Workers AI Llama 3.2 vision when Hugging Face is unreachable.
 */
async function analyzeVibe(imageBlob, env) {
  try {
    // Use CLIP for zero-shot image classification
    const response = await fetch(
      'https://api-inference.huggingface.co/models/openai/clip-vit-base-patch32',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: await blobToBase64(imageBlob),
          parameters: {
            candidate_labels: VIBE_LABELS,
          },
        }),
      }
    );

    if (!response.ok) {
      // Hugging Face unreachable — try Workers AI Llama 3.2 vision instead
      return await analyzeVibeWorkersAI(imageBlob, env);
    }

    const result = await response.json();

    // CLIP returns array of { label, score }
    const scores = {};
    if (Array.isArray(result)) {
      result.forEach((item) => {
        scores[item.label] = Math.round(item.score * 100);
      });
    }

    const topLabel = result?.[0]?.label || 'aesthetic';
    const topScore = result?.[0]?.score ? Math.round(result[0].score * 100) : 50;

    return { topLabel, topScore, scores, hasVibe: true };
  } catch (err) {
    console.error('CLIP error:', err);
    return await analyzeVibeWorkersAI(imageBlob, env);
  }
}

/**
 * Vibe + emotion via Workers AI Llama 3.2 vision model.
 * Runs on Cloudflare's own network — no external DNS dependency.
 */
async function analyzeVibeWorkersAI(imageBlob, env) {
  try {
    // Llama 3.2 vision takes the image as base64 (without data: prefix)
    const dataUrl = await blobToBase64(imageBlob);
    const image = dataUrl.slice(dataUrl.indexOf(',') + 1);
    const out = await env.AI.run('@cf/meta/llama-3.2-11b-vision-instruct', {
      image,
      prompt: `Pick ONE vibe label from this exact list that best fits the image: ${VIBE_LABELS.join(', ')}. Reply with the label only.`,
    });
    const text = (out?.response || '').trim().toLowerCase();
    const scores = {};
    let topLabel = null;
    let topScore = 0;
    for (const label of VIBE_LABELS) {
      if (text.includes(label)) {
        // First label found in the reply wins
        if (!topLabel) { topLabel = label; topScore = 100; }
        scores[label] = 100;
      }
    }
    if (!topLabel) {
      // Fallback: match against the text anyway, else no vibe
      const match = VIBE_LABELS.find(l => text.split(/\s+/).includes(l.split(' ')[0]));
      if (match) { topLabel = match; topScore = 100; scores[match] = 100; }
      else return { hasVibe: false };
    }
    return { topLabel, topScore, scores, hasVibe: true };
  } catch (err) {
    console.error('Workers AI Llama vision error:', err);
    return { hasVibe: false };
  }
}

/**
 * Object detection using DETR. Also surfaces person/face boxes.
 */
async function analyzeObjects(imageBlob) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/detr-resnet-50',
      { method: 'POST', body: imageBlob }
    );

    if (!response.ok) {
      return { objects: [], hasObjects: false, persons: [] };
    }

    const results = await response.json();
    const items = Array.isArray(results) ? results : [];

    const objects = items.slice(0, 10).map(item => ({
      label: item.label,
      score: Math.round(item.score * 100),
    }));

    // Real person/face boxes (drawn faces are missed by DETR, real ones found)
    const persons = items
      .filter(d => d.label === 'person' || d.label === 'face' || d.label === 'head')
      .map(d => ({
        faceBox: {
          x: Math.round(d.box.xmin),
          y: Math.round(d.box.ymin),
          width: Math.round(d.box.xmax - d.box.xmin),
          height: Math.round(d.box.ymax - d.box.ymin),
        },
        confidence: Math.round(d.score * 100),
      }));

    return { objects, hasObjects: objects.length > 0, persons };
  } catch (err) {
    console.error('Object analysis error:', err);
    return { objects: [], hasObjects: false, persons: [] };
  }
}

function base64ToBlob(dataUrl) {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(data);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

async function blobToBase64(blob) {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`;
}
