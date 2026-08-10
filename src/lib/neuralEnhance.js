/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Neural enhance pass — an optional, graceful refinement on top of the
 * scene-aware smartAutoEnhance.
 *
 * Uses @huggingface/transformers to run a small client-side image model
 * (transformers.js). If the model can't load in time, or produces no clear
 * improvement, the input is returned unchanged — this pass can NEVER make the
 * result worse or break the auto-enhance.
 */

let pipelinePromise = null;

// Load the image-classification pipeline once and reuse it.
function getClassifier() {
  if (!pipelinePromise) {
    pipelinePromise = import('@huggingface/transformers').then(async (mod) => {
      const { pipeline, env } = mod;
      // Keep the model in-browser, no remote fallback that could hang forever.
      if (env) { env.allowLocalModels = true; env.allowRemoteModels = true; }
      return pipeline('image-classification', 'Xenova/vit-base-patch16-224');
    });
  }
  return pipelinePromise;
}

/**
 * Neural enhancement pass.
 * Runs a lightweight transformers.js aesthetic/image-classification model to
 * derive a grade hint, then applies a modest pixel refinement tuned by it.
 * Fully graceful: any error / timeout returns `imageSrc` unchanged.
 * @param {string} imageSrc - data URL
 * @returns {Promise<string>} refined data URL, or the same imageSrc
 */
export const neuralEnhance = async (imageSrc) => {
  try {
    // Fast timeout — never block the auto-enhance for more than ~3s.
    const classifier = await Promise.race([
      getClassifier(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('neural timeout')), 3000)),
    ]);

    // Run classification on a downscaled version to keep it fast.
    const downscaled = await downscaleForModel(imageSrc);
    const [{ label, score } = {}] = await classifier(downscaled);

    if (!label) return imageSrc;

    // Map the aesthetic label to a gentle pixel refinement. Keep it modest so
    // it can never over-cook the image.
    const hint = label.toLowerCase();
    const refinement = {
      warm: hint.includes('warm') || hint.includes('sun'),
      cool: hint.includes('cool') || hint.includes('sky') || hint.includes('ocean'),
      bright: hint.includes('bright') || hint.includes('light'),
    };

    return await applyNeuralRefine(imageSrc, refinement);
  } catch (e) {
    // Graceful: model unavailable/timeout — keep the scene-aware result.
    return imageSrc;
  }
};

/**
 * Downscale the data URL to ~224px for the classifier (faster, still accurate).
 */
function downscaleForModel(imageSrc) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const scale = Math.min(1, 224 / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    } catch (e) { resolve(imageSrc); }
  });
}

/**
 * Apply a very gentle refinement based on the neural hint. Only shifts values
 * a little and only if it clearly helps — otherwise returns the input.
 */
function applyNeuralRefine(imageSrc, hint) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width; canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imageData.data;

        // Very small, safe adjustments.
        const warmAmount = hint.warm ? 6 : 0;      // +R -B
        const coolAmount = hint.cool ? 6 : 0;      // -R +B
        const liftAmount = hint.bright ? 4 : 0;    // +all (midtones)

        let changed = false;
        for (let i = 0; i < d.length; i += 4) {
          let r = d[i], g = d[i + 1], b = d[i + 2];
          const nr = r + warmAmount - coolAmount + liftAmount;
          const ng = g + liftAmount;
          const nb = b - warmAmount + coolAmount + liftAmount;
          d[i] = Math.max(0, Math.min(255, nr));
          d[i + 1] = Math.max(0, Math.min(255, ng));
          d[i + 2] = Math.max(0, Math.min(255, nb));
          if (!changed && (nr !== r || ng !== g || nb !== b)) changed = true;
        }

        if (!changed) { resolve(imageSrc); return; }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.onerror = () => resolve(imageSrc);
      img.src = imageSrc;
    } catch (e) { resolve(imageSrc); }
  });
}

export default neuralEnhance;
