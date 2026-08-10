import React, { useState, useEffect, useCallback } from 'react';
import { FiRefreshCcw, FiCopy } from 'react-icons/fi';
import { extractPalette } from '../lib/imageFilters';

const toRgb = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

export default function PalettePanel({ imageSrc }) {
  const [palette, setPalette] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedHex, setCopiedHex] = useState(null);

  // Recomputed whenever the image changes; refresh re-runs the same extractor.
  const extract = useCallback(() => {
    if (!imageSrc) { setPalette([]); return; }
    let cancelled = false;
    setLoading(true);
    extractPalette(imageSrc, 5).then((result) => {
      if (cancelled) return;
      setPalette(result);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [imageSrc]);

  useEffect(extract, [extract]);

  const handleCopy = useCallback(async (hex) => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopiedHex(hex);
      setTimeout(() => setCopiedHex(null), 1200);
    } catch { /* clipboard unavailable */ }
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          color palette
        </span>
        <button
          onClick={extract}
          aria-label="Refresh palette"
          className="text-[11px] text-[var(--text-dim)] hover:text-white flex items-center gap-1 transition-colors"
        >
          <FiRefreshCcw className="w-3 h-3" /> refresh
        </button>
      </div>

      {palette.length === 0 ? (
        <p className="text-[11px] text-[var(--text-dim)]">
          {loading ? 'extracting colors…' : 'no colors found'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {palette.map(({ hex, rgb, share }) => (
            <button
              key={hex}
              onClick={() => handleCopy(hex)}
              title="click to copy hex"
              className="flex items-center gap-2.5 w-full text-left rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-2 hover:border-[var(--pink)] transition-colors"
            >
              <span className="w-9 h-9 rounded-md border border-black/40 shrink-0" style={{ background: hex }} />
              <span className="flex-1 min-w-0">
                <span className="block text-[11px] font-mono text-white leading-tight">{hex}</span>
                <span className="block text-[10px] font-mono text-[var(--text-dim)] leading-tight">{toRgb(rgb)}</span>
              </span>
              <span className="text-[10px] font-mono text-[var(--text-dim)] tabular-nums">
                {Math.round(share * 100)}%
              </span>
              {copiedHex === hex && <FiCopy className="w-3 h-3 text-[var(--pink)] shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
