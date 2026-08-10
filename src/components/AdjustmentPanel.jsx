/* AURA-ORIGIN:skedgeloop@proton.me|github:skedgeloop|auralens */
import React, { useState, useCallback } from 'react';
import { FiRotateCcw, FiCheck } from 'react-icons/fi';

const ADJUSTMENTS = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, default: 0 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
  { key: 'temperature', label: 'Temp', min: -100, max: 100, default: 0 },
  { key: 'hue', label: 'Hue', min: -180, max: 180, default: 0 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, default: 0 },
  { key: 'exposure', label: 'Exposure', min: -100, max: 100, default: 0 },
];

const RGB_CHANNELS = [
  { key: 'r', label: 'Red', default: 100 },
  { key: 'g', label: 'Green', default: 100 },
  { key: 'b', label: 'Blue', default: 100 },
];

export default function AdjustmentPanel({ onAdjust, activeAdjustments, onResetAll, onApplyGradient, onPreviewGrade, previewImage }) {
  const [local, setLocal] = useState(() => {
    const init = {};
    ADJUSTMENTS.forEach((a) => { init[a.key] = a.default; });
    return init;
  });
  const [rgb, setRgb] = useState({ r: 100, g: 100, b: 100 });
  const [shadowColor, setShadowColor] = useState('#00a8ff');
  const [highlightColor, setHighlightColor] = useState('#ff7a2d');
  const [gradeTemp, setGradeTemp] = useState(0);
  const [gradeVib, setGradeVib] = useState(0);

  const handleChange = useCallback((key, value) => {
    const num = Number(value);
    setLocal((prev) => ({ ...prev, [key]: num }));
    onAdjust(key, num);
  }, [onAdjust]);

  const handleReset = useCallback((key) => {
    const def = ADJUSTMENTS.find((a) => a.key === key)?.default || 0;
    setLocal((prev) => ({ ...prev, [key]: def }));
    onAdjust(key, def);
  }, [onAdjust]);

  const gradeOptions = useCallback(() => ({
    rgb,
    gradient: [
      { pos: 0, color: shadowColor },
      { pos: 1, color: highlightColor },
    ],
    temperature: gradeTemp,
    vibrance: gradeVib,
  }), [rgb, shadowColor, highlightColor, gradeTemp, gradeVib]);

  // Live preview on every slider/color change
  const previewGrade = useCallback(() => {
    onPreviewGrade?.(gradeOptions());
  }, [onPreviewGrade, gradeOptions]);

  const handleApplyGrade = useCallback(() => {
    onApplyGradient?.(gradeOptions());
  }, [onApplyGradient, gradeOptions]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          adjustments
        </span>
        {onResetAll && (
          <button
            onClick={() => {
              const reset = {};
              ADJUSTMENTS.forEach((a) => { reset[a.key] = a.default; });
              setLocal(reset);
              onResetAll();
            }}
            className="text-[11px] text-[var(--text-dim)] hover:text-white flex items-center gap-1"
          >
            <FiRotateCcw className="w-3 h-3" /> reset
          </button>
        )}
      </div>

      {ADJUSTMENTS.map((adj) => {
        const val = local[adj.key];
        const isDefault = val === adj.default;
        const pct = adj.min === 0
          ? (val / adj.max) * 100
          : ((val - adj.min) / (adj.max - adj.min)) * 100;

        return (
          <div key={adj.key} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text-dim)] group-hover:text-white transition-colors font-medium">
                {adj.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-7 text-right font-mono">
                  {val}
                </span>
                {!isDefault && (
                  <button
                    onClick={() => handleReset(adj.key)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-dim)] hover:text-white transition-opacity"
                  >
                    <FiRotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            <input
              type="range" min={adj.min} max={adj.max} value={val}
              aria-label={adj.label}
              onChange={(e) => handleChange(adj.key, e.target.value)}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--pink) 0%, var(--pink) ${pct}%, #222 ${pct}%)`,
              }}
            />
          </div>
        );
      })}

      {/* === COLOR / GRADIENT === */}
      <div className="border-t border-[var(--border)] pt-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
          color · gradient
        </span>

        {/* RGB channel gain */}
        {RGB_CHANNELS.map((ch) => (
          <div key={ch.key} className="group mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text-dim)] group-hover:text-white font-medium">{ch.label}</span>
              <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-7 text-right font-mono">{rgb[ch.key]}</span>
            </div>
            <input
              type="range" min={0} max={200} value={rgb[ch.key]}
              aria-label={ch.label}
              onChange={(e) => { setRgb((p) => ({ ...p, [ch.key]: Number(e.target.value) })); previewGrade(); }}
              className="slider"
              style={{
                background: `linear-gradient(to right, ${ch.key === 'r' ? '#ff4d6d' : ch.key === 'g' ? '#4dff88' : '#4d8dff'} 0%, ${ch.key === 'r' ? '#ff4d6d' : ch.key === 'g' ? '#4dff88' : '#4d8dff'} ${((rgb[ch.key] - 0) / 200) * 100}%, #222 ${((rgb[ch.key] - 0) / 200) * 100}%)`,
              }}
            />
          </div>
        ))}

        {/* Gradient stops — split tone */}
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text-dim)]">shadows</span>
              <input type="color" value={shadowColor} onChange={(e) => { setShadowColor(e.target.value); previewGrade(); }}
                aria-label="Shadows"
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-dim)]">highlights</span>
              <input type="color" value={highlightColor} onChange={(e) => { setHighlightColor(e.target.value); previewGrade(); }}
                aria-label="Highlights"
                className="w-6 h-6 rounded cursor-pointer bg-transparent border-0" />
            </div>
          </div>
          {/* live gradient preview */}
          <div className="w-14 h-12 rounded-md border border-[var(--border)]"
            style={{ background: `linear-gradient(to bottom, ${highlightColor}, ${shadowColor})` }} />
        </div>

        {/* temperature + vibrance */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[var(--text-dim)]">temperature</span>
            <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{gradeTemp}</span>
          </div>
          <input type="range" min={-100} max={100} value={gradeTemp} aria-label="Temperature" onChange={(e) => { setGradeTemp(Number(e.target.value)); previewGrade(); }} className="slider" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-[var(--text-dim)]">vibrance</span>
            <span className="text-[11px] text-[var(--text-dim)] tabular-nums font-mono">{gradeVib}</span>
          </div>
          <input type="range" min={-100} max={100} value={gradeVib} aria-label="Vibrance" onChange={(e) => { setGradeVib(Number(e.target.value)); previewGrade(); }} className="slider" />
        </div>

        <button onClick={handleApplyGrade} className="btn btn-pink w-full mt-4 py-2.5 text-xs">
          <FiCheck className="w-3.5 h-3.5" /> apply grade
        </button>
      </div>
    </div>
  );
}

export function applyAdjustments(imageSrc, adjustments) {
  if (!imageSrc || !adjustments) return Promise.resolve(imageSrc);
  const hasAny = Object.values(adjustments).some((v) => v !== 0);
  if (!hasAny) return Promise.resolve(imageSrc);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;

      const brightness = (adjustments.brightness || 0) * 2.55;
      const contrast = (adjustments.contrast || 0) / 100;
      const saturation = (adjustments.saturation || 0) / 100;
      const temperature = (adjustments.temperature || 0) / 100;
      const exposure = (adjustments.exposure || 0) / 100;
      const contrastFactor = (1 + contrast) * (1 + contrast);

      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i+1], b = d[i+2];
        r += brightness; g += brightness; b += brightness;
        if (exposure !== 0) { const m = Math.pow(2, exposure); r *= m; g *= m; b *= m; }
        if (contrast !== 0) {
          r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
        }
        if (saturation !== 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const sat = 1 + saturation;
          r = gray + sat * (r - gray); g = gray + sat * (g - gray); b = gray + sat * (b - gray);
        }
        if (temperature !== 0) { r += temperature * 30; b -= temperature * 30; }
        d[i] = Math.max(0, Math.min(255, r));
        d[i+1] = Math.max(0, Math.min(255, g));
        d[i+2] = Math.max(0, Math.min(255, b));
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export { ADJUSTMENTS };
