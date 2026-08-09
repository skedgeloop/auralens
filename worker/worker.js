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
        analyzeEmotion(imageBlob),
        analyzeVibe(imageBlob),
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
async function analyzeEmotion(imageBlob) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/xenova/clip-vit-base-patch32',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            image: await blobToBase64(imageBlob),
            parameters: {
              candidate_labels: ['happy', 'sad', 'angry', 'surprised', 'neutral', 'smug'],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      return { hasFace: false, emotions: {}, faceCount: 0 };
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
    return { hasFace: false, emotions: {}, faceCount: 0 };
  }
}

/**
 * Vibe classification using zero-shot image classification (CLIP).
 * Uses Xenova/clip-vit-base-patch32 which supports zero-shot classification.
 */
async function analyzeVibe(imageBlob) {
  try {
    // Use CLIP for zero-shot image classification
    const response = await fetch(
      'https://api-inference.huggingface.co/models/xenova/clip-vit-base-patch32',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: {
            image: await blobToBase64(imageBlob),
            parameters: {
              candidate_labels: [
                'handsome', 'gorgeous', 'cute', 'stunning', 'beautiful',
                'alpha energy', 'main character', 'hot', 'aesthetic',
                'iconic', 'legendary', 'dark vibes', 'soft vibes',
                'chaotic energy', 'elegant', 'classy', 'boss energy',
                'dreamy', 'ethereal', 'playful', 'mysterious',
              ],
            },
          },
        }),
      }
    );

    if (!response.ok) {
      // Fallback to image classification
      return await analyzeVibeFallback(imageBlob);
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
    return await analyzeVibeFallback(imageBlob);
  }
}

/**
 * Fallback: image classification mapped to vibe tags.
 */
async function analyzeVibeFallback(imageBlob) {
  try {
    const response = await fetch(
      'https://api-inference.huggingface.co/models/google/vit-base-patch16-224',
      { method: 'POST', body: imageBlob }
    );

    if (!response.ok) {
      return { hasVibe: false };
    }

    const results = await response.json();

    // Map ImageNet labels to vibe tags
    const vibeMap = {
      'person': 'main character', 'man': 'handsome', 'woman': 'gorgeous',
      'boy': 'cute', 'girl': 'stunning', 'suit': 'boss energy',
      'dress': 'elegant', 'car': 'aesthetic', 'dog': 'playful',
      'cat': 'cute', 'flower': 'beautiful', 'sunset': 'dreamy',
      'night': 'mysterious', 'food': 'aesthetic', 'sports': 'alpha energy',
    };

    const scores = {};
    let topLabel = 'aesthetic';
    let topScore = 50;

    if (Array.isArray(results)) {
      results.forEach(item => {
        const label = item.label.toLowerCase();
        let vibe = vibeMap[label] || null;
        if (!vibe) {
          for (const [key, val] of Object.entries(vibeMap)) {
            if (label.includes(key)) { vibe = val; break; }
          }
        }
        if (vibe) {
          const score = Math.round(item.score * 100);
          scores[vibe] = Math.max(scores[vibe] || 0, score);
          if (score > topScore) { topScore = score; topLabel = vibe; }
        }
      });
    }

    if (Object.keys(scores).length === 0) {
      return { hasVibe: false };
    }

    return { topLabel, topScore, scores, hasVibe: true };
  } catch (err) {
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
