import React from 'react';
import { FiInfo } from 'react-icons/fi';

const formatExposure = (v) => {
  if (v >= 1) return `${v}s`;
  if (v > 0) return `1/${Math.round(1 / v)}s`;
  return `${v}s`;
};

const ROWS = [
  { key: 'dimensions', label: 'dimensions', value: (e) => `${e.width} × ${e.height}px` },
  { key: 'camera', label: 'camera', value: (e) => [e.make, e.model].filter(Boolean).join(' ') },
  { key: 'captured', label: 'captured', value: (e) => e.dateTime },
  { key: 'iso', label: 'iso', value: (e) => e.iso },
  { key: 'aperture', label: 'aperture', value: (e) => `f/${e.fNumber.toFixed(1)}` },
  { key: 'shutter', label: 'shutter', value: (e) => formatExposure(e.exposureTime) },
  { key: 'focal length', label: 'focal length', value: (e) => `${Math.round(e.focalLength)}mm` },
];

/**
 * Read-only EXIF / metadata viewer. Shows whatever fields are present, or a
 * "no EXIF data found" message when the image carries no camera metadata.
 */
export default function ExifPanel({ exif }) {
  const rows = (exif ? ROWS : [])
    .map(({ key, label, value }) => {
      const v = value(exif);
      return v == null || v === '' ? null : { key, label, value: String(v) };
    })
    .filter(Boolean);

  const hasCamera = rows.some((r) => r.key !== 'dimensions');

  return (
    <div className="border-t border-[var(--border)] pt-3 mt-3">
      <div className="flex items-center gap-1.5 mb-3">
        <FiInfo className="w-3.5 h-3.5 text-[var(--pink)]" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          info & exif
        </span>
      </div>

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map(({ key, label, value }) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider shrink-0">
                {label}
              </span>
              <span className="text-[11px] text-white font-medium text-right break-all">{value}</span>
            </div>
          ))}
        </div>
      )}

      {!hasCamera && (
        <p className="text-xs text-[var(--text-dim)]">no EXIF data found</p>
      )}
    </div>
  );
}
