import React, { useState } from 'react';
import { FiX, FiDownload, FiCheck } from 'react-icons/fi';

const FORMATS = [
  { key: 'png', label: 'PNG', desc: 'Lossless, large file' },
  { key: 'jpeg', label: 'JPEG', desc: 'Lossy, small file' },
  { key: 'webp', label: 'WebP', desc: 'Modern, best balance' },
];

export default function ExportDialog({ isOpen, onClose, onExport, imageWidth, imageHeight, originalSize }) {
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(92);

  if (!isOpen) return null;

  const handleExport = () => {
    onExport({ format, quality: quality / 100 });
  };

  const estimatedSize = format === 'png'
    ? originalSize || 'Unknown'
    : `${Math.round((originalSize || 500) * (quality / 100) * (format === 'webp' ? 0.6 : 1))}KB`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-base font-semibold text-white">Export Image</h3>
          <button onClick={onClose} className="btn-icon" style={{ width: 28, height: 28 }}>
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Format selection */}
        <div className="mb-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)] mb-2 block">
            Format
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FORMATS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFormat(f.key)}
                className={`p-3 rounded-lg border text-center transition-all ${
                  format === f.key
                    ? 'border-[var(--accent)] bg-[rgba(99,102,241,0.1)] text-white'
                    : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--border-hover)]'
                }`}
              >
                <div className="text-sm font-semibold">{f.label}</div>
                <div className="text-[10px] mt-0.5 opacity-60">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Quality slider (for JPEG/WebP) */}
        {format !== 'png' && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
                Quality
              </label>
              <span className="text-[11px] text-[var(--text-dim)] tabular-nums">{quality}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${quality}%, rgba(255,255,255,0.1) ${quality}%)`,
              }}
            />
          </div>
        )}

        {/* Image info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-[var(--border)] mb-5">
          <div>
            <div className="text-xs text-[var(--text-dim)]">Dimensions</div>
            <div className="text-sm text-white tabular-nums">{imageWidth || '?'} × {imageHeight || '?'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--text-dim)]">Est. size</div>
            <div className="text-sm text-white">{estimatedSize}</div>
          </div>
        </div>

        {/* Export button */}
        <button onClick={handleExport} className="btn btn-primary w-full">
          <FiDownload className="w-4 h-4" /> Export {format.toUpperCase()}
        </button>
      </div>
    </div>
  );
}
