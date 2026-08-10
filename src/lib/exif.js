/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
/**
 * Minimal hand-rolled EXIF reader for JPEG data URLs. No libraries.
 *
 * This app uploads images as data URLs via FileReader.readAsDataURL, which
 * preserves the original file bytes — so a JPEG data URL still carries its
 * APP1/Exif segment. (Canvas re-encodes to PNG, which has no EXIF; for those
 * `readExif` returns null and the UI falls back to its dimension footer.)
 *
 * Parse approach:
 *  1. Find the APP1 segment whose payload starts with "Exif\0\0".
 *  2. Read the TIFF header (byte-order magic + 0x2A).
 *  3. Walk IFD0 for Make/Model and the Exif sub-IFD pointer (0x8769).
 *  4. Walk the Exif sub-IFD for ISO, ExposureTime, FNumber, FocalLength, DateTime.
 */

const EXIF_HEADER = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]; // "Exif\0\0"

/**
 * Locate the TIFF DataView inside a JPEG byte buffer, or null.
 * @param {Uint8Array} bytes - Full JPEG file bytes
 * @returns {DataView|null}
 */
export const findExifSegment = (bytes) => {
  if (!bytes || bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let off = 2;
  while (off + 4 <= bytes.length) {
    if (bytes[off] !== 0xff) { off++; continue; }
    const marker = bytes[off + 1];
    // SOS / EOI — no more metadata segments after this.
    if (marker === 0xda || marker === 0xd9) return null;
    // Standalone markers (no length field).
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { off += 2; continue; }

    const len = (bytes[off + 2] << 8) | bytes[off + 3];
    if (len < 2 || off + 2 + len > bytes.length) return null;

    const hasExifHeader =
      len >= 8 &&
      bytes[off + 4] === EXIF_HEADER[0] && bytes[off + 5] === EXIF_HEADER[1] &&
      bytes[off + 6] === EXIF_HEADER[2] && bytes[off + 7] === EXIF_HEADER[3] &&
      bytes[off + 8] === EXIF_HEADER[4] && bytes[off + 9] === EXIF_HEADER[5];

    if (marker === 0xe1 && hasExifHeader) {
      // TIFF starts after marker (2) + length (2) + "Exif\0\0" (6) = off + 10.
      return new DataView(bytes.buffer, bytes.byteOffset + off + 10, len - 8);
    }
    off += 2 + len;
  }
  return null;
};

const readAscii = (tiff, valueField, count, littleEndian) => {
  let offset = valueField;
  if (count > 4) offset = tiff.getUint32(valueField, littleEndian);
  if (offset + count > tiff.byteLength) return null;
  let s = '';
  for (let i = 0; i < count; i++) {
    const c = tiff.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s.trim() || null;
};

const readRational = (tiff, valueField, littleEndian) => {
  const offset = tiff.getUint32(valueField, littleEndian);
  if (offset + 8 > tiff.byteLength) return null;
  const num = tiff.getUint32(offset, littleEndian);
  const den = tiff.getUint32(offset + 4, littleEndian);
  return den ? num / den : null;
};

/**
 * Parse a TIFF structure (from a JPEG APP1/Exif segment) into
 * { make, model, iso, exposureTime, fNumber, focalLength, dateTime } or null.
 * @param {DataView} tiff
 * @returns {Object|null}
 */
export const parseTiff = (tiff) => {
  if (!tiff || tiff.byteLength < 8) return null;
  const littleEndian = tiff.getUint16(0) === 0x4949; // 'II' vs 'MM'
  if (tiff.getUint16(2, littleEndian) !== 0x2a) return null;

  const out = {};
  const readIfd = (offset) => {
    if (offset + 2 > tiff.byteLength) return null;
    const count = tiff.getUint16(offset, littleEndian);
    let exifOffset = null;
    for (let i = 0; i < count; i++) {
      const e = offset + 2 + i * 12;
      if (e + 12 > tiff.byteLength) break;
      const tag = tiff.getUint16(e, littleEndian);
      const type = tiff.getUint16(e + 2, littleEndian);
      const valueCount = tiff.getUint32(e + 4, littleEndian);
      const valueField = e + 8;

      if (tag === 0x010f && !out.make) out.make = readAscii(tiff, valueField, valueCount, littleEndian);
      else if (tag === 0x0110 && !out.model) out.model = readAscii(tiff, valueField, valueCount, littleEndian);
      else if (tag === 0x8769) exifOffset = tiff.getUint32(valueField, littleEndian);
      else if (tag === 0x8827 && out.iso == null) out.iso = tiff.getUint16(valueField, littleEndian); // SHORT
      else if (tag === 0x829a && out.exposureTime == null) out.exposureTime = readRational(tiff, valueField, littleEndian);
      else if (tag === 0x829d && out.fNumber == null) out.fNumber = readRational(tiff, valueField, littleEndian);
      else if (tag === 0x920a && out.focalLength == null) out.focalLength = readRational(tiff, valueField, littleEndian);
      else if (tag === 0x9003 && !out.dateTime) out.dateTime = readAscii(tiff, valueField, valueCount, littleEndian);
    }
    return exifOffset;
  };

  const exifOffset = readIfd(tiff.getUint32(4, littleEndian));
  if (exifOffset != null) readIfd(exifOffset);

  const hasAny =
    out.make || out.model || out.iso != null || out.exposureTime != null ||
    out.fNumber != null || out.focalLength != null || out.dateTime;
  return hasAny ? out : null;
};

/**
 * Parse EXIF from a full JPEG byte buffer.
 * @param {Uint8Array} bytes
 * @returns {Object|null}
 */
export const parseExifBytes = (bytes) => {
  const tiff = findExifSegment(bytes);
  return tiff ? parseTiff(tiff) : null;
};

/**
 * Read EXIF + dimensions from an image data URL.
 * Returns null when the image can't be decoded or carries no EXIF.
 * @param {string} imageSrc - Image data URL
 * @returns {Promise<{ make, model, iso, exposureTime, fNumber, focalLength, dateTime, width, height }|null>}
 */
export const readExif = (imageSrc) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const dims = { width: img.width, height: img.height };
      let parsed = null;
      try {
        const m = /^data:image\/jpe?g;base64,([A-Za-z0-9+/=]+)$/.exec(imageSrc || '');
        if (m) {
          const bin = atob(m[1]);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          parsed = parseExifBytes(bytes);
        }
      } catch (e) {
        parsed = null;
      }
      resolve(parsed ? { ...parsed, ...dims } : null);
    };
    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });

export default readExif;
