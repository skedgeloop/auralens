/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * AI Engine — analyzes images and suggests optimal edits.
 * This is the "brain" that makes the editor feel intelligent.
 */

/**
 * Analyze an image and return comprehensive insights.
 * @param {string} imageSrc - Image data URL
 * @returns {Promise<Object>} - Analysis results
 */
export const analyzeImage = async (imageSrc) => {
  if (!imageSrc) return null;

  const img = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = computeHistogram(imageData);
  const colorProfile = analyzeColors(imageData);
  const exposure = analyzeExposure(histogram);
  const composition = analyzeComposition(imageData, img.width, img.height);
  const mood = analyzeMood(colorProfile, exposure);

  return {
    width: img.width,
    height: img.height,
    histogram,
    colorProfile,
    exposure,
    composition,
    mood,
    suggestions: generateSuggestions(exposure, colorProfile, composition, mood),
    autoEnhance: computeAutoEnhance(exposure, colorProfile, histogram),
  };
};

/**
 * Compute RGB histogram
 */
const computeHistogram = (imageData) => {
  const d = imageData.data;
  const r = new Array(256).fill(0);
  const g = new Array(256).fill(0);
  const b = new Array(256).fill(0);
  const luminance = new Array(256).fill(0);

  for (let i = 0; i < d.length; i += 4) {
    r[d[i]]++;
    g[d[i+1]]++;
    b[d[i+2]]++;
    const lum = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
    luminance[Math.min(255, lum)]++;
  }

  return { r, g, b, luminance, totalPixels: d.length / 4 };
};

/**
 * Analyze color profile
 */
const analyzeColors = (imageData) => {
  const d = imageData.data;
  let totalR = 0, totalG = 0, totalB = 0;
  let warmPixels = 0, coolPixels = 0;
  let saturatedPixels = 0;
  let skinTonePixels = 0;
  const count = d.length / 4;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i+1], b = d[i+2];
    totalR += r; totalG += g; totalB += b;

    // Warm vs cool
    if (r > b + 20) warmPixels++;
    else if (b > r + 20) coolPixels++;

    // Saturation check
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max > 0 && (max - min) / max > 0.3) saturatedPixels++;

    // Skin tone detection (simplified)
    if (r > 95 && g > 40 && b > 20 && r > g && r > b &&
        Math.abs(r - g) > 15 && r - Math.min(g, b) > 15) {
      skinTonePixels++;
    }
  }

  return {
    avgR: totalR / count,
    avgG: totalG / count,
    avgB: totalB / count,
    warmth: (warmPixels - coolPixels) / count, // positive = warm, negative = cool
    saturation: saturatedPixels / count,
    skinToneRatio: skinTonePixels / count,
    dominantChannel: totalR > totalG && totalR > totalB ? 'red'
                   : totalG > totalR && totalG > totalB ? 'green'
                   : 'blue',
  };
};

/**
 * Analyze exposure from histogram
 */
const analyzeExposure = (histogram) => {
  const { luminance, totalPixels } = histogram;
  let darkPixels = 0, midPixels = 0, brightPixels = 0;

  for (let i = 0; i < 85; i++) darkPixels += luminance[i];
  for (let i = 85; i < 170; i++) midPixels += luminance[i];
  for (let i = 170; i < 256; i++) brightPixels += luminance[i];

  const darkRatio = darkPixels / totalPixels;
  const midRatio = midPixels / totalPixels;
  const brightRatio = brightPixels / totalPixels;

  // Calculate average luminance
  let totalLum = 0;
  for (let i = 0; i < 256; i++) totalLum += i * luminance[i];
  const avgLuminance = totalLum / totalPixels;

  // Dynamic range
  let firstNonZero = 255, lastNonZero = 0;
  for (let i = 0; i < 256; i++) {
    if (luminance[i] > 0) { firstNonZero = Math.min(firstNonZero, i); break; }
  }
  for (let i = 255; i >= 0; i--) {
    if (luminance[i] > 0) { lastNonZero = Math.max(lastNonZero, i); break; }
  }
  const dynamicRange = lastNonZero - firstNonZero;

  // Determine exposure state
  let state = 'correct';
  if (avgLuminance < 70) state = 'underexposed';
  else if (avgLuminance > 185) state = 'overexposed';
  else if (dynamicRange < 150) state = 'low-contrast';
  else if (darkRatio > 0.6) state = 'dark';
  else if (brightRatio > 0.6) state = 'bright';

  return {
    avgLuminance,
    darkRatio,
    midRatio,
    brightRatio,
    dynamicRange,
    state,
    firstNonZero,
    lastNonZero,
  };
};

/**
 * Analyze composition (simplified rule of thirds)
 */
const analyzeComposition = (imageData, width, height) => {
  const d = imageData.data;
  const thirdW = width / 3;
  const thirdH = height / 3;

  // Find regions of interest (high contrast / bright areas)
  const regions = [
    { name: 'top-left', x: 0, y: 0, w: thirdW, h: thirdH, score: 0 },
    { name: 'top-center', x: thirdW, y: 0, w: thirdW, h: thirdH, score: 0 },
    { name: 'top-right', x: thirdW*2, y: 0, w: thirdW, h: thirdH, score: 0 },
    { name: 'mid-left', x: 0, y: thirdH, w: thirdW, h: thirdH, score: 0 },
    { name: 'center', x: thirdW, y: thirdH, w: thirdW, h: thirdH, score: 0 },
    { name: 'mid-right', x: thirdW*2, y: thirdH, w: thirdW, h: thirdH, score: 0 },
    { name: 'bot-left', x: 0, y: thirdH*2, w: thirdW, h: thirdH, score: 0 },
    { name: 'bot-center', x: thirdW, y: thirdH*2, w: thirdW, h: thirdH, score: 0 },
    { name: 'bot-right', x: thirdW*2, y: thirdH*2, w: thirdW, h: thirdH, score: 0 },
  ];

  // Score each region by brightness and contrast
  for (const region of regions) {
    let brightness = 0, pixels = 0;
    for (let y = Math.floor(region.y); y < Math.floor(region.y + region.h); y++) {
      for (let x = Math.floor(region.x); x < Math.floor(region.x + region.w); x++) {
        const idx = (y * width + x) * 4;
        brightness += 0.299 * d[idx] + 0.587 * d[idx+1] + 0.114 * d[idx+2];
        pixels++;
      }
    }
    region.score = pixels > 0 ? brightness / pixels / 255 : 0;
  }

  // Find subject (highest brightness region)
  const subject = regions.reduce((max, r) => r.score > max.score ? r : max, regions[0]);

  // Check if subject is on a third line
  const onThirdLine = subject.name.includes('left') || subject.name.includes('right') ||
                       subject.name.includes('top') || subject.name.includes('bot');

  return {
    regions,
    subject,
    onThirdLine,
    suggestion: onThirdLine
      ? 'Good composition — subject is near a power point'
      : 'Consider cropping to place the subject on a third line',
  };
};

/**
 * Analyze mood from colors and exposure
 */
const analyzeMood = (colorProfile, exposure) => {
  const { warmth, saturation } = colorProfile;
  const { avgLuminance } = exposure;

  let mood = 'neutral';
  if (warmth > 0.1 && saturation > 0.3) mood = 'warm-vibrant';
  else if (warmth > 0.1) mood = 'warm-muted';
  else if (warmth < -0.1 && saturation > 0.3) mood = 'cool-vibrant';
  else if (warmth < -0.1) mood = 'cool-muted';
  else if (saturation < 0.15) mood = 'desaturated';
  else if (avgLuminance < 80) mood = 'dark-dramatic';
  else if (avgLuminance > 180) mood = 'bright-airy';

  return mood;
};

/**
 * Generate intelligent suggestions based on analysis
 */
const generateSuggestions = (exposure, colorProfile, composition, mood) => {
  const suggestions = [];

  // Exposure suggestions
  if (exposure.state === 'underexposed') {
    suggestions.push({
      type: 'adjustment',
      action: { brightness: 25, contrast: 10 },
      reason: 'Image is underexposed — brightening will reveal detail',
      confidence: 0.9,
    });
  } else if (exposure.state === 'overexposed') {
    suggestions.push({
      type: 'adjustment',
      action: { brightness: -20, contrast: 15 },
      reason: 'Image is overexposed — reducing brightness and adding contrast',
      confidence: 0.85,
    });
  } else if (exposure.state === 'low-contrast') {
    suggestions.push({
      type: 'adjustment',
      action: { contrast: 25 },
      reason: 'Low contrast — adding contrast will make the image pop',
      confidence: 0.8,
    });
  }

  // Color suggestions
  if (colorProfile.warmth < -0.15) {
    suggestions.push({
      type: 'adjustment',
      action: { temperature: 20 },
      reason: 'Image feels cool — warming it up will look more natural',
      confidence: 0.75,
    });
  } else if (colorProfile.warmth > 0.2) {
    suggestions.push({
      type: 'adjustment',
      action: { temperature: -15 },
      reason: 'Image is very warm — cooling slightly for balance',
      confidence: 0.7,
    });
  }

  // Saturation
  if (colorProfile.saturation < 0.15) {
    suggestions.push({
      type: 'adjustment',
      action: { saturation: 20 },
      reason: 'Colors are muted — boosting saturation',
      confidence: 0.7,
    });
  } else if (colorProfile.saturation > 0.6) {
    suggestions.push({
      type: 'adjustment',
      action: { saturation: -15 },
      reason: 'Colors are very saturated — slightly reducing for realism',
      confidence: 0.65,
    });
  }

  // Composition
  if (!composition.onThirdLine) {
    suggestions.push({
      type: 'composition',
      action: 'crop-suggestion',
      reason: composition.suggestion,
      confidence: 0.6,
    });
  }

  // Mood-based filter suggestions
  if (mood === 'dark-dramatic') {
    suggestions.push({
      type: 'filter',
      action: 'noir',
      reason: 'Dark dramatic mood — Noir filter enhances the drama',
      confidence: 0.6,
    });
  } else if (mood === 'bright-airy') {
    suggestions.push({
      type: 'filter',
      action: 'matte',
      reason: 'Bright airy feel — Matte gives a film-like quality',
      confidence: 0.6,
    });
  } else if (colorProfile.skinToneRatio > 0.05) {
    suggestions.push({
      type: 'filter',
      action: 'cinematic',
      reason: 'People detected — Cinematic adds a professional look',
      confidence: 0.55,
    });
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence);

  return suggestions.slice(0, 5);
};

/**
 * Compute auto-enhance settings
 */
const computeAutoEnhance = (exposure, colorProfile, histogram) => {
  const settings = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    temperature: 0,
    exposure: 0,
    sharpness: 0,
  };

  // Auto brightness based on average luminance
  const targetLuminance = 128;
  const lumDiff = targetLuminance - exposure.avgLuminance;
  settings.brightness = Math.round(Math.max(-50, Math.min(50, lumDiff * 0.3)));

  // Auto contrast
  if (exposure.dynamicRange < 180) {
    settings.contrast = Math.round((200 - exposure.dynamicRange) * 0.2);
  }

  // Auto saturation
  if (colorProfile.saturation < 0.2) {
    settings.saturation = Math.round(20 - colorProfile.saturation * 50);
  } else if (colorProfile.saturation > 0.5) {
    settings.saturation = Math.round(-10);
  }

  // Auto temperature
  if (colorProfile.warmth < -0.1) {
    settings.temperature = Math.round(15);
  } else if (colorProfile.warmth > 0.15) {
    settings.temperature = Math.round(-10);
  }

  // Auto exposure
  if (exposure.state === 'underexposed') {
    settings.exposure = Math.round(15);
  } else if (exposure.state === 'overexposed') {
    settings.exposure = Math.round(-10);
  }

  // Slight sharpness for most images
  settings.sharpness = 15;

  return settings;
};

/**
 * Process natural language commands into edit actions.
 * Simple keyword matching — no external API needed.
 */
export const processNaturalLanguage = (command) => {
  const cmd = command.toLowerCase().trim();
  const actions = [];

  // Brightness
  if (cmd.match(/bright|lighter|expose|lift| exposure/)) {
    actions.push({ type: 'adjustment', key: 'brightness', value: 25, reason: 'Brightening image' });
  }
  if (cmd.match(/dark|dim|shadow|moody/)) {
    actions.push({ type: 'adjustment', key: 'brightness', value: -20, reason: 'Darkening image' });
  }

  // Contrast
  if (cmd.match(/contrast|pop|punch|vivid|sharp/)) {
    actions.push({ type: 'adjustment', key: 'contrast', value: 25, reason: 'Adding contrast' });
  }
  if (cmd.match(/soft|gentle|mellow|flat/)) {
    actions.push({ type: 'adjustment', key: 'contrast', value: -15, reason: 'Softening contrast' });
  }

  // Color
  if (cmd.match(/warm|golden|sunset|cozy|amber/)) {
    actions.push({ type: 'adjustment', key: 'temperature', value: 25, reason: 'Warming tones' });
  }
  if (cmd.match(/cool|blue|cold|ice|frost/)) {
    actions.push({ type: 'adjustment', key: 'temperature', value: -25, reason: 'Cooling tones' });
  }
  if (cmd.match(/saturation|colorful|vibrant|rich/)) {
    actions.push({ type: 'adjustment', key: 'saturation', value: 25, reason: 'Boosting saturation' });
  }
  if (cmd.match(/desaturate|mute|subtle|pastel/)) {
    actions.push({ type: 'adjustment', key: 'saturation', value: -25, reason: 'Reducing saturation' });
  }

  // Filters
  if (cmd.match(/vintage|retro|old|film|nostalgic/)) {
    actions.push({ type: 'filter', name: 'vintage', reason: 'Applying vintage look' });
  }
  if (cmd.match(/cinematic|movie|drama|teal/)) {
    actions.push({ type: 'filter', name: 'cinematic', reason: 'Applying cinematic look' });
  }
  if (cmd.match(/noir|black.?and.?white|bw|monochrome/)) {
    actions.push({ type: 'filter', name: 'noir', reason: 'Applying noir look' });
  }
  if (cmd.match(/dreamy|soft focus|ethereal|glow/)) {
    actions.push({ type: 'filter', name: 'dreamy', reason: 'Applying dreamy effect' });
  }
  if (cmd.match(/neon|cyber|glow|electric/)) {
    actions.push({ type: 'filter', name: 'neon', reason: 'Applying neon effect' });
  }
  if (cmd.match(/matte|faded|film look/)) {
    actions.push({ type: 'filter', name: 'matte', reason: 'Applying matte look' });
  }
  if (cmd.match(/hdr|dramatic|intense|pop/)) {
    actions.push({ type: 'filter', name: 'hdrPop', reason: 'Applying HDR pop effect' });
  }
  if (cmd.match(/sepia|brown|warm vintage/)) {
    actions.push({ type: 'filter', name: 'sepia', reason: 'Applying sepia tone' });
  }

  // Exposure
  if (cmd.match(/exposure|overexposed|too bright|blown/)) {
    actions.push({ type: 'adjustment', key: 'exposure', value: -15, reason: 'Reducing exposure' });
  }

  // Sharpness
  if (cmd.match(/sharpen|crisp|detailed|clarity/)) {
    actions.push({ type: 'adjustment', key: 'sharpness', value: 30, reason: 'Adding sharpness' });
  }

  // Reset
  if (cmd.match(/reset|original|undo|clear|start over/)) {
    actions.push({ type: 'reset', reason: 'Resetting to original' });
  }

  // Enhance (auto)
  if (cmd.match(/enhance|auto|fix|improve|optimize|best/)) {
    actions.push({ type: 'auto-enhance', reason: 'Auto-enhancing image' });
  }

  return {
    parsed: actions,
    interpretation: actions.length > 0
      ? actions.map(a => a.reason).join(', ')
      : 'I didn\'t understand that. Try: "make it warmer", "add contrast", "vintage look"',
  };
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
  analyzeImage,
  processNaturalLanguage,
};
