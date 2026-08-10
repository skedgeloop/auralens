import React, { useState, useEffect, useRef } from 'react';
import { FiBarChart2 } from 'react-icons/fi';
import { computeHistogram, computeVectorscope } from '../lib/imageFilters';

const BAR_W = 256;
const BAR_H = 64;
const LUM_COLOR = 'rgba(255,255,255,0.9)';
const CHANNELS = [
  { key: 'r', color: 'rgba(255,77,109,0.55)' },
  { key: 'g', color: 'rgba(77,255,136,0.55)' },
  { key: 'b', color: 'rgba(77,141,255,0.55)' },
];

/** Draw one series of 256 bar counts into a canvas (null counts clears it). */
const drawBars = (canvas, counts, color) => {
  if (!canvas) return; // canvas not mounted yet (hist still loading) — avoid crash
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  if (!counts) return;
  const max = Math.max(...counts) || 1;
  const barW = w / counts.length;
  ctx.fillStyle = color;
  for (let i = 0; i < counts.length; i++) {
    const bh = Math.max(1, Math.round((counts[i] / max) * h));
    ctx.fillRect(i * barW, h - bh, barW + 0.5, bh);
  }
};

const Stat = ({ label, value }) => (
  <div className="flex flex-col items-center rounded-md bg-[var(--surface-2)] py-1.5">
    <span className="text-[10px] font-bold text-[var(--text-dim)] tabular-nums font-mono">{value}</span>
    <span className="text-[9px] uppercase tracking-wider text-[var(--text-dim)]">{label}</span>
  </div>
);

/**
 * Histogram & Waveform Scope — read-only image analysis panel.
 * Recomputes whenever `imageSrc` changes. No apply button; nothing to commit.
 */
export default function HistogramPanel({ imageSrc }) {
  const [hist, setHist] = useState(null);
  const [scope, setScope] = useState('');
  const [showScope, setShowScope] = useState(false);
  const lumRef = useRef(null);
  const rgbRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setHist(null);
    setScope('');
    if (!imageSrc) return;
    Promise.all([computeHistogram(imageSrc), computeVectorscope(imageSrc)]).then(([h, s]) => {
      if (cancelled) return;
      setHist(h);
      setScope(s);
    });
    return () => { cancelled = true; };
  }, [imageSrc]);

  useEffect(() => {
    drawBars(lumRef.current, hist?.luminance || null, LUM_COLOR);
  }, [hist]);

  useEffect(() => {
    drawBars(rgbRef.current, null);
    if (hist) CHANNELS.forEach((c) => drawBars(rgbRef.current, hist[c.key], c.color));
  }, [hist]);

  return (
    <div className="flex flex-col gap-3">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] flex items-center gap-1.5">
        <FiBarChart2 className="w-3.5 h-3.5" /> scope
      </span>

      {!hist ? (
        <p className="text-[11px] text-[var(--text-dim)]">no image loaded</p>
      ) : (
        <>
          {/* Luminance histogram */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">luminance</span>
            <canvas
              ref={lumRef}
              width={BAR_W}
              height={BAR_H}
              aria-label="luminance histogram"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)]"
            />
          </div>

          {/* RGB histogram */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">rgb</span>
              <div className="flex items-center gap-2">
                {CHANNELS.map((c) => (
                  <span key={c.key} className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-dim)]">
                    <span className="w-2 h-2 rounded-sm inline-block" style={{ background: c.color }} />
                    {c.key.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            <canvas
              ref={rgbRef}
              width={BAR_W}
              height={BAR_H}
              aria-label="rgb histogram"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)]"
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-1.5">
            <Stat label="avg lum" value={Math.round(hist.avgLuminance)} />
            <Stat label="dark" value={`${Math.round(hist.darkRatio * 100)}%`} />
            <Stat label="mid" value={`${Math.round(hist.midRatio * 100)}%`} />
            <Stat label="bright" value={`${Math.round(hist.brightRatio * 100)}%`} />
          </div>
          <p className="text-[9px] text-[var(--text-dim)] leading-snug">
            dark &lt;85 · mid 85–170 · bright &gt;170
          </p>

          {/* Vectorscope toggle */}
          <button
            onClick={() => setShowScope((s) => !s)}
            className="mt-1 text-[11px] font-bold uppercase tracking-wider transition-all rounded-md py-2 border border-[var(--border)] text-[var(--text-dim)] hover:text-white hover:border-[var(--pink)] flex items-center justify-center gap-1.5"
            aria-expanded={showScope}
          >
            <FiBarChart2 className="w-3.5 h-3.5" /> {showScope ? 'hide' : 'show'} vectorscope
          </button>
          {showScope && (
            scope ? (
              <img
                src={scope}
                alt="chroma vectorscope"
                className="w-full rounded-md border border-[var(--border)] aspect-square object-contain bg-[var(--surface-2)]"
              />
            ) : (
              <p className="text-[10px] text-[var(--text-dim)]">could not render vectorscope</p>
            )
          )}
        </>
      )}
    </div>
  );
}
