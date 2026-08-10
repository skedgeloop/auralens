/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState, useCallback } from 'react';
import { FiCheck } from 'react-icons/fi';

const RETOUCH_SLIDERS = [
  { key: 'skin', label: 'Skin Smoothing', min: 0, max: 100, default: 50 },
  { key: 'teeth', label: 'Teeth Whitening', min: 0, max: 100, default: 50 },
  { key: 'redEye', label: 'Red-Eye', min: 0, max: 100, default: 50 },
];

export default function PortraitPanel({ imageSrc, onApplyRetouch }) {
  const [opts, setOpts] = useState(() => {
    const init = {};
    RETOUCH_SLIDERS.forEach((s) => { init[s.key] = s.default; });
    return init;
  });
  const [loading, setLoading] = useState(false);

  const handleApply = useCallback(async () => {
    if (!imageSrc || loading) return;
    setLoading(true);
    try {
      await onApplyRetouch?.(opts);
    } finally {
      setLoading(false);
    }
  }, [imageSrc, loading, opts, onApplyRetouch]);

  return (
    <div className="panel p-3">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)] mb-2 block">
        portrait retouch
      </span>
      {RETOUCH_SLIDERS.map((s) => {
        const val = opts[s.key];
        const pct = ((val - s.min) / (s.max - s.min)) * 100;
        return (
          <div key={s.key} className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-dim)] font-medium">{s.label}</span>
              <span className="text-[10px] text-[var(--text-dim)] tabular-nums font-mono">{val}</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} value={val}
              aria-label={s.label}
              onChange={(e) => setOpts((p) => ({ ...p, [s.key]: Number(e.target.value) }))}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct}%, #222 ${pct}%)`,
              }}
            />
          </div>
        );
      })}
      <button onClick={handleApply} disabled={loading}
        className="btn btn-pink w-full mt-3 py-2.5 text-xs">
        {loading ? (
          <><span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> retouching...</>
        ) : <><FiCheck className="w-3.5 h-3.5" /> apply retouch</>}
      </button>
    </div>
  );
}
