import React, { useState } from 'react';
import { FiX, FiDownload } from 'react-icons/fi';

const FORMATS = [
  { key: 'png', label: 'PNG', desc: 'lossless, big file' },
  { key: 'jpeg', label: 'JPEG', desc: 'lossy, small file' },
  { key: 'webp', label: 'WebP', desc: 'modern, best of both' },
];

export default function ExportDialog({ isOpen, onClose, onExport, imageWidth, imageHeight }) {
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(92);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-base font-bold text-white">export</h3>
          <button onClick={onClose} className="btn-icon" style={{ width: 28, height: 28 }}>
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Format */}
        <div className="mb-5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2 block">
            format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === f.key
                    ? 'border-[var(--pink)] bg-[rgba(255,45,111,0.08)] text-white'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[#333]'
                }`}
              >
                <div className="text-sm font-bold">{f.label}</div>
                <div className="text-[10px] mt-0.5 opacity-50">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        {format !== 'png' && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                quality
              </label>
              <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{quality}%</span>
            </div>
            <input
              type="range" min={10} max={100} value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${quality}%, #222 ${quality}%)`,
              }}
            />
          </div>
        )}

        {/* Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] mb-5">
          <div>
            <div className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">size</div>
            <div className="text-sm text-white font-mono">{imageWidth || '?'} × {imageHeight || '?'}</div>
          </div>
        </div>

        <button onClick={() => onExport({ format, quality: quality / 100 })} className="btn btn-pink w-full">
          <FiDownload className="w-4 h-4" /> export {format.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
