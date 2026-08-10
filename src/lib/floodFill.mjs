/**
 * Pure flood-fill (magic wand) core. No DOM, no I/O — Node-testable.
 * Fills a Uint8 mask (1 = selected) from (startX, startY), comparing each
 * candidate pixel to the SEED pixel's RGB with an explicit 8-way stack
 * (never recurses, so large images can't overflow the call stack).
 *
 * @param {{data: Uint8ClampedArray, width: number, height: number}} img - Raw pixel buffer
 * @param {number} startX - Seed x (image pixels)
 * @param {number} startY - Seed y (image pixels)
 * @param {number} thresholdSq - Squared Euclidean RGB distance limit
 * @returns {Uint8Array} mask where 1 = selected, 0 = not
 */
export function floodFill(img, startX, startY, thresholdSq) {
  const { data, width, height } = img;
  const mask = new Uint8Array(width * height);
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return mask;

  const seedIdx = (startY * width + startX) * 4;
  const seedR = data[seedIdx];
  const seedG = data[seedIdx + 1];
  const seedB = data[seedIdx + 2];

  const stack = [startX, startY];
  mask[startY * width + startX] = 1;

  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(height - 1, y + 1);
    const x0 = Math.max(0, x - 1);
    const x1 = Math.min(width - 1, x + 1);
    for (let ny = y0; ny <= y1; ny++) {
      const row = ny * width;
      for (let nx = x0; nx <= x1; nx++) {
        const p = row + nx;
        if (mask[p]) continue;
        const i = p * 4;
        const dr = data[i] - seedR;
        const dg = data[i + 1] - seedG;
        const db = data[i + 2] - seedB;
        if (dr * dr + dg * dg + db * db <= thresholdSq) {
          mask[p] = 1;
          stack.push(nx, ny);
        }
      }
    }
  }
  return mask;
}
