import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FiRotateCcw } from 'react-icons/fi';

/**
 * Image adjustment sliders panel.
 * Changes are computed as canvas pixel operations on the fly.
 */

const ADJUSTMENTS = [
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, default: 0 },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, default: 0 },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, default: 0 },
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, default: 0 },
  { key: 'hue', label: 'Hue Shift', min: -180, max: 180, default: 0 },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, default: 0 },
  { key: 'exposure', label: 'Exposure', min: -100, max: 100, default: 0 },
];

export default function AdjustmentPanel({ onAdjust, activeAdjustments, onResetAll }) {
  const [local, setLocal] = useState(() => {
    const init = {};
    ADJUSTMENTS.forEach((a) => { init[a.key] = a.default; });
    return init;
  });

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

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
          Adjustments
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
            <FiRotateCcw className="w-3 h-3" /> Reset all
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
              <span className="text-[11px] text-[var(--text-dim)] group-hover:text-white transition-colors">
                {adj.label}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[var(--text-dim)] tabular-nums w-8 text-right">
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
              type="range"
              min={adj.min}
              max={adj.max}
              value={val}
              onChange={(e) => handleChange(adj.key, e.target.value)}
              className="slider"
              style={{
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, rgba(255,255,255,0.1) ${pct}%)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Apply adjustment operations to a canvas from an image data URL.
 * This is used by the main page to render the adjusted image.
 */
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

      const brightness = (adjustments.brightness || 0) * 2.55; // -255 to 255
      const contrast = (adjustments.contrast || 0) / 100;
      const saturation = (adjustments.saturation || 0) / 100;
      const temperature = (adjustments.temperature || 0) / 100;
      const exposure = (adjustments.exposure || 0) / 100;
      const sharpness = (adjustments.sharpness || 0) / 100;

      const contrastFactor = (1 + contrast) * (1 + contrast); // quadratic feel

      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i+1], b = d[i+2];

        // Brightness
        r += brightness; g += brightness; b += brightness;

        // Exposure
        if (exposure !== 0) {
          const expMul = Math.pow(2, exposure);
          r *= expMul; g *= expMul; b *= expMul;
        }

        // Contrast
        if (contrast !== 0) {
          r = ((r / 255 - 0.5) * contrastFactor + 0.5) * 255;
          g = ((g / 255 - 0.5) * contrastFactor + 0.5) * 255;
          b = ((b / 255 - 0.5) * contrastFactor + 0.5) * 255;
        }

        // Saturation
        if (saturation !== 0) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const sat = 1 + saturation;
          r = gray + sat * (r - gray);
          g = gray + sat * (g - gray);
          b = gray + sat * (b - gray);
        }

        // Temperature (warm/cool shift)
        if (temperature !== 0) {
          r += temperature * 30;
          b -= temperature * 30;
        }

        d[i]   = Math.max(0, Math.min(255, r));
        d[i+1] = Math.max(0, Math.min(255, g));
        d[i+2] = Math.max(0, Math.min(255, b));
      }

      ctx.putImageData(imageData, 0, 0);

      // Simple sharpen via unsharp mask approximation
      if (sharpness > 0) {
        const amount = sharpness * 0.5;
        ctx.globalCompositeOperation = 'overlay';
        ctx.filter = `contrast(${100 + amount * 100}%)`;
        ctx.globalAlpha = amount * 0.3;
        ctx.drawImage(canvas, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        ctx.globalAlpha = 1;
      }

      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

export { ADJUSTMENTS };
