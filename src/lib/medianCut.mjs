/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Pure median-cut color quantization core. No DOM, no I/O — Node-testable.
 * Reduces a set of opaque RGBA pixels to `count` dominant colors by repeatedly
 * splitting the box with the largest RGB volume along its longest channel.
 *
 * @param {Uint8ClampedArray|number[]} data - RGBA pixel buffer (row-major)
 * @param {number} count - Target number of colors (default 5, capped 1-16)
 * @returns {{ hex: string, rgb: [number, number, number], share: number }[]}
 *   Dominant colors sorted by share (descending). Fewer than `count` when the
 *   image can't be split that far (e.g. a solid-color image).
 */
export function medianCutPalette(data, count = 5) {
  const k = Math.max(1, Math.min(16, count));

  // Collect opaque pixels only (alpha < 128 treated as transparent).
  const points = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] >= 128) points.push([data[i], data[i + 1], data[i + 2]]);
  }
  if (points.length === 0) return [];
  const total = points.length;

  const range = (pts) => {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const p of pts) {
      if (p[0] < rMin) rMin = p[0];
      if (p[0] > rMax) rMax = p[0];
      if (p[1] < gMin) gMin = p[1];
      if (p[1] > gMax) gMax = p[1];
      if (p[2] < bMin) bMin = p[2];
      if (p[2] > bMax) bMax = p[2];
    }
    return { rMin, rMax, gMin, gMax, bMin, bMax };
  };

  // Split a box into two along its longest channel at the mid-point. With a
  // non-zero span the extremes land on opposite sides, so both halves are
  // non-empty; the luminance fallback is a safety net for degenerate input.
  const split = (pts) => {
    const { rMin, rMax, gMin, gMax, bMin, bMax } = range(pts);
    let ch, lo, hi;
    if (rMax - rMin >= gMax - gMin && rMax - rMin >= bMax - bMin) { ch = 0; lo = rMin; hi = rMax; }
    else if (gMax - gMin >= bMax - bMin) { ch = 1; lo = gMin; hi = gMax; }
    else { ch = 2; lo = bMin; hi = bMax; }
    const mid = (lo + hi) / 2;
    const a = [], b = [];
    for (const p of pts) (p[ch] <= mid ? a : b).push(p);
    if (a.length > 0 && b.length > 0) return [a, b];
    if (pts.length < 2) return [pts];
    const sorted = [...pts].sort((x, y) => x[0] + x[1] + x[2] - (y[0] + y[1] + y[2]));
    const half = Math.floor(sorted.length / 2);
    return [sorted.slice(0, half), sorted.slice(half)];
  };

  // Repeatedly split the widest box until we reach k. Uniform boxes (volume 1)
  // are left alone — splitting them would only produce duplicate colors.
  let boxes = [points];
  while (boxes.length < k) {
    let widest = -1, widestVol = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { rMin, rMax, gMin, gMax, bMin, bMax } = range(boxes[i]);
      const vol = (rMax - rMin + 1) * (gMax - gMin + 1) * (bMax - bMin + 1);
      if (vol <= 1) continue; // uniform box — splitting would duplicate its color
      if (vol > widestVol) { widestVol = vol; widest = i; }
    }
    if (widest < 0) break; // nothing left to split
    const parts = split(boxes[widest]);
    boxes = [...boxes.slice(0, widest), ...parts, ...boxes.slice(widest + 1)];
  }

  return boxes
    .map((pts) => {
      let r = 0, g = 0, b = 0;
      for (const p of pts) { r += p[0]; g += p[1]; b += p[2]; }
      const n = pts.length;
      const rgb = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
      const hex = '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');
      return { hex, rgb, share: n / total };
    })
    .sort((a, b) => b.share - a.share);
}
